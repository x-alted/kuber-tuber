// ============================================================
// SlideSetup.gs — Creates the demo slide and all its shapes
// ============================================================
//
// Call via menu: ⚡ Kuber-Tuber Demo > ① Setup Demo Slide
//
// This appends a new blank slide at the end of the deck,
// tags it for getDemoSlide(), and builds:
//   • Dark full-slide background
//   • Title + status bar
//   • 2×2 node grid (master, worker1, worker2, worker3)
//   • Pod distribution table (right top)
//   • Cluster events log (right bottom)
//   • Four action buttons along the bottom
//
// All shapes are titled (setTitle) so Simulation.gs can find
// and update them without relying on fragile index lookups.
// ============================================================

// Slide layout — all values in Points.
// Standard 16:9 Google Slides canvas = 720 × 405 pt.
var L = {
  W: 720, H: 405,

  // Title and status bar
  TX: 12,  TY: 8,   TW: 696, TH: 26,   // title
  SX: 12,  SY: 37,  SW: 696, SH: 16,   // status bar

  // Left column: 2×2 node grid
  NX: 12,  NY: 58,                       // grid origin
  NW: 158, NH: 85,  NG: 7,              // node box size + gap

  // Right column: pods panel + log panel
  RX: 352, RW: 358,
  PY: 58,  PH: 132,                      // pods panel
  LY: 197, LH: 163,                      // log panel

  // Buttons (bottom row)
  BY: 368, BH: 28,  BW: 158,
};

// ── Entry point ───────────────────────────────────────────

function setupDemoSlide() {
  var pres = SlidesApp.getActivePresentation();
  var slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);

  // Tag the slide so getDemoSlide() can locate it reliably.
  slide.getNotesPage().getSpeakerNotesShape().getText().setText(
    'KUBERTUBER_DEMO\n\nThis slide is controlled by the Kuber-Tuber Apps Script.\n' +
    'Do not remove the KUBERTUBER_DEMO tag from these notes.'
  );

  _buildBackground(slide);
  _buildTitleBar(slide);
  _buildNodeGrid(slide);
  _buildPodsPanel(slide);
  _buildLogPanel(slide);
  _buildButtons(slide);

  SlidesApp.getUi().alert(
    '\u2713  Demo slide created at the end of the deck.\n\n' +
    'ACTIVATE IN-SLIDE BUTTONS (edit mode only):\n' +
    '  1. Right-click "\u25B6 Check Status"     \u2192 Assign script \u2192  showNodeStatus\n' +
    '  2. Right-click "\u26A1 Simulate Failure"  \u2192 Assign script \u2192  simulateNodeFailure\n' +
    '  3. Right-click "\u2736 Watch Self-Heal"   \u2192 Assign script \u2192  watchSelfHealing\n' +
    '  4. Right-click "\u21BA Reset"             \u2192 Assign script \u2192  resetDemo\n\n' +
    'For live presentations, use the sidebar instead:\n' +
    '  \u26A1 Kuber-Tuber Demo  \u2192  Open Control Panel'
  );
}

// ── Background ────────────────────────────────────────────

function _buildBackground(slide) {
  // Insert first so it sits behind everything else (Z-order = insertion order).
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, L.W, L.H);
  bg.getFill().setSolidFill(C.slide_bg);
  bg.getBorder().setTransparent();
  bg.setTitle(T.BG);
}

// ── Title + status bar ────────────────────────────────────

function _buildTitleBar(slide) {
  var title = slide.insertTextBox(
    'Kubernetes Cluster  \u00B7  Live Node Status  \u00B7  ' + CLUSTER_VERSION,
    L.TX, L.TY, L.TW, L.TH
  );
  _styleText(title, C.text_primary, 13, true);
  title.setTitle(T.TITLE);

  var status = slide.insertTextBox(
    '\u25CF  All systems nominal  \u2502  4/4 nodes Ready  \u2502  6 pods Running',
    L.SX, L.SY, L.SW, L.SH
  );
  _styleText(status, C.text_green, 9, false);
  status.setTitle(T.STATUS);
}

// ── Node grid ─────────────────────────────────────────────

function _buildNodeGrid(slide) {
  // Panel background behind the 2×2 grid
  var panelH = L.NH * 2 + L.NG + 10;
  var panelW = L.NW * 2 + L.NG + 10;
  var panel = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
    L.NX, L.NY, panelW, panelH);
  panel.getFill().setSolidFill(C.panel_bg);
  panel.getBorder().setSolidFill(C.panel_border).setWeight(1);
  panel.setTitle('kt-bg-nodes');

  var gx = L.NX + 5;
  var gy = L.NY + 5;
  var step = L.NW + L.NG;

  _buildNodeBox(slide, NODES[0], gx,        gy);           // master   top-left
  _buildNodeBox(slide, NODES[1], gx + step, gy);           // worker1  top-right
  _buildNodeBox(slide, NODES[2], gx,        gy + L.NH + L.NG); // worker2  bot-left
  _buildNodeBox(slide, NODES[3], gx + step, gy + L.NH + L.NG); // worker3  bot-right
}

