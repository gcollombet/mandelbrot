<script setup lang="ts">
/**
 * PerformancePanel — GPU performance measurement panel.
 *
 * Representation choices (to maximize interpretability):
 *  - A horizontal STACKED BAR scaled to the frame budget: shows both the
 *    composition of GPU work (part-to-whole, at a glance) AND how much of the
 *    frame the GPU actually occupies (the faint remainder is headroom).
 *  - A SPARKLINE of the GPU-sum over time: reveals stability vs jank/spikes
 *    that a single smoothed number hides.
 *  - A LEGEND TABLE with exact ms + % per pass and an explanatory tooltip.
 *
 * Data source: polls plain fields on the Engine (same pattern as RenderStats).
 * Per-pass timing needs the optional WebGPU `timestamp-query` feature; when it
 * is unavailable (common on mobile), the panel degrades to global metrics and
 * explains the amplification fallback for measuring a single pass.
 */
import { onMounted, onUnmounted, reactive, ref, computed } from 'vue';

const props = defineProps<{ engine: any }>();
const emit = defineEmits<{ (e: 'close'): void }>();

// Fixed per-pass colors (indexed by engine PASS_SLOTS order).
const PASS_COLORS = ['#8b5cf6', '#38bdf8', '#f472b6', '#f59e0b', '#34d399', '#22d3ee', '#eab308', '#a78bfa'];

interface PassRow { key: string; label: string; help: string; ms: number; active: boolean; color: string }

const stats = reactive({
  timestampCapable: false,
  fps: 0,
  frameIntervalMs: 0,
  cpuRenderMs: 0,
  gpuSubmitMs: 0, // engine.gpuFrameTimeMs (CPU-measured submit→done wall)
  gpuSpanMs: 0,   // authoritative GPU frame time (max end − min begin)
  gpuSumMs: 0,    // Σ of measured passes (breakdown; may overlap/exceed span)
  unfinished: -1,
  active: -1,
  passes: [] as PassRow[],
});

interface Sample {
  t: number; fps: number; frameMs: number;
  gpuSpanMs: number; gpuSumMs: number; gpuSubmitMs: number; cpuMs: number;
  passMs: Record<string, number>;
}

const HISTORY_MS = 30_000;   // rolling 30-second window (of RENDERED frames)
const history = ref<Sample[]>([]);
const startedAt = Date.now();

let rafId = 0;
let lastSerial = -1;
let lastLiveMs = 0;

// Refresh the live card values from the engine (cheap scalar reads).
function readLive(e: any) {
  stats.timestampCapable = !!e.timestampCapable;
  stats.fps = e.fps ?? 0;
  stats.frameIntervalMs = e.frameIntervalMs ?? 0;
  stats.cpuRenderMs = e.cpuRenderMs ?? 0;
  stats.gpuSubmitMs = e.isRendering ? (e.gpuFrameTimeMs ?? 0) : 0;
  stats.gpuSpanMs = e.passGpuSpanMs ?? 0;
  stats.gpuSumMs = e.passGpuSumMs ?? 0;
  stats.unfinished = e.unfinishedPixelCount ?? -1;
  stats.active = e.activePixelCount ?? -1;
  const meta: { key: string; label: string; help: string }[] = e.passMeta ?? [];
  const t: Record<string, number> = e.passTimingsMs ?? {};
  const a: Record<string, boolean> = e.passActive ?? {};
  stats.passes = meta.map((m, i) => ({
    key: m.key, label: m.label, help: m.help,
    ms: t[m.key] ?? 0, active: !!a[m.key],
    color: PASS_COLORS[i % PASS_COLORS.length],
  }));
}

// One measurement per rendered frame. Trimmed relative to the NEWEST sample, so
// the window freezes when rendering stops (no ageing-out to empty at 0 fps).
function pushSample() {
  const t = Date.now() - startedAt;
  const passMs: Record<string, number> = {};
  for (const p of stats.passes) passMs[p.key] = p.active ? p.ms : 0;
  const h = history.value;
  h.push({
    t, fps: stats.fps, frameMs: stats.frameIntervalMs,
    gpuSpanMs: stats.gpuSpanMs, gpuSumMs: stats.gpuSumMs, gpuSubmitMs: stats.gpuSubmitMs, cpuMs: stats.cpuRenderMs,
    passMs,
  });
  const cutoff = t - HISTORY_MS;
  while (h.length > 1 && h[0].t < cutoff) h.shift();
  history.value = h.slice();
}

