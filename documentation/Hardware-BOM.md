# Kuber‑Tuber 
## Hardware Bill of Materials (BOM)

**Version:** 1.0  
**Date:** April 6, 2026  
**Currency:** Canadian Dollars (CAD)  

**Note:** Prices are estimates as of April 2026. Actual costs may vary by retailer.

---

## 1. Executive Summary

The Kuber‑Tuber hub consists of **five compute nodes** (one Mini PC master + four Raspberry Pi workers) plus a dedicated router Pi, **one managed switch**, a LoRa gateway HAT, a Cardputer field node, and supporting power/cabling components. Total hardware cost is approximately **$1,100–$1,400 CAD**, depending on RAM configurations.

---

## 2. Compute Nodes

| Component | Model / Spec | Qty | Approx. CAD Price (each) | Approx. CAD Total | Source / Notes |
|-----------|--------------|-----|--------------------------|-------------------|----------------|
| Mini PC (K3s master + Rancher) | x86_64 mini PC (Beelink, Intel NUC, used Dell OptiPlex Micro) with 16GB RAM, 128GB+ SSD, Debian 13 | 1 | $200–$300 | $200–$300 | Amazon.ca, Newegg.ca, eBay (used) – team used an existing machine |
| Raspberry Pi 4 Model B (worker nodes) | 4GB RAM (recommended) or 8GB RAM | 3 | 4GB: $102.25<br>8GB: $155.25 | 4GB: $306.75<br>8GB: $465.75 | [PiShop.ca](https://www.pishop.ca/product/raspberry-pi-4-model-b-4gb/); 8GB also available at [Amazon.ca](https://www.amazon.ca/CanaKit-Raspberry-Starter-Kit-8GB/dp/B08DHC7KG8) for $189.99 (kit) |
| Raspberry Pi 4 Model B (router) | 2GB RAM (sufficient for routing) | 1 | 2GB: $74.95 | $74.95 | [PiShop.ca](https://www.pishop.ca/product/raspberry-pi-4-model-b-2gb/) |

**Subtotal (Compute Nodes):** Approximately **$580–$840**

---

## 3. Networking

| Component | Model | Qty | Approx. CAD Price (each) | Approx. CAD Total | Source / Notes |
|-----------|-------|-----|--------------------------|-------------------|----------------|
| Managed Switch | NETGEAR GS305E (5‑port, Gigabit, VLAN‑capable) | 1 | $32.99 | $32.99 | [Staples.ca](https://www.staples.ca/products/2948442-en-netgear-5-port-gigabit-ethernet-smart-managed-plus-switch-gs305e), [Best Buy Canada](https://www.bestbuy.ca/en-ca/product/netgear-5-port-gigabit-ethernet-switch-gs305e-100nas/13502830) |
| Ethernet Cables | Cat6 (or Cat5e), 1m–3m lengths | 6 | $5–$10 | $30–$60 | Amazon.ca, Canada Computers, local surplus |

**Subtotal (Networking):** Approximately **$65–$95**

---

## 4. LoRa Components

| Component | Model | Qty | Approx. CAD Price (each) | Approx. CAD Total | Source / Notes |
|-----------|-------|-----|--------------------------|-------------------|----------------|
| LoRa HAT (gateway) | Waveshare SX1262 (915 MHz) | 1 | $34–$49 | $34–$49 | [RobotShop.ca](https://ca.robotshop.com/products/waveshare-sx1262-lora-hat-pour-raspberry-pi-bande-frequence-915mhz-470mhz) – $34.27 (may be backordered); [Amazon.ca](https://www.amazon.ca/Waveshare-SX1262-LoRa-HAT-Modulation/dp/B07VS1S2P7) – $49.06 (in stock) |
| Cardputer ADV (field node) | M5Stack Cardputer ADV (ESP32‑S3, 1750mAh battery, 56‑key keyboard) | 1 | $43–$70 | $43–$70 | [DigiKey.ca](https://www.digikey.ca/en/products/detail/m5stack-technology-co-ltd/K132-ADV/27685158) – $43.55; [Amazon.ca](https://www.amazon.ca/dp/B0GG4DB77V) – $70.02 |

**Subtotal (LoRa):** Approximately **$80–$120**

---

## 5. Power & Storage

| Component | Model / Spec | Qty | Approx. CAD Price (each) | Approx. CAD Total | Source / Notes |
|-----------|--------------|-----|--------------------------|-------------------|----------------|
| Raspberry Pi power supplies | 5.1V / 3A USB‑C (official or compatible) | 4 | $16.95 | $67.80 | [BC Robotics](https://bc-robotics.com/product/official-raspberry-pi-power-supply-5-1v-3a/) – official supply |
| Mini PC power supply | Included with Mini PC | 1 | $0 | $0 | – |
| Managed switch power supply | Included with GS305E | 1 | $0 | $0 | – |
| MicroSD cards (for Pis) | 32GB Class 10 (SanDisk Ultra or equivalent) | 4 | $15 | $60 | Amazon.ca, Best Buy, Canada Computers |

**Subtotal (Power & Storage):** Approximately **$130**

---

## 6. Optional / Nice‑to‑Have

| Component | Purpose | Approx. CAD Price | Notes |
|-----------|---------|-------------------|-------|
| Raspberry Pi cases | Protect Pis from dust/shorts | $10–$20 each | Not required for lab environment |
| USB‑C power bank (≥20,000 mAh) | Portable operation (off‑grid demo) | $40–$80 | Future enhancement |
| Pelican‑style rolling case | Transport entire hub | $150–$300 | Optional for field deployment |
| LoRa antenna upgrade | Improved range | $15–$30 | External magnetic‑mount antenna |

---

## 7. Total Estimated Cost

| Category | Low Estimate (CAD) | High Estimate (CAD) |
|----------|-------------------|---------------------|
| Compute Nodes | $580 | $840 |
| Networking | $65 | $95 |
| LoRa Components | $80 | $120 |
| Power & Storage | $130 | $130 |
| **Subtotal** | **$855** | **$1,185** |
| Contingency (10%) | $86 | $119 |
| **Grand Total (approx.)** | **$940** | **$1,305** |

*Prices exclude shipping, taxes, and any optional components.*

---

## 8. Sourcing Notes (Canada)

- **Raspberry Pis & Accessories:** [PiShop.ca](https://www.pishop.ca) is the official Canadian authorised reseller. Stock fluctuates – backorders are common.
- **Managed Switch (GS305E):** Widely available at [Staples](https://www.staples.ca), [Best Buy](https://www.bestbuy.ca), and [Amazon.ca](https://www.amazon.ca). Prices range from $32–$45.
- **LoRa HAT:** [RobotShop.ca](https://ca.robotshop.com) and [Amazon.ca](https://www.amazon.ca) are the most reliable. Verify frequency (915 MHz for North America) before purchasing.
- **Cardputer ADV:** [DigiKey.ca](https://www.digikey.ca) offers the lowest price ($43.55) but requires a minimum order ($100 for free shipping) and has longer lead times. [Amazon.ca](https://www.amazon.ca/dp/B0GG4DB77V) is faster for single units ($70.02).
- **MicroSD Cards:** [Canada Computers](https://www.canadacomputers.com), [Best Buy](https://www.bestbuy.ca), and [Amazon.ca](https://www.amazon.ca) regularly have 32GB cards for $10–$15.
- **Cables:** [PrimeCables](https://www.primecables.ca), [Canada Computers](https://www.canadacomputers.com), or local surplus stores often have the best deals.

---

## 9. Notes on Our Actual Build

- The team already owned the **Mini PC** (cost not included in the totals above). If purchasing new, add $200–$300.
- **Router Pi** uses a 2GB Raspberry Pi 4; workers use 4GB units.
- **Cardputer** was purchased from Amazon.ca for $70.02.
- **LoRa HAT** was sourced from Amazon.ca for $49.06.

---

## 10. Alternative Configurations (Cost‑Saving)

| Alternative | Savings | Trade‑off |
|-------------|---------|-----------|
| Use Raspberry Pi 3B+ for router (if available) | ~$50 | Slower CPU, still sufficient for routing |
| Use 2GB RAM Pis for workers instead of 4GB | ~$80 total | May limit future workloads |
| Use second‑hand / refurbished Pis | Varies | Availability uncertain; no warranty |
