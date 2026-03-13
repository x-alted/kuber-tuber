# Network Topology

## Physical Connections
- **Switch:** NETGEAR GS305E (ports 1‑4 used)
- **Mini PC** (K3s master) → port 1
- **Pi #1** (worker1, LoRa host) → port 2
- **Pi #2** (worker2) → port 3
- **Pi #3** (worker3) → port 4
- Port 5 reserved/spare

## IP Addressing

### Local Network 
| Device   | Hostname  | Local IP     | MAC Address       |
|----------|-----------|--------------|-------------------|
| Mini PC  | master    | 192.168.2.201| `xx:xx:xx:xx:xx`  |
| Pi #1    | worker1   | 192.168.2.208| `xx:xx:xx:xx:xx`  |
| Pi #2    | worker2   | 192.168.2.207| `xx:xx:xx:xx:xx`  |
| Pi #3    | worker3   | 192.168.2.202| `xx:xx:xx:xx:xx`  |

### Planned Static IPs 
| Device   | Static IP    | Subnet          | Gateway   |
|----------|--------------|-----------------|-----------|
| Mini PC  | 10.0.0.10/24 | 255.255.255.0   | 10.0.0.1  |
| Pi #1    | 10.0.0.11/24 | 255.255.255.0   | 10.0.0.1  |
| Pi #2    | 10.0.0.12/24 | 255.255.255.0   | 10.0.0.1  |
| Pi #3    | 10.0.0.13/24 | 255.255.255.0   | 10.0.0.1  |

### Tailscale IPs 
| Device   | Tailscale IP  | Machine Name in Tailnet |
|----------|---------------|-------------------------|
| Mini PC  | 100.x.x.x     | master                  |
| Pi #1    | 100.x.x.x     | worker1                 |

## VLAN Configuration
- VLANs are **not used**
- All devices are on the same broadcast domain.

## Routing & Firewall
- Mini PC has UFW enabled: default deny incoming, allow SSH (port 22).
- Pi’s have no firewall yet 
- No inter‑VLAN routing needed.
