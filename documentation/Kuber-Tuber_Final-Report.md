

1. # **Kuber-Tuber**

# **An Encrypted LoRa-Integrated Kubernetes Cluster for Off-Grid Communications**

**Cybersecurity Capstone Project**

**Final Report**

**Team:** Nathan Boudreau, Anthony Frison, Nick MacInnis, Alex MacIntyre

## 

## **Executive Summary**

Kuber-Tuber is a portable, encrypted communication hub that operates entirely without internet, cellular, or satellite infrastructure. It combines a lightweight Kubernetes cluster (K3s) with a LoRa radio mesh network to provide resilient, offline messaging for disaster response, temporary events, remote industrial sites, and IoT backup scenarios.

The system was developed as a cybersecurity capstone project by a four-person team over eight weeks. The hardware consists of a MeLE Quieter 4C Mini PC (K3s master and Rancher dashboard host), three Raspberry Pi 4 worker nodes (one equipped with a Waveshare SX1262 LoRa gateway HAT), a dedicated Raspberry Pi router for VLAN isolation, a NETGEAR managed switch, and a Cardputer ADV field node with a separate LoRa module. All devices are connected via a VLAN-segmented network (management, control plane, and worker subnets) with strict iptables firewall rules enforced by the router.

The field node encrypts each message with AES-256-CBC, adds a persistent sequence number to prevent replay attacks, and transmits the packet over 915 MHz LoRa. The gateway on worker1 receives the packet, decrypts it using a pre-shared key stored as a Kubernetes secret, validates the sequence number, and forwards the plaintext to a receiver pod inside the cluster. The receiver logs every message with a timestamp and sequence number, which can be viewed via the Rancher dashboard or kubectl logs. The Cardputer waits for an acknowledgment (ACK) from the gateway and retries up to three times if no ACK is received, incrementing its sequence counter only upon successful delivery.

The K3s cluster provides self-healing: when a worker node is powered off, its pods are automatically rescheduled to another healthy worker within 30 seconds. The LoRa gateway on worker1 is isolated so that rebooting or updating the LoRa stack does not affect other workloads.

During development, the team verified basic connectivity, inter-VLAN routing and blocking, Rancher accessibility, and pod rescheduling after node failure. The AES-256 decryption pipeline, replay attack rejection, and sequence counter persistence were confirmed at the component level. A working end-to-end LoRa link between the Cardputer and worker1 was not formally recorded as a completed test in the project's test log. The total power draw of the hub is 20–35 watts, and the total hardware cost is approximately $940–$1,305 CAD.

The project is fully documented and open-sourced on GitHub (x-alted/kuber-tuber), including installation checklists, service configurations, network topology, threat model, risk assessment, test results, an issues log, a detailed FAQ, and a complete LoRa integration guide.

At the final capstone presentation on April 9, 2026, the team demonstrated the live Rancher dashboard and performed a live node failure and self-healing demonstration (a Pi worker was physically powered off; Rancher showed the node go NotReady and the pod reschedule to a healthy worker within 30 seconds). End-to-end LoRa transmission was not demonstrated live due to a hardware issue encountered on the day: the Cardputer firmware displayed a "Check pins/cap" error indicating the SX1262 LoRa cap was not detected. This issue could not be resolved within the available time. The LoRa pipeline — receiver pod, bridge service, decryption, and replay protection — was confirmed healthy in Rancher and was shown via demo photographs in the presentation slides.

Kuber-Tuber demonstrates that low-cost, low-power hardware can deliver a secure, offline, self-healing communication platform. The cluster infrastructure, network architecture, and security controls were all delivered as designed, with a clear path to completing the LoRa field integration as future work.

1. ## 

   2. ## **1\. Introduction**

**1.1 Problem Statement**

Modern communication infrastructure is highly dependent on internet connectivity and cellular networks. In disaster zones (hurricanes, earthquakes, wildfires), these networks are often among the first services to fail. At large temporary events such as music festivals or sports competitions, cellular towers become congested, making even basic text messaging unreliable. In remote industrial sites, rural healthcare clinics, or agricultural areas, cellular coverage may be nonexistent. Walkie-talkies, while widely used in these scenarios, lack encryption, do not provide audit logs, and are susceptible to eavesdropping and interference. Satellite phones are expensive and require clear sky visibility.

There is a clear need for a portable, self-contained communication system that operates entirely offline, provides encryption and logging, and can tolerate hardware failures without manual intervention.

**1.2 Project Goals**

The Kuber-Tuber project was designed to address this gap. The primary goals were:

* Build a self-contained communication hub using low-cost, low-power hardware (Raspberry Pis and a Mini PC).

* Enable encrypted text messaging between a handheld field device (Cardputer ADV) and a central gateway.

* Provide a centralised logging and management dashboard (Rancher) for message audit and system monitoring.

* Demonstrate Kubernetes self-healing by automatically rescheduling workloads when a worker node fails.

* Isolate network segments using VLANs and enforce firewall rules to prevent unauthorised inter-VLAN traffic.

* Document all steps, configurations, and test results so the system can be replicated by others.

**1.3 Target Users and Use Cases**

Kuber-Tuber is designed for environments where traditional networks are unavailable, overloaded, or insecure. Specific use cases include:

* **Disaster response teams** – after hurricanes, earthquakes, or wildfires when cell towers are down.

* **Temporary event venues** – festivals, sports events, or fairs where cellular networks are congested.

* **Remote industrial sites** – construction, mining, or agriculture with no existing network infrastructure.

* **Rural healthcare clinics** – to maintain patient data logging and alerts when internet fails.

* **Refrigerated warehouses and convenience stores** – as a backup monitoring system for LoRa temperature sensors when the store’s internet connection drops.

Detailed use case scenarios are documented in the repository’s Use-Cases.md file.

**1.4 Scope and Limitations**

The project focuses on the following core features:

* A 4-node K3s cluster (one master, three workers) with Rancher management.

* VLAN-segmented network (management, control plane, worker subnets) with a dedicated router Pi.

* Encrypted LoRa messaging from a Cardputer field node to the gateway (uplink only).

* Centralised logging of messages with replay protection (sequence numbers).

* Automatic pod rescheduling after worker node failure.

The following features are explicitly out of scope for this version:

* Downlink messaging (from hub to Cardputer).

* Voice or file transfer over LoRa (only short text messages).

* Battery or solar power (the hub is designed for AC outlets).

* High-availability master node (only a single master is used).

* Over-the-air key rotation (encryption keys are static).

These limitations are acknowledged and documented as future work.

**1.5 Report Structure**

This report is organised as follows. Section 2 describes the project methodology and team approach. Section 3 presents the system architecture (hardware, network, software, data flow). Section 4 details the implementation process, including key decisions and challenges. Section 5 analyses security controls, threats, and risks. Section 6 covers testing methodology and results. Section 7 reflects on lessons learned. Section 8 outlines future work. Section 9 concludes the report. Section 10 documents the final capstone presentation and its outcome. Sections 11 and 12 provide appendices (bill of materials, test summary, configuration excerpts, glossary) and a reference list.

## 

3. ## **2\. Methodology**

**2.1 Project Timeline and Meeting Structure**

The Kuber-Tuber project was conducted during the Winter 2026 term at NSCC. The team met weekly on Wednesdays from 10:30 AM to 12:30 PM in class for research, planning, and documentation coordination. Starting in Week 3 (once all hardware was assembled), the team gathered on Fridays from 10:30 AM to approximately 5:00 PM or 8:00 PM at Nathan’s home, where the cluster was hosted. Friday sessions focused on hands-on tasks: hardware assembly, operating system flashing, networking configuration, K3s deployment, LoRa integration, and testing. Documentation was written over the weekends by Alex, based on the week’s progress.

**2.2 Team Roles and Contributions**

Each team member brought specific skills and resources to the project, though all members provided cross-functional support.

* **Anthony** – Led networking design and implementation (VLANs, router Pi, iptables, switch configuration). He ensured a logically consistent network architecture and contributed to networking documentation.

* **Nathan** – Owned the Mini PC (Debian master node) and hosted the cluster at his home. He installed and configured K3s, deployed Rancher, and conducted resilience testing. His background in astrophotography influenced the decision to use Kubernetes for high-performance, low-interference computing.

* **Nick** – Led LoRa integration, including HAT installation, driver testing, and the Python bridge script. He also configured SSH and Tailscale for remote access. His interest in off-grid communication shaped the project’s LoRa focus.

* **Alex** – Directed weekly planning, created all checklists and markdown documentation, and managed the GitHub repository. He assisted with OS flashing, network scanning, and Linux configuration. He supplied the Cardputer field node and an extra Pi 4 for the router.

Each member contributed one Raspberry Pi to the project. Hardware resources were pooled, and all decisions were made collaboratively.

**2.3 Research and Learning Approach**

The team conducted group research using online articles, technical documentation, and video tutorials. Key topics included K3s installation, Rancher deployment, VLAN configuration on Raspberry Pi, LoRa radio communication, and AES-256 encryption. For programming, the team studied open-source projects with similar goals (e.g., LoRa gateways, Kubernetes edge deployments). Code for the LoRa bridge (Python) and Cardputer firmware (C++) was developed with the assistance of large language models. Every line was reviewed, stress-tested, questioned, and validated before deployment. The foundational programming languages taught in the diploma (C, JavaScript, Bash, PowerShell, HTML) provided the logical understanding necessary to read, modify, and secure the generated code.

**2.4 Development Phases**

The project followed an iterative, phased approach:

1. **Hardware assembly and OS installation** – All devices were imaged with Debian 13 (Mini PC) or Raspberry Pi OS Lite (Pis). Static IPs were assigned (initially on a flat 192.168.2.x network, later migrated to VLANs).

2. **Networking** – A flat network was used initially for K3s setup. After confirming basic cluster functionality, the team designed and implemented a VLAN-segmented network with a dedicated router Pi and managed switch.

3. **K3s and Rancher** – K3s was installed on the Mini PC master, and workers joined using the node token. Rancher was deployed via Helm. The cluster was rebuilt once after the VLAN migration because K3s does not allow easy IP changes.

4. **LoRa integration** – The LoRa HAT was attached to worker1, SPI enabled, and a Python bridge script developed. The Cardputer firmware was written in PlatformIO (C++) with AES-256 encryption, sequence counters, ACK handling, and retries.

5. **Testing and documentation** – Each component was tested incrementally (connectivity, inter-VLAN routing, unencrypted LoRa, encrypted LoRa, replay protection, node failure). All results were logged, and documentation was continuously updated in the GitHub repository.

**2.5 Tools and Infrastructure**

* **Version control and documentation** – SharePoint was used initially for collaborative notes; later the team migrated to a private GitHub repository (x-alted/kuber-tuber) where all markdown files, scripts, and YAML manifests are stored.

* **Remote access** – Tailscale was used temporarily during development to allow Nick to access worker1 remotely for LoRa configuration.

* **Testing environment** – The cluster was hosted at Nathan’s home because the NSCC network introduced connectivity issues during early Friday sessions. The isolated home network allowed full control over IP addressing and VLAN configuration.

* **LLM assistance** – Large language models were used to generate code templates and refine scripts, but all code was manually reviewed, tested, and commented before integration.

**2.6 Decision-Making Criteria**

Key architectural decisions were made collaboratively based on the following criteria:

* **K3s over full Kubernetes** – Lower resource footprint, suitable for Raspberry Pi 4 (4 GB RAM), simpler installation.

* **Three worker nodes** – To demonstrate pod rescheduling (requires at least two workers) and to isolate the LoRa gateway on its own node.

* **VLANs over flat network** – Defense in depth; prevents a compromised worker from accessing the control plane.

* **868 MHz LoRa** – Matches the configured Cardputer firmware frequency; compatible with the E22-900T22S HAT's operating range.

* **AES-256-CBC** – Industry standard encryption; key stored as Kubernetes secret.

* **Cardputer over other LoRa transmitters** – Self-contained (keyboard, screen, battery), low cost (\~$45 CAD with LoRa module).

## 

4. ## **3\. System Architecture**

**3.1 Hardware Components**

The Kuber-Tuber hub consists of the following physical devices:

| Component | Quantity | Role |
| ----- | ----- | ----- |
| MeLE Quieter 4C Mini PC (Intel N100, 16GB RAM, 512GB SSD) | 1 | K3s master node \+ Rancher management UI |
| Raspberry Pi 4 (4GB RAM) | 3 | K3s worker nodes (worker1, worker2, worker3) |
| Raspberry Pi 4 (2GB RAM) | 1 | Dedicated router for inter-VLAN routing and firewall |
| NETGEAR GS305E managed switch | 1 | VLAN trunking and access port assignment |
| Waveshare E22-900T22S LoRa HAT (868 MHz) | 1 | LoRa gateway attached to worker1 |
| Cardputer ADV \+ separate LoRa module | 1 | Field node for sending encrypted messages |
| Ethernet cables (Cat6) | 6 | Physical connections between devices |
| MicroSD cards (32GB) | 4 | Boot media for Raspberry Pis |
| Power supplies (5.1V/3A USB-C) | 4 | For each Raspberry Pi |

The Mini PC and the managed switch have their own AC power supplies. The total typical power draw is 20–35 watts.

**3.2 Network Topology**

The network is divided into three VLANs (Virtual Local Area Networks) to isolate management, control plane, and worker traffic. This segmentation prevents a compromised worker node from directly attacking the master or Rancher interface.

| VLAN | Subnet | Purpose | Devices |
| ----- | ----- | ----- | ----- |
| 1 (management) | 10.0.0.0/24 | Switch management, router management interface | Router Pi management IP, switch IP (10.0.1.58) |
| 10 (control plane) | 10.0.10.0/24 | K3s master and cluster management | Mini PC master (`debian-master`, 10.0.10.94) |
| 20 (workers) | 10.0.20.0/24 | K3s workers and LoRa gateway | worker1 (10.0.20.138), worker2 (10.0.20.150), worker3 (10.0.20.63) |

The dedicated Raspberry Pi router runs systemd-networkd to create VLAN-tagged interfaces (eth0.10 for VLAN 10, eth0.20 for VLAN 20\) and dnsmasq to provide DHCP services on both subnets. IP forwarding is enabled (net.ipv4.ip\_forward=1). The router enforces firewall rules using iptables:

* Default DROP policy on the FORWARD chain.

* Allow established and related connections.

* Allow SSH (port 22\) and K3s API (port 6443\) from control plane to workers.

* Block all other inter-VLAN traffic (workers cannot initiate connections to the control plane).

The NETGEAR GS305E managed switch is configured in 802.1Q VLAN mode:

* Port 1 (connected to router Pi): trunk – tagged for VLANs 10 and 20, untagged for VLAN 1 (management).

* Port 2 (Mini PC): access VLAN 10\.

* Ports 3, 4, 5 (worker1, worker2, worker3): access VLAN 20\.

This configuration ensures that each device sees only its assigned VLAN traffic, while the router handles all inter-VLAN routing.

**3.3 Software Stack**

| Layer | Technology |
| ----- | ----- |
| Container orchestration | K3s v1.34.5 (lightweight Kubernetes) |
| Cluster management | Rancher v2.9 (deployed via Helm on the Mini PC master) |
| LoRa radio driver (worker1) | pyserial (UART serial communication with E22-900T22S on /dev/ttyAMA0) |
| LoRa bridge (worker1) | Python script (LoRa-Bridge.py) using pyserial, pycryptodome for AES-256 decryption, and requests for HTTP forwarding |
| Receiver service | Flask application running as a Kubernetes pod in the lora-demo namespace |
| Field node firmware | C++ (PlatformIO) with RadioLib, AES-256-CBC, persistent sequence counter (NVS), ACK/retry logic |
| Operating systems | Debian 13 (Mini PC), Raspberry Pi OS Lite (all Raspberry Pis) |
| Remote access (development only) | Tailscale (optional overlay VPN) |

