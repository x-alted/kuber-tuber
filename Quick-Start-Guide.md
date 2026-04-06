# Kuber‑Tuber Quick Start Guide

**Version:** 1.0  

This guide walks you through powering up the Kuber‑Tuber hub, sending an encrypted LoRa message from the Cardputer field node, and viewing the message in the cluster logs via Rancher.

> **Prerequisites:** All hardware is assembled, SD cards flashed, and static IPs configured per `Network-Topology.md`. If this is a first‑time setup, follow the full `Setup-&-Testing-Checklist.md` first.

---

## 1. Power Up the Hub

The system requires **10 AC outlets** (power strips recommended). Connect in this order:

1. **Router Pi** (the Raspberry Pi with two Ethernet cables – one to the managed switch, one to your upstream network if internet is desired, but not required).
2. **NETGEAR GS305E managed switch**.
3. **Mini PC** (K3s master).
4. **Ubuntu VM host** (if running on separate hardware; otherwise the VM starts automatically with its host).
5. **Worker Pis** (worker1, worker2, worker3) – worker1 has the LoRa HAT attached.

Wait 2–3 minutes for all devices to boot and obtain their static IPs.

---

## 2. Verify Network Connectivity (Optional)

From a laptop connected to the same **management VLAN** (or directly to the switch’s management port), ping the router:

```bash
ping 10.0.10.1
```

You should receive replies. If not, check cabling and power.

---

## 3. Access the Rancher Dashboard

Rancher provides a web UI to monitor the Kubernetes cluster.

1. Open a browser on any machine that can reach the **control plane VLAN** (10.0.10.0/24) – e.g., the Mini PC itself or a laptop connected to that network.
2. Go to: `https://10.0.10.214:30443`
3. Accept the self‑signed certificate warning (your browser will complain – proceed anyway).
4. Log in with:
   - **Username:** `admin`
   - **Password:** Retrieve it by running this command on the Ubuntu VM (or any machine with `kubectl` access to the cluster):
     ```bash
     kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword|base64decode}}'
     ```
5. You should see the cluster dashboard with **5 nodes** (1 master, 4 workers) all showing `Ready`.

> **Troubleshooting:** If the password doesn’t work, the secret may have been consumed after first login. Use the password you set during Rancher initialisation (documented in your secure credentials file).

---

## 4. Send a Test Message from the Cardputer

The Cardputer is pre‑programmed to send AES‑256 encrypted messages to the LoRa gateway on `worker1`.

1. **Power on the Cardputer** (USB‑C or battery).
2. Use the keyboard to type a message, e.g., `Hello Kuber-Tuber`.
3. Press the **Send** button (usually the `M5` button or a designated key – see the Cardputer manual).
4. The screen should briefly show “Sending…” and then “Sent OK”.

---

## 5. View the Received Message in the Cluster

The message flows: Cardputer → LoRa → worker1 → decryption → receiver pod → logs.

### Option A: Using `kubectl` (on the Mini PC or Ubuntu VM)

```bash
kubectl logs -n lora-demo deployment/lora-receiver --tail=20
```

You should see a line similar to:
```
2026-04-06T15:04:05Z Received: {"message": "Hello Kuber-Tuber", "source": "cardputer", "timestamp": "2026-04-06T15:04:05Z"}
```

### Option B: Using Rancher UI

1. In Rancher, click on your cluster → **Workloads** → **Pods**.
2. Find the pod named `lora-receiver-xxxxx` in the `lora-demo` namespace.
3. Click the pod name, then the **Logs** tab.
4. You’ll see the incoming messages appear in real‑time.

### Option C: Directly on worker1 (if SSH enabled)

```bash
ssh pi@10.0.20.208
journalctl -u lora-bridge -f
```

The decrypted message will appear in the bridge log.

---

## 6. Send a Second Message to Confirm

Repeat step 4 with a different message, e.g., `Test 2 – encryption works`. Verify it appears in the logs.

---

## 7. (Optional) Test Cluster Resilience

While a message is being sent, you can simulate a worker failure:

1. In Rancher, go to **Nodes**.
2. Identify a worker node (e.g., `worker2` at `10.0.20.207`).
3. Physically unplug its power.
4. Wait 30–60 seconds – any pods running on that node will be rescheduled to another worker.
5. Send another message from the Cardputer – it should still be received (the LoRa gateway `worker1` is still up).

---

## 8. Power Down (When Done)

There is no strict shutdown order, but to be safe:

1. Stop sending messages.
2. Power off the Cardputer.
3. Power off the worker Pis.
4. Power off the Mini PC.
5. Power off the router Pi.
6. Power off the switch.

---

## Common Issues & Quick Fixes

| Symptom | Likely Fix |
|---------|-------------|
| Rancher page doesn’t load | Ensure Ubuntu VM is on `10.0.10.214` and NodePort `30443` is not blocked by firewall. |
| “No packets received” on worker1 | Check antenna connection; ensure LoRa HAT is seated; verify SPI enabled (`ls /dev/spidev*`). |
| Message appears garbled | The bridge may be missing the encryption key – check `/home/pi/lora/key.b64` exists and has correct base64 key. |
| `kubectl` command not found | Install kubectl or run from Mini PC master where it’s already installed. |

For deeper troubleshooting, see `TROUBLESHOOTING.md` and `Issues-Log.md`.

---

## Next Steps

- Explore the full `Use-Cases.md` to see how Kuber‑Tuber can be deployed in real scenarios.
- Review `System-Architecture.md` for design details.
- For security hardening tasks, see `hardening+security-configuration-tasks.md`.

**Your Kuber‑Tuber hub is now live!**
