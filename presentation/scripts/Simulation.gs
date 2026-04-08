// ============================================================
// Simulation.gs — Three-phase live demo sequence
// ============================================================
//
// Phase 1 — showNodeStatus()
//   Refreshes all node boxes to healthy state and polls the
//   pod table and event log with realistic initial output.
//
// Phase 2 — simulateNodeFailure()
//   Applies simulated CPU/RAM load to worker2, escalating
//   through warning → critical → offline. Pods on worker2
//   are marked as Evicted in the table.
//
// Phase 3 — watchSelfHealing()
//   Shows K3s rescheduling the evicted pods to surviving
//   workers, cycling through Pending → Running states.
//   Status bar confirms full recovery.
//
// resetDemo()
//   Returns every shape to its initial state.
//
// Run order: ① → ② → ③ → (repeat from ↺)
// ============================================================

// ── Phase 1: Check Node Status ────────────────────────────

function showNodeStatus() {
  var slide = getDemoSlide();

  // Restore all four nodes to healthy baseline
  _setNodeState(slide, 'master',  'healthy', 8,  29);
  _setNodeState(slide, 'worker1', 'healthy', 14, 41);
  _setNodeState(slide, 'worker2', 'healthy', 11, 37);
  _setNodeState(slide, 'worker3', 'healthy', 9,  33);

  updatePodsTable(slide, PODS_NORMAL);

  setStatusBar(slide,
    '\u25CF  All systems nominal  \u2502  4/4 nodes Ready  \u2502  6 pods Running',
    C.text_green);

  appendLog(slide, ts() + '  INFO   kubectl get nodes \u2014 4/4 Ready');
  appendLog(slide, ts() + '  INFO   NODE            STATUS   ROLE            IP');
  appendLog(slide, ts() + '  INFO   debian-master   Ready    control-plane   10.0.10.94');
  appendLog(slide, ts() + '  INFO   worker1         Ready    worker          10.0.20.138');
  appendLog(slide, ts() + '  INFO   worker2         Ready    worker          10.0.20.150');
  appendLog(slide, ts() + '  INFO   worker3         Ready    worker          10.0.20.63');
  appendLog(slide, ts() + '  INFO   6/6 pods Running \u00B7 0 restarts \u00B7 uptime 14d');
}

// ── Phase 2: Simulate Node Failure ───────────────────────

function simulateNodeFailure() {
  var slide = getDemoSlide();

  // 2a — Ramp up CPU/RAM on worker2 (simulated stress test)
  appendLog(slide, ts() + '  INFO   Applying synthetic load to worker2...');
  _setNodeState(slide, 'worker2', 'healthy', 58, 64);
  Utilities.sleep(900);

  _setNodeState(slide, 'worker2', 'healthy', 79, 83);
  appendLog(slide, ts() + '  WARN   worker2 \u2014 CPU 79%  RAM 83%  pressure rising');
  Utilities.sleep(900);

  _setNodeState(slide, 'worker2', 'warning', 96, 91);
  appendLog(slide, ts() + '  WARN   worker2 \u2014 CPU 96%  OOMKill risk  \u26A0 MemoryPressure');
  Utilities.sleep(1100);

  // 2b — Node goes unresponsive; kubelet misses heartbeats
  _setNodeState(slide, 'worker2', 'critical', 100, 100);
  setStatusBar(slide,
    '\u26A0  Degraded  \u2502  3/4 nodes Ready  \u2502  worker2 NotReady',
    C.text_amber);

  appendLog(slide, ts() + '  ERROR  worker2 \u2014 kubelet heartbeat missed (1/3)');
  Utilities.sleep(700);
  appendLog(slide, ts() + '  ERROR  worker2 \u2014 kubelet heartbeat missed (2/3)');
  Utilities.sleep(700);
  appendLog(slide, ts() + '  ERROR  worker2 \u2014 kubelet heartbeat missed (3/3) \u2014 NodeNotReady');
  Utilities.sleep(600);

  // 2c — Taint applied; pods evicted
  _setNodeState(slide, 'worker2', 'offline', 0, 0);
  appendLog(slide, ts() + '  WARN   Taint applied: node.kubernetes.io/not-ready:NoExecute');
  Utilities.sleep(450);
  appendLog(slide, ts() + '  INFO   Evicting 2 pod(s) from worker2...');

  // Mark worker2 pods as Evicted in the table
  var evicting = PODS_NORMAL.map(function (p) {
    if (p.node === 'worker2') return { name: p.name, node: 'worker2', ns: p.ns, status: 'Evicted' };
    return p;
  });
  updatePodsTable(slide, evicting);

  Utilities.sleep(350);
  appendLog(slide, ts() + '  INFO   rancher-0          \u2192 Terminating');
  Utilities.sleep(350);
  appendLog(slide, ts() + '  INFO   metrics-server-5f9c \u2192 Terminating');
}

// ── Phase 3: Watch Self-Healing ───────────────────────────

