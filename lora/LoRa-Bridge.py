from Crypto.Cipher import AES
import base64

def decrypt_payload(b64_ciphertext, key_bytes):
    # Decode base64
    raw = base64.b64decode(b64_ciphertext)
    if len(raw) < 16:
        return None, "Invalid packet"
    
    iv = raw[:16]
    ciphertext = raw[16:]
    
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv)
    decrypted = cipher.decrypt(ciphertext)
    
    # Remove PKCS#7 padding
    pad_len = decrypted[-1]
    if pad_len < 1 or pad_len > 16:
        return None, "Invalid padding"
    plaintext = decrypted[:-pad_len].decode('utf-8', errors='ignore')
    
    # Extract sequence number and message
    parts = plaintext.split('|', 1)
    if len(parts) != 2:
        return None, "Invalid format"
    try:
        seq = int(parts[0])
    except:
        return None, "Invalid sequence"
    msg = parts[1]
    
    return (seq, msg), None
