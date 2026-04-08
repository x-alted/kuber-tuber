# Test Results

## Connectivity Matrix

*Test performed on: [date]*

| From/To        | Mini PC (.201) | worker1 (.208) | worker2 (.207) | worker3 (.202) |
|----------------|----------------|----------------|----------------|----------------|
| **Mini PC**    | N/A            | [ ]            | [ ]            | [ ]            |
| **worker1**    | [ ]            | N/A            | [ ]            | [ ]            |
| **worker2**    | [ ]            | [ ]            | N/A            | [ ]            |
| **worker3**    | [ ]            | [ ]            | [ ]            | N/A            |

*Note: All pings should succeed once basic network is stable.*

## Node Failure Scenarios

| Scenario               | Test Date | Result | Notes |
|------------------------|-----------|--------|-------|
| Single Pi Worker Loss  |           | [ ]    |       |
| Switch Reboot          |           | [ ]    |       |
| Master (Mini PC) Reboot|           | [ ]    |       |
| LoRa Pi Service Crash  |           | [ ]    |       |

## LoRa Tests

| Test                | Date | Result | Notes |
|---------------------|------|--------|-------|
| Basic send/receive (Pi #1) | | [ ] | |
| Range test (Pi #1 ↔ Cardputer) | | [ ] | |
| Encrypted payload | | [ ] | |
| lora-receiver pod health check | 2026-04-08 | [x] | `/health` returning 200 OK; pod stable in lora-demo namespace |
| lora-bridge replay protection (seq=0) | 2026-04-08 | [x] | Fixed — `last_seq` initialised to -1; first message accepted correctly |

## K3s Resilience

| Test | Date | Result | Notes |
|------|------|--------|-------|
| Pod rescheduling after worker failure | | [ ] | |
| Rancher dashboard accessible | | [ ] | |
