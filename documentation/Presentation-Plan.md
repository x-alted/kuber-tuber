## Slide 1 – Title / Hook

**What the slide conveys:**  
The system is named Kuber‑Tuber. It is designed to operate without an internet connection, uses encryption, and automatically recovers from failures. The hardware is small enough to be portable.

**Visual content:**  
Two side‑by‑side images. Left: a representative location with no cellular coverage (e.g., a rural area, a disaster zone with downed infrastructure, or a remote industrial site). Right: a photograph of the actual hardware stack used in the project – Mini PC (master), three Raspberry Pi 4 workers, a dedicated router Pi, a NETGEAR GS305E managed switch, a Waveshare SX1262 LoRa HAT attached to one worker, and a Cardputer field device.

**Why this content:**  
The audience needs to immediately understand the problem domain (off‑grid / no internet) and the physical form of the solution. Showing the actual hardware builds credibility – it is not a theoretical design.

---

## Slide 2 – The Problem: Outages, DDoS, Centralization

**What the slide conveys:**  
Three independent, growing problems make current communication and infrastructure models fragile: cellular coverage gaps, insecure radio, and cloud centralization.

**Detailed information per problem:**

1. **Cellular dead zones**  
   - Large portions of land (especially rural, underground, mountainous, or post‑disaster) have no cellular signal.  
   - Even where coverage exists, events like natural disasters, power outages, or network congestion can render it unusable.  
   - Supporting data (if shown): FCC 2025 estimate that ~30% of US land area lacks cellular coverage.

2. **Unencrypted and unlogged radio**  
   - Walkie‑talkies and many private land‑mobile radios transmit in the clear (no encryption).  
   - Anyone with a software‑defined radio or a simple scanner can listen.  
   - No built‑in audit trail – messages are not logged, making incident reconstruction impossible.  
   - This is unacceptable for security, safety, or compliance‑sensitive operations.

3. **Cloud centralization**  
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

## Slide 3 – Mission Bridge

**What the slide conveys:**  
A simple, declarative mission statement that reorients the audience from problems to the intended outcome.

**Text:**  
*“When traditional networks fail, yours shouldn’t. Always have a backup plan.”*

**Visual:**  
Centered white text on a dark background. No graphs, no icons.

**Why this content:**  
After presenting three serious problems, the presentation needs a moment of clarity. This slide states the goal without technical detail. It serves as a mental “reset” before diving into the solution architecture.

---

## Slide 4 – Our Solution: Kuber‑Tuber Architecture

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

---

## Slide 5 – What This Enables: Three Tiers of Continuity

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

## Slide 6 – Hardware & Network Topology (VLANs)

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

## Slide 7 – Router Pi: Inter‑VLAN Firewall (The Traffic Cop)

**What the slide conveys:**  
The router Pi runs `iptables` with a default‑deny policy and only two explicit allow rules. This enforces the isolation described on Slide 6.

**Detailed information:**

**Why a dedicated router Pi is needed (callout box):**  
- The NETGEAR GS305E is a Layer 2 only switch. It can tag VLANs and isolate broadcast domains, but it cannot route between VLANs or apply firewall rules.  
- A Layer 3 switch would cost significantly more.  
- A Raspberry Pi (≈$90) running `systemd-networkd` and `iptables` provides both routing and firewalling at low cost.

**iptables configuration (FORWARD chain):**  
- Default policy: **DROP**. No traffic passes between VLANs unless explicitly allowed.  
- Allow rules:  
  1. SSH (port 22) from control plane (10.0.10.0/24) to workers (10.0.20.0/24).  
  2. K3s API (port 6443) from workers to master (10.0.10.201) – required for node registration and heartbeat.  
- Established/related connections: **ACCEPT**. This allows return traffic for permitted connections (e.g., SSH response from worker to master).  
- All other inter‑VLAN traffic: **DROP**.

**Effect on security:**  
- A worker node cannot initiate any new connection to the control plane.  
- If a worker is compromised, an attacker cannot scan or access the master, Rancher, or other control plane resources.  
- The only way to reach a worker from the control plane is via SSH (administrative access) – and that is intentional.

