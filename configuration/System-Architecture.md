# Kuber‑Tuber System Architecture & Design Document

**Version:** 1.0  
**Date:** April 6, 2026  
**Authors:** Alex, Anthony, Nathan, Nick

---

## 1. Executive Summary

Kuber‑Tuber is a self‑contained, encrypted communication hub that combines a lightweight Kubernetes cluster (K3s) with a LoRa mesh network. It operates entirely offline, providing resilient messaging and data collection for disaster zones, remote industrial sites, temporary event venues, and IoT backup scenarios. The system uses VLAN‑segmented networking, a dedicated Raspberry Pi router, and AES‑256 encryption to ensure security and isolation. Key components include a 5‑node K3s cluster (1 master + 4 workers), a Waveshare SX1262 LoRa HAT gateway on `worker1`, a Cardputer ADV field node, and Rancher for cluster management.

---

## 2. Requirements

### 2.1 Functional Requirements
- **FR1:** Send and receive encrypted text messages over LoRa (915 MHz) without internet.
- **FR2:** Log all messages centrally with timestamps and source identifiers.
- **FR3:** Automatically reschedule workloads when a worker node fails.
- **FR4:** Provide a web‑based cluster management dashboard (Rancher) accessible via local network.
- **FR5:** Isolate network traffic into at least two VLANs (control plane and workers) with firewall rules.
- **FR6:** Support remote administrative access via Tailscale (optional, not required for core operation).

### 2.2 Non‑Functional Requirements
- **NFR1 (Resilience):** Pods must reschedule to another healthy node within 2 minutes of worker failure.
- **NFR2 (Security):** All network traffic between VLANs must be explicitly allowed; default deny.
- **NFR3 (Encryption):** LoRa payloads encrypted with AES‑256 (pre‑shared key).
- **NFR4 (Portability):** The entire hub must fit in a single rolling case and run off standard AC outlets (10 total).
- **NFR5 (Offline operation):** No dependency on cloud or cellular services during normal operation.

---

## 3. High‑Level Architecture

### 3.1 Logical Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Field Node (Cardputer)                 │
│                   AES‑256 encrypted LoRa packets             │
└───────────────────────────────┬─────────────────────────────┘
                                │ LoRa (915 MHz)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  Worker1 (Raspberry Pi 4) – LoRa Gateway                     │
│  - Waveshare SX1262 HAT                                      │
│  - LoRa Bridge Service (Python)                              │
│  - Forwards decrypted messages to cluster via HTTP           │
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTP (cluster internal)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Kubernetes Cluster (K3s)                     │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Receiver Pod    │  │ Other workloads │                   │
│  │ (logs messages) │  │ (test nginx,    │                   │
│  └─────────────────┘  │  monitoring)    │                   │
│                       └─────────────────┘                   │
│  Master: Mini PC (10.0.10.201)                               │
│  Workers: Ubuntu VM (10.0.10.214), worker1,2,3 (10.0.20.x)   │
└───────────────────────────────┬─────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
            ┌──────────────┐        ┌──────────────┐
            │ Rancher UI   │        │ Router Pi    │
            │ (management) │        │ (inter‑VLAN  │
            └──────────────┘        │  routing)    │
                                    └──────────────┘
```

### 3.2 Network Topology (Physical & VLANs)

| VLAN | Subnet        | Purpose         | Devices |
|------|---------------|-----------------|---------|
| 1    | 10.0.0.0/24   | Management      | Router Pi (mgmt), managed switch |
| 10   | 10.0.10.0/24  | Control Plane   | Mini PC (master), Ubuntu VM (Rancher) |
| 20   | 10.0.20.0/24  | Workers & LoRa  | worker1 (LoRa gateway), worker2, worker3, unmanaged switch |

- **Router Pi:** Connects to managed switch on a trunk port (tagged VLAN 10 & 20). Provides inter‑VLAN routing with iptables firewall.
- **Managed switch (NETGEAR GS305E):** Access ports for control plane devices (VLAN 10) and workers (VLAN 20).
- **Unmanaged switch:** Extends VLAN 20 to additional workers.

For detailed IP assignments, see `Network-Topology.md`.

---

## 4. Component Deep Dives

### 4.1 Kubernetes Cluster (K3s)

- **Master node:** Mini PC (Debian 13) – runs K3s server process, etcd, API server.
- **Worker nodes:** 3 Raspberry Pi 4s + 1 Ubuntu VM (Rancher host).
- **Installation:** Standard K3s script with `--tls-san` to include master IP.
- **Networking:** Flannel (VXLAN) for pod‑to‑pod communication across nodes.
- **Service discovery:** CoreDNS.

**Resilience:** K3s automatically reschedules pods from failed nodes after a 45‑second grace period (configurable). Tested by powering off a worker – pods moved to another worker within 60 seconds.

### 4.2 Rancher Management Server

- **Host:** Ubuntu 22.04 VM on VirtualBox (bridged network).
- **Installation:** Helm chart with cert‑manager for TLS (self‑signed).
- **Access:** `https://10.0.10.214:30443` (NodePort).
- **Authentication:** Admin password retrieved from Kubernetes secret (`bootstrap-secret`).
- **Role:** Cluster visibility, workload management, node monitoring.

