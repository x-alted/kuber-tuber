/*
 * Kuber‑Tuber Cardputer Firmware v2.0
 * Fully commented for educational clarity
 * 
 * This firmware runs on the M5Stack Cardputer (ESP32‑S3) with a LoRa Cap (SX1262, 915 MHz).
 * 
 * What it does:
 *   - Reads text from the built‑in keyboard
 *   - Encrypts the message using AES‑256‑CBC (PKCS#7 padding)
 *   - Adds a sequence number to detect replay attacks
 *   - Transmits the encrypted packet via LoRa
 *   - Waits for an acknowledgment (ACK) from the gateway
 *   - Retries up to 3 times if no ACK is received
 *   - Saves the sequence counter in non‑volatile storage (NVS) so it survives reboots
 * 
 * The code is a synthesis of open‑source libraries:
 *   - RadioLib: handles all LoRa radio operations
 *   - M5Cardputer: handles the keyboard and display
 *   - mbedtls: provides AES encryption (built into ESP32)
 *   - Preferences: manages non‑volatile storage
 */

// ==================== INCLUDES ====================

#include <M5Cardputer.h>      // M5Stack Cardputer hardware library (keyboard, display, power)
#include <RadioLib.h>         // Universal radio library – controls the SX1262 LoRa chip
#include <mbedtls/aes.h>      // AES encryption library (part of ESP32's mbedtls)
#include <Preferences.h>      // Non‑volatile storage (saves data across power cycles)

// ==================== CONFIGURATION ====================
// These values are tuned for 915 MHz operation in North America.
// Change LORA_FREQ to 868.0 if you are in Europe.

#define LORA_FREQ       915.0   // Frequency in MHz
#define LORA_BW         125.0   // Bandwidth in kHz (125 kHz is standard for LoRa)
#define LORA_SF         9       // Spreading factor (higher = longer range but slower)
#define LORA_CR         7       // Coding rate (4/7 – forward error correction)
#define LORA_TX_POWER   22      // Transmission power in dBm (max for SX1262)

// Pin mappings for the LoRa Cap on the Cardputer
#define LORA_CS         5       // Chip select (SPI) – tells the radio when to listen
#define LORA_RST        14      // Reset pin – used to reboot the radio module
#define LORA_BUSY       13      // Busy pin – radio signals when it's busy transmitting/receiving
#define LORA_DIO1       12      // Digital I/O pin 1 – used for interrupts (not heavily used in simple TX)

#define MAX_MSG_LEN     100     // Maximum number of characters you can type (reduced to keep LoRa packet small)
#define ACK_TIMEOUT_MS  1500    // How long to wait for an ACK after sending (milliseconds)
#define RETRY_LIMIT     3       // Number of times to retry if no ACK is received

// AES‑256 encryption key (32 bytes)
// This MUST match the key used in the bridge script on worker1.
// In a real deployment, you would store this more securely (e.g., encrypted flash).
// For this capstone, it's hardcoded.
const uint8_t aes_key[32] = {
  0x60, 0x3d, 0xeb, 0x10, 0x15, 0xca, 0x71, 0xbe,
  0x2b, 0x73, 0xae, 0xf0, 0x85, 0x7d, 0x77, 0x81,
  0x1f, 0x35, 0x2c, 0x07, 0x3b, 0x61, 0x08, 0xd7,
  0x2d, 0x98, 0x10, 0xa3, 0x09, 0x14, 0xdf, 0xf4
};

// ==================== GLOBAL VARIABLES ====================

SX1262 radio = new Module(LORA_CS, LORA_DIO1, LORA_RST, LORA_BUSY);
// radio is the main object for all LoRa operations (transmit, receive, etc.)

Preferences prefs;   // Object for non‑volatile storage (saves the sequence counter)

String message = "";          // The text the user is typing (empty initially)
uint32_t lastKeyTime = 0;     // Used for keyboard debouncing (prevents repeated key events)
uint32_t msg_seq = 0;         // Current sequence number – starts from saved value
mbedtls_aes_context aes_ctx;  // AES context – holds encryption state (used by mbedtls)

// ==================== FORWARD DECLARATIONS ====================
// These tell the compiler that these functions exist below.
// Without these, the compiler would complain because the functions call each other.

String base64_encode(const uint8_t *data, size_t len);
void generate_iv(uint8_t *iv);
String encrypt_message(const char *plaintext);
void update_display(const char *status, bool error = false);
bool send_with_ack(const char *cipher_b64);
void load_seq_counter();
void save_seq_counter();
void increment_seq();
void send_message();

// ==================== NON‑VOLATILE STORAGE (NVS) ====================
// These functions handle saving the sequence number across reboots.

void load_seq_counter() {
  // Open the namespace "kuber-tuber" in read/write mode (false = read/write, true = read‑only)
  prefs.begin("kuber-tuber", false);
  // Get the stored value for key "seq". If it doesn't exist, default to 0.
  msg_seq = prefs.getUInt("seq", 0);
  prefs.end();  // Close the namespace
}

