# Service Configuration Notes

Installation steps, configuration parameters, and customisation.

## K3s Cluster

### Master Node (Mini PC)
- **Installation date:** March 13, 2026
- **Command used:**
  ```bash
  curl -sfL https://get.k3s.io | sh -```

Node token location: /var/lib/rancher/k3s/server/node-token
Kubeconfig: /etc/rancher/k3s/k3s.yaml

Node token location: /var/lib/rancher/k3s/server/node-token

Kubeconfig: /etc/rancher/k3s/k3s.yaml

Worker Nodes (Pis)
Join command template:

bash
curl -sfL https://get.k3s.io | K3S_URL=https://<master-ip>:6443 K3S_TOKEN=<node-token> sh -
Worker1 joined: [date]

Worker2 joined: [date]

Worker3 joined: [date]

Labels (if applied)
kubectl label node worker1 hardware=pi role=worker

kubectl label node worker2 hardware=pi role=worker

kubectl label node worker3 hardware=pi role=worker

Rancher
Replace the existing Rancher section with this comprehensive version:

markdown
## Rancher

**Host:** Ubuntu 22.04 VM (192.168.2.214) running on VirtualBox.

### Installation Steps (March 13)

1. **Install Docker** (if not already present):
   ```bash
   sudo apt update && sudo apt install docker.io -y
   sudo systemctl enable --now docker
Install kubectl:

```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```
Install Helm:

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```
Add Rancher Helm repo and create namespace:
```bash
helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
kubectl create namespace cattle-system
Install Rancher with self‑signed certificate (temporary):
```
```bash
helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --set hostname=rancher.kuber-tuber.local \
  --set replicas=1 \
  --set bootstrapPassword=admin
Wait for Rancher pods to be ready:
```
```bash
kubectl get pods -n cattle-system -w
```
Access Rancher UI:

After pods are running, access at: https://192.168.2.214:30443

Accept the self‑signed certificate warning.

Log in with username admin and password admin (you will be prompted to change it).

Connect K3s cluster to Rancher:

On the mini PC (K3s master), copy the kubeconfig file:
```bash
sudo cat /etc/rancher/k3s/k3s.yaml
```
On the Rancher UI, click Import Existing and follow the instructions, providing the kubeconfig content.
Tailscale
Installed on: Mini PC, worker1, [others]

Install command: curl -fsSL https://tailscale.com/install.sh | sh

Auth key used: [one‑time key or login via browser]

Machine names in tailnet: master, worker1, etc.

Future Services (to be added)
WireGuard VPN

RBAC policies

Network policies in K3s

