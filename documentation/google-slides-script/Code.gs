// ============================================================
// Code.gs — Constants, menu, and shared utilities
// Kuber-Tuber · Google Slides Live Demo Script
//
// Paste all files into Extensions > Apps Script.
// Files: Code.gs, SlideSetup.gs, Simulation.gs, ControlPanel.html (HTML)
//        LoRaSlide.gs, LoRaDemo.gs, LoRaPanel.html (HTML)
// ============================================================

// ── Cluster constants (actual build values) ───────────────

var CLUSTER_VERSION = 'v1.32.5+k3s1';

var NODES = [
  { id: 'master',  label: 'debian-master', ip: '10.0.10.94',  vlan: 10, role: 'control-plane' },
  { id: 'worker1', label: 'worker1 · LoRa', ip: '10.0.20.138', vlan: 20, role: 'worker' },
  { id: 'worker2', label: 'worker2',         ip: '10.0.20.150', vlan: 20, role: 'worker' },
  { id: 'worker3', label: 'worker3',         ip: '10.0.20.63',  vlan: 20, role: 'worker' },
];

// Real pods from the lora-receiver.yaml manifest + K3s system pods
var PODS_NORMAL = [
  { name: 'lora-receiver-7d9f8',  node: 'worker1', ns: 'lora-demo',     status: 'Running' },
  { name: 'rancher-0',            node: 'worker2', ns: 'cattle-system',  status: 'Running' },
  { name: 'coredns-6799fbcd5',    node: 'worker1', ns: 'kube-system',    status: 'Running' },
  { name: 'traefik-d7c9c5b9',     node: 'worker3', ns: 'kube-system',    status: 'Running' },
  { name: 'metrics-server-5f9c',  node: 'worker2', ns: 'kube-system',    status: 'Running' },
  { name: 'local-path-prov-2k8',  node: 'worker3', ns: 'kube-system',    status: 'Running' },
];

// ── Color palette ─────────────────────────────────────────

var C = {
  // Slide / panel backgrounds
  slide_bg:       '#0A0E1A',
  panel_bg:       '#0D1117',
  panel_border:   '#1F2937',

  // Node box states
  master_bg:      '#0D3060',   master_bdr: '#1565C0',
  healthy_bg:     '#14361E',   healthy_bdr: '#2E7D32',
  warning_bg:     '#4A2000',   warning_bdr: '#E65100',
  critical_bg:    '#3B0000',   critical_bdr: '#B71C1C',
  offline_bg:     '#181818',   offline_bdr: '#424242',

  // Text
  text_primary:   '#E0E0E0',
  text_dim:       '#90A4AE',
  text_green:     '#4CAF50',
  text_amber:     '#FF9800',
  text_red:       '#EF5350',
  text_accent:    '#00ACC1',

  // Buttons
  btn_blue:       '#1565C0',
  btn_red:        '#B71C1C',
  btn_green:      '#2E7D32',
  btn_gray:       '#37474F',
};

// Shape title constants — used to locate shapes by title
var T = {
  BG:         'kt-bg',
  TITLE:      'kt-title',
  STATUS:     'kt-status',
  NODE:       'kt-node-',    // + node.id  e.g. "kt-node-worker2"
  PODS:       'kt-pods',
  LOG:        'kt-log',
  BTN_STATUS: 'kt-btn-status',
  BTN_FAIL:   'kt-btn-fail',
  BTN_HEAL:   'kt-btn-heal',
  BTN_RESET:  'kt-btn-reset',
};

// ── Menu ──────────────────────────────────────────────────

function onOpen() {
  var ui = SlidesApp.getUi();

  // ── Kubernetes node demo ────────────────────────────────
  var k8sMenu = ui.createMenu('K8s Node Demo')
    .addItem('\u2460  Setup Demo Slide',       'setupDemoSlide')
    .addSeparator()
    .addItem('\u2461  Check Node Status',      'showNodeStatus')
    .addItem('\u2462  Simulate Node Failure',  'simulateNodeFailure')
    .addItem('\u2463  Watch Self-Healing',     'watchSelfHealing')
    .addSeparator()
    .addItem('\u21BA  Reset',                  'resetDemo')
    .addSeparator()
    .addItem('Open K8s Control Panel',         'openControlPanel');

  // ── LoRa live feed demo ─────────────────────────────────
  var loraMenu = ui.createMenu('LoRa Live Feed')
    .addItem('\u2460  Setup LoRa Slide',       'setupLoRaSlide')
    .addSeparator()
    .addItem('\u25B6  Full Demo (~3 min)',      'runFullLoRaDemo')
    .addSeparator()
    .addItem('\u2461  Event Security',         'runLoRaScenario1')
    .addItem('\u2462  Temperature Monitoring', 'runLoRaScenario2')
    .addItem('\u2463  Lift Coordination',      'runLoRaScenario3')
    .addSeparator()
    .addItem('\u21BA  Reset',                  'resetLoRaSlide')
    .addSeparator()
    .addItem('Open LoRa Control Panel',        'openLoRaPanel');

  ui.createMenu('\u26A1 Kuber-Tuber Demo')
    .addSubMenu(k8sMenu)
    .addSubMenu(loraMenu)
    .addToUi();
}

