# LoRa Integration Guide 

This guide walks through the complete setup of the LoRa gateway (`worker1`), the bridge service, the Kubernetes receiver, and the Cardputer field node. All necessary files are in the repository.

---

## Prerequisites

- `worker1` is joined to the K3s cluster and has static IP `10.0.20.208`.
- LoRa HAT (Waveshare SX1262) is physically attached to `worker1`.
- Cardputer ADV with LoRa module (915 MHz) is available.

---

## Step 1: Verify LoRa Hardware on worker1

Run the basic detection script:

```bash
cd ~
git clone https://github.com/x-alted/kuber-tuber.git
cd kuber-tuber
python3 LoRa/LoRA-Test.py
```

Expected output: `LoRa HAT detected!`

If not detected, enable SPI (`dtparam=spi=on` in `/boot/config.txt`) and reboot. See [LoRa-Tasks.md](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/LoRa-Tasks.md) for detailed troubleshooting.

---

## Step 2: Install Python Dependencies on worker1

```bash
cd ~/kuber-tuber/LoRa
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

The [`requirements.txt`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/requirements.txt) file lists all needed Python packages (`adafruit-circuitpython-rfm9x`, `pycryptodome`, `requests`).

---

## Step 3: Test Decryption Utility

Before running the bridge, test the decryption logic standalone:

```bash
python test_decryption.py
```

This script simulates encrypted packets, decrypts them, and verifies replay protection. All tests should pass.  
See [`test_decryption.py`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/test_decryption.py) for the source.

---

## Step 4: Deploy the Kubernetes Receiver Service

The receiver is a Flask application that runs inside the cluster. Apply the YAML definition:

```bash
kubectl apply -f https://raw.githubusercontent.com/x-alted/kuber-tuber/main/LoRa/receiver_service.yaml
```

Verify the pod is running:

```bash
kubectl get pods -n lora-demo
```

The service is named `lora-receiver` and listens on port 8080.  
See [`receiver_service.yaml`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/receiver_service.yaml) for the embedded Flask code.

---

## Step 5: Configure the LoRa Bridge on worker1

The bridge script (`LoRa-Bridge.py`) listens for LoRa packets, decrypts them, and forwards to the receiver service.

1. Ensure the AES key inside [`LoRa-Bridge.py`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/LoRa-Bridge.py) matches the key in the Cardputer firmware (both are hardcoded in the provided files – change them together if needed).

2. Test the bridge manually:

```bash
cd ~/kuber-tuber/LoRa
source venv/bin/activate
python LoRa-Bridge.py
```

3. Install the systemd service using the provided unit file:

```bash
sudo cp ~/kuber-tuber/LoRa/lora-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable lora-bridge
sudo systemctl start lora-bridge
sudo systemctl status lora-bridge
```

The [`lora-bridge.service`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/lora-bridge.service) file ensures the bridge starts automatically on boot.

---

## Step 6: Flash the Cardputer Firmware

The firmware is in [`KuberTuber-Cardputer.ino`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/KuberTuber-Cardputer.ino) and uses PlatformIO with the included [`platformio.ini`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/platformio.ini).

1. Open the folder `LoRa/` in PlatformIO (or VS Code with PlatformIO extension).
2. Verify the LoRa frequency is set to `915.0` (line `#define LORA_FREQ 915.0`).
3. Ensure the AES key matches the one in `LoRa-Bridge.py`.
4. Connect the Cardputer via USB and upload:

```bash
pio run --target upload
```

After flashing, the screen shows "KUBER-TUBER v2.0" and the current sequence number.

---

## Step 7: End‑to‑End Test

1. On `worker1`, watch the bridge logs:

```bash
journalctl -u lora-bridge -f
```

2. On the Cardputer, type a message and press **Send**.

Expected flow:
- Bridge receives a packet, decrypts it, prints "Received: ..."
- Bridge sends HTTP POST to `http://lora-receiver.lora-demo.svc.cluster.local:8080/api/v1/messages`
- Receiver logs the message to its pod logs.
- Bridge receives an ACK from the receiver and sends a LoRa ACK back to the Cardputer.
- Cardputer shows green flash and increments the sequence number.

3. Verify the message appears in the receiver logs:

```bash
kubectl logs -n lora-demo deployment/lora-receiver
```

You should see a line like:

```
ACCEPTED: 2026-04-06T14:32:01 | cardputer | seq 42 | Hello Kuber-Tuber
```

---

## Step 8: Test Replay Protection and Retries

- Power off the receiver pod (`kubectl delete pod -n lora-demo ...`). Send a message – the bridge will fail to forward and will **not** send an ACK. The Cardputer will retry 3 times, then show red.
- After restarting the receiver, send a new message – it should work.
- If you capture a valid encrypted packet and replay it (e.g., using a second LoRa transmitter), the bridge will reject it because the sequence number is not greater than the last seen.

---

## Step 9: Verify Persistence

- Reboot `worker1` – the bridge starts automatically (systemd).
- Reboot the Cardputer – the sequence number resumes from the last saved value (stored in NVS). The display shows the correct `Seq:`.

---

## Troubleshooting

| Symptom | Likely Cause | Check |
|---------|--------------|-------|
| `LoRA-Test.py` fails | SPI not enabled or wrong CS pin | `ls /dev/spidev*`; try `board.CE1` in the script. |
| Bridge logs show "Decryption failed" | Key mismatch between Cardputer and bridge | Compare `AES_KEY` in [`KuberTuber-Cardputer.ino`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/KuberTuber-Cardputer.ino) and [`LoRa-Bridge.py`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/LoRa-Bridge.py). |
| Bridge logs "Failed to contact receiver" | Receiver pod not running or network unreachable | `kubectl get pods -n lora-demo`; from `worker1`, `curl http://lora-receiver.lora-demo.svc.cluster.local:8080/health` |
| Cardputer never gets ACK | Bridge not sending ACK or receiver not responding | Check bridge logs; ensure `send_ack()` is called. |
| Replay attack warning | Same sequence number sent twice | Normal if you retransmit the same packet; bridge rejects it. |

---

## Files Reference

| File | Purpose |
|------|---------|
| [`LoRa/LoRA-Test.py`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/LoRA-Test.py) | Quick hardware detection |
| [`LoRa/requirements.txt`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/requirements.txt) | Python dependencies |
| [`LoRa/decrypt_utils.py`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/decrypt_utils.py) | Shared decryption logic |
| [`LoRa/test_decryption.py`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/test_decryption.py) | Unit test for decryption |
| [`LoRa/LoRa-Bridge.py`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/LoRa-Bridge.py) | Main bridge service (runs on `worker1`) |
| [`LoRa/receiver_service.yaml`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/receiver_service.yaml) | Kubernetes deployment + service for the receiver (Flask app) |
| [`LoRa/lora-bridge.service`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/lora-bridge.service) | Systemd unit file for the bridge |
| [`LoRa/platformio.ini`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/platformio.ini) | PlatformIO configuration for Cardputer |
| [`LoRa/KuberTuber-Cardputer.ino`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/KuberTuber-Cardputer.ino) | Cardputer firmware |
| [`LoRa/LoRa-Tasks.md`](https://github.com/x-alted/kuber-tuber/blob/main/LoRa/LoRa-Tasks.md) | Detailed task checklist |

---

After completing these steps, the LoRa integration is fully functional. 
