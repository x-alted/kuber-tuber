#!/usr/bin/env python3
"""
configure_e22.py — One-time E22-900T22S LoRa parameter configuration
Run this ONCE on worker1 to set the HAT to match the Cardputer firmware.

Cardputer settings (main.cpp):
    Frequency  : 915.0 MHz
    Bandwidth  : 125 kHz
    Spreading  : SF9
    Coding rate: CR 4/7
    TX Power   : 22 dBm

Run with: sudo python3 configure_e22.py

After running, the settings are saved in the E22 module's flash and survive
power cycles. You do NOT need to run this again unless you change firmware.
"""

import time
import serial
import sys

# ── GPIO setup — supports both lgpio (Trixie) and RPi.GPIO ──────────────────

# Pin assignments for Waveshare E22 HAT with jumper B shorted (PI-LoRa mode)
M0_PIN = 22   # GPIO22 → module M0
M1_PIN = 27   # GPIO27 → module M1

USE_LGPIO = False

try:
    import lgpio
    USE_LGPIO = True
    print("[cfg] GPIO: using lgpio")
except ImportError:
    try:
        import RPi.GPIO as _GPIO
        print("[cfg] GPIO: using RPi.GPIO")
    except ImportError:
        print("[cfg] ERROR: no GPIO library found.")
        print("      Run: sudo apt install python3-lgpio")
        sys.exit(1)


def gpio_setup():
    if USE_LGPIO:
        h = lgpio.gpiochip_open(0)
        lgpio.gpio_claim_output(h, M0_PIN, 0)
        lgpio.gpio_claim_output(h, M1_PIN, 0)
        return h
    else:
        _GPIO.setmode(_GPIO.BCM)
        _GPIO.setup(M0_PIN, _GPIO.OUT)
        _GPIO.setup(M1_PIN, _GPIO.OUT)
        return None


def gpio_set(handle, m0: int, m1: int):
    if USE_LGPIO:
        lgpio.gpio_write(handle, M0_PIN, m0)
        lgpio.gpio_write(handle, M1_PIN, m1)
    else:
        _GPIO.output(M0_PIN, m0)
        _GPIO.output(M1_PIN, m1)
    time.sleep(0.1)


def gpio_cleanup(handle):
    if USE_LGPIO:
        lgpio.gpio_write(handle, M0_PIN, 0)
        lgpio.gpio_write(handle, M1_PIN, 0)
        lgpio.gpiochip_close(handle)
    else:
        _GPIO.cleanup()


# ── E22-900T22S register config ──────────────────────────────────────────────
#
# Write command: C0 <start_addr> <length> <data...>
# Read command:  C1 <start_addr> <length>
#
# REG0  ADDH    : 0x00  — device address high byte
# REG1  ADDL    : 0x00  — device address low byte
# REG2  NETID   : 0x00  — network ID
# REG3  SPED    : 0x6C  — UART 9600bps | air 4.8kbps (≈SF9/BW125) | 8N1
#                         [7:5]=011 [4:2]=011 [1:0]=00
# REG4  OPTION  : 0x00  — 22 dBm TX power, no RSSI byte appended
# REG5  CHAN    : 0x41  — channel 65 → 850.125+65 = 915.125 MHz
# REG6  TRSW   : 0x00  — transparent mode, no LBT
# REG7  CRYPT_H : 0x00  — no hardware encryption (we do AES in software)
# REG8  CRYPT_L : 0x00

CONFIG_CMD = bytes([0xC0, 0x00, 0x09,
                    0x00,   # ADDH
                    0x00,   # ADDL
                    0x00,   # NETID
                    0x6C,   # SPED
                    0x00,   # OPTION
                    0x41,   # CHAN (915 MHz)
                    0x00,   # TRSW
                    0x00,   # CRYPT_H
                    0x00])  # CRYPT_L

READ_CMD = bytes([0xC1, 0x00, 0x09])

EXPECTED = bytes([0x00, 0x00, 0x00, 0x6C, 0x00, 0x41, 0x00, 0x00, 0x00])


def main():
    print("[cfg] Configuring Waveshare E22-900T22S for 915 MHz / SF9 / BW125 / 22 dBm")

    h = gpio_setup()

    ser = serial.Serial('/dev/ttyAMA0', 9600, timeout=1)
    ser.flushInput()

    # ── Enter config mode: M0=1, M1=1 ───────────────────────────────────────
    print("[cfg] Entering config mode (M0=1, M1=1)...")
    gpio_set(h, 1, 1)
    time.sleep(0.2)
    ser.flushInput()   # discard any stale bytes

    # ── Write config ─────────────────────────────────────────────────────────
    print(f"[cfg] Writing: {CONFIG_CMD.hex(' ')}")
    ser.write(CONFIG_CMD)
    time.sleep(0.5)

    response = ser.read(12)   # blocking read for full 12-byte echo
    print(f"[cfg] Response: {response.hex(' ')}")

    # E22 echoes back C0 + same data on successful write (C1 is for read responses)
    if len(response) >= 12 and response[0] == 0xC0:
        print("[cfg] Write acknowledged ✓")
    elif not response:
        print("[cfg] ⚠ No response — check M0/M1 GPIO wiring (GPIO22=M0, GPIO27=M1)")
        gpio_cleanup(h)
        ser.close()
        sys.exit(1)
    else:
        print(f"[cfg] Unexpected response ({len(response)} bytes) — continuing anyway")

    # ── Read back to verify ──────────────────────────────────────────────────
    print("[cfg] Reading back registers...")
    ser.flushInput()
    ser.write(READ_CMD)

    # Collect bytes until we have 12 or 3 seconds elapse (module may send in bursts)
    readback = b""
    deadline = time.monotonic() + 3.0
    while len(readback) < 12 and time.monotonic() < deadline:
        chunk = ser.read(12 - len(readback))
        readback += chunk
        if len(readback) < 12:
            time.sleep(0.1)

    print(f"[cfg] Readback ({len(readback)} bytes): {readback.hex(' ')}")

    if len(readback) >= 12:
        regs = readback[3:12]
        if regs == EXPECTED:
            print("[cfg] ✅ All registers verified — module ready")
        else:
            print(f"[cfg] ❌ Mismatch!")
            print(f"      Got:      {regs.hex(' ')}")
            print(f"      Expected: {EXPECTED.hex(' ')}")
    else:
        print(f"[cfg] ⚠ Short readback ({len(readback)} bytes) — expected 12")

    # ── Return to normal (transparent) mode: M0=0, M1=0 ────────────────────
    print("[cfg] Returning to normal mode (M0=0, M1=0)")
    gpio_cleanup(h)

    ser.close()
    print("[cfg] Done. You can now run LoRA-Test.py or start lora-bridge.service.")


if __name__ == '__main__':
    main()
