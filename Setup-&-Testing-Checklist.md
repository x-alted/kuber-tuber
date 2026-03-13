# Project Kuber-Tuber – Setup & Testing Checklist

**Version:** 1.1  
**Created by:** Alex  
**Date:** February 11, 2026 – February 18, 2026 (updated March 6, 2026)

## Table of Contents

1. [Individual Hardware & OS Validation](#1-individual-hardware--os-validation)  
 1.1 [Mini PC (K3s Master / Matrix Server)](#11-mini-pc-k3s-master--matrix-server)  
 1.2 [Raspberry Pi 4](#12-raspberry-pi-4)  
  1.2.1 [Pi #1 – LoRa Host](#121-raspberry-pi-4-unit-1--lora-host)  
  1.2.2 [Pi #2 – Worker #1](#122-raspberry-pi-4-unit-2--worker-1)  
  1.2.3 [Pi #3 – Worker #2](#123-raspberry-pi-4-unit-3--worker-2)  
 1.3 [LoRa HAT on Pi #1](#13-lora-hat-on-pi-1)  
 1.4 [Networking Core – NETGEAR GS305E Configuration](#14-networking-core--netgear-gs305e-configuration)  
 1.5 [Node Failure Scenarios](#15-node-failure-scenarios)  
2. [Pre-Service Functionality Verification](#2-pre-service-functionality-verification)  
 2.1 [Connectivity Matrix: Result Tracking](#21-connectivity-matrix-result-tracking)  
 2.2 [Pre-Service Hand-Off](#22-pre-service-hand-off)  

---

## Machine IP Table (Current)

| Machine  | IP Address     |
|----------|----------------|
| Mini PC  | 192.168.2.201  |
| worker1  | 192.168.2.208  |
| worker2  | 192.168.2.207  |
| worker3  | 192.168.2.202  |

---

## 1. Individual Hardware & OS Validation

### 1.1 Mini PC (K3s Master / Matrix Server)

**Completed by:** Nathan, Anthony  
**Date:** February 18, 2026

| Action               | Expected Outcome                                                                                                                                    | Concerns                          | Complete? |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|-----------|
| Power & Boot         | Powers on reliably via wall adapter and power bank.                                                                                                 | Power output.                     | [x]       |
| OS Confirmation      | Confirm that Debian 13 is installed and updated.                                                                                                    |                                   | [x]       |
| User and Pass        | **Username:** cluster16gb<br>**Password:** cluster16gb                                                                                              |                                   | [x]       |
| Network Connectivity | - Ethernet link established to NETGEAR switch (link light active).<br>- Static IP configured and persists across reboots and internal gateway.<br>**Mar 6th note:** Static network configuration issues; VLAN configuration decided to not do for now.<br>**Current IP:** 192.168.2.201 | Static network config issues.     | [x]       |
| SSH Access           | SSH daemon running. Pre‑shared team SSH key added to `~/.ssh/authorized_keys` for admin user.<br>**Commands used:**<br>`ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -C "team-shared-key"` (passphrase: `workers`)<br>`cat ~/.ssh/id_ed25519.pub`<br>**Mar 6th note:** Wanted to establish baseline configuration before introducing keys. During initial config, each Pi had SSH enabled with password. Will return to encrypted key setup. |                                   | [x]       |
| Basic Hardening      | UFW firewall enabled, default deny incoming, allow SSH (port 22).                                                                                  |                                   | [x]       |

### 1.2 Raspberry Pi 4

#### 1.2.1 Raspberry Pi 4 Unit #1 – LoRa Host

**Completed by:** Alex, Nathan  
**Date:** March 6, 2026

| Action            | Expected Outcome                                                                                            | Concerns     | Complete? |
|-------------------|-------------------------------------------------------------------------------------------------------------|--------------|-----------|
| Labelling         | Create a physical label to affix to each Pi.                                                                | Duct tape    | [x]       |
| Imaging           | Raspberry Pi OS Lite (64-bit) flashed to SD card using official imager.                                     |              | [x]       |
| Hostname          | Hostname for Pi #1: **worker1**                                                                             |              | [x]       |
| Boot & Setup      | SSH enabled via userconf or raspi-config. Wi-Fi is disabled.                                                |              | [x]       |
| IP Assignment     | Configuration in `/etc/dhcpcd.conf` persists.<br>**Mar 6th note:** Currently using DHCP; static IP planned later. |              | [ ]       |
| SSH & Keys        | Accessible via SSH. Team SSH key deployed.<br>**Mar 6th note:** Currently using password authentication; keys to be set up later. |              | [ ]       |
| Updates & Basics  | System updated. Hostname set uniquely.                                                                      |              | [ ]       |

#### 1.2.2 Raspberry Pi 4 Unit #2 – Worker #1

**Completed by:** Alex, Nathan  
**Date:** March 6, 2026

| Action            | Expected Outcome                                                                                            | Concerns     | Complete? |
|-------------------|-------------------------------------------------------------------------------------------------------------|--------------|-----------|
| Labelling         | Create a physical label to affix to each Pi.                                                                | Duct tape    | [x]       |
| Imaging           | Raspberry Pi OS Lite (64-bit) flashed to SD card using official imager.                                     |              | [x]       |
| Hostname          | Hostname for Pi #2: **worker2**                                                                             |              | [x]       |
| Boot & Setup      | SSH enabled via userconf or raspi-config. Wi-Fi is disabled.                                                |              | [x]       |
| IP Assignment     | Configuration in `/etc/dhcpcd.conf` persists.<br>**Mar 6th note:** Currently using DHCP (192.168.2.207). Static IP planned later. |              | [ ]       |
| SSH & Keys        | Accessible via SSH. Team SSH key deployed.<br>**Mar 6th note:** Currently using password authentication; keys to be set up later. |              | [ ]       |
| Updates & Basics  | System updated.                                                                                              |              | [ ]       |

#### 1.2.3 Raspberry Pi 4 Unit #3 – Worker #2

**Completed by:** Alex, Nathan  
**Date:** March 6, 2026

| Action            | Expected Outcome                                                                                            | Concerns     | Complete? |
|-------------------|-------------------------------------------------------------------------------------------------------------|--------------|-----------|
| Labelling         | Create a physical label to affix to each Pi.                                                                | Duct tape    | [x]       |
| Imaging           | Raspberry Pi OS Lite (64-bit) flashed to SD card using official imager.                                     |              | [x]       |
| Hostname          | Hostname for Pi #3: **worker3**                                                                             |              | [x]       |
| Boot & Setup      | SSH enabled via userconf or raspi-config. Wi-Fi is disabled.                                                |              | [x]       |
| IP Assignment     | Configuration in `/etc/dhcpcd.conf` persists.<br>**Mar 6th note:** Currently using DHCP (192.168.2.202). Static IP planned later. |              | [ ]       |
| SSH & Keys        | Accessible via SSH. Team SSH key deployed.<br>**Mar 6th note:** Currently using password authentication; keys to be set up later. |              | [ ]       |
| Updates & Basics  | System updated. Hostname set uniquely.                                                                      |              | [ ]       |

### 1.3 LoRa HAT on Pi #1

**Completed by:**  
**Date:**

| Action                 | Expected Outcome                                                                                                                                                     | Concerns | Complete? |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|-----------|
| Physical Install       | Waveshare SX1262 HAT seated correctly on GPIO pins.                                                                                                                  |          | [ ]       |
| SPI Enabling           | `dtparam=spi=on` confirmed in `/boot/config.txt`. Pi rebooted.                                                                                                      |          | [ ]       |
| Drivers / Test Environment | - Python environment setup (`python3 -m venv lora-test`).<br>- Required libraries installed (`pip install spidev RPi.GPIO` and `rpi-lora` if compatible). |          | [ ]       |
| Basic Send / Receive Test | - Run a simple `receive.py` script on Pi #1.<br>- Run a simple `send.py` script on another terminal (or a second device if available).<br>- Confirmation: test packet received and decoded correctly. |          | [ ]       |
| Frequency Check        | Software configuration confirmed for 915MHz (or region’s ISM band).                                                                                                  |          | [ ]       |

### 1.4 Networking Core – NETGEAR GS305E Configuration

**Completed by:** Nick, Anthony, Alex  
**Date:** February 18, 2026

| Action                     | Expected Outcome                                                                                                                                                                                                                             | Concerns                          | Complete? |
|----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|-----------|
| Switch Power & LED         | NETGEAR GS305E powers on. Link/Activity LEDs illuminate for each connected device port.                                                                                                                                                     |                                   | [x]       |
| Physical Setup             | Switch powered on. All 4 devices (Mini PC + 3 Pis) connected to ports 1-4. Port 5 reserved/spare. Link LEDs solid green for each connected port.                                                                                            | Cable seating                     | [x]       |
| Discover Current Switch IP | Obtain switch IP address via one of these methods: • Connected to DHCP network? → check router DHCP leases • No DHCP? → default is 192.168.0.239 • Use NETGEAR Discovery Tool                                                                 | Network conflicts                 | [x]       |
| Access Web Interface       | From a browser on a device connected to the same network (can be Mini PC), navigate to current switch IP. Login page appears.                                                                                                               | Browser compatibility             | [x]       |
| Default Login              | Default username: (blank) • Default password: `password` (case‑sensitive)                                                                                                                                                                    | Password case‑sensitivity         | [x]       |
| Change Default Password    | Change to secure project password. Document in secure credentials file (not in public checklist).                                                                                                                                           | Forgetting new password           | [ ]       |
| Firmware Check             | Check current firmware version. Update if significantly out‑of‑date (optional but recommended).                                                                                                                                             | Update interruption risk          | [ ]       |
| Change Switch IP to 10.0.0.x | Navigate to **System > Management > IP Configuration**. Set:<br>• IP Address: `10.0.0.2` (or another unused IP like `10.0.0.254`)<br>• Subnet Mask: `255.255.255.0`<br>• Default Gateway: (leave blank unless router exists, e.g., `10.0.0.1`)<br>Click **Apply**. | Connectivity loss after change    | [ ]       |
| Reconnect Using New IP     | After IP change, reconnect to switch web interface using the new IP. Confirm login works.                                                                                                                                                    | Forgetting new IP                 | [ ]       |
| VLAN Configuration Decision| Decide VLAN approach based on Week 2 plan:<br>• Option A (Default): Keep all ports on default VLAN 1 (no isolation needed yet)<br>• Option B (Port-based): Create simple port-based VLANs if isolation testing desired. **Note:** Overcomplicating early; can’t handle inter‑VLAN traffic without layer‑3 switch. | Overcomplicating early            | [N]       |
| Default VLAN               | All ports are on the same VLAN (default).                                                                                                                                                                                                    |                                   | [N]       |
| Connectivity Matrix Test   | From each device (10.0.0.10‑13), successfully ping every other device IP. (See Section 2.1)                                                                                                                                                 |                                   | [ ]       |
| Isolation Check            | No device can ping an unreachable external IP when firewall is up (confirms no rogue route).                                                                                                                                                |                                   | [ ]       |
| Enable VLAN Mode           | Navigate to **VLAN > 802.1Q VLAN** or **VLAN > Port-based**. Enable VLAN mode. Warning about losing current settings – acknowledge.                                                                                                          | Settings reset                    | [ ]       |
| Assign VLANs               | Configure VLAN membership as desired. For simple isolation, create separate VLANs for specific ports.                                                                                                                                       | Isolation breaking connectivity   | [ ]       |
| Save Configuration         | Click **Apply** on all changes. Settings persist through power cycle.                                                                                                                                                                        |                                   | [ ]       |

## 1.5 Rancher Configuration (Ubuntu VM)

**Completed by:**  
**Date:**

| Action | Expected Outcome | Concerns | Complete? |
|--------|------------------|----------|-----------|
| **VM Network Verification** | Ubuntu VM (192.168.2.214) can ping mini PC (192.168.2.201) and all worker Pis. | Firewall rules, VirtualBox network mode (Bridged). | [ ] |
| **Install Docker** | Docker installed and running: `sudo systemctl status docker` shows active. | | [ ] |
| **Install kubectl** | `kubectl version --client` shows version. | | [ ] |
| **Copy kubeconfig from mini PC** | `scp user@192.168.2.201:/etc/rancher/k3s/k3s.yaml ~/k3s.yaml` succeeds. | SSH access, correct username. | [ ] |
| **Configure kubectl context** | Set `export KUBECONFIG=~/k3s.yaml` (add to `~/.bashrc`). Edit `server:` line to `https://192.168.2.201:6443`. Test: `kubectl get nodes` lists mini PC and workers. | IP address correct; port 6443 reachable. | [ ] |
| **Install Helm** | `helm version` shows client version. | | [ ] |
| **Install cert-manager CRDs** | `kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.crds.yaml` succeeds. | CRDs installed without error. | [ ] |
| **Add cert-manager Helm repo** | `helm repo add jetstack https://charts.jetstack.io` and `helm repo update` succeed. | | [ ] |
| **Install cert-manager** | `helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --version v1.14.4` succeeds. If release exists, handle: `helm uninstall cert-manager -n cert-manager` or `helm upgrade`. | Helm release conflicts; if "in progress", delete Helm secrets manually (`kubectl get secrets -n cert-manager`). | [ ] |
| **Verify cert-manager** | All cert-manager pods running: `kubectl get pods -n cert-manager -w`. Wait for rollout: `kubectl rollout status deployment -n cert-manager cert-manager`. | | [ ] |
| **Add Rancher Helm repo** | `helm repo add rancher-latest https://releases.rancher.com/server-charts/latest` and `helm repo update` succeed. | | [ ] |
| **Install Rancher** | `helm install rancher rancher-latest/rancher --namespace cattle-system --create-namespace --set hostname=rancher.kuber-tuber.local --set replicas=1 --set bootstrapPassword=admin` succeeds. If name in use, uninstall previous: `helm uninstall rancher -n cattle-system` (or delete secrets). | Helm release conflicts; pending operations. | [ ] |
| **Wait for Rancher rollout** | `kubectl -n cattle-system rollout status deploy/rancher` shows success. | Takes a few minutes. | [ ] |
| **Get Rancher service NodePort** | `kubectl get svc -n cattle-system rancher` shows port mapping (e.g., `443:30443/TCP`). | | [ ] |
| **Access Rancher UI** | Browser to `https://192.168.2.214:<NodePort>` loads login page. Accept self‑signed cert warning. | Firewall may need to allow port. | [ ] |
| **Retrieve admin password** | If `bootstrapPassword=admin` doesn't work, run:<br>• `kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword\|base64decode}}'`<br>• OR `kubectl exec -n cattle-system deploy/rancher -- rancher reset-admin` (if that command exists; otherwise `cattle reset-password`). | Password not set; secret not found. | [ ] |
| **Log in to Rancher** | Successfully log in with admin credentials (username `admin`). Change password if prompted. | | [ ] |
| **Import existing K3s cluster** | In Rancher UI, click **Import Existing**, name cluster (e.g., `k3s-cluster`), copy the provided `kubectl` command and run it on Ubuntu VM. Wait for cluster to appear as active. | Cluster must be reachable; network routing. | [ ] |
| **Verify cluster in Rancher** | Nodes, workloads, and namespaces visible in Rancher dashboard. | | [ ] |



### 1.6 Node Failure Scenarios

**Completed by:**  
**Date:**

| Scenario               | Test Action                             | Expected System State                                                                                                     | Pass/Fail |
|------------------------|-----------------------------------------|---------------------------------------------------------------------------------------------------------------------------|-----------|
| Single Pi Worker Loss  | Physically power off Pi #2 (Worker 1).  | 1. Mini PC and other Pis remain pingable.<br>2. SSH connections to Pi #2 timeout.<br>3. No other services impacted *(pre‑K3s)*. | [ ]       |
| Switch Reboot          | Power cycle the NETGEAR GS305E.         | 1. All devices regain network connectivity within 60 seconds of switch ready light.<br>2. Static IPs are retained.<br>3. All pairwise pings resume. | [ ]       |
| Master (Mini PC) Reboot| Reboot the Mini PC.                      | 1. All Pis remain pingable from each other.<br>2. Mini PC returns to its static IP after boot.<br>3. SSH to Mini PC restored. | [ ]       |
| LoRa Pi Service Crash  | Simulate crash of test Python LoRa script on Pi #1. | 1. Script can be restarted manually.<br>2. No hardware lock-up; SPI interface still accessible.<br>3. Pi #1 remains pingable. | [ ]       |

---

## 2. Pre-Service Functionality Verification

### 2.1 Connectivity Matrix: Result Tracking

**Completed by:**  
**Date:**

| From/To        | Mini PC (.10) | Pi #1 (.11) | Pi #2 (.12) | Pi #3 (.13) |
|----------------|---------------|-------------|-------------|-------------|
| **Mini PC (.10)** | N/A           | [ ]         | [ ]         | [ ]         |
| **Pi #1 (.11)**   | [ ]           | N/A         | [ ]         | [ ]         |
| **Pi #2 (.12)**   | [ ]           | [ ]         | N/A         | [ ]         |
| **Pi #3 (.13)**   | [ ]           | [ ]         | [ ]         | N/A         |

### 2.2 Pre-Service Hand-Off

**Completed by:**  
**Date:**

| Task                     | Description                                                                                 | Complete? |
|--------------------------|---------------------------------------------------------------------------------------------|-----------|
| All Devices Updated      | `sudo apt update && sudo apt upgrade -y` run on all nodes. Reboot if necessary.            | [ ]       |
| Time Synchronization     | Confirm `timedatectl status` shows NTP synchronized on all devices.                         | [ ]       |
| No Critical Log Errors   | `journalctl -p 3 -b` shows no alarming errors on any node post‑final‑reboot.                | [ ]       |
| GitHub Repos Updated     | All device‑specific configuration notes, hostnames, final IPs, unique hardware IDs documented in project’s `docs/` folder. | [ ]       |

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
  - Tailscale set up on mini PC and worker1; Nick can now SSH remotely into worker1 for LoRa HAT configuration.
  - Began Rancher installation on mini PC (Nathan).
  - Began K3s cluster setup (Nathan/Alex); master node initialized, worker join tokens prepared.
  - Acquired Cardputer ADV with LoRa Cap 868 (868 MHz) – will be used as a mobile field node for testing.
- **Decisions:**
  - Use Tailscale for all remote access instead of exposing SSH or configuring port forwarding.
  - Static IPs postponed; continue using DHCP addresses for now; will assign planned static IPs after initial services are stable.
- **Next Steps:**
  - Complete Rancher deployment and access dashboard.
  - Join worker2 and worker3 to K3s cluster.
  - Nick to continue LoRa HAT configuration on worker1 (via Tailscale).
  - Anthony to begin developing LoRa‑Matrix bridge and Cardputer client.
- **Issues:**
  - Nick initially couldn’t ping worker1’s Tailscale IP; resolved by having Nick run `sudo tailscale up` and re‑authenticate.
