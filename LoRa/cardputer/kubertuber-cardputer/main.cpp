/*
 * Kuber‑Tuber Cardputer Firmware — Bidirectional
 *
 * Uplink   (Cardputer → Pi gateway):
 *   - Type a message, press Enter
 *   - AES‑256‑CBC encrypted, Base64‑encoded, with sequence number
 *   - Waits for ACK:<seq> from gateway, retries up to 3 times
 *
 * Downlink (Pi gateway → Cardputer):
 *   - Gateway sends plain‑text "MSG:<text>" at any time
 *   - Displayed in cyan on screen, stored as last_rx_msg
 *   - Radio stays in RX mode when idle so downlinks aren't missed
 */

// ==================== INCLUDES ====================

#include <M5Cardputer.h>
#include <RadioLib.h>
#include <mbedtls/aes.h>
#include <Preferences.h>

// ==================== CONFIGURATION ====================

#define LORA_FREQ       915.0
#define LORA_BW         125.0
#define LORA_SF         9
#define LORA_CR         7
#define LORA_TX_POWER   22

// CAP.KiRa-1262 pin definitions (M5Stack Cardputer ESP32-S3)
#define LORA_CS         5
#define LORA_RST        3
#define LORA_BUSY       6
#define LORA_DIO1       4
#define LORA_MOSI       11
#define LORA_MISO       13
#define LORA_SCK        12

#define MAX_MSG_LEN     100
#define ACK_TIMEOUT_MS  1500
#define RETRY_LIMIT     3

// ==================== DEMO MACROS ====================
// Fn+1: Event security scenario
// Fn+2: Construction lift scenario
// Fn+3: Rural healthcare scenario
#define MACRO_1  "SEC Crowd surge at north gate"
#define MACRO_2  "LIFT REQ floor 3"
#define MACRO_3  "PT 123 TEMP 38.5"

// AES‑256 key — must match LoRa-Bridge.py on worker1
const uint8_t aes_key[32] = {
  0x60, 0x3d, 0xeb, 0x10, 0x15, 0xca, 0x71, 0xbe,
  0x2b, 0x73, 0xae, 0xf0, 0x85, 0x7d, 0x77, 0x81,
  0x1f, 0x35, 0x2c, 0x07, 0x3b, 0x61, 0x08, 0xd7,
  0x2d, 0x98, 0x10, 0xa3, 0x09, 0x14, 0xdf, 0xf4
};

// ==================== GLOBAL STATE ====================

SPIClass spi(FSPI);
SX1262 radio = new Module(LORA_CS, LORA_DIO1, LORA_RST, LORA_BUSY, spi);
Preferences prefs;

String  message      = "";
String  last_rx_msg  = "";   // last downlink message received from gateway
uint32_t lastKeyTime = 0;
uint32_t msg_seq     = 0;
bool    radio_in_rx  = false;   // true when radio.startReceive() is active

mbedtls_aes_context aes_ctx;

// ==================== FORWARD DECLARATIONS ====================

String  base64_encode(const uint8_t *data, size_t len);
void    generate_iv(uint8_t *iv);
String  encrypt_message(const char *plaintext);
void    update_display(const char *status, bool error = false);
bool    send_with_ack(const char *cipher_b64);
void    load_seq_counter();
void    save_seq_counter();
void    increment_seq();
void    send_message();
void    enter_rx();
void    check_downlink();

// ==================== NVS ====================

void load_seq_counter() {
  prefs.begin("kuber-tuber", false);
  msg_seq = prefs.getUInt("seq", 0);
  prefs.end();
}

void save_seq_counter() {
  prefs.begin("kuber-tuber", false);
  prefs.putUInt("seq", msg_seq);
  prefs.end();
}

void increment_seq() {
  msg_seq++;
  save_seq_counter();
}

// ==================== CRYPTOGRAPHY ====================

void generate_iv(uint8_t *iv) {
  for (int i = 0; i < 16; i++) iv[i] = esp_random() & 0xFF;
}

String base64_encode(const uint8_t *data, size_t len) {
  const char *b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  String result = "";
  int i = 0;
  uint8_t c3[3], c4[4];

  while (len--) {
    c3[i++] = *(data++);
    if (i == 3) {
      c4[0] = (c3[0] & 0xfc) >> 2;
      c4[1] = ((c3[0] & 0x03) << 4) + ((c3[1] & 0xf0) >> 4);
      c4[2] = ((c3[1] & 0x0f) << 2) + ((c3[2] & 0xc0) >> 6);
      c4[3] = c3[2] & 0x3f;
      for (i = 0; i < 4; i++) result += b64[c4[i]];
      i = 0;
    }
  }
  if (i) {
    for (int j = i; j < 3; j++) c3[j] = '\0';
    c4[0] = (c3[0] & 0xfc) >> 2;
    c4[1] = ((c3[0] & 0x03) << 4) + ((c3[1] & 0xf0) >> 4);
    c4[2] = ((c3[1] & 0x0f) << 2) + ((c3[2] & 0xc0) >> 6);
    for (int j = 0; j < i + 1; j++) result += b64[c4[j]];
    while (i++ < 3) result += '=';
  }
  return result;
}

