## Slide 1 – Title / Hook

**What the slide conveys:**  
The system is named Kuber‑Tuber. It is designed to operate without an internet connection, uses encryption, and automatically recovers from failures. The hardware is small enough to be portable.

**Visual content:**  
Two side‑by‑side images. Left: a representative location with no cellular coverage (e.g., a rural area, a disaster zone with downed infrastructure, or a remote industrial site). Right: a photograph of the actual hardware stack used in the project – Mini PC (master), three Raspberry Pi 4 workers, a dedicated router Pi, a NETGEAR GS305E managed switch, a Waveshare SX1262 LoRa HAT attached to one worker, and a Cardputer field device.

**Why this content:**  
The audience needs to immediately understand the problem domain (off‑grid / no internet) and the physical form of the solution. Showing the actual hardware builds credibility – it is not a theoretical design.

---
## Slide 2 - Meet the team

**What the slide conveys:** 

Photos of the team, headshot of each team member and a photo of team working toother at Nathan's place in the middle of the slide 

---
## Slide 3 – The Problem: Outages, DDoS, Centralization

**What the slide conveys:**  
Three independent, growing problems make current communication and infrastructure models fragile: cellular coverage gaps, insecure radio, and cloud centralization.

**Detailed information per problem:**

1. **Cellular dead zones**  
   - Large portions of land (especially rural, underground, mountainous, or post‑disaster) have no cellular signal.  
   - Even where coverage exists, events like natural disasters, power outages, or network congestion can render it unusable.  
   - Supporting data (if shown): FCC 2025 estimate that ~30% of US land area lacks cellular coverage.
---

## Slide 4 – The Problem: Outages, DDoS, Centralization

1. **Unencrypted and unlogged radio**  
   - Walkie‑talkies and many private land‑mobile radios transmit in the clear (no encryption).  
   - Anyone with a software‑defined radio or a simple scanner can listen.  
   - No built‑in audit trail – messages are not logged, making incident reconstruction impossible.  
   - This is unacceptable for security, safety, or compliance‑sensitive operations.

2. **Cloud centralization**  
   - Web hosting and cloud infrastructure are concentrated among a few providers.  
   - Market share (Synergy Research 2025): AWS 28%, Azure 21%, Google Cloud 14%, others 30%, Oracle 3%, Alibaba 4%.  
   - A single outage at one provider can disable a large fraction of internet services.  
   - DDoS attacks are increasing both in scale and raw quantity (Cloudflare Q4 2025 Threat Report). A bar chart shows attacks rising from <5 million in 2020 to >20 million in 2025.  
   - This creates a growing single point of failure.

**Visuals:**  
Three columns with icons (tower with slash, radio with lock broken, cloud with crack). Below: bar chart of DDoS attacks 2020–2025, pie chart of cloud market share.

**Why this content:**  
Establishes that the problem is not hypothetical – it has quantitative trends and affects real businesses. Each problem will later be addressed by a specific feature of Kuber‑Tuber.

---

## Slide 5 – Our Mission
**What the slide conveys:**  
A simple breather slide for a transition into the next topic 

---
## Slide 6 – Our Solution
**Kuber-Tuber**
**An Offline-First, Encrypted Operations Hub**

Talking about the input devices *lora devices* in the first section

then transfer to the hub on the second section explaining what the hub is

and in the last section the output, logs and monitoring on a full dashboard

---


## Slide 6 – Mission Bridge

**What the slide conveys:**  
A simple, declarative mission statement that reorients the audience from problems to the intended outcome.

**Text:**  
*“When traditional networks fail, yours shouldn’t. Always have a backup plan.”*

**Visual:**  
Centered white text on a dark background. No graphs, no icons.

**Why this content:**  
After presenting three serious problems, the presentation needs a moment of clarity. This slide states the goal without technical detail. It serves as a mental “reset” before diving into the solution architecture.

---

## Slide 7 – Use Cases: Three Tiers of Continuity

