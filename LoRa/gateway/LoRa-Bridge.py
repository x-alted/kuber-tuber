#!/usr/bin/env python3
"""
Kuber-Tuber LoRa Bridge Service
Runs on worker1 (Raspberry Pi 4 + Waveshare E22-900T22S LoRa HAT)

Communication path:
    Cardputer (SX1262 via RadioLib) --> LoRa RF --> E22-900T22S HAT --> UART /dev/ttyAMA0 --> this script

The E22 HAT operates in transparent mode (jumper B, M0=M1=0):
    - Anything written to UART is transmitted via LoRa.
    - Any received LoRa packet is output to UART.

LoRa parameters must match the Cardputer firmware exactly:
    Frequency : 915.0 MHz    (CHAN = 65 on E22-900T22S, freq = 850.125 + CH)
    Bandwidth : 125 kHz      (BW_125 in E22 SPED register)
    Spreading : SF9          (air_speed closest match: 4.8 kbps)
    Coding rate: 4/7         (CR_4_7 – configure E22 if default CR doesn't match)

    To reconfigure the E22, run configure_e22.py once, then restart this service.

Dependencies:
    pip install pyserial pycryptodome requests --break-system-packages
"""

import time
import serial
import base64
import requests
from Crypto.Cipher import AES

# ==================== CONFIGURATION ====================

SERIAL_PORT  = '/dev/ttyAMA0'
BAUD_RATE    = 9600

# Kubernetes receiver service (ClusterIP, only reachable from within the cluster)
RECEIVER_URL = "http://lora-receiver.lora-demo.svc.cluster.local:8080/api/v1/messages"

# AES-256 key — must be identical to the key in the Cardputer firmware.
# In production, load this from the Kubernetes secret mounted at /etc/lora/aes_key.
# See security/lora-aes-key-secret.yaml for how to create the secret.
AES_KEY = bytes([
    0x60, 0x3d, 0xeb, 0x10, 0x15, 0xca, 0x71, 0xbe,
    0x2b, 0x73, 0xae, 0xf0, 0x85, 0x7d, 0x77, 0x81,
    0x1f, 0x35, 0x2c, 0x07, 0x3b, 0x61, 0x08, 0xd7,
    0x2d, 0x98, 0x10, 0xa3, 0x09, 0x14, 0xdf, 0xf4
])

# Per-source replay protection: maps source name -> last accepted seq
last_seq = {"cardputer": 0}

# How long to wait for silence after the first byte before treating the
# burst as a complete packet (seconds).
PACKET_GAP_S = 0.2

# ==================== SERIAL INIT ====================

ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=0.1)
ser.flushInput()
print(f"[bridge] Listening on {SERIAL_PORT} @ {BAUD_RATE} baud")

# ==================== DECRYPTION ====================

def decrypt_payload(b64_ciphertext: str, key_bytes: bytes):
    """
    Decrypt a Base64-encoded LoRa packet.

    Packet format (from Cardputer firmware):
        Base64( [16-byte IV] + [AES-256-CBC ciphertext] )

    Plaintext after decryption: "<seq>|<message>"

    Returns:
        ((seq, message), None)  on success
        (None, error_string)    on failure
    """
    try:
        raw = base64.b64decode(b64_ciphertext)
    except Exception as e:
        return None, f"Base64 decode error: {e}"

    if len(raw) < 17:   # 16-byte IV + at least 1 byte
        return None, f"Packet too short ({len(raw)} bytes)"

    iv         = raw[:16]
    ciphertext = raw[16:]

    try:
        cipher    = AES.new(key_bytes, AES.MODE_CBC, iv)
        decrypted = cipher.decrypt(ciphertext)
    except Exception as e:
        return None, f"AES decrypt failed: {e}"

    # PKCS#7 unpadding
    pad_len = decrypted[-1]
    if pad_len < 1 or pad_len > 16:
        return None, f"Bad padding length: {pad_len}"
    for i in range(1, pad_len + 1):
        if decrypted[-i] != pad_len:
            return None, "Corrupted PKCS#7 padding"

    try:
        plaintext = decrypted[:-pad_len].decode('utf-8')
    except UnicodeDecodeError:
        return None, "Non-UTF-8 plaintext after decryption"

    parts = plaintext.split('|', 1)
    if len(parts) != 2:
        return None, f"Missing '|' separator in plaintext: {plaintext!r}"

    seq_str, message = parts
    try:
        seq = int(seq_str)
    except ValueError:
        return None, f"Non-integer seq field: {seq_str!r}"

    return (seq, message), None

# ==================== ACK ====================

def send_ack(seq: int):
    """
    Send ACK:<seq> back to the Cardputer via UART → LoRa.
    The Cardputer expects the exact string "ACK:<seq>" within 1500 ms.
    """
    ack = f"ACK:{seq}".encode()
    ser.write(ack)
    ser.flush()
    print(f"[bridge]   ACK:{seq} sent")

# ==================== PACKET READER ====================

def read_packet(poll_timeout: float = 5.0) -> bytes | None:
    """
    Block until a LoRa packet arrives on UART or poll_timeout expires.

    In E22 transparent mode the module bursts out the received LoRa
    packet as raw bytes with no framing. We collect bytes until 200 ms
    of silence signals end-of-packet.

    Returns:
        bytes   — raw packet contents
        None    — nothing received within poll_timeout
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
            break   # silence after data → packet complete
        else:
            time.sleep(0.01)

    return buf if buf else None

# ==================== MAIN LOOP ====================

print("[bridge] Waiting for packets...")

while True:
    raw_bytes = read_packet(poll_timeout=5.0)

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
    source       = "cardputer"

    # Replay protection
    if seq <= last_seq.get(source, 0):
        print(f"[bridge]   Replay! seq={seq} <= last={last_seq[source]}, dropped")
        continue

    last_seq[source] = seq
    print(f"[bridge]   seq={seq} msg={message!r}")

    # Forward to Kubernetes receiver
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
            # No ACK — Cardputer will retry
    except requests.exceptions.RequestException as e:
        print(f"[bridge]   Receiver unreachable: {e}")
        # No ACK — Cardputer will retry

    time.sleep(0.05)
