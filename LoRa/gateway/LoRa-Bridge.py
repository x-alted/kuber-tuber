#!/usr/bin/env python3
"""
Kuber-Tuber LoRa Bridge Service
Runs on worker1 (Raspberry Pi 4 + Waveshare E22-900T22S LoRa HAT)

Communication path:
    Uplink  : Cardputer → LoRa RF → E22 HAT → /dev/ttyAMA0 → this script → Kubernetes
    Downlink: echo "hello" > /tmp/lora-downlink.txt → this script → /dev/ttyAMA0 → LoRa RF → Cardputer

Packet formats:
    Uplink  : Base64(IV + AES-256-CBC(seq|message))   — encrypted
    Downlink: MSG:<text>                               — plain text
    ACK     : ACK:<seq>                               — plain text

Dependencies:
    sudo pip install pyserial pycryptodome requests --break-system-packages
"""

import os
import sys
import time
import base64
import subprocess
import serial
import requests
from Crypto.Cipher import AES

# ==================== CONFIGURATION ====================

SERIAL_PORT   = '/dev/ttyAMA0'
BAUD_RATE     = 9600
RECEIVER_URL  = "http://lora-receiver.lora-demo.svc.cluster.local:8080/api/v1/messages"
DOWNLINK_FILE = '/tmp/lora-downlink.txt'   # write a message here to send to Cardputer

# ==================== KEY RETRIEVAL ====================
# The AES-256 key is stored as a Kubernetes secret (lora-encryption-key) in the
# lora-demo namespace.  The bridge retrieves it via kubectl at startup and keeps
# it only in memory — it is never written to disk.

def load_aes_key() -> bytes:
    try:
        result = subprocess.run(
            [
                'kubectl', 'get', 'secret', 'lora-encryption-key',
                '-n', 'lora-demo',
                '-o', 'jsonpath={.data.key}',
            ],
            capture_output=True,
            text=True,
            check=True,
        )
    except FileNotFoundError:
        print("[bridge] ERROR: kubectl not found — is K3s installed?", file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"[bridge] ERROR: kubectl failed: {e.stderr.strip()}", file=sys.stderr)
        sys.exit(1)

    b64_key = result.stdout.strip()
    if not b64_key:
        print("[bridge] ERROR: secret 'lora-encryption-key' not found or 'key' field is empty",
              file=sys.stderr)
        sys.exit(1)

    key = base64.b64decode(b64_key)
    if len(key) != 32:
        print(f"[bridge] ERROR: expected 32-byte AES key, got {len(key)} bytes", file=sys.stderr)
        sys.exit(1)

    print(f"[bridge] AES-256 key loaded from Kubernetes secret (lora-demo/lora-encryption-key)")
    return key

AES_KEY = load_aes_key()

last_seq     = {"cardputer": -1}
PACKET_GAP_S = 0.2

# ==================== SERIAL INIT ====================

ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=0.1)
ser.flushInput()
print(f"[bridge] Listening on {SERIAL_PORT} @ {BAUD_RATE} baud")
print(f"[bridge] To send a downlink: echo 'your message' > {DOWNLINK_FILE}")

# ==================== DECRYPTION ====================

def decrypt_payload(b64_ciphertext: str, key_bytes: bytes):
    try:
        raw = base64.b64decode(b64_ciphertext)
    except Exception as e:
        return None, f"Base64 decode error: {e}"

    if len(raw) < 17:
        return None, f"Packet too short ({len(raw)} bytes)"

    iv, ciphertext = raw[:16], raw[16:]

    try:
        decrypted = AES.new(key_bytes, AES.MODE_CBC, iv).decrypt(ciphertext)
    except Exception as e:
        return None, f"AES decrypt failed: {e}"

    pad_len = decrypted[-1]
    if pad_len < 1 or pad_len > 16:
        return None, f"Bad padding length: {pad_len}"
    for i in range(1, pad_len + 1):
        if decrypted[-i] != pad_len:
            return None, "Corrupted PKCS#7 padding"

    try:
        plaintext = decrypted[:-pad_len].decode('utf-8')
    except UnicodeDecodeError:
        return None, "Non-UTF-8 plaintext"

    parts = plaintext.split('|', 1)
    if len(parts) != 2:
        return None, f"Missing '|' in plaintext: {plaintext!r}"

    seq_str, message = parts
    try:
        return (int(seq_str), message), None
    except ValueError:
        return None, f"Non-integer seq: {seq_str!r}"

