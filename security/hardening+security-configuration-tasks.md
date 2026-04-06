# Hardening & Security 

---

## 1. Host Hardening (All Nodes)

### 1.1 Operating System Updates
- [ ] All nodes (Mini PC, Ubuntu VM, router Pi, worker Pis) are fully updated:
  ```bash
  sudo apt update && sudo apt upgrade -y
  sudo reboot
  ```

### 1.2 SSH Security
- [ ] **SSH key authentication only** (already in plan):
  - Generate a team SSH key (Ed25519).
  - Copy public key to `~/.ssh/authorized_keys` on all nodes.
  - Disable password authentication in `/etc/ssh/sshd_config`:
    ```
    PasswordAuthentication no
    PermitRootLogin no
    ```
  - Restart sshd: `sudo systemctl restart sshd`
- [ ] **Fail2ban** installed and configured to protect against brute‑force attempts:
  ```bash
  sudo apt install fail2ban -y
  sudo systemctl enable fail2ban
  sudo systemctl start fail2ban
  ```

### 1.3 Firewall (UFW or iptables)
- [ ] **Router Pi** (already planned):
  - Allow SSH only from management network (e.g., 10.0.10.0/24).
  - Allow inter‑VLAN forwarding (iptables rules already set).
  - Block all other incoming traffic.
- [ ] **Other nodes**:
  - Default deny incoming, allow SSH (and Kubernetes ports if needed).
  - For master node, allow ports 6443 (K3s API) and 22.
  - For worker nodes, allow only necessary ports (e.g., 22, 10250 for kubelet).
  - Save rules persistently.

### 1.4 Disable Unnecessary Services
- [ ] Disable Bluetooth, Wi‑Fi, and other unused services on Pis:
  ```bash
  sudo systemctl disable bluetooth
  sudo systemctl disable wpa_supplicant  # if not using Wi‑Fi
  ```
- [ ] Remove unnecessary packages: `sudo apt purge --auto-remove <package>`

### 1.5 Logging & Monitoring
- [ ] Enable `auditd` for system auditing:
  ```bash
  sudo apt install auditd -y
  sudo systemctl enable auditd
  sudo systemctl start auditd
  ```
- [ ] Configure `rsyslog` to forward logs to a central server (optional). At minimum, ensure logs are retained and rotated.

---

## 2. Network Security

### 2.1 VLAN Isolation (Completed)
- [ ] VLANs 10 (control/management) and 20 (worker) are in place.
- [ ] Inter‑VLAN routing allowed only through router Pi with controlled iptables rules.

### 2.2 Firewall Rules on Router Pi
- [ ] In addition to forwarding rules, implement **stateful inspection**:
  ```bash
  sudo iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT
  ```
- [ ] Log dropped packets for monitoring:
  ```bash
  sudo iptables -A FORWARD -j LOG --log-prefix "FW-DROP: "
  ```
- [ ] Ensure default FORWARD policy is DROP.

### 2.3 Intrusion Detection / Prevention (Optional but Recommended)
- [ ] Install and configure `snort` or `suricata` on the router Pi to monitor traffic between VLANs:
  ```bash
  sudo apt install snort -y
  ```
  - Configure network interfaces to listen in promiscuous mode.
  - Test with known signatures (e.g., ping sweep detection).

### 2.4 Network Isolation for Kubernetes Pods
- [ ] **Network Policies** (implement in K8s section) will restrict pod‑to‑pod communication.

---

## 3. Kubernetes Security

### 3.1 K3s Hardening
- [ ] Ensure K3s is installed with security options:
  - `--tls-san` to include the master IP in certificates (already done).
  - (Optional) Use `--disable-agent` on master if not running workloads.
  - Verify that the kubeconfig file permissions are `600` and stored securely.

### 3.2 RBAC (Role‑Based Access Control)
- [ ] Create **namespaces** for isolation: `lora-demo`, `monitoring`, etc.
- [ ] Define **roles** and **role bindings** for team members with least privilege:
  - Example: `lora-admin` role with permissions only in `lora-demo` namespace.
  - Apply bindings to user groups or service accounts.
- [ ] Verify that default service accounts have minimal permissions.

### 3.3 Service Accounts & Secrets
- [ ] Replace default service accounts in each namespace with custom ones.
- [ ] For the LoRa bridge, create a service account with permissions to read the encryption secret.
- [ ] Mount the secret as an environment variable or volume (avoid writing to logs).
- [ ] Ensure secrets are encrypted at rest (K3s defaults to using AES‑GCM for etcd).

### 3.4 Pod Security Standards
- [ ] Apply PodSecurity admission controller (if enabled in K3s) or use OPA/Gatekeeper.
  - For K3s, create a `PodSecurity` configuration (v1.25+).
  - Enforce **baseline** or **restricted** policies for production namespaces.
- [ ] Example: label namespace `lora-demo` with `pod-security.kubernetes.io/enforce=baseline`

### 3.5 Network Policies
- [ ] Implement network policies to restrict pod communication:
  ```yaml
  apiVersion: networking.k8s.io/v1
  kind: NetworkPolicy
  metadata:
    name: deny-all
    namespace: lora-demo
  spec:
    podSelector: {}
    policyTypes:
    - Ingress
    - Egress
  ```
