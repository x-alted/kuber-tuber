"""
Shared decryption utilities for Kuber-Tuber.
Used by both the LoRa bridge and any test scripts.
"""

import base64
from Crypto.Cipher import AES

def decrypt_payload(b64_ciphertext, key_bytes):
    """
    Decrypt a Base64-encoded LoRa packet.
    Returns (seq, message) or (None, error_reason).
    (Same as in lora_bridge.py – see that file for detailed comments.)
    """
    try:
        raw = base64.b64decode(b64_ciphertext)
    except Exception as e:
        return None, f"Base64 decode error: {e}"
    
    if len(raw) < 17:
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