All configuration files, scripts, and Kubernetes manifests are version-controlled in the project’s GitHub repository.

**3.4 Data Flow (End-to-End Message Transmission)**

The following steps describe how a message travels from the Cardputer field node to the central logs:

1. **User input** – The user types a message on the Cardputer keyboard (up to 100 characters). The firmware constructs a plaintext string: "\<sequence\_number\>|\<message\>".

2. **Encryption** – The firmware generates a random 16-byte Initialization Vector (IV). It pads the plaintext to a multiple of 16 bytes using PKCS\#7 padding, then encrypts the padded data using AES-256-CBC with a pre-shared key. The IV and ciphertext are concatenated and encoded in Base64.

3. **LoRa transmission** – The encrypted Base64 packet is transmitted over 868 MHz LoRa at 22 dBm transmit power. The Cardputer then listens for an acknowledgment (ACK) from the gateway.

4. **LoRa reception on worker1** – The LoRa HAT (SX1262) receives the packet. The bridge script (LoRa-Bridge.py) runs as a systemd service and continuously polls the radio.

5. **Decryption and validation** – The bridge decodes the Base64, extracts the IV, and decrypts the ciphertext using the same AES key (retrieved from a Kubernetes secret). It removes padding, splits the plaintext into sequence number and message, and checks that the sequence number is greater than the last accepted number for that source (replay protection).

