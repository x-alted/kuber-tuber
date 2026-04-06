# Kuber‑Tuber Risk Assessment

**Version:** 1.0  
**Date:** April 6, 2026  
**Methodology:** Likelihood × Impact  
**Scope:** Identified threats from STRIDE model.

---

## 1. Introduction

This risk assessment evaluates threats identified in the STRIDE threat model, assigns likelihood and impact scores, determines overall risk level, and recommends mitigations. Risks are prioritised for remediation based on the team’s remaining time and project goals.

---

## 2. Risk Scoring Criteria

### Likelihood (L)

| Level | Description | Frequency |
|-------|-------------|-----------|
| **Rare (1)** | Unlikely to occur, requires unusual circumstances | < 1% chance per year |
| **Unlikely (2)** | Could occur in specific scenarios | 1–10% per year |
| **Possible (3)** | Might occur under normal conditions | 10–30% per year |
| **Likely (4)** | Expected to occur | 30–70% per year |
| **Almost Certain (5)** | Occurs regularly | >70% per year |

### Impact (I)

| Level | Description | Consequence |
|-------|-------------|-------------|
| **Negligible (1)** | Minimal effect, no disruption | Operational inconvenience |
| **Minor (2)** | Limited localised impact | Single message lost or delayed |
| **Moderate (3)** | Some loss of function | Cluster degradation, partial message loss |
| **Major (4)** | Significant loss of function | Entire communication unavailable, key exposure |
| **Critical (5)** | System compromise, data breach | Full cluster takeover, all messages exposed |

### Risk Score = L × I

| Score | Risk Level | Action |
|-------|------------|--------|
| 1–4 | Low | Accept or monitor |
| 5–9 | Medium | Mitigate if cost‑effective |
| 10–16 | High | Must mitigate |
| 17–25 | Critical | Immediate remediation |

---

## 3. Risk Register

| # | Threat | Component | L | I | Score | Level | Existing Mitigations | Recommended Actions | Owner | Status |
|---|--------|-----------|---|---|-------|-------|----------------------|---------------------|-------|--------|
| R1 | Replay attack on LoRa | C2 | 3 | 3 | 9 | Medium | None | Add timestamp + sequence number in encrypted payload; reject packets with old timestamps. | Nick | Open |
| R2 | Tampering with LoRa packets (no integrity) | C2 | 2 | 4 | 8 | Medium | Encryption (confidentiality) | Switch to AES‑GCM or add HMAC‑SHA256. | Nathan | Open |
| R3 | Encryption key stored in plaintext on worker1 | C3, C10 | 3 | 5 | 15 | High | File permissions 600 | Store key as Kubernetes secret and mount as read‑only file; avoid writing to disk. | Nathan | In Progress |
| R4 | No mutual TLS between bridge and receiver | C11 | 2 | 3 | 6 | Medium | Network policy (allow only bridge pod) | Add shared secret or mTLS; or use service mesh (Linkerd). | Anthony | Open |
| R5 | No Kubernetes audit logging | C6 | 2 | 4 | 8 | Medium | None | Enable audit policy in K3s (`--audit-policy-file`). | Nathan | Open |
| R6 | Default Rancher password not changed | C8 | 3 | 5 | 15 | High | Bootstrap secret retrieved | Change password via Rancher UI; document securely. | Alex | Closed (assumed done) |
| R7 | Weak SSH key passphrase (team key) | C9 | 2 | 4 | 8 | Medium | Ed25519 key | Enforce passphrase; store in password manager. | All | Open |
| R8 | Bridge service logs decrypted messages | C11 | 3 | 3 | 9 | Medium | None | Modify bridge to log only metadata (timestamp, length, source). | Nick | Open |
| R9 | Unauthorised access to switch via default password | C5 | 4 | 4 | 16 | High | Password changed (assumed) | Verify password changed; restrict management to VLAN 1 only. | Anthony | Closed (verified) |
| R10 | Jamming of LoRa frequency | C2 | 2 | 4 | 8 | Medium | None (accept risk) | Document as operational limitation. | Team | Accept |
| R11 | Attacker steals SSH key from admin laptop | C9 | 2 | 5 | 10 | High | Passphrase | Use hardware token (YubiKey) or short‑lived certificates. | All | Open (future work) |
| R12 | Pod breakout to host via container vulnerability | C7 | 1 | 5 | 5 | Medium | Non‑root containers | Use PodSecurityPolicy; consider gVisor. | Nathan | Open (low priority) |
| R13 | Attacker modifies iptables on router Pi | C4 | 2 | 5 | 10 | High | SSH key only, file integrity | Deploy AIDE or tripwire; backup config. | Anthony | Open |
| R14 | No non‑repudiation for messages | C1 | 3 | 2 | 6 | Medium | None | Accept for demo; future: add digital signatures. | Team | Accept |

---

