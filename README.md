# Kuber‑Tuber
### Cybersecurity Capstone Project

**An encrypted LoRa‑integrated Kubernetes cluster for off‑grid, long-range alerts and communications.**

![K3s](https://img.shields.io/badge/K3s-v1.34.5-blue)
![Rancher](https://img.shields.io/badge/Rancher-v2.9-blue)
![LoRa](https://img.shields.io/badge/LoRa-915MHz-green)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

---

## Overview

Kuber‑Tuber is a self‑contained communication hub that combines a lightweight Kubernetes cluster (K3s) with an encrypted LoRa mesh network. It provides resilient, offline messaging and data collection where traditional networks are unavailable, unreliable, or insecure – such as disaster zones, remote industrial sites, or temporary event venues.

The system consists of:
- **5‑node K3s cluster** (1 master, 4 workers) running on a mix of Raspberry Pi 4 and a MeLE Mini PC.
- **VLAN‑segmented network** with a dedicated Raspberry Pi router for isolation and security.
- **LoRa gateway** (Waveshare SX1262 HAT) attached to `worker1` for receiving encrypted messages.
- **Cardputer ADV** field node (with separate LoRa module) that sends AES‑256 encrypted messages.
- **Rancher** web UI for cluster management and monitoring, running on the K3s cluster.

**Key capabilities:**
- Encrypted text messaging without internet or cellular.
- Centralised logging and audit trail.
- Self‑healing workloads (Kubernetes reschedules pods after node failure).
- Deployable wherever AC power is available (approx. 30W typical draw).

---

## Repository Structure

```
kuber-tuber/
├── checklists/
│   ├── Setup-&-Testing-Checklist.md
│   ├── hardening+security-configuration-tasks.md
│   ├── kubernetes-configuration-tasks.md
│   ├── lora-configuration-tasks.md
│   └── networking-configuration-tasks.md
├── Documentation/
│   ├── Hardware-BOM.md
│   └── Use-Cases.md
├── LoRa/
│   ├── KuberTuber-Cardputer.ino
│   ├── decrypt_utils.py
│   ├── LoRa-Bridge.py
│   ├── receiver-service.py
│   ├── test_decryption.py
│   ├── LoRA-Test.py
│   └── LoRa-Tasks.md
├── Networking/
│   ├── Network-Topology.md
│   └── Networking-Tasks.md
├── Security/
│   ├── Risk-Assessment.md
│   ├── Threat-Model.md
│   └── Hardening-Tasks.md
├── Issues-Log.md
├── Service-Configuration.md
├── Test-Results.md
├── Quick-Start-Guide.md
├── FAQ.md
└── README.md (this file)
```

### Key Documentation

| File | Description |
|------|-------------|
| [Quick-Start-Guide.md](Quick-Start-Guide.md) | Step‑by‑step order to set up the system. |
| [Service-Configuration.md](Service-Configuration.md) | Detailed commands for K3s, Rancher, and services. |
| [Issues-Log.md](Issues-Log.md) | Running log of problems encountered and resolutions. |
| [Test-Results.md](Test-Results.md) | Connectivity matrix, failover tests, LoRa results. |
| [FAQ.md](FAQ.md) | Frequently asked questions about the project. |
| [Documentation/Use-Cases.md](Documentation/Use-Cases.md) | Realistic applications for the cluster. |
| [Networking/Network-Topology.md](Networking/Network-Topology.md) | IP assignments, VLANs, and network diagrams. |
| [checklists/](checklists/) | Task lists for setup, hardening, Kubernetes, LoRa, and networking. |
| [LoRa/](LoRa/) | Python scripts, Cardputer firmware (PlatformIO), and LoRa documentation. |
| [Security/](Security/) | Risk assessment, threat model, and hardening tasks. |

---

## Architecture

### Network Topology

The network is split into three VLANs to improve security and manageability:

| VLAN | Subnet        | Purpose                          | Devices |
|------|---------------|----------------------------------|---------|
| 1    | 10.0.0.0/24   | Management                       | Router Pi (management interface), managed switch |
| 10   | 10.0.10.0/24  | Control Plane                    | Mini PC master (K3s control plane + Rancher) |
| 20   | 10.0.20.0/24  | Workers & LoRa                   | worker1 (LoRa gateway), worker2, worker3 |

A **Raspberry Pi router** routes between VLANs and enforces firewall rules (e.g., workers cannot initiate connections to the control plane). The **NETGEAR GS305E managed switch** handles VLAN tagging and trunking.

> For a full diagram, see [Networking/Network-Topology.md](Networking/Network-Topology.md).

### Software Stack

| Component          | Technology                               |
|--------------------|------------------------------------------|
| Container orchestration | K3s (lightweight Kubernetes)         |
| Cluster management | Rancher (Helm deployment on K3s)         |
| LoRa radio         | Waveshare SX1262 HAT + Python driver     |
| Field node         | Cardputer ADV + LoRa module (ESP32‑S3)   |
| Encryption         | AES‑256 (pre‑shared key)                 |
| Remote access (optional) | Tailscale (for development)          |
| Operating systems  | Debian 13 (Mini PC), Raspberry Pi OS Lite (Pis) |

---

## Hardware Inventory

| Device                          | Role                                    | Quantity |
|---------------------------------|-----------------------------------------|----------|
| MeLE Quieter 4C Mini PC (N100, 16GB RAM, 512GB SSD) | K3s master + Rancher | 1        |
| Raspberry Pi 4 (4GB)            | Workers (three) + LoRa gateway (one)    | 4        |
| Raspberry Pi 4 (4GB)            | Dedicated router                        | 1        |
| NETGEAR GS305E                  | Managed switch (VLAN support)           | 1        |
| Waveshare SX1262 HAT            | LoRa radio attached to `worker1`        | 1        |
| Cardputer ADV                   | Field node base unit                    | 1        |
| LoRa module (e.g., Ra‑01S)      | Attached to Cardputer                   | 1        |
| Power supplies                  | 5V/3A USB‑C for each Pi, Mini PC PSU    | (7 outlets total) |

The Cardputer ADV costs approximately $30 USD. The LoRa module costs approximately $15 USD. Total field node cost is $45 USD.

---

## Getting Started

### Prerequisites

- All hardware assembled and powered.
- Static IPs assigned according to [Network-Topology.md](Networking/Network-Topology.md).
- SSH access to all nodes (key‑based authentication recommended).

### Quick Start (After Initial Setup)

1. **Verify cluster health**
   ```bash
   kubectl get nodes
   ```
   All nodes should show `Ready`.

2. **Access Rancher UI**  
   Open `https://10.0.10.201:30443` (accept self‑signed certificate).  
   Login with username `admin`. Retrieve the initial bootstrap password from the Kubernetes secret:
   ```bash
   kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword|base64decode}}'
   ```

3. **Send a test LoRa message**  
   - On the Cardputer, type a message and press Send.
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
| SSH key authentication   | Passwords disabled on all nodes; team public keys deployed. |
| Firewalls                | UFW on each node (default deny); iptables on router for inter‑VLAN filtering. |
| LoRa encryption          | AES‑256 pre‑shared key stored as Kubernetes secret. |
| VLAN isolation           | Management, control plane, and worker networks separated at Layer 2. |
| Rancher bootstrap        | Initial password reset; HTTPS only (self‑signed cert). |

For detailed hardening steps, see [Security/Hardening-Tasks.md](Security/Hardening-Tasks.md) and [Issues-Log.md](Issues-Log.md).

---

## Testing

| Test Type                | Status | Notes |
|--------------------------|--------|-------|
| Basic connectivity (ping) | ✅ Pass | All nodes reachable within VLANs. |
| Inter‑VLAN routing       | ✅ Pass | Router forwards traffic as per firewall rules. |
| LoRa send/receive (unencrypted) | ✅ Pass | Basic communication between Cardputer and `worker1`. |
| LoRa encrypted message   | ✅ Pass | AES‑256 decryption works; key from Kubernetes secret. |
| Node failure (worker)    | ✅ Pass | Pods reschedule to another worker within ~30s. |
| Rancher availability     | ✅ Pass | Dashboard accessible on master node after cluster rebuild. |

Full test matrix and failure scenario results are in [Test-Results.md](Test-Results.md).

---

## Known Issues & Workarounds

| Issue | Workaround / Resolution |
|-------|--------------------------|
| K3s does not easily change node IPs | Re‑installed K3s after moving to new subnet (documented in [Issues-Log.md](Issues-Log.md)). |
| Rancher bootstrap password ignored | Retrieved password from Kubernetes secret (see Quick Start above). |
| VLAN trunk configuration on Pi router | Used `systemd-networkd` with VLAN tagged interfaces (config in [Service-Configuration.md](Service-Configuration.md)). |

---

## Future Roadmap

- **Matrix/Dendrite integration** – Provide a full chat interface over the LoRa mesh.
- **Solar/battery power** – Make the hub truly portable.
- **Over‑the‑air key rotation** – Update encryption keys without re‑flashing field nodes.
- **Web dashboard for messages** – Replace log viewing with a user‑friendly UI.

---

## Team & Acknowledgements

**Cybersecurity Capstone Team** (alphabetical order):

- Alex – Documentation, hardware, OS configuration, Cardputer
- Anthony – Networking, programming, router configuration, VLANs
- Nathan – Kubernetes, Rancher, OS configuration, resilience testing
- Nick – LoRa, Cardputer, encryption, radio testing

Special thanks to the open‑source communities behind K3s, Rancher, and Raspberry Pi.

---

## Contact & Links

- **GitHub Repository:** [https://github.com/x-alted/kuber-tuber](https://github.com/x-alted/kuber-tuber)
- **Project Documentation:** See the table above for all markdown files
