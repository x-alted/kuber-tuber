# Service Configuration Notes

**Last updated:** April 8, 2026  
**Maintained by:** Alex (documentation lead)

> **Note:** The cluster was fully rebuilt on 2026-03-27 after migrating from `192.168.2.x` to the VLAN-segmented `10.0.x.x` address space. Sections below marked **(Historical)** document the original setup for reference. Current IP assignments are in `networking/Network-Topology.md`.

Installation steps, configuration parameters, and customisation for the Kuber-Tuber project.

---

## K3s Cluster

### Master Node (Mini PC – `debian-master`) — Current

- **Hostname:** debian-master  
- **IP Address:** `10.0.10.94` (VLAN 10)
- **Rebuild date:** March 27, 2026 (after IP migration)
- **Command used:**

```bash
curl -sfL https://get.k3s.io | sh -
```

- **Node token location:** `/var/lib/rancher/k3s/server/node-token`  
- **Kubeconfig:** `/etc/rancher/k3s/k3s.yaml`

### Worker Nodes — Current

All workers joined using:
```bash
curl -sfL https://get.k3s.io | K3S_URL=https://10.0.10.94:6443 K3S_TOKEN=<node-token> sh -
```

| Node    | IP Address    | VLAN | Role                    | Join Date   |
|---------|---------------|------|-------------------------|-------------|
| worker1 | 10.0.20.138   | 20   | Worker + LoRa gateway   | March 27    |
| worker2 | 10.0.20.150   | 20   | Worker                  | March 27    |
| worker3 | 10.0.20.63    | 20   | Worker                  | March 27    |

> The Ubuntu VM (`kuberserver`, formerly `10.0.10.94`) was removed from the cluster during the rebuild and is no longer a node.

#### Node Labels
```bash
kubectl label node worker1 hardware=pi role=worker lora-host=true
kubectl label node worker2 hardware=pi role=worker
kubectl label node worker3 hardware=pi role=worker
```
---

## Rancher

- **Host:** Runs as a Helm deployment on the K3s cluster (pods on worker nodes). Access via NodePort on the master.
- **URL:** `https://10.0.10.94:30443`
- **Role:** Cluster management UI.

### Installation Steps (March 13, 2026)

| Step | Action | Command / Details | Verification |
|------|--------|-------------------|--------------|
| 1 | Install Docker | `sudo apt update && sudo apt install docker.io -y`<br>`sudo systemctl enable --now docker` | `sudo systemctl status docker` |
| 2 | Install kubectl | `curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"`<br>`chmod +x kubectl && sudo mv kubectl /usr/local/bin/` | `kubectl version --client` |
| 3 | Install Helm | `curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 bash` | `helm version` |
| 4 | Copy kubeconfig from mini PC | `scp user@10.0.10.94:/etc/rancher/k3s/k3s.yaml ~/k3s.yaml`<br>Edit file: change `server: https://127.0.0.1:6443` to `server: https://10.0.10.94:6443`<br>Set env: `export KUBECONFIG=~/k3s.yaml` (add to `~/.bashrc`) | `kubectl get nodes` lists all nodes |
| 5 | Install cert-manager CRDs | `kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.crds.yaml` | No errors |
| 6 | Add cert-manager Helm repo | `helm repo add jetstack https://charts.jetstack.io`<br>`helm repo update` | Repo added |
| 7 | Install cert-manager | `helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --version v1.14.4` | `kubectl get pods -n cert-manager -w` (all running) |
| 8 | Add Rancher Helm repo | `helm repo add rancher-latest https://releases.rancher.com/server-charts/latest`<br>`helm repo update` | Repo added |
| 9 | Install Rancher | `helm install rancher rancher-latest/rancher --namespace cattle-system --create-namespace --set hostname=rancher.kuber-tuber.local --set replicas=1 --set bootstrapPassword=admin` | If name in use, clean up: `helm uninstall rancher -n cattle-system` and `kubectl delete secrets -n cattle-system -l owner=helm` |
| 10 | Wait for Rancher rollout | `kubectl -n cattle-system rollout status deploy/rancher` | Success message |
| 11 | Get Rancher service NodePort | `kubectl get svc -n cattle-system rancher` | Shows e.g. `443:30443/TCP` |
| 12 | Access Rancher UI | `https://10.0.10.94:<NodePort>` | Login page loads |
| 13 | Retrieve admin password (if needed) | `kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword\|base64decode}}'`<br>Or for existing user: `kubectl get secret -n cattle-system user-95z65 -o jsonpath='{.data.password}' \| base64 -d` | Password displayed |
| 14 | Log in to Rancher | Username `admin`, password from above | Dashboard accessible |
| 15 | Import existing K3s cluster | In UI: **Import Existing** → name cluster (e.g. `k3s-cluster`) → run provided `kubectl` command on Ubuntu VM | Cluster appears active after a few minutes |

### Rancher Internal Service IP

- **Cluster IP:** `10.43.143.192` (used for internal cluster communication; UI accessible via NodePort as above)

---

## Tailscale (Temporary Remote Access)

Tailscale was used briefly to allow Nick to access `worker1` remotely. It is no longer required for ongoing work but the configuration is documented for reference.