**What the slide conveys:**  
The system is not a single‑purpose device. It can support a range of business continuity scenarios, from those already working today to those requiring minor extensions, to long‑term possibilities.

**Detailed information (three tiers):**

### Tier 1: Current Applications (working today)
- **Quick service restaurant (e.g., McDonald’s style):**  
  - POS terminals can enter orders, kitchen displays update, drive‑thru timers run – all without internet.  
  - Employee clock‑in/out logs cached locally.  
  - Card payments do not work (requires external issuer); cash or offline vouchers are used.  
- **Event security / staff messaging:**  
  - Cardputer field devices send encrypted messages over LoRa.  
  - Command centre views logs via Rancher. No cellular needed.  
- **Refrigerated warehouse temperature backup:**  
  - LoRa temperature sensors send readings to the hub.  
  - If a temperature exceeds threshold for >5 minutes, the hub triggers an alert.  
  - Data stored locally, synced to cloud when internet returns.  
- **Construction lift coordination:**  
  - Workers send pre‑defined codes (`LIFT REQ`, `LIFT COMPLETE`).  
  - Logs provide safety audit trail.  
- **Rural clinic offline patient intake:**  
  - Anonymised patient data (e.g., `PT 123 TEMP 38.5`) sent via Cardputer.  
  - Rules engine pod checks for abnormal vitals and alerts on‑call doctor.

### Tier 2: Nearby Features (days to 2 weeks of work)
- Web dashboard for messages (replaces `kubectl logs`).  
- Multi‑channel / group messaging (add a `channel` field to encrypted payload).  
- SQLite or PostgreSQL persistence for all messages.  
- SMS gateway via 4G dongle (outbound alerts only).  
- Stored‑value offline payments (pre‑authorise trusted customers, settle later – not real‑time issuer approval).

### Tier 3: Future Ideas (weeks to months)
- Multi‑hub LoRa mesh – multiple Kuber‑Tuber clusters bridging over long‑range LoRa.  
- Over‑the‑air encryption key rotation (push new AES key to Cardputers without re‑flashing).  
- Matrix / Dendrite chat interface – full messaging UI over the LoRa mesh.  
- Solar + battery power – truly portable hub (estimated 30W draw, 100Ah battery + 200W solar panel).  

**Visual:**  
Three columns with colored headers (green for Current, amber for Nearby, blue for Future). Each column has 4‑5 short lines with icons (burger, tent, snowflake, hard hat, etc.). Bottom small‑text disclaimer: “Card payments and real‑time external authorizations require issuer connectivity. Everything else runs offline.”

**Why this content:**  
Shows that the system is not a toy – it already solves real problems, and the architecture enables a clear path to more advanced features. The disclaimer avoids overpromising on card payments.

---
## Slide 8 – Hardware & Network Topology (VLANs)

**What the slide conveys:**  
The physical hardware and the logical network segmentation that isolates the control plane from worker nodes.

**Detailed information:**

**Hardware inventory (shown in photo):**  
- Mini PC (master node) – x86_64, 16GB RAM, Debian 13. Static IP: 10.0.10.201.  
- Router Pi – Raspberry Pi 4 (2GB RAM) running Raspberry Pi OS Lite. Two VLAN‑tagged interfaces (`eth0.10`, `eth0.20`). Static IPs: 10.0.10.1 and 10.0.20.1.  
- Managed switch – NETGEAR GS305E, 5 ports, 802.1Q VLAN capable. Management IP: 10.0.0.2.  
- Worker1 – Raspberry Pi 4 (4GB) with Waveshare SX1262 LoRa HAT. Static IP: 10.0.20.208.  
- Worker2 – Raspberry Pi 4 (4GB). Static IP: 10.0.20.207.  
- Worker3 – Raspberry Pi 4 (4GB). Static IP: 10.0.20.202.  
- Cardputer – field device (not in the hub photo, shown separately or held).

