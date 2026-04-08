// ============================================================
// LoRaDemo.gs — 3-minute LoRa activity simulation
// Kuber-Tuber · Google Slides Live Demo Script
//
// Simulates the exact output of LoRa-Bridge.py running on
// worker1, using the real log format:
//   [bridge] RX (N chars): <base64 preview>...
//   [bridge]   seq=N msg='<plaintext>'
//   [bridge]   Forwarded OK → sending ACK
//   [bridge]   ACK:N sent
//
// Three scenarios from Use-Cases.md, each ~60 seconds:
//   Scenario 1 — Event Security Messaging
//   Scenario 2 — Refrigerated Warehouse Temperature Alerts
//   Scenario 3 — Construction Site Lift Coordination
// ============================================================

// ── Message data ──────────────────────────────────────────
//
// Each entry: [scenario, src, rssiDbm, snrDb, level, plaintext, delayMs]
//
//   scenario  — display label for status bar
//   src       — Cardputer/sensor identifier (shown in ACK line)
//   rssi      — realistic RSSI for LoRa at event/warehouse/site distances
//   snr       — signal-to-noise ratio (LoRa decodes reliably down to ~-20 dB SNR)
//   level     — 'INFO' | 'WARN' | 'ALRT' | 'CRIT' (affects decrypt panel colour)
//   plaintext — exactly the format used in Use-Cases.md validations
//   delayMs   — pause after this message before the next one begins