// Frame-driven sampling: poll at display rate but only record when the engine's
// frameSerial advanced (a real frame was submitted). When idle, the serial stops
// → no new samples → the histogram freezes. Cards still refresh (fps decays to 0).
function tick() {
  const e = props.engine;
  if (e) {
    const serial = e.frameSerial ?? 0;
    const now = performance.now();
    if (serial !== lastSerial) {
      lastSerial = serial;
      readLive(e);
      pushSample();
      lastLiveMs = now;
    } else if (now - lastLiveMs > 250) {
      readLive(e);
      lastLiveMs = now;
    }
  }
  rafId = requestAnimationFrame(tick);
}

onMounted(() => { rafId = requestAnimationFrame(tick); });
onUnmounted(() => { if (rafId) cancelAnimationFrame(rafId); });

// Aggregate stats over the visible window.
const windowStats = computed(() => {
  const g = history.value.map(s => s.gpuSumMs).filter(v => v > 0);
  if (!g.length) return { avg: 0, max: 0, span: 0 };
  return {
    avg: g.reduce((a, b) => a + b, 0) / g.length,
    max: Math.max(...g),
    span: history.value.length ? (history.value[history.value.length - 1].t - history.value[0].t) / 1000 : 0,
  };
});

// ── 30 s averages (for the duplicated "moyenne" breakdown) ──
// Per-pass mean over the window, counting 0 for frames the pass didn't run →
// the AMORTIZED composition (occasional passes like merge show their true share).
const passAvg = computed<Record<string, number>>(() => {
  const h = history.value;
  const acc: Record<string, number> = {};
  if (!h.length) return acc;
  for (const s of h) for (const k in s.passMs) acc[k] = (acc[k] ?? 0) + s.passMs[k];
  for (const k in acc) acc[k] /= h.length;
  return acc;
});
const avgFrameMs = computed(() => {
  const g = history.value.map(s => s.frameMs).filter(v => v > 0);
  return g.length ? g.reduce((a, b) => a + b, 0) / g.length : 0;
});
const passesAvgSorted = computed(() =>
  stats.passes
    .map(p => ({ ...p, ms: passAvg.value[p.key] ?? 0 }))
    .filter(p => p.ms > 0.0001)
    .sort((x, y) => y.ms - x.ms),
);
const passSumAvg = computed(() => passesAvgSorted.value.reduce((s, p) => s + p.ms, 0));
const barMaxAvg = computed(() => Math.max(avgFrameMs.value, passSumAvg.value, 0.001));
const idleMsAvg = computed(() => Math.max(0, barMaxAvg.value - passSumAvg.value));
function pctAvg(ms: number): number { return (ms / barMaxAvg.value) * 100; }

