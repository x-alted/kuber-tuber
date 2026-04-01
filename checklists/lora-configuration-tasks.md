```markdown
# LoRa Integration – Detailed Tasks

## 1. Hardware & Driver Verification

**Prerequisites:** Worker1 (`10.0.20.208`) designated as LoRa gateway.  
**Hardware:** Waveshare SX1262 LoRa HAT (or compatible) attached to GPIO pins of worker1.

### 1.1 Physical Inspection
- [ ] LoRa HAT is firmly seated on GPIO header.  
- [ ] Antenna is connected to the HAT.  

### 1.2 Enable SPI Interface
- [ ] On worker1, edit `/boot/config.txt`:
  ```bash
  sudo nano /boot/config.txt
  ```
- [ ] Ensure the following line is present and uncommented:
  ```
  dtparam=spi=on
  ```
- [ ] Reboot: `sudo reboot`  
- [ ] After reboot, verify SPI devices are present:
  ```bash
  ls -l /dev/spidev*
  ```
  Expected output shows `/dev/spidev0.0` and `/dev/spidev0.1` (or similar).

### 1.3 Install Required Packages
- [ ] Update package list and install Python development tools:
  ```bash
  sudo apt update
  sudo apt install -y python3-pip python3-venv python3-rpi.gpio python3-spidev git
  ```
- [ ] Create a Python virtual environment for LoRa development:
  ```bash
  mkdir -p ~/lora
  cd ~/lora
  python3 -m venv lora-env
  source lora-env/bin/activate
  ```
- [ ] Install Adafruit CircuitPython RFM9x library (supports SX1262):
  ```bash
  pip install adafruit-circuitpython-rfm9x
  ```

### 1.4 Test SPI & GPIO with Simple Script
- [ ] Create a test script `spi_test.py`:
  ```python
  import spidev
  import RPi.GPIO as GPIO

  spi = spidev.SpiDev()
  spi.open(0, 0)  # /dev/spidev0.0, CE0
  spi.max_speed_hz = 500000
  print("SPI opened successfully")
  GPIO.setmode(GPIO.BCM)
  GPIO.setup(25, GPIO.OUT)  # typical reset pin for SX1262
  GPIO.output(25, GPIO.HIGH)
  print("GPIO test passed")
  ```
- [ ] Run: `python spi_test.py`  
  Expected: no errors, prints success messages.

---

## 2. Basic LoRa Communication Test

**Goal:** Send a test packet from Cardputer to worker1 (or vice‑versa) to confirm hardware works.

### 2.1 Identify Correct Chip Select (CS) Pin
- [ ] Determine which CS pin the HAT uses (commonly CE0 = GPIO8, CE1 = GPIO7).  
- [ ] Check HAT documentation or use `ls /dev/spidev*` to see available devices.  
- [ ] Update scripts to use correct CS (e.g., CE0 = 0, CE1 = 1).

### 2.2 Prepare Cardputer
- [ ] Ensure Cardputer has LoRa module (e.g., LoRa Cap 868/915).  
- [ ] Flash a simple sender sketch (e.g., using Arduino IDE with M5Stack library) that transmits a test message (e.g., "Hello from Cardputer") at 915 MHz.  
- [ ] Confirm Cardputer is powered and antenna attached.

### 2.3 Worker1 Receiver Script
- [ ] Create `receive.py` in `~/lora/`:
  ```python
  import board
  import busio
  import digitalio
  import adafruit_rfm9x

  # SPI setup
  spi = busio.SPI(board.SCK, MOSI=board.MOSI, MISO=board.MISO)
  cs = digitalio.DigitalInOut(board.CE0)   # adjust to CE1 if needed
  reset = digitalio.DigitalInOut(board.D25)

  rfm9x = adafruit_rfm9x.RFM9x(spi, cs, reset, 915.0)
  rfm9x.tx_power = 23

  print("Waiting for LoRa packet...")
  while True:
      packet = rfm9x.receive()
      if packet is not None:
          print(f"Received: {packet}")
  ```
- [ ] Run: `python receive.py`  
- [ ] Send from Cardputer.  
- [ ] **Expected:** Received message appears in terminal.

### 2.4 Troubleshooting
- [ ] If no packets received:
  - Check antenna connections.  
  - Verify Cardputer and worker1 are on same frequency (915 MHz).  
  - Try swapping CS pin (CE0 vs CE1).  
  - Check SPI wiring: `sudo dmesg | grep spi` for errors.  
  - Ensure worker1 is not running other SPI services concurrently.  
- [ ] Once basic send/receive works, mark this section complete.

---

## 3. LoRa‑to‑Cluster Bridge

**Goal:** A Python script on worker1 that receives LoRa packets, decrypts them, and forwards to the Kubernetes receiver service.

### 3.1 Design Bridge Script
- [ ] Define the data flow:
  1. Receive LoRa packet.
  2. Decrypt payload using pre‑shared AES‑256 key.
  3. Send decrypted message as HTTP POST to `http://lora-receiver.lora-demo.svc.cluster.local:8080` (or the service URL).  
