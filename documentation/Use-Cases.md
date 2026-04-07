# Kuber‑Tuber – Use Cases

## Three Horizons of Capability

Kuber‑Tuber is a foundation for the future. 

The same isolated, encrypted, self‑healing network can serve **current**, **nearby**, and **future** business continuity needs.

---

## 1. Current Applications (Working Today)

These are fully implemented or trivially configurable with the existing Kuber‑Tuber hub (LoRa + K3s + Rancher + VLANs). No new development required – just deployment.

---

### 1.1 Temporary Event Venues (Festivals, Sports, Fairs)

**Scenario:** Cellular networks are congested or absent. Security, medical, and logistics staff need reliable, encrypted text communication.

**How Kuber‑Tuber helps today:**
- The hub runs in a command centre (powered by AC or generator).
- Staff carry Cardputers (or any LoRa transmitter).
- Messages are sent over LoRa → decrypted on `worker1` → logged to the cluster.
- Command centre views the live log via Rancher dashboard on a local laptop.
- No cellular, no internet, no monthly fees.

**Validation:** Already tested – Cardputer sends `SEC Crowd surge at north gate`, message appears in `kubectl logs` within seconds.

---

### 1.2 Refrigerated Warehouse / Convenience Store / Grocery Store – IoT Backup

**Scenario:** The store’s primary internet fails. LoRa temperature sensors (fridges, freezers) lose cloud connectivity – spoilage risk.

**How Kuber‑Tuber helps today:**
- Existing LoRa sensors are reconfigured to send data to the hub’s IP.
- A simple rule engine pod (e.g., Node‑RED) runs on K3s.
- If temperature exceeds threshold for >5 minutes, the hub sends an alert to a manager’s Cardputer or a local buzzer.
- All readings are stored locally. When internet returns, the backlog is forwarded to the cloud for compliance.

**Validation:** A simulated temperature sensor sends `temp=8°C` (threshold=4°C). The hub triggers an alert – visible in logs and as a LoRa message to a Cardputer.

---

### 1.3 Quick Service Restaurant – POS Continuity

**Scenario:** The store loses internet / cloud connectivity. Card payments stop, but everything else can keep running.

**How Kuber‑Tuber helps today:**
- POS terminals connect to a local `order-service` pod on the K3s cluster (VLAN‑isolated).
- Orders are stored in a local PostgreSQL pod.
- Kitchen displays and drive‑thru timers continue working.
- Employee clock‑in/out logs are cached locally.
- When internet returns, the backlog syncs to the central head office.

**What still fails:** Credit/debit card authorization (requires external issuer). Staff take cash or use offline vouchers.

**Validation:** Deploy the existing receiver service and a simple order‑entry web app to the cluster. Test by unplugging the WAN link – orders still appear on the kitchen display pod.

---

### 1.4 Remote Construction Site / Mine

**Scenario:** No cellular coverage. Foremen and crane operators need to coordinate lifts, concrete deliveries, safety checks.

**How Kuber‑Tuber helps today:**
- Hub placed in a central trailer.
- Workers carry Cardputers and send pre‑defined codes: `LIFT DONE`, `CONCRETE ARRIVED`, `SAFETY STOP`.
- All messages logged for safety audits.
- Optionally, a local web dashboard (on the cluster) shows a live board of requests.

**Validation:** Send `LIFT REQ – floor 3` from Cardputer → dashboard updates. Send `LIFT COMPLETE` → request marked done.

---

### 1.5 Rural Healthcare Clinic (Offline Patient Data)

**Scenario:** Unreliable internet. Nurses need to send patient summaries, lab results, and supply requests.

**How Kuber‑Tuber helps today:**
- Hub installed at the clinic.
- Cardputers used to send anonymised patient data: `PT 123 TEMP 38.5`.
- A rules engine pod checks for abnormal vitals (e.g., heart rate > 120) and triggers an alert to the on‑call doctor’s device.
- Local web‑based EHR (read‑only cache) runs on the cluster.

**Validation:** A simulated abnormal reading (`HR 130`) generates an alert message visible in logs and sent to a Cardputer.

---

## 2. Nearby Features (Small Extensions – Not a Stretch)

These require **minor development** (days, not weeks) but are natural evolutions of the existing architecture. The core capabilities (K3s, LoRa, VLANs, encryption) are already in place.

### 2.1 Web Dashboard for Messages (Instead of `kubectl logs`)

**What it would take:** Deploy a simple Node.js or Flask web app that reads from the same PostgreSQL pod (or directly from the receiver’s log stream) and displays messages in real‑time via WebSockets. Expose it via a NodePort or Ingress.

**Why nearby:** You already have the cluster and the data. This is just a front‑end.

### 2.2 Multi‑Channel / Group Messaging

**What it would take:** Extend the Cardputer firmware to include a `channel` field in the encrypted payload. Modify the receiver to route messages to different log files or web dashboard views based on channel.

