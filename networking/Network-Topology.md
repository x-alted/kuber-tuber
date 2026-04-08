# Kuber-Tuber Network Topology

**Last updated:** April 8, 2026

---

## IP Assignments

| Device       | Hostname       | IP Address      | VLAN | Role                              |
|--------------|----------------|-----------------|------|-----------------------------------|
| Pi Router    | RaspRouter     | 192.168.2.229   | —    | Inter-VLAN routing, DHCP, iptables firewall |
| Mini PC      | debian-master  | 10.0.10.94      | 10   | K3s master, control plane         |
| worker1      | worker1        | 10.0.20.138     | 20   | K3s worker, LoRa gateway (E22-900T22S) |
| worker2      | worker2        | 10.0.20.150     | 20   | K3s worker                        |
| worker3      | worker3        | 10.0.20.63      | 20   | K3s worker                        |
| Switch       | GS305E         | 10.0.1.58       | 1    | NETGEAR GS305E managed switch     |

> `10.0.10.93` is a dynamic secondary address on the Mini PC and is not used for cluster communication.

---

## VLAN Configuration

| VLAN | Subnet         | Purpose                          |
|------|----------------|----------------------------------|
| 1    | 10.0.0.0/24    | Management (switch web UI)       |
| 10   | 10.0.10.0/24   | Control plane (master node)      |
| 20   | 10.0.20.0/24   | Workers and LoRa gateway         |

---

## Switch Port Assignments (NETGEAR GS305E)

| Port | Connected to   | Mode   | VLAN          |
|------|----------------|--------|---------------|
| 1    | Router Pi      | Trunk  | Tagged 10, 20 |
| 2    | debian-master  | Access | Untagged 10   |
| 3    | worker1        | Access | Untagged 20   |
| 4    | worker2        | Access | Untagged 20   |
| 5    | worker3        | Access | Untagged 20   |

---

## Router Pi Firewall (iptables)

Default policy on `FORWARD` chain: **DROP**

| Allowed direction          | Protocol/Port | Purpose                        |
|----------------------------|---------------|--------------------------------|
| VLAN 10 → VLAN 20          | TCP 22        | SSH from master to workers     |
| VLAN 20 → VLAN 10          | TCP 6443      | K3s agent → API server         |
| ESTABLISHED/RELATED        | any           | Return traffic for above rules |

Workers cannot initiate new connections to the control plane subnet.

---

## Rancher Access

Rancher is deployed via Helm on the K3s cluster. NodePort access:

```
https://10.0.10.94:30443
```

> A Rancher service IP update (re-install) may be required — check current pod status with `kubectl get svc -n cattle-system`.