function _buildNodeBox(slide, node, x, y) {
  var isMaster = node.id === 'master';
  var box = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, L.NW, L.NH);
  box.getFill().setSolidFill(isMaster ? C.master_bg : C.healthy_bg);
  box.getBorder().setSolidFill(isMaster ? C.master_bdr : C.healthy_bdr).setWeight(1.5);
  box.setTitle(T.NODE + node.id);

  var lines = [
    node.label,
    node.ip + '  \u2502  VLAN ' + node.vlan,
    node.role === 'control-plane' ? 'K3s control plane' : 'K3s worker node',
    '\u25CF  Ready',
    'CPU  11%   RAM  29%',
  ];
  box.getText().setText(lines.join('\n'));
  box.getText().getTextStyle()
    .setForegroundColor(C.text_primary).setFontSize(8).setFontFamily('Courier New');
}

// ── Pods panel ────────────────────────────────────────────

function _buildPodsPanel(slide) {
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
    L.RX, L.PY, L.RW, L.PH);
  bg.getFill().setSolidFill(C.panel_bg);
  bg.getBorder().setSolidFill(C.panel_border).setWeight(1);
  bg.setTitle('kt-bg-pods');

  var hdr = slide.insertTextBox('POD DISTRIBUTION  \u2014  kubectl get pods -A',
    L.RX + 8, L.PY + 6, L.RW - 16, 13);
  _styleText(hdr, C.text_accent, 8, true);
  hdr.setTitle('kt-pods-hdr');

  var body = slide.insertTextBox(buildPodsText(PODS_NORMAL),
    L.RX + 8, L.PY + 22, L.RW - 16, L.PH - 28);
  body.getText().getTextStyle()
    .setForegroundColor(C.text_dim).setFontSize(7.5).setFontFamily('Courier New');
  body.getFill().setTransparent();
  body.getBorder().setTransparent();
  body.setTitle(T.PODS);
}

// ── Events log panel ─────────────────────────────────────

function _buildLogPanel(slide) {
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
    L.RX, L.LY, L.RW, L.LH);
  bg.getFill().setSolidFill(C.panel_bg);
  bg.getBorder().setSolidFill(C.panel_border).setWeight(1);
  bg.setTitle('kt-bg-log');

  var hdr = slide.insertTextBox('CLUSTER EVENTS  \u2014  kubectl get events --sort-by=.lastTimestamp',
    L.RX + 8, L.LY + 6, L.RW - 16, 13);
  _styleText(hdr, C.text_accent, 8, true);
  hdr.setTitle('kt-log-hdr');

  var initialLog = [
    ts() + '  INFO   Cluster initialised \u2014 ' + CLUSTER_VERSION,
    ts() + '  INFO   LoRa bridge active on worker1 (SX1262, 915 MHz)',
    ts() + '  INFO   lora-receiver serving POST /api/v1/messages',
    ts() + '  INFO   Rancher UI available on worker2:443',
    ts() + '  INFO   4/4 nodes Ready \u00B7 6/6 pods Running',
  ].join('\n');

  var body = slide.insertTextBox(initialLog,
    L.RX + 8, L.LY + 22, L.RW - 16, L.LH - 28);
  body.getText().getTextStyle()
    .setForegroundColor(C.text_dim).setFontSize(7.5).setFontFamily('Courier New');
  body.getFill().setTransparent();
  body.getBorder().setTransparent();
  body.setTitle(T.LOG);
}

// ── Buttons ───────────────────────────────────────────────

function _buildButtons(slide) {
  var gap = L.NG;
  var defs = [
    { title: T.BTN_STATUS, label: '\u25B6  Check Status',      color: C.btn_blue,  x: L.NX },
    { title: T.BTN_FAIL,   label: '\u26A1 Simulate Failure',   color: C.btn_red,   x: L.NX + L.BW + gap },
    { title: T.BTN_HEAL,   label: '\u2736  Watch Self-Heal',   color: C.btn_green, x: L.RX },
    { title: T.BTN_RESET,  label: '\u21BA  Reset',             color: C.btn_gray,  x: L.RX + L.BW + gap },
  ];

  defs.forEach(function (d) {
    var btn = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE,
      d.x, L.BY, L.BW, L.BH);
    btn.getFill().setSolidFill(d.color);
    btn.getBorder().setTransparent();
    btn.getText().setText(d.label);
    btn.getText().getTextStyle()
      .setForegroundColor('#FFFFFF').setFontSize(9).setBold(true);
    btn.getText().getParagraphStyle()
      .setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    btn.setTitle(d.title);
  });
}

// ── Internal text style helper ────────────────────────────

function _styleText(el, color, size, bold) {
  el.getText().getTextStyle()
    .setForegroundColor(color).setFontSize(size).setBold(bold);
  el.getFill().setTransparent();
  el.getBorder().setTransparent();
}
