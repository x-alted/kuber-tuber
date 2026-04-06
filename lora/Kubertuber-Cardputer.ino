/* CARDPUTER ADV - KUBER-TUBER FIRMWARE */
#include <M5Cardputer.h>
#include <RadioLib.h>
#include <mbedtls/aes.h>
#include <Preferences.h>

// ==================== CONFIG ====================
#define LORA_FREQ       915.0
#define LORA_BW         125.0
#define LORA_SF         9
#define LORA_CR         7
#define LORA_TX_POWER   22

#define LORA_CS         5
#define LORA_RST        14
#define LORA_BUSY       13
#define LORA_DIO1       12

#define MAX_MSG_LEN     100
#define ACK_TIMEOUT_MS  1500      // wait for ACK after send
#define RETRY_LIMIT     3

// AES key (32 bytes) – must match bridge
const uint8_t aes_key[32] = {
  0x60, 0x3d, 0xeb, 0x10, 0x15, 0xca, 0x71, 0xbe,
  0x2b, 0x73, 0xae, 0xf0, 0x85, 0x7d, 0x77, 0x81,
  0x1f, 0x35, 0x2c, 0x07, 0x3b, 0x61, 0x08, 0xd7,
  0x2d, 0x98, 0x10, 0xa3, 0x09, 0x14, 0xdf, 0xf4
};

// ==================== GLOBALS ====================
SX1262 radio = new Module(LORA_CS, LORA_DIO1, LORA_RST, LORA_BUSY);
Preferences prefs;
String message = "";
uint32_t lastKeyTime = 0;
uint32_t msg_seq = 0;           // will be loaded from NVS
mbedtls_aes_context aes_ctx;

// ==================== FORWARD DECL ====================
String base64_encode(const uint8_t *data, size_t len);
void generate_iv(uint8_t *iv);
String encrypt_message(const char *plaintext);
void update_display(const char *status, bool error = false);
bool send_with_ack(const char *cipher_b64);

// ==================== NVS (Non‑volatile storage) ====================
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

// ==================== CRYPTO ====================
void generate_iv(uint8_t *iv) {
  for (int i = 0; i < 16; i++) iv[i] = esp_random() & 0xFF;
}

String base64_encode(const uint8_t *data, size_t len) {
  const char* b64_alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  String result = "";
  int i = 0, j = 0;
  uint8_t char_array_3[3];
  uint8_t char_array_4[4];
  
  while (len--) {
    char_array_3[i++] = *(data++);
    if (i == 3) {
      char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
      char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
      char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
      char_array_4[3] = char_array_3[2] & 0x3f;
      for (i = 0; i < 4; i++) result += b64_alphabet[char_array_4[i]];
      i = 0;
    }
  }
  if (i) {
    for (j = i; j < 3; j++) char_array_3[j] = '\0';
    char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
    char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
    char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
    char_array_4[3] = char_array_3[2] & 0x3f;
    for (j = 0; j < i + 1; j++) result += b64_alphabet[char_array_4[j]];
    while (i++ < 3) result += '=';
  }
  return result;
}

String encrypt_message(const char *plaintext) {
  char enriched[MAX_MSG_LEN + 16];
  snprintf(enriched, sizeof(enriched), "%u|%s", msg_seq, plaintext);
  size_t plain_len = strlen(enriched);
  size_t padded_len = ((plain_len + 15) / 16) * 16;
  uint8_t *padded = (uint8_t*)malloc(padded_len);
  if (!padded) return "ERROR_NOMEM";
  memcpy(padded, enriched, plain_len);
  uint8_t pad_value = padded_len - plain_len;
  for (size_t i = plain_len; i < padded_len; i++) padded[i] = pad_value;
  
  uint8_t iv_original[16];
  generate_iv(iv_original);
  uint8_t iv_work[16];
  memcpy(iv_work, iv_original, 16);
  
  uint8_t *ciphertext = (uint8_t*)malloc(padded_len);
  if (!ciphertext) { free(padded); return "ERROR_NOMEM"; }
  
  mbedtls_aes_init(&aes_ctx);
  mbedtls_aes_setkey_enc(&aes_ctx, aes_key, 256);
  mbedtls_aes_crypt_cbc(&aes_ctx, MBEDTLS_AES_ENCRYPT, padded_len, iv_work, padded, ciphertext);
  mbedtls_aes_free(&aes_ctx);
  
  size_t total_len = 16 + padded_len;
  uint8_t *output = (uint8_t*)malloc(total_len);
  if (!output) { free(padded); free(ciphertext); return "ERROR_NOMEM"; }
  memcpy(output, iv_original, 16);
  memcpy(output + 16, ciphertext, padded_len);
  
  String b64 = base64_encode(output, total_len);
  free(padded); free(ciphertext); free(output);
  return b64;
}

