# Test Results

## Connectivity Matrix

*Test performed on: [date]*

| From/To           | debian-master (.94) | worker1 (.138) | worker2 (.150) | worker3 (.63) |
|-------------------|---------------------|----------------|----------------|---------------|
| **debian-master** | N/A                 | [ ]            | [ ]            | [ ]           |
| **worker1**       | [ ]                 | N/A            | [ ]            | [ ]           |
| **worker2**       | [ ]                 | [ ]            | N/A            | [ ]           |
| **worker3**       | [ ]                 | [ ]            | [ ]            | N/A           |

*Note: All pings should succeed once basic network is stable.*

## Node Failure Scenarios

| Scenario               | Test Date  | Result | Notes |
|------------------------|------------|--------|-------|
| Single Pi Worker Loss  | 2026-04-09 | [x]    | Demonstrated live in final presentation — Anthony powered off a Pi worker, Rancher showed NotReady, pod rescheduled |
| Switch Reboot          |            | [ ]    | Not tested |
| Master (Mini PC) Reboot|            | [ ]    | Not tested |
| LoRa Pi Service Crash  |            | [ ]    | Not tested |

## LoRa Tests

| Test                | Date       | Result | Notes |
|---------------------|------------|--------|-------|
| Basic send/receive (Pi #1) | | [ ] | Not completed — Cardputer-ADV connection could not be established during final demonstration |
| Range test (Pi #1 ↔ Cardputer) | | [ ] | Not completed — see above |
| Encrypted payload (end-to-end) | | [ ] | Not completed — receiver service was healthy and bridge was running, but no LoRa link to Cardputer-ADV was achieved |
| lora-receiver pod health check | 2026-04-08 | [x] | `/health` returning 200 OK; pod stable in lora-demo namespace |
| lora-bridge replay protection (seq=0) | 2026-04-08 | [x] | Fixed — `last_seq` initialised to -1; first message accepted correctly |

> **Final demonstration note (2026-04-09):** The lora-receiver pod and lora-bridge service were confirmed running and healthy in Rancher at the time of the final demo. However, a physical LoRa connection between the Cardputer-ADV field node and worker1 could not be established. The Cardputer firmware was flashed and running correctly — it displayed the correct UI and was actively searching for a signal — but repeatedly showed a "Check pins/cap" error, indicating the LoRa radio hardware (SX1262 cap) was not being detected by the firmware at demo time. This issue could not be resolved within the available time. As a result, no live LoRa transmission occurred. Google Apps Script slide simulations had been prepared as a fallback demo but were not used. The actual presentation consisted of: a live tour of the Rancher dashboard (nodes, workloads, extensions, and plugins), a live node failure and pod rescheduling demonstration (worker powered off; Rancher showed NotReady; pod rescheduled successfully), and still-image demo pictures shown within the presentation slides illustrating what Cardputer activity would look like during an active send/receive session.

## K3s Resilience

| Test | Date       | Result | Notes |
|------|------------|--------|-------|
| Pod rescheduling after worker failure | 2026-04-09 | [x] | Demonstrated live in final presentation — pod rescheduled successfully after Anthony powered off a Pi worker |
| Rancher dashboard accessible | 2026-04-09 | [x] | Demonstrated live in final presentation — dashboard used as primary interface throughout demo |