- [ ] Create specific policies to allow:
  - Ingress to the receiver service from the LoRa bridge pod (if deployed in‑cluster).
  - Egress from the bridge to the receiver service.
- [ ] Test with a temporary pod to ensure default deny works.

### 3.6 Audit Logging
- [ ] Enable Kubernetes audit logging by editing `/etc/rancher/k3s/audit-policy.yaml` (K3s) and enabling `--audit-policy-file`.
  - Configure to log all requests for sensitive resources (e.g., secrets, pods exec).
  - Forward audit logs to a secure location (e.g., a persistent volume or external system).

---

## 4. Application Security

### 4.1 Encryption in Transit
- [ ] **Rancher UI**: Already uses TLS (self‑signed). Consider replacing with a trusted certificate (e.g., Let’s Encrypt) if publicly accessible.
- [ ] **Kubernetes API**: TLS secured by default.
- [ ] **LoRa bridge to receiver**: Use HTTPS with mutual TLS (mTLS) if time permits; otherwise, ensure communication is only within cluster and isolated by network policy.

### 4.2 Encryption at Rest
- [ ] Ensure sensitive data (e.g., LoRa messages) are not stored persistently unless encrypted.
- [ ] If storing logs, use encryption for the underlying storage (disk encryption on Pis and mini PC).
- [ ] For Raspberry Pis, enable LUKS for root filesystem (requires re‑imaging). This is optional but shows depth.

### 4.3 Container Image Security
- [ ] Scan all container images (e.g., nginx, Python base) for vulnerabilities using:
  ```bash
  docker scan <image>   # if Docker installed
  ```
  or use `trivy` or `clair` to scan images.
- [ ] Use minimal base images (e.g., alpine, distroless) where possible.

### 4.4 Least Privilege for Containers
- [ ] Run containers as non‑root user (create Dockerfile with `USER` directive).
- [ ] Set `securityContext` in pod specs:
  ```yaml
  securityContext:
    runAsNonRoot: true
    allowPrivilegeEscalation: false
  ```

---

## 5. Monitoring & Intrusion Detection

### 5.1 Centralized Logging
- [ ] Deploy **Elasticsearch, Fluentd, Kibana (EFK)** stack or **Loki** to aggregate logs from all nodes and pods.
  - Use Helm to install (if time permits).
  - Alternatively, configure `syslog` to send logs to a central server (e.g., the Ubuntu VM).
- [ ] Ensure audit logs are included in the aggregation.

### 5.2 Metrics & Alerting
- [ ] Deploy **Prometheus** and **Grafana** for monitoring cluster and node health.
  - Use K3s’s built‑in metrics server or install Prometheus operator.
  - Set up alerts for:
    - Node down
    - High CPU/memory usage
    - Failed pods
- [ ] Create a dashboard showing cluster status, pod resource usage, and LoRa message rate.

### 5.3 Intrusion Detection for Kubernetes
- [ ] Install **Falco** for runtime security:
  ```bash
  helm repo add falcosecurity https://falcosecurity.github.io/charts
  helm install falco falcosecurity/falco --namespace falco --create-namespace
  ```
  - Configure rules to detect suspicious activity (e.g., exec into pod, privilege escalation).
- [ ] Forward Falco alerts to the logging system.

---

## 6. Vulnerability & Compliance Scanning

### 6.1 Host Vulnerability Scanning
- [ ] Use **Lynis** or **OpenVAS** to scan each node:
  ```bash
  sudo apt install lynis -y
  sudo lynis audit system
  ```
  - Review reports and remediate high‑risk issues.

### 6.2 Kubernetes Compliance Scanning
- [ ] Run **kube-bench** against the K3s cluster to check CIS Benchmarks:
  ```bash
  docker run --pid=host -v /etc:/etc:ro -v /var:/var:ro -t aquasec/kube-bench:latest
  ```
  - Address any failed tests (e.g., `--read-only` port settings, audit policy).

### 6.3 Container Image Scanning (already covered in 4.3)

---

## 7. Backup & Recovery

### 7.1 Backup Critical Data
- [ ] Backup etcd (K3s stores data in `/var/lib/rancher/k3s/server/db`). Create a cron job to back up this directory to a safe location.
- [ ] Backup configuration files (e.g., kubeconfig, scripts, network configs) to GitHub or an external drive.
- [ ] Document recovery procedure.

### 7.2 Disaster Recovery Test (Optional)
- [ ] Simulate a full cluster failure (e.g., restore from backup) and verify that the system recovers.

---

## 8. Security Documentation

- [ ] Create a **Security Architecture Diagram** showing all controls.
- [ ] Document all security tools installed, their configurations, and why they were chosen.
- [ ] Provide a **Risk Assessment** (threats, vulnerabilities, mitigations) in the final report.

---

Use this checklist to track progress. Mark items `[x]` as they are completed. Prioritize high‑impact tasks (e.g., RBAC, network policies, audit logging) given the time constraints.
```