// ==================== TWO‑WAY ACK ====================
bool send_with_ack(const char *cipher_b64) {
  for (int attempt = 0; attempt < RETRY_LIMIT; attempt++) {
    // Send packet
    int state = radio.transmit(cipher_b64);
    if (state != RADIOLIB_ERR_NONE) return false;
    
    // Wait for ACK
    uint32_t start = millis();
    while (millis() - start < ACK_TIMEOUT_MS) {
      String ack_str;
      int len = radio.receive(ack_str);
      if (len > 0) {
        if (ack_str.startsWith("ACK:")) {
          // Expected format "ACK:123" where 123 is the sequence number
          uint32_t ack_seq = ack_str.substring(4).toInt();
          if (ack_seq == msg_seq) {
            return true;   // correct ACK received
          }
        }
      }
      delay(10);
    }
    // No ACK, retry
    update_display(String("Retry ") + (attempt+1), false);
  }
  return false;
}

// ==================== UI ====================
void update_display(const char *status, bool error) {
  M5Cardputer.Display.fillScreen(TFT_BLACK);
  M5Cardputer.Display.setCursor(0, 0);
  M5Cardputer.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5Cardputer.Display.printf("KUBER-TUBER v2.0\n");
  M5Cardputer.Display.printf("Batt: %d%%  Seq: %u\n\n", M5Cardputer.Power.getBatteryLevel(), msg_seq);
  
  M5Cardputer.Display.setTextColor(TFT_YELLOW, TFT_BLACK);
  M5Cardputer.Display.print("> ");
  M5Cardputer.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5Cardputer.Display.println(message);
  
  M5Cardputer.Display.setCursor(0, M5Cardputer.Display.height() - 20);
  M5Cardputer.Display.setTextColor(error ? TFT_RED : TFT_GREEN, TFT_BLACK);
  M5Cardputer.Display.printf("[%s]", status);
}

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
    update_display("ACK received", false);
    M5Cardputer.Display.fillScreen(TFT_GREEN);
    delay(500);
    increment_seq(); // only advance seq on successful ACK
    message = "";
    update_display("Ready", false);
  } else {
    update_display("No ACK", true);
    M5Cardputer.Display.fillScreen(TFT_RED);
    delay(1500);
    update_display("Ready", false);
    // Do NOT increment seq – message was not confirmed
  }
}

// ==================== SETUP & LOOP ====================
void setup() {
  M5Cardputer.begin();
  M5Cardputer.Display.setRotation(1);
  M5Cardputer.Display.setTextSize(2);
  
  load_seq_counter();   // restore persistent sequence number
  
  update_display("Init LoRa...", false);
  int state = radio.begin(LORA_FREQ, LORA_BW, LORA_SF, LORA_CR, RADIOLIB_SX126X_SYNC_WORD_PRIVATE, LORA_TX_POWER);
  if (state != RADIOLIB_ERR_NONE) {
    update_display("LoRa Fail", true);
    while (1) delay(1000);
  }
  
  update_display("Ready", false);
}

void loop() {
  M5Cardputer.update();
  if (M5Cardputer.Keyboard.isPressed()) {
    Keyboard_Class::KeyState key = M5Cardputer.Keyboard.keysState();
    if (millis() - lastKeyTime < 50) return;
    lastKeyTime = millis();
    for (int i = 0; i < key.numKeys; i++) {
      uint16_t k = key.keys[i].keyCode;
      if (k == KEY_BACKSPACE) {
        if (message.length() > 0) message.remove(message.length() - 1);
      } else if (k == KEY_RETURN || k == KEY_M5) {
        send_message();
      } else if (k >= 32 && k <= 126) {
        if (message.length() < MAX_MSG_LEN) message += (char)k;
      }
    }
    update_display("Ready", false);
  }
  delay(20);
}