**Visual:**  
Traffic light icon (red, yellow, green) with a Raspberry Pi silhouette. A callout box explains the Layer 2 switch limitation. Below, a simple list of the iptables rules (default DROP, allow SSH, allow K3s API, established/related ACCEPT). A small diagram shows the router between VLAN 10 and VLAN 20 with a red X on the worker→control direction.

**Why this content:**  
The audience needs to understand that the network isolation is not just conceptual – it is enforced by a concrete, low‑cost firewall. The “why not the switch” explanation preempts a natural question.

---

# Kuber‑Tuber Presentation: Full Explanation of Slides 8–15

This document explains the **information, data, and reasoning** behind slides 8 through 15. It includes descriptions of live scripts (Slide 9 and Slide 11) and all visuals. No stage directions, no dramatics.

---

## Slide 8 – Software Stack: K3s + Rancher + LoRa Bridge

**What the slide conveys:**  
The software layers that run on the hardware, from operating system up to user interface, and which components run on which physical nodes.

**Detailed information:**

**Layered stack (bottom to top):**

1. **Hardware layer**  
   - Mini PC (master node) – x86_64, 16GB RAM, 512GB SSD.  
   - Three Raspberry Pi 4 workers (each 4GB RAM, 32GB microSD).  
   - Router Pi (separate, not part of K3s cluster).  
   - Managed switch, LoRa HAT on worker1.

2. **Operating system layer**  
   - Mini PC: Debian 13 (bookworm).  
   - Raspberry Pis: Raspberry Pi OS Lite (64‑bit).  
   - Router Pi: Raspberry Pi OS Lite (runs `systemd-networkd` and `iptables`, not part of cluster).

3. **Container runtime**  
   - `containerd` – installed by K3s on all cluster nodes. Manages container lifecycle.

4. **Orchestration layer – K3s**  
   - Lightweight Kubernetes distribution (<100 MB binary).  
   - Certified Kubernetes – `kubectl` compatible.  
   - Runs control plane components on master node (API server, controller manager, scheduler, embedded etcd).  
   - Runs kubelet and container runtime on worker nodes.  
   - Uses Flannel (VXLAN) for pod‑to‑pod networking across nodes.

5. **Application layer – custom services**  
   - **LoRa bridge (Python)** – runs directly on worker1 (not inside cluster).  
     - Listens for LoRa packets via `adafruit-circuitpython-rfm9x`.  
     - Decrypts AES‑256‑CBC payloads using a pre‑shared key.  
     - Extracts sequence number and message text.  
     - Rejects packets with sequence number <= last seen (replay protection).  
     - Forwards accepted messages via HTTP POST to the receiver pod inside the cluster.  
   - **Receiver pod (Flask)** – runs inside K3s cluster (scheduled on any worker).  
     - Exposes `/api/v1/messages` endpoint.  
     - Accepts JSON: `{"seq": int, "message": str, "source": str, "timestamp": float}`.  
     - Validates fields and sequence numbers per source.  
     - Logs message to stdout (captured by Kubernetes).  
     - Returns 200 OK on success, 4xx on error.  
   - **Rancher** – runs on Mini PC master (deployed via Helm).  
     - Web UI for cluster management (nodes, pods, logs, deployments).  
     - Accessible via NodePort `30443` at `https://10.0.10.201:30443`.  
     - Uses self‑signed TLS certificate.

**Where each component runs (side labels in diagram):**  
- K3s master – Mini PC (10.0.10.201)  
- K3s workers – worker1, worker2, worker3 (10.0.20.x)  
- LoRa bridge – worker1 (bare metal)  
- Receiver pod – scheduled by K3s on any worker  
- Rancher – Mini PC (Helm deployment)

**Why this separation:**  
- The LoRa bridge runs outside the cluster to avoid overhead of container networking for radio hardware access.  
- The receiver pod runs inside the cluster to benefit from self‑healing (if a worker fails, the pod reschedules).  
- Rancher on the master node keeps management separate from worker workloads.

