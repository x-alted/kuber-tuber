#!/usr/bin/env python3
"""
Kuber-Tuber Receiver Service
Runs inside the Kubernetes cluster (lora-demo namespace).

Function:
    - Accepts POST /api/v1/messages with JSON body
    - Validates sequence numbers (replay protection)
    - Logs the message to stdout (which Kubernetes captures)
    - Returns 200 OK on success, 4xx on errors

This is a Flask application. It listens on port 8080.
"""

import os
import json
import time
from flask import Flask, request, jsonify

# Create the Flask app
app = Flask(__name__)

# In-memory dictionary to track the last accepted sequence number per source.
# In a production system, you might use a database or persistent volume.
# For this demo, memory is fine because the pod is stable.
last_seq = {}

@app.route('/api/v1/messages', methods=['POST'])
def receive_message():
    """
    Handle incoming POST requests from the LoRa bridge.
    Expected JSON body:
    {
        "seq": 42,
        "message": "Hello world",
        "source": "cardputer",
        "timestamp": 1743973445.123
    }
    """
    # Step 1: Check if the request has JSON body
    if not request.is_json:
        return jsonify({"status": "error", "reason": "Content-Type must be application/json"}), 400
    
    data = request.get_json()
    
    # Step 2: Validate required fields
    required_fields = ['seq', 'message', 'source']
    for field in required_fields:
        if field not in data:
            return jsonify({"status": "error", "reason": f"Missing required field: {field}"}), 400
    
    seq = data['seq']
    msg = data['message']
    source = data['source']
    ts = data.get('timestamp', time.time())  # default to now if missing
    
    # Step 3: Validate data types
    if not isinstance(seq, int) or seq < 0:
        return jsonify({"status": "error", "reason": "seq must be a non-negative integer"}), 400
    
    if not isinstance(msg, str) or len(msg) == 0:
        return jsonify({"status": "error", "reason": "message must be a non-empty string"}), 400
    
    if not isinstance(source, str) or len(source) == 0:
        return jsonify({"status": "error", "reason": "source must be a non-empty string"}), 400
    
    # Step 4: Replay protection (only accept increasing sequence numbers per source)
    last = last_seq.get(source, -1)
    if seq <= last:
        app.logger.warning(f"Replay attempt: source={source}, seq={seq} <= last={last}")
        return jsonify({"status": "error", "reason": "Sequence number out of order (possible replay)"}), 400
    
    # Step 5: Update last sequence for this source
    last_seq[source] = seq
    
    # Step 6: Log the message (this goes to Kubernetes pod logs)
    # Format: ISO 8601 timestamp (human-readable) for easier searching
    human_ts = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(ts))
    app.logger.info(f"[{human_ts}] source={source} seq={seq} msg={msg}")
    
    # Also print to stdout (same as logger.info)
    print(f"ACCEPTED: {human_ts} | {source} | seq {seq} | {msg}")
    
    # Step 7: Return success
    return jsonify({"status": "accepted", "seq": seq}), 200

# Health check endpoint (optional, useful for Kubernetes liveness probes)
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    # Run the Flask development server (for production, use gunicorn or waitress)
    # Listen on all interfaces (0.0.0.0) so the service is reachable from within the cluster.
    app.run(host='0.0.0.0', port=8080, debug=False)
