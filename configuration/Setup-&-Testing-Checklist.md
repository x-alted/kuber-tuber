# Kuber-Tuber – Setup & Testing Checklist

**Version:** 0.9

**Created by:** Alex  

**Date:** February 11, 2026 – April 6, 2026  

**Status:** Basic cluster & networking complete; LoRa integration testing in progress.

---

## Table of Contents

0.5 [Current IP Table](#05-current-ip-table)

1. [Individual Hardware & OS Validation](#1-individual-hardware--os-validation)

    1.1 [Mini PC (K3s Master + Rancher)](#11-mini-pc-k3s-master--rancher)

    1.2 [Raspberry Pi 4 Workers](#12-raspberry-pi-4-workers)  
         1.2.1 [worker1 – LoRa Gateway](#121-worker1--lora-gateway)  
         1.2.2 [worker2](#122-worker2)  
         1.2.3 [worker3](#123-worker3)

    1.3 [LoRa HAT & Cardputer Firmware](#13-lora-hat--cardputer-firmware)

    1.4 [Router Pi (Inter‑VLAN Routing)](#14-router-pi-inter-vlan-routing)

    1.5 [Managed Switch (NETGEAR GS305E)](#15-managed-switch-netgear-gs305e)

    1.6 [K3s Cluster & Rancher](#16-k3s-cluster--rancher)

2. [Node Failure & Resilience Scenarios](#2-node-failure--resilience-scenarios)

3. [Connectivity Matrix & Pre‑Service Hand‑Off](#3-connectivity-matrix--pre-service-hand-off)

4. [Weekly Progress Log](#4-weekly-progress-log)

---

## 0.5 Current IP Table (as of April 6, 2026)

| Device          | Local IP          | Hostname       | Role                                      |
|----------------|-------------------|----------------|-------------------------------------------|
| Mini PC        | 10.0.10.201       | debian-master  | K3s master + Rancher (no separate VM)    |
| worker1        | 10.0.20.208       | worker1        | K3s worker, **LoRa gateway**             |
| worker2        | 10.0.20.207       | worker2        | K3s worker                                |
| worker3        | 10.0.20.202       | worker3        | K3s worker                                |
| Router Pi      | 10.0.10.1 / 10.0.20.1 | router-pi | Inter‑VLAN routing, DHCP, firewall |
| Managed Switch | 10.0.0.2          | GS305E         | VLAN trunk & access ports                 |

**Rancher UI:** `https://10.0.10.201:30443` (running directly on Mini PC master – Ubuntu VM removed)

---

## 1. Individual Hardware & OS Validation

### 1.1 Mini PC (K3s Master + Rancher)

**Completed by:** Nathan, Anthony  
**Date:** April 6, 2026 (final IP configuration)

| Action               | Expected Outcome                                                                                                                                                                                                                                                                                                                                                                                                                           | Concerns                      | Complete? |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | --------- |
| Power & Boot         | Powers on reliably via wall adapter and power bank.                                                                                                                                                                                                                                                                                                                                                                                        | Power output.                 | [x]       |
| OS Confirmation      | Confirm that Debian 13 is installed and updated.                                                                                                                                                                                                                                                                                                                                                                                           |                               | [x]       |
| User and Pass        | **Username:** cluster16gb (secure password stored separately)                                                                                                                                                                                                                                                                                                                                                                              |                               | [x]       |
| Network Connectivity | - Ethernet link established to NETGEAR switch (link light active).<br>- Static IP configured and persists across reboots.<br>**Current IP:** 10.0.10.201/24, gateway 10.0.10.1.                                                                                                                                                                                                                                                            |                               | [x]       |
| SSH Access           | SSH daemon running. Pre‑shared team SSH key added to `~/.ssh/authorized_keys`. Password authentication disabled.                                                                                                                                                                                                                                                                                                                           |                               | [x]       |
| Basic Hardening      | UFW firewall enabled, default deny incoming, allow SSH (port 22) and K3s API (6443) from control plane (10.0.10.0/24). Fail2ban installed.                                                                                                                                                                                                                                                                                                 |                               | [x]       |

### 1.2 Raspberry Pi 4 Workers

#### 1.2.1 worker1 – LoRa Gateway

**Completed by:** Alex, Nathan, Nick  
**Date:** April 6, 2026

| Action           | Expected Outcome                                                                                                                  | Concerns  | Complete? |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| Labelling        | Create a physical label to affix to each Pi.                                                                                      | Duct tape | [x]       |
| Imaging          | Raspberry Pi OS Lite (64-bit) flashed to SD card using official imager.                                                           |           | [x]       |
| Hostname         | Hostname for Pi #1: **worker1**                                                                                                   |           | [x]       |
| Boot & Setup     | SSH enabled via userconf or raspi-config. Wi-Fi is disabled.                                                                      |           | [x]       |
| IP Assignment    | Static IP configured in `/etc/dhcpcd.conf`: `10.0.20.208/24`, gateway `10.0.20.1`.                                                |           | [x]       |
| SSH & Keys       | Accessible via SSH. Team SSH key deployed, password authentication disabled.                                                      |           | [x]       |
| Updates & Basics | System updated. Hostname set uniquely. UFW allow SSH from 10.0.10.0/24.                                                           |           | [x]       |

#### 1.2.2 worker2

**Completed by:** Alex, Nathan  
**Date:** April 6, 2026

| Action           | Expected Outcome                                                                                                                  | Concerns  | Complete? |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| Labelling        | Create a physical label to affix to each Pi.                                                                                      | Duct tape | [x]       |
| Imaging          | Raspberry Pi OS Lite (64-bit) flashed to SD card using official imager.                                                           |           | [x]       |
| Hostname         | Hostname for Pi #2: **worker2**                                                                                                   |           | [x]       |
| Boot & Setup     | SSH enabled via userconf or raspi-config. Wi-Fi is disabled.                                                                      |           | [x]       |
| IP Assignment    | Static IP: `10.0.20.207/24`, gateway `10.0.20.1`.                                                                                 |           | [x]       |
| SSH & Keys       | Accessible via SSH. Team SSH key deployed, password authentication disabled.                                                      |           | [x]       |
| Updates & Basics | System updated. Hostname set uniquely.                                                                                            |           | [x]       |

#### 1.2.3 worker3

**Completed by:** Alex, Nathan  
**Date:** April 6, 2026

| Action           | Expected Outcome                                                                                                                  | Concerns  | Complete? |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| Labelling        | Create a physical label to affix to each Pi.                                                                                      | Duct tape | [x]       |
| Imaging          | Raspberry Pi OS Lite (64-bit) flashed to SD card using official imager.                                                           |           | [x]       |
| Hostname         | Hostname for Pi #3: **worker3**                                                                                                   |           | [x]       |
| Boot & Setup     | SSH enabled via userconf or raspi-config. Wi-Fi is disabled.                                                                      |           | [x]       |
| IP Assignment    | Static IP: `10.0.20.202/24`, gateway `10.0.20.1`.                                                                                 |           | [x]       |
| SSH & Keys       | Accessible via SSH. Team SSH key deployed, password authentication disabled.                                                      |           | [x]       |
| Updates & Basics | System updated. Hostname set uniquely.                                                                                            |           | [x]       |

### 1.3 LoRa HAT & Cardputer Firmware

**Completed by:** Alex, Nathan, Nick  
**Date:** April 6, 2026

| Action                     | Expected Outcome                                                                                                                                                                                      | Concerns | Complete? |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| Physical Install (worker1) | Waveshare SX1262 HAT seated correctly on GPIO pins, antenna attached.                                                                                                                                 |          | [x]       |
| SPI Enabling               | `dtparam=spi=on` confirmed in `/boot/config.txt`. Pi rebooted. `ls /dev/spidev*` shows devices.                                                                                                      |          | [x]       |
| Python Environment         | Virtual environment (`lora-env`) created. `adafruit-circuitpython-rfm9x` installed.                                                                                                                   |          | [x]       |
| Basic Radio Detection      | Run `LoRA-Test.py` – prints "LoRa HAT detected!".                                                                                                                                                     |          | [x]       |
| Cardputer Firmware Flash   | `kuber_tuber_cardputer_v2.ino` uploaded via Arduino IDE. Screen shows "KUBER-TUBER v2.0" and sequence number.                                                                                         |          | [ ]       |
| Bridge Script (worker1)    | `lora_bridge.py` running as systemd service (`lora-bridge.service`). Listens for packets.                                                                                                             |          | [ ]       |
| Receiver Service (K3s)     | `lora-receiver` deployment + service in `lora-demo` namespace. `kubectl get pods -n lora-demo` shows running.                                                                                         |          | [ ]       |
| Encrypted Send/Receive     | Cardputer sends encrypted message → bridge decrypts → forwards to receiver → message appears in `kubectl logs -n lora-demo`.                                                                          |          | [ ]       |
| ACK & Retry                | Cardputer receives `ACK` (green flash). Pull antenna → Cardputer retries 3 times then shows red flash.                                                                                                |          | [ ]       |
| Persistent Sequence Counter| Power cycle Cardputer – sequence number resumes from last value (not 0). Verified via display.                                                                                                        |          | [ ]       |
| Frequency Check            | Software configuration confirmed for 915 MHz (North America).                                                                                                                                         |          | [x]       |

### 1.4 Router Pi (Inter‑VLAN Routing)

**Completed by:** Anthony  
**Date:** April 3, 2026

| Action                       | Expected Outcome                                                                                                                                                                                                                                                                                                  | Concerns                        | Complete? |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------- |
| OS Install & Update          | Raspberry Pi OS Lite, hostname `router-pi`. `sudo apt update && sudo apt upgrade -y`.                                                                                                                                                                                                                             |                                 | [x]       |
| VLAN Interfaces              | Created `eth0.10` and `eth0.20` using `systemd-networkd`. IPs: `10.0.10.1/24` and `10.0.20.1/24`.                                                                                                                                                                                                                |                                 | [x]       |
| Enable IP Forwarding         | `net.ipv4.ip_forward=1` in `/etc/sysctl.conf`. Applied with `sudo sysctl -p`.                                                                                                                                                                                                                                    |                                 | [x]       |
| DHCP Server (dnsmasq)        | Configured `/etc/dnsmasq.conf` for both VLANs. Ranges: `10.0.10.50-150` and `10.0.20.50-150`.                                                                                                                                                                                                                    |                                 | [x]       |
| iptables Forwarding Rules    | Default DROP on FORWARD. Allow SSH (port 22) from 10.0.10.0/24 to 10.0.20.0/24. Allow established/related.                                                                                                                                                                                                       |                                 | [x]       |
| NAT (optional)               | `sudo iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE` for internet access (removed for offline demo).                                                                                                                                                                                                      |                                 | [x]       |
| Save Rules                   | `sudo netfilter-persistent save`.                                                                                                                                                                                                                                                                                 |                                 | [x]       |
| Verification                 | From Mini PC, ping `10.0.10.1` and `10.0.20.208`. From worker1, ping `10.0.20.1` and `10.0.10.201`.                                                                                                                                                                                                               |                                 | [x]       |

### 1.5 Managed Switch (NETGEAR GS305E)

**Completed by:** Nick, Anthony, Alex  
**Date:** April 3, 2026

| Action                       | Expected Outcome                                                                                                                                                                                                                                                                                                  | Concerns                        | Complete? |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------- |
| Switch Power & LED           | NETGEAR GS305E powers on. Link/Activity LEDs illuminate for each connected device port.                                                                                                                                                                                                                           |                                 | [x]       |
| Physical Setup               | Switch powered on. Port 1: trunk to router Pi. Port 2: Mini PC. Ports 3‑5: worker1, worker2, worker3.                                                                                                                                                                                                             | Cable seating                   | [x]       |
| Discover Current Switch IP   | Default IP 192.168.0.239 – changed to 10.0.0.2.                                                                                                                                                                                                                                                                   | Network conflicts               | [x]       |
| Access Web Interface         | From browser on Mini PC, navigate to `http://10.0.0.2`. Login page appears.                                                                                                                                                                                                                                       |                                 | [x]       |
| Default Login                | Default username: (blank), password: `password` (case‑sensitive). Changed to secure project password.                                                                                                                                                                                                             |                                 | [x]       |
| Change Default Password      | Changed to project password. Documented in secure credentials file.                                                                                                                                                                                                                                               |                                 | [x]       |
| Enable 802.1Q VLAN           | Navigate to **VLAN > 802.1Q VLAN > Advanced**. Enable mode.                                                                                                                                                                                                                                                       |                                 | [x]       |
| Create VLANs                 | VLAN 10 (name "Control"), VLAN 20 (name "Workers").                                                                                                                                                                                                                                                               |                                 | [x]       |
| VLAN Membership              | Port 1: Tagged (T) for both VLANs. Port 2: Untagged (U) for VLAN 10. Ports 3‑5: Untagged (U) for VLAN 20.                                                                                                                                                                                                        |                                 | [x]       |
| Port PVID                    | Port 1: 1 (or 1). Port 2: 10. Ports 3‑5: 20.                                                                                                                                                                                                                                                                      |                                 | [x]       |
| Default VLAN 1               | Set all ports to "U" for VLAN 1 except port 1 (management).                                                                                                                                                                                                                                                       |                                 | [x]       |
| Save Configuration           | Click **Apply** on all changes. Settings persist through power cycle.                                                                                                                                                                                                                                             |                                 | [x]       |
| Connectivity Matrix Test     | From Mini PC (10.0.10.201), ping router (10.0.10.1) and workers (10.0.20.208, .207, .202). From workers, ping Mini PC. All succeed.                                                                                                              |                                 | [x]       |

### 1.6 K3s Cluster & Rancher

**Completed by:** Nathan  
**Date:** April 6, 2026 (rebuild with new IPs)

| Action                           | Expected Outcome                                                                                                                                                                                                                                                                                                  | Concerns                                                                                                        | Complete? |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------- |
| **Uninstall Old K3s**            | On master: `sudo /usr/local/bin/k3s-uninstall.sh`. On each worker: `sudo /usr/local/bin/k3s-agent-uninstall.sh`.                                                                                                                                                                                                 |                                                                                                                 | [x]       |
| **Install K3s on Master**        | `curl -sfL https://get.k3s.io | sh -`. Verify `sudo systemctl status k3s`.                                                                                                                                                                                                                                    |                                                                                                                 | [x]       |
| **Get Node Token**               | `sudo cat /var/lib/rancher/k3s/server/node-token`. Store securely.                                                                                                                                                                                                                                                |                                                                                                                 | [x]       |
| **Join Worker Nodes**            | On each worker: `curl -sfL https://get.k3s.io | K3S_URL=https://10.0.10.201:6443 K3S_TOKEN=<token> sh -`.                                                                                                                                                                                                                          |                                                                                                                 | [x]       |
| **Verify Cluster Health**        | `sudo kubectl get nodes -o wide` shows all 4 nodes `Ready` with correct IPs. CoreDNS pods running.                                                                                                                                                                                                               |                                                                                                                 | [x]       |
| **Copy Kubeconfig to Master**    | Already at `/etc/rancher/k3s/k3s.yaml`. No separate VM.                                                                                                                                                                                                                                                           |                                                                                                                 | [x]       |
| **Install Helm**                 | `curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash`. `helm version`.                                                                                                                                                                                                                             |                                                                                                                 | [x]       |
| **Install cert-manager**         | `kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.crds.yaml`. `helm repo add jetstack https://charts.jetstack.io`. `helm repo update`. `helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --version v1.14.4`.     |                                                                                                                 | [x]       |
| **Install Rancher**              | `helm repo add rancher-latest https://releases.rancher.com/server-charts/latest`. `helm repo update`. `helm install rancher rancher-latest/rancher --namespace cattle-system --create-namespace --set hostname=rancher.kuber-tuber.local --set replicas=1 --set bootstrapPassword=admin`.                      | If name in use, uninstall previous and delete Helm secrets.                                                     | [x]       |
| **Wait for Rancher rollout**     | `kubectl -n cattle-system rollout status deploy/rancher`.                                                                                                                                                                                                                                                         |                                                                                                                 | [x]       |
| **Get Rancher service NodePort** | `kubectl get svc -n cattle-system rancher` shows `443:30443/TCP`.                                                                                                                                                                                                                                                 |                                                                                                                 | [x]       |
| **Access Rancher UI**            | Browser to `https://10.0.10.201:30443`. Accept self‑signed certificate. Login page loads.                                                                                                                                                                                                                         |                                                                                                                 | [x]       |
| **Retrieve admin password**      | `kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword\|base64decode}}'`.                                                                                                                                                                                               |                                                                                                                 | [x]       |
| **Log in to Rancher**            | Successfully log in with username `admin`. Change password if prompted.                                                                                                                                                                                                                                          |                                                                                                                 | [x]       |
| **Import existing K3s cluster**  | In Rancher UI, click **Import Existing**, name cluster (e.g., `k3s-cluster`), run the provided `kubectl` command on Mini PC. Cluster appears active.                                                                                                                                                              |                                                                                                                 | [x]       |
| **Verify cluster in Rancher**    | Nodes, workloads, and namespaces visible in Rancher dashboard.                                                                                                                                                                                                                                                    |                                                                                                                 | [x]       |

---

## 2. Node Failure & Resilience Scenarios

**Completed by:** Nathan  
**Date:** April 6, 2026

| Scenario               | Test Action                             | Expected System State                                                                                                     | Pass/Fail |
|------------------------|-----------------------------------------|---------------------------------------------------------------------------------------------------------------------------|-----------|
| Single Worker Loss     | Physically power off worker2.           | Pods on worker2 reschedule to other workers within 90 seconds. `kubectl get nodes` shows `NotReady`.                     | [x]       |
| Switch Reboot          | Power cycle the NETGEAR GS305E.         | All devices regain network connectivity within 60 seconds. Static IPs retained. All pairwise pings resume.                | [x]       |
| Master (Mini PC) Reboot| Reboot the Mini PC.                     | API temporarily down; existing pods continue on workers. After master returns, `kubectl` works, node shows `Ready`.       | [x]       |
| Router Pi Reboot       | `sudo reboot` on router-pi.             | Inter‑VLAN traffic stops for ~30 sec, then resumes. DHCP leases re‑established.                                           | [x]       |
| LoRa Bridge Crash      | Simulate crash of `lora-bridge` on worker1. | Systemd restarts service automatically (Restart=always). No hardware lock-up; SPI still accessible.                     | [ ]       |
| Receiver Pod Crash     | `kubectl delete pod -n lora-demo lora-receiver-xxx`. | Kubernetes recreates pod; bridge retries HTTP POSTs after timeout.                                                       | [ ]       |

---

## 3. Connectivity Matrix & Pre‑Service Hand‑Off

### 3.1 Connectivity Matrix: Result Tracking (current state)

**Completed by:** Anthony  
**Date:** April 6, 2026

| From/To        | Mini PC (10.0.10.201) | worker1 (10.0.20.208) | worker2 (10.0.20.207) | worker3 (10.0.20.202) |
|----------------|-----------------------|-----------------------|-----------------------|-----------------------|
| **Mini PC**    | N/A                   | [x]                   | [x]                   | [x]                   |
| **worker1**    | [x]                   | N/A                   | [x]                   | [x]                   |
| **worker2**    | [x]                   | [x]                   | N/A                   | [x]                   |
| **worker3**    | [x]                   | [x]                   | [x]                   | N/A                   |

All cross‑VLAN pings succeed (router forwards allowed traffic). Inter‑VLAN SSH works as per iptables rules.

### 3.2 Pre-Service Hand-Off (final checks before demo)

**Completed by:** Alex  
**Date:** April 6, 2026

| Task                     | Description                                                                                 | Complete? |
|--------------------------|---------------------------------------------------------------------------------------------|-----------|
| All Devices Updated      | `sudo apt update && sudo apt upgrade -y` run on all nodes. Reboot if necessary.            | [x]       |
| Time Synchronization     | Confirm `timedatectl status` shows NTP synchronized on all devices.                         | [x]       |
| No Critical Log Errors   | `journalctl -p 3 -b` shows no alarming errors on any node post‑final‑reboot.                | [x]       |
| GitHub Repos Updated     | All device‑specific configuration notes, hostnames, final IPs, hardware IDs documented.    | [x]       |

---

## 4. Weekly Progress Log

### Week of March 6, 2026
- **Accomplishments:**
  - All three Pis imaged and booted; SSH access verified using temporary password.
  - Mini PC configured with static IP 192.168.2.201.
  - Switch physically connected; web interface accessed but VLANs deferred.
- **Decisions:**
  - VLANs will not be used initially (lack of layer‑3 switch).
  - Will proceed with K3s and LoRa using current DHCP IPs; static IPs will be set later.
- **Next Steps:**
  - Nick to install LoRa HAT on Pi #1 and test basic LoRa communication.
  - Nathan to begin K3s installation on mini PC.
  - Alex to document current IP addresses and update checklist.
- **Issues/Notes:**
  - SSH key deployment postponed; using passwords temporarily.

### Week of March 13, 2026
- **Accomplishments:**
  - **Tailscale fully deployed** for remote access:
    - Installed on mini PC (192.168.2.201) and worker1 (192.168.2.208).
    - worker1 now has Tailscale IP `100.93.189.34` and is shared with Nick.
    - Nick can SSH into worker1 remotely to work on LoRa HAT configuration without port forwarding.
    - Minor connectivity issue resolved by re‑authenticating Tailscale on Nick’s machine.
  - **K3s cluster now consists of five nodes** (all Pis joined):
    - `debian-master` (192.168.2.201) – Control Plane
    - `kuberserver` (192.168.2.214) – Worker (Ubuntu VM, Rancher host)
    - `worker1` (192.168.2.208) – Worker, also serves as **LoRa host** (LoRa HAT attached)
    - `worker2` (192.168.2.207) – Worker
    - `worker3` (192.168.2.202) – Worker (newly joined this week)
    - All nodes running Kubernetes v1.34.5+k3s1 and marked `Active` in Rancher.
  - **Rancher fully operational** on Ubuntu VM (192.168.2.214):
    - Dashboard accessible at `https://192.168.2.214:30443`.
    - Cluster imported successfully; all nodes visible with resource usage (CPU ~2‑21%, RAM low).
    - Bootstrap password issue resolved by retrieving secret from Kubernetes.
  - **LoRa Progress (Nick):**
    - Continued configuration of LoRa HAT on worker1 via Tailscale.
  - **Documentation Updates:**
    - Migrated all project docs to GitHub `/docs` folder (Markdown).
    - Updated network topology with Tailscale IPs and node roles.
    - Added Rancher installation steps to `SERVICE-CONFIG.md`.
    - Created `TEST-RESULTS.md` and began logging LoRa tests.
- **Decisions:**
  - Rancher will remain on Ubuntu VM for the duration of the project (later changed).
  - Static IPs for Pis will be set after LoRa integration stabilises.
  - Tailscale will be used for all remote access; no port forwarding required.
  - worker1 explicitly designated as the LoRa gateway in all documentation.
- **Next Steps:**
  - Basic send/receive tests performed between worker1 and Cardputer (pending).
  - Initial range and signal strength observations recorded in `TEST-RESULTS.md`.
  - Complete LoRa‑Matrix bridge development and Cardputer client.
  - Implement basic encryption for LoRa payloads.
  - Conduct end‑to‑end test: Cardputer → LoRa → worker1 → Matrix → Rancher UI.
- **Issues:**
  - Rancher bootstrap password not honoured; worked around by retrieving from Kubernetes secret. (Resolved)

### Week of March 27, 2026
- **Networking Accomplishments:**
  - **Setting up a Pi Router:**
    - Set static IP interfaces: `10.0.10.1/24` for VLAN 10, `10.0.20.1/24` for VLAN 20.
    - Set up DHCP server using dnsmasq.
    - Created VLANs: VLAN 10 on `eth0.10` for Mini PC and Ubuntu VM; VLAN 20 on `eth0.20` for worker1, worker2, worker3.
    - Enabled IP forwarding.
    - Configured iptables to allow forwarding between VLANs.
  - Pre‑Hardening Network Topology diagram created.
- **Next Steps (Networking):**
  - **Configure managed switch:**
    - Port for Pi router must be trunk (tagged VLAN 10 & VLAN 20).
    - Port for Mini PC must be access VLAN 10.
    - Ports with worker Pis must be access VLAN 20.
    - Reset all devices and verify IP addresses.
    - From Mini PC, ping gateway (10.0.10.1) and the 3 workers.
    - From each worker, ping gateway (10.0.20.1) and Mini PC.
- **LoRa Accomplishments:**
  - LoRa environment setup on worker1 (192.168.2.208):
    - Installed required packages (python3-pip, python3-venv, python3-rpi.gpio, python3-spidev, git).
    - Created Python virtual environment (`lora-env`) and installed `adafruit-circuitpython-rfm9x`.
    - Cloned Adafruit LoRa example repository and accessed example scripts.
    - SPI and GPIO configuration completed.
    - SPI enabled through raspi-config and verified with `/dev/spidev0.0` and `/dev/spidev0.1`.
    - SPI functionality confirmed using Python test.
    - RESET pin (GPIO25) verified working through digitalio test.
  - **LoRa script configuration:**
    - Edited `rfm9x_simpletest.py` to set correct pins (CE0/CE1 and D25).
    - Confirmed radio frequency set to 915.0 MHz for North America.
    - Tested multiple example scripts including simpletest, transmit, and node scripts.
  - **MultiPi setup clarified:**
    - worker1 designated as the only LoRa node (HAT attached).
    - worker2 and worker3 configured as network‑only nodes.
    - Installed basic tools on worker2 and worker3 for logging and SSH communication.
  - **Basic logging setup:**
    - Created `~/lora_data/log.txt` on worker2 and worker3.
    - Tested writing messages to log file to simulate incoming data.
- **Decisions:**
  - worker1 will remain the dedicated LoRa gateway for the system.
  - worker2 and worker3 will not run LoRa scripts and will instead receive data over the network.
  - All LoRa communication will originate from worker1 and be forwarded to other nodes.
  - Frequency standardised to 915 MHz for all LoRa operations.
- **Next Steps (LoRa):**
  - Resolve LoRa HAT detection issue on worker1 (`rfm9x` not detected consistently).
  - Confirm correct chip select pin (CE0 vs CE1) for the HAT.
  - Verify physical connection and seating of the LoRa HAT.
  - Achieve successful send/receive test using `rfm9x` scripts.
  - Forward real LoRa messages from worker1 to worker2 and worker3 log files.
  - Begin integration of LoRa data into overall system workflow.
- **Issues:**
  - LoRa HAT not detected consistently; error "Failed to find rfm9x with expected version".
  - Possible causes include incorrect CS pin configuration or hardware connection issues.

### Week of April 3, 2026
- **Router Pi Finalisation:**
  - Installed RaspAP on SD card using Raspberry Pi Imager.
  - Connected router Pi to internet (temporarily) and to switch via USB‑Ethernet dongle.
  - Scanned network with nmap to find Pi IP.
  - Accessed web interface, changed login credentials.
  - Disabled hotspot (not used).
  - Managed switch configuration:
    - Changed switch password.
    - Enabled Advanced 802.1Q VLAN.
    - Created VLANs 10 and 20.
    - Assigned VLAN membership (Trunk on port 1, Access on ports 2‑5).
    - Set Port PVIDs.
  - SSH into router Pi, installed `vlan`, loaded `8021q` module.
  - Created VLAN interfaces (`eth0.10`, `eth0.20`) using `systemd-networkd`.
  - Configured dnsmasq for DHCP on both VLANs.
  - Set iptables NAT for internet (temporary) and saved rules.
  - Verified connectivity: Mini PC and workers got new IPs in `10.0.x.x` range.
  - Removed internet connection to confirm offline operation.
- **Decision:** Ubuntu VM eliminated; Rancher moved to Mini PC master (simplifies architecture).
- **Next Steps:**
  - Rebuild K3s cluster with new IPs (10.0.x.x).
  - Re‑join worker nodes.
  - Deploy receiver service.
  - Complete LoRa end‑to‑end encryption and ACK testing.

### Week of April 6, 2026
- **Accomplishments:**
  - K3s cluster completely rebuilt with new IPs:
    - Uninstalled old K3s from all nodes.
    - Fresh install on Mini PC master (10.0.10.201).
    - Re‑joined worker1, worker2, worker3 (all now 10.0.20.x).
    - Verified all nodes `Ready`.
  - Rancher re‑installed on Mini PC (no Ubuntu VM):
    - Helm install with cert-manager.
    - UI accessible at `https://10.0.10.201:30443`.
    - Cluster imported successfully.
  - LoRa HAT detection resolved (SPI and CS pin confirmed).
  - Cardputer firmware v2.0 written:
    - AES‑256‑CBC encryption.
    - Persistent sequence counter (NVS).
    - Two‑way ACK with retry (up to 3 times).
    - Replay protection.
  - Bridge script (`lora_bridge.py`) designed and commented.
  - Receiver service (Flask) YAML prepared.
  - All documentation updated (System Architecture, Threat Model, Risk Assessment, Quick Start, BOM, Cardputer Manual, API spec).
- **Remaining Tasks:**
  - Flash Cardputer with v2 firmware.
  - Deploy receiver service to K3s.
  - Start bridge on worker1 (systemd service).
  - Run encrypted end‑to‑end test.
  - Measure range (line‑of‑sight, indoor).
  - Record demo video.
  - Final presentation slides.
- **Issues:**
  - None blocking – LoRa integration in final testing phase.

---

**Document Owner:** Alex  
**Next Review:** After LoRa end‑to‑end testing (April 7)
---

## Weekly Progress Log

### Week of March 6, 2026
- **Accomplishments:**
  - All three Pis imaged and booted; SSH access verified using temporary password.
  - Mini PC configured with static IP 192.168.2.201.
  - Switch physically connected; web interface accessed but VLANs deferred.
- **Decisions:**
  - VLANs will not be used (lack of layer‑3 switch).
  - Will proceed with K3s and LoRa using current DHCP IPs; static IPs will be set later.
- **Next Steps:**
  - Nick to install LoRa HAT on Pi #1 and test basic LoRa communication.
  - Nathan to begin K3s installation on mini PC.
  - Alex to document current IP addresses and update checklist.
- **Issues/Notes:**
  - SSH key deployment postponed; using passwords temporarily.


### Week of March 13, 2026
- **Accomplishments:**
  - **Tailscale fully deployed** for remote access:
    - Installed on mini PC (192.168.2.201) and worker1 (192.168.2.208).
    - worker1 now has Tailscale IP `100.93.189.34` and is shared with Nick.
    - Nick can SSH into worker1 remotely to work on LoRa HAT configuration without port forwarding.
    - Minor connectivity issue resolved by re‑authenticating Tailscale on Nick’s machine.
  - **K3s cluster now consists of five nodes** (all Pis joined):
    - `debian-master` (192.168.2.201) – Control Plane
    - `kuberserver` (192.168.2.204) – Worker (additional machine, role confirmed)
    - `worker1` (192.168.2.208) – Worker, also serves as **LoRa host** (LoRa HAT attached)
    - `worker2` (192.168.2.207) – Worker
    - `worker3` (192.168.2.202) – Worker (newly joined this week)
    - All nodes running Kubernetes v1.34.5+k3s1 and marked `Active` in Rancher.
  - **Rancher fully operational** on Ubuntu VM (192.168.2.214):
    - Dashboard accessible at `https://192.168.2.214:30443`.
    - Cluster imported successfully; all nodes visible with resource usage (CPU ~2‑21%, RAM low).
    - Bootstrap password issue resolved by retrieving secret from Kubernetes.
  - **LoRa Progress (Nick):**
    - Continued configuration of LoRa HAT on worker1 via Tailscale.
  - **Documentation Updates:**
    - Migrated all project docs to GitHub `/docs` folder (Markdown).
    - Updated network topology with Tailscale IPs and node roles.
    - Added Rancher installation steps to `SERVICE-CONFIG.md`.
    - Created `TEST-RESULTS.md` and began logging LoRa tests.
- **Decisions:**
  - Rancher will remain on Ubuntu VM for the duration of the project.
  - Static IPs for Pis will be set after LoRa integration stabilises.
  - Tailscale will be used for all remote access; no port forwarding required.
  - worker1 explicitly designated as the LoRa gateway in all documentation.
- **Next Steps:**
  - Basic send/receive tests performed between worker1 and a second LoRa module (Cardputer pending).
  - Initial range and signal strength observations recorded in `TEST-RESULTS.md`.
  - Complete LoRa‑Matrix bridge development (Anthony/Nick) and Cardputer client (Alex).
  - Implement basic encryption for LoRa payloads (Nathan).
  - Conduct end‑to‑end test: Cardputer → LoRa → worker1 → Matrix → Rancher UI.
  - Document results and refine encryption as needed.
  - Prepare for Week 5 resilience testing (simulate Pi failure, pod rescheduling).
- **Issues:**
  - Rancher bootstrap password not honoured; worked around by retrieving from Kubernetes secret. (Resolved)


### Week of March 27, 2026

#### **Networking**
- **Accomplishments:**
  - **Setting up a Pi Router:**
 	- Setting the static ip interface to 10.0.10.1/24 on for vlan 10, and 10.0.20.1/24 for vlan 20
    - Setting up a dhcp server using dnsmasq
    - The Vlans created are vlan 10 on eth0.10 for the mini pc and ubuntu vm and vlan 20 on eth0.20 for worker1, worker2, and worker3
    - Enabled port forwarding
    - Allow forwarding between vlans using iptables
  - Pre-Hardening Network Topology diagram created. 
  - **Next Steps:**
    - **Configure managed switch:**
      - The port for the pi router must be a trunk (tagged vlan 10 & tagged vlan 20)
      - The port for the mini pc must be access vlan 10 and ignore vlan 20
      - The ports with the worker pis mus be access vlan 20 and ignore vlan 10
      - Reset all devices and check the ip of the mini pc, and the 3 workers; make sure the have the appropriate ip addresses
      - From mini pc, ping the gateway (10.0.10.1) and the 3 workers
      - From each of the workers, ping the gateway (10.0.20.1) and the mini pc 

#### **LORA**  
- **Accomplishments**: 
  - LoRa environment setup on worker1 (192.168.2.208):
  - Installed required packages (python3-pip, python3-venv, python3-rpi.gpio, python3-spidev, git). 
  - Created Python virtual environment (lora-env) and installed adafruit-circuitpython-rfm9x. 
  - Cloned Adafruit LoRa example repository and accessed example scripts. 
  - SPI and GPIO configuration completed: 
  - SPI enabled through raspi-config and verified with /dev/spidev0.0 and /dev/spidev0.1. 
  - SPI functionality confirmed using Python test. 
  - RESET pin (GPIO25) verified working through digitalio test.
  **LoRa script configuration: 
	- Edited rfm9x_simpletest.py to set correct pins (CE0/CE1 and D25). 
	- Confirmed radio frequency set to 915.0 MHz for North America. 
	- Tested multiple example scripts including simpletest, transmit, and node scripts. 
  **MultiPi setup clarified: 
	- worker1 designated as the only LoRa node (HAT attached). 
	- worker2 (192.168.2.207) and worker3 (192.168.2.202) configured as network-only nodes. 
	- Installed basic tools on worker2 and worker3 for logging and SSH communication. 
  **Basic logging setup: 
	- Created ~/lora_data/log.txt on worker2 and worker3. 
	- Tested writing messages to log file to simulate incoming data. 
  **Decisions: 
	- worker1 will remain the dedicated LoRa gateway for the system. 
	- worker2 and worker3 will not run LoRa scripts and will instead receive data over the network. 
	- All LoRa communication will originate from worker1 and be forwarded to other nodes. 
	- Frequency standardised to 915 MHz for all LoRa operations. 
  **Next Steps: 
	- Resolve LoRa HAT detection issue on worker1 (rfm9x not detected). 
	- Confirm correct chip select pin (CE0 vs CE1) for the HAT. 
	- Verify physical connection and seating of the LoRa HAT. 
	- Achieve successful send/receive test using rfm9x scripts. 
	- Forward real LoRa messages from worker1 to worker2 and worker3 log files. 
	- Begin integration of LoRa data into overall system workflow. 
  **Issues: 
	- LoRa HAT not detected consistently; error “Failed to find rfm9x with expected version”. 
	- Possible causes include incorrect CS pin configuration or hardware connection issues. 
 
### Week of April 3
#### Setting up Raspberry Pi as router
- Install RaspAP on SD card using Raspberry Pi Imager and install SD card into Pi.
- Connect the router with internet to the Pi and plug in usb/ethernet dongle into Pi and connect the dongle to the switch with 3 worker Pis and mini pc.
- Scan network using nmap to find ip of the Pi.
- Access the web interface by typing the Pi's ip into web browser.
- Login with username "admin" password "secret".
- Change login to username "67W9umS315n90" password "100S158Ur3u097".
- Disable hotspot, since it's not being used.
- Go to the managed switch web interface.
- Change the password to "78Su0t5H45t16".
- Go to VLAN > 802.1Q > Advanced and enable Advanced 802.1Q VLAN.
- Go to VLAN Configuration and create 2 vlans with the vlan ids of 10 and 20.
- Go to VLAN Membership and assign the following to each port for each vlan (x is unassigned):
```
VLAN 10: T U x x x
VLAN 20: T x U U U
```
- Go to Port PVID and assign each port with the following PVID:
```
Port 1: 1
Port 2: 10
Port 3: 20
Port 4: 20
Port 5: 20
```
- Go back to VLAN Membership and change vlan 1 to "U x x x x".
- Ssh into Pi with username "router" and password "workers".
- Install vlan using "sudo apt install vlan" and run the following commands:
```
sudo modprobe 8021q
echo "8021q" | sudo tee -a /etc/modules
```
- Create vlan interfaces by running the following commands:
```
sudo ip link add link eth0 name eth0.10 type vlan id 10
sudo ip link add link eth0 name eth0.20 type vlan id 20

sudo ip addr add 192.168.10.1/24 dev eth0.10
sudo ip addr add 192.168.20.1/24 dev eth0.20

sudo ip link set eth0.10 up
sudo ip link set eth0.20 up
```
- Create the parent interface definition by creating the file "/etc/systemd/network/10-eth0.network" and add:
```
[Match]
Name=eth0

[Network]
VLAN=eth0.10
VLAN=eth0.20
```
- Create vlan 10 interface by creating the file "/etc/systemd/network/20-vlan10.netdev" and add:
```
[NetDev]
Name=eth0.10
Kind=vlan

[VLAN]
Id=10
```
- Create file "/etc/systemd/network/21-vlan10.network" and add:
```
[Match]
Name=eth0.10

[Network]
Address=10.0.10.1/24
```
- Create vlan 20 interface by creating the file "/etc/systemd/network/30-vlan20.netdev" and add:
```
[NetDev]
Name=eth0.20
Kind=vlan

[VLAN]
Id=20
```
- Create file "/etc/systemd/network/31-vlan20.network" and add:
```
[Match]
Name=eth0.20

[Network]
Address=10.0.20.1/24
```
- Restart networking by running "sudo systemctl restart systemd-networkd".
- Run "ip a | grep eth0". You should see eth0.10 with 10.0.10.1/24 and eth0.20 with 10.0.20.1/24.
- Configure dhcp by editing "/etc/dnsmasq.conf" and add:
```
# VLAN 10
interface=eth0.10
dhcp-range=10.0.10.50,10.0.10.150,24h

# VLAN 20
interface=eth0.20
dhcp-range=10.0.20.50,10.0.20.150,24h

# Upstream DNS
server=8.8.8.8
server=8.8.4.4
```
- Restart dnsmasq by running "sudo systemctl restart dnsmasq".
- Run the following commands:
```
sudo iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE
sudo netfilter-persistent save
```
- Reset the Pis and do a network scan with the ip range 10.0.10.0/24 and 10.0.20.0/24 from the mini pc. You should see all the Pis, vlan gateways and the switch.
- Ping google.com to verify you have internet connection.
- Remove the ethernet providing internet access from the Pi router and run an nmap scan again on the mini pc to verify that nothing changed.
### Week of April 6, 2026
- **Accomplishments:**
  - K3s cluster completely rebuilt with new IPs:
    - Uninstalled old K3s from all nodes.
    - Fresh install on Mini PC master (10.0.10.201).
    - Re‑joined worker1, worker2, worker3 (all now 10.0.20.x).
    - Verified all nodes `Ready`.
  - Rancher re‑installed on Mini PC (no Ubuntu VM):
    - Helm install with cert-manager.
    - UI accessible at `https://10.0.10.201:30443`.
    - Cluster imported successfully.
  - LoRa HAT detection resolved (SPI and CS pin confirmed).
  - Cardputer CFW necessitated and created:
    - AES‑256‑CBC encryption.
    - Persistent sequence counter (NVS).
    - Two‑way ACK with retry (up to 3 times).
    - Replay protection.
  - Bridge script (`lora_bridge.py`) designed and commented.
  - Receiver service (Flask) YAML prepared.
  - All documentation updated (System Architecture, Threat Model, Risk Assessment, Quick Start, BOM, Cardputer Manual, API).
- **Remaining Tasks:**
  - Flash Cardputer with CFW.
  - Deploy receiver service to K3s.
  - Start bridge on worker1 (systemd service).
  - Run encrypted end‑to‑end test.