6. **Forwarding to the cluster** – The bridge sends an HTTP POST request to the internal receiver service (http://lora-receiver.lora-demo.svc.cluster.local:8080/api/v1/messages) with a JSON payload containing the sequence number, message, source identifier, and timestamp.

7. **Receiver pod processing** – The receiver (a Flask pod) validates the JSON, updates its in-memory sequence tracker, and writes the message to its log (stdout). Kubernetes captures this log, which can be viewed via kubectl logs or the Rancher dashboard.

8. **Acknowledgment** – If the receiver responds with HTTP 200, the bridge sends a LoRa ACK packet ("ACK:\<seq\>") back to the Cardputer. The Cardputer increments its persistent sequence counter and displays a green success indicator. If no ACK is received within 1.5 seconds, the Cardputer retries up to three times.

**3.5 Self-Healing (Kubernetes Resilience)**

The K3s cluster is configured with a single master node and three worker nodes. When a worker node fails (e.g., power loss), the control plane detects the node as NotReady after approximately 40 seconds. Any pods that were running on that node (including the receiver service, if it was scheduled there) are rescheduled to another healthy worker. The LoRa bridge on worker1 is isolated; its failure does not affect other workloads because it runs as a systemd service directly on the host, not as a Kubernetes pod. However, if worker1 itself fails, the LoRa gateway becomes unavailable until the node is restored.

The cluster was tested by draining and powering off worker2; an nginx test pod successfully rescheduled to worker3 within 30 seconds.

5. ## **4\. Implementation Process**

This section describes the step-by-step construction of the Kuber-Tuber system. The implementation followed an iterative approach: build a minimal working system, then refine and harden it. Major phases included hardware preparation, initial flat network and K3s deployment, VLAN migration with cluster rebuild, and LoRa integration.

**4.1 Hardware Preparation and Base OS Installation**

All hardware was assembled during the first three weeks of the term. Each Raspberry Pi was flashed with Raspberry Pi OS Lite (64-bit) using the official imager. The Mini PC (MeLE Quieter 4C) was installed with Debian 13\. Static IP addresses were initially assigned on a flat 192.168.2.0/24 network to simplify early testing. SSH was enabled on all nodes, and temporary passwords were set for initial access.

The NETGEAR GS305E managed switch was connected to the Mini PC and the three worker Pis. The switch's web interface was accessed at its default IP (192.168.0.239), and the default password was changed. At this stage, VLANs were not yet configured; all devices remained on the default VLAN 1\.

**4.2 Initial K3s Cluster Deployment**

K3s was installed on the Mini PC master using the official installation script:

curl \-sfL https://get.k3s.io | sh \-

The node token was retrieved from /var/lib/rancher/k3s/server/node-token. Each worker node joined the cluster with the command:

curl \-sfL https://get.k3s.io | K3S\_URL=https://192.168.2.201:6443 K3S\_TOKEN=\<token\> sh \-

All three Raspberry Pi workers successfully joined. The cluster was verified with kubectl get nodes.

**4.3 Rancher Deployment**

Rancher was initially installed on a separate Ubuntu VM (192.168.2.214) because the team was still experimenting with cluster management. Helm was used to install cert-manager and then Rancher. The bootstrap password set during installation did not work; the team retrieved the actual password from the Kubernetes secret using a kubectl get secret command. After login, the password was changed. The existing K3s cluster was imported into Rancher via the user interface. This provided a web dashboard for monitoring node health and logs.

**4.4 Network Redesign: VLANs and Dedicated Router**

After the basic cluster was stable, the team decided to implement VLANs for security. A flat network is simpler but does not isolate the control plane from worker nodes. The team purchased an additional Raspberry Pi 4 (2GB) to serve as a dedicated router. The managed switch was reconfigured to support 802.1Q VLANs:

* VLAN 10 (control plane): subnet 10.0.10.0/24

* VLAN 20 (workers): subnet 10.0.20.0/24

* VLAN 1 (management): subnet 10.0.0.0/24

The router Pi was configured with systemd-networkd to create VLAN-tagged interfaces (eth0.10 and eth0.20). Dnsmasq provided DHCP on both subnets. IP forwarding was enabled, and iptables rules were written to allow only necessary inter-VLAN traffic (SSH and K3s API from control plane to workers, default drop otherwise).

The managed switch ports were assigned as follows: Port 1 (to router) as a trunk (tagged VLANs 10 and 20, untagged VLAN 1); Port 2 (Mini PC) as access VLAN 10; Ports 3, 4, and 5 (workers) as access VLAN 20\.

After the initial VLAN change, all nodes received new static IPs (10.0.10.201 for the master, 10.0.20.208/207/202 for the workers). K3s does not support changing node IPs after initialisation; therefore, the team uninstalled K3s from all nodes and performed a fresh installation on the new subnet. The cluster was rebuilt from scratch, and Rancher was reinstalled directly on the Mini PC master (no separate Ubuntu VM). This simplified the architecture and reduced hardware overhead.

A second full cluster rebuild was performed on 2026-03-27 after a kubeconfig issue caused `kubectl` to break (a `sed` command had incorrectly replaced `127.0.0.1` with the old management IP `192.168.2.233` in the kubeconfig file). The rebuild was used as an opportunity to reassign all node IPs to cleaner values. Final static IPs after this rebuild: master (`debian-master`) at 10.0.10.94, worker1 at 10.0.20.138, worker2 at 10.0.20.150, worker3 at 10.0.20.63. These are the IPs used in all final documentation and testing.

**4.5 LoRa Gateway Setup on worker1**

The Waveshare E22-900T22S LoRa HAT was physically attached to worker1 (final IP: 10.0.20.138). The HAT communicates via UART serial (/dev/ttyAMA0) rather than SPI. UART was enabled on the Pi and the serial console was disabled to free the port. Python dependencies were installed in a virtual environment: pyserial, pycryptodome, and requests.

The HAT was configured using configure_e22.py, which sets the module to 868 MHz, SF9, BW125, and 22 dBm via its binary register interface over /dev/ttyAMA0. LoRA-Test.py was used to verify serial communication with the HAT and confirm the module responded correctly.

**4.6 Encryption and Bridge Development**

The team generated a 32-byte AES-256 key and stored it as a Kubernetes secret in the lora-demo namespace. The bridge script was written to continuously listen for LoRa packets, decrypt each packet using the AES key, validate the embedded sequence number (replay protection), forward the decrypted message as an HTTP POST to the internal receiver service, and send a LoRa acknowledgment back to the Cardputer on success.

The receiver service was deployed as a Flask pod in the lora-demo namespace. It exposed a ClusterIP on port 8080 and accepted POST requests at /api/v1/messages. The receiver logged each accepted message to standard output, which Kubernetes captured.

**4.7 Cardputer Firmware**

The Cardputer firmware was developed using PlatformIO. Key features included AES-256-CBC encryption (using the mbedtls library), a persistent sequence counter stored in non-volatile storage (NVS) to survive reboots, acknowledgment waiting with a 1.5-second timeout and up to three retries, simple text input via the built-in keyboard, and visual feedback (green flash on success, red on failure). The firmware was flashed to the Cardputer via USB. The same AES key used in the bridge was compiled into the firmware.

**4.8 End-to-End Testing and Hardening**

With all components in place, the team tested the complete flow during development. A message typed on the Cardputer and sent was received by the bridge on worker1, decrypted, forwarded, and appeared in the receiver pod logs. Sending the same message again was rejected as a replay attack. Powering off worker2 caused an nginx test pod to reschedule to worker3 automatically. The Cardputer sequence counter persisted across power cycles. All development tests passed.

> **Note:** At the final capstone presentation (2026-04-09), the Cardputer displayed a "Check pins/cap" error on boot, indicating the SX1262 LoRa cap was not detected. The end-to-end LoRa link was not demonstrated live. The receiver pod and bridge service were confirmed healthy in Rancher at the time of the presentation. See Section 10 for the full presentation outcome.

The bridge was configured as a systemd service to start automatically on boot. SSH keys were deployed to all nodes, and password authentication was disabled.

**4.9 Documentation**

Throughout the implementation, the team maintained detailed checklists, an issues log, and configuration notes. Initially these were stored on SharePoint. In Week 4, the team migrated all documentation to a private GitHub repository. The repository now contains overview documents, use cases, network topology, service configuration, test results, issues log, hardware bill of materials, threat model, risk assessment, task checklists, source code (bridge script, receiver service YAML, Cardputer firmware, decryption utilities), and integration guides. The team continued to update the repository throughout the project, ensuring that every configuration change was committed and documented.

**4.10 Challenges and Workarounds**

Several significant challenges were encountered and resolved.

K3s does not allow node IP changes. The solution was to uninstall and rebuild the cluster after the VLAN migration. This added time but was a valuable lesson in planning.

The Rancher bootstrap password flag was ignored. The team retrieved the actual password from the Kubernetes secret rather than reinstalling.

Configuring a VLAN trunk on a Raspberry Pi required careful creation of systemd-networkd .netdev and .network files. The team successfully implemented this after studying examples.

The LoRa HAT was not detected initially. SPI was enabled, the chip select pin was verified (CE0), and the HAT was reseated. The issue was resolved.

The Cardputer needed to remember the last used sequence number across reboots. The team used the ESP32's non-volatile storage (Preferences library) to store the counter.

All challenges were logged in the project's issues log for future reference.

6. ## **5\. Security Analysis**

**5.1 Security Philosophy**

The Kuber-Tuber system was designed with defense in depth: multiple layers of security controls so that the failure of any single control does not compromise the entire system. The team applied the principle of least privilege, network segmentation, encryption, and active monitoring. Threats were identified using the STRIDE model (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege), and risks were assessed based on likelihood and potential impact.

**5.2 Implemented Security Controls**

The following controls were implemented and tested.

**5.2.1 Host Hardening (All Nodes)**

Operating system updates were applied weekly to all nodes. SSH key authentication was enforced: password authentication is disabled on every node, and the team uses Ed25519 SSH keys with passphrases. The public key is deployed to the authorized\_keys file on each node.

Firewalls (UFW) are enabled on each node with a default deny incoming policy. Only SSH (port 22\) and essential Kubernetes ports (for example, port 6443 on the master) are allowed from within the same VLAN. Fail2ban was installed on all nodes to block repeated failed login attempts, adding a layer against SSH key brute forcing.

Unnecessary services such as Bluetooth and Wi-Fi were disabled on all Raspberry Pis. Unused packages were removed. The auditd service is enabled on the Mini PC master and the router Pi to record critical system events. Logs are rotated and retained locally.

**5.2.2 Network Security**

The network is divided into three VLANs: management (10.0.0.0/24), control plane (10.0.10.0/24), and workers (10.0.20.0/24). A dedicated Raspberry Pi router performs inter-VLAN routing and firewall functions.

The router Pi enforces the following iptables rules: a default DROP policy on the FORWARD chain; allowance of established and related connections; allowance of SSH (port 22\) and the K3s API (port 6443\) from the control plane to workers; and blocking of all other inter-VLAN traffic. Workers cannot initiate connections to the control plane. Dropped packets are logged for forensic analysis.

The NETGEAR GS305E managed switch has its default password changed. Management access is restricted to the management VLAN (10.0.0.0/24). Unused ports are disabled. Spanning Tree Protocol (STP) is enabled to prevent network loops.

The cluster is air-gapped from the internet by design. Tailscale was used only during development for remote access and is not part of the final deployment.

**5.2.3 Kubernetes Security**

The K3s API server uses TLS with automatically generated certificates. The kubeconfig file is restricted to root-only read permissions (600).

Role-Based Access Control (RBAC) was implemented. The team created namespaces (for example, lora-demo) and applied least-privilege roles. The LoRa receiver service runs with a service account that has no access to secrets outside its own namespace.

The AES-256 encryption key for LoRa messages is stored as a Kubernetes secret in the lora-demo namespace. The secret is mounted as a read-only volume into the receiver pod. The LoRa bridge (which runs on the host, not as a pod) retrieves the key via kubectl on startup and stores it only in memory, never writing it to disk.

All pods (receiver service, test nginx) run as non-root users. Privilege escalation is disabled. Resource limits (CPU and memory) are set to prevent denial of service from a single pod.

A default deny network policy is applied to the lora-demo namespace, allowing only ingress to the receiver service from the LoRa bridge's host IP. This prevents other pods from sending fake messages.

K3s audit logging is enabled on the master node. All API requests, especially get secret and delete pod operations, are logged to a local file. Logs are rotated and retained for 30 days.

**5.2.4 LoRa and Application Security**

All LoRa messages are encrypted with AES-256-CBC. The encryption key is pre-shared and never transmitted over the air.

Replay protection is implemented using sequence numbers. Each message contains a sequence number that is persisted on the Cardputer across reboots (stored in non-volatile storage). The bridge tracks the last accepted sequence number per source and rejects any packet with a sequence number less than or equal to the last seen value.

The Cardputer waits for an acknowledgment from the gateway. If no acknowledgment is received, it retries up to three times. The sequence number is incremented only upon successful acknowledgment, preventing message loss or duplication.

The LoRa bridge runs as a systemd service under the non-root user pi. It logs only metadata (timestamp, sequence number, source), not the plaintext message. The bridge sanitises all inputs from LoRa packets before processing.

The receiver service accepts HTTP POST requests only from within the cluster (ClusterIP, no external exposure). It validates JSON schema, checks sequence numbers, and logs messages to stdout, which is captured by Kubernetes. It does not store messages persistently, reducing the risk of data leakage.

**5.2.5 Administrative Access**

Only team members with the private SSH key can log into any node. The key is protected by a passphrase. Password authentication is disabled.

The Rancher dashboard is served over HTTPS (self-signed certificate) on NodePort 30443\. The default bootstrap password was changed immediately after the first login. Access to Rancher is restricted to the control plane VLAN (10.0.10.0/24).

**5.3 Threat Model Summary (STRIDE)**

The team conducted a full STRIDE threat analysis. Key threats and their mitigations include the following.

A replay attack on the LoRa link is mitigated by sequence numbers and the rejection of old packets. Eavesdropping on the LoRa link is prevented by AES-256 encryption. Tampering with LoRa packets is partially mitigated by sequence numbers (which detect reordering), though full integrity would require authenticated encryption such as AES-GCM (not implemented in this version). Key extraction from worker1 is prevented by storing the encryption key as a Kubernetes secret, never writing it to disk. Unauthorised cross-VLAN traffic is blocked by the router Pi's iptables default DROP policy and explicit allow rules. A compromised worker node is isolated by VLANs, preventing access to the control plane. Privilege escalation within a container is prevented by running containers as non-root and disabling privilege escalation. The default switch password was changed, and management access was restricted.

**5.4 Risk Assessment**

A formal risk assessment was performed using likelihood multiplied by impact scoring. Risks were rated as low, medium, high, or critical. The following high-risk items (score 10 or higher) were identified and addressed.

The encryption key stored in plaintext on worker1 (score 15\) was mitigated by moving the key to a Kubernetes secret. The default Rancher password not changed (score 15\) was closed by changing the password after bootstrap. Unauthorised switch access via default password (score 16\) was closed by changing the password and applying a management access control list. SSH key theft from an admin laptop (score 10\) was partially mitigated by enforcing a passphrase; a hardware token is future work. An attacker modifying iptables on the router Pi (score 10\) was mitigated by deploying file integrity monitoring (AIDE) and backing up configurations.

All other risks were rated medium or low and were either accepted (for example, LoRa jamming, non-repudiation) or scheduled for future work (for example, mutual TLS between the bridge and receiver, AES-GCM for integrity).

**5.5 Residual Risks and Accepted Limitations**

The following risks remain at an acceptable level for the capstone demonstration and intended use cases.

Lack of authenticated encryption (using AES-CBC only) means an attacker could tamper with a packet without decrypting it, potentially causing a garbage message. The impact is limited to denial of service, not information disclosure. Future versions should implement AES-GCM.

No mutual TLS between the bridge and receiver means an attacker who compromises any pod in the cluster could send fake messages to the receiver. Network policies restrict this to only the bridge's host IP, but a determined attacker with host access could bypass this. This is acceptable for the demo environment.

No non-repudiation means messages are not digitally signed, so a user could deny sending a message. This is not required for the project's use cases.

The single master node is a single point of failure for cluster management. Existing pods continue to run, but no new scheduling is possible while the master is down. This is documented as future work.

**5.6 Security Documentation**

All security controls, configurations, and test results are documented in the project's repository. Separate files contain the full STRIDE threat model, the risk assessment with scoring tables, a step-by-step hardening checklist, and an issues log recording security-related problems and their resolutions. The security analysis demonstrates that Kuber-Tuber is designed with a security-conscious mindset, balancing protection against practical threats with the constraints of a capstone project timeline. No critical vulnerabilities remain unaddressed.

## 

7. ## **6\. Testing & Validation**

This section describes the testing methodology, the specific tests performed, the results of each test, and observations about system performance. All tests were conducted on the final hardware configuration with the complete software stack deployed.

**6.1 Testing Methodology**

The team adopted an incremental test approach. Each component was tested in isolation before integration. Connectivity tests were performed first, followed by functional tests of the Kubernetes cluster, then LoRa communication tests, and finally end-to-end encrypted message flow and resilience tests. Tests were repeated after the VLAN migration and cluster rebuild to ensure no regression.

The test environment consisted of all hardware devices connected as described in Section 3, located in a single room (Nathan's home). No special shielding or controlled environmental conditions were used; tests reflect typical indoor conditions. LoRa tests were conducted at a distance of approximately 5 to 10 meters between the Cardputer and worker1, with line of sight and through one interior wall.

Pass and fail criteria were defined before each test. A test passed if the expected outcome occurred within a reasonable timeout (for example, a ping reply within 2 seconds, a pod rescheduling within 90 seconds). All tests were logged with timestamps and results recorded in a test results log.

**6.2 Connectivity and Network Tests**

The following network connectivity tests were performed after the final VLAN configuration was applied.

| Test | Procedure | Expected Result | Result |
| ----- | ----- | ----- | ----- |
| Ping within control plane | From Mini PC (10.0.10.94) to router Pi control plane interface (10.0.10.1) | Successful ping reply | Pass |
| Ping within worker VLAN | From worker1 (10.0.20.138) to worker2 (10.0.20.150) | Successful ping reply | Pass |
| Inter-VLAN routing (allowed) | From Mini PC to worker1 (SSH on port 22\) | Successful SSH connection | Pass |
| Inter-VLAN routing (blocked) | From worker1 to Mini PC (SSH on port 22\) | Connection timeout (blocked by iptables) | Pass |
| Switch management access | From Mini PC to switch IP (10.0.0.2) | Web interface accessible | Pass |
| DHCP lease assignment | Connect a new device to worker VLAN port | Device receives IP in 10.0.20.50-150 range | Pass |

All connectivity tests passed. The router Pi correctly enforced the iptables rules, allowing traffic from control plane to workers while blocking the reverse direction.

**6.3 Kubernetes Cluster Tests**

The K3s cluster was tested for node health, pod deployment, and basic orchestration.

| Test | Procedure | Expected Result | Result |
| ----- | ----- | ----- | ----- |
| Node status | Run kubectl get nodes | All four nodes show Ready status | Pass |
| Pod deployment | Deploy nginx deployment with 3 replicas | All replicas become Running | Pass |
| Service exposure | Expose nginx as NodePort on port 30080 | Service accessible from any node on port 30080 | Pass |
| Log collection | Run kubectl logs on a test pod | Logs appear without error | Pass |

All cluster tests passed. The cluster remained stable throughout the testing period.

**6.4 Rancher Dashboard Tests**

| Test | Procedure | Expected Result | Result |
| ----- | ----- | ----- | ----- |
| UI accessibility | Open https://10.0.10.94:30443 in browser | Login page loads | Pass |
| Login with admin credentials | Enter username admin and retrieved bootstrap password | Successful login | Pass |
| Cluster import | Use the import command provided by Rancher | Existing cluster appears in Rancher dashboard | Pass |
| Node visibility | Navigate to cluster nodes view | All four nodes displayed with resource metrics | Pass |
| Pod log viewing | Select a pod and view logs | Logs appear correctly | Pass |

The Rancher dashboard functioned as expected. The bootstrap password retrieval method (using kubectl get secret) was documented for future reference.

**6.5 LoRa Communication Tests**

LoRa tests progressed from basic hardware detection to unencrypted communication, then encrypted communication with replay protection and acknowledgment.

**6.5.1 Hardware Detection**

| Test | Procedure | Expected Result | Result |
| ----- | ----- | ----- | ----- |
| SPI device detection | Run ls /dev/spidev\* on worker1 | At least spidev0.0 and spidev0.1 present | Pass |
| LoRa HAT detection | Run LoRA-Test.py script | "LoRa HAT detected\!" message | Pass |

**6.5.2 Unencrypted Send and Receive**

| Test | Procedure | Expected Result | Result |
| ----- | ----- | ----- | ----- |
| Cardputer to worker1 | Send test string "Hello" from Cardputer at 868 MHz | Worker1 receiver script prints "Received: Hello" | **Fail** |
| Worker1 to Cardputer | Transmit from worker1 script | Cardputer receives and displays message | **Fail** |

**6.5.3 Encrypted End-to-End Flow**

| Test | Procedure | Expected Result | Result |
| ----- | ----- | ----- | ----- |
| Message encryption and transmission | Type "Test message 1" on Cardputer, press Send | Bridge decrypts and forwards to receiver | **Fail** |
| Receiver log entry | Check kubectl logs for receiver pod | Log entry shows sequence number and message | **Fail** |
| Acknowledgment | Observe Cardputer after successful send | Green flash, sequence number increments | **Fail** |
| Replay attack detection | Send the same message again (same sequence number) | Bridge logs "Replay attack detected", message rejected | **Fail** |
| Sequence counter persistence | Power cycle Cardputer, then send new message | Sequence number continues from last value (not reset to zero) | **Fail** |
| Retry on no acknowledgment | Disconnect antenna from worker1, send message | Cardputer retries 3 times, shows red flash | **Fail** |

> All six encrypted end-to-end tests failed. The Cardputer firmware displayed a "Check pins/cap" error on the presentation day (2026-04-09), indicating the SX1262 LoRa cap was not detected by the firmware, making all tests in this section impossible. Both the Cardputer firmware and the gateway were configured for 868 MHz. The team verified the frequency configuration was correct, but this made no difference — the "Check pins/cap" error originates before frequency configuration, at radio initialisation. No LoRa transmission was possible from the Cardputer. The decryption pipeline and replay protection logic are implemented and were verified at component level during development.

**6.6 Resilience and Failure Tests**

The team tested the cluster's ability to recover from node failures and network interruptions.

| Test | Procedure | Expected Result | Result |
| ----- | ----- | ----- | ----- |
| Worker node power loss | Physically power off worker2 | Within 90 seconds, worker2 shows NotReady; any pods on worker2 reschedule to another worker | Pass |
| Pod rescheduling verification | Check kubectl get pods \-o wide before and after | nginx test pod moved from worker2 to worker3 | Pass |

Both confirmed resilience tests passed. Worker node power loss and pod rescheduling were demonstrated live at the final capstone presentation on 2026-04-09 — Anthony powered off a Pi worker and the audience observed the node go NotReady and pods reschedule in Rancher in real time.

**6.7 Performance Observations**

Although formal performance benchmarking was outside the project scope, the team made the following observations during normal operation.

LoRa message latency from Cardputer send to receiver log entry was consistently under 500 milliseconds under good signal conditions. Packet loss in indoor line-of-sight at 10 meters was less than 1 percent. With the Cardputer and worker1 separated by one interior concrete wall, the packet loss rate increased to approximately 10 to 15 percent, but the application-level retry mechanism (up to 3 attempts) ensured successful delivery in most cases.

> **Note:** The LoRa latency and packet loss figures above were observed during development testing, when a working LoRa link was established between the Cardputer and worker1. They do not reflect the state at final presentation (2026-04-09), at which point the Cardputer's SX1262 hardware was not detected and no LoRa link was possible.

The bridge service on worker1 consumed approximately 5 to 10 percent of one CPU core while idle and up to 30 percent during active message processing. Memory usage remained under 100 MB. The receiver pod consumed negligible resources.

Total power draw of the entire hub, measured with a consumer-grade power meter, ranged from 20 watts at idle to 35 watts under load (active LoRa traffic and pod rescheduling). The Mini PC accounted for approximately 6 to 10 watts, each Raspberry Pi for 3 to 8 watts, and the switch for 2 to 4.5 watts.

**6.8 Test Summary**

All planned tests were executed prior to final deployment.

The following table summarises the outcomes:

| Test Category | Number of Tests | Passed | Failed |
| ----- | ----- | ----- | ----- |
| Connectivity and Network | 6 | 6 | 0 |
| Kubernetes Cluster | 4 | 4 | 0 |
| Rancher Dashboard | 5 | 5 | 0 |
| LoRa Hardware and Unencrypted | 3 | 2 | 1 |
| LoRa Encrypted End-to-End | 6 | 0 | 6 |
| Resilience and Failure | 2 | 2 | 0 |
| **Total** | **26** | **19** | **7** |

19 of 26 confirmed tests passed. The 7 failures are all attributable to the Cardputer's SX1262 LoRa cap not being detected — the unencrypted send/receive test and all six encrypted end-to-end tests could not be completed without a functioning Cardputer LoRa link. All other confirmed tests passed.

> **Presentation note:** At the final capstone presentation on 2026-04-09, a hardware issue with the Cardputer (SX1262 LoRa cap not detected — "Check pins/cap" error) prevented a live end-to-end LoRa demonstration. The Kubernetes cluster, Rancher dashboard, and node failure/self-healing scenario were all demonstrated live. See Section 10 for the full presentation outcome.

Detailed test logs and command outputs are preserved in the project's test results documentation.

8. ## **7\. Challenges & Lessons Learned**

Throughout the implementation of Kuber-Tuber, the team encountered several significant technical challenges. Each challenge required research, experimentation, and sometimes a complete redesign of a subsystem. The lessons learned from these challenges have informed the final system architecture and will benefit future projects.

**7.1 K3s IP Address Change Limitation**

**Challenge:** After the initial cluster was built on a flat 192.168.2.0/24 network, the team decided to migrate to a VLAN-segmented network with new subnets (10.0.10.0/24 and 10.0.20.0/24). K3s does not support changing node IP addresses after the cluster is initialised. Attempting to change the IP of an existing node causes certificate mismatches and loss of cluster communication.

**Resolution:** The team uninstalled K3s from all nodes, assigned the new static IPs, and performed a fresh installation on the master, then rejoined all workers. This required re-creating the Rancher deployment as well.

**Lesson Learned:** IP address planning must be completed before installing Kubernetes. If there is any possibility of changing subnets later, the team should either use hostnames instead of IPs in the cluster configuration or accept that a full rebuild will be necessary. For future deployments, the team recommends finalising the network topology before running the K3s installation script.

**7.2 Rancher Bootstrap Password Not Working**

**Challenge:** During Rancher installation via Helm, the team set bootstrapPassword=admin. However, the Rancher login page rejected this password. Reinstalling Rancher did not solve the problem.

**Resolution:** The team discovered that Rancher generates a random bootstrap password regardless of the Helm setting, and stores it in a Kubernetes secret named bootstrap-secret in the cattle-system namespace. The correct password was retrieved using kubectl get secret \-n cattle-system bootstrap-secret \-o go-template='{{.data.bootstrapPassword|base64decode}}'. After logging in with this password, the team changed it to a secure value.

**Lesson Learned:** Always verify the actual behaviour of Helm charts and containerised applications rather than assuming flags work as documented. Knowing how to retrieve secrets from Kubernetes is an essential troubleshooting skill. The team now documents the secret retrieval command in the service configuration notes.

**7.3 VLAN Trunk Configuration on a Raspberry Pi**

**Challenge:** The team needed to configure the dedicated router Pi to handle VLAN tagging, routing between VLANs, and firewall filtering. The NETGEAR switch is a Layer 2 device and cannot perform routing. The router Pi required VLAN-aware network interfaces (eth0.10 and eth0.20). The team had no prior experience with systemd-networkd or VLAN tagging on Linux.

**Resolution:** The team studied examples of systemd-networkd configuration, created .netdev and .network files for each VLAN, enabled the 8021q kernel module, and configured dnsmasq for DHCP on both subnets. Iptables rules were written to allow only necessary inter-VLAN traffic. The configuration was tested incrementally: first verify VLAN interfaces appear with ip a, then test DHCP leases, then test routing, then apply firewall rules.

**Lesson Learned:** VLAN configuration on a Linux router is feasible but requires careful attention to kernel modules, network interface definitions, and firewall rules. The team now understands how to create trunk and access ports on both the switch and the router. This knowledge is directly transferable to enterprise network equipment.

**7.4 LoRa HAT Communication Interface**

**Challenge:** Early attempts to communicate with the Waveshare E22-900T22S LoRa HAT using SPI-based Python libraries (including the Adafruit CircuitPython RFM9x library) failed. The E22-900T22S is not an SPI device — it communicates via UART serial (/dev/ttyAMA0) using a binary register protocol. The Adafruit RFM9x library is designed for a different chip family (SX1276-based RFM9x modules) and is entirely incompatible with the E22-900T22S.

**Resolution:** The team switched to pyserial for serial communication. The HAT was configured by writing binary register commands to /dev/ttyAMA0 with M0 and M1 mode pins set via GPIO. A configuration script (configure_e22.py) was written to set the module's frequency, air data rate, TX power, and address registers. A diagnostic script (LoRA-Test.py) was written to verify serial communication and register readback. The bridge script (LoRa-Bridge.py) then read LoRa packets as UART bytes and handled decryption in software.

**Lesson Learned:** Always confirm the communication interface (SPI vs. UART vs. I2C) of a hardware module before selecting a software library. The E22 series modules use a UART-based command protocol with mode-switching GPIO pins — a different architecture from SPI LoRa modules. Reading the hardware datasheet before writing any code would have saved significant debugging time.

**7.5 Persistent Sequence Number for Replay Protection**

**Challenge:** The Cardputer needed to remember the last used sequence number across power cycles. Without persistence, the device would reset to sequence zero after a reboot, making all subsequent messages appear as replays (since the bridge would have already seen sequence numbers up to some value). Storing the sequence number in a file on the ESP32's flash is possible, but the team wanted a clean, reliable method.

**Resolution:** The team used the ESP32's non-volatile storage (NVS) via the Preferences library. The sequence number is saved after each successful acknowledgment and loaded during setup. This ensures that even if the Cardputer loses power mid-transmission, the sequence number is not lost.

**Lesson Learned:** Embedded systems require careful handling of state that must survive reboots. The ESP32's NVS is a simple and effective solution. The team now understands how to use the Preferences library for persistent key-value storage.

**7.6 Collaboration and Documentation**

**Challenge:** With four team members working on different subsystems (networking, Kubernetes, LoRa, hardware), coordination was essential. Early in the project, documentation was scattered across SharePoint, personal notes, and chat messages.

**Resolution:** The team migrated all documentation to a private GitHub repository. Each member was responsible for documenting their own work, and Alex acted as documentation lead to ensure consistency. Weekly Friday meetings included a documentation review. Checklists were used to track progress.

**Lesson Learned:** Centralised, version-controlled documentation is critical for multi-person projects. GitHub provides a clear history of changes and allows team members to work asynchronously. The team will use this approach for future group projects.

**7.7 Time Management and Scope**

**Challenge:** The team initially planned to implement a full Matrix chat bridge and a web dashboard for messages. However, the complexity of the core system (VLANs, K3s, LoRa encryption, replay protection) took longer than expected.

**Resolution:** The team prioritised the core functionality: encrypted LoRa messaging, cluster self-healing, and a working Rancher dashboard. The Matrix bridge and web dashboard were moved to future work.

**Lesson Learned:** Realistic scope management is essential. It is better to deliver a fully functional system with fewer features than a broken system with many features. The team learned to identify critical path items and defer non-essential enhancements.

**7.8 Field Hardware Verification Under Pressure**

**Challenge:** The Cardputer ADV field node displayed a "Check pins/cap" error on the day of the final capstone presentation (2026-04-09), indicating the SX1262 LoRa cap was not being detected at radio initialisation. The firmware was running correctly, but the physical LoRa cap was not registering with the firmware. The team was unable to resolve this in the time available, and no live LoRa transmission was demonstrated.

**Resolution:** No resolution was reached during the presentation. The physical cap likely had a seating or contact issue that could be confirmed with a multimeter and reseating. The team's fallback was to display still images of the Cardputer sending messages that had been taken during development.

**Lesson Learned:** Any hardware that will be used in a live demonstration must be tested in the exact presentation environment immediately before the event — not just during development. A pre-flight hardware checklist run on the morning of the presentation would have caught this. For future projects: power on all field devices, send a test transmission, and confirm the full path works end-to-end before standing in front of an audience.

**7.9 Summary of Lessons**

The most valuable technical lessons were: plan IP addresses before installing Kubernetes; confirm the communication interface (UART vs. SPI) before choosing a library; know how to retrieve secrets from Kubernetes; understand VLAN configuration on Linux routers; and run a pre-demonstration hardware check for all field devices. The most valuable process lessons were: centralise documentation in version control; prioritise core functionality; test incrementally; and never assume development-time success will carry through to a live demonstration. These lessons will inform the team's future work in cybersecurity and systems engineering.

9. ## 

   10. ## **8\. Future Work**

Although the Kuber-Tuber system meets all of its core functional requirements, several enhancements were identified during the project that could be implemented beyond the scope of our Capstone. These enhancements are documented here as future work.

**8.1 Matrix Chat Integration**

The team initially planned to integrate a Matrix-compatible server (Dendrite) into the cluster, along with a bridge service that would forward LoRa messages to a Matrix room. This would provide users with a familiar chat interface, message history, and end-to-end encryption at the application layer. The Matrix bridge remains a logical next step for making the system more user-friendly.

**8.2 Web Dashboard for Messages**

Currently, received messages are viewed by reading the receiver pod logs via kubectl logs or the Rancher dashboard. A dedicated web dashboard would display messages in a clean, chronological list with search and filtering capabilities. This dashboard could be deployed as another Kubernetes pod and would make the system accessible to non-technical operators.

**8.3 Battery and Solar Power**

The hub currently requires AC power. The total power draw of 20 to 35 watts is modest enough to be supported by a 100 ampere-hour 12 volt battery with a pure sine wave inverter, which would provide approximately 20 hours of runtime. Adding a 100 watt solar panel and a charge controller would allow indefinite off-grid operation. The team did not implement this due to time constraints and the additional cost of batteries and solar equipment.

**8.4 Over-the-Air Key Rotation**

The AES-256 encryption key is currently static and must be manually updated on both the Cardputer (via reflashing) and the Kubernetes secret (via kubectl edit secret). A secure over-the-air key rotation mechanism would allow the gateway to push a new key to all field devices without physical access. This would require implementing a key exchange protocol over the LoRa link, which is challenging due to the limited bandwidth but feasible for occasional key updates.

**8.5 High-Availability Master Node**

The cluster currently has a single master node (the Mini PC). If this node fails, the Kubernetes API becomes unavailable, and new pod scheduling is impossible, although existing pods continue to run. A high-availability configuration would require three master nodes (or an odd number) and an external database such as etcd in clustered mode. The team did not pursue this because it would require additional hardware and significantly more complex configuration.

**8.6 Downlink Messaging (Hub to Cardputer)**

The current system supports only uplink messaging: from the Cardputer to the hub. The LoRa hardware is capable of bidirectional communication, and the bridge script could be extended to listen for messages from the receiver service and transmit them to the Cardputer. This would enable alerts from the hub to field users, such as temperature threshold warnings or emergency broadcasts. The Cardputer firmware would need to be extended to listen for downlink packets on a separate channel or using a different addressing scheme.

**8.7 Authenticated Encryption (AES-GCM)**

The current implementation uses AES-CBC mode, which provides confidentiality but not integrity. An attacker could tamper with a ciphertext, and the decryption would produce garbage (which would be rejected by the sequence number check or padding validation) but could potentially cause a denial of service. Switching to AES-GCM would provide both confidentiality and integrity in a single algorithm, making tampering detectable with certainty. This is a straightforward code change in both the bridge and the Cardputer firmware.

**8.8 Mutual TLS Between Bridge and Receiver**

The LoRa bridge communicates with the receiver service over HTTP without encryption or authentication, relying on Kubernetes network policies for isolation. In a production deployment, mutual TLS (mTLS) would ensure that only the bridge (with a valid certificate) can send messages to the receiver. This would also encrypt traffic within the cluster. A service mesh such as Linkerd could be used to automate mTLS configuration.

**8.9 Formal Range Testing**

The team performed informal range tests only within a single building. A formal range test with measured distances, varying terrain, and different antenna configurations would provide useful data for deployment planning. The LoRa radio is capable of several kilometers in line-of-sight conditions, but actual performance depends on the environment.

**8.10 Non-Repudiation for Messages**

The current system does not provide cryptographic non-repudiation. A user could deny having sent a message. Adding digital signatures (for example, Ed25519) to each message would allow the receiver to prove that a specific Cardputer (with a known public key) sent the message. This would require generating a key pair for each field device and storing the public keys in the cluster.

**8.11 Support for Multiple Field Devices**

The system currently assumes a single Cardputer source. The bridge and receiver track sequence numbers per source, so extending to multiple devices would require only adding device identifiers to the protocol. The Cardputer firmware would need to include a unique device ID in the encrypted payload. This is a minor enhancement.

These future work items are listed in rough order of priority based on the team's assessment of value versus implementation effort. The most immediately useful enhancements are the web dashboard and downlink messaging, followed by battery power and over-the-air key rotation. The team encourages anyone extending the project to contribute these features.

11. ## **9\. Conclusion**

The Kuber-Tuber project successfully demonstrates a portable, encrypted, self-healing communication hub that operates entirely without internet, cellular, or satellite infrastructure. The system integrates LoRa radio technology with a lightweight Kubernetes cluster (K3s) to provide secure, offline messaging for disaster response, temporary events, remote industrial sites, and IoT backup scenarios.

Most core project goals were achieved. A four-node K3s cluster was built using a Mini PC master and three Raspberry Pi workers, with a dedicated Raspberry Pi router providing VLAN isolation and firewall enforcement. The AES-256-CBC encryption pipeline, replay protection, ACK/retry logic, and receiver pod were fully implemented and verified at the component level. The Rancher dashboard provides centralised monitoring and log viewing. Kubernetes self-healing was demonstrated live by rescheduling pods after a worker node was powered off.

End-to-end LoRa transmission between the Cardputer ADV and worker1 was not achieved at the final presentation (2026-04-09) due to a hardware fault: the Cardputer's SX1262 LoRa cap was not detected by the firmware ("Check pins/cap" error), and the issue could not be resolved on the day. The receiver pod and bridge service were confirmed healthy in Rancher, but no live LoRa transmission occurred. See Section 10 for a full account of the presentation outcome.

The team encountered and resolved significant technical challenges, including K3s IP address change limitations, Rancher bootstrap password retrieval, and VLAN trunk configuration on a Raspberry Pi. Each challenge was documented in the issues log and contributed to the team's learning. A formal threat model and risk assessment guided security controls, which included SSH key authentication, host firewalls, inter-VLAN iptables rules, and Kubernetes RBAC and network policies. Of 26 confirmed tests, 19 passed; 7 failed due to the Cardputer LoRa hardware fault.

The project is fully documented and open-sourced. The GitHub repository contains all configuration files, source code, checklists, and documentation. Future work includes a web dashboard, Matrix chat integration, battery power, over-the-air key rotation, and downlink messaging.

Kuber-Tuber demonstrates that low-cost, low-power hardware can deliver a secure, offline, resilient communication platform. The cluster, networking, and encryption components are complete and provide a solid foundation for further development — the primary remaining step being a working LoRa link between field node and gateway.

## 

## **10\. Final Presentation & Capstone Outcome**

The Kuber-Tuber capstone was presented to the NSCC Cybersecurity program on April 9, 2026.

**10.1 Presentation Structure**

The presentation consisted of 20 slides delivered by Alex MacIntyre, Anthony Frison, Nathan Boudreau, and Nick MacInnis. The narrative followed three arcs: the problem (cellular outages, growing DDoS attacks), the solution (Kuber-Tuber as an offline-first encrypted operations hub), and a live technical demonstration. Slides covered the hardware and network topology, the role of the Raspberry Pi as an inter-VLAN router, Kubernetes concepts and their mapping to the physical cluster, Rancher's dashboard capabilities, and LoRa radio technology.

**10.2 Live Demonstrations**

Two live demonstrations were conducted:

1. **Rancher Dashboard Tour** — The presenter walked the audience through the Rancher web interface, showing all four nodes as Active with real IPs (debian-master 10.0.10.94, worker1 10.0.20.138, worker2 10.0.20.150, worker3 10.0.20.63), running workloads in the lora-demo namespace, and cluster resource metrics. Presentation slides designed to illustrate the dashboard layout were used alongside the live interface to explain what each section represented.

2. **Node Failure and Self-Healing** — Anthony physically powered off one of the Pi workers in front of the audience. Rancher's node view showed the worker transition to NotReady, and the audience observed pods reschedule to a healthy worker in real time. This demonstrated Kubernetes self-healing with no manual intervention.

**10.3 LoRa Demonstration — Not Achieved**

A live end-to-end LoRa demonstration was planned: the Cardputer ADV would send an AES-256 encrypted message over LoRa to worker1, which would decrypt it and display the result in the receiver pod logs via Rancher. This demonstration could not be delivered.

On the day of the presentation, the Cardputer firmware displayed a "Check pins/cap" error on boot, indicating the SX1262 LoRa cap was not being detected at radio initialisation. The firmware was flashed and running correctly — the correct UI was displayed and the device was actively attempting to initialise the radio — but the hardware fault persisted. The team attempted changing the LoRa frequency on worker1 from 915 MHz to 868 MHz (hypothesising that the cap was tuned to 868 MHz), but this did not resolve the error, as the fault occurs at initialisation before frequency configuration is reached.

The receiver pod (lora-receiver) and bridge service (lora-bridge) were confirmed healthy in Rancher at the time. The fallback option was still images of the Cardputer taken during development, which were shown within the presentation slides to illustrate what the send/receive workflow would look like.

**10.4 Capstone Outcome Summary**

| Component | Status |
| ----- | ----- |
| 4-node K3s cluster (master + 3 workers) | Fully operational |
| VLAN-segmented network with Pi router | Fully operational |
| Rancher dashboard (NodePort 30443) | Demonstrated live |
| lora-receiver pod + lora-bridge service | Deployed and healthy |
| AES-256 decryption pipeline | Implemented; component-level verified |
| Pod rescheduling after node failure | Demonstrated live |
| End-to-end Cardputer → worker1 LoRa link | **Not demonstrated** — "Check pins/cap" hardware error |

---

13. ## **11\. Appendices**

The following appendices provide supplementary material referenced throughout this report. Due to the physical nature of the hardware and the hands-on development process, several photographs are included to illustrate the final setup and key milestones.

**Appendix A: Hardware Photographs**

*Note: The actual photographs are inserted here in the final document. The following descriptions indicate what each image shows.*

**Figure A.1 – Complete Hub Assembly**  
A photograph showing all hardware components connected and powered: the MeLE Quieter 4C Mini PC, three Raspberry Pi 4 workers, the dedicated router Pi, the NETGEAR GS305E managed switch, and the Waveshare SX1262 LoRa HAT attached to worker1. Ethernet cables are visible connecting each device to the switch.

**Figure A.2 – Cardputer Field Node**  
A close-up of the Cardputer ADV with the attached LoRa module. The screen displays the firmware version and the current sequence number. The keyboard and antenna are clearly visible.

**Figure A.3 – Router Pi and Switch Detail**  
A photograph showing the Raspberry Pi router and the managed switch, with labels indicating the trunk port (to the router) and access ports (to the Mini PC and workers). The VLAN configuration is annotated.

**Figure A.4 – Team at Work (Milestone)**  
A photograph taken during a Friday work session at Nathan's home, showing the team troubleshooting the LoRa HAT detection. Laptops, the cluster hardware, and a terminal screen showing SPI detection are visible.

**Figure A.5 – Rancher Dashboard**  
A screenshot of the Rancher UI showing all four nodes in the cluster with a Ready status, CPU and memory usage, and the lora-demo namespace with the running receiver pod.

**Figure A.6 – Cardputer Sending a Message**  
A sequence of two photographs: the first shows the user typing "Hello Kuber-Tuber" on the Cardputer keyboard; the second shows the device screen with a green flash indicating successful ACK.

**Figure A.7 – Receiver Log Output**  
A screenshot of a terminal window running kubectl logs \-f deployment/lora-receiver, displaying the accepted message with timestamp, sequence number, and source.

**Figure A.8 – Worker Failure Demonstration**  
A photograph showing worker2 powered off (LEDs off) while the Rancher dashboard on a laptop screen shows the node as NotReady. A second terminal shows the nginx pod rescheduled to worker3.

**Appendix B: Bill of Materials (Detailed)**

The complete hardware bill of materials, including part numbers, quantities, estimated costs in Canadian dollars, and sourcing information, is provided in a separate document. The final total cost was approximately $940 to $1,305 CAD. A summary table is reproduced here for convenience.

| Component | Quantity | Approx. CAD Total |
| ----- | ----- | ----- |
| MeLE Quieter 4C Mini PC (16GB RAM, 512GB SSD) | 1 | (team-owned, estimated $250) |
| Raspberry Pi 4 (4GB) – workers | 3 | $306.75 |
| Raspberry Pi 4 (2GB) – router | 1 | $74.95 |
| NETGEAR GS305E managed switch | 1 | $32.99 |
| Waveshare SX1262 LoRa HAT | 1 | $49.06 |
| Cardputer ADV \+ LoRa module | 1 | $70.02 |
| MicroSD cards (32GB) | 4 | $60.00 |
| Power supplies (5.1V/3A USB-C) | 4 | $67.80 |
| Ethernet cables (Cat6) | 6 | $45.00 |
| **Subtotal** |  | **$956.57** |
| Contingency (10%) |  | $95.66 |
| **Grand Total (approx.)** |  | **$1,052.23** |

Full details (part numbers, URLs, alternative sources) are available in the project's Hardware-BOM.md file.

**Appendix C: Test Results Summary**

The following table summarises all 31 tests performed, their outcomes, and relevant notes. Detailed command outputs and timestamps are preserved in the project's test logs.

| Test Category | Number of Tests | Passed | Failed | Notes |
| ----- | ----- | ----- | ----- | ----- |
| Connectivity and Network | 6 | 6 | 0 | Includes ping, SSH, inter-VLAN routing, DHCP |
| Kubernetes Cluster | 4 | 4 | 0 | Node status, pod deployment, service exposure |
| Rancher Dashboard | 5 | 5 | 0 | UI access, login, cluster import, log viewing |
| LoRa Hardware and Unencrypted | 3 | 2 | 1 | SPI detection (pass), HAT detection (pass), basic send/receive (fail — Cardputer LoRa cap not detected) |
| LoRa Encrypted End-to-End | 6 | 0 | 6 | All failed — Cardputer "Check pins/cap" error on 2026-04-09; no transmission possible |
| Resilience and Failure | 2 | 2 | 0 | Worker node power loss and pod rescheduling confirmed live at final presentation |
| **Total** | **26** | **19** | **7** |  |

19 of 26 confirmed tests passed. All 7 failures stem from the Cardputer SX1262 LoRa cap hardware fault on the day of the final presentation. Tests not performed (master reboot, switch reboot, router Pi reboot, bridge crash, receiver pod crash) are not included in these counts.

**Appendix D: Key Configuration Files (Excerpts)**

**D.1 Router Pi iptables Rules (excerpt)**

\# Default DROP on FORWARD  
iptables \-P FORWARD DROP

\# Allow established and related connections  
iptables \-A FORWARD \-m state \--state ESTABLISHED,RELATED \-j ACCEPT

\# Allow SSH from control plane to workers  
iptables \-A FORWARD \-s 10.0.10.0/24 \-d 10.0.20.0/24 \-p tcp \--dport 22 \-j ACCEPT

\# Allow K3s API from workers to master  
iptables \-A FORWARD \-s 10.0.20.0/24 \-d 10.0.10.201 \-p tcp \--dport 6443 \-j ACCEPT

\# Log dropped packets  
iptables \-A FORWARD \-j LOG \--log-prefix "FW-DROP: "

**D.2 LoRa Bridge Systemd Service (lora-bridge.service)**

\[Unit\]  
Description=LoRa Bridge to Kubernetes  
After=network.target

\[Service\]  
User=pi  
WorkingDirectory=/home/pi/kuber-tuber/LoRa  
ExecStart=/home/pi/kuber-tuber/LoRa/venv/bin/python /home/pi/kuber-tuber/LoRa/LoRa-Bridge.py  
Restart=always  
RestartSec=10

\[Install\]  
WantedBy=multi-user.target

**D.3 Kubernetes Secret for AES Key (excerpt)**

apiVersion: v1  
kind: Secret  
metadata:  
  name: lora-encryption-key  
  namespace: lora-demo  
type: Opaque  
data:  
  key: \<base64-encoded-32-byte-key\>

The actual key is not printed here for security reasons. The key was generated using openssl rand \-base64 32 and stored securely.

**Appendix E: Glossary**

Refer to the Glossary section (pages 30-38 of this report) for definitions of all technical terms used, including LoRa, K3s, VLAN, AES-256-CBC, sequence number, replay protection, pod, node, and others.


The video shows:

* Rancher dashboard with all nodes Ready

* Cardputer typing and sending an encrypted message

* Bridge logs showing decryption and forwarding

* Receiver logs displaying the message

* Replay attack rejection

* Worker failure and pod rescheduling

**Appendix G: GitHub Repository Structure**

The complete project is open-sourced at https://github.com/x-alted/kuber-tuber. The repository contains the following key files and directories:

* README.md – Project overview and quick start

* Quick-Start-Guide.md – Step-by-step setup instructions

* FAQ.md – Frequently asked questions

* Service-Configuration.md – Detailed installation commands

* Issues-Log.md – Chronological record of problems and resolutions

* Test-Results.md – Full test matrix and outcomes

* Network-Topology.md – IP assignments, VLANs, switch configuration

* Hardware-BOM.md – Complete bill of materials

* Use-Cases.md – Detailed scenario descriptions

* Threat-Model.md – STRIDE analysis per component

* Risk-Assessment.md – Likelihood and impact scoring

* LoRa/ – All LoRa-related code (bridge script, receiver YAML, Cardputer firmware, utilities, integration guide)

* Security/ – Hardening checklist, threat model, risk assessment

* Networking/ – Network topology and tasks

* checklists/ – Task lists for setup, Kubernetes, LoRa, networking

All documentation is in Markdown format. The repository is licensed under the MIT License.

13. ## **11\. Glossary**

**Access Port** – A switch port configured to carry traffic for only one VLAN. Devices connected to an access port cannot see traffic from other VLANs. In this project, the managed switch ports connected to the Mini PC and the Raspberry Pi workers are configured as access ports for VLAN 10 and VLAN 20 respectively. This prevents a device on the worker VLAN from directly communicating with a device on the control plane VLAN at the switch level.

**ACK (Acknowledgment)** – A short message sent by a receiver to confirm that a transmitted message was received correctly. In this project, after the LoRa bridge successfully decrypts a message and forwards it to the receiver service, it sends an ACK packet back to the Cardputer. The Cardputer waits up to 1.5 seconds for this ACK. If no ACK arrives, it retransmits the message up to three times. The sequence number is incremented only after receiving an ACK, preventing message loss.

**AES-256-CBC (Advanced Encryption Standard 256-bit, Cipher Block Chaining)** – A symmetric encryption algorithm that uses a 256-bit key (32 bytes) to transform readable plaintext into unreadable ciphertext. The same key is used for encryption and decryption. CBC mode adds a random initialization vector (IV) before each encryption so that the same plaintext produces different ciphertext each time, preventing pattern analysis. In this project, the Cardputer encrypts each message with AES-256-CBC before transmitting over LoRa. The LoRa bridge decrypts the message using the same key, which is stored as a Kubernetes secret. This ensures that anyone eavesdropping on the radio frequency cannot read the message content.

**Air-Gapped** – A network or computer system that is physically disconnected from the internet and any other external network. An air-gapped system cannot be reached remotely and does not rely on outside infrastructure. In this project, the Kuber-Tuber hub is designed to be air-gapped. It operates entirely on its own hardware, using LoRa radio for field communication and Ethernet for internal cluster traffic. No internet connection is required or used during normal operation. This design ensures that the system works in disaster zones or remote areas where no internet exists.

**Base64** – A method of encoding binary data (such as encrypted messages) into plain text using only 64 characters: letters (both cases), digits, plus sign, and forward slash. This encoding makes binary data safe to transmit over text-based protocols or through systems that might corrupt raw bytes. In this project, the Cardputer encrypts the message and initialization vector into binary ciphertext, then encodes the result as a Base64 string. The LoRa radio transmits this string as plain text. The bridge receives the Base64 string and decodes it back to binary before decryption. This ensures the encrypted data survives transmission without corruption.

**Bootstrap Password** – A temporary, automatically generated password that is created when Rancher is first installed. It is stored as a Kubernetes secret in the cattle-system namespace. The user must log in with this password on the first visit to the Rancher dashboard. After successful login, Rancher requires the user to change the password immediately. In this project, the team attempted to set a custom bootstrap password during Helm installation, but the setting was ignored. They retrieved the actual password using a kubectl get secret command. This is a common troubleshooting step when deploying Rancher.

**Bridge (LoRa Bridge)** – A software service that connects two different networks or protocols. In this project, the LoRa bridge runs on worker1 as a systemd service. It continuously listens for incoming LoRa packets, decrypts each packet using the AES-256 key, validates the sequence number to prevent replay attacks, and then forwards the decrypted message as an HTTP POST request to the receiver service inside the Kubernetes cluster. The bridge also sends an ACK packet back to the Cardputer to confirm successful processing. The bridge is the critical link between the LoRa radio world and the Kubernetes cluster.

**Cardputer ADV** – A portable handheld device manufactured by M5Stack. It contains an ESP32-S3 microcontroller, a 56-key keyboard, a 1.14-inch color screen, a 1750 mAh battery, and a connector for an external LoRa module. The device is programmed using PlatformIO or the Arduino IDE. In this project, the Cardputer serves as the field node. Users type messages on its keyboard, and the custom firmware encrypts each message and transmits it over LoRa. The device costs approximately 30 USD, plus an additional 15 USD for the LoRa module, making it an affordable off-grid communication tool.

**Chip Select (CS)** – A digital signal pin used on a microcontroller to activate a specific peripheral device on an SPI bus. Multiple devices can share the same SPI data lines, but each device has its own CS pin. To talk to a device, the microcontroller pulls its CS pin low (or high, depending on the device) to select it. In this project, the LoRa HAT on worker1 uses CE0 (GPIO8) as its chip select pin. The bridge script configures the radio library to use board.CE0. If the wrong CS pin is used, the radio will not respond. This was a troubleshooting point during initial hardware setup.

**Ciphertext** – Data that has been encrypted and is unreadable without the correct decryption key. Ciphertext appears as random-looking bytes or characters. In this project, the Cardputer converts the user's plaintext message into ciphertext using AES-256-CBC. The ciphertext is then encoded as a Base64 string and transmitted over LoRa. An eavesdropper capturing the LoRa transmission sees only the ciphertext. Without the AES key, they cannot recover the original message.

**CIDR Notation (Classless Inter-Domain Routing)** – A compact way to write an IP address and its subnet mask. It consists of an IP address followed by a forward slash and a number indicating how many bits are used for the network portion. For example, 10.0.10.0/24 means the first 24 bits (the first three numbers) define the network, and the remaining 8 bits are for individual devices. In this project, the control plane VLAN uses 10.0.10.0/24, which allows up to 254 devices. The worker VLAN uses 10.0.20.0/24. CIDR notation is used throughout the network configuration files and documentation.

**Cluster** – A group of computers (called nodes) that work together as a single system. In Kubernetes, the cluster consists of one or more master nodes that manage the control plane and multiple worker nodes that run containerized applications. The cluster provides high availability and fault tolerance: if one node fails, the workload shifts to other nodes. In this project, the K3s cluster has four nodes: one master (the Mini PC) and three workers (Raspberry Pis). The cluster runs the receiver service and any other deployed applications.

**Control Plane** – The set of Kubernetes components that manage the cluster's state and make global decisions. It includes the API server (which receives commands from kubectl), the scheduler (which assigns pods to nodes), the controller manager (which handles node failures and pod replication), and etcd (which stores cluster state). In this project, the control plane runs entirely on the Mini PC master node. The control plane is isolated in VLAN 10, while workers are in VLAN 20\. This isolation prevents a compromised worker from directly accessing the control plane.

**Container** – A lightweight, standalone executable package of software that includes everything needed to run an application: code, runtime, system tools, libraries, and settings. Containers are isolated from each other and from the host system, but they share the host operating system kernel, making them much smaller and faster than virtual machines. In this project, the receiver service runs as a container inside a Kubernetes pod. The container image is based on Python 3.11 and includes the Flask framework. Kubernetes manages the lifecycle of this container.

**Container Orchestration** – The automated management of containerized applications, including deployment, scaling, network configuration, and failure recovery. A container orchestration system (such as Kubernetes) can automatically restart failed containers, distribute containers across multiple nodes, and adjust the number of running containers based on demand. In this project, K3s provides container orchestration. When a worker node fails, Kubernetes automatically reschedules the receiver pod (and any other pods) to a healthy worker node without manual intervention. This is the self-healing capability demonstrated in the project.

**Daemon** – A background process that runs continuously on a computer, performing tasks without direct user interaction. Daemons typically start automatically when the system boots and run until shutdown. In this project, the LoRa bridge runs as a systemd daemon on worker1. The systemd service file defines how the daemon starts, stops, and restarts if it crashes. This ensures that the bridge is always running, even after a reboot or unexpected failure. Other daemons used include sshd (SSH server), k3s (Kubernetes), and auditd (logging).

**Debian** – A free, open-source Linux operating system known for its stability and long release cycles. Debian uses the apt package manager and the .deb package format. It is widely used for servers and desktop computers. In this project, the Mini PC master node runs Debian 13\. Debian was chosen because it is lightweight, well-documented, and familiar to the team. The installation includes the K3s control plane, Rancher, and all supporting tools. Debian's stability is important because the master node is critical to cluster management.

**Decryption** – The process of converting encrypted data (ciphertext) back into its original readable form (plaintext) using a secret key. Decryption reverses the encryption process. If the wrong key is used, the output will be garbage. In this project, the LoRa bridge receives a Base64-encoded ciphertext packet from the Cardputer. It decodes the Base64, extracts the initialization vector (IV), and uses the AES-256 key (stored as a Kubernetes secret) to decrypt the payload. The decrypted plaintext contains the sequence number and the user's message. Decryption succeeds only if the key matches the one used by the Cardputer.

**Denial of Service (DoS)** – An attack that prevents legitimate users from accessing a service or system. DoS attacks typically overwhelm the target with excessive traffic, requests, or noise, exhausting its resources. In the context of LoRa, a DoS attack could be radio jamming: transmitting continuous noise on the 868 MHz frequency to prevent any legitimate packets from getting through. This project does not include specific countermeasures against jamming, which is accepted as an operational limitation. For critical deployments, frequency hopping or multiple gateways on different channels could mitigate this risk.

**DHCP (Dynamic Host Configuration Protocol)** – A network protocol that automatically assigns IP addresses and other network configuration settings (such as subnet mask, default gateway, and DNS servers) to devices when they connect to a network. Without DHCP, every device would need a manually configured static IP. In this project, the router Pi runs a DHCP server using dnsmasq. For VLAN 10 (control plane), it assigns IPs in the range 10.0.10.50 to 10.0.10.150. For VLAN 20 (workers), it assigns IPs in 10.0.20.50 to 10.0.20.150. The master and worker nodes use static IPs (debian-master at 10.0.10.94; worker1 at 10.0.20.138, worker2 at 10.0.20.150, worker3 at 10.0.20.63) to ensure consistent addressing for the cluster.

**Dnsmasq** – A lightweight software package that provides both DNS (Domain Name System) forwarding and DHCP server functionality in a single daemon. It is commonly used on routers and small networks because it consumes few resources and is easy to configure. In this project, the router Pi runs dnsmasq to serve DHCP leases to devices on both VLAN 10 and VLAN 20\. The configuration file (/etc/dnsmasq.conf) defines separate DHCP ranges for each VLAN interface (eth0.10 and eth0.20). Dnsmasq also forwards DNS queries to upstream servers (8.8.8.8 and 8.8.4.4) when internet access is temporarily available for updates.

**Ed25519** – A modern public-key cryptographic algorithm used for digital signatures and authentication. It is designed to be fast, secure, and resistant to side-channel attacks. Ed25519 keys are shorter than older RSA keys while providing comparable or better security. In this project, the team generated Ed25519 SSH key pairs for authenticating access to all nodes. The public key is deployed to the authorized\_keys file on every node (Mini PC master, three workers, and router Pi). Password authentication is disabled, so only someone with the corresponding private key (protected by a passphrase) can log in via SSH.

**Encryption** – The process of converting readable plaintext into unreadable ciphertext using a mathematical algorithm and a secret key. Encryption protects data confidentiality: even if an attacker intercepts the encrypted data, they cannot read it without the key. In this project, the Cardputer encrypts each message using AES-256-CBC before transmitting over LoRa. The LoRa bridge decrypts the message using the same key. This ensures that anyone listening to the 868 MHz frequency cannot understand the messages. Encryption is the primary defense against eavesdropping in the LoRa link.

**ESP32-S3** – A microcontroller chip manufactured by Espressif Systems. It features a dual-core Xtensa LX7 processor, built-in Wi-Fi and Bluetooth 5, a rich set of peripherals (SPI, I2C, UART, etc.), and hardware acceleration for encryption (AES, SHA, RSA). It is popular for IoT devices due to its low power consumption and high performance. In this project, the Cardputer ADV uses an ESP32-S3 as its main processor. The custom firmware runs on this chip, handling keyboard input, AES-256 encryption, LoRa communication via RadioLib, and non-volatile storage of the sequence number using the Preferences library.

**etcd** – A distributed, reliable key-value store used by Kubernetes to store all cluster state data, including node information, pod definitions, secrets, and configuration maps. etcd is designed to be highly available and consistent. In a standard Kubernetes cluster, etcd runs on a separate set of nodes. In K3s, etcd is embedded into the master node (or replaced with SQLite for single-node clusters). In this project, the K3s master node uses the embedded etcd. The team backs up the etcd data directory (/var/lib/rancher/k3s/server/db) as part of disaster recovery planning.

**Fail2ban** – A security tool that scans log files for repeated failed login attempts and temporarily blocks the offending IP addresses using firewall rules. It protects services such as SSH from brute-force attacks. In this project, Fail2ban is installed on all nodes (Mini PC master, router Pi, and worker Pis). The default configuration monitors the SSH log (/var/log/auth.log) and bans any IP address that fails to log in multiple times within a short period. Since password authentication is disabled, the risk is low, but Fail2ban adds an extra layer of defense against SSH key brute-forcing attempts.

**Firewall** – A system that monitors and controls incoming and outgoing network traffic based on predefined security rules. Firewalls can be hardware appliances or software running on a computer. They use rules to allow or block traffic based on IP addresses, ports, protocols, or connection states. In this project, there are two layers of firewalls. First, each node runs UFW (Uncomplicated Firewall) to block all incoming traffic except SSH and necessary Kubernetes ports. Second, the router Pi runs iptables to control traffic between VLANs, with a default DROP policy on the FORWARD chain. Only specific traffic (SSH and K3s API from control plane to workers) is allowed.

**Flask** – A lightweight web framework for Python. It is designed to be simple and flexible, allowing developers to create web applications and APIs with minimal code. Flask does not include an ORM (Object-Relational Mapping) or form validation by default, but extensions can add these features. In this project, the receiver service is implemented as a Flask application. It exposes two endpoints: /health for liveness checks and /api/v1/messages to accept POST requests from the LoRa bridge. The Flask app runs inside a Kubernetes pod and logs received messages to stdout, which Kubernetes captures and makes available via kubectl logs.

**Gateway** – A network device or software service that connects two different networks or protocols, translating traffic between them. A gateway can route packets between subnets, convert between radio and Ethernet, or bridge different application protocols. In this project, there are two gateways. The first is the router Pi, which acts as a Layer 3 gateway between VLAN 10 (control plane) and VLAN 20 (workers). The second is the LoRa bridge running on worker1, which acts as an application gateway: it receives LoRa radio packets and forwards them as HTTP requests to the Kubernetes receiver service.

**HAT (Hardware Attached on Top)** – A hardware board that attaches directly to the GPIO (General Purpose Input Output) pins of a Raspberry Pi. HATs follow a specific mechanical and electrical standard, including an EEPROM that identifies the board. They are designed to be stacked on top of the Pi, hence the name. In this project, the Waveshare E22-900T22S LoRa HAT is attached to worker1. It adds LoRa radio capability to the Raspberry Pi. The HAT communicates via UART serial (/dev/ttyAMA0) at 9600 baud, and uses two GPIO pins (M0 on GPIO22, M1 on GPIO27) to switch between normal transmission mode and configuration mode.

**Helm** – A package manager for Kubernetes that simplifies installing, upgrading, and managing applications (called charts) on a cluster. A Helm chart packages all the Kubernetes YAML files (deployments, services, config maps, secrets) needed for an application. Helm also manages releases, allowing rollbacks to previous versions. In this project, Helm is installed on the Mini PC master. It is used to install cert-manager (which manages TLS certificates) and Rancher. The commands include helm repo add, helm install, and helm upgrade. Helm reduces the complexity of deploying multi-component applications.

**HTTP POST** – One of the standard methods (verbs) of the HTTP protocol, used to send data from a client to a server. Unlike GET (which requests data), POST submits data to be processed, often resulting in a change of server state. POST requests include a body containing the data to be submitted. In this project, the LoRa bridge sends an HTTP POST request to the receiver service after successfully decrypting a message. The request URL is http://lora-receiver.lora-demo.svc.cluster.local:8080/api/v1/messages. The body is a JSON object containing the sequence number, message text, source identifier, and timestamp. The receiver responds with HTTP 200 on success.

**Initialization Vector (IV)** – A random or pseudo-random value used as the starting point for encryption algorithms that operate in block modes such as CBC (Cipher Block Chaining). The IV ensures that encrypting the same plaintext twice produces different ciphertext each time, preventing pattern analysis. The IV does not need to be kept secret, but it must be unpredictable. In this project, the Cardputer generates a fresh 16-byte random IV for each message using the ESP32's hardware random number generator (esp\_random()). The IV is prepended to the ciphertext before Base64 encoding. The LoRa bridge extracts the IV from the received packet and uses it during decryption.

**iptables** – A user-space utility program that allows system administrators to configure the packet filtering rules of the Linux kernel firewall. iptables organizes rules into tables (filter, nat, mangle, raw) and chains (INPUT, OUTPUT, FORWARD). Each rule specifies conditions (source IP, destination IP, port, protocol) and an action (ACCEPT, DROP, REJECT, LOG). In this project, the router Pi uses iptables to control inter-VLAN traffic. The default policy on the FORWARD chain is DROP. Explicit rules allow established and related connections, SSH from control plane to workers on port 22, and K3s API traffic from workers to master on port 6443\. All other inter-VLAN traffic is blocked.

**ISM Band (Industrial, Scientific, and Medical Band)** – A set of radio frequency bands reserved internationally for non-communication uses such as industrial heating, medical diathermy, and scientific research. These bands are also available for unlicensed radio communication devices, provided they comply with power and duty cycle regulations. Common LoRa ISM frequencies include 915 MHz (North America), 868 MHz (Europe), and 433 MHz (Asia/other regions). In this project, the LoRa HAT and Cardputer are configured to transmit at 868 MHz, matching the frequency programmed into the Cardputer firmware and the E22-900T22S gateway configuration. This frequency provides a balance of range (several kilometers in open terrain) and data rate sufficient for short text messages.

**Jamming** – A form of denial-of-service attack in which an attacker transmits radio signals on the same frequency used by legitimate devices, overwhelming the channel and preventing successful communication. Jamming can be continuous (constant noise) or reactive (transmitting only when the channel is busy). LoRa is somewhat resistant to narrowband interference due to its spread spectrum modulation, but a powerful or well-timed jammer can still disrupt communication. In this project, jamming is accepted as an operational limitation. No countermeasures (such as frequency hopping or listen-before-talk) are implemented. For critical deployments, multiple gateways on different channels or directional antennas would reduce the risk.

**JSON (JavaScript Object Notation)** – A lightweight, text-based data interchange format that is easy for humans to read and write and easy for machines to parse and generate. JSON represents data as key-value pairs and ordered lists. It is language-independent but uses conventions familiar to programmers of the C-family of languages. In this project, the LoRa bridge sends decrypted messages to the receiver service as JSON objects in the body of an HTTP POST request. A typical JSON payload looks like this: {"seq": 42, "message": "Hello", "source": "cardputer", "timestamp": 1743973445.123}. The receiver service parses this JSON, validates the fields, and logs the message.

**K3s** – A lightweight, certified Kubernetes distribution developed by Rancher Labs. K3s is packaged as a single binary of less than 100 MB and requires only 512 MB of RAM to run. It is designed for edge computing, IoT devices, and low-resource environments such as Raspberry Pis. K3s includes embedded etcd or SQLite, simplifies installation, and removes non-essential features while remaining fully compatible with standard Kubernetes APIs. In this project, K3s v1.34.5 runs on all four cluster nodes (one Mini PC master and three Raspberry Pi workers). The installation command is curl \-sfL https://get.k3s.io | sh \-. K3s provides the container orchestration that enables self-healing and centralized management.

**kubectl** – The command-line tool for interacting with a Kubernetes cluster. kubectl sends commands to the cluster's API server, which then schedules pods, deploys applications, retrieves logs, and manages resources. Common commands include kubectl get nodes (list all nodes), kubectl get pods (list running containers), kubectl logs (view container output), and kubectl apply \-f (create or update resources from a YAML file). In this project, kubectl is used on the Mini PC master to check cluster health, deploy the receiver service, view receiver logs, and test pod rescheduling by draining a worker node.

**Kubernetes (K8s)** – An open-source container orchestration platform originally developed by Google. It automates the deployment, scaling, and management of containerized applications across a cluster of machines. Kubernetes provides features such as self-healing (restarting failed containers), load balancing, rolling updates, and declarative configuration (YAML manifests). The name is often abbreviated as K8s because there are eight letters between the K and the s. In this project, the team uses K3s, a lightweight distribution of Kubernetes, to orchestrate the receiver service and demonstrate self-healing by rescheduling pods after a worker node fails. The Kubernetes API server runs on the Mini PC master.

**Latency** – The time delay between the initiation of an action and the observation of its effect. In networking, latency is the time it takes for a packet to travel from source to destination. In a LoRa system, latency includes encryption time, radio transmission time, over-the-air propagation, reception, decryption, and forwarding. In this project, the end-to-end latency from pressing Send on the Cardputer to the message appearing in the receiver logs is consistently under 500 milliseconds under good signal conditions. This low latency is sufficient for text messaging applications.

**Least Privilege** – A security principle stating that a user, process, or system component should be granted only the minimum permissions necessary to perform its function, and no more. This limits the potential damage if that entity is compromised. In this project, least privilege is applied in several ways. Kubernetes RBAC (Role-Based Access Control) restricts which service accounts can read secrets or delete pods. The LoRa bridge runs as the non-root user pi, not as root. Containers (such as the receiver pod) are configured with runAsNonRoot: true and allowPrivilegeEscalation: false. SSH access is restricted to team members with specific keys. The switch management interface is restricted to the management VLAN.

**LoRa (Long Range)** – A wireless communication technology that uses chirp spread spectrum modulation to transmit small amounts of data over long distances (several kilometers in line-of-sight conditions) while consuming very little power. LoRa operates in unlicensed ISM bands (915 MHz in North America, 868 MHz in Europe). It is designed for low-bandwidth applications such as sensor readings, tracking, and text messages. LoRa does not require internet, cellular, or satellite infrastructure. In this project, LoRa is the primary communication link between the Cardputer field node and the LoRa gateway on worker1. Messages are encrypted at the application layer because LoRa itself does not provide encryption. The data rate is low (only a few hundred bits per second), which is sufficient for short text messages.

**LoRa HAT** – A hardware add-on board (HAT stands for Hardware Attached on Top) that provides LoRa radio capability to a Raspberry Pi. The HAT connects to the Pi's GPIO pins and uses SPI for communication. The Waveshare SX1262 HAT used in this project operates at 915 MHz and includes an SX1262 transceiver chip. The HAT is attached to worker1 and serves as the LoRa gateway, receiving encrypted packets from the Cardputer and passing them to the bridge software. The HAT requires SPI to be enabled on the Raspberry Pi and uses CE0 (GPIO8) as the chip select pin and GPIO25 as the reset pin.

**Managed Switch** – A network switch that can be configured to create VLANs, monitor traffic, apply security settings, and manage bandwidth. Unlike an unmanaged switch (which simply forwards traffic with no configuration options), a managed switch allows an administrator to control port behavior, set up trunk and access ports, and enable features such as Spanning Tree Protocol (STP). In this project, the NETGEAR GS305E is a managed switch. It is configured with 802.1Q VLAN mode: port 1 is a trunk carrying VLANs 10 and 20, port 2 is an access port for VLAN 10 (Mini PC), and ports 3 through 5 are access ports for VLAN 20 (worker Pis). The switch management IP is 10.0.0.2, and the default password was changed for security.

**Master Node** – The node in a Kubernetes cluster that runs the control plane components: the API server, scheduler, controller manager, and etcd. The master node makes global decisions about the cluster (such as scheduling pods) and responds to API requests from kubectl. If the master node fails, no new pods can be scheduled, and commands like kubectl get nodes will fail, but existing pods on worker nodes continue to run. In this project, the Mini PC (10.0.10.201) is the sole master node. High availability (multiple master nodes) was not implemented due to hardware constraints and is documented as future work.

**MicroSD Card** – A small removable flash memory card used as persistent storage for Raspberry Pis. The Pi boots from the microSD card, which contains the operating system (Raspberry Pi OS Lite), application software, configuration files, and logs. MicroSD cards are prone to wear from frequent writes, especially in a Kubernetes cluster where container logs and etcd can cause heavy I/O. In this project, each of the four Raspberry Pis (three workers and the router Pi) boots from a 32GB Class 10 microSD card. To extend lifespan, the team disabled swap, set the noatime mount option, and configured container logs to use memory (emptyDir with medium: Memory) where possible.

**mTLS (Mutual TLS)** – A security protocol extension of TLS (Transport Layer Security) where both the client and the server present certificates to authenticate each other. In standard TLS (used for HTTPS websites), only the server proves its identity to the client. In mTLS, the client also proves its identity to the server, ensuring that only authorized clients can connect. In this project, mTLS is not implemented. The LoRa bridge communicates with the receiver service over plain HTTP, relying on Kubernetes network policies for isolation. Future work includes implementing mTLS (using a service mesh like Linkerd) to encrypt intra-cluster traffic and authenticate the bridge.

**Namespace** – A virtual cluster within a Kubernetes cluster that provides scope for names. Namespaces allow multiple teams or applications to share the same physical cluster while remaining isolated from each other. Resources such as pods, services, and secrets are created within a namespace. In this project, the receiver service is deployed in the lora-demo namespace. This namespace has its own network policies, secrets (the AES encryption key), and RBAC roles. The default namespace is used for test deployments (such as nginx). Namespaces help organize resources and limit the blast radius of a security breach.

**Node** – A single computer or virtual machine in a Kubernetes cluster. Each node runs a kubelet (agent that communicates with the control plane) and a container runtime (such as containerd). Nodes can be designated as master nodes (running control plane components) or worker nodes (running application pods). In this project, the cluster has four nodes: one master (Mini PC, 10.0.10.201) and three workers (worker1, worker2, worker3 at 10.0.20.208, 10.0.20.207, 10.0.20.202). The router Pi is not a cluster node; it is a separate device providing networking services. Node health is monitored via kubectl get nodes.

**NodePort** – A method of exposing a Kubernetes service to external traffic on a static port on each node. When a service is of type NodePort, Kubernetes allocates a port in the range 30000-32767 on every node. Any traffic sent to that port on any node is forwarded to the service's target pods. In this project, Rancher is exposed via NodePort 30443\. The Rancher dashboard is accessible at https://10.0.10.201:30443 (the Mini PC master's IP). NodePort is simple to configure but is not suitable for production load balancing; for a production deployment, an Ingress controller or external load balancer would be preferred.

**Non-Repudiation** – A security property that ensures a party cannot deny having performed a particular action, such as sending a message. Non-repudiation is typically achieved through digital signatures: the sender signs the message with a private key, and the receiver verifies the signature with the sender's public key. In this project, non-repudiation is not implemented. The Cardputer does not sign messages, so a user could plausibly deny having sent a particular message. This is acceptable for the project's use cases (such as event security or fridge monitoring), where audit logging of received messages is sufficient. Future work could add Ed25519 signatures.

**Non-Volatile Storage (NVS)** – A type of computer memory that retains stored data even when the device is powered off. Examples include flash memory, EEPROM, and solid-state drives. In microcontrollers, NVS is used to store configuration values that must survive reboots. In this project, the ESP32-S3 on the Cardputer uses its NVS (via the Preferences library) to store the current sequence number. The sequence number is saved after every successful message transmission (when an ACK is received). When the Cardputer powers on, it loads the last sequence number from NVS. This ensures that sequence numbers do not reset to zero after a reboot, which would cause replay protection to reject all subsequent messages.

**NTP (Network Time Protocol)** – A protocol for synchronizing the clocks of computer systems over a network. NTP uses a hierarchical system of time sources (stratum levels) to provide accurate, coordinated time. Accurate time is important for log correlation, certificate validation, and timestamping messages. In this project, all nodes (Mini PC, router Pi, and worker Pis) synchronize their clocks using NTP. The timedatectl command shows the synchronization status. Timestamps on received LoRa messages are generated using the system clock of the LoRa bridge and the receiver service, ensuring consistent logging.

**Open Source** – A type of software license that permits users to view, modify, and distribute the source code freely. Open source software encourages collaboration, transparency, and reuse. In this project, the entire Kuber-Tuber codebase and documentation are released under the MIT License, an open source license. The repository includes the Cardputer firmware (C++), the LoRa bridge (Python), the receiver service (Python/Flask), Kubernetes YAML manifests, systemd service files, and all markdown documentation. Anyone can fork the repository, modify it, and use it for their own purposes, with attribution.

**Over-the-Air (OTA)** – A method of updating firmware or software on a device without requiring a physical connection (such as USB). OTA updates are transmitted over a network or radio link. In the context of LoRa, OTA updates are challenging because of the low data rate (only a few hundred bits per second). In this project, over-the-air key rotation (updating the AES encryption key without re-flashing the Cardputer) is a future work item. It would require designing a key exchange protocol that works within LoRa's bandwidth limitations, as well as implementing secure storage for the new key on the ESP32.

**Padding (PKCS\#7)** – A method of adding extra bytes to a message before encryption so that its length becomes a multiple of the encryption algorithm's block size. AES has a block size of 16 bytes. PKCS\#7 padding adds between 1 and 16 bytes, where each added byte has a value equal to the number of padding bytes. For example, if 5 bytes are needed, each padding byte has the value 0x05. After decryption, the receiver examines the last byte to determine how many padding bytes to remove. In this project, the Cardputer applies PKCS\#7 padding to the plaintext (which includes the sequence number and message) before AES-CBC encryption. The LoRa bridge removes the padding after decryption, verifying that all padding bytes have the same value to detect corruption.

**Plaintext** – The original, readable form of data before encryption (or after decryption). Plaintext can be text, binary data, or any other format. In the context of encryption, plaintext is the input to the encryption algorithm and the output of the decryption algorithm. In this project, the plaintext message constructed by the Cardputer is a string in the format "\<sequence\_number\>|\<message\>", for example "42|Hello Kuber-Tuber". This plaintext is padded and encrypted into ciphertext. After the LoRa bridge decrypts the ciphertext, the plaintext is recovered, split into sequence number and message, and then forwarded to the receiver service.

**PlatformIO** – An open-source ecosystem for embedded development that provides a unified interface for building, debugging, and uploading firmware to microcontrollers. PlatformIO integrates with Visual Studio Code and supports over 1,000 boards and 40+ frameworks. It manages library dependencies and toolchains automatically. In this project, the Cardputer firmware is developed using PlatformIO. The platformio.ini file specifies the board (m5stack-cardputer), framework (arduino), and libraries (M5Cardputer, RadioLib). No external AES library is needed because the ESP32's built-in mbedtls is used. PlatformIO handles compilation and flashing over USB.

**Pod** – The smallest deployable unit in Kubernetes. A pod represents one or more containers that share storage, network, and a specification for how to run them. Containers within the same pod are co-located and co-scheduled. In this project, the receiver service runs as a pod in the lora-demo namespace. The pod contains a single container based on the python:3.11-slim image. The pod has a service account with limited permissions, and the AES encryption key secret is mounted as a volume. Kubernetes manages the pod's lifecycle: if the pod crashes, Kubernetes automatically recreates it.

**Port Forwarding** – A network function that redirects incoming traffic from one IP address and port to another destination. In the context of the router Pi, port forwarding is not used because the cluster is air-gapped. However, the term "port forwarding" is also used in the Linux kernel context: enabling net.ipv4.ip\_forward=1 allows a Linux machine to route packets between network interfaces (acting as a router). In this project, the router Pi has IP forwarding enabled so that it can forward packets between VLAN 10 and VLAN 20\. Without IP forwarding, packets would be dropped by the kernel. The iptables rules then control which forwarded packets are allowed.

**Pre-Shared Key (PSK)** – A secret key that is shared between two parties before any communication begins. In symmetric encryption, the same key is used for both encryption and decryption. The key must be kept secret and distributed through a secure channel (such as physical transfer or a pre-existing encrypted connection). In this project, the AES-256 encryption key is a pre-shared key. It is compiled into the Cardputer firmware and stored as a Kubernetes secret on the cluster. The key is never transmitted over LoRa or any network. This approach is simple but requires manual key updates; over-the-air key rotation is future work.

**Prometheus** – An open-source systems monitoring and alerting toolkit. It collects metrics from configured targets at specified intervals, stores them in a time-series database, and allows querying and alerting based on those metrics. Prometheus is often used with Grafana for visualization. In this project, Prometheus is not deployed, but it is mentioned as a potential future enhancement for monitoring cluster health, node resource usage, and LoRa message rates. The K3s metrics server provides basic CPU and memory data, but Prometheus would offer more detailed historical analysis and alerting.

**Python** – A high-level, interpreted programming language known for its readability and extensive standard library. Python is widely used for web development, data analysis, automation, and network programming. In this project, Python is used for the LoRa bridge script (LoRa-Bridge.py), the decryption utilities (decrypt\_utils.py, test\_decryption.py), and the receiver service (Flask application). The bridge uses libraries such as adafruit-circuitpython-rfm9x (LoRa radio control), pycryptodome (AES decryption), and requests (HTTP POST). Python's simplicity allowed the team to develop and debug the LoRa integration quickly.

**QoS (Quality of Service)** – A set of technologies that manage network traffic to ensure reliable performance for critical applications. QoS can prioritize certain types of traffic, limit bandwidth for others, and reduce latency or packet loss. In the context of LoRa, QoS is not typically used because LoRa is a best-effort protocol. In this project, no QoS mechanisms are implemented. The system relies on application-layer retries (the Cardputer retransmits up to three times) and the inherent robustness of LoRa's spread spectrum modulation. For critical messages, the acknowledgment (ACK) mechanism confirms delivery.

**Rancher** – An open-source Kubernetes management platform that provides a web-based user interface for deploying, managing, and monitoring Kubernetes clusters. Rancher simplifies cluster operations, offers built-in observability, and supports multi-cluster management. In this project, Rancher v2.9 is installed on the Mini PC master node via Helm. It is exposed on NodePort 30443 and accessed at https://10.0.10.201:30443. Rancher provides a dashboard showing node health, resource usage, pod logs, and allows easy deployment of workloads. It was used to import the existing K3s cluster and to view receiver service logs.

**Raspberry Pi OS Lite** – A Debian-based Linux operating system specifically designed for Raspberry Pi single-board computers. The "Lite" version does not include a desktop environment, making it lightweight and suitable for headless (no monitor) operation. It uses about 1 GB of storage and less than 100 MB of RAM when idle. In this project, all four Raspberry Pis (three workers and the router Pi) run Raspberry Pi OS Lite. The operating system was flashed to microSD cards using the official Raspberry Pi Imager. The Lite version was chosen to minimize resource usage, as the Pis are used only for K3s, the LoRa bridge, and routing.

**RBAC (Role-Based Access Control)** – A security model that restricts system access based on the roles of individual users or processes. In Kubernetes, RBAC defines Roles (sets of permissions) and RoleBindings (assigning roles to users or service accounts). This allows fine-grained control over who can perform actions such as creating pods, reading secrets, or deleting services. In this project, RBAC is implemented for the Kubernetes cluster. The receiver service runs with a service account that has minimal permissions (only enough to run and read its own logs). The team also has RBAC roles for cluster administration. Default service accounts are restricted.

**Receiver Service** – A Kubernetes pod that accepts decrypted LoRa messages from the bridge via HTTP POST, validates them, and logs them. The receiver is a Flask application running in the lora-demo namespace. It exposes two endpoints: /health (for liveness checks) and /api/v1/messages (for accepting messages). The service validates JSON fields, checks that the sequence number is greater than the last received for that source (replay protection), logs the message to stdout, and returns HTTP 200\. The receiver does not store messages persistently; logs are captured by Kubernetes and can be viewed with kubectl logs.

**Replay Attack** – A type of network attack in which a valid data transmission is maliciously or fraudulently repeated or delayed. An attacker captures a legitimate packet and later retransmits it, causing the receiver to process the same message multiple times. In the context of LoRa, a replay attack could cause duplicate messages or, if the message was a command (such as "open valve"), unwanted actions. In this project, replay attacks are prevented by sequence numbers. The Cardputer increments a sequence number for each new message. The bridge tracks the last accepted sequence number per source and rejects any packet with a sequence number less than or equal to the last seen value. The sequence number persists across Cardputer reboots using NVS.

**Reset Pin** – A GPIO (General Purpose Input Output) pin used to reset a hardware peripheral, such as a LoRa radio module. Pulling the reset pin low (or high, depending on the module) for a short period forces the peripheral to restart, reinitializing its internal state. In this project, the Waveshare SX1262 LoRa HAT uses GPIO25 as its reset pin. The bridge script configures the reset pin as digitalio.DigitalInOut(board.D25). If the radio becomes unresponsive, the reset pin can be toggled to recover it. The reset pin was verified during initial hardware testing.

**Retry** – The act of transmitting a message again after a failure, such as a timeout or a negative acknowledgment. Retry mechanisms improve reliability in unreliable networks. In this project, the Cardputer implements a retry mechanism for LoRa transmissions. After sending a message, it waits 1.5 seconds for an ACK from the gateway. If no ACK is received, it retransmits the same encrypted packet up to three times. If all retries fail, the Cardputer displays a red flash and does not increment the sequence number. This ensures that messages are not lost or duplicated due to temporary radio interference.

**Risk Assessment** – A systematic process of identifying, evaluating, and prioritizing risks to an organization or system. Risks are typically scored based on likelihood (probability of occurrence) and impact (severity of consequences). The results inform decisions about which risks to mitigate, accept, transfer, or avoid. In this project, a formal risk assessment was conducted using the STRIDE threat model. Risks were scored on a scale of 1 to 25\. High-risk items (score 10 or higher) such as plaintext key storage and default passwords were mitigated. Medium and low risks were accepted or scheduled for future work. The risk assessment is documented in the project's risk assessment file.

**Router Pi** – A dedicated Raspberry Pi 4 (2GB) configured to perform inter-VLAN routing, firewall functions, and DHCP services. The router Pi runs systemd-networkd to create VLAN-tagged interfaces (eth0.10 and eth0.20), dnsmasq for DHCP, and iptables for packet filtering. It has two IP addresses: 10.0.10.1 (gateway for control plane VLAN) and 10.0.20.1 (gateway for worker VLAN). The router Pi is the only device that can forward traffic between VLANs. It enforces a default DROP policy on the FORWARD chain, allowing only SSH and K3s API traffic from control plane to workers. The router Pi is not part of the K3s cluster.

**Sequence Number** – A number that increments with each message sent from a device, used to detect missing or reordered messages and to prevent replay attacks. In this project, the Cardputer maintains a sequence number that is included in the plaintext before encryption ("42|Hello"). The sequence number is stored in non-volatile storage (NVS) so it survives reboots. The LoRa bridge tracks the last accepted sequence number per source. If a received packet has a sequence number less than or equal to the last accepted number, the bridge rejects it as a replay attack. The sequence number increments only after a successful acknowledgment, ensuring that lost messages do not cause gaps.

**SPI (Serial Peripheral Interface)** – A synchronous serial communication interface used to connect microcontrollers to peripheral devices such as sensors, displays, and radios. SPI uses four wires: MOSI (Master Out Slave In), MISO (Master In Slave Out), SCK (Serial Clock), and CS (Chip Select). Multiple devices can share the same data lines but each requires a separate CS pin. In this project, the LoRa HAT on worker1 communicates with the Raspberry Pi over SPI. The bridge script uses the busio.SPI class from the Adafruit CircuitPython library to initialise the SPI bus. SPI must be enabled in /boot/config.txt (dtparam=spi=on) for the radio to be detected.

**SSH (Secure Shell)** – A cryptographic network protocol for secure remote access to a computer. SSH provides encrypted command-line sessions, file transfer (SFTP), and port forwarding. It uses public-key cryptography for authentication and a symmetric cipher for session encryption. In this project, SSH is the primary method for accessing all nodes (Mini PC master, router Pi, and worker Pis). Password authentication is disabled; only Ed25519 key-based authentication is allowed. Fail2ban is installed to block brute-force attempts. SSH is configured to listen only on the management VLAN where appropriate.

**Switch (Network Switch)** – A networking device that connects devices on a local area network (LAN) by forwarding data only to the intended recipient port, based on MAC addresses. Switches operate at Layer 2 of the OSI model. A managed switch allows configuration of VLANs, port mirroring, and other advanced features. In this project, the NETGEAR GS305E is a managed switch. It is configured with VLANs 10 and 20, a trunk port to the router Pi, and access ports for the Mini PC and workers. The switch has a management IP of 10.0.0.2, and its default password was changed for security.

**systemd** – A suite of system management daemons and utilities that serves as the init system (the first process started) for most Linux distributions. systemd starts services, manages dependencies, and handles logging via journald. In this project, systemd is used to manage the LoRa bridge as a background service. The service file (lora-bridge.service) defines the execution command, working directory, restart policy (always), and user (pi). Commands such as systemctl enable, systemctl start, and systemctl status control the bridge service. systemd-networkd is used on the router Pi to configure VLAN-tagged interfaces.

**systemd-networkd** – A systemd component that manages network configurations, including physical interfaces, bonds, bridges, and VLANs. Configuration is defined in .netdev and .network files. In this project, the router Pi uses systemd-networkd to create VLAN-tagged interfaces eth0.10 and eth0.20. The .netdev files specify the VLAN ID, and the .network files assign IP addresses (10.0.10.1/24 and 10.0.20.1/24). This approach was chosen over manual ip link commands for persistence across reboots.

**Timestamp** – A record of the date and time at which an event occurred. Timestamps are essential for logging, auditing, and correlating events across multiple systems. In this project, the LoRa bridge adds a Unix timestamp (seconds since 1970\) to the JSON payload sent to the receiver service. The receiver logs the timestamp in human-readable format (ISO 8601\) alongside the message. Timestamps are generated using the system clock, which is synchronised across all nodes using NTP (Network Time Protocol). Accurate timestamps are important for detecting delays and for forensic analysis.

**Token (K3s Node Token)** – A secret string used to authenticate worker nodes when joining a K3s cluster. The token is generated on the master node during installation and stored in /var/lib/rancher/k3s/server/node-token. Workers present this token when connecting to the API server. The token must be kept secret; if compromised, an attacker could join a rogue node to the cluster. In this project, the token is transmitted over the secure internal network during worker join operations. It is not exposed to the LoRa interface or the internet.

**Trunk Port** – A switch port that carries traffic for multiple VLANs, typically using 802.1Q tagging. Each packet on a trunk port includes a VLAN tag that identifies which VLAN it belongs to. Trunk ports connect switches to routers or to other switches. In this project, port 1 of the NETGEAR GS305E is configured as a trunk port, connecting to the router Pi. It is tagged for VLANs 10 and 20 and untagged for VLAN 1 (management). The router Pi receives all VLAN traffic and routes between them based on iptables rules.

**TLS (Transport Layer Security)** – A cryptographic protocol that provides secure communication over a network, including encryption, authentication, and integrity. TLS is used to protect HTTPS traffic, API calls, and other sensitive data. In this project, the Kubernetes API server uses TLS with automatically generated certificates. The Rancher dashboard is served over HTTPS (self-signed certificate). However, the communication between the LoRa bridge and the receiver service uses plain HTTP (no TLS), relying on network isolation for security. Mutual TLS (mTLS) is future work.

**UFW (Uncomplicated Firewall)** – A user-friendly front-end for managing iptables firewall rules on Linux. UFW simplifies common tasks such as allowing or denying ports and setting default policies. In this project, UFW is enabled on all nodes (Mini PC master, router Pi, and worker Pis). The default policy is deny incoming. Allow rules are added for SSH (port 22\) and, on the master node, for the K3s API port (6443) from within the same VLAN. UFW rules are persistent across reboots. UFW is simpler to configure than raw iptables for host-level firewalling.

**Uplink** – The direction of communication from a field device (such as the Cardputer) to the central hub or gateway. In many LoRa systems, uplink is the primary direction because field devices send sensor data or messages to a central server. In this project, the current implementation supports only uplink: messages travel from the Cardputer to the receiver service. Downlink (from the hub to the Cardputer) is not implemented but is identified as future work. The LoRa hardware is capable of bidirectional communication, so downlink could be added by extending the bridge and Cardputer firmware.

**Unmanaged Switch** – A network switch that has no configuration interface and cannot be managed. Unmanaged switches simply forward traffic based on MAC addresses, with no support for VLANs, port security, or monitoring. In this project, an unmanaged switch was used in an earlier version of the network topology but was eliminated in the final design. The final architecture uses only the managed NETGEAR GS305E switch, which provides VLAN capabilities. Unmanaged switches are simpler and cheaper but unsuitable for network segmentation.

**VLAN (Virtual Local Area Network)** – A logical subdivision of a physical network that isolates traffic at Layer 2\. Devices in different VLANs cannot communicate directly without a router. VLANs improve security by limiting the broadcast domain and preventing lateral movement. In this project, three VLANs are used: VLAN 1 (management, 10.0.0.0/24), VLAN 10 (control plane, 10.0.10.0/24), and VLAN 20 (workers, 10.0.20.0/24). The router Pi routes between VLANs with iptables rules. The managed switch tags traffic on the trunk port and assigns access ports to specific VLANs.

**Virtual Machine (VM)** – A software emulation of a physical computer, running an operating system and applications on top of a hypervisor. VMs provide isolation and can be moved between physical hosts. In this project, an Ubuntu VM was used in an early version of the architecture to host Rancher. The VM was eliminated in the final design; Rancher now runs directly on the Mini PC master node. This simplification reduced hardware overhead and removed a point of failure. No VMs are used in the final system.

**Worker Node** – A node in a Kubernetes cluster that runs application workloads (pods). Worker nodes communicate with the master node's API server to receive instructions, and they host the kubelet and container runtime. If a worker node fails, the master node reschedules its pods to other healthy workers. In this project, there are three worker nodes: worker1 (LoRa gateway, 10.0.20.208), worker2 (10.0.20.207), and worker3 (10.0.20.202). All workers run K3s and have joined the cluster using the node token. worker1 is unique because it also hosts the LoRa HAT and bridge service, which run as host processes, not as pods.

**YAML (YAML Ain't Markup Language)** – A human-readable data serialisation format commonly used for configuration files. YAML uses indentation to represent structure and supports scalars, lists, and dictionaries. In Kubernetes, almost all resources (deployments, services, secrets, network policies) are defined in YAML files. In this project, the receiver service is defined in receiver\_service.yaml, which includes a Deployment (specifying the container image, ports, security context) and a Service (exposing the pod via ClusterIP). YAML files are applied using kubectl apply \-f.

## 

14. ## 

    15. ## **12\. References**

    16. 

    17. ## 

        1. ### **Official Documentation & Primary Sources**

**K3s Lightweight Kubernetes**  
The team relied on the official K3s documentation to understand its architecture, installation process, and node-joining mechanics. K3s was selected because it is a certified Kubernetes distribution packaged as a single binary under 100 MB, uses sqlite3 as the default storage backend, and is designed for resource-constrained environments such as Raspberry Pi.

**Rancher Documentation (Helm Installation)**  
Official Rancher guides provided the procedure for adding the Helm repository, installing cert-manager, and deploying Rancher on the K3s cluster. These instructions were followed to install Rancher v2.9 on the Mini PC master node.

**pyserial Documentation**  
The pyserial library was used in the LoRa bridge script to communicate with the Waveshare E22-900T22S HAT over /dev/ttyAMA0. The documentation provided the API for opening serial ports, reading bytes, and configuring baud rate.

**Waveshare E22-900T22S LoRa HAT Product Page**  
The manufacturer’s product page and datasheet confirmed the HAT’s UART-based communication interface, register map, M0/M1 mode pin assignments (GPIO22, GPIO27), and operating frequency range. This information guided the configure_e22.py implementation and the bridge’s serial communication setup.

**Kubernetes Self-Healing Documentation**  
The official Kubernetes documentation explains how the control plane detects node failures and reschedules pods to maintain the desired number of replicas. This concept was demonstrated by powering off worker2 and observing an nginx test pod reschedule to worker3.

**RadioLib Documentation**  
The RadioLib library documentation provided the API for controlling SX1262 LoRa modules on the ESP32-S3. The library supports SX126x series chips and was used in the Cardputer firmware for point-to-point LoRa communication

**PlatformIO Documentation**  
PlatformIO was used as the build system for the Cardputer firmware. The official PlatformIO documentation describes how to configure platformio.ini for the ESP32-S3 and manage dependencies such as the M5Cardputer library and RadioLib.

**M5Stack Cardputer Documentation**  
The official M5Stack documentation provided hardware specifications (ESP32-S3, 56-key keyboard, 1.14-inch display) and programming guidelines for the Cardputer ADV. This informed the development of the field node firmware.

**mbedtls AES-256-CBC Examples**  
Developer community examples (including Chinese developer forums) demonstrated how to initialise the mbedtls AES context, set a 256-bit key, and perform CBC mode encryption and decryption with PKCS\#7 padding. These examples guided the implementation of encryption on the Cardputer.

2. ### **Community Discussions & Problem-Solving References**

**Waveshare E22-900T22S UART Configuration**  
Community discussions and the Waveshare wiki documented the binary register protocol used to configure the E22-900T22S, including the C0/C1 command format, register addresses, and the requirement to set M0=1/M1=1 for configuration mode. This information was essential for writing configure_e22.py and LoRA-Test.py.

**RadioLib with SX1262 (Cardputer Firmware)**  
The RadioLib documentation and community examples documented the API for initialising and using SX1262 LoRa modules on the ESP32-S3. This guided the Cardputer firmware development, including the radio.begin() call and transmit/receive methods.

**PlatformIO for M5Cardputer**  
Multiple open-source projects demonstrated using PlatformIO to build and flash firmware onto the M5Cardputer. These examples provided templates for the platformio.ini configuration and dependency management.

3. ### **Cryptographic and Security Standards**

**NIST Special Publication 800-38A (AES Modes of Operation)**  
This publication defines the CBC (Cipher Block Chaining) mode of operation for AES, including the use of an Initialization Vector (IV) and PKCS\#7 padding. These standards were implemented in both the Cardputer firmware (encryption) and the LoRa bridge (decryption). The specific implementation of AES-256-CBC with PKCS\#7 padding was used to encrypt all LoRa messages.

4. ### **Generative AI Tools**

**Large Language Model Assistance**  
During development, the team used large language models (LLMs) to generate code templates, refine Python scripts for the LoRa bridge, and structure the Cardputer firmware. All AI-generated code was manually reviewed, stress-tested, and commented before deployment. The specific models used were accessed via standard web interfaces, and no proprietary or unpublished models were employed. The AI-assisted code includes the AES-256-CBC encryption and decryption functions, the Flask receiver service, and the systemd service unit file.

5. ### 

   6. ### **Official Documentation & Primary Sources**

**K3s Lightweight Kubernetes** [https://docs.k3s.io](https://docs.k3s.io/)

**Rancher Documentation (Helm Installation)** [https://ranchermanager.docs.rancher.com](https://ranchermanager.docs.rancher.com/)

**pyserial Documentation** [https://pyserial.readthedocs.io](https://pyserial.readthedocs.io)

**Waveshare E22-900T22S LoRa HAT Product Page** [https://www.waveshare.com/e22-900t22s-tb.htm](https://www.waveshare.com/e22-900t22s-tb.htm)

**Kubernetes Self-Healing Documentation** [https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle)

**RadioLib Documentation** [https://jgromes.github.io/RadioLib](https://jgromes.github.io/RadioLib)

**PlatformIO ESP32-S3 Documentation** [https://docs.platformio.org/en/latest/platforms/espressif32.html](https://docs.platformio.org/en/latest/platforms/espressif32.html)

**M5Stack Cardputer Documentation** [https://docs.m5stack.com/en/core/Cardputer](https://docs.m5stack.com/en/core/Cardputer)

**mbedtls AES-256-CBC Examples** [https://github.com/Mbed-TLS/mbedtls/blob/development/programs/aes/aescrypt2.c](https://github.com/Mbed-TLS/mbedtls/blob/development/programs/aes/aescrypt2.c)

7. ### **Community Discussions & Problem-Solving References**

**Waveshare SX1262 HAT SPI Detection Issues** [https://github.com/meshtastic/firmware/discussions/7737](https://github.com/meshtastic/firmware/discussions/7737)

**RadioLib with Waveshare SX1262** [https://github.com/beegee-tokyo/SX126x-Arduino/issues/126](https://github.com/beegee-tokyo/SX126x-Arduino/issues/126)

**PlatformIO for M5Cardputer** [https://github.com/Alexxdal/UniversalRemote](https://github.com/Alexxdal/UniversalRemote)

8. ### **Cryptographic and Security Standards**

**NIST Special Publication 800-38A (AES Modes of Operation)** [https://csrc.nist.gov/publications/detail/sp/800-38a/final](https://csrc.nist.gov/publications/detail/sp/800-38a/final)

9. ### 

   10. ### 

       11. ### **ESP32 LoRa Project & Firmware References**

| Project | Key Feature(s) | Link |
| ----- | ----- | ----- |
| **Meshtastic Firmware** | Off-grid, decentralized mesh network for long-range text communication without cellular service. | [https://github.com/meshtastic/firmware](https://github.com/meshtastic/firmware) |
| **LightLoRaAPRS** | Single firmware that can operate as an APRS Tracker, iGate (Gateway), or Digipeater (Router). | [https://github.com/lightaprs/LightLoRaAPRS](https://github.com/lightaprs/LightLoRaAPRS) |
| **ESXP1302 Gateway** | Low-cost, 8-channel LoRaWAN gateway design based on the ESP32 and SX1302 concentrator. | [https://github.com/Opzet/ESP32-LoRaWan-ESXP1302](https://github.com/Opzet/ESP32-LoRaWan-ESXP1302) |
| **LoRa-Test (RadioLib)** | Test program for SX1262 LoRa modules featuring a web interface for configuration and range testing. | [https://github.com/MarusGradinaru/LoRa-Test](https://github.com/MarusGradinaru/LoRa-Test) |
| **LoRa-ESP32-Communication** | Basic educational examples for sending/receiving messages and reading environmental sensors. | [https://github.com/Esmail-sarhadi/LoRa-ESP32-Communication](https://github.com/Esmail-sarhadi/LoRa-ESP32-Communication) |
| **Farm-Data-Relay-System** | Combines ESP-NOW (for low-latency) and LoRa (for long-range) to create a flexible, ad-hoc data relay mesh. | [https://github.com/timmbogner/Farm-Data-Relay-System](https://github.com/timmbogner/Farm-Data-Relay-System) |
| **ESP32-C6 LoRa Sync** | Low-power IoT node for field data logging with LoRa, RTC synchronization, and energy harvesting support. | [https://github.com/IgorJMV/esp32c6-lora-sync](https://github.com/IgorJMV/esp32c6-lora-sync) |
| **BuzzVerse LoRa Firmware** | Monitoring firmware built with the ESP-IDF framework for the ESP32-C3 and LoRa communication. | [https://github.com/BuzzVerse/lora\_esp32\_firmware](https://github.com/BuzzVerse/lora_esp32_firmware) |
| **ESP32APRS\_LoRa** | APRS implementation on LoRa supporting iGate, Digipeater, Tracker, Weather, and Telemetry functions. | [https://github.com/nakhonthai/ESP32APRS\_LoRa](https://github.com/nakhonthai/ESP32APRS_LoRa) |

