# Kuber-Tuber · Google Slides Apps Script — Setup Guide

## Files

**Kubernetes node demo**

| File | Purpose |
|---|---|
| `Code.gs` | Cluster constants, menu, shared utilities (shared by both demos) |
| `SlideSetup.gs` | Builds the K8s node demo slide |
| `Simulation.gs` | Three K8s phases (status → failure → heal) + reset |
| `ControlPanel.html` | K8s demo sidebar |

**LoRa live feed demo**

| File | Purpose |
|---|---|
| `LoRaSlide.gs` | Builds the LoRa live feed slide (3 panels + buttons) |
| `LoRaDemo.gs` | 36-message / ~3-min simulation across 3 scenarios |
| `LoRaPanel.html` | LoRa demo sidebar |

---

## Installation

1. Open your Google Slides presentation.
2. Go to **Extensions → Apps Script**.
3. Delete the default empty `Code.gs` content.
4. Create the following files (use the **+** button for new files):

| Apps Script file | Type | Name in editor |
|---|---|---|
| `Code.gs` | Script | `Code` |
| `SlideSetup.gs` | Script | `SlideSetup` |
| `Simulation.gs` | Script | `Simulation` |
| `LoRaSlide.gs` | Script | `LoRaSlide` |
| `LoRaDemo.gs` | Script | `LoRaDemo` |
| `ControlPanel.html` | HTML | `ControlPanel` |
| `LoRaPanel.html` | HTML | `LoRaPanel` |

   > For HTML files: click **+** → **HTML** → name without `.html` extension.

5. Save all files (**Ctrl+S**).
6. Close Apps Script and reload the presentation.
7. A new menu **⚡ Kuber-Tuber Demo** will appear.

---

## First Run — K8s Node Demo

1. **⚡ Kuber-Tuber Demo → K8s Node Demo → ① Setup Demo Slide**
   - Appends a new blank slide at the end of the deck.
   - Builds the dark-themed node grid, pod table, events log, and buttons.
   - Accept the authorization prompt when asked.

2. **Activate in-slide buttons** (edit mode only):
   - Right-click **▶ Check Status** → *Assign script* → type `showNodeStatus`
   - Right-click **⚡ Simulate Failure** → *Assign script* → type `simulateNodeFailure`
   - Right-click **✦ Watch Self-Heal** → *Assign script* → type `watchSelfHealing`
   - Right-click **↺ Reset** → *Assign script* → type `resetDemo`

   > Note: Assigned scripts fire in **editor mode only**. For a live presentation, use the sidebar instead.

3. **For live presenting**: Open **⚡ Kuber-Tuber Demo → Open Control Panel** before going into presentation mode. The sidebar stays open and all four buttons work from there.

---

## Demo Sequence

Run in this order:

| Step | Action | What happens |
|---|---|---|
| ① | **Check Node Status** | Refreshes all 4 nodes to healthy, populates log with `kubectl get nodes` output |
| ② | **Simulate Node Failure** | Ramps CPU/RAM on worker2 (58% → 96% → 100%), then drops it offline; pods marked Evicted |
| ③ | **Watch Self-Healing** | K3s reschedules `rancher-0` → worker3 and `metrics-server` → worker1; both go Pending → Running |
| ↺ | **Reset** | Returns all shapes to initial state |

Steps ② and ③ contain `Utilities.sleep()` calls for visual pacing — each takes roughly 8–15 seconds to complete.

---

## First Run — LoRa Live Feed Demo

1. **⚡ Kuber-Tuber Demo → LoRa Live Feed → ① Setup LoRa Slide**
   - Appends a second blank slide with: scrolling bridge log (left), incoming packet panel (right top), decrypted message panel (right bottom), and 5 buttons.

2. **Activate in-slide buttons** (same right-click → Assign script process):

| Button | Function name |
|---|---|
| ▶ Full Demo (~3 min) | `runFullLoRaDemo` |
| ② Event Security | `runLoRaScenario1` |
| ③ Temperature | `runLoRaScenario2` |
| ④ Lift Coord | `runLoRaScenario3` |
| ↺ Reset | `resetLoRaSlide` |

3. **For live presenting**: **⚡ Kuber-Tuber Demo → LoRa Live Feed → Open LoRa Control Panel**

---

## LoRa Demo — What each scenario shows

| Scenario | Duration | Devices | Key moment |
|---|---|---|---|
| **① Event Security** | ~60s | CARD-01 through CARD-04 | Crowd surge WARN → medical response → all clear |
| **② Temperature** | ~60s | SENS-FZ1/FZ2/RF1/RF2 | FRZ-1 rising temp → CRIT alert → compressor reset |
| **③ Lift Coordination** | ~60s | CARD-11 through CARD-13 | Wind speed WARN → ALL HALT → all clear → resume |

Each message cycle shows the real bridge log format from `LoRa-Bridge.py`:
```
[bridge] RX (88 chars): 6K8mP3xR+1vNq2wZt4yLs5b...
[bridge]   seq=N msg='plaintext message'
[bridge]   Forwarded OK → sending ACK
[bridge]   ACK:N sent to CARD-xx
```

---

## Cluster Reference (actual build values)

| Node | Hostname | IP | VLAN |
|---|---|---|---|
| Master | `debian-master` | `10.0.10.94` | 10 |
| Worker 1 (LoRa) | `worker1` | `10.0.20.138` | 20 |
| Worker 2 (demo target) | `worker2` | `10.0.20.150` | 20 |
| Worker 3 | `worker3` | `10.0.20.63` | 20 |

Pods used in simulation match the actual `lora-receiver.yaml` manifest (`lora-receiver` in `lora-demo` namespace) plus K3s system pods.