### 4.3 LoRa Gateway (worker1)

- **Hardware:** Raspberry Pi 4 + Waveshare SX1262 HAT (915 MHz).
- **Software:** Python virtual environment with `adafruit-circuitpython-rfm9x`.
- **Bridge service:** Systemd service (`lora-bridge.service`) that:
  - Listens for LoRa packets.
  - Decrypts payload using AES‑256 (key from Kubernetes secret, mounted via file).
  - Sends decrypted text as HTTP POST to the internal receiver service (`lora-receiver.lora-demo.svc.cluster.local:8080`).
- **SPI configuration:** Enabled in `/boot/config.txt`; CS pin = CE0 (GPIO8), reset pin = GPIO25.

### 4.4 Router Pi (Inter‑VLAN Routing)

- **Hardware:** Raspberry Pi 4 with single Ethernet port.
- **OS:** Raspberry Pi OS Lite.
- **VLAN interfaces:** `eth0.10` (10.0.10.1/24) and `eth0.20` (10.0.20.1/24) created via `systemd-networkd`.
- **DHCP:** `dnsmasq` serving leases for both VLANs.
- **Firewall:** `iptables` rules allow:
  - SSH from control plane to workers (port 22).
  - HTTP from worker1 to receiver service (port 8080).
  - Default DROP on FORWARD chain.
- **IP forwarding:** Enabled in `/etc/sysctl.conf`.

### 4.5 Field Node – Cardputer ADV

- **Microcontroller:** ESP32‑S3 with LoRa Cap 868/915 module.
- **Firmware:** Arduino sketch (custom) that:
  - Accepts text input via keyboard.
  - Encrypts using AES‑256 (CBC mode) with pre‑shared key.
  - Transmits over LoRa at 915 MHz.
- **Role:** Mobile sender; can be used by field personnel to send alerts or structured messages.

---

## 5. Data Flow & Encryption

### 5.1 Message Lifecycle

1. **User** types message on Cardputer → encrypts with AES‑256 → sends LoRa packet.
2. **worker1** receives packet → bridge script decrypts using same key → constructs JSON `{"message": "...", "timestamp": "...", "source": "cardputer"}`.
3. **bridge** performs HTTP POST to `lora-receiver` service inside cluster.
4. **receiver pod** logs the message to stdout (captured by `journalctl` or Kubernetes logs).
5. **Rancher UI** (or `kubectl logs`) can be used to view the message.

### 5.2 Encryption Details

- **Algorithm:** AES‑256 CBC.
- **Key length:** 32 bytes (256 bits).
- **Key storage:** Kubernetes secret (`lora-encryption-key`) in `lora-demo` namespace.
- **Initialization Vector (IV):** Random 16 bytes, prepended to ciphertext.
- **Padding:** PKCS#7.
- **Decryption on worker1:** Bridge reads key from a mounted secret file (or environment variable) – **not** hardcoded.

### 5.3 Inter‑Component Communication Security

| Path | Protocol | Encryption | Authentication |
|------|----------|------------|----------------|
| Cardputer → worker1 (LoRa) | LoRa (raw) | AES‑256 (app‑layer) | Pre‑shared key |
| worker1 → receiver pod | HTTP (cluster internal) | None (cluster network isolated) | None (relies on network policy) |
| User → Rancher UI | HTTPS | TLS (self‑signed) | Password (admin) |
| SSH to any node | SSH | TLS‑equivalent | SSH key (Ed25519) |
| K3s API | HTTPS | TLS | Token + RBAC |

---

## 6. Security Architecture

### 6.1 Host Hardening (All Nodes)
- SSH key authentication only; password authentication disabled.
- Fail2ban installed and running.
- UFW default deny incoming; allow only SSH (port 22) and necessary Kubernetes ports (e.g., 6443 on master).
- Unnecessary services (Bluetooth, Wi‑Fi) disabled.

### 6.2 Network Security
- VLAN isolation (control plane vs. workers).
- Router Pi firewall: default DROP on FORWARD; explicit allow rules for required traffic (e.g., SSH from 10.0.10.0/24 to 10.0.20.0/24).
- No NAT between VLANs (unless internet access needed – not required for core operation).