void save_seq_counter() {
  prefs.begin("kuber-tuber", false);
  prefs.putUInt("seq", msg_seq);   // Store the current sequence number
  prefs.end();
}

void increment_seq() {
  msg_seq++;          // Increase the sequence number
  save_seq_counter(); // Immediately save to NVS – survives power loss
}

// ==================== CRYPTOGRAPHY ====================

void generate_iv(uint8_t *iv) {
  // Generate a random 16‑byte Initialization Vector (IV)
  // esp_random() is a hardware random number generator on the ESP32.
  for (int i = 0; i < 16; i++) {
    iv[i] = esp_random() & 0xFF;   // Take the lowest 8 bits of the random 32‑bit value
  }
}

// Base64 encoding – converts binary data to ASCII text so it can be sent over LoRa reliably.
// LoRa packets can contain any byte, but Base64 makes it safe to print and debug.
String base64_encode(const uint8_t *data, size_t len) {
  const char* b64_alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  String result = "";
  int i = 0, j = 0;
  uint8_t char_array_3[3];
  uint8_t char_array_4[4];
  
  // Process the input 3 bytes at a time, producing 4 output characters.
  while (len--) {
    char_array_3[i++] = *(data++);
    if (i == 3) {
      // Convert 3 bytes into 4 Base64 characters
      char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
      char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
      char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
      char_array_4[3] = char_array_3[2] & 0x3f;
      for (i = 0; i < 4; i++) result += b64_alphabet[char_array_4[i]];
      i = 0;
    }
  }
  
  // Handle remaining bytes (if input length not multiple of 3)
  if (i) {
    for (j = i; j < 3; j++) char_array_3[j] = '\0';
    char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
    char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
    char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
    char_array_4[3] = char_array_3[2] & 0x3f;
    for (j = 0; j < i + 1; j++) result += b64_alphabet[char_array_4[j]];
    while (i++ < 3) result += '=';   // Add padding
  }
  return result;
}

// Encrypt a plaintext message using AES‑256‑CBC.
// Returns a Base64‑encoded string containing: [16‑byte IV] + [ciphertext]
String encrypt_message(const char *plaintext) {
  // Step 1: Add sequence number to the message (format "seq|message")
  char enriched[MAX_MSG_LEN + 16];
  int enriched_len = snprintf(enriched, sizeof(enriched), "%u|%s", msg_seq, plaintext);
  if (enriched_len <= 0 || enriched_len >= (int)sizeof(enriched)) {
    return "ERROR_ENRICH";
  }
  
  size_t plain_len = strlen(enriched);
  
  // Step 2: Apply PKCS#7 padding to make the length a multiple of 16 bytes (AES block size)
  size_t padded_len = ((plain_len + 15) / 16) * 16;
  uint8_t *padded = (uint8_t*)malloc(padded_len);
  if (!padded) return "ERROR_NOMEM";
  memcpy(padded, enriched, plain_len);
  uint8_t pad_value = padded_len - plain_len;
  for (size_t i = plain_len; i < padded_len; i++) {
    padded[i] = pad_value;   // Padding bytes all equal to the number of padding bytes
  }
  
  // Step 3: Generate a random Initialization Vector (IV)
  uint8_t iv_original[16];
  generate_iv(iv_original);
  
  // Step 4: Make a copy of the IV because mbedtls_aes_crypt_cbc modifies the IV buffer
  uint8_t iv_work[16];
  memcpy(iv_work, iv_original, 16);
  
  // Step 5: Allocate space for ciphertext
  uint8_t *ciphertext = (uint8_t*)malloc(padded_len);
  if (!ciphertext) { free(padded); return "ERROR_NOMEM"; }
  
  // Step 6: Perform AES‑256‑CBC encryption
  mbedtls_aes_init(&aes_ctx);
  mbedtls_aes_setkey_enc(&aes_ctx, aes_key, 256);  // 256 = key size in bits
  mbedtls_aes_crypt_cbc(&aes_ctx, MBEDTLS_AES_ENCRYPT, padded_len, iv_work, padded, ciphertext);
  mbedtls_aes_free(&aes_ctx);
  
  // Step 7: Combine IV (original, not modified) and ciphertext into one buffer
  size_t total_len = 16 + padded_len;
  uint8_t *output = (uint8_t*)malloc(total_len);
  if (!output) { free(padded); free(ciphertext); return "ERROR_NOMEM"; }
  memcpy(output, iv_original, 16);
  memcpy(output + 16, ciphertext, padded_len);
  
  // Step 8: Encode the whole thing as Base64 (so it's safe for LoRa transmission)
  String b64 = base64_encode(output, total_len);
  
  free(padded);
  free(ciphertext);
  free(output);
  
  return b64;
}

// ==================== TWO‑WAY ACK WITH RETRY ====================

