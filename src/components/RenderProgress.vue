<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
const props = defineProps<{ label: string; done: number; total: number; unit: string; active?: boolean }>()
const percent = computed(() => props.total > 0 ? Math.min(props.active ? 99 : 100, Math.floor(100 * props.done / props.total)) : 0)
/** Timestamped samples of `done`, kept over a sliding window so the rate follows the current phase. */
const WINDOW_MS = 15000
let samples: { t: number; done: number }[] = []
const startedAt = ref(0), now = ref(performance.now()), rate = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
function reset() { samples = []; startedAt.value = performance.now(); rate.value = 0 }
function sample() {
  const t = performance.now(); now.value = t
  const last = samples[samples.length - 1]
  if (!last || last.done !== props.done) samples.push({ t, done: props.done })
  while (samples.length > 2 && t - samples[0].t > WINDOW_MS) samples.shift()
  const first = samples[0]
  if (samples.length >= 2 && t > first.t) rate.value = Math.max(0, (props.done - first.done) / ((t - first.t) / 1000))
}
watch(() => [props.done, props.total, props.label] as const, ([done, total, label], old) => {
  // A new run: counter went backwards, the target changed, or the phase changed with a fresh counter.
  if (!old || done < old[0] || total !== old[1] || (label !== old[2] && done <= 1)) reset()
  sample()
}, { immediate: true })
watch(() => props.active, active => {
  clearInterval(timer); timer = undefined
  if (active) { reset(); sample(); timer = setInterval(sample, 500) }
}, { immediate: true })
onUnmounted(() => clearInterval(timer))
const elapsedSeconds = computed(() => (now.value - startedAt.value) / 1000)
const remainingSeconds = computed(() => props.active && props.total > 0 && rate.value > 0 ? Math.max(0, (props.total - props.done) / rate.value) : null)
function duration(s: number) {
  if (!Number.isFinite(s)) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : m > 0 ? `${m} min ${String(sec).padStart(2, '0')} s` : `${sec} s`
}
const rateText = computed(() => rate.value <= 0 ? null : rate.value >= 100 ? Math.round(rate.value).toLocaleString('fr-FR') : rate.value >= 1 ? rate.value.toFixed(1) : rate.value >= 0.01 ? rate.value.toFixed(2) : `1 / ${duration(1 / rate.value)}`)
const unitShort = computed(() => props.unit.split(' ')[0])
</script>
<template>
  <div class="render-progress" :class="{ active }" :aria-busy="active">
    <div class="bar" :class="{ indeterminate: total <= 0 && active }"><div class="fill" :style="{ width: (total > 0 ? percent : 0) + '%' }"></div>
      <span class="lab" role="status">{{ label }}</span>
      <strong v-if="total > 0" class="pct">{{ percent }} %</strong>
    </div>
    <div v-if="total > 0 || elapsedSeconds > 1" class="stats">
      <span v-if="total > 0" class="stat"><b>{{ done.toLocaleString('fr-FR') }}</b> / {{ total.toLocaleString('fr-FR') }} <i>{{ unit }}</i></span>
      <span v-if="rateText" class="stat" :title="`${unit} par seconde`"><b>{{ rateText }}</b> <i>{{ rateText.startsWith('1 /') ? unitShort : unitShort + '/s' }}</i></span>
      <span v-if="remainingSeconds !== null" class="stat" title="Temps restant estimé"><i>reste</i> <b>{{ duration(remainingSeconds) }}</b></span>
      <span v-else-if="active && total > 0" class="stat"><i>estimation…</i></span>
      <span class="stat" title="Temps écoulé"><i>écoulé</i> <b>{{ duration(elapsedSeconds) }}</b></span>
    </div>
  </div>
</template>
<style scoped>
.render-progress{margin:6px 0;font-size:11px;font-variant-numeric:tabular-nums}
.bar{position:relative;height:22px;border:1px solid var(--line,#ffffff28);border-radius:5px;background:var(--row,#ffffff0b);overflow:hidden;display:flex;align-items:center;justify-content:space-between;padding:0 8px;gap:8px}
.fill{position:absolute;inset:0;width:0;background:color-mix(in oklab,var(--accent,#60a5fa) 38%,transparent);transition:width .25s}
.active .fill{background:color-mix(in oklab,var(--accent,#60a5fa) 55%,transparent)}
.indeterminate .fill{width:35%;animation:slide 1.2s ease-in-out infinite alternate}
@keyframes slide{from{transform:translateX(-100%)}to{transform:translateX(285%)}}
.lab,.pct{position:relative;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lab{flex:1;min-width:0;font-weight:600}.pct{flex:none}
.stats{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:4px;padding:0 2px;opacity:.85;line-height:1.5}
.stat b{font-weight:600}.stat i{font-style:normal;opacity:.65}
</style>