var LORA_MSGS = [

  // ── Scenario 1: Event Security Messaging (12 msgs, ~60s) ──────────
  // Cardputers carried by security/medical staff at a festival venue.
  // No cellular — LoRa to hub, hub logs to cluster, command centre monitors Rancher.

  ['Event Security',  'CARD-01',  -82,  9.4, 'INFO', 'SEC Gate-A bag check active \u00B7 queue approx 200 persons',    3000],
  ['Event Security',  'CARD-01',  -85,  8.7, 'INFO', 'SEC Gate-B clear \u00B7 flow normal \u00B7 no issues',           2800],
  ['Event Security',  'CARD-02',  -91,  6.2, 'INFO', 'MED Patron unwell near main stage \u00B7 AED requested',         2000],
  ['Event Security',  'CARD-01',  -78, 10.1, 'WARN', 'SEC Crowd surge north gate \u00B7 holding position',             1800],
  ['Event Security',  'CARD-03',  -88,  7.3, 'INFO', 'MED First aid en route north gate \u00B7 ETA 90s',              1600],
  ['Event Security',  'CARD-02',  -93,  5.8, 'INFO', 'MED Patron stable \u00B7 transported to first aid tent',        2500],
  ['Event Security',  'CARD-01',  -80,  9.9, 'INFO', 'SEC North gate stable \u00B7 crowd dispersing normally',         2800],
  ['Event Security',  'CARD-04',  -97, -1.2, 'INFO', 'SEC VIP access confirmed \u00B7 zone-4 secured',                2600],
  ['Event Security',  'CARD-01',  -84,  8.1, 'LOG',  'LOG Shift handover Alpha to Beta commencing 22:00',             2400],
  ['Event Security',  'CARD-03',  -89,  6.9, 'INFO', 'SEC All perimeter gates nominal \u00B7 no further incidents',   2500],
  ['Event Security',  'CARD-02',  -92,  5.4, 'INFO', 'MED All clear \u00B7 no further medical requests',             2800],
  ['Event Security',  'CARD-01',  -81,  9.6, 'INFO', 'SEC Event closing \u00B7 controlled exit in progress',          3200],

  // ── Scenario 2: Refrigerated Warehouse Temperature Alerts (12 msgs, ~60s) ──
  // LoRa temp sensors → hub → Node-RED rules engine → alert on threshold breach.
  // Internet is down; all readings stored locally, sync when internet returns.

  ['Temperature Mon.', 'SENS-FZ1', -74, 11.3, 'INFO', 'TEMP unit=FRZ-1 val=-18.4C status=OK',                         2500],
  ['Temperature Mon.', 'SENS-FZ2', -76, 10.8, 'INFO', 'TEMP unit=FRZ-2 val=-17.9C status=OK',                         2500],
  ['Temperature Mon.', 'SENS-RF1', -71, 12.1, 'INFO', 'TEMP unit=REF-1 val=3.8C  status=OK  thresh=4.0C',             2500],
  ['Temperature Mon.', 'SENS-RF2', -73, 11.6, 'WARN', 'TEMP unit=REF-2 val=4.1C  status=WARN thresh=4.0C',            1800],
  ['Temperature Mon.', 'SENS-FZ1', -75, 10.9, 'WARN', 'TEMP unit=FRZ-1 val=-14.8C status=WARN thresh=-15.0C',         1200],
  ['Temperature Mon.', 'SENS-FZ1', -74, 11.2, 'ALRT', 'ALERT FRZ-1 rising: -14.8C exceeded -15.0C \u00B7 5min rule active', 1000],
  ['Temperature Mon.', 'SENS-FZ1', -76, 10.7, 'CRIT', 'TEMP unit=FRZ-1 val=-12.3C status=CRIT compressor=ERR',        1000],
  ['Temperature Mon.', 'SENS-FZ1', -75, 11.0, 'CRIT', 'ALERT FRZ-1 CRITICAL \u00B7 spoilage risk \u00B7 maint notified via hub', 2500],
  ['Temperature Mon.', 'SENS-FZ2', -77, 10.5, 'INFO', 'TEMP unit=FRZ-2 val=-17.8C status=OK',                         2000],
  ['Temperature Mon.', 'SENS-RF1', -72, 11.8, 'INFO', 'TEMP unit=REF-1 val=4.0C  status=OK',                          2000],
  ['Temperature Mon.', 'SENS-FZ1', -74, 11.3, 'INFO', 'ACTION FRZ-1 offline for compressor inspection',               2500],
  ['Temperature Mon.', 'SENS-FZ1', -75, 10.9, 'INFO', 'TEMP unit=FRZ-1 val=-18.2C status=OK compressor=RESET',        3200],

  // ── Scenario 3: Construction Site Lift Coordination (12 msgs, ~60s) ──
  // No cellular on site. Foremen + crane operators use Cardputers.
  // Hub logs all messages — full safety audit trail in kubectl logs.

  ['Lift Coordination', 'CARD-11', -86,  7.8, 'INFO', 'LIFT REQ  floor=8  load=concrete  crane=C1',                   2200],
  ['Lift Coordination', 'CARD-12', -88,  7.1, 'INFO', 'LIFT ACK  floor=8  operator=MIKE  ETA=4min',                   2000],
  ['Lift Coordination', 'CARD-11', -85,  8.2, 'INFO', 'SAFETY check floor=8 \u00B7 exclusion zone cleared',           1800],
  ['Lift Coordination', 'CARD-11', -87,  7.5, 'INFO', 'LIFT READY  floor=8  load secured to hook',                    1600],
  ['Lift Coordination', 'CARD-12', -89,  6.8, 'INFO', 'SAFETY ALL CLEAR floor=8 \u00B7 commence lift',               1500],
  ['Lift Coordination', 'CARD-12', -86,  7.9, 'INFO', 'LIFT COMPLETE  floor=8  load delivered and secured',           2500],
  ['Lift Coordination', 'CARD-11', -83,  8.6, 'INFO', 'LIFT REQ  floor=12  load=steel-beam  crane=C2',               2000],
  ['Lift Coordination', 'CARD-13', -95,  3.4, 'WARN', 'SAFETY STOP  wind-speed=44kmh  limit=40kmh \u00B7 exceeded',   1000],
  ['Lift Coordination', 'CARD-12', -94,  3.7, 'ALRT', 'ALL HALT \u00B7 wind alert active \u00B7 all crane ops suspended', 1000],
  ['Lift Coordination', 'CARD-13', -96,  3.1, 'WARN', 'SITE supervisor=CHEN wind-speed=38kmh and falling',            2500],
  ['Lift Coordination', 'CARD-13', -93,  4.2, 'INFO', 'SAFETY ALL CLEAR \u00B7 wind nominal \u00B7 ops may resume',   2000],
  ['Lift Coordination', 'CARD-11', -85,  8.0, 'INFO', 'LIFT RESUME \u00B7 all teams standing by \u00B7 C2 ready',     3000],
];

