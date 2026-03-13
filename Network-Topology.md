## Current IP Assignments (as of March 13, 2026)

| Device          | Local IP     | Hostname       | Role                               |
|-----------------|--------------|----------------|------------------------------------|
| Mini PC         | 192.168.2.201| debian-master  | K3s master (Control Plane)         |
| Ubuntu VM       | 192.168.2.214| kuberserver    | K3s worker & Rancher host          |
| worker1         | 192.168.2.208| worker1        | K3s worker, **LoRa host**          |
| worker2         | 192.168.2.207| worker2        | K3s worker                         |
| worker3         | 192.168.2.202| worker3        | K3s worker                         |
| Switch          | 192.168.2.204 | –         | NETGEAR GS305E                     |

**Rancher internal service IP:** `10.43.143.192` (accessible within cluster; for UI use `https://192.168.2.214:30443`)