**Why nearby:** The encryption and LoRa stack already handle arbitrary structured data. No new hardware required.

### 2.3 Basic Sensor Data Persistence (SQLite or PostgreSQL)

**What it would take:** Deploy a PostgreSQL Helm chart. Modify the receiver service to write each decrypted message to the database instead of just stdout. Add a simple retention policy.

**Why nearby:** The cluster already has persistent volumes (or can use local SSD on the Mini PC). Helm charts for PostgreSQL are one command away.

### 2.4 Email / SMS Gateway via Local Cellular Dongle

**What it would take:** Attach a 4G USB dongle to the router Pi or Mini PC. Write a small service that forwards high‑priority alerts (e.g., “temperature critical”) to email or SMS. The dongle provides outbound internet only when needed.

**Why nearby:** The router Pi already runs Linux and iptables. Adding a USB modem and a simple Python script is straightforward.

### 2.5 Offline Card Payments (Stored Value / Pre‑auth)

**What it would take:** Modify the POS integration to accept “offline approval” for trusted customers (e.g., known loyalty members). Store the authorization in the local cluster and settle later. This is **not** real‑time issuer approval – it’s a risk trade‑off.

**Why nearby (but with caveats):** Kuber‑Tuber provides the local database and network. The missing piece is business policy and a simple “offline mode” flag in the POS software. Technically feasible; legally/contractually harder.

---

## 3. Future Ideas (Possible Because of Kuber‑Tuber, But Require Significant Work)

These are **not** trivial, but they are *enabled* by the architecture you’ve built. They would take weeks or months of development, plus potential new hardware.

### 3.1 Mesh‑to‑Mesh Bridging (Multiple Hubs)

**What it would take:** Two or more Kuber‑Tuber hubs (e.g., in different buildings or towns) that communicate over long‑range LoRa or point‑to‑point Wi‑Fi. Each hub runs a “bridge pod” that forwards selected messages to the other hub. This creates a rudimentary wide‑area offline network.

**Why possible:** You already have LoRa and K3s. The bridge pod would need to encrypt messages for the remote hub and handle retries. This is a distributed systems problem, but the building blocks exist.

### 3.2 Over‑the‑Air Key Rotation

**What it would take:** Design a secure protocol to push a new AES key to all Cardputer field devices over LoRa (encrypted with the old key). Implement key versioning and fallback. Requires firmware updates on the Cardputer and a new key management service on the cluster.

**Why possible:** The LoRa link is already two‑way (ACKs). The challenge is reliability and security (avoiding a malicious key push). Doable with careful design.

### 3.3 Integration with Matrix / Dendrite (Federated Chat)

**What it would take:** Deploy a Dendrite (Matrix) server on the K3s cluster. Write a bridge that translates LoRa messages into Matrix events and vice versa. Matrix clients (Element) on local Wi‑Fi would then show LoRa messages as chat rooms.

**Why possible:** Matrix is open source and can run on K3s. The bridge is similar to the existing receiver service. This would give a polished chat UI instead of raw logs.

### 3.4 Solar / Battery Powered Hub (True Portability)

**What it would take:** Replace AC power with a solar charge controller, deep‑cycle battery, and DC‑DC converters for the Pi and Mini PC. The Mini PC (N100) draws ~10W, Pis draw ~5W each – total ~30W. A 100Ah 12V battery + 200W solar panel could run it indefinitely in sunny conditions.

**Why possible:** Low‑power hardware already chosen. The missing piece is the electrical engineering and enclosure.

### 3.5 Real‑Time External Authorizations (Card Payments, Live Inventory) – The Hard Problem

**What it would take:** This is the exception mentioned earlier. To truly process card payments offline, you would need either:
- A local cache of issuer authorizations (legally and technically very difficult), or
- A completely different model (e.g., stored‑value wallet on the Cardputer, settled via blockchain or later sync).

**Why it’s future:** Kuber‑Tuber provides the *local* network, but the payment ecosystem is external. Solving this would require partnership with a payment processor or a radical redesign of retail payments. Not impossible, but far beyond the current scope.

---

## Summary Table

| Category | Examples | Effort |
|----------|----------|--------|
| **Current Applications** | POS continuity, event messaging, temp sensor backup, construction coordination, rural clinic | Already working |
| **Nearby Features** | Web dashboard, multi‑channel, SQLite persistence, SMS gateway, stored‑value payments | Days – 2 weeks |
| **Future Ideas** | Multi‑hub mesh, OTA key rotation, Matrix chat, solar power, real‑time external auth | Weeks – months |

---

## Conclusion

Kuber‑Tuber is a **platform for offline‑first business continuity**. The current capabilities already deliver value for restaurants, warehouses, events, and clinics. 

With modest extensions, it becomes a turnkey solution for local data persistence and alerting. And the architecture opens the door to truly resilient, federated, off‑grid networks, without relying on fragile cloud giants.

*For technical implementation details, see the [README](README.md) and other documentation in this repository.*