// ── Payload generator ─────────────────────────────────────
// Produces a deterministic but realistic-looking base64 string
// matching the real format: base64(IV[16 bytes] + AES-CBC-ciphertext).
// IV = 24 base64 chars, ciphertext block = 64 chars, total = 88 chars
// (matches what the real Cardputer firmware generates for ~30-char messages)

function _fakePayload(seed) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var s = (seed * 1664525 + 1013904223) >>> 0;
  var out = '';
  for (var i = 0; i < 86; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out += chars[s % 64];
  }
  return out + '==';  // PKCS#7 always pads; final two chars are '=='
}

// Splits the 88-char payload across two display lines for the packet panel.
function _formatPayload(p) {
  return p.slice(0, 44) + '\n' + p.slice(44);
}

// ── Public entry points ───────────────────────────────────

function runFullLoRaDemo() {
  _runMessages(LORA_MSGS, 100);
}

function runLoRaScenario1() {
  _runMessages(LORA_MSGS.slice(0, 12), 100);
}

function runLoRaScenario2() {
  _runMessages(LORA_MSGS.slice(12, 24), 112);
}

function runLoRaScenario3() {
  _runMessages(LORA_MSGS.slice(24, 36), 124);
}

function resetLoRaSlide() {
  var slide = getLoRaSlide();
  _ltsetText(slide, LT.STATUS,
    '\u25CB  Standby  \u2502  worker1 \u00B7 10.0.20.138  \u2502  /dev/ttyAMA0 @ 9600 baud  \u2502  Ready',
    C.text_dim, 9);
  _ltsetText(slide, LT.FEED,
    '[bridge] Listening on /dev/ttyAMA0 @ 9600 baud\n' +
    '[bridge] Receiver: lora-receiver.lora-demo.svc.cluster.local:8080\n' +
    '[bridge] Waiting for packets on 915.0 MHz...',
    C.text_dim, 7.5);
  _ltsetText(slide, LT.PKT,  '\u25CB  Awaiting packet on 915.0 MHz...', C.text_dim, 7.5);
  _ltsetText(slide, LT.DEC, '\u25CB  Awaiting decryption...', C.text_dim, 7.5);
}

// ── Core simulation runner ────────────────────────────────

