<script setup lang="ts">
import { computed, ref } from 'vue'

type Phase = 'detected' | 'critical'

const phase = ref<Phase>('critical')
const log10CMax = ref(-5)
const targetRatio = ref(0.95)

const cMax = computed(() => Math.pow(10, log10CMax.value))

function returnMajorant(r: number, selectedPhase: Phase): number {
  let rho = r
  const orbit = selectedPhase === 'critical' ? [0, -1] : [-1, 0]
  for (const z of orbit) {
    rho = 2 * Math.abs(z) * rho + rho * rho + cMax.value
  }
  return rho
}

function largestCertifiedRadius(selectedPhase: Phase, ratio: number): number | null {
  const maxR = 0.7
  const samples = 6000
  let good: number | null = null
  let badAfterGood: number | null = null

  for (let i = 0; i <= samples; i++) {
    const r = (i / samples) * maxR
    const passes = returnMajorant(r, selectedPhase) <= ratio * r
    if (passes) {
      good = r
      badAfterGood = null
    } else if (good !== null) {
      badAfterGood = r
      break
    }
  }
  if (good === null) return null
  if (badAfterGood === null) return good

  let lo = good
  let hi = badAfterGood
  for (let i = 0; i < 70; i++) {
    const mid = 0.5 * (lo + hi)
    if (returnMajorant(mid, selectedPhase) <= ratio * mid) lo = mid
    else hi = mid
  }
  return lo
}

function smallestCertifiedRadius(selectedPhase: Phase, ratio: number): number | null {
  const maxR = 0.7
  const samples = 6000
  let previous = 0
  for (let i = 1; i <= samples; i++) {
    const r = (i / samples) * maxR
    if (returnMajorant(r, selectedPhase) <= ratio * r) {
      let lo = previous
      let hi = r
      for (let j = 0; j < 70; j++) {
        const mid = 0.5 * (lo + hi)
        if (returnMajorant(mid, selectedPhase) <= ratio * mid) hi = mid
        else lo = mid
      }
      return hi
    }
    previous = r
  }
  return null
}

const certifiedRadius = computed(() => largestCertifiedRadius(phase.value, targetRatio.value))
const certifiedMinimum = computed(() => smallestCertifiedRadius(phase.value, targetRatio.value))
const radialOptimum = computed(() => largestCertifiedRadius(phase.value, 1))
const detectedRadius = computed(() => largestCertifiedRadius('detected', targetRatio.value))
const criticalRadius = computed(() => largestCertifiedRadius('critical', targetRatio.value))
const phaseGain = computed(() => {
  if (detectedRadius.value === null || criticalRadius.value === null) return null
  return criticalRadius.value / detectedRadius.value
})

const plot = { left: 58, right: 22, top: 22, bottom: 46, width: 720, height: 330 }
const innerWidth = plot.width - plot.left - plot.right
const innerHeight = plot.height - plot.top - plot.bottom
const xMax = 0.55
const yMax = 0.62
const xPx = (x: number) => plot.left + (x / xMax) * innerWidth
const yPx = (y: number) => plot.top + innerHeight - (Math.min(y, yMax) / yMax) * innerHeight

const returnPath = computed(() => {
  const points: string[] = []
  const samples = 260
  for (let i = 0; i <= samples; i++) {
    const r = (i / samples) * xMax
    points.push(`${i === 0 ? 'M' : 'L'}${xPx(r).toFixed(2)},${yPx(returnMajorant(r, phase.value)).toFixed(2)}`)
  }
  return points.join(' ')
})

const diagonalPath = `M${xPx(0)},${yPx(0)} L${xPx(xMax)},${yPx(xMax)}`
const ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5]

const phaseLabel = computed(() => phase.value === 'critical' ? '0 → −1' : '−1 → 0')
const ratioAtCertificate = computed(() => {
  if (certifiedRadius.value === null || certifiedRadius.value === 0) return null
  return returnMajorant(certifiedRadius.value, phase.value) / certifiedRadius.value
})

function formatRadius(value: number | null): string {
  return value === null ? 'aucun' : value.toFixed(3)
}
</script>