String encrypt_message(const char *plaintext) {
  char enriched[MAX_MSG_LEN + 16];
  int enriched_len = snprintf(enriched, sizeof(enriched), "%u|%s", msg_seq, plaintext);
  if (enriched_len <= 0 || enriched_len >= (int)sizeof(enriched)) return "ERROR_ENRICH";

  size_t plain_len  = strlen(enriched);
  size_t padded_len = ((plain_len / 16) + 1) * 16;

  uint8_t *padded = (uint8_t *)malloc(padded_len);
  if (!padded) return "ERROR_NOMEM";
  memcpy(padded, enriched, plain_len);
  uint8_t pad_val = padded_len - plain_len;
  for (size_t i = plain_len; i < padded_len; i++) padded[i] = pad_val;

  uint8_t iv_orig[16], iv_work[16];
  generate_iv(iv_orig);
  memcpy(iv_work, iv_orig, 16);

  uint8_t *ciphertext = (uint8_t *)malloc(padded_len);
  if (!ciphertext) { free(padded); return "ERROR_NOMEM"; }

  mbedtls_aes_init(&aes_ctx);
  mbedtls_aes_setkey_enc(&aes_ctx, aes_key, 256);
  mbedtls_aes_crypt_cbc(&aes_ctx, MBEDTLS_AES_ENCRYPT, padded_len, iv_work, padded, ciphertext);
  mbedtls_aes_free(&aes_ctx);

  size_t total = 16 + padded_len;
  uint8_t *output = (uint8_t *)malloc(total);
  if (!output) { free(padded); free(ciphertext); return "ERROR_NOMEM"; }
  memcpy(output, iv_orig, 16);
  memcpy(output + 16, ciphertext, padded_len);

  String b64str = base64_encode(output, total);
  free(padded); free(ciphertext); free(output);
  return b64str;
}

// ==================== DISPLAY ====================

void update_display(const char *status, bool error) {
  M5Cardputer.Display.fillScreen(TFT_BLACK);
  M5Cardputer.Display.setCursor(0, 0);
  M5Cardputer.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5Cardputer.Display.printf("KUBER-TUBER ADV\n");
  M5Cardputer.Display.printf("Batt:%d%%  Seq:%u\n", M5Cardputer.Power.getBatteryLevel(), msg_seq);

  // Last downlink message (cyan, truncated to fit)
  if (last_rx_msg.length() > 0) {
    M5Cardputer.Display.setTextColor(TFT_CYAN, TFT_BLACK);
    String preview = last_rx_msg.length() > 18 ? last_rx_msg.substring(0, 18) + ".." : last_rx_msg;
    M5Cardputer.Display.printf("< %s\n", preview.c_str());
  } else {
    M5Cardputer.Display.println();
  }

  // Outgoing message being typed (yellow prompt, white text)
  // When empty, show macro shortcut hint in dark grey as a prompt
  M5Cardputer.Display.setTextColor(TFT_YELLOW, TFT_BLACK);
  M5Cardputer.Display.print("> ");
  if (message.length() > 0) {
    M5Cardputer.Display.setTextColor(TFT_WHITE, TFT_BLACK);
    M5Cardputer.Display.println(message);
  } else {
    M5Cardputer.Display.setTextColor(TFT_DARKGREY, TFT_BLACK);
    M5Cardputer.Display.println("Fn+1  Fn+2  Fn+3");
  }

  // Status bar at bottom
  M5Cardputer.Display.setCursor(0, M5Cardputer.Display.height() - 20);
  M5Cardputer.Display.setTextColor(error ? TFT_RED : TFT_GREEN, TFT_BLACK);
  M5Cardputer.Display.printf("[%s]", status);
}

// ==================== RADIO HELPERS ====================

// Put radio in continuous RX mode (non-blocking)
void enter_rx() {
  if (!radio_in_rx) {
    radio.startReceive();
    radio_in_rx = true;
  }
}

// Check for an incoming downlink packet (call from main loop when idle)
void check_downlink() {
  if (!radio_in_rx) return;
  if (!radio.available()) return;

  String incoming;
  int state = radio.readData(incoming);
  radio_in_rx = false;   // readData exits RX mode

  if (state == RADIOLIB_ERR_NONE && incoming.startsWith("MSG:")) {
    last_rx_msg = incoming.substring(4);
    // Flash screen cyan to signal new message
    M5Cardputer.Display.fillScreen(TFT_CYAN);
    delay(200);
    update_display("Ready", false);
  }

  enter_rx();   // re-arm for next packet
}

