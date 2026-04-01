# Kubernetes & Cluster 

## 1. K3s Cluster Rebuild

**Prerequisites:** All nodes have new static IPs per final scheme (see Networking section).  
**Master node:** Mini PC (`10.0.10.201`)  
**Worker nodes:** Ubuntu VM (`10.0.10.214`), worker1 (`10.0.20.208`), worker2 (`10.0.20.207`), worker3 (`10.0.20.202`)

### 1.1 Uninstall Old K3s
- [ ] **On master (Mini PC):**  
  ```bash
  sudo /usr/local/bin/k3s-uninstall.sh
  ```
- [ ] **On each worker node:**  
  ```bash
  sudo /usr/local/bin/k3s-agent-uninstall.sh
  ```
- [ ] Verify removal: `kubectl` commands no longer work (if previously configured).

### 1.2 Install K3s on Master
- [ ] On Mini PC, run:
  ```bash
  curl -sfL https://get.k3s.io | sh -
  ```
- [ ] Wait for installation to complete. Check service status:
  ```bash
  sudo systemctl status k3s
  ```
- [ ] Obtain node token for workers:
  ```bash
  sudo cat /var/lib/rancher/k3s/server/node-token
  ```
  Copy token to a secure location.

### 1.3 Join Worker Nodes
- [ ] **On each worker node** (Ubuntu VM, worker1, worker2, worker3), run:
  ```bash
  curl -sfL https://get.k3s.io | K3S_URL=https://10.0.10.201:6443 K3S_TOKEN=<token> sh -
  ```
  Replace `<token>` with the token from master.
- [ ] Wait for each node to join.

### 1.4 Verify Cluster Health
- [ ] On master, run:
  ```bash
  sudo kubectl get nodes -o wide
  ```
  Expected: all nodes listed with `Ready` status and correct IP addresses.
- [ ] Check pods in all namespaces:
  ```bash
  sudo kubectl get pods --all-namespaces
  ```
  CoreDNS and other system pods should be running.

---

## 2. Rancher Re‑configuration

**Prerequisites:** Ubuntu VM IP set to `10.0.10.214`, kubectl configured to point to new cluster.

### 2.1 Update Ubuntu VM IP
- [ ] Already done in networking section. Confirm with `ip a`.

### 2.2 Copy Kubeconfig to Ubuntu VM
- [ ] On master, copy kubeconfig:
  ```bash
  scp /etc/rancher/k3s/k3s.yaml user@10.0.10.214:~/
  ```
- [ ] On Ubuntu VM, edit `~/k3s.yaml` and change `server: https://127.0.0.1:6443` to `server: https://10.0.10.201:6443`.
- [ ] Set environment variable:
  ```bash
  echo "export KUBECONFIG=~/k3s.yaml" >> ~/.bashrc
  source ~/.bashrc
  ```
- [ ] Test: `kubectl get nodes` should list all nodes.

### 2.3 Install cert-manager (if not already present)
- [ ] Add Helm repo and install (if needed):
  ```bash
  helm repo add jetstack https://charts.jetstack.io
  helm repo update
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.crds.yaml
  helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --version v1.14.4
  ```
- [ ] Verify pods are running:
  ```bash
  kubectl get pods -n cert-manager
  ```

### 2.4 Install Rancher (or Re-import Cluster)
- [ ] Add Rancher Helm repo:
  ```bash
  helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
  helm repo update
  ```
- [ ] Install Rancher (if not already installed or if IP changed):
  ```bash
  helm install rancher rancher-latest/rancher \
    --namespace cattle-system \
    --create-namespace \
    --set hostname=rancher.kuber-tuber.local \
    --set replicas=1 \
    --set bootstrapPassword=admin
  ```
  If a previous release exists, uninstall first:  
  `helm uninstall rancher -n cattle-system`
- [ ] Wait for rollout:
  ```bash
  kubectl -n cattle-system rollout status deploy/rancher
  ```
- [ ] Get NodePort:
  ```bash
  kubectl get svc -n cattle-system rancher
  ```
  Note the NodePort (e.g., 30443).

