#!/usr/bin/env python3
"""
Stress test for the decryption logic.
Run this on any machine with Python and pycryptodome installed.
It does NOT require LoRa hardware.
"""

import time
import random
from decrypt_utils import decrypt_payload
from Crypto.Cipher import AES
import base64

# Use the same key as in the firmware
AES_KEY = bytes([
    0x60, 0x3d, 0xeb, 0x10, 0x15, 0xca, 0x71, 0xbe,
    0x2b, 0x73, 0xae, 0xf0, 0x85, 0x7d, 0x77, 0x81,
    0x1f, 0x35, 0x2c, 0x07, 0x3b, 0x61, 0x08, 0xd7,
    0x2d, 0x98, 0x10, 0xa3, 0x09, 0x14, 0xdf, 0xf4
])

def encrypt_test_packet(seq, message):
    """Simulate the Cardputer encryption – for testing only."""
    plain = f"{seq}|{message}"
    # PKCS#7 padding
    block_size = 16
    pad_len = block_size - (len(plain) % block_size)
    padded = plain.encode() + bytes([pad_len] * pad_len)
    
    iv = bytes([random.randint(0, 255) for _ in range(16)])
    cipher = AES.new(AES_KEY, AES.MODE_CBC, iv)
    ciphertext = cipher.encrypt(padded)
    
    # Combine IV + ciphertext, then Base64
    raw = iv + ciphertext
    return base64.b64encode(raw).decode()

def test_decryption():
    print("Starting decryption stress test...")
    
    # Test 1: Valid packet
    b64 = encrypt_test_packet(42, "Hello Kuber-Tuber")
    result, err = decrypt_payload(b64, AES_KEY)
    assert result == (42, "Hello Kuber-Tuber"), f"Valid packet failed: {err}"
    print("✓ Valid packet decrypted correctly")
    
    # Test 2: Tampered packet (change one byte)
    b64_bytes = bytearray(base64.b64decode(b64))
    b64_bytes[10] ^= 0x01  # flip a bit
    tampered = base64.b64encode(b64_bytes).decode()
    result, err = decrypt_payload(tampered, AES_KEY)
    assert result is None, "Tampered packet should fail"
    print("✓ Tampered packet correctly rejected")
    
    # Test 3: Wrong key
    wrong_key = bytes([0x00] * 32)
    result, err = decrypt_payload(b64, wrong_key)
    assert result is None, "Wrong key should fail"
    print("✓ Wrong key correctly rejected")
    
    # Test 4: Stress – 1000 valid packets
    for i in range(1000):
        b64 = encrypt_test_packet(i, f"Test message {i}")
        result, err = decrypt_payload(b64, AES_KEY)
        assert result == (i, f"Test message {i}"), f"Failed at seq {i}: {err}"
    print("✓ 1000 sequential packets decrypted without error")
    
    print("All stress tests passed.")

if __name__ == "__main__":
    test_decryption()
