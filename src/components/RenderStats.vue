<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue';
import {log10FromDecimalString} from '../floatexp';

const props = defineProps<{
  engine: any;
}>();

const emit = defineEmits<{
  (e: 'open-perf-panel'): void;
}>();

// --- Polled stats (reactive mirrors of Engine plain properties) ---
const fps = ref(0);
const isRendering = ref(false);
const maxIterations = ref(0);
const pendingRefActive = ref(false);
const referenceResetActive = ref(false);
const isBuildingRef = ref(false);
const dynamicValidityActive = ref(false);
const dynamicExactFallbacks = ref(-1);

const currentScaleStr = ref('2.5');

// Deep-safe log10 of a scale string: the navigator emits PLAIN decimal strings,
// which parseFloat underflows to 0 below ~1e-308 (the Z indicator then froze at 0).
function getApproximateLog10(scaleStr: string): number {
  const log = log10FromDecimalString(scaleStr ?? '');
  return Number.isFinite(log) ? log : 0;
}

const zoomMagnitude = computed(() => {
  return Math.round(getApproximateLog10(currentScaleStr.value));
});

const maxIterationsCondensed = computed(() => {
  return formatCondensedNumber(maxIterations.value);
});

function formatCondensedNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '0';
  }
  if (val < 1000) {
    return val.toString();
  }
  let suffix = '';
  let divided = val;
  if (val >= 1e9) {
    suffix = 'G';
    divided = val / 1e9;
  } else if (val >= 1e6) {
    suffix = 'M';
    divided = val / 1e6;
  } else if (val >= 1000) {
    suffix = 'k';
    divided = val / 1000;
  }

  let formatted: string;
  if (divided >= 100) {
    formatted = Math.round(divided).toString();
  } else if (divided >= 10) {
    formatted = divided.toFixed(1);
  } else {
    formatted = divided.toFixed(2);
  }

  if (formatted.includes('.')) {
    while (formatted.endsWith('0')) {
      formatted = formatted.slice(0, -1);
    }
    if (formatted.endsWith('.')) {
      formatted = formatted.slice(0, -1);
    }
  }

  return formatted.replace('.', ',') + suffix;
}

// --- Polling ---
let pollTimer: ReturnType<typeof setInterval> | null = null;

function poll() {
  const e = props.engine;
  if (!e) return;
  fps.value = e.fps ?? 0;
  isRendering.value = e.isRendering ?? false;
  maxIterations.value = e.currentMaxIterations ?? 0;
  pendingRefActive.value = e.pendingRefActive ?? false;
  referenceResetActive.value = (e.referenceResetFlashUntil ?? 0) > performance.now();
  isBuildingRef.value = pendingRefActive.value || referenceResetActive.value;
  dynamicValidityActive.value = e.lastShaderApproxFlag === 6;
  dynamicExactFallbacks.value = e.dynamicExactFallbacksApprox ?? -1;

  if (e.mandelbrotNavigator) {
    const params = e.mandelbrotNavigator.get_params() as [string, string, string, string] | undefined;
    if (params && params.length >= 3) {
      currentScaleStr.value = params[2];
    }
  }
}

onMounted(() => {
  pollTimer = setInterval(poll, 150);
});
onUnmounted(() => {
  if (pollTimer !== null) clearInterval(pollTimer);
});
</script>

<template>
  <div class="render-stats">
    <button class="stats-header" @click="emit('open-perf-panel')" title="Ouvrir le panel de performance (m)">
      <span
        class="status-dot"
        :class="isBuildingRef ? 'status-dot--reference' : (isRendering ? 'status-dot--active' : 'status-dot--idle')"
      ></span>
      <span class="stats-fps">{{ fps }} fps</span>

      <!-- Brief indicators for zoom magnitude and max iterations -->
      <span class="header-badge" title="Magnitude du zoom">
        <span class="header-badge-label">Z</span>
        <span class="header-badge-value">{{ zoomMagnitude }}</span>
      </span>
      <span class="header-badge" title="Itérations maximales">
        <span class="header-badge-label">I</span>
        <span class="header-badge-value">{{ maxIterationsCondensed }}</span>
      </span>

      <span v-if="isBuildingRef" class="stats-reference-badge">ref</span>
      <span
        v-if="dynamicValidityActive"
        class="stats-reference-badge stats-dynamic-badge"
        :title="dynamicExactFallbacks >= 0 ? `${formatCondensedNumber(dynamicExactFallbacks)} pas exacts de repli` : 'Validité dynamique active'"
      >dyn</span>
    </button>
  </div>
</template>

<style scoped>
.render-stats {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: rgba(16, 18, 24, 0.85);
  border: 1px solid var(--line);
  backdrop-filter: blur(12px);
  color: var(--ink-2);
  font-size: 0.82rem;
  font-family: var(--sans);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  user-select: none;
  letter-spacing: 0.01em;
  overflow: hidden;
  transition: box-shadow 0.25s ease;
  touch-action: manipulation;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: none;
  background: none;
  cursor: pointer;
  color: inherit;
  font: inherit;
  font-weight: 600;
  letter-spacing: inherit;
  width: 100%;
}

.stats-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.3s;
}

.status-dot--active {
  background: oklch(0.72 0.18 145);
  box-shadow: 0 0 10px oklch(0.72 0.18 145);
}

.status-dot--idle {
  background: var(--ink-4);
}

.status-dot--reference {
  background: var(--magenta);
  box-shadow: 0 0 12px var(--magenta);
  animation: reference-pulse 0.45s ease-in-out infinite alternate;
}

.stats-fps {
  font-family: var(--mono);
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  min-width: 3.2em;
}

.header-badge {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--ink-2);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 16px;
  line-height: 1;
}

.header-badge-label {
  color: var(--ink-3);
  font-weight: 600;
  opacity: 0.8;
}

.header-badge-value {
  color: var(--ink);
}

.stats-reference-badge {
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(236, 61, 122, 0.18);
  color: var(--magenta);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.stats-dynamic-badge {
  background: rgba(111, 183, 232, 0.18);
  color: #6fb7e8;
}

@keyframes reference-pulse {
  from { transform: scale(1); opacity: 0.75; }
  to { transform: scale(1.25); opacity: 1; }
}
</style>