### 6.3 Kubernetes Security
- RBAC enabled; namespaces (`lora-demo`, `cattle-system`, etc.) with least privilege.
- Network policies: default deny all ingress/egress in `lora-demo`; allow only from LoRa bridge to receiver.
- Secrets encrypted at rest (K3s uses AES‑GCM for etcd).
- Pod security standards: `baseline` enforced for production namespaces.

### 6.4 Encryption Key Management
- LoRa encryption key stored as Kubernetes secret, base64 encoded.
- Secret mounted into bridge pod (if bridge runs in cluster) or copied to worker1 via secure channel (current implementation: file on worker1 with permissions 600).

---

## 7. Resilience & Failure Modes

| Failure Scenario | Expected Behaviour | Recovery Time | Tested |
|------------------|--------------------|---------------|--------|
| Worker node power off | Pods on that node are marked `Terminating`; rescheduled to another ready worker | < 90 sec | Yes |
| Master node reboot | API server temporarily unavailable; workers continue running existing pods; after master returns, cluster re‑establishes | < 2 min | Yes |
| LoRa bridge service crash | Systemd restarts service automatically (Restart=always) | < 10 sec | Planned |
| Switch reboot | All devices lose connectivity temporarily; static IPs preserved; after switch up, pings resume | ~30 sec | Yes |
| Network partition (VLAN trunk down) | Router Pi cannot route; intra‑VLAN communication remains; cross‑VLAN fails | Until link restored | No |

---

## 8. Deployment & Configuration

### 8.1 Provisioning Steps (Summary)

1. Flash OS images (Debian on Mini PC, Raspberry Pi OS Lite on Pis, Ubuntu on VM).
2. Assign static IPs per `Network-Topology.md`.
3. Configure VLANs on managed switch and router Pi (see `networking-configuration-tasks.md`).
4. Install K3s on master and join workers (see `kubernetes-configuration-tasks.md`).
5. Deploy Rancher via Helm on Ubuntu VM.
6. Install LoRa HAT on worker1, enable SPI, test basic send/receive.
7. Create Kubernetes secret for LoRa encryption key.
8. Deploy receiver service and bridge script (systemd).
9. Test end‑to‑end encrypted message flow.

### 8.2 Configuration Files (Key Locations)

| Component | Config File |
|-----------|-------------|
| Router Pi VLANs | `/etc/systemd/network/*.netdev`, `*.network` |
| Router Pi DHCP | `/etc/dnsmasq.conf` |
| Router Pi firewall | iptables rules (persisted via `netfilter-persistent`) |
| K3s master | `/etc/rancher/k3s/k3s.yaml` |
| LoRa bridge service | `/etc/systemd/system/lora-bridge.service` |
| Bridge script | `/home/pi/lora/lora_bridge.py` |
| Encryption key (worker1) | `/home/pi/lora/key.b64` (permissions 600) |

Full installation steps are documented in `Service-Configuration.md` and checklists.

---

## 9. Design Decisions & Trade‑offs

| Decision | Alternative | Rationale |
|----------|-------------|-----------|
| Use K3s instead of full Kubernetes | MicroK8s, kubeadm | Lightweight, low resource usage on Pis, simple installation. |
| Single router Pi with VLAN tagging | Separate physical router or layer‑3 switch | Cost effective; provides full control over iptables; fits within hardware budget. |
| AES‑256 CBC instead of GCM | GCM, ChaCha20 | CBC is simpler to implement on Cardputer (Arduino libraries available); GCM would require additional nonce management. |
| No persistent message storage | SQLite, PostgreSQL | Logs are ephemeral; for demo, `kubectl logs` sufficient. Future versions can add storage. |
| Tailscale for remote access | WireGuard, port forwarding | Tailscale provides zero‑conf NAT traversal; used only temporarily – not required for final demo. |
| Rebuild K3s cluster after IP change | Attempt to update node IPs via K3s config | K3s does not gracefully support IP changes; rebuild is documented and reliable. |

---

## 10. Future Improvements

- **Persistent message database** – Store all messages in a PostgreSQL pod with a simple web UI.
- **Over‑the‑air key rotation** – Update encryption keys without re‑flashing Cardputer.
- **Multi‑cluster federation** – Link multiple Kuber‑Tuber hubs over long‑range LoRa.
- **Solar/battery power** – Reduce dependence on AC outlets for true portability.
- **Matrix/Dendrite integration** – Provide a full chat interface over the mesh.

---

## 11. References & Related Documents

- `README.md` – Project overview and quick start.
- `Network-Topology.md` – Detailed IP assignments and VLAN tables.
- `Service-Configuration.md` – Step‑by‑step installation commands.
- `Use-Cases.md` – Real‑world scenarios.
- `Test-Results.md` – Validation matrix and failure test results.
- `Issues-Log.md` – Historical problems and workarounds.
- Checklists in `/checklists/` – Granular task tracking.