## 4. Risk Heat Map

| Impact \ Likelihood | Rare (1) | Unlikely (2) | Possible (3) | Likely (4) | Almost Certain (5) |
|---------------------|----------|--------------|--------------|------------|--------------------|
| **Critical (5)**    |          | R11 (10)     | R3 (15), R6 (15), R13 (10) | R9 (16) | |
| **Major (4)**       |          | R2 (8), R5 (8), R7 (8), R10 (8) | R1 (9), R8 (9) | | |
| **Moderate (3)**    |          | R4 (6), R12 (5) | R14 (6) | | |
| **Minor (2)**       |          |              | | | |
| **Negligible (1)**  |          |              | | | |

*Values in parentheses are Risk Scores.*

**High/Critical Risks (score ≥10):** R3, R6, R9, R11, R13.  
**Medium Risks (score 5–9):** R1, R2, R4, R5, R7, R8, R10, R12, R14.

---

## 5. Mitigation Plan for High Risks

### R3 – Encryption key stored in plaintext on worker1 (Score 15)
- **Action:** Replace plaintext key file with Kubernetes secret mounted as a volume.
- **Steps:**
  1. Create secret `lora-encryption-key` in `lora-demo` namespace.
  2. Modify bridge pod (or systemd service) to read from mounted secret (if bridge runs in cluster). Currently bridge runs on host – alternative: use `kubectl` to retrieve secret on startup and store in memory only.
  3. Delete plaintext key file.
- **Owner:** Nathan
- **Deadline:** April 7

### R6 – Default Rancher password not changed (Score 15)
- **Action:** Change password via Rancher UI.
- **Verification:** Log in with `admin` and new password; ensure bootstrap secret is removed after first login (Rancher does this automatically).
- **Owner:** Alex
- **Status:** Assumed closed – verify.

### R9 – Unauthorised access to switch via default password (Score 16)
- **Action:** Change switch password and restrict management access.
- **Steps:**
  1. Change password to strong value (documented securely).
  2. Configure switch management ACL to allow only IP `10.0.0.201` (Mini PC) or management subnet.
- **Owner:** Anthony
- **Status:** Closed – verify.

### R11 – Attacker steals SSH key from admin laptop (Score 10)
- **Action:** Enforce passphrase on team SSH key.
- **Steps:**
  1. Generate new key with strong passphrase.
  2. Redeploy public key to all nodes.
  3. Remove old key.
- **Owner:** All
- **Deadline:** April 8 (if time permits; otherwise document as residual risk).

### R13 – Attacker modifies iptables on router Pi (Score 10)
- **Action:** Implement file integrity monitoring and regular config backup.
- **Steps:**
  1. Install `aide` or `tripwire`.
  2. Configure to monitor `/etc/iptables/` and `/etc/systemd/network/`.
  3. Schedule daily integrity check and email alert (if internet available).
- **Owner:** Anthony
- **Deadline:** April 8 (optional, depending on time).

---

## 6. Residual Risks (Accepted)

After applying planned mitigations, the following risks remain at an acceptable level (Low or Medium) for the demo and project scope:

| Risk | Score (after mitigation) | Justification |
|------|--------------------------|---------------|
| Replay attack (R1) | 6 (Medium) | Adding timestamps reduces likelihood; for demo, low probability. |
| No integrity on LoRa (R2) | 6 (Medium) | Tampering requires proximity and knowledge; not a primary threat for capstone. |
| No mTLS (R4) | 4 (Low) | Network policy provides sufficient isolation in lab environment. |
| No audit logging (R5) | 4 (Low) | Acceptable for demo; logs are still in journald. |
| SSH key passphrase (R7) | 4 (Low) | Team will use passphrase; residual risk if laptop compromised. |
| Bridge logs messages (R8) | 5 (Medium) | Will modify to log only metadata – reduces exposure. |
| LoRa jamming (R10) | 4 (Low) | Operational limitation; not in scope. |
| Pod breakout (R12) | 3 (Low) | Very unlikely with up‑to‑date containerd. |
| Non‑repudiation (R14) | 3 (Low) | Not required for use cases. |

---

## 7. Conclusion

The Kuber‑Tuber system has a solid security foundation with VLAN isolation, encryption, SSH keys, and firewalls. The highest remaining risks involve **key storage** (R3) and **switch access** (R9) – both are already addressed or have clear mitigations in progress. The team will focus on the top three high risks before the final presentation. All medium risks are either accepted or scheduled for future work. This risk assessment demonstrates due diligence and informs the final project report.

---

## 8. Appendix – Risk Treatment Definitions

- **Mitigate:** Apply controls to reduce likelihood or impact.
- **Accept:** Acknowledge risk without further action (within tolerance).
- **Transfer:** Not applicable (no insurance or third party).
- **Avoid:** Change design to eliminate risk (not applicable here).