**Visual:**  
Layered cake diagram with six horizontal bands (Hardware, OS, containerd, K3s, Application, Rancher). Each band has a distinct color. On the right side, text labels pointing to specific components (e.g., “LoRa bridge runs on worker1 (bare metal)”, “Receiver pod runs in cluster”).

---

## Slide 9 – Self‑Healing: Node Failure Demo (Live Script)

**What the slide conveys:**  
K3s automatically reschedules pods from a failed worker node to a healthy worker, with no manual intervention. This is demonstrated live using a terminal.

**Information demonstrated live:**

**Prerequisites (must be set before presentation):**  
- K3s cluster running with master (Mini PC) and three workers (worker1, worker2, worker3).  
- A test deployment exists: `nginx-test` with 1 replica.  
- The presenter has a terminal open on the Mini PC (SSH or local) with `kubectl` access.  
- The physical worker2 node is accessible for power disconnection.

**Live script steps (executed by presenter):**

1. **Show current node status**  
   - Command: `kubectl get nodes -o wide`  
   - Expected output: All three workers listed as `Ready` with their IP addresses (10.0.20.208, 10.0.20.207, 10.0.20.202).

2. **Show current pod placement**  
   - Command: `kubectl get pods -o wide`  
   - Expected output: `nginx-test` pod is running on one worker (e.g., worker2).

3. **Fail worker2**  
   - Presenter physically unplugs worker2’s power or Ethernet cable.

4. **Show node status after failure**  
   - Command: `kubectl get nodes` (repeated every 10 seconds for about 40 seconds).  
   - Expected output: worker2 transitions from `Ready` to `NotReady`. The timestamp of the last heartbeat is shown.

5. **Observe pod rescheduling**  
   - Command: `kubectl get pods -o wide -w` (watches changes).  
   - Within 30–45 seconds (K3s default pod eviction timeout), the `nginx-test` pod’s status changes to `Terminating` on worker2, then `Running` on another worker (worker1 or worker3).

6. **Verify rescheduling**  
   - Command: `kubectl get pods -o wide` (final).  
   - Expected output: Pod now running on a different worker. The node list still shows worker2 as `NotReady`.

**Data recorded (for credibility, can be shown as a small table on slide):**  
- Time from node failure to pod rescheduling: approximately 35 seconds (measured).  
- No manual commands other than `kubectl get` were used to move the pod.

**Why this works:**  
K3s uses the same pod eviction mechanism as standard Kubernetes. When the kubelet on worker2 stops reporting to the API server, the control plane marks the node `NotReady` after the `node-monitor-grace-period` (default 40 seconds). Then the scheduler moves the pods to other nodes.

**Visual on slide:**  
Two panels – left panel shows healthy cluster (green worker icons, pod on worker2). Right panel shows failed state (worker2 red, pod moved to worker3). Below the panels, a timeline bar with t=0 (failure), t=30‑45s (reschedule). The slide does not contain the live terminal output; the terminal is shown separately (e.g., projected on a second screen or as an overlay).

**Fallback:**  
If the live hardware fails (e.g., worker2 does not power off cleanly), the presenter has a pre‑recorded video or screenshot sequence of the same commands.

---

## Slide 10 – LoRa Data Flow + Cardputer Encryption

**What the slide conveys:**  
The exact path a message takes from the Cardputer field device to the cluster logs, including encryption, replay protection, and retry mechanism.

**Detailed information:**

**End‑to‑end data flow:**

1. **Cardputer (field device)**  
   - User types a message on the built‑in keyboard.  
   - Firmware (C++, PlatformIO) performs:  
     - Reads the current sequence number from non‑volatile storage (NVS).  
     - Constructs plaintext: `<seq>|<message>` (e.g., `42|Hello`).  
     - Generates a random 16‑byte Initialization Vector (IV).  
     - Encrypts with AES‑256‑CBC using a pre‑shared 32‑byte key.  
     - Applies PKCS#7 padding to make ciphertext a multiple of 16 bytes.  
     - Prepends the IV to the ciphertext.  
     - Encodes the result as Base64.  
   - Transmits the Base64 string over LoRa (915 MHz, spreading factor 9, bandwidth 125 kHz, coding rate 4/7).  
   - Waits for an ACK packet from the gateway.  
   - If no ACK received within 1500 ms, retries up to 3 times.  
   - On ACK, increments sequence number and saves to NVS.  
   - On failure after 3 retries, shows red flash and does not increment sequence number.