function watchSelfHealing() {
  var slide = getDemoSlide();

  // rancher-0 → worker3  (StatefulSet; Rancher prefers a dedicated node)
  // metrics-server → worker1  (Deployment; co-locate with LoRa worker)
  var RESCHEDULE = {
    'rancher-0':           'worker3',
    'metrics-server-5f9c': 'worker1',
  };

  appendLog(slide, ts() + '  INFO   Scheduler selecting replacement nodes...');
  Utilities.sleep(700);

  // Show pods in Pending state on new nodes
  var pending = PODS_NORMAL.map(function (p) {
    var target = RESCHEDULE[p.name];
    if (target) return { name: p.name, node: target, ns: p.ns, status: 'Pending' };
    return p;
  });
  updatePodsTable(slide, pending);
  appendLog(slide, ts() + '  INFO   rancher-0           \u2192 Pending  (worker3)');
  Utilities.sleep(950);
  appendLog(slide, ts() + '  INFO   metrics-server-5f9c \u2192 Pending  (worker1)');
  Utilities.sleep(1100);

  // Pods come up Running on new nodes
  var healed = PODS_NORMAL.map(function (p) {
    var target = RESCHEDULE[p.name];
    if (target) return { name: p.name, node: target, ns: p.ns, status: 'Running' };
    return p;
  });
  updatePodsTable(slide, healed);

  appendLog(slide, ts() + '  INFO   rancher-0           \u2192 Running  (worker3)  \u2713');
  Utilities.sleep(450);
  appendLog(slide, ts() + '  INFO   metrics-server-5f9c \u2192 Running  (worker1)  \u2713');
  Utilities.sleep(350);

  setStatusBar(slide,
    '\u2713  Self-healed  \u2502  3/4 nodes Ready  \u2502  6/6 pods Running  \u2502  worker2 isolated',
    C.text_green);

  appendLog(slide, ts() + '  INFO   \u2500\u2500 Self-healing complete \u2014 2 pods rescheduled in ~18s \u2500\u2500');
}

// ── Reset ─────────────────────────────────────────────────

function resetDemo() {
  var slide = getDemoSlide();

  _setNodeState(slide, 'master',  'healthy', 8,  29);
  _setNodeState(slide, 'worker1', 'healthy', 14, 41);
  _setNodeState(slide, 'worker2', 'healthy', 11, 37);
  _setNodeState(slide, 'worker3', 'healthy', 9,  33);

  updatePodsTable(slide, PODS_NORMAL);

  setStatusBar(slide,
    '\u25CF  All systems nominal  \u2502  4/4 nodes Ready  \u2502  6 pods Running',
    C.text_green);

  var el = findByTitle(slide, T.LOG);
  if (el) {
    el.asShape().getText().setText(
      ts() + '  INFO   Demo reset \u2014 cluster restored to initial state\n' +
      ts() + '  INFO   4/4 nodes Ready \u00B7 6/6 pods Running \u00B7 ready to run again'
    );
    el.asShape().getText().getTextStyle()
      .setForegroundColor(C.text_dim).setFontSize(7.5).setFontFamily('Courier New');
  }
}

// ── setNodeState ──────────────────────────────────────────
// Updates a node box fill, border, and text content.
//
// status: 'healthy' | 'warning' | 'critical' | 'offline'
// cpu, ram: integer percentages 0–100 (ignored when offline)

function _setNodeState(slide, nodeId, status, cpu, ram) {
  var node = null;
  for (var i = 0; i < NODES.length; i++) {
    if (NODES[i].id === nodeId) { node = NODES[i]; break; }
  }
  if (!node) return;

  var el = findByTitle(slide, T.NODE + nodeId);
  if (!el) return;
  var shape = el.asShape();

  var isMaster = nodeId === 'master';
  var cfgMap = {
    healthy:  {
      bg:  isMaster ? C.master_bg  : C.healthy_bg,
      bdr: isMaster ? C.master_bdr : C.healthy_bdr,
      dot: '\u25CF', label: 'Ready',
    },
    warning:  { bg: C.warning_bg,  bdr: C.warning_bdr,  dot: '\u26A0', label: 'NotReady' },
    critical: { bg: C.critical_bg, bdr: C.critical_bdr, dot: '\u2716', label: 'Failed'   },
    offline:  { bg: C.offline_bg,  bdr: C.offline_bdr,  dot: '\u25CB', label: 'Offline'  },
  };
  var cfg = cfgMap[status] || cfgMap.healthy;

  shape.getFill().setSolidFill(cfg.bg);
  shape.getBorder().setSolidFill(cfg.bdr).setWeight(1.5);

  var cpuStr = status === 'offline' ? 'N/A    ' : padR(cpu + '%', 7);
  var ramStr = status === 'offline' ? 'N/A' : ram + '%';

  var roleLabel = node.role === 'control-plane' ? 'K3s control plane' : 'K3s worker node';
  var lines = [
    node.label,
    node.ip + '  \u2502  VLAN ' + node.vlan,
    roleLabel,
    cfg.dot + '  ' + cfg.label,
    'CPU ' + cpuStr + '  RAM ' + ramStr,
  ];

  shape.getText().setText(lines.join('\n'));
  shape.getText().getTextStyle()
    .setForegroundColor(C.text_primary).setFontSize(8).setFontFamily('Courier New');
}
