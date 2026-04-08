// ============================================================
// LoRaSlide.gs — Builds the LoRa live feed demo slide
// Kuber-Tuber · Google Slides Live Demo Script
//
// Creates a new slide with three panels:
//   Left  — scrolling bridge log (kubectl-style live feed)
//   Right top    — last received raw packet + RF statistics
//   Right bottom — decrypted plaintext (post AES-256-CBC)
//
// Shape title prefix: "lt-" (distinguishes from K8s "kt-" shapes)
// ============================================================

// Slide layout — all values in Points (720 × 405 pt canvas).
var LL = {
  W: 720, H: 405,
  // Title + status bar
  TX: 10, TY: 8,  TW: 700, TH: 22,
  SX: 10, SY: 33, SW: 700, SH: 16,
  // Panels (y=53 to y=371)
  PY: 53, PH: 318,
  // Left: scrolling log
  LX: 10, LW: 424,
  // Right: packet info + decrypt (split vertically)
  RX: 444, RW: 266,
  PKT_H: 155,          // incoming packet panel
  DEC_GAP: 8,
  DEC_H: 155,          // PKT_H + DEC_GAP + DEC_H = 318
  // Buttons (5 across)
  BY: 376, BH: 26, BW: 130, BGAP: 8,
};

// LoRa demo shape title constants
var LT = {
  BG:       'lt-bg',
  TITLE:    'lt-title',
  STATUS:   'lt-status',
  FEED:     'lt-feed',
  PKT:      'lt-pkt',
  DEC:      'lt-dec',
  BTN_RUN:  'lt-btn-run',
  BTN_S1:   'lt-btn-s1',
  BTN_S2:   'lt-btn-s2',
  BTN_S3:   'lt-btn-s3',
  BTN_RST:  'lt-btn-rst',
};

// ── Slide finder ──────────────────────────────────────────

function getLoRaSlide() {
  var slides = SlidesApp.getActivePresentation().getSlides();
  for (var i = 0; i < slides.length; i++) {
    var notes = slides[i].getNotesPage().getSpeakerNotesShape().getText().asString();
    if (notes.indexOf('KUBERTUBER_LORA_DEMO') !== -1) return slides[i];
  }
  return slides[slides.length - 1];
}

function findLT(slide, title) {
  var els = slide.getPageElements();
  for (var i = 0; i < els.length; i++) {
    if (els[i].getTitle() === title) return els[i];
  }
  return null;
}

// ── Entry point ───────────────────────────────────────────

function setupLoRaSlide() {
  var pres = SlidesApp.getActivePresentation();
  var slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);

  slide.getNotesPage().getSpeakerNotesShape().getText().setText(
    'KUBERTUBER_LORA_DEMO\n\nLoRa live feed simulation slide.\n' +
    'Controlled by Kuber-Tuber Apps Script — do not remove this tag.'
  );

  _lora_bg(slide);
  _lora_titleBar(slide);
  _lora_feedPanel(slide);
  _lora_packetPanel(slide);
  _lora_decryptPanel(slide);
  _lora_buttons(slide);

  SlidesApp.getUi().alert(
    '\u2713  LoRa demo slide created.\n\n' +
    'Assign scripts to buttons (right-click \u2192 Assign script):\n' +
    '  "\u25B6 Full Demo (3 min)"  \u2192  runFullLoRaDemo\n' +
    '  "\u2461 Event Security"    \u2192  runLoRaScenario1\n' +
    '  "\u2462 Temperature"       \u2192  runLoRaScenario2\n' +
    '  "\u2463 Lift Coord"        \u2192  runLoRaScenario3\n' +
    '  "\u21BA Reset"             \u2192  resetLoRaSlide\n\n' +
    'Or use: \u26A1 Kuber-Tuber Demo \u2192 Open LoRa Control Panel'
  );
}

// ── Background ────────────────────────────────────────────

function _lora_bg(slide) {
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, LL.W, LL.H);
  bg.getFill().setSolidFill(C.slide_bg);
  bg.getBorder().setTransparent();
  bg.setTitle(LT.BG);
}

// ── Title + status bar ────────────────────────────────────

function _lora_titleBar(slide) {
  var title = slide.insertTextBox(
    'LoRa Live Feed  \u00B7  915 MHz  \u00B7  Waveshare E22-900T22S  \u00B7  AES-256-CBC',
    LL.TX, LL.TY, LL.TW, LL.TH
  );
  title.getText().getTextStyle()
    .setForegroundColor(C.text_primary).setFontSize(13).setBold(true);
  title.getFill().setTransparent();
  title.getBorder().setTransparent();
  title.setTitle(LT.TITLE);

  var status = slide.insertTextBox(
    '\u25CB  Standby  \u2502  worker1 · 10.0.20.138  \u2502  /dev/ttyAMA0 @ 9600 baud  \u2502  Ready',
    LL.SX, LL.SY, LL.SW, LL.SH
  );
  status.getText().getTextStyle()
    .setForegroundColor(C.text_dim).setFontSize(9);
  status.getFill().setTransparent();
  status.getBorder().setTransparent();
  status.setTitle(LT.STATUS);
}

// ── Left: scrolling bridge log ────────────────────────────