2. **LoRa radio link (915 MHz)**  
   - Raw transmission range: up to several kilometers line‑of‑sight.  
   - Indoor/urban range: 100‑500 meters depending on obstructions.  
   - Data rate: approximately 250 bps to 5 kbps (due to spreading factor).  
   - No link‑layer encryption – security is provided by application‑layer AES.

3. **worker1 (LoRa gateway)**  
   - LoRa HAT (Waveshare SX1262) receives the packet.  
   - Python bridge service (`lora_bridge.py`) runs as a systemd unit.  
   - Steps performed by bridge:  
     - Decodes Base64 to bytes.  
     - Splits IV (first 16 bytes) and ciphertext.  
     - Decrypts with AES‑256‑CBC using the same key.  
     - Removes PKCS#7 padding.  
     - Splits plaintext at the first `|` to extract sequence number and message.  
     - Checks if the sequence number is greater than the last seen for that source. If not, rejects and logs “Replay attack detected”.  
     - Constructs JSON payload: `{"seq": <n>, "message": "...", "source": "cardputer", "timestamp": <unix>}`.  
     - Sends HTTP POST to `http://lora-receiver.lora-demo.svc.cluster.local:8080/api/v1/messages`.  
     - If HTTP 200 OK, sends an ACK packet (plain text `ACK:<seq>`) back to the Cardputer.  
     - If HTTP error or timeout, does not send ACK (Cardputer will retry).

4. **Receiver pod (inside K3s cluster)**  
   - Flask application listens on port 8080.  
   - On POST `/api/v1/messages`:  
     - Validates JSON structure and field types.  
     - Performs secondary replay protection (maintains in‑memory `last_seq` per source).  
     - Logs to stdout using Flask’s `app.logger.info`.  
     - Returns `200 OK` with `{"status": "accepted"}`.  
   - Health check endpoint `/health` returns `200 OK`.  
   - Logs are captured by Kubernetes and can be viewed with `kubectl logs`.

5. **Log viewing**  
   - Via `kubectl logs -n lora-demo deployment/lora-receiver`.  
   - Via Rancher UI (pod logs tab).  
   - Log format: `ACCEPTED: 2026-04-07T14:32:01 | cardputer | seq 42 | Hello`.

**Encryption key management:**  
- Same 32‑byte AES key is hardcoded in both Cardputer firmware and bridge script (for the demo).  
- In production, key would be stored as a Kubernetes secret and mounted into the bridge pod (or read from a secure file on worker1).  
- Key is never transmitted over any network.

**Replay protection details:**  
- Cardputer increments sequence number only after receiving an ACK.  
- Bridge maintains a dictionary `last_seq` keyed by source (e.g., `"cardputer"`).  
- If incoming `seq <= last_seq[source]`, packet is rejected.  
- This prevents an attacker from capturing a valid encrypted packet and replaying it later.

**Retry mechanism:**  
- Cardputer waits 1500 ms for ACK.  
- Retries up to 3 times.  
- After 3 failures, aborts and does not increment seq.  
- This ensures no messages are lost due to transient interference.

**Visual:**  
Flow diagram from left to right: Cardputer icon → LoRa waves → worker1 icon (bridge) → HTTP arrow → receiver pod icon → log file icon. Callout boxes next to each step: “AES‑256‑CBC + seq counter”, “Replay protection”, “HTTP POST to cluster service”, “Logs to stdout”. A small code snippet from the Cardputer firmware shows the encryption call.

---

## Slide 11 – Live Demo (Full Script)

**What the slide conveys:**  
A live demonstration of the complete system: sending a message from the Cardputer, observing it in the logs, testing replay protection, and showing resilience to gateway failure.

