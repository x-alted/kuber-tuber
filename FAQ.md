# Frequently Asked Questions

## Basic Concepts

### What is LoRa and why is it used in this project?

LoRa (Long Range) is a wireless communication technology that transmits small amounts of data over long distances using very little power. It does not require cellular service, Wi-Fi, or internet. In this project, LoRa allows field devices like the Cardputer to send encrypted messages to the hub from up to several kilometers away in open terrain. This makes the system useful in disaster zones, remote industrial sites, or crowded event venues where traditional networks are unavailable or overloaded.

### What is Kubernetes and why does this project need it?

Kubernetes is a system that automatically manages containerized applications. This project uses K3s, a lightweight version of Kubernetes. Kubernetes provides two key benefits:

- Self healing: If a worker node (Raspberry Pi) loses power or fails, Kubernetes reschedules the running applications to another healthy worker automatically.
- Centralized management: The Rancher dashboard gives a single view of all nodes, logs, and workloads.

Without Kubernetes, you would need to manually restart services after a hardware failure and monitor each node separately.

### What is the difference between K3s and full Kubernetes?

K3s is a certified Kubernetes distribution packaged as a single binary under 100 MB. It is designed for edge computing and low-resource devices like Raspberry Pis. Full Kubernetes would be too heavy for the Pi 4's 4 GB RAM. K3s includes embedded etcd or SQLite, simplifies installation, and removes non-essential features. The commands (`kubectl`, `helm`) and most APIs are identical to standard Kubernetes.

### What is the Cardputer ADV and why was it chosen?

The Cardputer ADV is a portable device with a built-in keyboard, screen, and ESP32-S3 microcontroller. It requires a separate LoRa module (approximately $15 USD) attached to the back. The total cost is approximately $45 USD per field node. It was chosen because it is self-contained, has a keyboard for typing messages, and is easy to program using PlatformIO. Alternative LoRa transmitters (such as a Raspberry Pi with a LoRa HAT) are larger and less portable.

### How do I program the Cardputer?

The Cardputer firmware is written in C++ and compiled using PlatformIO. The source code is in [LoRa/KuberTuber-Cardputer.ino](LoRa/KuberTuber-Cardputer.ino). PlatformIO handles dependency management and flashing over USB. The firmware includes the LoRa driver, AES-256 encryption, and a simple text input interface.

### What does "encrypted LoRa" mean in practice?

LoRa radio transmissions are not encrypted by default. Anyone with a software-defined radio can capture and read the messages. This project adds AES-256 encryption at the application layer. The sender (Cardputer) encrypts the message before transmitting. The receiver on `worker1` decrypts it using a pre-shared key stored as a Kubernetes secret. An eavesdropper sees only ciphertext.

## Hardware and Network

### What hardware is currently in the system?

The current network topology (see [Network Topology](Networking/Network-Topology.md)) consists of:

- One MeLE Quieter 4C Mini PC running the K3s master node at `10.0.10.201`. The Mini PC has an Intel N100 processor, 16GB RAM, and 512GB storage.
- Three Raspberry Pi 4 workers at `10.0.20.208`, `10.0.20.207`, `10.0.20.202`.
- One Raspberry Pi 4 configured as a router with VLAN trunking.
- One NETGEAR GS305E managed switch.
- One Waveshare SX1262 LoRa HAT attached to `worker1`.
- One Cardputer ADV field node with an attached LoRa module.

### How much power does the hub consume?

Power consumption estimates are based on manufacturer specifications and independent testing.

The MeLE Quieter 4C Mini PC uses an Intel N100 processor with a thermal design power (TDP) of 6 watts. Actual power draw under load is typically between 6 and 10 watts. The three Raspberry Pi 4 workers consume approximately 2.7 watts each when idle and up to 8 watts each under load. The NETGEAR GS305E managed switch consumes approximately 2 watts at idle and up to 4.45 watts maximum. The Waveshare SX1262 LoRa HAT draws approximately 5.3mA when receiving (0.017 watts) and 107mA when transmitting (0.35 watts) at 22dBm.

Total typical power draw for the complete hub is between 20 and 35 watts, depending on network activity and CPU load. The system is designed to run from AC outlets. Battery or solar operation was not implemented but is a possible future extension.

### Why is there a dedicated Raspberry Pi router instead of using the switch?

