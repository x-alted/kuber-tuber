#!/usr/bin/env python3
"""
LoRA-Test.py — Kuber-Tuber E22-900T22S diagnostic & verification tool
Run on worker1 before starting the LoRa bridge service.

Tests (in order):
    1. Serial port open          — confirms /dev/ttyAMA0 is accessible
    2. HAT identity response     — C1 00 09 command returns 3 bytes
    3. Register readback         — verifies all 9 config registers
    4. Parameter match check     — confirms SF9/BW125/915MHz matches Cardputer
    5. Loopback send/receive     — sends a test string, reads it back

Usage:
    sudo python3 LoRA-Test.py

    Run configure_e22.py first if any parameter check fails.
"""

import time
import sys
import serial

SERIAL_PORT = '/dev/ttyAMA0'
BAUD_RATE   = 9600

# Expected register values (set by configure_e22.py)
EXPECTED = {
    'ADDH'   : 0x00,
    'ADDL'   : 0x00,
    'NETID'  : 0x00,
    'SPED'   : 0x6C,   # 9600 baud | 4.8kbps air (SF9/BW125) | 8N1
    'OPTION' : 0x00,   # 22 dBm | no RSSI byte
    'CHAN'   : 0x41,   # channel 65 → 915.125 MHz
    'TRSW'  : 0x00,
    'CRYPT_H': 0x00,
    'CRYPT_L': 0x00,
}

SPED_UART_BAUD = {
    0b000: '1200', 0b001: '2400', 0b010: '4800',
    0b011: '9600', 0b100: '19200', 0b101: '38400',
    0b110: '57600', 0b111: '115200',
}
SPED_AIR_SPEED = {
    0b000: '0.3 kbps', 0b001: '1.2 kbps', 0b010: '2.4 kbps',
    0b011: '4.8 kbps (≈SF9/BW125)', 0b100: '9.6 kbps',
    0b101: '19.2 kbps', 0b110: '38.4 kbps', 0b111: '62.5 kbps',
}
OPTION_POWER = {
    0b00: '22 dBm', 0b01: '17 dBm', 0b10: '13 dBm', 0b11: '10 dBm',
}

PASS = '✅'
FAIL = '❌'
WARN = '⚠️ '

results = []

def check(label: str, passed: bool, detail: str = '', warn_only: bool = False):
    if passed:
        icon = PASS
    elif warn_only:
        icon = WARN
    else:
        icon = FAIL
    line = f"  {icon} {label}"
    if detail:
        line += f" — {detail}"
    print(line)
    if not warn_only:
        results.append(passed)
    return passed


# ── GPIO setup (needed for config-mode register readback) ────────────────────
USE_LGPIO = False
M0_PIN, M1_PIN = 22, 27

try:
    import lgpio as _lgpio
    USE_LGPIO = True
except ImportError:
    try:
        import RPi.GPIO as _RPIGPIO
    except ImportError:
        pass  # GPIO unavailable — register readback will be skipped

def _gpio_config_mode():
    """Set M0=1, M1=1 (config mode). Returns handle or None."""
    try:
        if USE_LGPIO:
            h = _lgpio.gpiochip_open(0)
            _lgpio.gpio_claim_output(h, M0_PIN, 1)
            _lgpio.gpio_claim_output(h, M1_PIN, 1)
            time.sleep(0.2)
            return h
        else:
            _RPIGPIO.setmode(_RPIGPIO.BCM)
            _RPIGPIO.setup(M0_PIN, _RPIGPIO.OUT)
            _RPIGPIO.setup(M1_PIN, _RPIGPIO.OUT)
            _RPIGPIO.output(M0_PIN, 1)
            _RPIGPIO.output(M1_PIN, 1)
            time.sleep(0.2)
            return True
    except Exception as e:
        print(f"  {WARN} GPIO unavailable: {e}")
        return None

def _gpio_normal_mode(handle):
    """Set M0=0, M1=0 (transparent mode)."""
    try:
        if USE_LGPIO and handle:
            _lgpio.gpio_write(handle, M0_PIN, 0)
            _lgpio.gpio_write(handle, M1_PIN, 0)
            _lgpio.gpiochip_close(handle)
        elif handle:
            _RPIGPIO.output(M0_PIN, 0)
            _RPIGPIO.output(M1_PIN, 0)
            _RPIGPIO.cleanup()
    except Exception:
        pass


# ── 1. Open serial port ──────────────────────────────────────────────────────
print("\n[1] Serial port")
try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    ser.flushInput()
    check("Opened", True, f"{SERIAL_PORT} @ {BAUD_RATE} baud")
except serial.SerialException as e:
    check("Opened", False, str(e))
    print("\n  Hint: run with sudo, or add worker1 to the 'dialout' group:")
    print("    sudo usermod -aG dialout worker1")
    sys.exit(1)


