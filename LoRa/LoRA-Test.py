import time
import board
import digitalio
import busio
import adafruit_rfm9x

# Adjust CS and RESET pins to match your HAT
CS = digitalio.DigitalInOut(board.CE0)    # usually CE0 or D8
RESET = digitalio.DigitalInOut(board.D25) # usually D25

RADIO_FREQ_MHZ = 915.0  # change if needed: 433.0 or 868.0

# Initialize SPI bus
spi = busio.SPI(board.SCK, board.MOSI, board.MISO)

try:
    rfm9x = adafruit_rfm9x.RFM9x(spi, CS, RESET, RADIO_FREQ_MHZ)
    print("\u2705 LoRa HAT detected!")
except RuntimeError as e:
    print("\u26a0\ufe0f LoRa HAT not found:", e)
