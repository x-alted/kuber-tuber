# Issues Log

| Date       | Issue Description | Affected Component | Resolution | Status |
|------------|-------------------|---------------------|------------|--------|
| 2026-02-13 | VLAN configuration not possible (no inter‑VLAN routing on switch) | NETGEAR GS305E | Decided not to use VLANs; all devices on same subnet. | Closed |
| 2026-02-13 | Mini PC static IP configuration failed initially | Mini PC (Debian) | Reconfigured `/etc/network/interfaces` with correct interface `enp1s0` and gateway. | Closed |
| 2026-02-20 | Switch web interface disappears when trying to change IP | NETGEAR GS305E | Workaround: temporarily added 192.168.0.x IP to Mini PC, changed switch IP to 10.0.0.2, then removed temp IP. | Closed |
| 2026-03-06 | Pis imaged with SSH keys but keys not working | Raspberry Pis | Re‑imaged Pis with password authentication enabled temporarily; key deployment postponed. | Closed (planned) |
| 2026-03-06 | worker3 (192.168.2.202) SSH connection refused | worker3 Pi | Re‑imaged SD card with proper SSH enable and password. | Closed |
| 2026-03-13 | Nick unable to ping worker1 Tailscale IP | Tailscale on Nick's machine | Nick ran `sudo tailscale up` and re‑authenticated. | Closed |
| 2026-03-13 | `kubectl` on Ubuntu VM refuses connection (localhost:8080) | kubectl / kubeconfig | Copied kubeconfig from mini PC (`/etc/rancher/k3s/k3s.yaml`) and set `KUBECONFIG` environment variable. | Closed |
| 2026-03-13 | Rancher Helm install fails: "cannot re‑use a name that is still in use" | Helm release | Uninstalled existing release (`helm uninstall rancher -n cattle-system`) and deleted Helm secrets. | Closed |
| 2026-03-13 | Rancher Helm install stuck: "another operation is in progress" | Helm release | Manually deleted Helm release secrets (`kubectl get secrets -n cattle-system | grep helm` and `kubectl delete secret ...`). | Closed |
| 2026-03-13 | Rancher bootstrap password (`admin`) not working | Rancher | Retrieved actual password from Kubernetes secret: `kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword\|base64decode}}'`. | Closed |
| 2026-03-13 | Tailscale connectivity briefly dropped on worker1 | Tailscale | Restarted Tailscale on worker1 and re‑authenticated. | Closed |
| 2026-03-13 | SSH keys not yet deployed on Pis (still using passwords) | Raspberry Pis | Pending until LoRa integration stable. | Open |
| 2026-03-13 | Static IPs not yet configured (Pis on DHCP) | Raspberry Pis | Pending until LoRa integration stable. | Open |
| 2026-03-13 | LoRa HAT drivers and tests not yet completed | worker1 / LoRa HAT | In progress; basic send/receive tests ongoing. | Open |
| 2026-03-25 | `apt update` fails due to missing GPG key for fasttrack.debian.net | Mini PC (Debian) | Added missing key via `gpg --keyserver keyserver.ubuntu.com --recv-key 1FC324F50C00F13AE448A88CC47F8A8AAD743EF7` and exported to `/etc/apt/trusted.gpg.d/`. | Closed |
| 2026-03-25 | VirtualBox VM fails to start: "VT-x is being used by another hypervisor (KVM)" | VirtualBox on Mini PC | Unloaded KVM kernel modules (`sudo rmmod kvm_intel` and `sudo rmmod kvm`) before starting VM. | Closed |
| 2026-03-25 | Ubuntu VM password not documented; unable to SSH | Ubuntu VM | Reset password using live ISO and chroot (or GRUB recovery mode). New password set and documented securely. | Closed |
| 2026-03-25 | VNC connection to VM drops immediately ("connection dropped by server") | VRDE / TigerVNC | Workaround: used SSH X11 forwarding (`ssh -X`) and `VBoxManage startvm "Ubuntu server" --type separate` to get graphical console. VRDE not used further. | Closed |
| 2026-03-27 | K3s cluster IP range change required (from 192.168.2.x to 10.0.x.x) | K3s on all nodes | K3s does not easily allow node IP changes after initialisation. Re‑installed K3s on master and re‑joined all workers with new static IPs. | Closed |
| 2026-03-27 | VLAN trunk configuration on Router Pi (single physical port) | Router Pi (Raspberry Pi OS) | Used `systemd-networkd` with VLAN tagged interfaces (`eth0.1`, `eth0.10`, `eth0.20`). Configuration documented in `Service-Configuration.md`. | Closed |
| 2026-04-01 | Inter‑VLAN routing initially blocked by default iptables rules | Router Pi | Added explicit allow rules for required traffic (e.g., SSH from control plane to workers) and set default drop on forward chain. | Closed |

| 2026-04-08 | Cardputer upload port wrong (`/dev/ttyACM0` not found) | PlatformIO / Cardputer | Device enumerated as `/dev/ttyACM1`; updated `platformio.ini` `upload_port`. | Closed |
| 2026-04-08 | LoRa radio init fails with RadioLib error -2 (CHIP_NOT_FOUND) | Cardputer / CAP.KiRa-1262 | SPI pin mapping mismatch between firmware and physical cap. Tried HSPI→FSPI swap; pins still unconfirmed. Awaiting correct pinout from cap documentation. | Open |
| 2026-04-08 | Replay protection in `LoRa-Bridge.py` rejects first message (seq=0) | LoRa gateway (worker1) | `last_seq` initialised to `0`; `0 <= 0` caused seq=0 to be dropped. Fixed by initialising to `-1`. | Closed |
| 2026-04-08 | `decrypt_utils.py` minimum packet length check too lenient | LoRa gateway (worker1) | Checked `< 16` (IV only, no ciphertext); corrected to `< 17`. | Closed |
| 2026-04-08 | `receiver_service.yaml` misnamed — contains Python, not YAML | LoRa/kubernetes | Renamed to `receiver_service.py`; new proper K8s manifest created as `lora-receiver.yaml`. | Closed |
| 2026-04-08 | `kubectl apply` on worker1 fails (no kubeconfig) | worker1 / kubectl | kubectl not configured on worker nodes; must run from master (`debian-master`). | Closed |
| 2026-04-08 | `kubectl` broken after `sed` replaced `127.0.0.1` with `192.168.2.233` in kubeconfig | debian-master / kubeconfig | K3s API only binds to localhost on master; reverted sed with `sed -i 's/192.168.2.233/127.0.0.1/'`. | Closed |
| 2026-04-08 | `lora-receiver` pod in CrashLoopBackOff after new manifest applied | K8s / lora-demo namespace | `pip install flask` succeeded; pod stabilised and `/health` responding 200. Cause was prior stale deployment conflict; resolved after clean apply. | Closed |

**Notes:**
- All closed issues have been verified and resolved as of the date shown.
- Open issues are tracked in project milestones and will be addressed in upcoming weeks.
- For detailed troubleshooting steps, refer to relevant sections in `SERVICE-CONFIG.md` and weekly logs in `checklists/Setup-&-Testing-Checklist.md`.
