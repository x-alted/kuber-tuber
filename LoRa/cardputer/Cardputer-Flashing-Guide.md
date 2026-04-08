# Flashing and Installing the Kuber-Tuber Firmware

This guide assumes you have already completed the LoRa gateway setup on your worker node (`worker1`) and that the LoRa bridge service is running. 

Now you will prepare the field device: the **M5Stack Cardputer ADV** with an attached LoRa module (e.g., RA-01S, SX1262-based). 

The firmware enables AES‑256 encrypted messaging, sequence counters, acknowledgment handling, and persistent storage.

---

## 1. Prerequisites

### 1.1 Hardware
- **Cardputer ADV** (M5Stack) – includes ESP32‑S3, keyboard, display.
- **LoRa module** (e.g., Waveshare SX1262 or generic RA‑01S) – must be compatible with the Cardputer’s pinout (usually connected via the rear Grove port or dedicated LoRa socket).  
  *The official Kuber‑Tuber firmware uses **RadioLib** with a custom FSPI bus. Current pin definitions (CAP.KiRa-1262):*
  - CS   → GPIO5
  - RST  → GPIO3
  - BUSY → GPIO6
  - DIO1 → GPIO4
  - MOSI → GPIO14
  - MISO → GPIO39
  - SCK  → GPIO40
  
  > **Note:** If you see RadioLib error **-2 (CHIP_NOT_FOUND)** on boot, the pin mapping does not match your cap. Verify against your cap's schematic and update the `#define` values at the top of `src/main.cpp`.
- **USB‑C cable** (data capable) for programming.
- **Antenna** for 915 MHz (or 868 MHz depending on region).

### 1.2 Software
- **PlatformIO IDE** (recommended) or **Arduino IDE** with ESP32 board support.
  - We will use **PlatformIO** because it handles dependencies and board definitions automatically.
- **Git** (optional, to clone the firmware source).
- **USB‑to‑UART driver** (usually built into modern OS, but install CP210x if needed).

### 1.3 Source Code
The complete firmware is at `LoRa/cardputer/src/main.cpp` in the repository.
Clone the repo and open the `LoRa/cardputer/` folder directly in PlatformIO — the project is already configured.

---

## 2. Setting Up the Development Environment

