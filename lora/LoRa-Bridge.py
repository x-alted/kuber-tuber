#!/usr/bin/env python3
"""
Kuber-Tuber LoRa Bridge Service
Runs on worker1 (Raspberry Pi 4 + LoRa HAT)

Function:
    - Listen for LoRa packets (915 MHz)
    - Decrypt using AES-256-CBC (shared key)
    - Extract sequence number and message
    - Reject packets with seq <= last_seq (replay protection)
    - Forward accepted messages to the internal Kubernetes receiver service (HTTP POST)
    - Send an ACK packet back to the Cardputer

Dependencies (install via pip):
    adafruit-circuitpython-rfm9x
    pycryptodome (or cryptography)
    requests
    (RPi.GPIO, spidev are usually pre-installed on Raspberry Pi OS)
"""

import time
import board
import busio
import digitalio
import adafruit_rfm9x
import base64
import json
import requests
from Crypto.Cipher import AES

# ==================== CONFIGURATION ====================
# These values must match the Cardputer firmware

RADIO_FREQ_MHZ = 915.0          # LoRa frequency (North America)
CS_PIN = board.CE0              # Chip select pin (GPIO8, CE0)
RESET_PIN = board.D25           # Reset pin for LoRa HAT
SPI_BUS = busio.SPI(board.SCK, MOSI=board.MOSI, MISO=board.MISO)

# AES-256 key (32 bytes) – same as in the Cardputer firmware
# In production, read this from a file or environment variable, not hardcoded.
AES_KEY = bytes([
    0x60, 0x3d, 0xeb, 0x10, 0x15, 0xca, 0x71, 0xbe,
    0x2b, 0x73, 0xae, 0xf0, 0x85, 0x7d, 0x77, 0x81,
    0x1f, 0x35, 0x2c, 0x07, 0x3b, 0x61, 0x08, 0xd7,
    0x2d, 0x98, 0x10, 0xa3, 0x09, 0x14, 0xdf, 0xf4
])

# Receiver service endpoint inside the Kubernetes cluster
# This is a ClusterIP service, only reachable from within the cluster.
RECEIVER_URL = "http://lora-receiver.lora-demo.svc.cluster.local:8080/api/v1/messages"

# Replay protection: keep track of the last accepted sequence number per source
# For now, only one source ("cardputer") – can be extended to multiple devices.
last_seq = {"cardputer": 0}

# ==================== DECRYPTION FUNCTION ====================

def decrypt_payload(b64_ciphertext, key_bytes):
    """
    Decrypt a Base64-encoded LoRa packet.
    
    Packet format (produced by Cardputer firmware):
        Base64( [16-byte IV] + [AES-256-CBC ciphertext] )
    
    After decryption, the plaintext is: "<seq>|<message>"
    
    Args:
        b64_ciphertext (str): Base64 string received over LoRa.
        key_bytes (bytes): 32-byte AES key.
    
    Returns:
        tuple: (seq, message) if successful, or (None, error_reason) on failure.
    """
    try:
        # Step 1: Decode from Base64 to raw bytes
        raw = base64.b64decode(b64_ciphertext)
    except Exception as e:
        return None, f"Base64 decode error: {e}"
    
    # Minimum length: 16 bytes IV + at least 1 byte ciphertext (but realistically more)
    if len(raw) < 16:
        return None, "Packet too short (missing IV)"
    
    # Step 2: Split IV (first 16 bytes) and ciphertext (remainder)
    iv = raw[:16]
    ciphertext = raw[16:]
    
    # Step 3: Create AES-CBC cipher object with the key and IV
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv)
    
    # Step 4: Decrypt
    try:
        decrypted = cipher.decrypt(ciphertext)
    except Exception as e:
        return None, f"Decryption failed: {e}"
    
    # Step 5: Remove PKCS#7 padding
    # The last byte of the plaintext tells how many padding bytes were added.
    pad_len = decrypted[-1]
    if pad_len < 1 or pad_len > 16:
        return None, f"Invalid padding length: {pad_len}"
    
    # Verify that all padding bytes have the same value (integrity check)
    for i in range(1, pad_len + 1):
        if decrypted[-i] != pad_len:
            return None, "Corrupted padding"
    
    # Strip padding bytes
    plaintext_bytes = decrypted[:-pad_len]
    
    # Step 6: Convert bytes to string (UTF-8)
    try:
        plaintext = plaintext_bytes.decode('utf-8')
    except UnicodeDecodeError:
        return None, "Invalid UTF-8 after decryption"
    
    # Step 7: Extract sequence number and message (format: "seq|message")
    parts = plaintext.split('|', 1)   # Split only at the first '|'
    if len(parts) != 2:
        return None, f"Invalid plaintext format (expected 'seq|msg'): {plaintext}"
    
    seq_str, message = parts
    try:
        seq = int(seq_str)
    except ValueError:
        return None, f"Sequence number not an integer: {seq_str}"
    
    return (seq, message), None