**Live demo script – step by step:**

**Prerequisites (set up before presentation):**  
- K3s cluster running.  
- Receiver pod deployed in `lora-demo` namespace.  
- Terminal window A: `kubectl logs -f -n lora-demo deployment/lora-receiver` (showing live logs).  
- Terminal window B (optional): `kubectl get nodes -w` to show node status.  
- Cardputer powered on, firmware loaded, paired with LoRa gateway (worker1).  
- worker1 (LoRa gateway) online, bridge service running (`systemctl status lora-bridge`).  
- A second terminal (or same as A) ready for `kubectl` commands.

**Step 1 – Normal send**  
- Presenter types a message on Cardputer: `Hello Kuber-Tuber` (or any short text).  
- Presses Send button.  
- Within 2‑3 seconds, terminal A shows a log line:  
  `ACCEPTED: 2026-04-07T14:32:01 | cardputer | seq 1 | Hello Kuber-Tuber`.  
- Cardputer screen flashes green (ACK received).  
- Sequence number on Cardputer increments (display shows `Seq: 2`).

**Step 2 – Replay attack test**  
- Presenter sends the **exact same message again** (without typing new text, just press Send).  
- Bridge detects that the sequence number has not increased (seq=1 again).  
- Bridge logs to its own journal (not visible in receiver logs) a message: `Replay attack detected! seq=1 <= last_seq=1`.  
- Receiver pod receives **no** HTTP POST (bridge rejects before forwarding).  
- Cardputer does **not** receive an ACK (because bridge did not send one).  
- Cardputer retries 3 times, then shows red flash.  
- Presenter points out that no new log appears in terminal A.  
- The sequence number on Cardputer remains `2` (unchanged).

**Step 3 – Gateway failure and recovery**  
- Presenter physically unplugs worker1’s Ethernet cable (or power).  
- Sends a new message from Cardputer: `Test after failure`.  
- Cardputer transmits, but no ACK returns (bridge is down).  
- Cardputer retries 3 times, red flash. No log appears.  
- Presenter replugs worker1.  
- Waits 15‑30 seconds for worker1 to reboot (if power was unplugged) or for network to restore and systemd to restart the bridge service.  
- Sends another new message: `Back online`.  
- This time, ACK returns, log appears in terminal A.  
- Cardputer increments sequence number.

**Step 4 (optional) – Show pod rescheduling (if time permits)**  
- Presenter unplugs worker2 (not worker1).  
- Shows `kubectl get nodes` – worker2 becomes `NotReady`.  
- Shows receiver pod is still running on worker1 or worker3 (using `kubectl get pods -o wide`).  
- Sends another message from Cardputer – still works because worker1 is still up.  
- Replugs worker2, shows it rejoins as `Ready`.

**Data recorded during demo (for credibility):**  
- Latency from Send to log appearance: approximately 1‑2 seconds (measured).  
- Retry count before failure: 3 (hardcoded in firmware).  
- Gateway recovery time: about 30 seconds (systemd restarts bridge automatically on network restore).

**Fallback plan:**  
- If Cardputer battery dies or firmware fails, the presenter switches to the `demo_simulator.py` script (from Slide 5) running on the Mini PC, which sends HTTP POSTs directly to the receiver pod, simulating the same messages.  
- If terminal A does not show logs, the presenter has pre‑recorded screenshots of a successful run.

**Visual on slide:**  
Large “LIVE DEMO” text. A mock terminal window showing an example log line. Small icons indicating Cardputer, LoRa, worker1, receiver pod. No live output is embedded in the slide – it is shown via the actual terminal projection.

---

## Slide 12 – Test Results & Security at a Glance

**What the slide conveys:**  
Quantitative test results for the system’s performance and a summary of security controls.

**Test results (left half of slide):**

**End‑to‑end latency** (Cardputer → logs):  
- Minimum: 400 ms  
- Maximum: 800 ms  
- Average: 520 ms (over 31 test runs)  
- Measured using timestamp in Cardputer firmware and receiver log timestamps.

