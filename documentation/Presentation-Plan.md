# Presentation Plan
## Kuber-Tuber — Final Presentation (April 9, 2026)

*This document reflects the actual final presentation as delivered. Reference: `Kuber-Tuber __ Final Presentation.pdf` (Apr 9 17:28).*

---

## Slide 1 – Title

**What the slide conveys:**
The system name, tagline, date, and team. Sets the tone: dark, technical, serious.

**Content:**
- Title: *Kuber-Tuber*
- Subtitle: *Off-Grid, Encrypted, Self-Healing*
- Date: April 8th, 2026
- Footer tagline: *"What if the real internet was the friends we made along the way?"*
- Presented by: Alex MacIntyre, Anthony Frison, Nathan Boudreau, Nick MacInnis

**Visual:** Dark starfield background. Kuber-Tuber logo (router/switch icon with wireless arcs) top right.

---

## Slide 2 – The Problem: Outages Are Up

**Section header:** The Problem

**What the slide conveys:**
Cellular outages are increasing in frequency. Dead zones are no longer rare edge cases — they're expected failures.

**Content:**
- Headline: *"Outages are up. Dead zones grow larger."*
- Body: "Cellular outages have more than doubled in five years. From network congestion at festivals to complete blackouts after hurricanes, dead zones are no longer rare — they're expected. When the tower goes down, your phone becomes a brick."
- Source: scadacore.com/tools/rf-path/cell-tower-map-canada

**Visual:** Right side — Google Map screenshot of Cape Breton Island showing cell tower coverage gaps.

---

## Slide 3 – The Problem: Point of Failure Grows Larger

**Section header:** The Problem

**What the slide conveys:**
Cloud centralization and rising DDoS attacks mean the internet itself is becoming a single point of failure for businesses.

**Content:**
- Headline: *"Point-of-failure grows larger. The internet won't always be there."*
- Body: "As web-hosting resources grow more singular, and DDoS attacks escalate in both scale and raw quantity, a huge, lasting outage could hit at any moment. Many essential businesses running under these systems could see their services severely impacted when this happens, causing major damage."
- Sources: Cloudflare Q4 2025 Threat Report; Synergy Research 2025

**Visual:**
- Top right: Line chart — DDoS Attacks (millions) vs. Year, 2020–2025, rising from ~8M to ~20M
- Bottom right: Pie chart — Cloud Market Share: AWS 28%, Azure 21%, Google Cloud 14%, Alibaba 4%, Oracle 3%, Others 30%

---

## Slide 4 – Our Mission

**Section header:** Our Mission

**What the slide conveys:**
A single declarative statement reorienting the audience from problems toward the solution.

**Content:**
*"When traditional networks fail, yours shouldn't. Always have a backup plan."*

**Visual:** Full-bleed dark nebula/galaxy background. White text with "backup plan" highlighted in orange.

---

## Slide 5 – Our Solution

**Section header:** Our Solution

**What the slide conveys:**
Kuber-Tuber is an offline-first, encrypted operations hub. Three-part flow: input → hub → output.

**Content:**
- Title: *Kuber-Tuber — An Offline-First, Encrypted Operations Hub*
- Section 1 — **Input Devices:** A LoRa radio, an Ethernet device, and a Wi-Fi device.
- Section 2 — **The Hub:** One master. Three workers. A switch, and a router.
- Section 3 — **Output:** Logs and alerts on a full monitoring dashboard.
- Footer: *"You own the data. You host it. You control when to operate."*

**Visual:** Three-column layout with numbered sections. Left: photo of Cardputer ADV + LoRa module. Center: hub icon. Right: dashboard/log output visual.

---

## Slide 6 – Use Cases

**Section header:** Use Cases

**What the slide conveys:**
The platform enables three tiers of business continuity: what works today, what's nearby, and what's possible at scale.

**Content:**
- Headline: *"The Kuber-Tuber hub enables three tiers of business continuity."*

**Current — Today's features:**
- Event Security / Staff Messaging
- Refrigeration Temp Alerts
- Construction Lift Coordination
- Clinic patient intake
- Quick-Service POS management

**Near — Tomorrow's features:**
- Multi-channel Messaging
- SQLite Persistence
- SMS gateway via 4G dongle
- Stored-value offline payments

**Future — What is possible at a larger scale:**
- Solar + Battery Power
- Multiple hub mesh connections
- Matrix/Dendrite Chat
- Real-time extended auth

**Visual:** Three-column layout with green (Current), white (Near), white (Future) headers.

---

## Slide 7 – Hardware & Network Topology

**What the slide conveys:**
The physical hardware stack and the VLAN-segmented network that isolates control from workers.

**Content (right column bullet list):**
- Router Pi (Raspberry Pi 4) — *Inter-VLAN router + firewall*
- Managed switch (NETGEAR GS305E) — *Trunk port, access ports*
- Mini PC (master) — *Control Plane VLAN 10*
- worker1, worker2, worker3 (three Raspberry Pi 4s) — *Worker VLAN 20*
- LoRa HAT (on worker1) — *LoRa gateway*
- Cardputer (off to side or held) — *Field node*