bool send_with_ack(const char *cipher_b64) {
  // Try to send the packet up to RETRY_LIMIT times
  for (int attempt = 0; attempt < RETRY_LIMIT; attempt++) {
    // Send the packet via LoRa
    int state = radio.transmit(cipher_b64);
    if (state != RADIOLIB_ERR_NONE) return false;   // Hardware error – cannot send
    
    // Wait for an ACK packet from the gateway
    uint32_t start = millis();
    while (millis() - start < ACK_TIMEOUT_MS) {
      String ack_str;
      int len = radio.receive(ack_str);   // Non‑blocking receive (timeout handled by loop)
      if (len > 0) {
        // ACK format should be "ACK:<seq>"
        if (ack_str.startsWith("ACK:")) {
          uint32_t ack_seq = ack_str.substring(4).toInt();
          if (ack_seq == msg_seq) {
            return true;   // Correct ACK received for this message
          }
        }
      }
      delay(10);   // Small delay to avoid hogging the CPU
    }
    // No ACK received – update display and retry
    update_display(String("Retry ") + (attempt + 1), false);
  }
  return false;   // All retries failed
}

// ==================== USER INTERFACE ====================

void update_display(const char *status, bool error) {
  M5Cardputer.Display.fillScreen(TFT_BLACK);          // Clear screen
  M5Cardputer.Display.setCursor(0, 0);
  M5Cardputer.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5Cardputer.Display.printf("KUBER-TUBER v2.0\n");
  M5Cardputer.Display.printf("Batt: %d%%  Seq: %u\n\n", 
    M5Cardputer.Power.getBatteryLevel(), msg_seq);   // Show battery and current sequence number
  
  M5Cardputer.Display.setTextColor(TFT_YELLOW, TFT_BLACK);
  M5Cardputer.Display.print("> ");
  M5Cardputer.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5Cardputer.Display.println(message);               // Show the typed message
  
  M5Cardputer.Display.setCursor(0, M5Cardputer.Display.height() - 20);
  M5Cardputer.Display.setTextColor(error ? TFT_RED : TFT_GREEN, TFT_BLACK);
  M5Cardputer.Display.printf("[%s]", status);        // Show status (Ready, Sending, etc.)
}

// This is called when the user presses Enter or M5 to send the current message.
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
    M5Cardputer.Display.fillScreen(TFT_GREEN);   // Flash green for success
    delay(500);
    increment_seq();        // Only increase sequence number on successful ACK
    message = "";           // Clear the typed message
    update_display("Ready", false);
  } else {
    update_display("No ACK", true);
    M5Cardputer.Display.fillScreen(TFT_RED);     // Flash red for failure
    delay(1500);
    update_display("Ready", false);
    // Do NOT increment seq – the message was not confirmed delivered
  }
}

// ==================== SETUP ====================

void setup() {
  // Initialize the Cardputer hardware (display, power management, keyboard)
  M5Cardputer.begin();
  M5Cardputer.Display.setRotation(1);   // Rotate screen to landscape
  M5Cardputer.Display.setTextSize(2);   // Make text larger
  
  // Load the saved sequence number from non‑volatile storage
  load_seq_counter();
  
  // Show initialisation message
  update_display("Init LoRa...", false);
  
  // Initialize the LoRa radio
  int state = radio.begin(LORA_FREQ, LORA_BW, LORA_SF, LORA_CR, 
                          RADIOLIB_SX126X_SYNC_WORD_PRIVATE, LORA_TX_POWER);
  if (state != RADIOLIB_ERR_NONE) {
    update_display("LoRa Fail", true);
    while (1) delay(1000);   // Halt – radio not working
  }
  
  update_display("Ready", false);
}

// ==================== MAIN LOOP ====================

void loop() {
  // Update the Cardputer state (checks for key presses, etc.)
  M5Cardputer.update();
  
  // Handle keyboard input
  if (M5Cardputer.Keyboard.isPressed()) {
    Keyboard_Class::KeyState key = M5Cardputer.Keyboard.keysState();
    
    // Debounce: ignore keys pressed within 50ms of the last one (prevents double typing)
    if (millis() - lastKeyTime < 50) return;
    lastKeyTime = millis();
    
    // Loop through all keys that are currently pressed
    for (int i = 0; i < key.numKeys; i++) {
      uint16_t k = key.keys[i].keyCode;
      
      if (k == KEY_BACKSPACE) {
        // Remove the last character from the message string
        if (message.length() > 0) message.remove(message.length() - 1);
      } 
      else if (k == KEY_RETURN || k == KEY_M5) {
        // Enter key or M5 button: send the message
        send_message();
      }
      else if (k >= 32 && k <= 126) {
        // Printable ASCII characters (space, letters, numbers, punctuation)
        if (message.length() < MAX_MSG_LEN) message += (char)k;
      }
      // Ignore other keys (Shift, Ctrl, function keys, etc.)
    }
    update_display("Ready", false);   // Refresh display after typing
  }
  
  delay(20);   // Small delay to reduce CPU usage
}
