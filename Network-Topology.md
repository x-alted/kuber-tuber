## Current IP Assignments (as of March 13, 2026)

| Device          | Local IP     | Hostname       | Role                               |
|-----------------|--------------|----------------|------------------------------------|
| Mini PC         | 10.0.10.94   | debian-master  | K3s master (Control Plane)         |
|                 | 10.0.10.93   |                | Dynamic secondary                  |
| worker1         | 10.0.20.138  | worker1        | K3s worker, **LoRa host**          |
| worker2         | 10.0.20.150  | worker2        | K3s worker                         |
| worker3         | 10.0.20.63   | worker3        | K3s worker                         |
| Switch          | 10.0.10.58   | GS305E         | NETGEAR GS305E                     |

                        **Might not use the Ubuntu server vm**
| Ubuntu VM       | 192.168.2.214| kuberserver    | K3s worker & Rancher host          |

**Rancher internal service IP:** `10.43.143.192` (accessible within cluster; for UI use `https://192.168.2.214:30443`)

**still need to change the rancher internal Service IP as a re-install is required** 
                              **This is not final**
