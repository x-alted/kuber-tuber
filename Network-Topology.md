## Current IP Assignments (as of March 13, 2026)

| Device        | Local IP     | Tailscale IP      | Hostname     | Role                               |
|---------------|--------------|-------------------|--------------|------------------------------------|
| Mini PC       | 192.168.2.201| (run `tailscale ip`)| master       | K3s master, Matrix server          |
| worker1       | 192.168.2.208| 100.93.189.34*    | worker1      | LoRa gateway, K3s worker           |
| worker2       | 192.168.2.207| not yet joined    | worker2      | K3s worker                         |
| worker3       | 192.168.2.202| not yet joined    | worker3      | K3s worker                         |
| Ubuntu VM     | 192.168.2.214| not yet joined    | rancher-vm   | Rancher server (VirtualBox)        |
| Switch        | 192.168.2.204| –                 | –            | NETGEAR GS305E                      |

*Tailscale IP for worker1 obtained after sharing; others will be added as they join the tailnet.*
