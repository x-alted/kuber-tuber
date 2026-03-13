# Issues Log

| Date       | Issue Description | Affected Component | Resolution | Status |
|------------|-------------------|---------------------|------------|--------|
| 2026-02-18 | VLAN configuration not possible (no inter‑VLAN routing on switch) | NETGEAR GS305E | Decided not to use VLANs; all devices on same subnet. | Closed |
| 2026-02-18 | Mini PC static IP configuration failed initially | Mini PC (Debian) | Reconfigured `/etc/network/interfaces` with correct interface `enp1s0` and gateway. | Closed |
| 2026-02-20 | Switch web interface disappears when trying to change IP | NETGEAR GS305E | Workaround: temporarily added 192.168.0.x IP to Mini PC, changed switch IP to 10.0.0.2, then removed temp IP. | Closed |
| 2026-03-06 | Pis imaged with SSH keys but keys not working | Raspberry Pis | Re‑imaged Pis with password authentication enabled temporarily; key deployment postponed. | Open (planned) |
| 2026-03-06 | worker3 (192.168.2.202) SSH connection refused | worker3 Pi | Re‑imaged SD card with proper SSH enable and password. | Closed |
| 2026-03-13 | Nick unable to ping worker1 Tailscale IP | Tailscale on Nick's machine | Nick ran `sudo tailscale up` and re‑authenticated. | Closed |
| 2026-03-13 | `kubectl` on Ubuntu VM refuses connection (localhost:8080) | kubectl / kubeconfig | Copied kubeconfig from mini PC (`/etc/rancher/k3s/k3s.yaml`) and set `KUBECONFIG` environment variable. | Closed |
| 2026-03-13 | Rancher Helm install fails: "cannot re‑use a name that is still in use" | Helm release | Uninstalled existing release (`helm uninstall rancher -n cattle-system`) and deleted Helm secrets. | Closed |
| 2026-03-13 | Rancher Helm install stuck: "another operation is in progress" | Helm release | Manually deleted Helm release secrets (`kubectl get secrets -n cattle-system | grep helm` and `kubectl delete secret ...`). | Closed |
| 2026-03-13 | Rancher bootstrap password (`admin`) not working | Rancher | Retrieved actual password from Kubernetes secret: `kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword\|base64decode}}'`. | Closed |
| 2026-03-18 | Tailscale connectivity briefly dropped on worker1 | Tailscale | Restarted Tailscale on worker1 and re‑authenticated. | Closed |
| 2026-03-18 | SSH keys not yet deployed on Pis (still using passwords) | Raspberry Pis | Pending until LoRa integration stable. | Open |
| 2026-03-18 | Static IPs not yet configured (Pis on DHCP) | Raspberry Pis | Pending until LoRa integration stable. | Open |
| 2026-03-18 | LoRa HAT drivers and tests not yet completed | worker1 / LoRa HAT | In progress; basic send/receive tests ongoing. | Open |

**Notes:**
- All closed issues have been verified and resolved as of the date shown.
- Open issues are tracked in project milestones and will be addressed in upcoming weeks.
- For detailed troubleshooting steps, refer to relevant sections in `SERVICE-CONFIG.md` and weekly logs in `SETUP-CHECKLIST.md`.