**Packet loss over LoRa (915 MHz, indoor, one interior wall):**  
- Line‑of‑sight, 10 meters: <1% loss  
- One interior wall, 20 meters: 10‑15% loss  
- Two interior walls, 30 meters: 25‑30% loss  

**Retry effectiveness:**  
- With 3 retries (1500 ms timeout each), successful delivery after initial loss: >95% (for wall scenarios).  
- Without retries: delivery rate drops to 70‑85% in same conditions.

**Cluster resilience test results:**  
- Worker node failure detection time: 40 seconds (K3s default).  
- Pod rescheduling time: additional 5‑10 seconds (total ~45‑50 seconds).  
- No data loss for stateless workloads (receiver pod reschedules, but in‑flight messages not yet acknowledged could be lost).  
- Receiver pod downtime during reschedule: approximately 10‑15 seconds.

**Security summary (right half of slide):**

**Host security:**  
- SSH key authentication only (Ed25519). Password authentication disabled on all nodes.  
- Fail2ban installed and running.  
- UFW default deny incoming; only SSH (port 22) and necessary K3s ports allowed.  
- Unnecessary services (Bluetooth, Wi‑Fi) disabled on Raspberry Pis.

**Network security:**  
- Three VLANs (management, control plane, workers) – Layer 2 isolation.  
- Router Pi enforces default DROP on FORWARD chain with `iptables`.  
- Only SSH (port 22) and K3s API (port 6443) permitted from control plane to workers.  
- Workers cannot initiate new connections to control plane.  
- Established/related traffic allowed back.

**LoRa security:**  
- AES‑256‑CBC encryption (pre‑shared key).  
- Sequence number with replay protection (bridge rejects seq <= last_seq).  
- No plaintext message ever transmitted over radio.

**Kubernetes security:**  
- RBAC enabled; least privilege service accounts.  
- Secrets encrypted at rest (K3s uses AES‑GCM for etcd).  
- Network policies (planned: default deny in `lora-demo` namespace).  
- Pod security standards (baseline) enforced.

**Risk assessment summary (optional small heat map):**  
- High risks mitigated: encryption key storage (now as Kubernetes secret), switch default password (changed), SSH key passphrase (enforced).  
- Residual accepted risks: LoRa jamming (operational limitation), pod breakout (unlikely with up‑to‑date containerd).

**Visual:**  
Left half – bar chart of latency (min, max, avg) and packet loss percentages. Right half – shield icon with sub‑icons: key (SSH), lock (AES), VLAN tag, fire (iptables). Small heat map with red/yellow/green cells for top risks.

---

## Slide 13 – Challenges We Overcame

**What the slide conveys:**  
Specific technical obstacles encountered during development and the solutions implemented. This builds credibility by showing that the system was tested against real problems.

**Three primary challenges (each with icon):**

**Challenge 1 – K3s IP address change**  
- **Problem:** After initially building the cluster with 192.168.2.x IPs, the team changed to 10.0.x.x subnets for VLAN segmentation. K3s does not support changing node IP addresses after initialisation.  
- **Solution:** Completely uninstalled K3s from all nodes (`k3s-uninstall.sh` and `k3s-agent-uninstall.sh`), then reinstalled with new static IPs. The cluster was rebuilt from scratch.  
- **Lesson learned:** Plan IP addressing before cluster creation. Document static IPs early.

**Challenge 2 – Rancher bootstrap password not working**  
- **Problem:** After Helm installation of Rancher, the default bootstrap password (`admin`) did not work. The login page rejected it.  
- **Solution:** Retrieved the actual password from the Kubernetes secret `bootstrap-secret` in the `cattle-system` namespace using `kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword|base64decode}}'`.  
- **Lesson learned:** Rancher generates a random password if not explicitly set; the Helm `bootstrapPassword` parameter is only for initial setup and may be ignored in some versions.

