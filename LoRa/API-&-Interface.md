# Kuber‑Tuber API / Interface Specification

**Version:** 1.0  
**Date:** April 6, 2026  

---

## 1. Overview

This document defines the interfaces between components of the Kuber‑Tuber system:

- **LoRa Bridge** (Python service on `worker1`) → **Receiver Service** (Kubernetes pod inside the cluster)
- **Receiver Service** → **Cluster Logs** (for audit and monitoring)

The API is internal to the Kubernetes cluster and is **not exposed externally**. All communication occurs over HTTP (plaintext) but is isolated by Kubernetes network policies and VLAN segmentation.

---

## 2. LoRa Bridge → Receiver Service API

### 2.1 Endpoint

```
POST http://lora-receiver.lora-demo.svc.cluster.local:8080/api/v1/messages
```

- **Service name:** `lora-receiver`
- **Namespace:** `lora-demo`
- **Port:** `8080`
- **Protocol:** HTTP (internal cluster network only)

### 2.2 Request Format

**Content-Type:** `application/json`

**Body schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `seq` | integer | Yes | Monotonically increasing sequence number (persistent across Cardputer reboots) |
| `message` | string | Yes | Decrypted plaintext message (UTF-8) |
| `source` | string | Yes | Fixed identifier, e.g., `"cardputer"` (future: may include device ID) |
| `timestamp` | string | Yes | ISO 8601 timestamp when the message was **received and decrypted** by the bridge (not the LoRa send time) |

**Example request:**
```json
{
  "seq": 42,
  "message": "Security: Crowd surge at north gate",
  "source": "cardputer",
  "timestamp": "2026-04-06T15:04:05.123Z"
}
```

### 2.3 Response Format

**Success (HTTP 200):**
```json
{
  "status": "accepted",
  "seq": 42
}
```

**Error (HTTP 4xx/5xx):**
```json
{
  "status": "error",
  "reason": "Invalid sequence number"
}
```

Common error reasons:
- `"missing required field"`
- `"invalid sequence number"` (e.g., non‑integer)
- `"message too long"`
- `"internal error"`

### 2.4 Behaviour

- The receiver service **validates** that `seq` is greater than the last accepted sequence for the given `source` (replay protection).
- If valid, it logs the message to stdout (Kubernetes logs) and returns `200 OK`.
- If invalid (e.g., duplicate or out‑of‑order sequence), it returns `400 Bad Request` with an error reason. The bridge **should not** retry in this case (the message is a replay and is discarded).
- The receiver does **not** store messages persistently beyond the pod’s ephemeral logs (unless a persistent volume is configured).

---

## 3. LoRa Bridge Internal Functions (Not Exposed)

The bridge script on `worker1` uses the following internal logic (not an API, but documented for clarity).

### 3.1 Decryption Function

```python
def decrypt_payload(b64_ciphertext, key_bytes) -> (int, str) | (None, str)
```

- **Input:** Base64‑encoded ciphertext (IV + AES‑256‑CBC encrypted payload)
- **Output:** Tuple `(seq, message)` or `(None, error_reason)`
- **Side effect:** None

### 3.2 LoRa Reception Loop

```python
while True:
    packet = rfm9x.receive(timeout=5.0)
    if packet:
        b64_str = packet.decode().strip()
        result = decrypt_payload(b64_str, aes_key)
        if result:
            seq, msg = result
            # Send HTTP POST to receiver service (Section 2)
            # If HTTP 200, optionally send LoRa ACK back to Cardputer
```

### 3.3 ACK Transmission (Optional)

If two‑way ACK is enabled, the bridge sends a short packet back to the Cardputer after successful HTTP 200:

**Format:** `ACK:<seq>` (plaintext, no encryption)

Example: `ACK:42`

The Cardputer listens for this ACK for a short window (e.g., 1.5 seconds) and retries if not received.

---

## 4. Receiver Service Implementation Notes

### 4.1 Endpoint Implementation (Python Flask Example)

```python
from flask import Flask, request, jsonify
import os

app = Flask(__name__)

# In‑memory last sequence per source (for replay protection)
last_seq = {"cardputer": 0}

@app.route('/api/v1/messages', methods=['POST'])
def receive_message():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "reason": "Missing JSON body"}), 400
    
    seq = data.get('seq')
    msg = data.get('message')
    source = data.get('source', 'unknown')
    ts = data.get('timestamp')
    
    if seq is None or msg is None:
        return jsonify({"status": "error", "reason": "Missing required field"}), 400
    
    if not isinstance(seq, int) or seq < 0:
        return jsonify({"status": "error", "reason": "Invalid sequence number"}), 400
    
    # Replay protection
    if seq <= last_seq.get(source, 0):
        return jsonify({"status": "error", "reason": "Replayed or out‑of‑order sequence"}), 400
    
    last_seq[source] = seq
    
    # Log to stdout (collected by Kubernetes)
    app.logger.info(f"Message: seq={seq} source={source} msg={msg} ts={ts}")
    
    return jsonify({"status": "accepted", "seq": seq}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### 4.2 Kubernetes Deployment (Minimal)

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
        command: ["python", "-c", "import flask; ..."]  # or mount script
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

---

## 5. Error Handling & Retry Policy

| Component | Error Type | Action |
|-----------|------------|--------|
| Bridge | LoRa send failure (no ACK) | Retry up to 3 times, exponential backoff (200ms, 400ms, 800ms). After final failure, discard message and log error locally. |
| Bridge | HTTP POST to receiver returns 4xx/5xx | Do **not** retry (receiver rejects invalid data). Log error. |
| Bridge | HTTP timeout (>5 seconds) | Retry once after 1 second; if still failing, log and discard. |
| Receiver | Duplicate sequence number | Return 400; bridge logs "replay detected" and does not retry. |
| Receiver | Malformed JSON | Return 400; bridge logs error and discards. |

---

## 6. Security Considerations

- All API communication is **inside the Kubernetes cluster**, protected by network policies (only the LoRa bridge pod can access the receiver service).
- LoRa payloads are **encrypted with AES‑256‑CBC**; the bridge decrypts before forwarding.
- The receiver service does **not** require authentication (reliance on network isolation). For production, consider adding a shared secret or mutual TLS.
- Sequence numbers provide **replay protection** at the application layer.

---

## 7. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-06 | Initial specification; removed Ubuntu VM reference |

---

## 8. Related Documents

- `Service-Configuration.md` – Installation steps for LoRa bridge and receiver
- `Threat-Model.md` – Security analysis of this API
- `Cardputer-Manual.md` – User guide for the field node

```

This document is ready for your repository. It assumes the receiver service runs inside the cluster (on the Mini PC master or any worker) and is reachable via internal DNS. Adjust the service name or port if your actual deployment differs.
