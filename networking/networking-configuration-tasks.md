# Networking & Infrastructure – To Do

## 1. Router Pi Setup

**Hardware:** Raspberry Pi 4 (or 3B+) with at least one Ethernet port.  
**Role:** Gateway between VLAN 10 and VLAN 20; provides DHCP and inter‑VLAN routing.

### 1.1 Install OS & Update
- [ ] Flash Raspberry Pi OS Lite (64-bit) to SD card.  
- [ ] Boot, log in, set hostname: `router-pi`.  
- [ ] `sudo apt update && sudo apt upgrade -y`  

### 1.2 Configure Network Interfaces (systemd-networkd with VLAN tagging)
The router Pi uses a **single Ethernet port with VLAN-tagged sub-interfaces** (`eth0.10` for VLAN 10, `eth0.20` for VLAN 20). The managed switch trunk carries both VLANs on one cable.

- [ ] Load the 802.1q VLAN kernel module and persist it across reboots:
  ```bash
  sudo modprobe 8021q
  echo "8021q" | sudo tee /etc/modules-load.d/8021q.conf
  ```
- [ ] Create the VLAN 10 virtual interface definition (`/etc/systemd/network/10-vlan10.netdev`):
  ```ini
  [NetDev]
  Name=eth0.10
  Kind=vlan

  [VLAN]
  Id=10
  ```
- [ ] Create the VLAN 20 virtual interface definition (`/etc/systemd/network/11-vlan20.netdev`):
  ```ini
  [NetDev]
  Name=eth0.20
  Kind=vlan

  [VLAN]
  Id=20
  ```
- [ ] Configure the parent interface to spawn both VLANs (`/etc/systemd/network/05-eth0.network`):
  ```ini
  [Match]
  Name=eth0

  [Network]
  VLAN=eth0.10
  VLAN=eth0.20
  ```
- [ ] Assign a static IP to the VLAN 10 interface (`/etc/systemd/network/12-vlan10.network`):
  ```ini
  [Match]
  Name=eth0.10

  [Network]
  Address=10.0.10.1/24
  IPForward=yes
  ```
- [ ] Assign a static IP to the VLAN 20 interface (`/etc/systemd/network/13-vlan20.network`):
  ```ini
  [Match]
  Name=eth0.20

  [Network]
  Address=10.0.20.1/24
  IPForward=yes
  ```
- [ ] Enable and start systemd-networkd (disable dhcpcd if it is running):
  ```bash
  sudo systemctl disable --now dhcpcd || true
  sudo systemctl enable --now systemd-networkd
  ```
- [ ] Verify VLAN interfaces appear with correct addresses:
  ```bash
  ip a | grep -E "eth0$|eth0.10|eth0.20"
  ```

### 1.3 Enable IP Forwarding
- [ ] Edit `/etc/sysctl.conf` and uncomment: `net.ipv4.ip_forward=1`  
- [ ] Apply: `sudo sysctl -p`  

### 1.4 Install & Configure DHCP Server (dnsmasq)
- [ ] Install: `sudo apt install dnsmasq -y`  
- [ ] Backup original config: `sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.bak`  
- [ ] Create new `/etc/dnsmasq.conf`:
  ```ini
  # VLAN 10 (10.0.10.0/24)
  interface=eth0.10          # or eth0 if separate interface
  dhcp-range=10.0.10.50,10.0.10.200,255.255.255.0,24h
  dhcp-option=3,10.0.10.1    # default gateway
  dhcp-option=6,8.8.8.8      # DNS

  # VLAN 20 (10.0.20.0/24)
  interface=eth0.20
  dhcp-range=10.0.20.50,10.0.20.200,255.255.255.0,24h
  dhcp-option=3,10.0.20.1
  dhcp-option=6,8.8.8.8
  ```
- [ ] Restart dnsmasq: `sudo systemctl restart dnsmasq`  

### 1.5 Configure iptables (Restrictive — Default DROP)
The deployed firewall uses a **default DROP policy** on the FORWARD chain. Only the traffic K3s actually needs is explicitly allowed. Workers cannot initiate connections to the control plane.

- [ ] Set default DROP policy on the FORWARD chain:
  ```bash
  sudo iptables -P FORWARD DROP
  ```
- [ ] Allow return traffic for established connections:
  ```bash
  sudo iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT
  ```
- [ ] Allow SSH from control plane (`10.0.10.0/24`) to workers (`10.0.20.0/24`):
  ```bash
  sudo iptables -A FORWARD -s 10.0.10.0/24 -d 10.0.20.0/24 -p tcp --dport 22 -j ACCEPT
  ```
- [ ] Allow K3s API server access from workers to master:
  ```bash
  sudo iptables -A FORWARD -s 10.0.20.0/24 -d 10.0.10.0/24 -p tcp --dport 6443 -j ACCEPT
  ```
