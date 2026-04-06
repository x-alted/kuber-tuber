# Networking & Infrastructure – To Do

## 1. Router Pi Setup

**Hardware:** Raspberry Pi 4 (or 3B+) with at least one Ethernet port.  
**Role:** Gateway between VLAN 10 and VLAN 20; provides DHCP and inter‑VLAN routing.

### 1.1 Install OS & Update
- [ ] Flash Raspberry Pi OS Lite (64-bit) to SD card.  
- [ ] Boot, log in, set hostname: `router-pi`.  
- [ ] `sudo apt update && sudo apt upgrade -y`  

### 1.2 Configure Network Interfaces
- [ ] Edit `/etc/dhcpcd.conf` to assign static IPs.  
  - If using two physical ports:
    ```bash
    interface eth0
    static ip_address=10.0.10.1/24
    static routers=
    static domain_name_servers=

    interface eth1
    static ip_address=10.0.20.1/24
    static routers=
    static domain_name_servers=
    ```
  - If using a single port with VLAN tagging (requires managed switch trunk):
    ```bash
    interface eth0.10
    static ip_address=10.0.10.1/24
    interface eth0.20
    static ip_address=10.0.20.1/24
    ```
- [ ] Reboot or restart networking: `sudo systemctl restart dhcpcd`  

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

### 1.5 Configure iptables for Inter‑VLAN Routing
- [ ] Allow forwarding between VLANs:
  ```bash
  sudo iptables -A FORWARD -i eth0.10 -o eth0.20 -j ACCEPT
  sudo iptables -A FORWARD -i eth0.20 -o eth0.10 -j ACCEPT
  ```
- [ ] (Optional) Add NAT if internet access needed:
  ```bash
  sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
  ```
- [ ] Save rules:  
  ```bash
  sudo apt install iptables-persistent -y
  sudo netfilter-persistent save
  ```

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
- [ ] Browse to switch IP (currently 10.0.10.204). Login with project password.  

### 2.2 Enable 802.1Q VLAN Mode
- [ ] Navigate to **VLAN > 802.1Q VLAN**. Enable mode (confirm warning).  

### 2.3 Create VLANs
- [ ] VLAN 10: Name `VLAN10`, set VLAN ID 10.  
- [ ] VLAN 20: Name `VLAN20`, set VLAN ID 20.  

### 2.4 Configure Ports
- [ ] **Port 1 (to router Pi)**: Trunk – tagged for VLAN 10 and VLAN 20. PVID = 1 (or leave default).  
- [ ] **Port 2 (mini PC)**: Access VLAN 10 – untagged, PVID = 10.  
- [ ] **Port 3 (Ubuntu VM)**: Access VLAN 10 – untagged, PVID = 10.  
- [ ] **Port 4 (worker1)**: Access VLAN 20 – untagged, PVID = 20.  
- [ ] **Port 5 (worker2)**: Access VLAN 20 – untagged, PVID = 20.  
- [ ] **Port 6 (worker3)**: Access VLAN 20 – untagged, PVID = 20.  

### 2.5 Save Configuration
- [ ] Apply changes, ensure they persist across reboots.  

### 2.6 Verification
- [ ] From mini PC, ping router Pi at `10.0.10.1`.  
- [ ] From worker1, ping router Pi at `10.0.20.1`.  
- [ ] From mini PC, ping worker1 at `10.0.20.208` (should work if router forwards traffic).  
- [ ] If no ping cross‑VLAN, check router iptables rules.

---

## 3. Update Static IPs on All Devices

All devices must have static IPs matching the final scheme.  
**Note:** Changing IPs will break existing K3s cluster; plan for cluster rebuild after IP changes.

### 3.1 Mini PC (Debian)
- [ ] Edit `/etc/network/interfaces` or use netplan. Set static:
  ```yaml
  address 10.0.10.201/24
  gateway 10.0.10.1
  dns-nameservers 8.8.8.8
  ```
- [ ] Reboot or restart networking: `sudo systemctl restart networking`  

### 3.2 Ubuntu VM (Rancher)
- [ ] Edit `/etc/netplan/00-installer-config.yaml`
  ```yaml
  network:
    ethernets:
      enp0s3:
        addresses:
          - 10.0.10.214/24
        gateway4: 10.0.10.1
        nameservers:
          addresses: [8.8.8.8]
  ```
- [ ] Apply: `sudo netplan apply`  

### 3.3 Worker Pis (Raspberry Pi OS)
- [ ] Edit `/etc/dhcpcd.conf` and add at the end:
  ```
  interface eth0
  static ip_address=10.0.20.208/24   # change per Pi
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
  - Ping `10.0.10.214` (Ubuntu VM)  
  - Ping `10.0.20.208`, `10.0.20.207`, `10.0.20.202` (workers)  
- [ ] **From each worker**  
  - Ping `10.0.20.1` (router)  
  - Ping other workers  
  - Ping `10.0.10.201` (mini PC) – should succeed if router forwards.  

- [ ] **Document results** in the main checklist matrix.

---

Use this checklist to track progress. Mark items `[x]` as they are completed.
```