The NETGEAR GS305E is a Layer 2 switch. It can tag and separate VLAN traffic but cannot route between VLANs or apply firewall rules. A separate Layer 3 device is required. The Raspberry Pi router runs `systemd-networkd` to create VLAN tagged interfaces (`eth0.10`, `eth0.20`) and iptables to filter inter-VLAN traffic. This gives fine control: the control plane (`10.0.10.0/24`) can SSH to workers, but workers cannot initiate connections to the control plane.

### How are the three VLANs configured?

- VLAN 1 (management): `10.0.0.0/24`. Used for the switch management IP and the router's management interface.
- VLAN 10 (control plane): `10.0.10.0/24`. Contains the Mini PC master.
- VLAN 20 (workers): `10.0.20.0/24`. Contains the three Raspberry Pi workers, including the LoRa gateway.

The managed switch port connected to the router is a trunk (tagged VLANs 10 and 20). Ports for the Mini PC and each worker are access ports assigned to the respective VLAN. Complete details are in [Network Topology](Networking/Network-Topology.md).

## LoRa and Encryption

### How do I test that the LoRa HAT is working without the full cluster?

Run the [LoRA Test.py](LoRa/LoRA-Test.py) script on `worker1`. It initialises the SPI bus and attempts to detect the SX1262 radio. If successful, it prints a confirmation. For send and receive tests, follow the [LoRa Tasks](LoRa/LoRa-Tasks.md) checklist.

### Where is the AES encryption key stored and how is it accessed?

The key is a 32-byte random string stored as a Kubernetes secret named `lora-aes-key` in the cluster. The receiver service on `worker1` mounts this secret as a volume or environment variable. The Cardputer firmware has the same key compiled in. The key is never transmitted over LoRa or any network.

### What happens if the encryption key is changed?

If you change the key in the Kubernetes secret, the receiver service must be restarted to load the new key. All Cardputer field devices must be re-flashed with the matching key. Messages encrypted with the old key will fail decryption and be rejected. Key rotation requires physical access to field devices or a secure over-the-air update mechanism, which is not implemented.

### Can I use a different LoRa module or frequency?

Yes. The Python receiver scripts use the Adafruit RFM9x library, which supports SX1276 and SX1262 based modules. Change the `RADIO_FREQ_MHZ` variable to your regional frequency (868 MHz for Europe, 915 MHz for North America, 433 MHz for some other regions). The Cardputer firmware must use the same frequency. You are responsible for complying with local radio regulations.

## Kubernetes and Rancher

### How do I access the Rancher dashboard?

Open a browser to `https://10.0.10.214:30443`. Accept the self-signed certificate warning. Login with the username `admin`. The initial password can be retrieved from the bootstrap secret using the command documented in [Service Configuration](Service-Configuration.md). After first login, change the password.

### How do I check the status of all nodes from the command line?

From any machine with `kubectl` and the correct kubeconfig, run `kubectl get nodes`. The output shows each node's status (Ready or NotReady), roles, and age. For more detail, use `kubectl describe node <node-name>`.

### What happens when I power off a worker node?

Kubernetes detects the node as NotReady after approximately 40 seconds. Any pods that were running on that node are rescheduled to other healthy workers. The cluster remains operational. When the node is powered back on, it rejoins automatically. This was tested by draining and powering off `worker2`; an nginx test pod rescheduled to `worker3`.

### Why is there only one master node?

The project scope did not include high availability for the control plane. A single master node is a single point of failure for cluster management. However, existing pods on worker nodes continue to run even if the master is down. For a production deployment, you would run K3s in HA mode with three master nodes and an external database. This was documented as future work.

## Security

### How are SSH keys managed across all nodes?

Each team member generated an Ed25519 key pair. The public keys were appended to `~/.ssh/authorized_keys` on every node (Mini PC, three workers, router Pi). Password authentication was then disabled in `/etc/ssh/sshd_config`. The [Hardening Tasks](Security/Hardening-Tasks.md) checklist documents the exact steps.

### What firewall rules are applied on the router Pi?

The router Pi uses iptables with a default DROP policy on the FORWARD chain. Rules allow:

- Established and related connections (so that return traffic is permitted).
- SSH from the control plane (`10.0.10.0/24`) to workers (`10.0.20.0/24`) on port 22.
- K3s API traffic from workers to the master on port 6443.

All other inter-VLAN traffic is blocked. Workers cannot initiate connections to the control plane.

### Are the LoRa messages logged and auditable?