- **Installed on:** mini PC, `worker1`
- **Installation command:**
```markdown
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
- **Authentication:** Via browser (team members logged in with their own accounts).
- **Sharing:** `worker1` shared with Nick via Tailscale admin console → share link.
- **Tailscale IPs (historical):**
  - `worker1`: `100.93.189.34`
  - mini PC: dynamically assigned, not recorded
- **Decommissioning note:** Tailscale is not actively used; workers can be removed from tailnet if desired.

---

## NETGEAR GS305E Switch Configuration

- **IP Address:** `10.0.1.58` (management IP; set via web interface)
- **VLANs:** 802.1Q VLANs configured — VLAN 10 (control plane), VLAN 20 (workers). See `networking/Network-Topology.md` for full VLAN and port assignments.
- **Physical connections (current):**
  - Port 1: Router Pi (trunk — tagged VLANs 10 & 20)
  - Port 2: Mini PC `debian-master` (access — untagged VLAN 10)
  - Port 3: `worker1` (access — untagged VLAN 20)
  - Port 4: `worker2` (access — untagged VLAN 20)
  - Port 5: `worker3` (access — untagged VLAN 20)
- **Access:** Web interface at `http://10.0.1.58` (login: stored securely)

---

## LoRa Integration

### LoRa HAT on `worker1` (`10.0.20.138`)

- **Hardware:** Waveshare E22-900T22S (SX1262, 868 MHz); communicates via UART at `/dev/ttyAMA0`, 9600 baud.
- **Bridge script:** `LoRa/gateway/LoRa-Bridge.py` — run as systemd service `lora-bridge.service`.
- **Dependencies:** `pip install pyserial pycryptodome requests` (see `LoRa/gateway/requirements.txt`).
- **Bridge script path on device:** `/home/pi/lora-bridge/LoRa-Bridge.py` (or per deployment location).
- **Logs:** `journalctl -u lora-bridge -f`

### Cluster DNS Configuration on worker1 (required for bridge)

The `lora-bridge.service` connects directly to `http://lora-receiver.lora-demo.svc.cluster.local:8080/api/v1/messages`.
Because the bridge runs as a **host systemd service** (not inside a pod), worker1 must be able to resolve `*.cluster.local` DNS names via CoreDNS.

**Step 1 - Find the CoreDNS service IP:**
```bash
kubectl get svc -n kube-system kube-dns -o jsonpath='{.spec.clusterIP}'
# Typically: 10.43.0.10
```

**Step 2 - Configure systemd-resolved on worker1 to forward cluster DNS:**
```bash
COREDNS_IP=$(kubectl get svc -n kube-system kube-dns -o jsonpath='{.spec.clusterIP}')

sudo mkdir -p /etc/systemd/resolved.conf.d/

cat << CONF | sudo tee /etc/systemd/resolved.conf.d/k3s-cluster-dns.conf
[Resolve]
DNS=${COREDNS_IP}
Domains=~cluster.local ~svc.cluster.local
CONF

sudo systemctl restart systemd-resolved
```

**Step 3 - Verify resolution from worker1:**
```bash
resolvectl query lora-receiver.lora-demo.svc.cluster.local
# Should return the ClusterIP of the lora-receiver service
```

**Step 4 - Enable and start the bridge service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable lora-bridge
sudo systemctl start lora-bridge
journalctl -u lora-bridge -f
```

> The `kubectl-portforward-lora.service` is no longer used and has been removed. Do **not** run a port-forward; the bridge connects directly via cluster DNS.


### AES-256 Encryption Key — Kubernetes Secret

The bridge script retrieves the key from a Kubernetes secret at startup. Create it once after the cluster is running:

```bash
# Create the lora-demo namespace if it does not exist yet
kubectl create namespace lora-demo --dry-run=client -o yaml | kubectl apply -f -

# Generate a random 32-byte key and store it as a secret
kubectl create secret generic lora-encryption-key \
  --namespace lora-demo \
  --from-literal=key="$(openssl rand -base64 32)"

# Confirm it was created
kubectl get secret lora-encryption-key -n lora-demo
```

> **Cardputer key sync:** The same key must be compiled into the Cardputer firmware.  
> Retrieve the raw hex bytes to copy into `src/main.cpp`:
> ```bash
> kubectl get secret lora-encryption-key -n lora-demo \
>   -o jsonpath='{.data.key}' | base64 -d | xxd -i
> ```
> Replace the `aes_key[32]` array in the firmware with the output, then reflash the Cardputer.



### Cardputer ADV (Field Node)

- **Device:** M5Stack Cardputer ADV + CAP.KiRa-1262 LoRa cap
- **Firmware:** C++ via PlatformIO — see `LoRa/cardputer/src/main.cpp` and `LoRa/cardputer/platformio.ini`.
- **Frequency:** 868 MHz.
- **Encryption:** AES-256-CBC with PKCS#7 padding; IV prepended; sequence counter in NVS.
- **Pin mapping (CAP.KiRa-1262 LoRa cap):** RST=GPIO3, BUSY=GPIO6, DIO1=GPIO4. See `LoRa/cardputer/Cardputer-Flashing-Guide.md` §6.2 for the full pin definitions.
