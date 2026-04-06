# Kuber‑Tuber Threat Model

**Version:** 1.0  
**Date:** April 6, 2026  
**Scope:** Entire system – hardware, network, Kubernetes cluster, LoRa gateway, field node (Cardputer), management interfaces.

---

## 1. Introduction

This document identifies threats to the Kuber‑Tuber system using the STRIDE model (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege). Each threat is mapped to affected components, potential impact, and proposed mitigations (many already implemented). The goal is to demonstrate a security‑conscious design and to guide remaining hardening tasks.

---

## 2. System Components (for Threat Enumeration)

| Component ID | Description |
|--------------|-------------|
| **C1** | Cardputer field node (sends LoRa messages) |
| **C2** | LoRa radio link (915 MHz, unlicensed spectrum) |
| **C3** | worker1 – LoRa gateway (Raspberry Pi + SX1262 HAT) |
| **C4** | Router Pi – inter‑VLAN routing, firewall, DHCP |
| **C5** | Managed switch (NETGEAR GS305E) – VLAN configuration |
| **C6** | K3s master node (Mini PC) |
| **C7** | K3s worker nodes (worker2, worker3, Ubuntu VM) |
| **C8** | Rancher management UI (HTTPS, NodePort) |
| **C9** | Administrative access (SSH, Tailscale) |
| **C10** | Kubernetes secrets (LoRa encryption key, etc.) |
| **C11** | LoRa bridge service (Python script on worker1) |
| **C12** | Receiver service (Kubernetes pod) |

---

## 3. STRIDE Threats per Component

### C1 – Cardputer Field Node

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | Attacker impersonates a legitimate Cardputer by capturing and replaying a valid message. | Unauthorised messages accepted as genuine. | Use AES‑256 encryption with unique IV per message; add message sequence numbers or timestamps to detect replay. |
| **Tampering** | Attacker physically modifies the Cardputer firmware to send malicious payloads. | Malicious commands or false data injected. | Code signing / secure boot (not available on ESP32‑S3 by default); physical tamper‑evident seals. |
| **Repudiation** | No non‑repudiation mechanism – legitimate user could deny sending a message. | Cannot prove message origin in disputes. | Acceptable for use case; no cryptographic signing implemented. (Future: add Ed25519 signatures.) |
| **Info Disclosure** | Attacker extracts encryption key from Cardputer memory (via JTAG or debug interface). | Entire communication compromised. | Disable debug interfaces in production build; store key in flash encrypted (using ESP32 flash encryption). |
| **DoS** | Attacker floods LoRa channel with garbage packets, jamming legitimate transmissions. | Loss of communication; no messages delivered. | Frequency hopping (not supported by SX1262 easily); use LBT (listen before talk) if implemented. |
| **Elevation of Privilege** | N/A – Cardputer has no privilege boundaries. | – | – |

### C2 – LoRa Radio Link

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | Attacker injects forged LoRa packets with valid headers. | Fake messages processed by bridge. | Encryption + authentication (AES‑CBC provides confidentiality but not integrity; use AES‑GCM or add HMAC). Current: only encryption, no integrity check. |
| **Tampering** | Attacker modifies LoRa packets in flight (bit‑flipping). | Garbage decrypted or corrupted messages. | Use authenticated encryption (e.g., AES‑GCM) to detect tampering. |
| **Repudiation** | Attacker captures and replays a message; receiver cannot distinguish from original. | Replay attacks possible. | Add timestamp and sequence number in encrypted payload; reject outdated messages. |
| **Info Disclosure** | Attacker eavesdrops on LoRa frequency. | Message content exposed if not encrypted. | AES‑256 encryption (implemented). |
| **DoS** | Jamming (continuous carrier or high‑duty‑cycle noise). | No messages get through. | Frequency agility; spread spectrum (LoRa inherently resistant to narrowband interference but not dedicated jamming). |
| **Elevation of Privilege** | N/A – radio link has no privilege boundaries. | – | – |

### C3 – worker1 (LoRa Gateway)

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | Attacker impersonates worker1 to the cluster by forging its IP address (ARP spoofing). | Messages sent to attacker instead of receiver service. | Static ARP entries or port security on switch; use Kubernetes network policies (allow only worker1 → receiver). |
| **Tampering** | Attacker modifies LoRa bridge script on worker1 to drop or alter messages. | Messages lost or falsified. | Filesystem integrity monitoring (AIDE); restrict write access to `/home/pi/lora` (chmod 750). |
| **Repudiation** | Attacker deletes logs from worker1. | No evidence of intrusion. | Forward logs to central logging server (e.g., syslog to Ubuntu VM). |
| **Info Disclosure** | Attacker reads encryption key from worker1 file system (if stored in plaintext). | All future messages decrypted. | Store key as Kubernetes secret and mount as read‑only file with 400 permissions; or use environment variable from sealed secret. |
| **DoS** | Attacker crashes bridge service (e.g., via malformed LoRa packet). | No message processing. | Systemd restarts service automatically; limit resource usage via cgroups. |
| **Elevation of Privilege** | Attacker exploits a vulnerability in bridge script (e.g., command injection) to gain root on worker1. | Full compromise of worker1; pivot to cluster. | Run bridge as non‑root user (user `pi`); sanitize all inputs; use minimal Python libraries. |

