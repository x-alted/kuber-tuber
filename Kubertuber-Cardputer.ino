/*
 * Kuber‑Tuber Cardputer Firmware
 * Version: 1.0
 * 
 * Device: M5Stack Cardputer (ESP32‑S3) + LoRa Cap (SX1262, 915 MHz)
 * 
 * Function:
 *   - Read text from built‑in keyboard
 *   - Encrypt message using AES‑256‑CBC
 *   - Transmit encrypted packet via LoRa
 *   - Show status on ST7789 display
 * 
 * Dependencies (install via Arduino Library Manager):
 *   - M5Cardputer (by M5Stack)
 *   - RadioLib (for SX1262)
 *   - mbedtls (built into ESP32, no extra install)
 */

#include <M5Cardputer.h>
#include <RadioLib.h>
#include <mbedtls/aes.h>

// ==================== CONFIGURATION ====================

// LoRa settings (915 MHz for North America)
#define LORA_FREQ     915.0
#define LORA_BW       125.0      // bandwidth (kHz)
#define LORA_SF       9          // spreading factor
#define LORA_CR       7          // coding rate (4/7)
#define LORA_TX_POWER 22         // dBm

// Pin mappings for M5Stack Cardputer + LoRa Cap
// The LoRa Cap uses SPI and specific CS, RST, BUSY pins
#define LORA_CS       5
#define LORA_RST      14
#define LORA_BUSY     13
#define LORA_DIO1     12   // not used in simple TX mode, but required by RadioLib

// AES‑256 key (32 bytes) – replace with your actual key (base64 or hex)
// In production, this should be stored in secure NVS or flash encryption.
// For this demo, we hardcode a sample key (must match worker1).
// DO NOT commit real keys to public repos.
const uint8_t aes_key[32] = {
  0x60, 0x3d, 0xeb, 0x10, 0x15, 0xca, 0x71, 0xbe,
  0x2b, 0x73, 0xae, 0xf0, 0x85, 0x7d, 0x77, 0x81,
  0x1f, 0x35, 0x2c, 0x07, 0x3b, 0x61, 0x08, 0xd7,
  0x2d, 0x98, 0x10, 0xa3, 0x09, 0x14, 0xdf, 0xf4
};

// Maximum message length (bytes) – limit to keep LoRa packet short
#define MAX_MSG_LEN   240

// ==================== GLOBALS ====================

// Radio object
SX1262 radio = new Module(LORA_CS, LORA_DIO1, LORA_RST, LORA_BUSY);

// Display and keyboard
String message = "";
bool sendPending = false;
uint32_t lastKeyTime = 0;

// Encryption context
mbedtls_aes_context aes_ctx;

// ==================== HELPER FUNCTIONS ====================

// Generate a random 16‑byte IV (using hardware RNG)
void generate_iv(uint8_t *iv) {
  for (int i = 0; i < 16; i++) {
    iv[i] = esp_random() & 0xFF;
  }
}

// AES‑256‑CBC encryption
// Input: plaintext (null‑terminated string)
// Output: base64‑encoded ciphertext with IV prepended (IV + ciphertext)
String encrypt_message(const char *plaintext) {
  size_t plain_len = strlen(plaintext);
  
  // Pad plaintext to block size (16 bytes) using PKCS#7
  size_t padded_len = ((plain_len + 15) / 16) * 16;
  uint8_t *padded = (uint8_t*)malloc(padded_len);
  memcpy(padded, plaintext, plain_len);
  uint8_t pad_value = padded_len - plain_len;
  for (size_t i = plain_len; i < padded_len; i++) {
    padded[i] = pad_value;
  }
  
  // Generate random IV
  uint8_t iv[16];
  generate_iv(iv);
  
  // Allocate ciphertext buffer
  uint8_t *ciphertext = (uint8_t*)malloc(padded_len);
  
  // Initialize AES context
  mbedtls_aes_init(&aes_ctx);
  mbedtls_aes_setkey_enc(&aes_ctx, aes_key, 256);
  
  // CBC encryption (in place)
  mbedtls_aes_crypt_cbc(&aes_ctx, MBEDTLS_AES_ENCRYPT, padded_len, iv, padded, ciphertext);
  
  // Prepare final buffer: IV (16 bytes) + ciphertext
  size_t total_len = 16 + padded_len;
  uint8_t *output = (uint8_t*)malloc(total_len);
  memcpy(output, iv, 16);
  memcpy(output + 16, ciphertext, padded_len);
  
  // Encode to Base64 for easier transmission over LoRa (ASCII safe)
  String b64 = base64_encode(output, total_len);
  
  free(padded);
  free(ciphertext);
  free(output);
  mbedtls_aes_free(&aes_ctx);
  
  return b64;
}