// Generic mini-sparkline path (self-normalized to its own max).
function sparkPath(data: number[]): string {
  if (data.length < 2) return '';
  const w = 100, h = 20, max = Math.max(...data, 0.001), n = data.length;
  return 'M' + data.map((v, i) => `${(i / (n - 1) * w).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' L');
}
// One sparkline per global metric → history on ALL metrics.
const seriesPaths = computed(() => ({
  fps: sparkPath(history.value.map(s => s.fps)),
  frame: sparkPath(history.value.map(s => s.frameMs)),
  gpuSpan: sparkPath(history.value.map(s => s.gpuSpanMs)),
  gpuSum: sparkPath(history.value.map(s => s.gpuSumMs)),
  cpu: sparkPath(history.value.map(s => s.cpuMs)),
}));

// Main history graph = per-pass times STACKED over the frame history (area
// chart). Each band's top edge is the running cumulative including that pass;
// the total (stack height) is the frame's GPU cost. y is normalized to the
// window's peak total.
const STACK_W = 100, STACK_H = 64;
const stackedAreas = computed(() => {
  const h = history.value;
  const passes = stats.passes;
  if (h.length < 2 || !passes.length) return { bands: [] as { key: string; color: string; path: string }[], maxTotal: 0 };
  const keys = passes.map(p => p.key);
  let maxTotal = 0.001;
  for (const s of h) {
    let tot = 0;
    for (const k of keys) tot += s.passMs[k] ?? 0;
    if (tot > maxTotal) maxTotal = tot;
  }
  const n = h.length;
  const x = (i: number) => (i / (n - 1)) * STACK_W;
  const y = (v: number) => STACK_H - (v / maxTotal) * STACK_H;
  const bands = passes.map((p, ki) => {
    const top: string[] = [];
    const bottom: string[] = [];
    for (let i = 0; i < n; i++) {
      let below = 0;
      for (let j = 0; j < ki; j++) below += h[i].passMs[keys[j]] ?? 0;
      const cur = h[i].passMs[p.key] ?? 0;
      top.push(`${x(i).toFixed(1)},${y(below + cur).toFixed(1)}`);
      bottom.push(`${x(i).toFixed(1)},${y(below).toFixed(1)}`);
    }
    bottom.reverse();
    return { key: p.key, color: p.color, path: `M${top.join(' L')} L${bottom.join(' L')} Z` };
  });
  return { bands, maxTotal };
});

function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function exportCsv() {
  const keys = stats.passes.map(p => p.key);
  const head = ['t_ms', 'fps', 'frame_ms', 'gpu_span_ms', 'gpu_sum_ms', 'gpu_submit_ms', 'cpu_ms', ...keys.map(k => `${k}_ms`)];
  const lines = [head.join(',')];
  for (const s of history.value) {
    const row = [
      s.t.toFixed(0), s.fps, s.frameMs.toFixed(3),
      s.gpuSpanMs.toFixed(3), s.gpuSumMs.toFixed(3), s.gpuSubmitMs.toFixed(3), s.cpuMs.toFixed(3),
      ...keys.map(k => (s.passMs[k] ?? 0).toFixed(3)),
    ];
    lines.push(row.join(','));
  }
  download(`mandelbrot-perf-${stamp()}.csv`, 'text/csv', lines.join('\n'));
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    windowSeconds: HISTORY_MS / 1000,
    timestampCapable: stats.timestampCapable,
    passes: stats.passes.map(p => ({ key: p.key, label: p.label })),
    samples: history.value,
  };
  download(`mandelbrot-perf-${stamp()}.json`, 'application/json', JSON.stringify(payload, null, 2));
}

// Passes that actually ran in the last measured frame, largest first.
const shownPasses = computed(() =>
  stats.passes.filter(p => p.active && p.ms > 0).sort((x, y) => y.ms - x.ms),
);
const passSum = computed(() => shownPasses.value.reduce((s, p) => s + p.ms, 0));

// Bar is scaled to the frame budget (interval), so the remainder = idle/other
// headroom. Falls back to the GPU sum when no interval is available yet.
const barMax = computed(() => Math.max(stats.frameIntervalMs, passSum.value, stats.gpuSumMs, 0.001));
const idleMs = computed(() => Math.max(0, barMax.value - passSum.value));

function pct(ms: number): number { return (ms / barMax.value) * 100; }
function share(ms: number): number { return passSum.value > 0 ? (ms / passSum.value) * 100 : 0; }
function fmt(ms: number): string { return ms >= 10 ? ms.toFixed(1) : ms.toFixed(2); }

</script>

<template>
  <div class="perf-panel">
    <div class="perf-header">
      <span class="perf-title">Mesures GPU</span>
      <button class="perf-close" type="button" aria-label="Fermer" @click="emit('close')">✕</button>
    </div>

    <!-- Global metric cards, each with its own 30 s sparkline -->
    <div class="perf-cards">
      <div class="perf-card" title="Images par seconde effectivement rendues (dérivé de l'intervalle réel entre frames rendues).">
        <div class="pc-val">{{ stats.fps }}</div>
        <div class="pc-lbl">FPS</div>
        <svg class="pc-spark" viewBox="0 0 100 20" preserveAspectRatio="none"><path :d="seriesPaths.fps" fill="none" stroke="#34d399" stroke-width="1" vector-effect="non-scaling-stroke" /></svg>
      </div>
      <div class="perf-card" title="Temps réel entre deux frames = le vrai budget par image. C'est ce que ressent l'utilisateur.">
        <div class="pc-val">{{ fmt(stats.frameIntervalMs) }}<span class="pc-u">ms</span></div>
        <div class="pc-lbl">Intervalle frame</div>
        <svg class="pc-spark" viewBox="0 0 100 20" preserveAspectRatio="none"><path :d="seriesPaths.frame" fill="none" stroke="#f59e0b" stroke-width="1" vector-effect="non-scaling-stroke" /></svg>
      </div>
      <div class="perf-card accent" title="Temps GPU RÉEL de la frame = dernier end − premier begin des passes (timeline GPU). C'est le total autoritaire : les passes tournent séquentiellement, donc ce span les englobe (copies inter-passes comprises).">
        <div class="pc-val">{{ fmt(stats.gpuSpanMs) }}<span class="pc-u">ms</span></div>
        <div class="pc-lbl">GPU frame (span)</div>
        <svg class="pc-spark" viewBox="0 0 100 20" preserveAspectRatio="none"><path :d="seriesPaths.gpuSpan" fill="none" stroke="#38bdf8" stroke-width="1" vector-effect="non-scaling-stroke" /></svg>
      </div>
      <div class="perf-card" title="Σ des durées par passe, mesurées comme l'écart entre fins de passe consécutives (partition de la timeline GPU). Sum ≈ span par construction. Toute copie/clear inter-passe tombe dans la passe suivante.">
        <div class="pc-val">{{ fmt(stats.gpuSumMs) }}<span class="pc-u">ms</span></div>
        <div class="pc-lbl">Σ passes</div>
        <svg class="pc-spark" viewBox="0 0 100 20" preserveAspectRatio="none"><path :d="seriesPaths.gpuSum" fill="none" stroke="#818cf8" stroke-width="1" vector-effect="non-scaling-stroke" /></svg>
      </div>
      <div class="perf-card" title="Durée d'exécution du JS de render() côté CPU (construction des passes + submit). Si élevé, le CPU est le goulot, pas le GPU.">
        <div class="pc-val">{{ fmt(stats.cpuRenderMs) }}<span class="pc-u">ms</span></div>
        <div class="pc-lbl">CPU render</div>
        <svg class="pc-spark" viewBox="0 0 100 20" preserveAspectRatio="none"><path :d="seriesPaths.cpu" fill="none" stroke="#c084fc" stroke-width="1" vector-effect="non-scaling-stroke" /></svg>
      </div>
    </div>

    <!-- Per-pass breakdown (needs timestamp-query) -->
    <template v-if="stats.timestampCapable">
      <div class="perf-sub">Répartition GPU — instantané <span class="perf-hint">(à l'échelle du budget frame — gris = marge/idle)</span></div>
      <div class="perf-bar" role="img" aria-label="Répartition instantanée du temps GPU par passe">
        <div
          v-for="p in shownPasses"
          :key="p.key"
          class="perf-seg"
          :style="{ width: pct(p.ms) + '%', background: p.color }"
          :title="`${p.label} — ${fmt(p.ms)} ms (${share(p.ms).toFixed(0)}% du GPU)`"
        ></div>
        <div v-if="idleMs > 0" class="perf-seg idle" :style="{ width: pct(idleMs) + '%' }"
             :title="`Marge / idle — ${fmt(idleMs)} ms`"></div>
      </div>
      <div class="perf-scale"><span>0</span><span>{{ fmt(barMax) }} ms</span></div>

      <div class="perf-sub">Répartition GPU — moyenne 30 s <span class="perf-hint">(coût amorti par passe)</span></div>
      <div class="perf-bar" role="img" aria-label="Répartition moyenne 30 s du temps GPU par passe">
        <div
          v-for="p in passesAvgSorted"
          :key="'avg-' + p.key"
          class="perf-seg"
          :style="{ width: pctAvg(p.ms) + '%', background: p.color }"
          :title="`${p.label} — ${fmt(p.ms)} ms (moy 30 s)`"
        ></div>
        <div v-if="idleMsAvg > 0" class="perf-seg idle" :style="{ width: pctAvg(idleMsAvg) + '%' }"
             :title="`Marge / idle — ${fmt(idleMsAvg)} ms`"></div>
      </div>
      <div class="perf-scale"><span>0</span><span>{{ fmt(barMaxAvg) }} ms</span></div>

      <!-- Legend: exact values, instantané vs moyenne 30 s -->
      <table class="perf-legend">
        <thead>
          <tr><th></th><th></th><th>actuel</th><th>moy 30 s</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in stats.passes" :key="p.key" :class="{ inactive: !p.active }" :title="p.help">
            <td class="pl-sw"><span :style="{ background: p.color }"></span></td>
            <td class="pl-name">{{ p.label }}</td>
            <td class="pl-ms">{{ p.active ? fmt(p.ms) + ' ms' : '—' }}</td>
            <td class="pl-ms">{{ fmt(passAvg[p.key] ?? 0) }} ms</td>
          </tr>
        </tbody>
      </table>

      <!-- Per-pass STACKED history over the 30 s frame window -->
      <div class="perf-sub">
        Historique empilé par passe
        <span class="perf-hint">— pic {{ fmt(stackedAreas.maxTotal) }} ms · {{ windowStats.span.toFixed(0) }} s</span>
      </div>
      <svg class="perf-stack" viewBox="0 0 100 64" preserveAspectRatio="none">
        <path
          v-for="b in stackedAreas.bands"
          :key="b.key"
          :d="b.path"
          :fill="b.color"
          fill-opacity="0.82"
        />
      </svg>
    </template>

    <!-- Degraded mode: timestamp-query unavailable -->
    <div v-else class="perf-notice">
      <strong>Timing par passe indisponible</strong> — cet appareil n'expose pas
      <code>timestamp-query</code> (fréquent sur mobile/Safari). Les métriques globales
      ci-dessus restent valides. Pour isoler le coût d'une passe sans barrière,
      utilise l'<em>amplification</em> : boucler la passe N fois et diviser le delta
      du temps GPU par N.
    </div>

    <div class="perf-export">
      <span class="pe-count">{{ history.length }} échant. / 30 s</span>
      <button class="pe-btn" type="button" :disabled="history.length < 2" @click="exportCsv">Export CSV</button>
      <button class="pe-btn" type="button" :disabled="history.length < 2" @click="exportJson">JSON</button>
    </div>

    <div class="perf-foot">
      <span v-if="stats.unfinished >= 0" title="Pixels non encore convergés (itération en cours).">px non finis : {{ stats.unfinished.toLocaleString() }}</span>
      <span v-if="stats.active >= 0" title="Pixels réellement itérés lors du dernier dispatch.">actifs : {{ stats.active.toLocaleString() }}</span>
    </div>
  </div>
</template>

<style scoped>
.perf-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-variant-numeric: tabular-nums;
  /* Self-contained dark card so it stays readable on ANY app theme (incl. white). */
  color: #e5e7eb;
  background: rgba(17, 20, 28, 0.92);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
  padding: 12px 13px;
  font-family: ui-monospace, 'SF Mono', 'Roboto Mono', Menlo, monospace;
}
.perf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}
.perf-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.9;
}
.perf-close {
  appearance: none;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #e5e7eb;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.perf-close:hover { background: rgba(255, 255, 255, 0.16); }
.perf-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(74px, 1fr));
  gap: 6px;
}
.perf-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 7px 8px;
  text-align: center;
}
.perf-card.accent { border-color: rgba(56, 189, 248, 0.5); background: rgba(56, 189, 248, 0.08); }
.pc-val { font-size: 17px; font-weight: 650; line-height: 1.1; }
.pc-u { font-size: 10px; font-weight: 400; opacity: 0.6; margin-left: 1px; }
.pc-lbl { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.03em; opacity: 0.62; margin-top: 2px; }
.pc-spark { width: 100%; height: 13px; display: block; margin-top: 4px; opacity: 0.85; }

.perf-sub { font-size: 11px; font-weight: 600; opacity: 0.85; margin-top: 2px; }
.perf-hint { font-weight: 400; opacity: 0.55; font-size: 10px; }

.perf-bar {
  display: flex;
  width: 100%;
  height: 18px;
  border-radius: 5px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
}
.perf-seg { height: 100%; min-width: 1px; transition: width 0.2s ease; }
.perf-seg.idle { background: repeating-linear-gradient(45deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.02) 4px, rgba(255,255,255,0.02) 8px); }
.perf-scale { display: flex; justify-content: space-between; font-size: 9px; opacity: 0.5; margin-top: -2px; }

.perf-legend { width: 100%; border-collapse: collapse; font-size: 11px; }
.perf-legend thead th { font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; opacity: 0.45; text-align: right; padding: 0 2px 3px; }
.perf-legend tr { border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.perf-legend tr.inactive { opacity: 0.38; }
.perf-legend td { padding: 3px 2px; }
.pl-sw span { display: inline-block; width: 10px; height: 10px; border-radius: 3px; vertical-align: middle; }
.pl-name { width: 100%; }
.pl-ms { text-align: right; white-space: nowrap; opacity: 0.9; }
.pl-pct { text-align: right; white-space: nowrap; opacity: 0.55; width: 34px; }

.perf-stack {
  width: 100%;
  height: 66px;
  display: block;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
}

.perf-notice {
  font-size: 11px;
  line-height: 1.5;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  padding: 8px 10px;
}
.perf-notice code { background: rgba(255, 255, 255, 0.1); padding: 0 3px; border-radius: 3px; }

.perf-export {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 8px;
}
.pe-count { font-size: 10px; opacity: 0.55; margin-right: auto; }
.pe-btn {
  appearance: none;
  border: 1px solid rgba(56, 189, 248, 0.4);
  background: rgba(56, 189, 248, 0.12);
  color: #bae6fd;
  border-radius: 6px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.pe-btn:hover:not(:disabled) { background: rgba(56, 189, 248, 0.22); }
.pe-btn:disabled { opacity: 0.4; cursor: default; }

.perf-foot { display: flex; gap: 12px; font-size: 10px; opacity: 0.55; flex-wrap: wrap; margin-top: 2px; }
</style>
