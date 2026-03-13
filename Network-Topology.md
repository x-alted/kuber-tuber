markdown
# Service Configuration

This file records the exact steps, commands, and configuration changes made for each service.

## K3s Cluster

### Master Node (Mini PC)

```bash
# Install K3s
curl -sfL https://get.k3s.io | sh -
# Check status
sudo k3s kubectl get nodes
# Get join token for workers
sudo cat /var/lib/rancher/k3s/server/node-token
Token: (redacted, stored in secure location)
```
Worker Nodes (Pis)
```bash
# On each worker (replace <master-ip> and <token>)
curl -sfL https://get.k3s.io | K3S_URL=https://<master-ip>:6443 K3S_TOKEN=<token> sh -
```
Rancher
Installation via Helm
```bash
# Add Helm repo
helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
kubectl create namespace cattle-system
```
# Install Rancher with self‑signed certificate (for now)
```bash
helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --set hostname=rancher.kuber-tuber.local \
  --set replicas=1 \
  --set bootstrapPassword=admin
```
Access: https://<mini-pc-ip>:30443 (or via Tailscale)

Dendrite (Matrix Server)
To be filled when installed.

LoRa Bridge (Python Service)
To be filled when developed by Anthony.

Location: /home/pi/lora-bridge/
Dependencies: pip install pymatrix-api pyserial (example)

Configuration file: config.yaml
```yaml
# Example config
lora:
  port: /dev/ttyS0
  baud: 115200
matrix:
  server: http://localhost:8008
  user: @lora-bridge:kuber-tuber
  password: securepassword
Tailscale
Installation````
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
Sharing a Device
Shared worker1 with Nick via Tailscale admin console → share link.

## Current IP Assignments (as of March 13, 2026)

| Device     | Local IP     | Tailscale IP      | Hostname  | Role                          |
|------------|--------------|-------------------|-----------|-------------------------------|
| Mini PC    | 192.168.2.201| (run `tailscale ip`)| master    | K3s master, Matrix server     |
| worker1    | 192.168.2.208| 100.93.189.34*    | worker1   | LoRa gateway, K3s worker      |
| worker2    | 192.168.2.207| not yet joined    | worker2   | K3s worker                    |
| worker3    | 192.168.2.202| not yet joined    | worker3   | K3s worker                    |
| Switch     | 10.0.0.2 (planned) | –               | –         | NETGEAR GS305E                |

*Tailscale IP for worker1 obtained after sharing; others will be added as they join the tailnet.*
