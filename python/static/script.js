// ── Posture label map ─────────────────────────────────────
const LABELS = {
  GOOD:              { label: "Good Posture ✓",        cls: "good"    },
  MILD_SLOUCH:       { label: "Mild Slouch",            cls: "mild"    },
  SEVERE_SLOUCH:     { label: "Severe Slouch !!",       cls: "severe"  },
  LEANING_BACK:      { label: "Leaning Back",           cls: "mild"    },
  LATERAL_LEAN:      { label: "Lateral Lean",           cls: "mild"    },
  SEVERE_LATERAL:    { label: "Severe Lateral !!",      cls: "severe"  },
  OVER_SHOULDER:     { label: "Over Shoulder !!!",      cls: "severe"  },
  SENSOR_MISPLACED:  { label: "Check Sensor Placement", cls: "neutral" },
};

const COLLECT_LABELS = [
  "GOOD", "MILD_SLOUCH", "SEVERE_SLOUCH",
  "LEANING_BACK", "LATERAL_LEAN", "OVER_SHOULDER"
];

// Per-label counts — driven entirely from CSV row count sent by server
let labelCounts = {};

// ── Color helpers ─────────────────────────────────────────
function devColor(dev, valid) {
  if (!valid) return "#1e293b";
  if (dev >  60) return "#1e3a8a";
  if (dev >  25) return "#1d4ed8";
  if (dev >  10) return "#0369a1";
  if (dev > -10) return "#065f46";
  if (dev > -30) return "#b45309";
  if (dev > -60) return "#b91c1c";
  return "#7f1d1d";
}

function distColor(dist, valid) {
  if (!valid || dist === 0) return "#1e293b";
  const t = Math.max(0, Math.min(1, (dist - 50) / 550));
  const r = Math.round(10  + (30  - 10)  * t);
  const g = Math.round(200 + (50  - 200) * t);
  const b = Math.round(80  + (150 - 80)  * t);
  return `rgb(${r},${g},${b})`;
}

// ── Grid builder ──────────────────────────────────────────
function buildGrid(id, values, colorFn, validArr) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";
  for (let i = 0; i < 64; i++) {
    const z = document.createElement("div");
    z.className = "zone";
    const valid = validArr ? !!validArr[i] : values[i] > 0;
    z.style.background = colorFn(values[i], valid);
    z.textContent = valid ? values[i] : "×";
    el.appendChild(z);
  }
}

// ── CSV counter ───────────────────────────────────────────
function updateCounter(total) {
  const el = document.getElementById("csv-count");
  if (el) el.textContent = total;
}

// ── Per-label pill counters ───────────────────────────────
function updateLabelCounts() {
  const el = document.getElementById("label-counts");
  if (!el) return;
  el.innerHTML = COLLECT_LABELS.map(lbl => {
    const count = labelCounts[lbl] || 0;
    const pretty = lbl.replace("_", " ");
    return `<div class="lc-pill">${pretty} <b>${count}</b></div>`;
  }).join("");
}

// ── Calibrate button ──────────────────────────────────────
function startCalibration() {
  const btn = document.getElementById("cal-btn");
  btn.disabled    = true;
  btn.textContent = "Calibrating...";
  fetch("/api/calibrate", { method: "POST" })
    .then(r => r.json())
    .catch(() => {
      btn.disabled    = false;
      btn.textContent = "Recalibrate";
    });
}

// ── Collect button ────────────────────────────────────────
function collect(label) {
  const statusEl = document.getElementById("collect-status");
  statusEl.className   = "collect-status";
  statusEl.textContent = `Saving ${label}...`;

  fetch("/api/save-posture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label })
  })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        statusEl.className   = "collect-status ok";
        statusEl.textContent = `✓ Saved as ${label} — total: ${d.csv_count} rows`;
        updateCounter(d.csv_count);
        labelCounts[label] = (labelCounts[label] || 0) + 1;
        updateLabelCounts();
      } else {
        statusEl.className   = "collect-status err";
        statusEl.textContent = `✗ Error: ${d.error}`;
      }
      // Clear status after 3s
      setTimeout(() => { statusEl.textContent = ""; statusEl.className = "collect-status"; }, 4000);
    })
    .catch(err => {
      statusEl.className   = "collect-status err";
      statusEl.textContent = `✗ Network error: ${err}`;
    });
}

// ── Status indicator ──────────────────────────────────────
function applyStatus(status) {
  const dot  = document.getElementById("dot");
  const stxt = document.getElementById("status-text");
  const btn  = document.getElementById("cal-btn");

  if (status === "live") {
    dot.className    = "dot dot-live";
    stxt.textContent = "Live — receiving data";
    btn.disabled     = false;
    btn.textContent  = "Recalibrate";
  } else if (status === "calibrating") {
    dot.className    = "dot dot-cal";
    stxt.textContent = "Calibrating...";
    btn.disabled     = true;
    btn.textContent  = "Calibrating...";
  } else {
    dot.className    = "dot dot-wait";
    stxt.textContent = "Waiting for sensor...";
  }
}

// ── Calibration grid ──────────────────────────────────────
function applyCalibration(cal) {
  if (!cal) return;
  buildGrid("cal-grid", cal.baseline, distColor, cal.valid);

  const vals       = cal.baseline.filter((v, i) => cal.valid[i] && v > 0);
  const validCount = cal.valid.reduce((a, v) => a + v, 0);
  if (vals.length === 0) return;

  document.getElementById("cal-stats").innerHTML = `
    <div class="stat"><span>Frames</span><b>${cal.frames}</b></div>
    <div class="stat"><span>Valid Zones</span><b>${validCount}/64</b></div>
    <div class="stat"><span>Min</span><b>${Math.min(...vals)} mm</b></div>
    <div class="stat"><span>Max</span><b>${Math.max(...vals)} mm</b></div>
    <div class="stat"><span>Mean</span>
      <b>${Math.round(vals.reduce((a,b) => a+b,0) / vals.length)} mm</b>
    </div>
  `;
}

// ── WebSocket ─────────────────────────────────────────────
let ws;

function connectWS() {
  ws = new WebSocket(`ws://${location.host}/ws`);

  ws.onopen = () => console.log("[WS] Connected");

  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);

    applyStatus(d.status);

    if (typeof d.csv_count === "number") updateCounter(d.csv_count);
    if (d.calibration) applyCalibration(d.calibration);

    if ((d.type === "frame" || d.type === "init") && d.frame) {
      const f         = d.frame;
      const validLive = f.grid.map(v => v > 0);

      buildGrid("live-grid", f.dev, devColor, validLive);

      const p     = LABELS[f.posture] || { label: f.posture, cls: "neutral" };
      const badge = document.getElementById("posture-badge");
      badge.textContent = p.label;
      badge.className   = "badge " + p.cls;

      const fmt = v => (v >= 0 ? "+" : "") + v + " mm";
      document.getElementById("vert").textContent    = fmt(f.vert);
      document.getElementById("horiz").textContent   = fmt(f.horiz);
      document.getElementById("mean").textContent    = fmt(f.mean);
      document.getElementById("missing").textContent = f.missing;
    }
  };

  ws.onclose = () => {
    console.log("[WS] Lost — retrying in 2s");
    setTimeout(connectWS, 2000);
  };

  ws.onerror = err => console.error("[WS] Error", err);
}

// Initialise label counters and connect
updateLabelCounts();
connectWS();