// ==================== UPLINK (ACK + RETRY) ====================

bool send_with_ack(const char *cipher_b64) {
  // Exit RX mode before transmitting
  if (radio_in_rx) {
    radio.standby();
    radio_in_rx = false;
  }

  for (int attempt = 0; attempt < RETRY_LIMIT; attempt++) {
    int state = radio.transmit(cipher_b64);
    if (state != RADIOLIB_ERR_NONE) return false;

    // Listen for ACK
    radio.startReceive();
    uint32_t start = millis();
    while (millis() - start < ACK_TIMEOUT_MS) {
      if (radio.available()) {
        String ack_str;
        radio.readData(ack_str);

        if (ack_str.startsWith("ACK:")) {
          uint32_t ack_seq = ack_str.substring(4).toInt();
          if (ack_seq == msg_seq) return true;
        }
        // Not our ACK — could be a downlink MSG, handle it
        if (ack_str.startsWith("MSG:")) {
          last_rx_msg = ack_str.substring(4);
          update_display("Sending...", false);
        }
        // Re-arm
        radio.startReceive();
      }
      delay(10);
    }

    String retryMsg = "Retry " + String(attempt + 1);
    update_display(retryMsg.c_str(), false);
  }
  return false;
}

// ==================== SEND MESSAGE ====================

void send_message() {
  if (message.length() == 0) {
    update_display("Empty", true);
    delay(1000);
    update_display("Ready", false);
    return;
  }

  update_display("Encrypting...", false);
  String cipher_b64 = encrypt_message(message.c_str());
  if (cipher_b64.startsWith("ERROR")) {
    update_display(cipher_b64.c_str(), true);
    delay(2000);
    update_display("Ready", false);
    return;
  }

  update_display("Sending...", false);
  bool acked = send_with_ack(cipher_b64.c_str());

  if (acked) {
    update_display("ACK OK", false);
    M5Cardputer.Display.fillScreen(TFT_GREEN);
    delay(500);
    increment_seq();
    message = "";
    update_display("Ready", false);
  } else {
    update_display("No ACK", true);
    M5Cardputer.Display.fillScreen(TFT_RED);
    delay(1500);
    update_display("Ready", false);
  }

  enter_rx();   // back to listening after send attempt
}

// ==================== SETUP ====================

void setup() {
  Serial.begin(115200);
  M5Cardputer.begin();
  M5Cardputer.Display.setRotation(1);
  M5Cardputer.Display.setTextSize(2);

  load_seq_counter();
  update_display("Init LoRa...", false);

  spi.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);

  int state = radio.begin(LORA_FREQ, LORA_BW, LORA_SF, LORA_CR,
                          RADIOLIB_SX126X_SYNC_WORD_PRIVATE, LORA_TX_POWER);
  if (state != RADIOLIB_ERR_NONE) {
    Serial.printf("RadioLib error code: %d\n", state);
    M5Cardputer.Display.fillScreen(TFT_BLACK);
    M5Cardputer.Display.setCursor(0, 0);
    M5Cardputer.Display.setTextColor(TFT_RED, TFT_BLACK);
    M5Cardputer.Display.println("LoRa FAIL");
    M5Cardputer.Display.setTextColor(TFT_WHITE, TFT_BLACK);
    M5Cardputer.Display.printf("Code: %d\n", state);
    M5Cardputer.Display.println("Check pins/cap");
    while (1) delay(1000);
  }

  update_display("Ready", false);
  enter_rx();   // start listening for downlink immediately
}

// ==================== MAIN LOOP ====================

void loop() {
  M5Cardputer.update();

  // Check for incoming downlink messages when idle
  check_downlink();

  // Handle keyboard
  if (M5Cardputer.Keyboard.isPressed()) {
    auto key = M5Cardputer.Keyboard.keysState();

    if (millis() - lastKeyTime < 50) return;
    lastKeyTime = millis();

    if (key.fn) {
      // Fn+1/2/3 pre-loads a demo scenario into the message buffer
      for (char c : key.word) {
        if      (c == '1') { message = MACRO_1; break; }
        else if (c == '2') { message = MACRO_2; break; }
        else if (c == '3') { message = MACRO_3; break; }
      }
      update_display("Ready", false);
      return;
    }
    if (key.del) {
      if (message.length() > 0) message.remove(message.length() - 1);
    }
    if (key.enter) {
      send_message();
      return;
    }
    for (char c : key.word) {
      if (message.length() < MAX_MSG_LEN) message += c;
    }
    update_display("Ready", false);
  }

  delay(20);
}
