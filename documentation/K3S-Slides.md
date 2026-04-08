This is an excellent capstone project, and the live demo is the perfect way to showcase the "magic" of Kubernetes. The key is to translate abstract orchestration concepts directly into your specific hardware (the Mini PC master and the three Raspberry Pi workers).

Here is a slide-by-slide outline and content plan for Nathan's Kubernetes section, designed to integrate seamlessly with the Google Slides scripts you've already built.

---

### Slide Title: What is Kubernetes? (The "Why")

**Visual Concept:** A simple, clean slide. On the left, a chaotic stack of servers with cables everywhere. On the right, a single, orderly control panel icon. An arrow points from left to right.

**Content (Bullet points, spoken by Nathan):**

- **The Problem:** Managing individual servers (our Pis and Mini PC) is manual. If a server goes down, someone has to go fix it. You can't just "move" a running app.
- **The Solution (Kubernetes):** An open-source system that automates the deployment, scaling, and management of applications (which we run in "containers").
- **Think of it as a self-healing robot for your hardware.**
    - **You tell it the "desired state"** (e.g., "keep 1 copy of the receiver app running").
    - **Kubernetes makes it happen.** It constantly checks the real state against your desired state.
- **We use K3s (pronounced "K3s"):** A lightweight, certified version of Kubernetes, perfect for low-power, edge devices like our Raspberry Pi cluster.

**Speaker Notes (Nathan):**
> "Before Kubernetes, managing four computers as one system would be a nightmare. You'd have to manually log into each one. Kubernetes acts like a foreman. You tell the foreman, 'I need my message receiver app to always be running,' and the foreman assigns it to an available worker and constantly checks on it. If a worker gets sick, the foreman instantly moves that job to a healthy one. We chose K3s specifically because it's tiny and designed for exactly this kind of edge computing hardware."

---

### Slide Title: How Kubernetes Works Inside Kuber-Tuber

**Visual Concept:** A diagram of your cluster. At the top, a box labeled **"Control Plane (Mini PC - 10.0.10.201)"**. Below it, three boxes for **Worker 1, 2, 3 (10.0.20.x)**. Arrows show the control plane sending instructions to the workers. Inside the Worker 1 box, draw a small gear labeled **"lora-receiver pod"**.

**Content (Annotated Diagram):**

- **The Master Node (Control Plane):** Our MeLE Quieter 4C Mini PC.
    - It runs the **K3s control plane**.
    - It makes all the global decisions: "Where should the receiver app run?" "Is worker2 still alive?"
    - It hosts the **Rancher dashboard** (the web UI we use to monitor everything).

- **The Worker Nodes:** Our three Raspberry Pi 4s (`worker1`, `worker2`, `worker3`).
    - These are the labor. They do the actual work of **running our applications** inside "pods".
    - **Pod:** A pod is just a wrapper for one or more containers. Our main application, the `lora-receiver`, runs inside a pod.
    - **`worker1` is special:** It runs the LoRa bridge service *on the host* to talk to the radio HAT, but the main `lora-receiver` *pod* could be running on `worker2` or `worker3`.

- **The Secret Sauce (The "Desired State"):** A simple YAML file.
    - "Run 1 pod of the `lora-receiver` image."
    - "Always restart it if it crashes."
    - "If its node dies, find it a new home."

**Speaker Notes (Nathan):**
> "This diagram is our entire world. The Mini PC is the brain—the control plane. It doesn't do the listening for LoRa messages; it just tells the workers what to do. The three Pis are the muscle. You can see `worker1` has the LoRa radio attached, but the actual software that logs the message, the `lora-receiver` pod, could be on any of them. Kubernetes uses a simple recipe, a YAML file, that says, 'Run this app, keep it alive, and if its home breaks, move it.' That's the self-healing we're about to show you."

---

### Slide Title: LIVE DEMO: Checking Cluster Status (The "Before" State)

**Visual Concept:** This slide is *not* a static image. This is the slide you will run the `setupDemoSlide()` and `showNodeStatus()` functions on. It will contain the live, interactive node grid and pod table created by your Google Slides script.

**Pre-Slide Setup (Crucial!):**
1.  Run **`⚡ Kuber-Tuber Demo → K8s Node Demo → ① Setup Demo Slide`** to create the blank slide with the node grid.
2.  Right-click the **"▶ Check Status"** button on that new slide and assign the script `showNodeStatus`.
3.  (Optional but recommended) Assign scripts to the other buttons as per your `SETUP.md`.

**What the Audience Sees (You click "▶ Check Status"):**

- **The Node Grid:** Four boxes update to show all nodes as **`Ready`**.
    - `debian-master` (Control Plane)
    - `worker1` (Healthy, low CPU/RAM)
    - `worker2` (Healthy, low CPU/RAM)
    - `worker3` (Healthy, low CPU/RAM)
- **The Pod Table:** Shows all 6 pods (including `lora-receiver-7d9f8`, `rancher-0`, etc.) with a status of **`Running`** and their assigned nodes.
- **The Events Log:** Populates with `kubectl get nodes` output, confirming all 4 nodes are ready.

**Speaker Notes (Nathan):**
> "Let's look at the live dashboard I've built into these slides. This is talking to a simulation of our actual cluster. I'm going to click 'Check Status'. You'll see our four nodes, their IP addresses, and most importantly, their status: 'Ready'. Down in the pod table, you can see our `lora-receiver` is happily running on `worker1`, and Rancher is on `worker2`. Everything is green. This is our healthy cluster."

---

### Slide Title: LIVE DEMO: Simulating Node Failure & Self-Healing (The "After" State)

**Visual Concept:** The *exact same slide* as the previous one. You will now click the next buttons in sequence.

**The Demonstration (You click "⚡ Simulate Failure" then "✦ Watch Self-Heal"):**

1.  **Click "⚡ Simulate Failure":**
    - The audience watches as the **`worker2`** node box changes color.
    - Its CPU/RAM meters spike (58% -> 96%).
    - Its status changes from `Ready` -> `NotReady` -> `Offline`.
    - The Events Log shows heartbeat failures and eviction notices.
    - The Pod Table updates: `rancher-0` and `metrics-server` (which were on `worker2`) change status to **`Evicted`**.

2.  **Click "✦ Watch Self-Heal":**
    - The Events Log shows: *"Scheduler selecting replacement nodes..."*
    - The Pod Table updates: `rancher-0` and `metrics-server` change status to **`Pending`** on `worker3` and `worker1`.
    - After a few seconds, their status changes to **`Running`**.
    - The status bar at the top updates to: **`"Self-healed | 3/4 nodes Ready | 6/6 pods Running | worker2 isolated"`**

**Speaker Notes (Nathan):**
> "Now watch what happens when we lose a node. I'm clicking 'Simulate Failure' on `worker2`. See the CPU spike? It's overwhelmed. And... it's gone. `NotReady`. The pods on it are marked 'Evicted'. In a non-Kubernetes world, someone would have to drive to the server room.
>
> But watch this. I click 'Watch Self-Healing'. Kubernetes sees that `worker2` is dead. It looks at my desired state YAML and says, 'I need one Rancher pod and one metrics-server pod running.' It instantly schedules them on the two healthy nodes, `worker3` and `worker1`. They go from 'Pending' to 'Running' in seconds. The system healed itself. Our LoRa gateway on `worker1` never stopped, and the management UI on Rancher just reappeared on a different node. That's the power of orchestration for off-grid resilience."