# ==================== ACK SENDING FUNCTION ====================

def send_ack(seq):
    """
    Send an acknowledgment packet back to the Cardputer.
    The ACK format is simply "ACK:<seq>" (plain text, no encryption).
    
    Args:
        seq (int): The sequence number being acknowledged.
    """
    ack_message = f"ACK:{seq}"
    # rfm9x.send() expects bytes
    rfm9x.send(ack_message.encode())
    print(f"Sent ACK for seq {seq}")

# ==================== MAIN RECEIVE LOOP ====================

# Initialize SPI bus
spi = busio.SPI(board.SCK, board.MOSI, board.MISO)

# Initialize the LoRa radio object
cs = digitalio.DigitalInOut(CS_PIN)
reset = digitalio.DigitalInOut(RESET_PIN)
rfm9x = adafruit_rfm9x.RFM9x(spi, cs, reset, RADIO_FREQ_MHZ)

# Optional: set transmit power (max 23 dBm)
rfm9x.tx_power = 23

print("LoRa bridge started. Waiting for packets...")

while True:
    # Non-blocking receive with a timeout of 5 seconds
    # Returns None if no packet received within that time.
    packet = rfm9x.receive(timeout=5.0)
    
    if packet is None:
        # No packet – just continue the loop
        continue
    
    # packet is a bytes object; decode to string (assuming UTF-8)
    try:
        raw_str = packet.decode('utf-8').strip()
    except UnicodeDecodeError:
        print("Received non-UTF8 packet, ignoring")
        continue
    
    print(f"Received: {raw_str}")
    
    # Decrypt and parse
    result, error = decrypt_payload(raw_str, AES_KEY)
    if result is None:
        print(f"Decryption failed: {error}")
        continue
    
    seq, message = result
    source = "cardputer"   # could be extended to multiple devices
    
    # Replay protection: only accept if seq > last seen sequence
    if seq <= last_seq.get(source, 0):
        print(f"Replay attack detected! seq={seq} <= last_seq={last_seq[source]}. Ignoring.")
        continue
    
    # Update last accepted sequence
    last_seq[source] = seq
    
    # Build JSON payload for the receiver service
    payload = {
        "seq": seq,
        "message": message,
        "source": source,
        "timestamp": time.time()  # Unix timestamp (seconds since 1970)
    }
    
    # Forward to the Kubernetes receiver service via HTTP POST
    try:
        resp = requests.post(RECEIVER_URL, json=payload, timeout=5)
        if resp.status_code == 200:
            print(f"Message accepted by receiver (seq {seq})")
            # Send ACK back to the Cardputer
            send_ack(seq)
        else:
            print(f"Receiver returned error {resp.status_code}: {resp.text}")
    except requests.exceptions.RequestException as e:
        print(f"Failed to contact receiver service: {e}")
        # Do NOT send ACK – the message was not logged in the cluster.
        # The Cardputer will retry.
    
    # Small delay to avoid flooding the loop
    time.sleep(0.1)