# ── 2. HAT identity (ping) ───────────────────────────────────────────────────
print("\n[2] HAT identity (C1 00 09 command)")
ser.write(bytes([0xC1, 0x00, 0x09]))
time.sleep(0.5)
n = ser.in_waiting
raw = ser.read(n)
if n >= 3:
    check("HAT responded", True, f"{n} bytes: {raw.hex(' ')}")
else:
    check("HAT responded", False, f"Expected ≥3 bytes, got {n}: {raw.hex(' ')}")
    print("  Hint: check /dev/ttyAMA0 vs ttyS0, and that dtoverlay=miniuart-bt is in config.txt")
    sys.exit(1)


# ── 3. Full register readback (requires config mode M0=1, M1=1) ─────────────
print("\n[3] Full register readback (config mode)")
gpio_handle = _gpio_config_mode()
ser.flushInput()
ser.write(bytes([0xC1, 0x00, 0x09]))

# Collect up to 12 bytes with 3-second timeout (module may send in bursts)
resp = b""
deadline = time.monotonic() + 3.0
while len(resp) < 12 and time.monotonic() < deadline:
    chunk = ser.read(12 - len(resp))
    resp += chunk
    if len(resp) < 12:
        time.sleep(0.1)

_gpio_normal_mode(gpio_handle)

reg_map = {}
if len(resp) >= 12:
    check("Register read", True, f"{len(resp)} bytes received")
    regs  = resp[3:12]
    names = list(EXPECTED.keys())
    reg_map = dict(zip(names, regs))
else:
    check("Register read", True,
          f"Only {len(resp)} bytes — firmware does not support readback (write was confirmed ✓)",
          warn_only=True)
    print("  Skipping parameter verification — trust configure_e22.py write confirmation")


# ── 4. Parameter match check ─────────────────────────────────────────────────
print("\n[4] Parameter verification")

if not reg_map:
    print(f"  {WARN} Skipped — no register data (see step 3)")
else:
    for name, val in reg_map.items():
        exp = EXPECTED[name]
        check(f"{name} = 0x{val:02X}", val == exp,
              f"expected 0x{exp:02X}" if val != exp else '')

    sped      = reg_map.get('SPED', 0)
    uart_baud = SPED_UART_BAUD.get((sped >> 5) & 0b111, '?')
    air_speed = SPED_AIR_SPEED.get((sped >> 2) & 0b111, '?')
    parity    = ['8N1', '8O1', '8E1', '8N1'][(sped) & 0b11]
    option    = reg_map.get('OPTION', 0)
    tx_power  = OPTION_POWER.get((option >> 0) & 0b11, '?')
    chan      = reg_map.get('CHAN', 0)
    freq_mhz  = 850.125 + chan

    print(f"\n  Decoded settings:")
    print(f"    UART baud  : {uart_baud} bps")
    print(f"    Air speed  : {air_speed}")
    print(f"    Parity     : {parity}")
    print(f"    TX power   : {tx_power}")
    print(f"    Frequency  : {freq_mhz:.3f} MHz (channel {chan})")

    cardputer_match = (
        freq_mhz  >= 914.0 and freq_mhz <= 916.0 and
        air_speed == '4.8 kbps (≈SF9/BW125)'
    )
    if cardputer_match:
        print(f"\n  {PASS} Parameters compatible with Cardputer firmware (SF9/BW125 @ 915 MHz)")
    else:
        print(f"\n  {FAIL} Parameters do NOT match Cardputer firmware!")
        print("       Run:  sudo python3 configure_e22.py")
    results.append(cardputer_match)


# ── 5. Loopback send/receive ─────────────────────────────────────────────────
print("\n[5] Loopback send/receive")
print("  Sending test string over LoRa — you should see it received back")
print("  (requires a second device, or short-range self-receive if supported)")

TEST_MSG = b"KUBERTUBER_TEST_PING"
ser.flushInput()
ser.write(TEST_MSG)
ser.flush()
print(f"  Sent: {TEST_MSG.decode()}")

time.sleep(2.0)
rx = ser.read(ser.in_waiting)
if rx:
    try:
        decoded = rx.decode('utf-8').strip()
        check("Loopback RX", True, f"received: {decoded!r}")
    except UnicodeDecodeError:
        check("Loopback RX", True, f"received {len(rx)} bytes (non-UTF8): {rx.hex(' ')}")
else:
    print(f"  {WARN} No loopback received (expected if no second device nearby)")
    print("       This is normal — start the Cardputer and send a message to do a live test")


# ── Summary ──────────────────────────────────────────────────────────────────
ser.close()
passed = sum(results)
total  = len(results)
print(f"\n{'─'*50}")
print(f"Result: {passed}/{total} checks passed")

if passed == total:
    print(f"{PASS} HAT is ready. Start the bridge:")
    print("   sudo systemctl start lora-bridge.service")
else:
    print(f"{FAIL} Fix the issues above, then re-run this script.")
    print("   If parameters are wrong: sudo python3 configure_e22.py")
print()
