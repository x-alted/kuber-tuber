# Service Configuration Notes

Installation steps, configuration parameters, and customisation.

## K3s Cluster

### Master Node (Mini PC)
- **Installation date:** March 13, 2026
- **Command used:**
  ```bash
  curl -sfL https://get.k3s.io | sh -```

Node token location: /var/lib/rancher/k3s/server/node-token
Kubeconfig: /etc/rancher/k3s/k3s.yaml