**VLAN configuration:**  
- **VLAN 1 (management)** – 10.0.0.0/24. Used for switch management interface and router management.  
- **VLAN 10 (control plane)** – 10.0.10.0/24. Contains the Mini PC master.  
- **VLAN 20 (workers + LoRa)** – 10.0.20.0/24. Contains worker1, worker2, worker3.

**Switch port assignments:**  
- Port 1 (to router Pi): trunk port – tagged for VLANs 10 and 20.  
- Port 2 (to Mini PC): access port – untagged, PVID 10 (VLAN 10).  
- Ports 3,4,5 (to worker1, worker2, worker3): access ports – untagged, PVID 20 (VLAN 20).

**Router Pi role:**  
- Routes between VLAN 10 and VLAN 20.  
- Enforces firewall with `iptables` (detailed on Slide 7).  
- Provides DHCP for both VLANs via `dnsmasq`.

**Permitted traffic:**  
- From control plane (VLAN 10) to workers (VLAN 20): SSH (port 22), K3s API (port 6443).  
- Established/related connections allowed back.  
- All other inter‑VLAN traffic is dropped.  
- Workers cannot initiate new connections to the control plane (red crossed‑out arrow in diagram).

**Why this topology:**  
- Isolation prevents a compromised worker from accessing the master or Rancher.  
- VLANs at Layer 2 plus firewall at Layer 3 provide defense in depth.  
- A dedicated router Pi is required because the GS305E is a Layer 2 only switch – it cannot route or filter.

**Visual:**  
Left half: high‑resolution labelled photo of the actual hardware (Mini PC, router Pi, switch, three workers, LoRa HAT). Right half: VLAN diagram showing three subnets, the router Pi between them, and red X from workers to control.

**Why this content:**  
The audience needs to see that the network is not flat – security is built into the physical and logical topology. The router Pi’s necessity is explained (Layer 2 switch limitation).

---
## Slide 9 – Our Solution: Kuber‑Tuber Architecture

**What the slide conveys:**  
Kuber‑Tuber is a self‑contained edge cluster that operates entirely offline, with no single point of failure, encryption at the radio layer, and network isolation.

**Detailed information:**

- **Input methods:** Three types of devices can connect to the hub:  
  - LoRa radio (915 MHz, long‑range, low bandwidth) – for field devices like the Cardputer.  
  - Ethernet (wired) – for POS terminals, sensors, or other local equipment.  
  - Wi‑Fi – for laptops, tablets, or other wireless devices on the same local network.

- **Central hub (the Kuber‑Tuber cluster):**  
  - A K3s (lightweight Kubernetes) cluster running on five physical nodes:  
    - 1 master node (Mini PC)  
    - 3 worker nodes (Raspberry Pi 4s)  
    - (The router Pi is separate – it handles inter‑VLAN routing, not cluster workloads.)  
  - A managed switch (NETGEAR GS305E) connects all nodes.  
  - The cluster runs:  
    - Rancher – web‑based management UI.  
    - LoRa bridge service (on worker1) – receives LoRa packets, decrypts, and forwards.  
    - Receiver pod (inside cluster) – logs messages to stdout, accessible via `kubectl logs`.

- **Outputs:**  
  - Logs (via `kubectl` or Rancher UI).  
  - Alerts (can be configured to trigger on keywords).  
  - Dashboard (Rancher shows node health, pod status, logs).

- **Key properties:**  
  - No internet connection required.  
  - No single point of failure – if a worker fails, K3s reschedules its pods.  
  - AES‑256 encryption on LoRa payloads.  
  - VLAN isolation (detailed on Slide 6).  

**Visual:**  
Block diagram: left side input icons (LoRa antenna, Ethernet jack, Wi‑Fi arcs) → center dashed box “Kuber‑Tuber Hub” containing 5 node icons + switch + Rancher icon → right side output icons (log file, alert bell, dashboard screen).

**Why this content:**  
This is the high‑level answer to the problems. The audience now knows the system exists, what it does, and its core architectural principles. Specifics (VLANs, router, iptables) come later.