### C4 – Router Pi

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | Attacker spoofs IP addresses to bypass firewall rules (e.g., source IP of control plane). | Unauthorised cross‑VLAN traffic. | Use stateful firewall (`-m state --state ESTABLISHED,RELATED`) and strict ingress filtering. |
| **Tampering** | Attacker modifies iptables rules or routing tables. | Firewall disabled; all traffic allowed. | Lock down SSH access (only from management VLAN); use `iptables-save` and file integrity monitoring; disable physical console if unattended. |
| **Repudiation** | Attacker clears firewall logs. | No forensic evidence. | Send logs to remote syslog server; enable auditd on router. |
| **Info Disclosure** | Attacker captures inter‑VLAN traffic (e.g., by ARP spoofing). | Confidential data exposed. | Use VLANs (layer 2 isolation) – switch prevents cross‑VLAN sniffing; router only routes explicitly. |
| **DoS** | Attacker floods router with packets, saturating CPU or link. | Network瘫痪. | Rate limiting via `iptables limit`; control plane protection. |
| **Elevation of Privilege** | Attacker gains root on router (e.g., via vulnerable SSH or web service). | Full network compromise. | Keep OS updated; run only essential services; use strong SSH keys; disable password auth. |

### C5 – Managed Switch

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | Attacker connects to an unused port and sets VLAN tag to bypass isolation. | Unauthorised access to other VLANs. | Disable unused ports; set port security (MAC limiting). |
| **Tampering** | Attacker changes VLAN configuration via web interface (default password risk). | Network segmentation destroyed. | Change default password; restrict management access to management VLAN only (10.0.0.0/24). |
| **Repudiation** | No logging on switch. | Cannot trace configuration changes. | Not supported on GS305E – accept risk; rely on physical security. |
| **Info Disclosure** | Attacker reads VLAN configuration via SNMP (if enabled). | Network layout exposed. | Disable SNMP if not needed. |
| **DoS** | Attacker causes loop (STP disabled) or broadcasts storm. | Network collapse. | Enable STP (spanning tree) on switch; storm control if available. |
| **Elevation of Privilege** | Attacker gains admin access to switch. | Full control of VLANs. | Strong password; physical access control. |

### C6 – K3s Master Node (Mini PC)

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | Attacker impersonates master via IP spoofing to intercept API traffic. | Cluster compromise. | Use TLS for API (enabled); client certificates for kubectl. |
| **Tampering** | Attacker modifies etcd data (e.g., adds rogue pods). | Cluster state corrupted. | Restrict access to etcd (K3s uses embedded etcd with file‑based auth); backup regularly. |
| **Repudiation** | Attacker deletes Kubernetes audit logs. | No record of actions. | Enable audit logging (K3s supports via `--audit-policy-file`); send to remote storage. |
| **Info Disclosure** | Attacker reads kubeconfig file (`/etc/rancher/k3s/k3s.yaml`). | Full cluster control. | Restrict file permissions (600); store in secure location. |
| **DoS** | Attacker overwhelms API server with requests. | Cluster management unavailable. | Rate limiting (K3s has `--kube-apiserver-arg=--max-requests-inflight`). |
| **Elevation of Privilege** | Attacker compromises a container that mounts host docker socket. | Escape to host. | Do not run privileged containers; use PodSecurityPolicy / admission controllers. |

### C7 – K3s Worker Nodes

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | Attacker registers a rogue node with same hostname. | Traffic diverted. | K3s uses token authentication; token is secret. |
| **Tampering** | Attacker modifies kubelet configuration to run malicious pods. | Cluster compromise. | Restrict SSH access; file integrity monitoring. |
| **Repudiation** | Attacker clears pod logs. | Loss of evidence. | Centralised logging. |
| **Info Disclosure** | Attacker reads pod logs that contain sensitive data. | Leak of LoRa messages. | Do not log plaintext messages; use structured logging with minimal info. |
| **DoS** | Attacker fills node disk with logs. | Pod eviction. | Configure log rotation; set pod resource limits. |
| **Elevation of Privilege** | Attacker exploits container runtime vulnerability to break out to host. | Full node compromise. | Keep containerd/k3s updated; run containers as non‑root; use SELinux/AppArmor. |

### C8 – Rancher UI

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | Attacker creates fake Rancher login page (phishing). | Credential theft. | Use bookmarked URL; HTTPS only. |
| **Tampering** | Attacker modifies Rancher deployment to inject malicious code. | Cluster management compromised. | Use Helm charts from official repo; verify signatures. |
| **Repudiation** | Rancher logs not enabled. | No audit of user actions. | Enable Rancher audit logging (built‑in). |
| **Info Disclosure** | Attacker intercepts Rancher session cookie over HTTP (if misconfigured). | Session hijacking. | Force HTTPS (already). |
| **DoS** | Attacker floods Rancher login endpoint. | Lock out legitimate admins. | Rate limiting via ingress (not configured – accept risk for demo). |
| **Elevation of Privilege** | Attacker gains admin access to Rancher (default password not changed). | Full cluster control. | Change bootstrap password immediately; use strong password. |