function _runMessages(msgs, seqStart) {
  var slide    = getLoRaSlide();
  var seq      = seqStart;
  var rxCount  = 0;
  var prevScen = null;

  msgs.forEach(function (m) {
    var scenario = m[0], src = m[1], rssi = m[2], snr  = m[3],
        level    = m[4], text = m[5], delay = m[6];
    seq++;

    // ── Scenario banner when scenario changes ─────────────
    if (scenario !== prevScen) {
      if (prevScen !== null) {
        _ltAppendFeed(slide, '[bridge] ');
        _ltAppendFeed(slide, '[bridge] \u2500\u2500\u2500 ' + scenario.toUpperCase() + ' \u2500\u2500\u2500');
        Utilities.sleep(1500);
      }
      prevScen = scenario;
    }

    // ── Status bar ────────────────────────────────────────
    _ltsetText(slide, LT.STATUS,
      '\u25CF  ' + scenario +
      '  \u2502  worker1 \u00B7 10.0.20.138  \u2502  RX: ' + rxCount + ' msgs',
      C.text_green, 9);

    // ── Step 1: Bridge detects UART activity (500ms) ──────
    var payloadB64 = _fakePayload(seq * 7919 + Math.abs(rssi) * 37);
    var charLen    = payloadB64.replace(/\n/g, '').length;

    _ltText(slide, LT.PKT,
      '\u23F3  Receiving \u2014 /dev/ttyAMA0 active...',
      C.text_amber, 7.5);
    _ltText(slide, LT.DEC, '\u25CB  Awaiting decryption...', C.text_dim, 7.5);
    Utilities.sleep(500);

    // ── Step 2: Raw packet arrives — show RF stats + payload (900ms) ──
    var preview = payloadB64.replace(/\n/g, '').slice(0, 28) + '...';
    _ltAppendFeed(slide, '[bridge] RX (' + charLen + ' chars): ' + preview);

    var snrStr = snr >= 0 ? '+' + snr : '' + snr;
    var pktText = [
      'RSSI  ' + rssi + ' dBm    SNR  ' + snrStr + ' dB',
      'Port  /dev/ttyAMA0 @ 9600 baud',
      'Src   ' + src + '   Freq  915.0 MHz / SF9',
      repeat('\u2500', 34),
      'Payload (base64 \u2014 IV[16B] + AES-256-CBC):',
      _formatPayload(payloadB64),
    ].join('\n');
    _ltText(slide, LT.PKT, pktText, C.text_dim, 7.5);
    Utilities.sleep(900);

    // ── Step 3: Decrypt in progress (700ms) ───────────────
    _ltText(slide, LT.DEC,
      '\u2699  Decrypting (AES-256-CBC, shared key, seq auth)...',
      C.text_amber, 7.5);
    Utilities.sleep(700);

    // ── Step 4: Plaintext revealed ────────────────────────
    var levelColor = (level === 'CRIT' || level === 'ALRT') ? C.text_red
                   : level === 'WARN' ? C.text_amber
                   : C.text_green;

    var decText = [
      'seq  ' + seq + '  \u00B7  src  ' + src,
      repeat('\u2500', 34),
      text,
      '',
      '\u2713 ACK:' + seq + ' sent to ' + src,
    ].join('\n');
    _ltText(slide, LT.DEC, decText, levelColor, 8);

    // ── Step 5: Bridge log completes ──────────────────────
    _ltAppendFeed(slide, '[bridge]   seq=' + seq + ' msg=\'' + text + '\'');
    _ltAppendFeed(slide, '[bridge]   Forwarded OK \u2192 sending ACK');
    _ltAppendFeed(slide, '[bridge]   ACK:' + seq + ' sent to ' + src);

    rxCount++;
    Utilities.sleep(delay);
  });

  // ── Final summary ─────────────────────────────────────
  _ltAppendFeed(slide, '[bridge] ');
  _ltAppendFeed(slide, '[bridge] \u2500\u2500 Sequence complete \u00B7 ' + rxCount + ' msgs received \u00B7 0 replay attempts \u2500\u2500');
  _ltsetText(slide, LT.STATUS,
    '\u2713  Complete  \u2502  ' + rxCount + ' messages received \u00B7 ACKed \u00B7 logged  \u2502  0 replay attempts',
    C.text_green, 9);
}

// ── Shape text helpers ────────────────────────────────────

// Replaces the full text of a titled shape.
function _ltText(slide, title, text, color, size) {
  var el = findLT(slide, title);
  if (!el) return;
  var shape = el.asShape();
  shape.getText().setText(text);
  shape.getText().getTextStyle()
    .setForegroundColor(color || C.text_dim)
    .setFontSize(size || 7.5)
    .setFontFamily('Courier New');
}

// Same as _ltText but also applies via T constant used in onOpen code path.
function _ltsetText(slide, title, text, color, size) {
  _ltText(slide, title, text, color, size);
}

// Appends one line to the scrolling feed log (max 24 visible lines).
function _ltAppendFeed(slide, line) {
  var MAX_LINES = 24;
  var el = findLT(slide, LT.FEED);
  if (!el) return;
  var shape  = el.asShape();
  var current = shape.getText().asString().trim();
  var lines  = current.length > 0 ? current.split('\n') : [];
  lines.push(line);
  if (lines.length > MAX_LINES) lines = lines.slice(lines.length - MAX_LINES);
  shape.getText().setText(lines.join('\n'));
  shape.getText().getTextStyle()
    .setForegroundColor(C.text_dim).setFontSize(7.5).setFontFamily('Courier New');
}