- [ ] Determine payload format (e.g., JSON `{"message": "text", "timestamp": "..."}`).

### 3.2 Create Kubernetes Secret for Encryption Key
- [ ] Generate a random 32‑byte key (base64):
  ```bash
  openssl rand -base64 32
  ```
- [ ] Create secret in the `lora-demo` namespace:
  ```bash
  kubectl create secret generic lora-encryption-key \
    --from-literal=key=<base64-key> \
    --namespace=lora-demo
  ```
- [ ] Document the key in a secure location (not in public docs).

### 3.3 Write the Bridge Script (`lora_bridge.py`)
- [ ] Place script in `~/lora/` on worker1.
- [ ] Include:
  - Import necessary modules: `adafruit_rfm9x`, `board`, `digitalio`, `busio`, `requests`, `json`, `base64`, `cryptography` (or `pycryptodome`).
  - Read encryption key from environment variable or a file (for now, store in a config file; later could be mounted from Kubernetes if needed).
  - Receive loop as before.
  - On packet receive, decrypt using AES‑256 (CBC or GCM) with the key.
  - Send decrypted data to the receiver service using `requests.post()`.
- [ ] Example decryption function:
  ```python
  from Crypto.Cipher import AES
  import base64

  def decrypt_payload(ciphertext_b64, key_b64):
      key = base64.b64decode(key_b64)
      ciphertext = base64.b64decode(ciphertext_b64)
      iv = ciphertext[:16]
      ct = ciphertext[16:]
      cipher = AES.new(key, AES.MODE_CBC, iv)
      plaintext = cipher.decrypt(ct)
      # remove padding
      return plaintext.rstrip(b'\x00').decode()
  ```
- [ ] Ensure the script runs continuously (use a `while True` loop with a small sleep to avoid high CPU).

### 3.4 Test Bridge with Manual Inject
- [ ] Run the bridge script on worker1.  
- [ ] Use a simple test script (or curl) to simulate a decrypted packet hitting the receiver service.  
- [ ] Verify that messages appear in the receiver service logs.

### 3.5 End‑to‑End Test with Cardputer
- [ ] Cardputer sends an encrypted packet (using same key and AES‑CBC) to worker1.  
- [ ] Bridge receives, decrypts, forwards to receiver service.  
- [ ] Confirm message arrives in receiver pod logs.  
- [ ] Repeat with multiple packets to ensure reliability.

---

## 4. Automate Bridge Script

### 4.1 Create Systemd Service
- [ ] Create a service file `/etc/systemd/system/lora-bridge.service`:
  ```ini
  [Unit]
  Description=LoRa to Kubernetes Bridge
  After=network.target

  [Service]
  User=pi
  WorkingDirectory=/home/pi/lora
  ExecStart=/home/pi/lora/lora-env/bin/python /home/pi/lora/lora_bridge.py
  Restart=always
  RestartSec=10

  [Install]
  WantedBy=multi-user.target
  ```
- [ ] Enable and start the service:
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl enable lora-bridge.service
  sudo systemctl start lora-bridge.service
  ```
- [ ] Check status: `sudo systemctl status lora-bridge.service`

### 4.2 Verify Persistence
- [ ] Reboot worker1.  
- [ ] Confirm the bridge starts automatically and continues to receive/forward messages.

---

## 5. Documentation & Testing Results

- [ ] Document final configuration in `Service-Configuration.md` (LoRa HAT pins, frequency, encryption method).  
- [ ] Record a short video of end‑to‑end demo (Cardputer sending, message appearing in Rancher or receiver logs).  
- [ ] Note any range limitations or packet loss observed.

---

Use this checklist to track progress. Mark items `[x]` as they are completed.
```