**Visual:** Left side — network diagram showing Home Router → Pi Router → NETGEAR Switch, with VLAN 10 (Mini PC) and VLAN 20 (PI #1, #2, #3) colour-coded. LoRa Mod shown as a separate attached component.

---

## Slide 8 – Traffic Policing with a Router Pi

**What the slide conveys:**
Why a dedicated Raspberry Pi is used as a router, and what it does at the network layer.

**Content:**

**Why a Raspberry Pi as a router?**
*"The NETGEAR GS305E is a Layer 2 only managed switch. It can tag VLANs and isolate broadcast domains, but it cannot route between VLANs or apply firewall rules. Without a router, devices on VLAN 10 and VLAN 20 cannot communicate at all or you'd need a Layer 3 switch (expensive) or a software router. The Raspberry Pi fills that gap cheaply."*

**What it does:**
- Uses virtual interfaces from eth0 named eth0.10 & eth0.20
- Each virtual interface gets its own IP, DHCP scope, and routing table entry
- The Raspberry Pi router receives its upstream connection from the ISP modem, providing the cluster with internet when needed

**Visual:** Bottom — three-box diagram: VLAN 10 (Control • 10.0.10.0/24) ↔ Router Pi (iptables) ↔ VLAN 20 (Workers • 10.0.20.0/24). Bidirectional arrows labelled "permitted".

---

## Slide 9 – Transition: Resilience

**What the slide conveys:**
A brief tonal reset before the Kubernetes deep-dive. Frames the entire K3s section.

**Content:**
*"You can't prevent failure, but you can outlast it."*

**Visual:** Full-bleed green nebula/starfield. White text with "outlast" in orange.

---

## Slide 10 – What is Kubernetes?

**What the slide conveys:**
Kubernetes solves the problem of manual server management by automating deployment, scaling, and self-healing. K3s is the lightweight variant used here.

**Content:**

**THE PROBLEM:**
- Managing individual servers is manual.
- If a server goes down, someone has to fix it.
- You can't just "move" a running app.

**THE SOLUTION:**
- Kubernetes automates deployment, scaling, and management of containerized apps.
- Self-healing: It constantly checks state.
- We use K3s — lightweight, edge-ready.

**Visual:** Two dark panel boxes (red-accented Problem, green-accented Solution). Right side: robot/android head image.

---

## Slide 11 – How Kubernetes Works Inside Kuber-Tuber

**What the slide conveys:**
Maps Kubernetes concepts (control plane, workers, pods) onto the actual hardware. Shows which pods run where.

**Content (annotated cluster diagram):**

- **CONTROL PLANE — MeLE Mini PC**
  - Simplified IP shown: 10.0.10.201 *(diagram uses simplified IPs for readability; actual IP is 10.0.10.94)*
  - K3s API • Rancher UI • Scheduler

- **worker1** — 10.0.20.101 *(actual: 10.0.20.138)*
  - LoRa HAT attached
  - lora-receiver pod

- **worker2** — 10.0.20.102 *(actual: 10.0.20.150)*
  - rancher-0
  - metrics-server

- **worker3** — 10.0.20.103 *(actual: 10.0.20.63)*
  - Available

- Footer: *Control Plane = Brain   Workers = Muscle   Pods = Apps*

> **Note:** IPs in this diagram are simplified for presentation clarity. Current actual IPs are documented in [networking/Network-Topology.md](../networking/Network-Topology.md).

---

## Slide 12 – DEMO: Checking Cluster Status (The "Before" State)

**What the slide conveys:**
The cluster is fully healthy before the failure demonstration. Establishes the baseline.

**Content (designed static visualization slide):**
- Status bar: *✓ ALL SYSTEMS OPERATIONAL | 4/4 nodes Ready | 6/6 pods Running*
- Node grid: debian-master (Control Plane), worker1 (CPU 12% RAM 34%), worker2 (CPU 8% RAM 29%), worker3 (CPU 5% RAM 22%) — all **Ready**
- Running Pods table: lora-receiver-7d9f8 → worker1, rancher-0 → worker2, metrics-server-6f4d2 → worker2, coredns-5c9f7 → worker1
- Events Log: `kubectl get nodes` output showing all 4 nodes Ready, age 45d

> **Actual presentation note (2026-04-09):** This slide was used as a visual guide during the live Rancher demo — walking the audience through what to look for in the dashboard (node status, running pods, events log) while the real Rancher interface was shown. The slide explains the layout and labels; the live cluster confirmed the same healthy state in real time.

---

## Slide 13 – DEMO: Node Failure & Self-Healing (The "After" State)

**What the slide conveys:**
K3s automatically detects the lost node and reschedules its workloads to healthy workers with no manual intervention.

**Content (designed static visualization slide):**
- Status bar: *⚡ SELF-HEALED | 3/4 nodes Ready | 6/6 pods Running | worker2 isolated*
- Node grid: debian-master Ready, worker1 Ready (+metrics), **worker2 Offline** (CPU 0% RAM 0%, red highlight), worker3 Ready (+rancher)
- Pods After Self-Healing: lora-receiver → worker1 (unchanged), rancher-0 → worker3 (rescheduled), metrics-server → worker1 (rescheduled), coredns → worker1
- Healing Sequence log: worker2 heartbeat failed → NotReady → evicting pods → scheduling rancher-0 → worker3 → scheduling metrics → worker1 → all pods recovered
- Footer: *"Zero downtime. Zero human intervention. That's orchestration."*

> **Actual presentation note (2026-04-09):** This slide was used alongside the live Rancher demo — explaining what each part of the dashboard means (node going Offline, pods rescheduling, healing sequence) while the real failure was enacted live. Anthony physically pressed the power switch on one of the Pi workers in front of the audience; Rancher showed it go NotReady and the pods reschedule to a healthy worker, demonstrating a live workload shift. The slide served as a labelled guide to what the audience was watching.

---

## Slide 14 – What is Rancher?

**What the slide conveys:**
Rancher is the web-based management layer on top of K3s. It provides a dashboard for operating the cluster without using the command line.

**Content:**
- Rancher is a centralized control system that makes it easier to deploy, operate, secure, and monitor K3s clusters across any environment.
- The key idea is that K3s does the orchestration, while Rancher provides the dashboard and governance.

**Visual:** Two screenshots of the actual Rancher interface — Cluster Dashboard (370 total resources, 4 nodes, 17 deployments) and the Nodes view showing all four nodes Active with real IPs (debian-master 10.0.10.94, worker1 10.0.20.138, worker2 10.0.20.150, worker3 10.0.20.63) running K3s v1.34+k3s1.

---

## Slide 15 – Why Rancher?

**What the slide conveys:**
Kubernetes is powerful but the command line isn't always the right tool. Rancher adds visibility and operability for real deployments.

**Content:**

*"Kubernetes is powerful, but the command line isn't always the right tool for the job."*

*"With Kuber-Tuber: Rancher runs as a pod on the cluster (exposed via NodePort 30443). We use it to watch node health, verify pod rescheduling, and audit LoRa messages without SSH'ing into the Mini PC."*

**Features highlighted:**
- **Centralised visibility** — See all nodes, pods, and containers in one web UI
- **Log aggregation** — `kubectl logs` without opening a terminal
- **Easy Troubleshooting** — Click on a pod to see its status, restart it, or view its logs
- **Real-time monitoring** — CPU, memory, and network usage at a glance
- **Role-based Access** — Give different team members different levels of control

---

## Slide 16 – Transition: LoRa

**What the slide conveys:**
Tonal reset before the LoRa section. Frames the problem that LoRa solves.

**Content:**
*"You can't text someone who's out of range. You can't call for help in a dead zone."*

**Visual:** Full-bleed deep space nebula (red/orange/purple). White text with "out of range" and "dead zone" in orange/yellow.

---

## Slide 17 – What is LoRa?

**What the slide conveys:**
LoRa is a low-power, long-range wireless communication technology that works without Wi-Fi or cellular.

**Content:**
- LoRa (Long Range) is a wireless communication technology.
- It's designed for sending small amounts of data over long ranges using as little energy as possible.
- This makes it possible for thousands of devices to send data without the need for Wi-Fi.

**Visual:** Right side — illustrated radio tower with signal rings radiating outward.

---

## Slide 18 – What LoRa Can Do

**What the slide conveys:**
Practical specs that establish LoRa as viable for the Kuber-Tuber use case.

**Content:**
- **Range:** 1–10 kilometers (depending on geography)
- **Bandwidth:** Low — not for video or big files, but useful for small messages, including short commands or readings
- **Power:** Designed to be as low as possible, ensuring that battery powered devices can last for months to years
- **Security:** Can use encryption like AES-256 to keep messages private

**Visual:** Large white broadcast tower icon on left. Specs in bold on right.

---

## Slide 19 – It's Everywhere

**What the slide conveys:**
LoRa is already deeply embedded in existing infrastructure — the audience has almost certainly interacted with it without knowing.

**Content:**
- *"I am willing to bet that you have interacted with LoRa technology this week."*
- *"LoRa has quietly embedded itself in the cities infrastructure, from utility meters to streetlight monitoring."*

**Visual:** Large cell tower photograph. Two text callouts overlaid.

---

## Slide 20 – LoRa as Gateway

**What the slide conveys:**
Bridges the LoRa education section back to Kuber-Tuber: the receiver service is the point where the LoRa wireless world meets the offline Kubernetes cluster.

**Content:**
*"Think of the receiver as the gateway between the LoRa wireless world and our offline Kuber-Tuber cluster."*

**Visual:** Full-bleed split-panel image of Earth at night showing global network connections. LoRa and Kuber-Tuber logos in the footer text.