### 2.5 Access Rancher UI
- [ ] In browser, go to `https://10.0.10.214:<NodePort>`.
- [ ] Accept self-signed certificate warning.
- [ ] Log in with username `admin` and password from bootstrap secret:
  ```bash
  kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword|base64decode}}'
  ```
- [ ] If prompted, change password.
- [ ] Verify cluster is imported: Rancher dashboard shows the cluster with nodes.

---

## 3. Kubernetes Receiver Service

**Goal:** Deploy a simple HTTP endpoint inside the cluster to receive messages from the LoRa bridge.

### 3.1 Create Namespace (optional)
- [ ] Create a namespace for the demo app:
  ```bash
  kubectl create namespace lora-demo
  ```

### 3.2 Deploy Receiver Pod
- [ ] Create a deployment YAML (`receiver-deployment.yaml`):
  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: lora-receiver
    namespace: lora-demo
  spec:
    replicas: 1
    selector:
      matchLabels:
        app: lora-receiver
    template:
      metadata:
        labels:
          app: lora-receiver
      spec:
        containers:
        - name: receiver
          image: nginx:alpine   # Replace with actual receiver image if custom
          command: ["/bin/sh", "-c"]
          args: ["echo 'LoRa receiver ready' && tail -f /dev/null"]
          ports:
          - containerPort: 8080
  ```
- [ ] Apply: `kubectl apply -f receiver-deployment.yaml`

### 3.3 Expose as a Service
- [ ] Create a service YAML (`receiver-service.yaml`):
  ```yaml
  apiVersion: v1
  kind: Service
  metadata:
    name: lora-receiver
    namespace: lora-demo
  spec:
    selector:
      app: lora-receiver
    ports:
      - port: 8080
        targetPort: 8080
  ```
- [ ] Apply: `kubectl apply -f receiver-service.yaml`
- [ ] Verify service:
  ```bash
  kubectl get svc -n lora-demo
  ```

### 3.4 (Optional) Install a Simple HTTP Echo Server
If you want a real HTTP endpoint that logs POST data, use a simple Python HTTP server or a pre‑built image like `hashicorp/http-echo`. Example:
  ```bash
  kubectl run http-echo --image=hashicorp/http-echo --port=8080 -- -listen=:8080 -text="LoRa message received"
  kubectl expose pod http-echo --port=8080 --name=lora-receiver
  ```

### 3.5 Test Service from Inside Cluster
- [ ] Run a temporary pod to test connectivity:
  ```bash
  kubectl run test-pod --image=curlimages/curl -it --rm --restart=Never -- curl http://lora-receiver.lora-demo.svc.cluster.local:8080
  ```
  Should return expected response (e.g., "LoRa message received").

---

## 4. Resilience Testing

**Goal:** Demonstrate that the cluster tolerates node failures.

### 4.1 Deploy a Test Application
- [ ] Create a deployment with `replicas=2`:
  ```bash
  kubectl create deployment nginx-test --image=nginx --replicas=2
  ```
- [ ] Verify pods are running and spread across nodes:
  ```bash
  kubectl get pods -o wide
  ```

### 4.2 Simulate Worker Node Failure
- [ ] Choose one worker node (e.g., worker2). Physically power it off or halt it.
- [ ] Wait ~30 seconds.
- [ ] Run `kubectl get pods -o wide` again.
- [ ] **Expected:** The pods that were on the failed node are rescheduled to other nodes within a few minutes. No pods remain in `Pending` or `Terminating` indefinitely.

### 4.3 Simulate Master Node Reboot
- [ ] Reboot the master node (Mini PC):
  ```bash
  sudo reboot
  ```
- [ ] After reboot, wait for the node to rejoin.
- [ ] Run `kubectl get nodes` on the master (after SSH back in).
- [ ] **Expected:** All nodes show `Ready` within a minute or two. All workloads resume.

### 4.4 Clean Up Test Resources
- [ ] Delete the test deployment:
  ```bash
  kubectl delete deployment nginx-test
  ```

---

## 5. Final Verification

- [ ] All nodes in `kubectl get nodes` are `Ready`.
- [ ] Rancher UI accessible and shows the cluster.
- [ ] Receiver service responds to HTTP requests.
- [ ] Resilience tests passed and documented.

---

Use this checklist to track progress. Mark items `[x]` as they are completed.
```
