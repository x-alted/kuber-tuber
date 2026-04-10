This is a full guide for implementing the LoRa gateway on the Kuber-Tuber project.

## Table of Contents
1.  [Hardware Setup & Initial Configuration](#1-hardware-setup--initial-configuration)
2.  [Software Environment & Dependencies](#2-software-environment--dependencies)
3.  [Implementing the LoRa Bridge (Python)](#3-implementing-the-lora-bridge-python)
4.  [Deploying the Receiver Service](#4-deploying-the-receiver-service)
5.  [Security Integration: AES-256 Key Management](#5-security-integration-aes-256-key-management)
6.  [Testing & Validation](#6-testing--validation)
7.  [Troubleshooting Common Issues](#7-troubleshooting-common-issues)

---

## 1. Hardware Setup & Initial Configuration
This section covers the physical setup of the Waveshare SX1262 LoRa HAT on your designated worker node (e.g., `worker1`) and enabling the necessary interfaces.

### 1.1. Hardware Installation
1.  **Attach the HAT**: Carefully connect the Waveshare SX1262 LoRa HAT to the 40-pin GPIO header of your Raspberry Pi worker node (`worker1`). Ensure it is seated firmly and evenly. The E22-900T22S HAT communicates via **UART serial** (`/dev/ttyAMA0`), not SPI. It uses GPIO22 for the M0 mode pin and GPIO27 for the M1 mode pin; these are driven by the bridge's configuration script (`configure_e22.py`). Ensure the antenna is securely attached to the HAT's SMA connector.

### 1.2. Software Configuration
1.  **Enable UART serial**: The E22-900T22S communicates over UART (`/dev/ttyAMA0`). Enable it via `sudo raspi-config` → `Interface Options` → `Serial Port`. When asked *"Would you like a login shell over the serial port?"*, select **No**. When asked *"Would you like the serial port hardware to be enabled?"*, select **Yes**. Reboot.
2.  **Verify UART is available**: After rebooting, confirm the device node exists:
    ```bash
    ls /dev/ttyAMA0
    ```
    You should see `/dev/ttyAMA0`. If the node is missing, confirm that `enable_uart=1` is present in `/boot/firmware/config.txt` and that `console=serial0,115200` has been removed from `/boot/firmware/cmdline.txt`.

---

## 2. Software Environment & Dependencies
Set up the Python environment on your worker node (`worker1`) to run the LoRa bridge service.

### 2.1. Install System Dependencies
```bash
sudo apt update
sudo apt install python3-pip python3-venv -y
```

### 2.2. Create and Activate a Virtual Environment
It is a best practice to use a virtual environment to avoid conflicts with system packages.
```bash
cd /home/pi
mkdir kuber-tuber && cd kuber-tuber
python3 -m venv venv
source venv/bin/activate
```

### 2.3. Install Python Packages
With the virtual environment activated, install the required libraries:
```bash
pip install pyserial pycryptodome requests
```
*   `pyserial`: Provides serial (UART) communication with the E22-900T22S over `/dev/ttyAMA0`.
    > **Do not install `adafruit-circuitpython-rfm9x`** — that library targets the SX1276-based RFM9x module family and is completely incompatible with the SX1262-based E22-900T22S. Attempting to use it will result in immediate initialisation failure.
*   `pycryptodome`: Cryptographic library used for AES-256-CBC decryption.
*   `requests`: Used to forward decrypted messages to the receiver pod via HTTP POST.

---

## 3. Implementing the LoRa Bridge (Python)
This is the core of your gateway implementation. The bridge script will listen for LoRa packets, decrypt them, and forward them to your Kubernetes cluster.

### 3.1. The Decryption Utility (`decrypt_utils.py`)
Create a shared utility file for decryption. This function will be called by the main bridge script.
```python
import base64
from Crypto.Cipher import AES

def decrypt_payload(b64_ciphertext, key_bytes):
    """
    Decrypt a Base64-encoded LoRa packet.
    Returns (seq, message) or (None, error_reason).
    """
    try:
        raw = base64.b64decode(b64_ciphertext)
    except Exception as e:
        return None, f"Base64 decode error: {e}"
    
    if len(raw) < 16:
        return None, "Packet too short"
    
    iv = raw[:16]
    ciphertext = raw[16:]
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv)
    
    try:
        decrypted = cipher.decrypt(ciphertext)
    except Exception as e:
        return None, f"Decryption failed: {e}"
    
    pad_len = decrypted[-1]
    if pad_len < 1 or pad_len > 16:
        return None, f"Invalid padding length: {pad_len}"
    
    for i in range(1, pad_len + 1):
        if decrypted[-i] != pad_len:
            return None, "Corrupted padding"
    
    plaintext_bytes = decrypted[:-pad_len]
    
    try:
        plaintext = plaintext_bytes.decode('utf-8')
    except UnicodeDecodeError:
        return None, "Invalid UTF-8"
    
    parts = plaintext.split('|', 1)
    if len(parts) != 2:
        return None, f"Invalid format: {plaintext}"
    
    seq_str, message = parts
    try:
        seq = int(seq_str)
    except ValueError:
        return None, f"Sequence not integer: {seq_str}"
    
    return (seq, message), None
```
*This function handles Base64 decoding, IV extraction, AES-256-CBC decryption, PKCS#7 padding removal, and parsing of the plaintext format (`<seq>|<message>`).*

### 3.2. The Main Bridge Script (`LoRa-Bridge.py`)
The production bridge script is `LoRa/gateway/LoRa-Bridge.py` in the repository. Deploy it directly — do not rewrite it from the adafruit example above. Key behaviours:

- Reads UART bytes from `/dev/ttyAMA0` at 9600 baud using `pyserial`.
- **Loads the AES-256 key from Kubernetes at startup** via `kubectl get secret lora-encryption-key -n lora-demo`. The key is kept only in memory and never written to disk.
- Decodes each received packet: Base64 decode → split 16-byte IV → AES-256-CBC decrypt → PKCS#7 unpad → parse `<seq>|<message>`.
- Enforces replay protection: rejects any packet whose sequence number ≤ the last accepted value for that source.
- Forwards accepted messages via HTTP POST to `http://lora-receiver.lora-demo.svc.cluster.local:8080/api/v1/messages`.
- Sends `ACK:<seq>` back over UART on HTTP 200 from the receiver.
- Supports downlink (hub → Cardputer): write a message to `/tmp/lora-downlink.txt` and the bridge transmits it on the next loop iteration.

Run it as a systemd service using `LoRa/gateway/lora-bridge.service` (see §3.3).


### 3.3. Run as a Systemd Service
To ensure the bridge starts automatically on boot and restarts if it crashes, create a systemd service.
1.  Create a service file: `sudo nano /etc/systemd/system/lora-bridge.service`
2.  Add the following content:
    ```ini
    [Unit]
    Description=LoRa Bridge to Kubernetes
    After=network.target

    [Service]
    User=pi
    WorkingDirectory=/home/pi/kuber-tuber/LoRa
    ExecStart=/home/pi/kuber-tuber/venv/bin/python /home/pi/kuber-tuber/LoRa/LoRa-Bridge.py
    Restart=always
    RestartSec=10

    [Install]
    WantedBy=multi-user.target
    ```
3.  Enable and start the service:
    ```bash
    sudo systemctl enable lora-bridge.service
    sudo systemctl start lora-bridge.service
    sudo systemctl status lora-bridge.service
    ```

---

## 4. Deploying the Receiver Service
The receiver service is a Kubernetes pod that accepts HTTP POST requests from the LoRa bridge, validates them, and logs the messages.

### 4.1. Create the Kubernetes Deployment and Service (`receiver_service.yaml`)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lora-receiver
  namespace: lora-demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lora-receiver
  template:
    metadata:
      labels:
        app: lora-receiver
    spec:
      containers:
      - name: receiver
        image: python:3.9-slim
        command: ["python", "-c"]
        args:
          - |
            import os, json, time
            from flask import Flask, request, jsonify
            app = Flask(__name__)
            last_seq = {"cardputer": 0}
            @app.route('/api/v1/messages', methods=['POST'])
            def receive_message():
                data = request.get_json()
                if not data:
                    return jsonify({"status": "error", "reason": "Missing JSON body"}), 400
                seq = data.get('seq')
                msg = data.get('message')
                source = data.get('source', 'unknown')
                if seq is None or msg is None:
                    return jsonify({"status": "error", "reason": "Missing required field"}), 400
                if not isinstance(seq, int) or seq < 0:
                    return jsonify({"status": "error", "reason": "Invalid sequence number"}), 400
                if seq <= last_seq.get(source, 0):
                    return jsonify({"status": "error", "reason": "Replayed or out-of-order sequence"}), 400
                last_seq[source] = seq
                human_ts = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime())
                app.logger.info(f"[{human_ts}] source={source} seq={seq} msg={msg}")
                print(f"ACCEPTED: {human_ts} | {source} | seq {seq} | {msg}")
                return jsonify({"status": "accepted", "seq": seq}), 200
            @app.route('/health', methods=['GET'])
            def health():
                return jsonify({"status": "healthy"}), 200
            app.run(host='0.0.0.0', port=8080, debug=False)
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: lora-receiver
  namespace: lora-demo
spec:
  selector:
    app: lora-receiver
  ports:
    - port: 8080
      targetPort: 8080
```
*This YAML defines a Flask-based receiver that validates the JSON payload, performs replay protection, and logs the message.*

### 4.2. Deploy to the Cluster
```bash
kubectl create namespace lora-demo
kubectl apply -f receiver_service.yaml
kubectl get pods -n lora-demo
kubectl logs -n lora-demo deployment/lora-receiver
```

---

## 5. Security Integration: AES-256 Key Management
Storing the AES key in plaintext in your scripts is a significant security risk. Use Kubernetes Secrets for secure management.

### 5.1. Create the Secret
Generate a 32-byte key and store it as the Kubernetes secret **`lora-encryption-key`** in the `lora-demo` namespace. The bridge script reads this secret at startup via `kubectl` — do not hardcode the key in the script.

```bash
# Create the namespace if it does not exist
kubectl create namespace lora-demo --dry-run=client -o yaml | kubectl apply -f -

# Generate and store the key in one step
kubectl create secret generic lora-encryption-key \
  --namespace lora-demo \
  --from-literal=key="$(openssl rand -base64 32)"

# Verify
kubectl get secret lora-encryption-key -n lora-demo
```

> **Cardputer key sync:** The firmware has the key compiled in. After creating the secret, get the raw hex bytes to paste into `src/main.cpp`:
> ```bash
> kubectl get secret lora-encryption-key -n lora-demo \
>   -o jsonpath='{.data.key}' | base64 -d | xxd -i
> ```
> Replace the `aes_key[32]` array and reflash the Cardputer.

### 5.2. Mount the Secret in the Receiver Pod
Update the `receiver_service.yaml` to mount the secret as an environment variable or a volume. The example above uses the key directly, but for production, you would modify the Python command to read from the mounted secret.

### 5.3. Access the Secret from the Bridge
The bridge script (`LoRa-Bridge.py`) already retrieves the key via `kubectl get secret lora-encryption-key -n lora-demo` at startup. Ensure `kubectl` is installed on `worker1` and the node's kubeconfig can reach the K3s API server (`/etc/rancher/k3s/k3s.yaml` or a copy with the correct server IP).

---

## 6. Testing & Validation
Follow this sequence to validate your implementation.

### 6.1. Unencrypted LoRa Test
Use a simple Python script or the `LoRA-Test.py` provided in your project to verify basic send/receive functionality without encryption.

### 6.2. Encrypted End-to-End Test
1.  Ensure the bridge service is running on `worker1`.
2.  Ensure the receiver pod is running in the cluster.
3.  On the Cardputer, type a message and press Send.
4.  **Monitor the Bridge Logs**: `sudo journalctl -u lora-bridge -f`
5.  **Monitor the Receiver Logs**: `kubectl logs -n lora-demo deployment/lora-receiver -f`

### 6.3. Replay Attack Test
Send the same message twice. The second attempt should be rejected by the bridge's replay protection logic, and you should see "Replay attack detected" in the bridge logs.

### 6.4. ACK and Retry Test
Temporarily disable the receiver service (e.g., `kubectl scale deployment lora-receiver -n lora-demo --replicas=0`). Send a message from the Cardputer. It should retry up to 3 times and then fail with a red indicator.

---

## 7. Troubleshooting Common Issues

### The LoRa HAT is not responding (no data on `/dev/ttyAMA0`).
*   **Solution**: Ensure UART is enabled and the serial console is disabled in `raspi-config` (Interface Options → Serial Port). Confirm `/dev/ttyAMA0` exists after reboot. If the device node exists but reads nothing, reseat the HAT and run `configure_e22.py` to set the module's registers.

### Bridge script exits immediately at startup.
*   **Solution**: The bridge calls `kubectl` at startup to retrieve the AES key. Ensure `kubectl` is installed on `worker1` and the secret exists: `kubectl get secret lora-encryption-key -n lora-demo`. If missing, create it (see §5.1). Also ensure the kubeconfig on `worker1` points to the correct master IP (`10.0.10.94:6443`).

### Decryption fails with "Invalid padding".
*   **Solution**: This often indicates the AES key on the bridge does not match the key on the Cardputer. Verify the 32-byte key is identical in both places. Also, ensure the Cardputer's firmware is using the same CBC mode and PKCS#7 padding.

### HTTP POST to receiver fails with "Connection refused".
*   **Solution**: Verify the receiver pod is running (`kubectl get pods -n lora-demo`). Check the service name and namespace in the `RECEIVER_URL`. Ensure your worker node's network policy allows outbound connections to the cluster's service CIDR.

### The sequence number resets to zero after a Cardputer reboot.
*   **Solution**: This indicates the non-volatile storage (NVS) for the sequence number is not working. In the Cardputer firmware, ensure you are using `Preferences` to save and load the counter correctly. The team's final report notes that the `increment_seq()` function calls `save_seq_counter()` only after a successful ACK.

---

By following this guide, you will have a fully functional LoRa gateway integrated into your Kuber-Tuber Kubernetes cluster, complete with encryption, replay protection, and secure key management. For any further details, refer to the team's comprehensive final report and the project files.