<template>
  <div class="periodic-demo">
    <div class="controls" aria-label="Réglages du certificat périodique">
      <fieldset>
        <legend>Phase du retour</legend>
        <button
          type="button"
          :class="{ active: phase === 'detected' }"
          :aria-pressed="phase === 'detected'"
          @click="phase = 'detected'"
        >−1 → 0</button>
        <button
          type="button"
          :class="{ active: phase === 'critical' }"
          :aria-pressed="phase === 'critical'"
          @click="phase = 'critical'"
        >0 → −1 (critique)</button>
      </fieldset>

      <label>
        <span>Rayon de la vue <code>c_max</code> : 10<sup>{{ log10CMax }}</sup></span>
        <input v-model.number="log10CMax" type="range" min="-8" max="-2" step="0.25">
      </label>

      <label>
        <span>Marge de construction <code>q</code> : {{ targetRatio.toFixed(3) }}</span>
        <input v-model.number="targetRatio" type="range" min="0.80" max="0.999" step="0.001">
      </label>
    </div>

    <div class="metrics" aria-live="polite">
      <span>phase <strong>{{ phaseLabel }}</strong></span>
      <span>rayon certifié <strong>{{ formatRadius(certifiedRadius) }}</strong></span>
      <span>limite radiale <strong>{{ formatRadius(radialOptimum) }}</strong></span>
      <span v-if="phaseGain !== null">gain critique <strong>×{{ phaseGain.toFixed(2) }}</strong></span>
    </div>

    <svg
      :viewBox="`0 0 ${plot.width} ${plot.height}`"
      role="img"
      :aria-label="`Majorant du retour period deux, phase ${phaseLabel}. Le rayon certifié vaut ${formatRadius(certifiedRadius)}.`"
    >
      <title>Certificat radial du retour period‑2</title>
      <desc>La courbe du majorant M de r est comparée à la diagonale r. Le disque est invariant lorsque M de r est inférieur à r.</desc>

      <g class="grid">
        <line
          v-for="tick in ticks"
          :key="`x-${tick}`"
          :x1="xPx(tick)" :x2="xPx(tick)"
          :y1="plot.top" :y2="plot.top + innerHeight"
        />
        <line
          v-for="tick in ticks"
          :key="`y-${tick}`"
          :x1="plot.left" :x2="plot.left + innerWidth"
          :y1="yPx(tick)" :y2="yPx(tick)"
        />
      </g>

      <rect
        v-if="certifiedRadius !== null && certifiedMinimum !== null"
        class="accepted-band"
        :x="xPx(certifiedMinimum)"
        :y="plot.top"
        :width="xPx(certifiedRadius) - xPx(certifiedMinimum)"
        :height="innerHeight"
      />

      <path class="diagonal" :d="diagonalPath" />
      <path class="majorant" :d="returnPath" />

      <line
        v-if="certifiedRadius !== null"
        class="radius-marker"
        :x1="xPx(certifiedRadius)" :x2="xPx(certifiedRadius)"
        :y1="plot.top" :y2="plot.top + innerHeight"
      />
      <circle
        v-if="certifiedRadius !== null"
        class="radius-point"
        :cx="xPx(certifiedRadius)"
        :cy="yPx(returnMajorant(certifiedRadius, phase))"
        r="5"
      />

      <g class="axis-labels">
        <text
          v-for="tick in ticks"
          :key="`xt-${tick}`"
          :x="xPx(tick)" :y="plot.top + innerHeight + 22"
          text-anchor="middle"
        >{{ tick.toFixed(1) }}</text>
        <text
          v-for="tick in ticks"
          :key="`yt-${tick}`"
          :x="plot.left - 10" :y="yPx(tick) + 4"
          text-anchor="end"
        >{{ tick.toFixed(1) }}</text>
        <text :x="plot.left + innerWidth / 2" :y="plot.height - 7" text-anchor="middle">rayon d’entrée r</text>
        <text :x="17" :y="plot.top + innerHeight / 2" text-anchor="middle" :transform="`rotate(-90 17 ${plot.top + innerHeight / 2})`">rayon après un retour</text>
      </g>

      <text class="line-label diagonal-label" :x="xPx(0.39)" :y="yPx(0.39) - 9">diagonale r</text>
      <text class="line-label majorant-label" :x="xPx(0.31)" :y="yPx(returnMajorant(0.31, phase)) - 10">majorant M(r)</text>
      <text
        v-if="certifiedRadius !== null"
        class="marker-label"
        :x="Math.min(xPx(certifiedRadius) + 9, plot.width - 155)"
        :y="plot.top + 18"
      >r = {{ certifiedRadius.toFixed(3) }}</text>
    </svg>

    <p class="verdict">
      <template v-if="certifiedRadius !== null && ratioAtCertificate !== null">
        <strong>Certifié :</strong> M(r)/r = {{ ratioAtCertificate.toFixed(3) }} ≤ q &lt; 1.
        Tout |δz| ≤ r revient donc dans le même disque.
      </template>
      <template v-else>
        <strong>Refusé :</strong> aucune taille de disque ne satisfait la marge choisie.
      </template>
    </p>
  </div>
</template>

<style scoped>
.periodic-demo {
  color: var(--vp-c-text-1);
}

.controls {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) repeat(2, minmax(170px, 1fr));
  gap: 16px;
  align-items: end;
  margin-bottom: 12px;
}

.controls fieldset,
.controls label {
  min-width: 0;
  margin: 0;
}

.controls fieldset {
  border: 0;
  padding: 0;
}

.controls legend,
.controls label span {
  display: block;
  margin-bottom: 7px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.controls button {
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  padding: 6px 9px;
  margin: 0 6px 4px 0;
  cursor: pointer;
}

.controls button.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.controls input[type='range'] {
  width: 100%;
}

.metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-bottom: 4px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.metrics strong {
  color: var(--vp-c-text-1);
}

svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.grid line {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.accepted-band {
  fill: var(--vp-c-green-soft);
  opacity: 0.45;
}

.diagonal,
.majorant {
  fill: none;
  stroke-width: 2.5;
}

.diagonal {
  stroke: var(--vp-c-text-2);
  stroke-dasharray: 6 5;
}

.majorant {
  stroke: var(--vp-c-brand-1);
}

.radius-marker {
  stroke: var(--vp-c-green-1);
  stroke-width: 2;
  stroke-dasharray: 4 4;
}

.radius-point {
  fill: var(--vp-c-green-1);
  stroke: var(--vp-c-bg);
  stroke-width: 2;
}

.axis-labels,
.line-label,
.marker-label {
  fill: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.majorant-label,
.marker-label {
  fill: var(--vp-c-brand-1);
}

.verdict {
  margin: 2px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.verdict strong {
  color: var(--vp-c-text-1);
}

@media (max-width: 760px) {
  .controls {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
