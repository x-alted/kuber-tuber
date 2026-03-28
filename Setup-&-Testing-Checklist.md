# Project Kuber-Tuber – Setup & Testing Checklist

**Version:** 1.1  
**Created by:** Alex  
**Date:** February 11, 2026 – March 13, 2026

## Table of Contents

0.5 [Current IP Table](#05-current-ip-table)

1. [Individual Hardware & OS Validation](#1-individual-hardware--os-validation)

	1.1 [Mini PC (K3s Master / Matrix Server)](#11-mini-pc-k3s-master--matrix-server)

1.2 [Raspberry Pi 4](#12-raspberry-pi-4)  
 1.2.1 [Pi #1 – Worker #1 / LoRa Host](#121-raspberry-pi-4-unit-1--lora-host)  
 1.2.2 [Pi #2 – Worker #2](#122-raspberry-pi-4-unit-2--worker-1)  
 1.2.3 [Pi #3 – Worker #3](#123-raspberry-pi-4-unit-3--worker-2)
 
1.3 [LoRa HAT on Pi #1](#13-lora-hat-on-pi-1)

1.4 [Networking Core – NETGEAR GS305E Configuration](#14-networking-core--netgear-gs305e-configuration)

1.5 [Rancher (Ubuntu Server VM)](#15-Rancher-Configuration-Ubuntu-VM)

3.1 [Node Failure Scenarios](#15-node-failure-scenarios)  

3.2 [Pre-Service Functionality Verification](#2-pre-service-functionality-verification)

3.3 [Connectivity Matrix: Result Tracking](#21-connectivity-matrix-result-tracking)  

3.4 [Pre-Service Hand-Off](#22-pre-service-hand-off)  

---

## 0.5 - Current IP Table

| Device    | Local IP      | Hostname      | Role                       |
| --------- | ------------- | ------------- | -------------------------- |
| Mini PC   | 192.168.2.201 | debian-master | K3s master (Control Plane) |
| Ubuntu VM | 192.168.2.214 | kuberserver   | K3s worker & Rancher host  |
| worker1   | 192.168.2.208 | worker1       | K3s worker, **LoRa host**  |
| worker2   | 192.168.2.207 | worker2       | K3s worker                 |
| worker3   | 192.168.2.202 | worker3       | K3s worker                 |
| Switch    | 192.168.2.204 | –             | NETGEAR GS305E             |

**Rancher internal service IP:** `10.43.143.192` (accessible within cluster; for UI use `https://192.168.2.214:30443`)


---

## 1. Individual Hardware & OS Validation

### 1.1 Mini PC (K3s Master / Matrix Server)

**Completed by:** Nathan, Anthony  
**Date:** February 18, 2026

| Action               | Expected Outcome                                                                                                                                                                                                                                                                                                                                                                                                                           | Concerns                      | Complete? |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | --------- |
| Power & Boot         | Powers on reliably via wall adapter and power bank.                                                                                                                                                                                                                                                                                                                                                                                        | Power output.                 | [x]       |
| OS Confirmation      | Confirm that Debian 13 is installed and updated.                                                                                                                                                                                                                                                                                                                                                                                           |                               | [x]       |
| User and Pass        | **Username:** cluster16gb<br>**Password:** cluster16gb                                                                                                                                                                                                                                                                                                                                                                                     |                               | [x]       |
| Network Connectivity | - Ethernet link established to NETGEAR switch (link light active).<br>- Static IP configured and persists across reboots and internal gateway.<br>**Mar 6th note:** Static network configuration issues; VLAN configuration decided to not do for now.<br>**Current IP:** 192.168.2.201                                                                                                                                                    | Static network config issues. | [x]       |
| SSH Access           | SSH daemon running. Pre‑shared team SSH key added to `~/.ssh/authorized_keys` for admin user.<br>**Commands used:**<br>`ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -C "team-shared-key"` (passphrase: `workers`)<br>`cat ~/.ssh/id_ed25519.pub`<br>**Mar 6th note:** Wanted to establish baseline configuration before introducing keys. During initial config, each Pi had SSH enabled with password. Will return to encrypted key setup. |                               | [x]       |
| Basic Hardening      | UFW firewall enabled, default deny incoming, allow SSH (port 22).                                                                                                                                                                                                                                                                                                                                                                          |                               | [x]       |

### 1.2 Raspberry Pi 4

#### 1.2.1 Raspberry Pi 4 – Worker #1 / LoRa Host

**Completed by:** Alex, Nathan  
**Date:** March 6, 2026

| Action           | Expected Outcome                                                                                                                  | Concerns  | Complete? |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| Labelling        | Create a physical label to affix to each Pi.                                                                                      | Duct tape | [x]       |
| Imaging          | Raspberry Pi OS Lite (64-bit) flashed to SD card using official imager.                                                           |           | [x]       |
| Hostname         | Hostname for Pi #1: **worker1**                                                                                                   |           | [x]       |
| Boot & Setup     | SSH enabled via userconf or raspi-config. Wi-Fi is disabled.                                                                      |           | [x]       |
| IP Assignment    | Configuration in `/etc/dhcpcd.conf` persists.<br>**Mar 6th note:** Currently using DHCP; static IP planned later.                 |           | [ ]       |
| SSH & Keys       | Accessible via SSH. Team SSH key deployed.<br>**Mar 6th note:** Currently using password authentication; keys to be set up later. |           | [ ]       |
| Updates & Basics | System updated. Hostname set uniquely.                                                                                            |           | [x]       |

#### 1.2.2 Raspberry Pi 4 – Worker #2

**Completed by:** Alex, Nathan  
**Date:** March 6, 2026

| Action           | Expected Outcome                                                                                                                  | Concerns  | Complete? |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| Labelling        | Create a physical label to affix to each Pi.                                                                                      | Duct tape | [x]       |
| Imaging          | Raspberry Pi OS Lite (64-bit) flashed to SD card using official imager.                                                           |           | [x]       |
| Hostname         | Hostname for Pi #2: **worker2**                                                                                                   |           | [x]       |
| Boot & Setup     | SSH enabled via userconf or raspi-config. Wi-Fi is disabled.                                                                      |           | [x]       |
| IP Assignment    | Configuration in `/etc/dhcpcd.conf` persists.<br>**Mar 6th note:** Currently using DHCP (192.168.2.207). Static IP planned later. |           | [ ]       |
| SSH & Keys       | Accessible via SSH. Team SSH key deployed.<br>**Mar 6th note:** Currently using password authentication; keys to be set up later. |           | [ ]       |
| Updates & Basics | System updated. Hostname set uniquely.                                                                                            |           | [x]       |

#### 1.2.3 Raspberry Pi 4 Unit #3 – Worker #3

**Completed by:** Alex, Nathan  
**Date:** March 6, 2026

| Action           | Expected Outcome                                                                                                                  | Concerns  | Complete? |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| Labelling        | Create a physical label to affix to each Pi.                                                                                      | Duct tape | [x]       |
| Imaging          | Raspberry Pi OS Lite (64-bit) flashed to SD card using official imager.                                                           |           | [x]       |
| Hostname         | Hostname for Pi #3: **worker3**                                                                                                   |           | [x]       |
| Boot & Setup     | SSH enabled via userconf or raspi-config. Wi-Fi is disabled.                                                                      |           | [x]       |
| IP Assignment    | Configuration in `/etc/dhcpcd.conf` persists.<br>**Mar 6th note:** Currently using DHCP (192.168.2.202). Static IP planned later. |           | [ ]       |
| SSH & Keys       | Accessible via SSH. Team SSH key deployed.<br>**Mar 6th note:** Currently using password authentication; keys to be set up later. |           | [ ]       |
| Updates & Basics | System updated. Hostname set uniquely.                                                                                            |           | [x]       |

### 1.3 Worker #1 (LoRA Host)

**Completed by:** Alex, Nathan, Nick
**Date:** March 6th, 2026

| Action                     | Expected Outcome                                                                                                                                                                                      | Concerns | Complete? |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| Physical Install           | Waveshare SX1262 HAT seated correctly on GPIO pins.                                                                                                                                                   |          | [x]       |
| SPI Enabling               | `dtparam=spi=on` confirmed in `/boot/config.txt`. Pi rebooted.                                                                                                                                        |          | [ ]       |
| Drivers / Test Environment | - Python environment setup (`python3 -m venv lora-test`).<br>- Required libraries installed (`pip install spidev RPi.GPIO` and `rpi-lora` if compatible).                                             |          | [ ]       |
| Basic Send / Receive Test  | - Run a simple `receive.py` script on Pi #1.<br>- Run a simple `send.py` script on another terminal (or a second device if available).<br>- Confirmation: test packet received and decoded correctly. |          | [ ]       |
| Frequency Check            | Software configuration confirmed for 915MHz (or region’s ISM band).                                                                                                                                   |          | [ ]       |

### 1.4 Networking Core – NETGEAR GS305E Configuration

**Completed by:** Nick, Anthony, Alex  
**Date:** February 18, 2026

| Action                       | Expected Outcome                                                                                                                                                                                                                                                                                                  | Concerns                        | Complete? |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------- |
| Switch Power & LED           | NETGEAR GS305E powers on. Link/Activity LEDs illuminate for each connected device port.                                                                                                                                                                                                                           |                                 | [x]       |
| Physical Setup               | Switch powered on. All 4 devices (Mini PC + 3 Pis) connected to ports 1-4. Port 5 reserved/spare. Link LEDs solid green for each connected port.                                                                                                                                                                  | Cable seating                   | [x]       |
| Discover Current Switch IP   | Obtain switch IP address via one of these methods: • Connected to DHCP network? → check router DHCP leases • No DHCP? → default is 192.168.0.239 • Use NETGEAR Discovery Tool                                                                                                                                     | Network conflicts               | [x]       |
| Access Web Interface         | From a browser on a device connected to the same network (can be Mini PC), navigate to current switch IP. Login page appears.                                                                                                                                                                                     | Browser compatibility           | [x]       |
| Default Login                | Default username: (blank) • Default password: `password` (case‑sensitive)                                                                                                                                                                                                                                         | Password case‑sensitivity       | [x]       |
| Change Default Password      | Change to secure project password. Document in secure credentials file (not in public checklist).                                                                                                                                                                                                                 | Forgetting new password         | [x]       |
| Firmware Check               | Check current firmware version. Update if significantly out‑of‑date (optional but recommended).                                                                                                                                                                                                                   | Update interruption risk        | [ ]       |
| Change Switch IP to 10.0.0.x | Navigate to **System > Management > IP Configuration**. Set:<br>• IP Address: `10.0.0.2` (or another unused IP like `10.0.0.254`)<br>• Subnet Mask: `255.255.255.0`<br>• Default Gateway: (leave blank unless router exists, e.g., `10.0.0.1`)<br>Click **Apply**.                                                | Connectivity loss after change  | [ ]       |
| Reconnect Using New IP       | After IP change, reconnect to switch web interface using the new IP. Confirm login works.                                                                                                                                                                                                                         | Forgetting new IP               | [ ]       |
| VLAN Configuration Decision  | Decide VLAN approach based on Week 2 plan:<br>• Option A (Default): Keep all ports on default VLAN 1 (no isolation needed yet)<br>• Option B (Port-based): Create simple port-based VLANs if isolation testing desired. **Note:** Overcomplicating early; can’t handle inter‑VLAN traffic without layer‑3 switch. | Overcomplicating early          | []        |
| Default VLAN                 | All ports are on the same VLAN (default).                                                                                                                                                                                                                                                                         |                                 | []        |
| Connectivity Matrix Test     | From each device (10.0.0.10‑13), successfully ping every other device IP. (See Section 2.1)                                                                                                                                                                                                                       |                                 | [ ]       |
| Isolation Check              | No device can ping an unreachable external IP when firewall is up (confirms no rogue route).                                                                                                                                                                                                                      |                                 | [ ]       |
| Enable VLAN Mode             | Navigate to **VLAN > 802.1Q VLAN** or **VLAN > Port-based**. Enable VLAN mode. Warning about losing current settings – acknowledge.                                                                                                                                                                               | Settings reset                  | [ ]       |
| Assign VLANs                 | Configure VLAN membership as desired. For simple isolation, create separate VLANs for specific ports.                                                                                                                                                                                                             | Isolation breaking connectivity | [ ]       |
| Save Configuration           | Click **Apply** on all changes. Settings persist through power cycle.                                                                                                                                                                                                                                             |                                 | [ ]       |

## 1.5 Rancher Configuration (Ubuntu VM)

**Completed by:**  
**Date:**

| Action                           | Expected Outcome                                                                                                                                                                                                                                                                                                  | Concerns                                                                                                        | Complete? |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------- |
| **VM Network Verification**      | Ubuntu VM (192.168.2.214) can ping mini PC (192.168.2.201) and all worker Pis.                                                                                                                                                                                                                                    | Firewall rules, VirtualBox network mode (Bridged).                                                              | [x]       |
| **Install Docker**               | Docker installed and running: `sudo systemctl status docker` shows active.                                                                                                                                                                                                                                        |                                                                                                                 | [ ]       |
| **Install kubectl**              | `kubectl version --client` shows version.                                                                                                                                                                                                                                                                         |                                                                                                                 | [x]       |
| **Copy kubeconfig from mini PC** | `scp user@192.168.2.201:/etc/rancher/k3s/k3s.yaml ~/k3s.yaml` succeeds.                                                                                                                                                                                                                                           | SSH access, correct username.                                                                                   | [x]       |
| **Configure kubectl context**    | Set `export KUBECONFIG=~/k3s.yaml` (add to `~/.bashrc`). Edit `server:` line to `https://192.168.2.201:6443`. Test: `kubectl get nodes` lists mini PC and workers.                                                                                                                                                | IP address correct; port 6443 reachable.                                                                        | [x]       |
| **Install Helm**                 | `helm version` shows client version.                                                                                                                                                                                                                                                                              |                                                                                                                 | [x]       |
| **Install cert-manager CRDs**    | `kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.crds.yaml` succeeds.                                                                                                                                                                                        | CRDs installed without error.                                                                                   | [x]       |
| **Add cert-manager Helm repo**   | `helm repo add jetstack https://charts.jetstack.io` and `helm repo update` succeed.                                                                                                                                                                                                                               |                                                                                                                 | [x]       |
| **Install cert-manager**         | `helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --version v1.14.4` succeeds. If release exists, handle: `helm uninstall cert-manager -n cert-manager` or `helm upgrade`.                                                                                             | Helm release conflicts; if "in progress", delete Helm secrets manually (`kubectl get secrets -n cert-manager`). | [x]       |
| **Verify cert-manager**          | All cert-manager pods running: `kubectl get pods -n cert-manager -w`. Wait for rollout: `kubectl rollout status deployment -n cert-manager cert-manager`.                                                                                                                                                         |                                                                                                                 | [x]       |
| **Add Rancher Helm repo**        | `helm repo add rancher-latest https://releases.rancher.com/server-charts/latest` and `helm repo update` succeed.                                                                                                                                                                                                  |                                                                                                                 | [x]       |
| **Install Rancher**              | `helm install rancher rancher-latest/rancher --namespace cattle-system --create-namespace --set hostname=rancher.kuber-tuber.local --set replicas=1 --set bootstrapPassword=admin` succeeds. If name in use, uninstall previous: `helm uninstall rancher -n cattle-system` (or delete secrets).                   | Helm release conflicts; pending operations.                                                                     | [x]       |
| **Wait for Rancher rollout**     | `kubectl -n cattle-system rollout status deploy/rancher` shows success.                                                                                                                                                                                                                                           | Takes a few minutes.                                                                                            | [x]       |
| **Get Rancher service NodePort** | `kubectl get svc -n cattle-system rancher` shows port mapping (e.g., `443:30443/TCP`).                                                                                                                                                                                                                            |                                                                                                                 | [x]       |
| **Access Rancher UI**            | Browser to `https://192.168.2.214:<NodePort>` loads login page. Accept self‑signed cert warning.                                                                                                                                                                                                                  | Firewall may need to allow port.                                                                                | [x]       |
| **Retrieve admin password**      | If `bootstrapPassword=admin` doesn't work, run:<br>• `kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword\|base64decode}}'`<br>• OR `kubectl exec -n cattle-system deploy/rancher -- rancher reset-admin` (if that command exists; otherwise `cattle reset-password`). | Password not set; secret not found.                                                                             | [x]       |
| **Log in to Rancher**            | Successfully log in with admin credentials (username `admin`). Change password if prompted.                                                                                                                                                                                                                       |                                                                                                                 | [x]       |
| **Import existing K3s cluster**  | In Rancher UI, click **Import Existing**, name cluster (e.g., `k3s-cluster`), copy the provided `kubectl` command and run it on Ubuntu VM. Wait for cluster to appear as active.                                                                                                                                  | Cluster must be reachable; network routing.                                                                     | [x]       |
| **Verify cluster in Rancher**    | Nodes, workloads, and namespaces visible in Rancher dashboard.                                                                                                                                                                                                                                                    |                                                                                                                 | [x]       |



### 1.6 Node Failure Scenarios

**Completed by:**  
**Date:** March 13th, 2026

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
- **Accomplishments:**
  - **Setting up a Pi Router:**
 	- Setting the static ip interface to 10.0.10.1/24 on for vlan 10, and 10.0.20.1/24 for vlan 20
    - Setting up a dhcp server using dnsmasq
    - The Vlans created are vlan 10 on eth0.10 for the mini pc and ubuntu vm and vlan 20 on eth0.20 for worker1, worker2, and worker3
    - Enabled port forwarding
    - Allow forwarding between vlans using iptables
  - **Next Steps:**
    - **Configure managed switch:**
      - The port for the pi router must be a trunk (tagged vlan 10 & tagged vlan 20)
      - The port for the mini pc must be access vlan 10 and ignore vlan 20
      - The ports with the worker pis mus be access vlan 20 and ignore vlan 10
      - Reset all devices and check the ip of the mini pc, and the 3 workers; make sure the have the appropriate ip addresses
      - From mini pc, ping the gateway (10.0.10.1) and the 3 workers
      - From each of the workers, ping the gateway (10.0.20.1) and the mini pc
