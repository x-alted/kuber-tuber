# Kuber‑Tuber – Frequently Asked Questions

---

## 1. Why three worker nodes? Why not just the Mini PC or just one worker?

We used three Raspberry Pi workers (plus the Mini PC as master) for three practical reasons:

- **Demonstrate Kubernetes self‑healing** – With three workers, we could power off one (`worker2`) and show a test pod reschedule to another worker (`worker3`). With only one worker, there is no failover to demonstrate. That’s a core feature we wanted to prove.

- **Isolate the LoRa gateway** – The LoRa HAT is attached to `worker1`. LoRa processing (SPI, encryption/decryption) can be resource‑intensive. Putting it on a dedicated worker means rebooting that node for driver tests or updates doesn’t affect other workloads.

- **We had the hardware** – The team already owned three Raspberry Pi 4s. Using all of them made sense to build a realistic small‑scale cluster.

> Could we have run everything on the Mini PC alone? Technically yes, but then we wouldn’t have a distributed system, and the “pod rescheduling” demo would be impossible. The project’s goal was to learn Kubernetes, so multiple workers were necessary.

---

## 2. What did you actually test and verify?

All tests listed below were performed and passed. See `Test-Results.md` for details.

| Test | 
|------|
| Ping connectivity between all nodes |
| Inter‑VLAN routing (control plane → workers) |
| Inter‑VLAN blocking (workers → control plane) |
| LoRa unencrypted send/receive (Cardputer ↔ worker1) |
| LoRa AES‑256 encrypted message with key from Kubernetes secret |
| Rancher UI accessible at `https://192.168.2.214:30443` |
| Pod rescheduling after worker power‑off |
| Switch reboot – all nodes recover connectivity |
| Mini PC reboot – master returns with same IP, cluster recovers |

**We did not test long‑range LoRa (beyond a room) or battery/solar operation** – those were outside our project scope. Our focus was on encryption, cluster integration, and network security.

---

## 3. Why did you rebuild the K3s cluster halfway through?

We started with a flat `192.168.2.x` network and later decided to add VLANs for security. K3s does **not** easily allow changing node IPs after initialisation. Rather than hack around it, we:

- Uninstalled K3s on all nodes
- Assigned new static IPs in the VLAN subnets (`10.0.10.x` for control plane, `10.0.20.x` for workers)
- Re‑installed K3s on the master and re‑joined all workers

This taught us a valuable lesson: **plan IP ranges before installing Kubernetes**. Instructors saw this as real troubleshooting, not a failure.

---

## 4. How did you fix the Rancher bootstrap password issue?

We set `bootstrapPassword=admin` during Helm install, but the UI rejected it. Instead of reinstalling, we retrieved the actual password from the Kubernetes secret:

```bash
kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword|base64decode}}'
```

That’s a real‑world debugging skill. After login, we changed the password. The issue is documented in `Issues-Log.md`.

---

## 5. What security measures are actually in place?

| Measure | Status |
|---------|--------|
| SSH key authentication (passwords disabled) |
| UFW on each node (default deny incoming, allow SSH) |
| iptables on router Pi (default DROP on FORWARD, explicit allow rules) |
| VLAN isolation (workers cannot initiate connections to control plane) |
| LoRa AES‑256 encryption (key stored as Kubernetes secret) |
| Rancher HTTPS (self‑signed certificate) |

---

## 6. Can you explain the LoRa encryption flow step‑by‑step?

Yes. Here’s exactly what we built:

1. **Pre‑shared key** – A 32‑byte AES‑256 key was generated and stored as a Kubernetes secret named `lora-aes-key`.
2. **Cardputer firmware** – The key is embedded in the device. When the user types a message, the firmware encrypts it with AES‑256 CBC.
3. **Transmission** – The encrypted payload is sent over LoRa at 915 MHz.
4. **Reception on `worker1`** – The LoRa HAT receives the packet. A Python script (running as a Kubernetes deployment) reads from SPI.
5. **Decryption** – The script fetches the key from the mounted secret and decrypts the payload.
6. **Logging** – The plaintext message is written to a log, viewable via `kubectl logs` or Rancher UI.

We tested this end‑to‑end. An early issue (April 2: encrypted message not appearing) was fixed by ensuring the secret was correctly mounted and the script restarted.

---

## 7. Why did you use Tailscale? Is it part of the final system?

Tailscale was used **only during development** – it allowed Nick to access `worker1` remotely from home to configure the LoRa HAT without port forwarding. It is **not** required for the final air‑gapped system. We documented it in `Issues-Log.md` for completeness, but you can remove Tailscale entirely for a production deployment.

---

## 8. What real‑world problem does this solve?

Our `Use-Cases.md` describes two grounded scenarios:

- **Temporary event venues (festivals, sports)** – Cellular networks often fail or become congested. Security, medical, and parking staff need encrypted, logged communication. Our hub works offline.

- **Refrigerated warehouses / convenience stores** – Many stores use LoRa temperature sensors. If the store’s internet fails, the cloud dashboard goes dark. Our hub runs as a local backup, logging sensor data and sending alerts to staff Cardputers if a fridge warms up.

Both use cases require **no internet**, **encryption**, and **audit logging** – exactly what our project delivers.

---

## 9. What was the hardest technical problem you solved?

Two stand out from our `Issues-Log.md`:

1. **VLAN trunk on a Raspberry Pi router** – Using `systemd-networkd` with VLAN‑tagged interfaces (`eth0.10`, `eth0.20`) was new to us. We had to learn how to create `.netdev` and `.network` files, enable IP forwarding, and write `iptables` rules.

2. **K3s IP range change requiring full cluster rebuild** – As mentioned above, this was painful but educational. It forced us to plan network topology before installing orchestration tools.

Both show genuine problem‑solving, not just following a tutorial.

---

## 10. What would you add with more time?

Given unlimited time, we would add:

- A simple web dashboard to view LoRa messages (instead of `kubectl logs`)
- Matrix/Dendrite integration for a chat interface
- Battery/solar power for true portability
- Kubernetes RBAC and network policies for deeper pod isolation

But these are **enhancements**, not missing features. The core system works as designed.

---

## 11. How much power does the hub consume?

We did not formally measure power, but estimates from component specs suggest ~35‑50W total. A 100Ah 12V battery could run it for ~20 hours. We did **not** build a battery‑powered version – that remains future work.

---

## 12. Where can I find all the documentation?

All files are in the GitHub repository: `github.com/x-alted/kuber-tuber`

Key documents:
- `README.md` – overview and quick start
- `Use-Cases.md` – detailed scenarios
- `Network-Topology.md` – IP assignments and VLAN diagrams
- `Service-Configuration.md` – installation steps for every component
- `Test-Results.md` – test matrix
- `Issues-Log.md` – troubleshooting history
- `checklists/` – step‑by‑step setup guides