function _lora_feedPanel(slide) {
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
    LL.LX, LL.PY, LL.LW, LL.PH);
  bg.getFill().setSolidFill(C.panel_bg);
  bg.getBorder().setSolidFill(C.panel_border).setWeight(1);
  bg.setTitle('lt-bg-feed');

  var hdr = slide.insertTextBox(
    'BRIDGE LOG  \u2014  worker1: journalctl -u lora-bridge -f',
    LL.LX + 8, LL.PY + 6, LL.LW - 16, 13);
  hdr.getText().getTextStyle()
    .setForegroundColor(C.text_accent).setFontSize(8).setBold(true);
  hdr.getFill().setTransparent();
  hdr.getBorder().setTransparent();
  hdr.setTitle('lt-feed-hdr');

  var body = slide.insertTextBox(
    '[bridge] Listening on /dev/ttyAMA0 @ 9600 baud\n' +
    '[bridge] Receiver: lora-receiver.lora-demo.svc.cluster.local:8080\n' +
    '[bridge] Waiting for packets on 915.0 MHz...',
    LL.LX + 8, LL.PY + 22, LL.LW - 16, LL.PH - 28);
  body.getText().getTextStyle()
    .setForegroundColor(C.text_dim).setFontSize(7.5).setFontFamily('Courier New');
  body.getFill().setTransparent();
  body.getBorder().setTransparent();
  body.setTitle(LT.FEED);
}

// ── Right top: incoming packet info ───────────────────────

function _lora_packetPanel(slide) {
  var pktY = LL.PY;
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
    LL.RX, pktY, LL.RW, LL.PKT_H);
  bg.getFill().setSolidFill(C.panel_bg);
  bg.getBorder().setSolidFill(C.panel_border).setWeight(1);
  bg.setTitle('lt-bg-pkt');

  var hdr = slide.insertTextBox(
    'INCOMING PACKET  \u2014  worker1 \u00B7 E22-900T22S HAT',
    LL.RX + 8, pktY + 6, LL.RW - 16, 13);
  hdr.getText().getTextStyle()
    .setForegroundColor(C.text_accent).setFontSize(8).setBold(true);
  hdr.getFill().setTransparent();
  hdr.getBorder().setTransparent();
  hdr.setTitle('lt-pkt-hdr');

  var body = slide.insertTextBox(
    '\u25CB  Awaiting packet on 915.0 MHz...',
    LL.RX + 8, pktY + 22, LL.RW - 16, LL.PKT_H - 28);
  body.getText().getTextStyle()
    .setForegroundColor(C.text_dim).setFontSize(7.5).setFontFamily('Courier New');
  body.getFill().setTransparent();
  body.getBorder().setTransparent();
  body.setTitle(LT.PKT);
}

// ── Right bottom: decrypted plaintext ────────────────────

function _lora_decryptPanel(slide) {
  var decY = LL.PY + LL.PKT_H + LL.DEC_GAP;
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
    LL.RX, decY, LL.RW, LL.DEC_H);
  bg.getFill().setSolidFill(C.panel_bg);
  bg.getBorder().setSolidFill(C.panel_border).setWeight(1);
  bg.setTitle('lt-bg-dec');

  var hdr = slide.insertTextBox(
    'DECRYPTED MESSAGE  \u2014  AES-256-CBC \u2713',
    LL.RX + 8, decY + 6, LL.RW - 16, 13);
  hdr.getText().getTextStyle()
    .setForegroundColor(C.text_accent).setFontSize(8).setBold(true);
  hdr.getFill().setTransparent();
  hdr.getBorder().setTransparent();
  hdr.setTitle('lt-dec-hdr');

  var body = slide.insertTextBox(
    '\u25CB  Awaiting decryption...',
    LL.RX + 8, decY + 22, LL.RW - 16, LL.DEC_H - 28);
  body.getText().getTextStyle()
    .setForegroundColor(C.text_dim).setFontSize(7.5).setFontFamily('Courier New');
  body.getFill().setTransparent();
  body.getBorder().setTransparent();
  body.setTitle(LT.DEC);
}

// ── Buttons (5 across bottom) ─────────────────────────────

function _lora_buttons(slide) {
  var defs = [
    { t: LT.BTN_RUN, l: '\u25B6  Full Demo (3 min)', c: C.btn_blue   },
    { t: LT.BTN_S1,  l: '\u2461  Event Security',    c: '#4A148C'     },
    { t: LT.BTN_S2,  l: '\u2462  Temperature',        c: '#01579B'     },
    { t: LT.BTN_S3,  l: '\u2463  Lift Coord',         c: '#1B5E20'     },
    { t: LT.BTN_RST, l: '\u21BA  Reset',              c: C.btn_gray   },
  ];
  var bx = LL.LX;
  defs.forEach(function (d) {
    var btn = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE,
      bx, LL.BY, LL.BW, LL.BH);
    btn.getFill().setSolidFill(d.c);
    btn.getBorder().setTransparent();
    btn.getText().setText(d.l);
    btn.getText().getTextStyle()
      .setForegroundColor('#FFFFFF').setFontSize(9).setBold(true);
    btn.getText().getParagraphStyle()
      .setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    btn.setTitle(d.t);
    bx += LL.BW + LL.BGAP;
  });
}