**Challenge 3 – VLAN trunking on Raspberry Pi**  
- **Problem:** The NETGEAR GS305E switch is Layer 2 only, so inter‑VLAN routing required a separate router. The team chose a Raspberry Pi, but configuring VLAN‑tagged interfaces on Raspberry Pi OS was not straightforward.  
- **Solution:** Used `systemd-networkd` instead of `/etc/network/interfaces`. Created `.netdev` files for VLANs (`eth0.10` and `eth0.20`) and `.network` files for IP assignment. Enabled `8021q` kernel module.  
- **Lesson learned:** `systemd-networkd` is more reliable for VLANs on modern Raspberry Pi OS than legacy `ifupdown`.

**Additional minor challenges (listed as text, not icons):**  
- LoRa HAT detection required enabling SPI via `raspi-config` and verifying CS pin (CE0 vs CE1).  
- Cardputer firmware required implementing AES‑256‑CBC with mbedtls and persistent sequence storage in NVS.  
- Replay protection required careful state management between bridge and receiver.

**Visual:**  
Three large icons (tombstone or warning sign) with short labels: “K3s IP change”, “Rancher password”, “VLAN on Pi”. Below each, one sentence describing the solution. A timeline or checklist style.

---

## Slide 14 – Future Work (Roadmap)

**What the slide conveys:**  
Potential enhancements that build on the current architecture. These are not implemented but are feasible with additional development.

**Four roadmap items (left to right, with icons and brief technical descriptions):**

1. **Web dashboard for messages**  
   - Replace `kubectl logs` with a real‑time web UI.  
   - Use a simple Node.js or Flask app that reads from the PostgreSQL pod (or directly from receiver logs via WebSocket).  
   - Expose via NodePort or Ingress.  
   - Effort: days.

2. **Matrix / Dendrite chat integration**  
   - Deploy Dendrite (Matrix server) on K3s.  
   - Write a bridge that translates LoRa messages into Matrix events and vice versa.  
   - Allows any Matrix client (Element) to send/receive messages over the LoRa mesh.  
   - Effort: weeks.

3. **Solar + battery power**  
   - Replace AC power with solar charge controller, deep‑cycle battery (100Ah 12V), and DC‑DC converters.  
   - Total power draw: Mini PC (~10W), three workers (~5W each), router Pi (~3W), switch (~3W) = ~30W.  
   - 100Ah battery provides ~1200Wh, sufficient for 40 hours without solar.  
   - 200W solar panel can recharge in 6‑8 hours of full sun.  
   - Effort: weeks (electrical engineering + enclosure).

4. **Over‑the‑air key rotation**  
   - Design a protocol to push a new AES key to all Cardputer field devices over LoRa, encrypted with the old key.  
   - Implement key versioning in firmware and bridge.  
   - Requires careful rollback and error handling (a device might miss the update).  
   - Effort: weeks to months.

**Additional future ideas (smaller text):**  
- Multi‑hub LoRa mesh (forward messages between clusters).  
- Stored‑value offline payments (pre‑authorized wallets).  
- Persistent message database with full‑text search.

**Visual:**  
Horizontal roadmap with four arrows or milestone markers. Each marker has an icon (dashboard, chat bubble, sun, key) and a short label. Below the roadmap, a small table of effort estimates (days / weeks / months).

---

## Slide 15 – Thanks + Q&A

**What the slide conveys:**  
Acknowledgement of the audience, reference to the open‑source repository, and invitation for questions.

**Visual:**  
Team photo (optional) or the Kuber‑Tuber logo. Large text: “github.com/x-alted/kuber-tuber”. Smaller text: “All code, documentation, and hardware BOM available under MIT license.”

**Information on slide:**  
- Repository URL.  
- License (MIT).  
- A short list of key documents in the repo:  
  - `README.md` – overview and quick start.  
  - `System-Architecture.md` – detailed design.  
  - `Hardware-BOM.md` – bill of materials with prices.  
  - `Use-Cases.md` – three‑tier use case breakdown.  
  - `Threat-Model.md` and `Risk-Assessment.md` – security analysis.  
  - Setup checklists for networking, Kubernetes, LoRa, and hardening.  
  - Cardputer firmware (PlatformIO) and bridge/receiver Python scripts.

**No speaker notes – the slide stands alone as a reference.**

---