- [ ] Log all dropped packets for forensic analysis:
  ```bash
  sudo iptables -A FORWARD -j LOG --log-prefix "FW-DROP: "
  ```
- [ ] Save rules so they survive reboots:
  ```bash
  sudo apt install iptables-persistent -y
  sudo netfilter-persistent save
  ```

> **Note:** If you need to allow internet access through the router, add a NAT rule on the upstream interface only — do not relax the inter-VLAN FORWARD rules.

### 1.6 Verification
- [ ] From router Pi, ping both gateways:  
  ```bash
  ping -c 3 10.0.10.1
  ping -c 3 10.0.20.1
  ```
- [ ] Connect a test device to each VLAN and verify it gets a DHCP lease.

---

## 2. Managed Switch VLAN Configuration

**Switch:** NETGEAR GS305E (or similar)  
**Goal:** Trunk port to router Pi, access ports for devices.

### 2.1 Access Switch Web Interface
- [ ] Connect a laptop to the switch, set static IP in same subnet (e.g., 10.0.10.100).  
- [ ] Browse to switch IP (`10.0.1.58`). Login with project password.  

### 2.2 Enable 802.1Q VLAN Mode
- [ ] Navigate to **VLAN > 802.1Q VLAN**. Enable mode (confirm warning).  

### 2.3 Create VLANs
- [ ] VLAN 10: Name `VLAN10`, set VLAN ID 10.  
- [ ] VLAN 20: Name `VLAN20`, set VLAN ID 20.  

### 2.4 Configure Ports
- [ ] **Port 1 (Router Pi)**: Trunk — tagged for VLAN 10 and VLAN 20; untagged (PVID 1) for management.
- [ ] **Port 2 (Mini PC `debian-master`)**: Access VLAN 10 — untagged, PVID = 10.
- [ ] **Port 3 (`worker1` — LoRa gateway)**: Access VLAN 20 — untagged, PVID = 20.
- [ ] **Port 4 (`worker2`)**: Access VLAN 20 — untagged, PVID = 20.
- [ ] **Port 5 (`worker3`)**: Access VLAN 20 — untagged, PVID = 20.

> The GS305E has exactly 5 ports. There is no port for a separate Ubuntu VM — Rancher runs as a pod on the K3s cluster itself.

### 2.5 Save Configuration
- [ ] Apply changes, ensure they persist across reboots.  

### 2.6 Verification
- [ ] From mini PC, ping router Pi at `10.0.10.1`.  
- [ ] From worker1, ping router Pi at `10.0.20.1`.  
- [ ] From mini PC, ping worker1 at `10.0.20.138` (should work if router forwards traffic).  
- [ ] If no ping cross‑VLAN, check router iptables rules.

---

## 3. Update Static IPs on All Devices

All devices must have static IPs matching the final scheme.  
**Note:** Changing IPs will break existing K3s cluster; plan for cluster rebuild after IP changes.

### 3.1 Mini PC (Debian)
- [ ] Edit `/etc/network/interfaces` or use netplan. Set static:
  ```yaml
  address 10.0.10.94/24
  gateway 10.0.10.1
  dns-nameservers 8.8.8.8
  ```
- [ ] Reboot or restart networking: `sudo systemctl restart networking`  

### 3.2 Ubuntu VM (Rancher) — Removed
The separate Ubuntu VM (`kuberserver`, previously `10.0.10.214`) was removed during the cluster rebuild on 2026-03-27. Rancher now runs as a Helm deployment directly on the K3s cluster (pods on worker nodes). No separate VM configuration is needed.

### 3.3 Worker Pis (Raspberry Pi OS)
- [ ] Edit `/etc/dhcpcd.conf` and add at the end:
  ```
  interface eth0
  static ip_address=10.0.20.138/24   # worker1; use .150 for worker2, .63 for worker3
  static routers=10.0.20.1
  static domain_name_servers=8.8.8.8
  ```
- [ ] Reboot or `sudo systemctl restart dhcpcd`  

### 3.4 Verification
- [ ] On each device, run `ip a` to confirm correct IP.  
- [ ] Ping the router gateway (`10.0.10.1` or `10.0.20.1`).  
- [ ] Test DNS resolution (e.g., `ping google.com` if internet available).

---

## 4. Connectivity Matrix Test

Once all IPs are set and VLANs operational, fill out the matrix in the main checklist.

- [ ] **From Mini PC (10.0.10.201)**  
  - Ping `10.0.10.1` (router)  
  - Ping `10.0.10.1` (router VLAN 10 interface)  
  - Ping `10.0.20.138`, `10.0.20.150`, `10.0.20.63` (workers)  
- [ ] **From each worker**  
  - Ping `10.0.20.1` (router)  
  - Ping other workers  
  - Ping `10.0.10.94` (mini PC) – should succeed if router forwards.  

- [ ] **Document results** in the main checklist matrix.

---

Use this checklist to track progress. Mark items `[x]` as they are completed.
```
