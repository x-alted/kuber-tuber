# Service Configuration Notes

Installation steps, configuration parameters, and customisation.

## K3s Cluster

### Master Node (Mini PC – `debian-master`)
- **Hostname:** debian-master
- **IP Address:** 192.168.2.201
- **Installation date:** March 13, 2026
- **Command used:**
  ```bash
  curl -sfL https://get.k3s.io | sh -
Node token location: /var/lib/rancher/k3s/server/node-token

Kubeconfig: /etc/rancher/k3s/k3s.yaml

Worker Nodes (Pis + Ubuntu VM)
All workers joined using the same template:

bash
curl -sfL https://get.k3s.io | K3S_URL=https://192.168.2.201:6443 K3S_TOKEN=<node-token> sh -
Worker Join Dates
Node	IP Address	Join Date
kuberserver	192.168.2.214	March 13
worker1	192.168.2.208	March 13
worker2	192.168.2.207	March 13
worker3	192.168.2.202	March 18
Node Labels (applied for organisation)
bash
kubectl label node worker1 hardware=pi role=worker lora-host=true
kubectl label node worker2 hardware=pi role=worker
kubectl label node worker3 hardware=pi role=worker
kubectl label node kuberserver hardware=vm role=worker
Rancher
Host: Ubuntu 22.04 VM (192.168.2.214) running on VirtualBox (bridged network).
Role: K3s worker node and Rancher management server.

Installation Steps (March 13–18, 2026)
Install Docker (if not already present):

bash
sudo apt update && sudo apt install docker.io -y
sudo systemctl enable --now docker
Install kubectl:

bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
Install Helm:

bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
Copy kubeconfig from mini PC:

bash
scp user@192.168.2.201:/etc/rancher/k3s/k3s.yaml ~/k3s.yaml
Edit the file and change server: https://127.0.0.1:6443 to server: https://192.168.2.201:6443.
Then set environment variable:

bash
export KUBECONFIG=~/k3s.yaml
echo 'export KUBECONFIG=~/k3s.yaml' >> ~/.bashrc
Install cert-manager CRDs:

bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.crds.yaml
Add cert-manager Helm repo and install:

bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace --version v1.14.4
Verify cert-manager pods:

bash
kubectl get pods -n cert-manager -w
kubectl rollout status deployment -n cert-manager cert-manager
Add Rancher Helm repo:

bash
helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
helm repo update
Install Rancher (if clean install; if re‑installing, first uninstall and delete secrets):

bash
helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.kuber-tuber.local \
  --set replicas=1 \
  --set bootstrapPassword=admin
If stuck or name in use, clean up with:

bash
helm uninstall rancher -n cattle-system
kubectl delete secrets -n cattle-system -l owner=helm
Wait for Rancher to roll out:

bash
kubectl -n cattle-system rollout status deploy/rancher
Get Rancher service NodePort:

bash
kubectl get svc -n cattle-system rancher
Expected output: 443:30443/TCP (or similar high port).

Access Rancher UI:

URL: https://192.168.2.214:30443

Accept self‑signed certificate warning.

Login: username admin.
If admin password doesn’t work, retrieve it from Kubernetes secret:

bash
kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword|base64decode}}'
Or, if the user already exists (e.g., user-95z65), get its password:

bash
kubectl get secret -n cattle-system user-95z65 -o jsonpath='{.data.password}' | base64 -d
Import existing K3s cluster:

In Rancher UI, click Import Existing, name cluster (e.g., k3s-cluster).

Run the provided kubectl command on the Ubuntu VM (where kubectl is already configured). This installs the Rancher agent.

After a few minutes, cluster appears as active in the dashboard.

Rancher Internal Service IP
Cluster IP: 10.43.143.192 (used for internal cluster communication; UI accessible via NodePort as above)

Tailscale (Temporary Remote Access)
Tailscale was used briefly to allow Nick to access worker1 remotely. It is no longer required for ongoing work but the configuration is documented for reference.

Installed on: mini PC, worker1
Installation command:

bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
Authentication: Via browser (team members logged in with their own accounts).
Sharing: worker1 shared with Nick via Tailscale admin console → share link.
Tailscale IPs (historical):

worker1: 100.93.189.34

mini PC: dynamically assigned, not recorded

Decommissioning note: Tailscale is not actively used; workers can be removed from tailnet if desired.

NETGEAR GS305E Switch Configuration
IP Address: 192.168.2.204 (management IP; set via web interface)

VLANs: Not used (all devices on default VLAN 1; no inter‑VLAN routing needed)

Physical connections:

Port 1: Mini PC (192.168.2.201)

Port 2: Ubuntu VM (192.168.2.214)

Port 3: worker1 (192.168.2.208)

Port 4: worker2 (192.168.2.207)

Port 5: worker3 (192.168.2.202) – connected later

Access: Web interface at http://192.168.2.204 (login: blank / password – changed to project password, stored securely)

LoRa Integration (In Progress)
LoRa HAT on worker1
Hardware: Waveshare SX1262

SPI enabled: dtparam=spi=on in /boot/config.txt

Python environment: /home/pi/lora-test (virtual environment)

Dependencies: pip install spidev RPi.GPIO (basic), rpi-lora pending compatibility

Current status: Basic send/receive tests ongoing; driver verification in progress.

Next: Bridge to Matrix (see below).

Cardputer (Field Node)
Device: M5Stack Cardputer ADV + LoRa Cap 868

Frequency: 868 MHz (will be set to 915 MHz for region)

Role: Mobile client with GPS, keyboard, screen; communicates with worker1 over LoRa.

Development: Pending completion of LoRa HAT driver and bridge.

LoRa-Matrix Bridge (Planned)
Language: Python

Function: Receive LoRa packets on worker1, forward to Dendrite (Matrix) server.

Repository location: (to be created)

Owner: Anthony (with Nick/Alex assisting)

Encryption: Basic payload encryption to be added by Nathan.

Future Services (Planned)
Service	Purpose	Target Week
Dendrite (Matrix)	Decentralised chat server	Week 4
LoRa-Matrix Bridge	Connect LoRa messages to Matrix	Week 4
WireGuard VPN	Secure remote access (alternative to Tailscale)	Week 4
RBAC Policies	Kubernetes security	Week 4
Network Policies	Pod isolation	Week 4
3‑tier app deployment	Demo application on K3s	Week 6
Last updated: March 18, 2026
Maintained by: Alex (documentation lead)