Yes. The receiver service on `worker1` writes each decrypted message to the system log (`journalctl`) and to the Kubernetes pod logs. The logs include a timestamp and the plaintext message. You can view them with `journalctl -u lora-gateway` or `kubectl logs deployment/lora-receiver`. For long-term retention, you would need to configure log rotation or forward logs to a persistent volume.

## Using the Project

### How do I send a message from the Cardputer?

Power on the Cardputer. The firmware presents a simple text input screen. Type your message using the keyboard. Press the Send button. The device encrypts the message and transmits it over LoRa at 915 MHz. No pairing or network configuration is required. The screen shows a confirmation when transmission completes.

### How do I view received messages on the hub?

There are three methods:

- On `worker1`: `journalctl -u lora-gateway -f` to follow the log.
- Using `kubectl`: `kubectl logs -f deployment/lora-receiver` (if running as a deployment).
- In the Rancher UI: navigate to the receiver pod and view its logs.

A web dashboard for messages was not implemented but could be added.

### How do I add a new Raspberry Pi as an additional worker?

Flash Raspberry Pi OS Lite to an SD card. Set a static IP address in the worker VLAN (`10.0.20.0/24`). Enable SSH. On the master node, retrieve the K3s token from `/var/lib/rancher/k3s/server/node-token`. On the new Pi, run:

```
curl -sfL https://get.k3s.io | K3S_URL=https://10.0.10.201:6443 K3S_TOKEN=<token> sh -
```

The node will appear in `kubectl get nodes` within a minute. Then apply any necessary labels and security hardening.

### Where do I find the complete list of configuration commands?

All installation steps are in [Service Configuration](Service-Configuration.md). This includes K3s installation on the master, joining workers, installing Helm and cert-manager, deploying Rancher, and retrieving the bootstrap password. The document is kept up to date with the exact commands used.

## Troubleshooting

### The LoRa HAT is not detected. What should I check?

Run `ls /dev/spidev*`. You should see `spidev0.0` and `spidev0.1`. If not, SPI is not enabled. Enable it with `raspi-config` or by adding `dtparam=spi=on` to `/boot/config.txt` and rebooting. Also verify the HAT is properly seated on the GPIO header. The [LoRa Tasks](LoRa/LoRa-Tasks.md) checklist has a full verification procedure.

### The Rancher UI shows "cluster unreachable" after import.

Ensure the machine running Rancher can reach the master node on port 6443. Check that the kubeconfig file has the correct server IP (`https://10.0.10.201:6443`). Also verify that no firewall is blocking the connection. If the cluster was imported but later the IP changed, you may need to re-import.

### A worker node shows NotReady after a reboot.

Check that the node received its static IP address. Verify that the K3s service started: `sudo systemctl status k3s-agent`. Look for errors in the logs: `journalctl -u k3s-agent -f`. The most common cause is that the node cannot reach the master on port 6443. Test connectivity with `ping 10.0.10.201` and `telnet 10.0.10.201 6443`.

### How do I completely reset the cluster and start over?

On the master node: `sudo /usr/local/bin/k3s-uninstall.sh`. On each worker: `sudo /usr/local/bin/k3s-agent-uninstall.sh`. Remove the K3s configuration directory (`/etc/rancher/k3s`) and any leftover containers. Then reinstall following the [Service Configuration](Service-Configuration.md) steps. This is the same procedure used when the cluster was rebuilt after the IP range change.

## Project Documentation

### What is the purpose of each file in the repository?

A quick reference:

- `README.md`: Overview, architecture, and quick start.
- `Quick-Start-Guide.md`: Step-by-step order to set up the system.
- `FAQ.md`: This document.
- `Service-Configuration.md`: Detailed commands for K3s, Rancher, and services.
- `Issues-Log.md`: Record of problems encountered and resolutions.
- `Test-Results.md`: Matrix of tests performed and their outcomes.
- `Network-Topology.md`: IP assignments, VLANs, and switch configuration.
- `Hardware-BOM.md`: Bill of materials with part numbers and costs.
- `Use-Cases.md`: Real-world scenarios where the system provides value.
- `checklists/`: Task lists for setup, hardening, Kubernetes, LoRa, and networking.
- `LoRa/`: Python scripts, Cardputer firmware, and LoRa-specific documentation.
- `Security/`: Risk assessment, threat model, and hardening tasks.

### Where can I see all the issues that were fixed?

Read [Issues Log](Issues-Log.md). It includes the date, description, affected component, resolution, and status for every significant problem. Examples include the K3s IP range change, Rancher bootstrap password retrieval, Tailscale connectivity drops, and LoRa encrypted message not appearing.