# ==================== ACK ====================

def send_ack(seq: int):
    ser.write(f"ACK:{seq}".encode())
    ser.flush()
    print(f"[bridge]   ACK:{seq} sent")

# ==================== DOWNLINK ====================

def check_and_send_downlink():
    """
    If /tmp/lora-downlink.txt exists and has content, transmit it to the
    Cardputer as MSG:<text> then delete the file.
    """
    if not os.path.exists(DOWNLINK_FILE):
        return

    try:
        with open(DOWNLINK_FILE, 'r') as f:
            text = f.read().strip()
        os.remove(DOWNLINK_FILE)
    except OSError:
        return

    if not text:
        return

    # Truncate to 100 chars to fit LoRa packet
    if len(text) > 100:
        text = text[:100]

    packet = f"MSG:{text}".encode()
    ser.write(packet)
    ser.flush()
    print(f"[bridge] TX downlink: {text!r}")

# ==================== PACKET READER ====================

def read_packet(poll_timeout: float = 1.0) -> bytes | None:
    """
    Collect UART bytes until 200ms silence (end of LoRa burst) or timeout.
    Uses a short poll_timeout so the main loop checks the downlink file frequently.
    """
    buf          = b""
    deadline     = time.monotonic() + poll_timeout
    last_rx_time = None

    while time.monotonic() < deadline:
        waiting = ser.in_waiting
        if waiting:
            buf         += ser.read(waiting)
            last_rx_time = time.monotonic()
        elif last_rx_time and (time.monotonic() - last_rx_time) >= PACKET_GAP_S:
            break
        else:
            time.sleep(0.01)

    return buf if buf else None

# ==================== MAIN LOOP ====================

print("[bridge] Waiting for packets...")

while True:
    # Check for outgoing downlink first
    check_and_send_downlink()

    raw_bytes = read_packet(poll_timeout=1.0)

    if raw_bytes is None:
        continue

    try:
        raw_str = raw_bytes.decode('utf-8').strip()
    except UnicodeDecodeError:
        print(f"[bridge] Non-UTF8 packet ({len(raw_bytes)} bytes), discarding")
        continue

    if not raw_str:
        continue

    preview = raw_str[:60] + ('...' if len(raw_str) > 60 else '')
    print(f"[bridge] RX ({len(raw_str)} chars): {preview}")

    result, error = decrypt_payload(raw_str, AES_KEY)
    if result is None:
        print(f"[bridge]   Decrypt failed: {error}")
        continue

    seq, message = result
    source = "cardputer"

    if seq <= last_seq.get(source, 0):
        print(f"[bridge]   Replay! seq={seq} <= last={last_seq[source]}, dropped")
        continue

    last_seq[source] = seq
    print(f"[bridge]   seq={seq} msg={message!r}")

    payload = {
        "seq":       seq,
        "message":   message,
        "source":    source,
        "timestamp": time.time(),
    }

    try:
        resp = requests.post(RECEIVER_URL, json=payload, timeout=5)
        if resp.status_code == 200:
            print(f"[bridge]   Forwarded OK → sending ACK")
            send_ack(seq)
        else:
            print(f"[bridge]   Receiver returned {resp.status_code}: {resp.text}")
    except requests.exceptions.RequestException as e:
        print(f"[bridge]   Receiver unreachable: {e}")

    time.sleep(0.05)