### 2.1 Install PlatformIO
- **VSCode**: Install the “PlatformIO IDE” extension.
- **Standalone**: Download from [platformio.org](https://platformio.org/install/cli) (command‑line tools).

### 2.2 Open the Existing Project
The project already exists in the repository. Open the `LoRa/cardputer/` folder in PlatformIO — it contains a ready-to-use `platformio.ini` and `src/main.cpp`.

### 2.3 `platformio.ini` reference
```ini
[env:cardputer]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
monitor_speed = 115200
upload_port = /dev/ttyACM1          ; adjust to your port (run ls /dev/ttyACM* to confirm)
lib_deps =
    m5stack/M5Cardputer@^1.1.0
    jgromes/RadioLib@^6.5.0
build_flags =
    -DCORE_DEBUG_LEVEL=0
    -DARDUINO_USB_MODE=1
    -DARDUINO_USB_CDC_ON_BOOT=1
    -DBOARD_HAS_PSRAM
```
> **Tip:** On Linux the Cardputer enumerates as `/dev/ttyACM0` or `/dev/ttyACM1` depending on what else is connected. Run `ls /dev/ttyACM*` after plugging in to confirm the port.

### 2.4 Firmware feature summary
- Bidirectional LoRa: uplink (Cardputer → gateway) and downlink (gateway → Cardputer).
- AES‑256‑CBC encryption with PKCS#7 padding and random IV per message.
- Sequence number stored in NVS (survives reboots).
- ACK + retry (up to 3 attempts, 1.5 s timeout each).
- **Demo macros**: `Fn+1` / `Fn+2` / `Fn+3` pre-load scenario messages for the live presentation.

---

## 3. Understanding the Firmware (Key Sections)

Before flashing, familiarise yourself with the important parts that affect testing.

### 3.1 AES‑256 Key
The key is hardcoded and **must match** the key used in the LoRa bridge (`AES_KEY` in `LoRa-Bridge.py`).  
In the firmware, look for:
```cpp
const uint8_t aes_key[32] = {
  0x60, 0x3d, 0xeb, 0x10, 0x15, 0xca, 0x71, 0xbe,
  0x2b, 0x73, 0xae, 0xf0, 0x85, 0x7d, 0x77, 0x81,
  0x1f, 0x35, 0x2c, 0x07, 0x3b, 0x61, 0x08, 0xd7,
  0x2d, 0x98, 0x10, 0xa3, 0x09, 0x14, 0xdf, 0xf4
};
```
**Do not change this unless you also update the bridge key.**  
If you generated a different key during LoRa setup, replace the bytes accordingly.

### 3.2 LoRa Frequency and Parameters
```cpp
#define LORA_FREQ       868.0   // 868 MHz to match LoRa1262 cap antenna
#define LORA_BW         125.0
#define LORA_SF         9
#define LORA_CR         7
#define LORA_TX_POWER   22
```
Ensure the frequency matches your region and the LoRa HAT configuration.

### 3.3 Sequence Number Persistence
The firmware uses `Preferences` to store the last used sequence number. It is saved only after a successful acknowledgment (ACK) from the gateway.  
This prevents sequence number increment on lost packets.

### 3.4 ACK Timeout and Retries
```cpp
#define ACK_TIMEOUT_MS  1500
#define RETRY_LIMIT     3
```
The Cardputer waits 1.5 seconds for an ACK, retransmits up to 3 times.

---

## 4. Compiling and Flashing the Firmware

### 4.1 Connect the Cardputer
- Plug the Cardputer into your computer via USB‑C.
- Ensure the power switch is **ON** (the screen may light up).

### 4.2 Select the Correct Port
In PlatformIO, click the **Serial Port** icon in the bottom toolbar and choose the port that appears when the Cardputer is connected.

### 4.3 Build and Upload
- Click the **Upload** arrow ( → ) in the PlatformIO toolbar.
- PlatformIO will compile the firmware and then flash it to the ESP32‑S3.
- You will see progress messages. At the end, the Cardputer will reboot and show the initial screen:

```
KUBER-TUBER ADV
Batt:85%  Seq:0

> Fn+1  Fn+2  Fn+3
[Ready]
```

### 4.4 Monitor Serial Output (Optional)
After flashing, open the Serial Monitor (PlatformIO: **Serial Monitor** icon) to see debug messages.  
Set baud rate to **115200**.  
The firmware prints:
- Initialisation status.
- LoRa initialisation result.
- When a message is sent, encryption steps, and ACK received/failed.

---

## 5. Test Guide (After LoRa Config is Complete)

Now that both the LoRa gateway (`worker1` with bridge) and the Cardputer are programmed, perform a systematic test.

### 5.1 Pre‑Test Checks
- **Gateway side**: Verify the bridge service is running:
  ```bash
  sudo systemctl status lora-bridge
  ```
- **Receiver pod**: Ensure it is running in Kubernetes:
  ```bash
  kubectl get pods -n lora-demo
  kubectl logs -n lora-demo deployment/lora-receiver --tail=10
  ```
- **Antenna**: Attach antennas to both the LoRa HAT and the Cardputer LoRa module.
- **Distance**: Start with a short range (1‑2 meters, line of sight).

### 5.2 Basic Send & Receive (Encrypted)
1. On the Cardputer, type a short message (e.g., `Hello Kuber`).
2. Press the **M5** button or **Enter** key (depending on firmware mapping – the firmware uses `KEY_RETURN` or `KEY_M5`).
3. Observe the Cardputer screen:
   - It will show `Encrypting...`, then `Sending...`.
   - If successful, the screen flashes **green** and shows `ACK OK`.
   - The sequence number (shown at top right) increments by 1.
4. On the gateway side:
   - View bridge logs: `sudo journalctl -u lora-bridge -f`  
     You should see `Received: <base64>`, then `Decryption successful`, and `Message accepted by receiver`.
   - View receiver logs: `kubectl logs -n lora-demo deployment/lora-receiver -f`  
     You should see a log line with the message and sequence number.

**Expected result**: Message appears in receiver logs; Cardputer shows green flash.

### 5.3 Test Replay Protection
1. Send another **different** message (e.g., `Second message`). It should work normally.
2. Now resend the **exact same message** you sent first (type the same text and press Send).
   - The Cardputer will encrypt and send it again, but the sequence number will be higher (because it incremented after the first successful send).  
   - However, the gateway compares sequence numbers. If you attempt to manually force a lower sequence number (not possible in normal operation), the bridge would reject it.
   - To simulate a replay attack artificially, you would need to capture and retransmit an old packet – that is outside normal user testing. Instead, verify that the gateway rejects any packet with `seq <= last_seq[source]`.  
   - You can confirm this by looking at the bridge logs: if a replay is attempted, it will print `Replay attack detected!`.

**Expected result**: The gateway does not accept two messages with the same or decreasing sequence number.

### 5.4 Test Acknowledgment and Retry
1. **Temporarily stop the bridge service** on `worker1`:
   ```bash
   sudo systemctl stop lora-bridge
   ```
2. On the Cardputer, send a message.
   - The Cardputer will transmit and then wait for ACK.
   - After 1.5 seconds, it will retry (up to 3 times).
   - The screen will flash **red** and show `No ACK`.
   - The sequence number **does not increment** (because no ACK was received).
3. Restart the bridge:
   ```bash
   sudo systemctl start lora-bridge
   ```
4. Send the **same message again** (the firmware still has the original unsent message in its buffer? Actually, the user must retype it or the firmware may keep it – but typically you type again).  
   - This time it should succeed, and the sequence number will increment from the previous value (not skipping numbers).  
   - This confirms that the sequence number persists and only increments on successful delivery.

**Expected result**: Message is not lost; retry mechanism works; sequence counter is not advanced on failure.

### 5.5 Test Sequence Number Persistence Across Power Cycle
1. Note the current sequence number on the Cardputer display.
2. Power off the Cardputer (toggle switch or disconnect battery).
3. Wait 10 seconds, then power on.
4. The display should show the **same sequence number** as before power‑off (not reset to 0).
5. Send a new message – it should use the next number and be accepted.

**Expected result**: The sequence number survives reboot, preventing replay attacks after restart.

### 5.6 Test with LoRa Range (Optional but Recommended)
- Move the Cardputer farther away (e.g., 50 meters, 100 meters, through walls).
- Send messages and note success rate.
- The bridge logs will show any decryption failures or timeouts.
- The Cardputer’s retry mechanism will handle intermittent loss.

### 5.7 Full Integration Test with Kubernetes Resilience
- While sending a message, power off one of the **other** worker nodes (not `worker1`). The receiver pod may reschedule, but the bridge on `worker1` continues to function. Messages should still be accepted.
- If you power off `worker1`, the LoRa gateway is lost – the Cardputer will retry and fail. This is expected.

---

## 6. Troubleshooting Common Cardputer Issues

### 6.1 The Cardputer does not show any screen after flashing.
- **Cause**: Wrong board selection or flash error.
- **Fix**: Re‑upload with correct `board = m5stack-cardputer`. Press the reset button (on the side) after flashing.

### 6.2 LoRa initialisation fails (firmware hangs or prints “LoRa Fail”).
- **Cause**: Incorrect pin mappings or LoRa module not detected.
- **Fix**:  
  - Verify the LoRa module is firmly connected to the Cardputer’s LoRa socket.  
  - Check the pin definitions in the firmware (CS=5, RST=14, BUSY=13, DIO1=12). Some modules may use different pins; adjust accordingly.  
  - Ensure the module is powered (some need 3.3V).  
  - Test with a simple RadioLib example to isolate hardware issues.

### 6.3 Encryption/decryption mismatch (bridge rejects with “Invalid padding”).
- **Cause**: AES key mismatch between Cardputer and bridge.
- **Fix**:  
  - Dump the key from both sides and compare byte‑by‑byte.  
  - Recompile the Cardputer firmware with the exact same key bytes used in the bridge.

### 6.4 The sequence number does not increment after sending.
- **Cause**: The Cardputer is not receiving the ACK from the bridge.  
- **Check**:  
  - Is the bridge running? `sudo systemctl status lora-bridge`  
  - Does the bridge log show “Sent ACK for seq X”? If not, the HTTP POST to the receiver may be failing. Check receiver logs.  
  - Increase `ACK_TIMEOUT_MS` temporarily to 3000 to account for slow processing.

### 6.5 The keyboard types double characters.
- **Cause**: Debounce delay too short.
- **Fix**: In `loop()`, increase `lastKeyTime` delay to 80 ms.

### 6.6 The Cardputer crashes or reboots when sending.
- **Cause**: Stack overflow or memory issue during encryption.
- **Fix**: Reduce `MAX_MSG_LEN` to 80. Ensure you are using `mbedtls` correctly (the firmware already uses malloc/free, but verify no memory leaks).

### 6.7 After power cycle, the sequence number resets to 0.
- **Cause**: Preferences storage not initialised or not committed.
- **Fix**: In `setup()`, ensure `load_seq_counter()` is called. In `increment_seq()`, verify `prefs.putUInt("seq", msg_seq)` is executed and `prefs.end()` is called. The provided firmware does this correctly. If problem persists, try erasing NVS:  
  ```cpp
  Preferences prefs;
  prefs.begin("kuber-tuber", false);
  prefs.clear();
  prefs.end();
  ```
  Then re‑upload firmware.

---

## 7. Final Validation Checklist

| Test | Expected Result | Pass/Fail |
|------|----------------|------------|
| Cardputer powers on and shows “Ready” | Screen displays battery, seq=0, prompt | ☐ |
| Send a message, gateway receives it | Message appears in `kubectl logs` | ☐ |
| Cardputer shows green flash and seq increments | Seq number increases by 1 | ☐ |
| Send the same message again (different seq) | Accepted normally | ☐ |
| Simulate replay (if possible) | Bridge rejects with “Replay attack” | ☐ |
| Stop bridge, send message – Cardputer retries 3 times, red flash | Seq does not increment | ☐ |
| Restart bridge, send same message – success, seq increments from previous | Seq continues correctly | ☐ |
| Power cycle Cardputer, seq value persists | Display shows last seq | ☐ |
| Send message through a wall (moderate distance) | Success with possible retries | ☐ |

Once all tests pass, your Cardputer is fully integrated with the Kuber‑Tuber system. You can now deploy multiple field devices (each with a unique source identifier) by extending the bridge’s `last_seq` dictionary.

For any further issues, refer to the project’s `Issues-Log.md` and `FAQ.md`. Happy messaging!