function openControlPanel() {
  var html = HtmlService.createHtmlOutputFromFile('ControlPanel')
    .setTitle('Kuber-Tuber \u00B7 K8s Demo Panel')
    .setWidth(264);
  SlidesApp.getUi().showSidebar(html);
}

function openLoRaPanel() {
  var html = HtmlService.createHtmlOutputFromFile('LoRaPanel')
    .setTitle('Kuber-Tuber \u00B7 LoRa Demo Panel')
    .setWidth(264);
  SlidesApp.getUi().showSidebar(html);
}

// ── Slide finder ──────────────────────────────────────────
// Locates the demo slide by a tag in its speaker notes.
// Falls back to the last slide in the deck.

function getDemoSlide() {
  var slides = SlidesApp.getActivePresentation().getSlides();
  for (var i = 0; i < slides.length; i++) {
    var notes = slides[i].getNotesPage().getSpeakerNotesShape().getText().asString();
    if (notes.indexOf('KUBERTUBER_DEMO') !== -1) return slides[i];
  }
  return slides[slides.length - 1];
}

// ── Shape utilities ───────────────────────────────────────

// Returns the first page element on a slide whose title matches.
function findByTitle(slide, title) {
  var els = slide.getPageElements();
  for (var i = 0; i < els.length; i++) {
    if (els[i].getTitle() === title) return els[i];
  }
  return null;
}

// Updates the status bar text and colour.
function setStatusBar(slide, text, color) {
  var el = findByTitle(slide, T.STATUS);
  if (!el) return;
  var s = el.asShape();
  s.getText().setText(text);
  s.getText().getTextStyle().setForegroundColor(color).setFontSize(9);
}

// Appends one line to the events log, keeping at most maxLines.
function appendLog(slide, line, maxLines) {
  maxLines = maxLines || 13;
  var el = findByTitle(slide, T.LOG);
  if (!el) return;
  var shape = el.asShape();
  var existing = shape.getText().asString().trim();
  var lines = existing.length > 0 ? existing.split('\n') : [];
  lines.push(line);
  if (lines.length > maxLines) lines = lines.slice(lines.length - maxLines);
  shape.getText().setText(lines.join('\n'));
  shape.getText().getTextStyle()
    .setForegroundColor(C.text_dim).setFontSize(7.5).setFontFamily('Courier New');
}

// Replaces the pod distribution table content.
function updatePodsTable(slide, pods) {
  var el = findByTitle(slide, T.PODS);
  if (!el) return;
  el.asShape().getText().setText(buildPodsText(pods));
  el.asShape().getText().getTextStyle()
    .setForegroundColor(C.text_dim).setFontSize(7.5).setFontFamily('Courier New');
}

// Formats a pod array as a monospace table string.
function buildPodsText(pods) {
  var header = padR('NAME', 22) + padR('NODE', 12) + padR('NAMESPACE', 16) + 'STATUS';
  var divider = repeat('\u2500', 62);
  var lines = [header, divider];
  pods.forEach(function (p) {
    var dot = p.status === 'Running'  ? '\u25CF '  // ●
            : p.status === 'Pending'  ? '\u25CB '  // ○
            : p.status === 'Evicted'  ? '\u2715 '  // ✕
            : '  ';
    lines.push(
      padR(p.name.slice(0, 21), 22) +
      padR(p.node, 12) +
      padR(p.ns.slice(0, 15), 16) +
      dot + p.status
    );
  });
  return lines.join('\n');
}

// ── String helpers ────────────────────────────────────────

function padR(str, len) {
  str = String(str);
  while (str.length < len) str += ' ';
  return str;
}

function repeat(char, n) {
  var s = '';
  for (var i = 0; i < n; i++) s += char;
  return s;
}

// Returns HH:MM:SS timestamp.
function ts() {
  var d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(function (v) { return String(v).padStart(2, '0'); })
    .join(':');
}