// Simple Base64 encoding (no external libs)
String base64_encode(const uint8_t *data, size_t len) {
  const char* b64_alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  String result = "";
  int i = 0;
  int j = 0;
  uint8_t char_array_3[3];
  uint8_t char_array_4[4];
  
  while (len--) {
    char_array_3[i++] = *(data++);
    if (i == 3) {
      char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
      char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
      char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
      char_array_4[3] = char_array_3[2] & 0x3f;
      
      for (i = 0; i < 4; i++)
        result += b64_alphabet[char_array_4[i]];
      i = 0;
    }
  }
  
  if (i) {
    for (j = i; j < 3; j++)
      char_array_3[j] = '\0';
    
    char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
    char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
    char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
    char_array_4[3] = char_array_3[2] & 0x3f;
    
    for (j = 0; j < i + 1; j++)
      result += b64_alphabet[char_array_4[j]];
    
    while (i++ < 3)
      result += '=';
  }
  
  return result;
}

// Update the display with current message and status
void update_display(const char *status = "Ready", bool error = false) {
  M5Cardputer.Display.fillScreen(TFT_BLACK);
  M5Cardputer.Display.setCursor(0, 0);
  M5Cardputer.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5Cardputer.Display.printf("KUBER-TUBER v1.0\n");
  M5Cardputer.Display.printf("Batt: %d%%\n\n", M5Cardputer.Power.getBatteryLevel());
  
  M5Cardputer.Display.setTextColor(TFT_YELLOW, TFT_BLACK);
  M5Cardputer.Display.print("> ");
  M5Cardputer.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5Cardputer.Display.println(message);
  
  M5Cardputer.Display.setCursor(0, M5Cardputer.Display.height() - 20);
  if (error) {
    M5Cardputer.Display.setTextColor(TFT_RED, TFT_BLACK);
  } else {
    M5Cardputer.Display.setTextColor(TFT_GREEN, TFT_BLACK);
  }
  M5Cardputer.Display.printf("[%s]", status);
}

// Send the current message via LoRa
void send_message() {
  if (message.length() == 0) {
    update_display("Empty", true);
    delay(1000);
    update_display("Ready");
    return;
  }
  
  update_display("Encrypting...");
  
  // Encrypt the message
  String cipher_b64 = encrypt_message(message.c_str());
  
  update_display("Sending...");
  
  // Transmit via LoRa
  int state = radio.transmit(cipher_b64.c_str());
  
  if (state == RADIOLIB_ERR_NONE) {
    update_display("Sent OK");
    M5Cardputer.Display.fillScreen(TFT_GREEN);
    delay(500);
    update_display("Ready");
  } else {
    update_display("Error", true);
    M5Cardputer.Display.fillScreen(TFT_RED);
    delay(1000);
    update_display("Ready");
  }
}

// ==================== SETUP ====================

void setup() {
  // Initialize M5Cardputer (display, power, keyboard)
  M5Cardputer.begin();
  M5Cardputer.Display.setRotation(1);
  M5Cardputer.Display.fillScreen(TFT_BLACK);
  M5Cardputer.Display.setTextSize(2);
  
  update_display("Init LoRa...");
  
  // Initialize LoRa radio
  int state = radio.begin(LORA_FREQ, LORA_BW, LORA_SF, LORA_CR, RADIOLIB_SX126X_SYNC_WORD_PRIVATE, LORA_TX_POWER);
  if (state != RADIOLIB_ERR_NONE) {
    update_display("LoRa Fail", true);
    while (1) delay(1000);
  }
  
  update_display("Ready");
}

// ==================== MAIN LOOP ====================

void loop() {
  M5Cardputer.update();
  
  // Handle keyboard input
  if (M5Cardputer.Keyboard.isPressed()) {
    Keyboard_Class::KeyState key = M5Cardputer.Keyboard.keysState();
    
    // Debounce
    if (millis() - lastKeyTime < 50) return;
    lastKeyTime = millis();
    
    for (int i = 0; i < key.numKeys; i++) {
      uint16_t k = key.keys[i].keyCode;
      
      if (k == KEY_BACKSPACE) {
        if (message.length() > 0) message.remove(message.length() - 1);
      } 
      else if (k == KEY_RETURN) {
        // Send on Enter
        send_message();
      }
      else if (k == KEY_M5) {
        // M5 button also sends
        send_message();
      }
      else if (k >= 32 && k <= 126) {
        // Printable ASCII
        if (message.length() < MAX_MSG_LEN) message += (char)k;
      }
      // Ignore other keys (shift, ctrl, etc.)
    }
    update_display("Ready");
  }
  
  delay(20);
}
