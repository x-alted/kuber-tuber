Here is a complete `README.md` for your project, based on the documentation and current status. You can copy this into your repository’s root.
# Kuber‑Tuber

**A portable, encrypted LoRa‑integrated Kubernetes cluster for off‑grid communications**  
*Cybersecurity Capstone Project*

![K3s](https://img.shields.io/badge/K3s-v1.34.5-blue)
![Rancher](https://img.shields.io/badge/Rancher-v2.9-blue)
![LoRa](https://img.shields.io/badge/LoRa-915MHz-green)
![License](https://img.shields.io/badge/License-MIT-lightgrey)


## Overview

Kuber‑Tuber is a self‑contained communication hub that combines a lightweight Kubernetes cluster (K3s) with an encrypted LoRa mesh network. It is designed to provide resilient, offline messaging and data collection in environments where traditional networks are unavailable, unreliable, or insecure – such as disaster zones, remote industrial sites, or temporary event venues.

The system consists of:
- **5‑node K3s cluster** (1 master, 4 workers) running on a mix of Raspberry Pi 4 and a Mini PC.
- **VLAN‑segmented network** with a dedicated Raspberry Pi router for isolation and security.
- **LoRa gateway** (Waveshare SX1262 HAT) attached to `worker1` for receiving encrypted messages.
- **Cardputer ADV** field node that sends AES‑256 encrypted messages over LoRa.
- **Rancher** web UI for cluster management and monitoring.

**Key capabilities:**
- Encrypted text messaging without internet or cellular.
- Centralised logging, audit trail, and role‑based access.
- Self‑healing workloads (Kubernetes reschedules pods after node failure).
- Deployable in any location with sufficient power (10 AC outlets).

---

## Repository Structure

```
docs/
├── SETUP-CHECKLIST.md       # Hardware/OS validation & weekly progress log
├── NETWORK-TOPOLOGY.md      # IP assignments, VLANs, Tailscale, diagrams
├── SERVICE-CONFIG.md        # Installation steps for K3s, Rancher, LoRa bridge
├── ISSUES-LOG.md            # Problems encountered and resolutions
└── TEST-RESULTS.md          # Connectivity, failover, LoRa range results
```

## Architecture

### Network Topology

The network is split into three VLANs to improve security and manageability:

| VLAN | Subnet        | Purpose                          | Devices |
|------|---------------|----------------------------------|---------|
| 1    | 10.0.0.0/24   | Management                       | Router Pi (mgmt interface), managed switch |
| 10   | 10.0.10.0/24  | Control Plane                    | Mini PC (master), Ubuntu VM (Rancher) |
| 20   | 10.0.20.0/24  | Workers & LoRa                   | worker1 (LoRa gateway), worker2, worker3, unmanaged switch |

A **Raspberry Pi router** routes between VLANs and enforces firewall rules (e.g., workers cannot initiate connections to the control plane). The **NETGEAR GS305E managed switch** handles VLAN tagging and trunking.

> For a full diagram, see `NETWORK-TOPOLOGY.md`.

### Software Stack

| Component          | Technology                               |
|--------------------|------------------------------------------|
| Container orchestration | K3s (lightweight Kubernetes)         |
| Cluster management | Rancher (Helm deployment)                |
| LoRa radio         | Waveshare SX1262 HAT + Python driver     |
| Field node         | Cardputer ADV (ESP32‑S3, LoRa Cap 868/915) |
| Encryption         | AES‑256 (pre‑shared key)                 |
| Remote access      | Tailscale (optional, for team access)    |
| Operating systems  | Debian 13 (Mini PC), Raspberry Pi OS Lite (Pis), Ubuntu 22.04 (VM) |

---

## Hardware Inventory

| Device               | Role                                    | Quantity |
|----------------------|-----------------------------------------|----------|
| Mini PC (Debian)     | K3s master                              | 1        |
| Raspberry Pi 4       | Workers (three) + LoRa gateway (one)    | 4        |
| Raspberry Pi 4       | Dedicated router                        | 1        |
| NETGEAR GS305E       | Managed switch (VLAN support)           | 1        |
| Unmanaged switch     | Extends worker network                  | 1        |
| Waveshare SX1262 HAT | LoRa radio attached to `worker1`        | 1        |
| Cardputer ADV        | LoRa field node (sends messages)        | 1        |
| Power supplies       | 5V/3A USB‑C for each Pi + Mini PC PSU   | (10 outlets total) |

---

## Getting Started

### Prerequisites

- All hardware assembled and powered.
- Static IPs assigned according to `NETWORK-TOPOLOGY.md`.
- SSH access to all nodes (password or key‑based).

### Quick Start (After Initial Setup)

1. **Verify cluster health**
   ```bash
   kubectl get nodes
   ```
   All nodes should show `Ready`.

2. **Access Rancher UI**  
   Open `https://10.0.10.214:30443` (accept self‑signed certificate).  
   Login with admin credentials (retrieve from bootstrap secret if needed).

3. **Send a test LoRa message**  
   - On the Cardputer, select the pre‑configured encrypted message option.
   - On `worker1`, tail the LoRa receiver logs:
     ```bash
     journalctl -u lora-gateway -f
     ```
   - The decrypted message should appear in the logs.

4. **Deploy a sample workload**
   ```bash
   kubectl create deployment nginx --image=nginx
   kubectl expose deployment nginx --port=80 --type=NodePort
   ```

---

## Security Features

| Control                  | Implementation |
|--------------------------|----------------|
| SSH key authentication   | Passwords disabled on all nodes; team public key deployed. |
| Firewalls                | UFW on each node (default deny); iptables on router for inter‑VLAN filtering. |
| Kubernetes RBAC          | Role‑based access control configured; audit logging enabled. |
| LoRa encryption          | AES‑256 pre‑shared key stored as Kubernetes secret. |
| VLAN isolation          | Management, control plane, and worker networks separated at Layer 2. |
| Rancher bootstrap        | Initial password reset; HTTPS only (self‑signed cert). |

For detailed hardening steps, see `SERVICE-CONFIG.md` and `ISSUES-LOG.md`.

---

## Testing

| Test Type                | Status | Notes |
|--------------------------|--------|-------|
| Basic connectivity (ping) | ✅ Pass | All nodes reachable within VLANs. |
| Inter‑VLAN routing       | ✅ Pass | Router forwards traffic as per firewall rules. |
| LoRa send/receive (unencrypted) | ✅ Pass | Basic communication between Cardputer and `worker1`. |
| LoRa encrypted message   | ✅ Pass | AES‑256 decryption works; key from Kubernetes secret. |
| Node failure (worker)    | ✅ Pass | Pods reschedule to another worker within ~30s. |
| Rancher availability     | ✅ Pass | Dashboard accessible after cluster rebuild. |

Full test matrix and failure scenario results are in `TEST-RESULTS.md`.

---

## Known Issues & Workarounds

| Issue | Workaround / Resolution |
|-------|--------------------------|
| K3s does not easily change node IPs | Re‑installed K3s after moving to new subnet (documented in `ISSUES-LOG.md`). |
| Rancher bootstrap password ignored | Retrieved password from Kubernetes secret: `kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword\|base64decode}}'` |
| VLAN trunk configuration on Pi router | Used `systemd-networkd` with VLAN tagged interfaces (config in `SERVICE-CONFIG.md`). |
| Tailscale connectivity drops | Re‑authenticated Tailscale; now stable. |

---

## Future Roadmap

- **Multi‑cluster federation** – Link multiple Kuber‑Tuber hubs over LoRa.
- **Matrix/Dendrite integration** – Provide a full chat interface over the mesh.
- **Solar/battery power** – Make the hub truly portable (reduce outlet dependency).
- **Over‑the‑air key rotation** – Update encryption keys without re‑flashing field nodes.
- **Web dashboard for messages** – Replace log viewing with a user‑friendly UI.

---

## Team & Acknowledgements

**Cybersecurity Capstone Team** (alphabetical order):

- Alex – Documentation, encryption, hardware, presentation
- Anthony – Networking, router configuration, VLANs
- Nathan – Kubernetes, Rancher, Mini PC owner, resilience testing
- Nick – LoRa HAT installation, Tailscale, radio testing

Instructor: [Name]

Special thanks to the open‑source communities behind K3s, Rancher, and Raspberry Pi.

---

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## Contact & Links

- **GitHub Repository:** [https://github.com/x-alted/kuber-tuber](https://github.com/x-alted/kuber-tuber)
- **Project Documentation:** `/docs` folder
- **Demo Video:** (link to recorded presentation)

---

*Built with 💻 and ☕ for the April 2026 capstone.*
```

| [`ISSUES-LOG.md`](./issues-log.md) | Running log of problems encountered and how they were resolved. |
| [`TEST-RESULTS.md`](./Test-Results.md) | Detailed test outcomes (connectivity matrix, failover tests, LoRa range, etc.). |
