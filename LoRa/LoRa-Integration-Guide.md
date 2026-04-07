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
1.  **Attach the HAT**: Carefully connect the Waveshare SX1262 LoRa HAT to the 40-pin GPIO header of your Raspberry Pi worker node (`worker1`). Ensure it is seated firmly and evenly. The HAT uses the CE0 (GPIO8) pin for Chip Select (CS) and GPIO25 for the Reset pin. Ensure your antenna is securely attached to the HAT's SMA connector.

### 1.2. Software Configuration
1.  **Enable SPI**: The LoRa HAT communicates over the Serial Peripheral Interface (SPI) bus. Enable it by running `sudo raspi-config`, navigating to `Interface Options` -> `SPI`, and selecting `<Yes>` to enable the SPI interface. Alternatively, you can add `dtparam=spi=on` to `/boot/config.txt` and reboot.
2.  **Verify SPI Detection**: After a reboot, verify the SPI device is detected:
    ```bash
    ls /dev/spidev*
    ```
    You should see `spidev0.0` and `spidev0.1` listed. This confirms the SPI interface is active.

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
pip install adafruit-circuitpython-rfm9x pycryptodome requests
```
*   `adafruit-circuitpython-rfm9x`: Provides the interface to control the SX1262 LoRa radio.
*   `pycryptodome`: A self-contained cryptographic library used for AES-256-CBC decryption.
*   `requests`: Used to forward the decrypted message to the internal receiver service via HTTP POST.

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
This script initializes the LoRa radio, runs the main receive loop, and forwards messages.
```python
#!/usr/bin/env python3
import time
import board
import busio
import digitalio
import adafruit_rfm9x
import base64
import json
import requests
from Crypto.Cipher import AES
from decrypt_utils import decrypt_payload

# ==================== CONFIGURATION ====================
RADIO_FREQ_MHZ = 915.0
CS_PIN = board.CE0
RESET_PIN = board.D25
RECEIVER_URL = "http://lora-receiver.lora-demo.svc.cluster.local:8080/api/v1/messages"

# WARNING: In production, retrieve this key from a secure store or env var.
# For this guide, we define it directly.
AES_KEY = bytes([
    0x60, 0x3d, 0xeb, 0x10, 0x15, 0xca, 0x71, 0xbe,
    0x2b, 0x73, 0xae, 0xf0, 0x85, 0x7d, 0x77, 0x81,
    0x1f, 0x35, 0x2c, 0x07, 0x3b, 0x61, 0x08, 0xd7,
    0x2d, 0x98, 0x10, 0xa3, 0x09, 0x14, 0xdf, 0xf4
])

last_seq = {"cardputer": 0}

# ==================== LoRa INITIALIZATION ====================
spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
cs = digitalio.DigitalInOut(CS_PIN)
reset = digitalio.DigitalInOut(RESET_PIN)
rfm9x = adafruit_rfm9x.RFM9x(spi, cs, reset, RADIO_FREQ_MHZ)
rfm9x.tx_power = 23  # Set transmit power (max 23 dBm)
print("LoRa bridge started. Waiting for packets...")

# ==================== ACK FUNCTION ====================
def send_ack(seq):
    ack_message = f"ACK:{seq}"
    rfm9x.send(ack_message.encode())
    print(f"Sent ACK for seq {seq}")

# ==================== MAIN RECEIVE LOOP ====================
while True:
    packet = rfm9x.receive(timeout=5.0)
    if packet is None:
        continue
    
    try:
        raw_str = packet.decode('utf-8').strip()
    except UnicodeDecodeError:
        print("Received non-UTF8 packet, ignoring")
        continue
    
    print(f"Received: {raw_str}")
    
    result, error = decrypt_payload(raw_str, AES_KEY)
    if result is None:
        print(f"Decryption failed: {error}")
        continue
    
    seq, message = result
    source = "cardputer"
    
    # Replay protection
    if seq <= last_seq.get(source, 0):
        print(f"Replay attack detected! seq={seq} <= last_seq={last_seq[source]}. Ignoring.")
        continue
    
    last_seq[source] = seq
    
    payload = {
        "seq": seq,
        "message": message,
        "source": source,
        "timestamp": time.time()
    }
    
    try:
        resp = requests.post(RECEIVER_URL, json=payload, timeout=5)
        if resp.status_code == 200:
            print(f"Message accepted by receiver (seq {seq})")
            send_ack(seq)
        else:
            print(f"Receiver returned error {resp.status_code}: {resp.text}")
    except requests.exceptions.RequestException as e:
        print(f"Failed to contact receiver service: {e}")
    
    time.sleep(0.1)
```

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
Encode your 32-byte AES key in base64 and create the secret.
```bash
# Generate a secure key (or use your existing one)
openssl rand -base64 32
# Create the secret
kubectl create secret generic lora-aes-key \
  --namespace lora-demo \
  --from-literal=key='your-base64-encoded-key-here'
```

### 5.2. Mount the Secret in the Receiver Pod
Update the `receiver_service.yaml` to mount the secret as an environment variable or a volume. The example above uses the key directly, but for production, you would modify the Python command to read from the mounted secret.

### 5.3. Access the Secret from the Bridge
The bridge script on the worker node should retrieve the key from the Kubernetes API instead of hardcoding it. You can use `kubectl` or the Kubernetes Python client to fetch the secret on startup, but this requires giving the node appropriate RBAC permissions.

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

### The LoRa HAT is not detected (`spidev` devices missing).
*   **Solution**: Ensure SPI is enabled (`raspi-config`). Verify the HAT is fully seated. Check the chip select pin in your code (`board.CE0`).

### `adafruit_rfm9x.RFM9x` initialization fails.
*   **Solution**: Double-check your pin assignments (CS, RESET). Ensure no other process is using the SPI bus. Check the radio frequency matches your HAT and regional regulations (915 MHz for North America).

### Decryption fails with "Invalid padding".
*   **Solution**: This often indicates the AES key on the bridge does not match the key on the Cardputer. Verify the 32-byte key is identical in both places. Also, ensure the Cardputer's firmware is using the same CBC mode and PKCS#7 padding.

### HTTP POST to receiver fails with "Connection refused".
*   **Solution**: Verify the receiver pod is running (`kubectl get pods -n lora-demo`). Check the service name and namespace in the `RECEIVER_URL`. Ensure your worker node's network policy allows outbound connections to the cluster's service CIDR.

### The sequence number resets to zero after a Cardputer reboot.
*   **Solution**: This indicates the non-volatile storage (NVS) for the sequence number is not working. In the Cardputer firmware, ensure you are using `Preferences` to save and load the counter correctly. The team's final report notes that the `increment_seq()` function calls `save_seq_counter()` only after a successful ACK.

---

By following this guide, you will have a fully functional LoRa gateway integrated into your Kuber-Tuber Kubernetes cluster, complete with encryption, replay protection, and secure key management. For any further details, refer to the team's comprehensive final report and the project files.
