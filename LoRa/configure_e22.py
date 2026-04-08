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

Requires:
    pip install pyserial RPi.GPIO --break-system-packages
    (on Trixie use: sudo apt install python3-rpi.lgpio)
"""

import time
import serial
import sys

try:
    import RPi.GPIO as GPIO
except ImportError:
    try:
        import lgpio as GPIO   # fallback for Trixie
        print("[cfg] Using lgpio (Trixie)")
    except ImportError:
        print("[cfg] ERROR: install python3-rpi.lgpio")
        sys.exit(1)

# ── Pin assignments for Waveshare E22 HAT (jumper B shorted = PI-LoRa mode) ──
M0_PIN = 22   # GPIO22 → module M0
M1_PIN = 27   # GPIO27 → module M1

# ── E22-900T22S register map (write command: C0 <start_addr> <len> <data...>) ──
#
# REG0  ADDH     : high byte of device address  → 0x00
# REG1  ADDL     : low byte of device address   → 0x00
# REG2  NETID    : network ID                   → 0x00
# REG3  SPED     : UART baud + air speed + parity
#          [7:5] UART baud  011 = 9600 bps
#          [4:2] AIR_SPEED  011 = 4.8 kbps (≈ SF9/BW125 – closest match)
#          [1:0] PARITY     00  = 8N1
#          → 0b_011_011_00 = 0x6C
# REG4  OPTION   : TX power + packet size + RSSI + WOR
#          [7:6] RES        00
#          [5:4] SUBPACKET  00  = 240 bytes (max)
#          [3]   RSSI_NOISE 0   = off
#          [2]   TX_POWER   00  = 22 dBm (max)
#          [1:0] WOR_CYCLE  000 = 500 ms (not used in normal mode)
#          → 0x00  (22 dBm, no RSSI byte appended)
# REG5  CHAN     : channel → frequency = 850.125 + CHAN (MHz)
#                 For 915 MHz: CHAN = 64  (850.125 + 64 = 914.125 ≈ 915)
#                 For 915 MHz: CHAN = 65  (850.125 + 65 = 915.125 ← use this)
#          → 0x41 (65 decimal)
# REG6  TRSW    : enable LoRa, transparent mode, no LBT, no WOR
#          → 0x00
# REG7  CRYPT_H  : 0x00 (no encryption – we do it in software)
# REG8  CRYPT_L  : 0x00

ADDH    = 0x00
ADDL    = 0x00
NETID   = 0x00
SPED    = 0x6C   # 9600 baud UART | 4.8 kbps air (SF9/BW125) | 8N1
OPTION  = 0x00   # 22 dBm | no RSSI append
CHAN    = 0x41   # channel 65 → 915.125 MHz
TRSW    = 0x00
CRYPT_H = 0x00
CRYPT_L = 0x00

CONFIG_CMD = bytes([0xC0, 0x00, 0x09,
                    ADDH, ADDL, NETID, SPED, OPTION, CHAN, TRSW, CRYPT_H, CRYPT_L])

READ_CMD = bytes([0xC1, 0x00, 0x09])   # read back 9 registers from addr 0


def set_mode(m0: int, m1: int):
    GPIO.output(M0_PIN, m0)
    GPIO.output(M1_PIN, m1)
    time.sleep(0.1)   # allow module to settle


def main():
    print("[cfg] Configuring Waveshare E22-900T22S for 915 MHz / SF9 / BW125")

    GPIO.setmode(GPIO.BCM)
    GPIO.setup(M0_PIN, GPIO.OUT)
    GPIO.setup(M1_PIN, GPIO.OUT)

    ser = serial.Serial('/dev/ttyAMA0', 9600, timeout=1)
    ser.flushInput()

    # Enter configuration mode: M0=1, M1=1
    print("[cfg] Entering config mode (M0=1 M1=1)...")
    set_mode(1, 1)
    ser.flushInput()

    # Write configuration
    print(f"[cfg] Writing: {CONFIG_CMD.hex(' ')}")
    ser.write(CONFIG_CMD)
    time.sleep(0.3)

    response = ser.read(ser.in_waiting)
    if response:
        print(f"[cfg] Write response: {response.hex(' ')}")
        if response[0] == 0xC1:
            print("[cfg] Write acknowledged ✓")
        else:
            print("[cfg] Unexpected response — check wiring/mode pins")
    else:
        print("[cfg] No response to write (check M0/M1 GPIO pins)")

    # Read back to verify
    print("[cfg] Reading back config...")
    ser.write(READ_CMD)
    time.sleep(0.3)
    readback = ser.read(ser.in_waiting)
    if len(readback) >= 12:
        regs = readback[3:12]
        print(f"[cfg] Registers: {regs.hex(' ')}")
        expected = bytes([ADDH, ADDL, NETID, SPED, OPTION, CHAN, TRSW, CRYPT_H, CRYPT_L])
        if regs == expected:
            print("[cfg] ✅ Config verified — module ready")
        else:
            print(f"[cfg] ⚠ Mismatch! Expected: {expected.hex(' ')}")
    else:
        print(f"[cfg] Short readback ({len(readback)} bytes): {readback.hex(' ')}")

    # Return to normal (transparent) mode: M0=0, M1=0
    print("[cfg] Returning to normal mode (M0=0 M1=0)")
    set_mode(0, 0)

    ser.close()
    GPIO.cleanup()
    print("[cfg] Done. Restart lora-bridge.service.")


if __name__ == '__main__':
    main()
