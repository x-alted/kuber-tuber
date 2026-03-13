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
Installed via Helm on March 13, 2026

Helm repo added:

bash
helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
Install command:

bash
helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.10.0.0.10.sslip.io \
  --set bootstrapPassword=admin \
  --set replicas=1
Access URL: https://<tailscale-ip>:30443 (or via sslip.io domain)

TLS: Self‑signed certificate (for now)

Dendrite (Matrix Server)
Status: Not yet installed

Planned installation: Week of March 20

Database: SQLite (simplicity)

Configuration file location: /etc/dendrite/dendrite.yaml

LoRa‑Matrix Bridge (Python service on Pi #1)
Repository: [link to GitHub repo if applicable]

Dependencies: pip install pyserial requests

Configuration file: bridge_config.json with fields:

json
{
  "lora_port": "/dev/ttyS0",
  "baud_rate": 115200,
  "matrix_homeserver": "http://dendrite.local:8008",
  "matrix_user": "@lora_bridge:yourdomain",
  "matrix_password": "********"
}
Startup: Managed via systemd unit file (see systemd/ folder)

Tailscale
Installed on: Mini PC, worker1, [others]

Install command: curl -fsSL https://tailscale.com/install.sh | sh

Auth key used: [one‑time key or login via browser]

Machine names in tailnet: master, worker1, etc.

Future Services (to be added)
WireGuard VPN

RBAC policies

Network policies in K3s

text