### C9 – Administrative Access (SSH, Tailscale)

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | Attacker steals SSH private key. | Unauthorised access. | Protect keys with passphrase; use hardware token (optional). |
| **Tampering** | Attacker modifies `authorized_keys` file. | Backdoor access. | File integrity monitoring; restrict write permissions. |
| **Repudiation** | No logging of SSH sessions. | Cannot trace admin actions. | Enable SSH audit logs (`LogLevel VERBOSE`); send to syslog. |
| **Info Disclosure** | Attacker listens on Tailscale network if node compromised. | Lateral movement. | Use Tailscale ACLs to restrict access; revoke shared nodes after use. |
| **DoS** | Attacker brute‑forces SSH passwords (but password auth disabled). | Not applicable. | Already disabled. |
| **Elevation of Privilege** | Attacker escalates from user to root via sudo misconfiguration. | Full system control. | Restrict sudo to specific commands; use `sudo -l` to audit. |

### C10 – Kubernetes Secrets (Encryption Key)

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | N/A | – | – |
| **Tampering** | Attacker modifies the secret value (encryption key). | Messages cannot be decrypted. | RBAC to restrict write access to secret; audit logging. |
| **Repudiation** | No audit of secret access. | Cannot tell who read the key. | Enable Kubernetes audit logging; monitor `get secret` events. |
| **Info Disclosure** | Attacker with `get secret` permission reads key. | Full decryption of all messages. | Use least privilege RBAC; consider using Sealed Secrets or external KMS. |
| **DoS** | Attacker deletes the secret. | Bridge cannot decrypt messages. | Backup secret; RBAC to prevent deletion. |
| **Elevation of Privilege** | Attacker compromises a pod with service account that has access to secrets. | Key exposure. | Do not mount secret into unnecessary pods; use separate service account. |

### C11 – LoRa Bridge Service

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | Attacker sends crafted HTTP requests to receiver service pretending to be bridge. | Fake messages injected. | Use mutual TLS or shared secret between bridge and receiver (not yet implemented). Current: rely on network policy. |
| **Tampering** | Attacker modifies bridge binary or script. | Messages altered/dropped. | File integrity monitoring; use read‑only filesystem if possible. |
| **Repudiation** | No logging of bridge actions. | Cannot trace message processing. | Bridge logs to journald; persist logs. |
| **Info Disclosure** | Bridge logs decrypted message plaintext. | Leak of sensitive messages. | Avoid logging message content; log only metadata (timestamp, length). |
| **DoS** | Attacker sends malformed LoRa packet causing bridge to crash. | Service down. | Exception handling; systemd restart. |
| **Elevation of Privilege** | Bridge runs as root (currently user `pi` – not root). | Limited risk. | Keep as non‑root; drop capabilities if needed. |

### C12 – Receiver Service (Kubernetes Pod)

| Threat | Description | Impact | Mitigation |
|--------|-------------|--------|-------------|
| **Spoofing** | External attacker calls receiver endpoint (if exposed). | Fake messages. | No external exposure; ClusterIP only. |
| **Tampering** | Attacker modifies receiver pod code via compromised container. | Logs corrupted. | Use immutable image; run as non‑root. |
| **Repudiation** | Receiver logs not persisted. | No message audit. | Write logs to stdout (collected by Kubernetes). |
| **Info Disclosure** | Receiver logs message plaintext. | Leak. | Avoid logging full message; log hash or metadata. |
| **DoS** | Attacker floods receiver with requests (from within cluster). | Pod crash or resource exhaustion. | Set resource limits; use horizontal pod autoscaler. |
| **Elevation of Privilege** | Attacker breaks out of receiver pod to host. | Node compromise. | Run non‑root; use gVisor or Kata Containers (not used – accept risk). |

---

## 4. Summary of High‑Priority Threats (Unmitigated or Partially Mitigated)

| ID | Threat | Affected Component | Current Mitigation | Gap |
|----|--------|--------------------|--------------------|-----|
| T1 | Replay attack on LoRa | C2 | None | No sequence number / timestamp validation. |
| T2 | Lack of integrity on LoRa (only encryption) | C2 | None | AES‑CBC does not provide authentication; tampering possible. |
| T3 | Key stored in plaintext file on worker1 | C3, C10 | File permissions (600) | Better: mount as secret from Kubernetes. |
| T4 | No mutual TLS between bridge and receiver | C11 | Network policy only | Still allows any pod in namespace to send. |
| T5 | No audit logging enabled on K3s | C6 | None | Need to configure audit policy. |
| T6 | Rancher default password not changed? | C8 | Changed? (verify) | Ensure strong password set. |

These gaps are documented in the **Risk Assessment** and should be addressed before final hand‑off.
