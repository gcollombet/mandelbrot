<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'

type Mode = 'bla' | 'pade' | 'jet' | 'mobius' | 'auto'
type Tier = 0 | 1 | 2 | 3

const canvas = ref<HTMLCanvasElement | null>(null)
const mode = ref<Mode>('auto')
const log2CMax = ref(-16)
const dcRatio = ref(0.72)
const dzRatio = ref(0.54)
const referenceIndex = ref(1)
const running = ref(false)
const lastAction = ref('Prêt à sonder la table depuis le plus grand niveau.')

const totalIterations = 65
const levelSkips = [32, 16, 8, 4]
const tierNames = ['affine', 'Padé', 'Möbius c+', 'jet'] as const
const modeTier: Record<Exclude<Mode, 'auto'>, Tier> = {
  bla: 0,
  pade: 1,
  mobius: 2,
  jet: 3,
}

let resizeObserver: ResizeObserver | undefined
let timer: ReturnType<typeof setInterval> | undefined

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function radiiFor(skip: number): [number, number, number, number] {
  const depth = (log2CMax.value + 28) / 26
  const skipPenalty = Math.log2(skip / 4) * 0.045
  return [
    clamp(0.54 - depth * 0.19 - skipPenalty, 0.08, 1.2),
    clamp(0.70 - depth * 0.17 - skipPenalty, 0.08, 1.2),
    clamp(0.86 - depth * 0.14 - skipPenalty, 0.08, 1.2),
    clamp(1.04 - depth * 0.10 - skipPenalty, 0.08, 1.2),
  ]
}

function poleIsSafe(tier: Tier) {
  if (tier !== 1 && tier !== 2) return true
  return dzRatio.value + dcRatio.value * (tier === 1 ? 0.18 : 0.12) < 1.18
}

function tierAccepts(tier: Tier, radius: number) {
  return dcRatio.value <= 1 && dzRatio.value < radius && poleIsSafe(tier)
}

function chooseAutoTiers(radii: [number, number, number, number]) {
  const principal = (radii.findIndex(radius => radius > dzRatio.value * 0.9) === -1
    ? radii.indexOf(Math.max(...radii))
    : radii.findIndex(radius => radius > dzRatio.value * 0.9)) as Tier
  let secours = principal
  for (let tier = 0; tier < radii.length; tier++) {
    if (radii[tier]! > radii[secours]!) secours = tier as Tier
  }
  return {principal, secours}
}

const candidate = computed(() => {
  const remaining = totalIterations - referenceIndex.value
  const skip = levelSkips.find(value => value <= remaining && (referenceIndex.value - 1) % value === 0) ?? 1
  if (skip === 1) {
    return {skip, principal: 0 as Tier, used: 0 as Tier, radius: 0, accepted: false, usedSecours: false}
  }

  const radii = radiiFor(skip)
  if (mode.value !== 'auto') {
    const tier = modeTier[mode.value]
    return {
      skip,
      principal: tier,
      used: tier,
      radius: radii[tier],
      accepted: tierAccepts(tier, radii[tier]),
      usedSecours: false,
    }
  }

  const {principal, secours} = chooseAutoTiers(radii)
  if (tierAccepts(principal, radii[principal])) {
    return {skip, principal, used: principal, radius: radii[principal], accepted: true, usedSecours: false}
  }
  if (secours !== principal && tierAccepts(secours, radii[secours])) {
    return {skip, principal, used: secours, radius: radii[secours], accepted: true, usedSecours: true}
  }
  return {skip, principal, used: principal, radius: radii[principal], accepted: false, usedSecours: false}
})

const accessibleSummary = computed(() => {
  const value = candidate.value
  return `Indice ${referenceIndex.value}. Bloc candidat de ${value.skip} itérations. `
    + `${tierNames[value.used]}. ${value.accepted ? 'Bloc accepté' : 'Bloc refusé, repli exact'}.`
})

function cssColor(name: string, fallback: string) {
  if (!canvas.value) return fallback
  return getComputedStyle(canvas.value).getPropertyValue(name).trim() || fallback
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function draw() {
  const element = canvas.value
  if (!element) return
  const width = Math.max(320, element.clientWidth)
  const height = width < 520 ? 470 : 420
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  element.width = Math.round(width * dpr)
  element.height = Math.round(height * dpr)
  element.style.height = `${height}px`

  const ctx = element.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)

  const foreground = cssColor('--vp-c-text-1', '#202127')
  const muted = cssColor('--vp-c-text-2', '#676b73')
  const border = cssColor('--vp-c-divider', '#d8d9de')
  const soft = cssColor('--vp-c-bg-soft', '#f3f4f6')
  const brand = cssColor('--vp-c-brand-1', '#3451b2')
  const success = cssColor('--vp-c-green-1', '#18794e')
  const danger = cssColor('--vp-c-red-1', '#cd2b31')
  const warning = cssColor('--vp-c-yellow-1', '#946800')

  ctx.clearRect(0, 0, width, height)
  ctx.font = '12px system-ui, sans-serif'
  ctx.textBaseline = 'middle'

  const left = width < 520 ? 46 : 68
  const right = 18
  const plotWidth = width - left - right
  const xForIteration = (iteration: number) => left + (iteration / (totalIterations - 1)) * plotWidth

  ctx.fillStyle = foreground
  ctx.font = '500 13px system-ui, sans-serif'
  ctx.fillText(`Référence : n = ${referenceIndex.value}`, left, 20)
  ctx.fillStyle = muted
  ctx.font = '12px system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`cmax = 2^${log2CMax.value} · |δc|/cmax = ${dcRatio.value.toFixed(2)} · |δz|/R = ${dzRatio.value.toFixed(2)}`, width - right, 20)
  ctx.textAlign = 'left'

  const axisY = 62
  ctx.strokeStyle = border
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(left, axisY)
  ctx.lineTo(width - right, axisY)
  ctx.stroke()
  for (let iteration = 0; iteration < totalIterations; iteration += 8) {
    const x = xForIteration(iteration)
    ctx.beginPath()
    ctx.moveTo(x, axisY - 4)
    ctx.lineTo(x, axisY + 4)
    ctx.stroke()
    ctx.fillStyle = muted
    ctx.textAlign = 'center'
    ctx.fillText(String(iteration), x, axisY - 14)
  }

  const currentX = xForIteration(referenceIndex.value)
  ctx.strokeStyle = brand
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(currentX, 42)
  ctx.lineTo(currentX, 292)
  ctx.stroke()

  const selected = candidate.value
  levelSkips.forEach((skip, row) => {
    const y = 96 + row * 47
    ctx.fillStyle = muted
    ctx.textAlign = 'right'
    ctx.fillText(`saut ${skip}`, left - 9, y + 12)
    ctx.textAlign = 'left'
    for (let start = 1; start + skip <= totalIterations; start += skip) {
      const x = xForIteration(start)
      const endX = xForIteration(start + skip)
      const isCandidate = skip === selected.skip && start === referenceIndex.value
      drawRoundedRect(ctx, x + 1, y, Math.max(2, endX - x - 2), 24, 5)
      ctx.fillStyle = isCandidate ? (selected.accepted ? success : danger) : soft
      ctx.fill()
      if (isCandidate) {
        ctx.strokeStyle = selected.usedSecours ? warning : brand
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        const label = mode.value === 'auto' ? tierNames[selected.used] : mode.value
        if (endX - x > 38) ctx.fillText(label, (x + endX) / 2, y + 12)
        ctx.textAlign = 'left'
      }
    }
  })

  const panelY = 310
  ctx.strokeStyle = border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(left, panelY - 12)
  ctx.lineTo(width - right, panelY - 12)
  ctx.stroke()

  const guardRows = [
    ['Alignement et fin de référence', selected.skip > 1],
    ['|δc| ≤ cmax', dcRatio.value <= 1],
    [`|δz| < R(${tierNames[selected.used]})`, selected.skip > 1 && dzRatio.value < selected.radius],
    ['Distance au pôle rationnel', poleIsSafe(selected.used)],
  ] as const
  const columns = width < 520 ? 1 : 2
  guardRows.forEach(([label, ok], index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const itemWidth = plotWidth / columns
    const x = left + column * itemWidth
    const y = panelY + row * 28
    ctx.fillStyle = ok ? success : danger
    ctx.beginPath()
    ctx.arc(x + 5, y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = foreground
    ctx.textAlign = 'left'
    ctx.fillText(label, x + 16, y)
  })

  const actionY = width < 520 ? 410 : 384
  ctx.fillStyle = selected.accepted ? success : danger
  ctx.font = '500 13px system-ui, sans-serif'
  const action = selected.accepted
    ? `${selected.usedSecours ? 'Secours' : 'Bloc'} ${tierNames[selected.used]} accepté : n ← n + ${selected.skip}`
    : 'Aucun bloc applicable : une itération exacte est exécutée'
  ctx.fillText(action, left, actionY)
  ctx.fillStyle = muted
  ctx.font = '12px system-ui, sans-serif'
  ctx.fillText(lastAction.value, left, actionY + 23)
}

function step() {
  if (referenceIndex.value >= totalIterations - 1) {
    reset()
    return
  }
  const value = candidate.value
  if (value.accepted) {
    referenceIndex.value = Math.min(totalIterations - 1, referenceIndex.value + value.skip)
    dzRatio.value = clamp(dzRatio.value * (0.68 + value.used * 0.035) + dcRatio.value * 0.08, 0.04, 1.45)
    lastAction.value = `${tierNames[value.used]} a couvert ${value.skip} itérations de référence.`
  } else {
    referenceIndex.value++
    dzRatio.value = clamp(dzRatio.value * 0.88 + dcRatio.value * 0.16, 0.04, 1.45)
    lastAction.value = 'Le shader a conservé la récurrence de perturbation exacte pour ce pas.'
  }
}

function stop() {
  running.value = false
  if (timer) clearInterval(timer)
  timer = undefined
}

function toggleRun() {
  if (running.value) {
    stop()
    return
  }
  running.value = true
  timer = setInterval(() => {
    if (referenceIndex.value >= totalIterations - 1) reset()
    else step()
  }, 650)
}

function reset() {
  stop()
  referenceIndex.value = 1
  dzRatio.value = 0.54
  lastAction.value = 'Retour au début de la référence.'
}

watch([mode, log2CMax, dcRatio, dzRatio, referenceIndex, lastAction], () => nextTick(draw))

onMounted(() => {
  resizeObserver = new ResizeObserver(draw)
  if (canvas.value) resizeObserver.observe(canvas.value)
  draw()
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
})
</script>

<template>
  <section class="table-demo" aria-labelledby="table-demo-title">
    <h2 id="table-demo-title">Explorateur de la table</h2>
    <div class="controls">
      <label>
        Mode
        <select v-model="mode">
          <option value="bla">BLA</option>
          <option value="pade">Padé</option>
          <option value="jet">Jet</option>
          <option value="mobius">Möbius c+</option>
          <option value="auto">Auto</option>
        </select>
      </label>
      <label>
        <span>log₂(cmax) <output>{{ log2CMax }}</output></span>
        <input v-model.number="log2CMax" type="range" min="-28" max="-2" step="1">
      </label>
      <label>
        <span>|δc| / cmax <output>{{ dcRatio.toFixed(2) }}</output></span>
        <input v-model.number="dcRatio" type="range" min="0" max="1.2" step="0.02">
      </label>
      <label>
        <span>|δz| / R <output>{{ dzRatio.toFixed(2) }}</output></span>
        <input v-model.number="dzRatio" type="range" min="0.04" max="1.45" step="0.01">
      </label>
    </div>
    <canvas
      ref="canvas"
      role="img"
      :aria-label="accessibleSummary"
    />
    <p class="sr-only" aria-live="polite">{{ accessibleSummary }}</p>
    <div class="actions">
      <button type="button" @click="step">Pas suivant</button>
      <button type="button" @click="toggleRun">{{ running ? 'Pause' : 'Animer' }}</button>
      <button type="button" class="secondary" @click="reset">Réinitialiser</button>
    </div>
    <p class="caption">
      Schéma structurel normalisé : les niveaux, tags et gardes suivent le moteur réel ; les valeurs de rayon sont pédagogiques et non une reproduction numérique de la table Rust.
    </p>
  </section>
</template>

<style scoped>
.table-demo {
  margin: 2rem 0;
  padding: 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.table-demo h2 {
  margin: 0 0 1rem;
  border: 0;
}

.controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 0.9rem;
  margin-bottom: 0.75rem;
}

.controls label,
.controls label span {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--vp-c-text-2);
  font-size: 0.86rem;
}

.controls label {
  flex-direction: column;
}

select,
input[type='range'] {
  width: 100%;
}

select {
  min-height: 2rem;
  padding: 0.25rem 0.5rem;
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

output {
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
}

canvas {
  display: block;
  width: 100%;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.9rem;
}

button {
  padding: 0.45rem 0.8rem;
  color: var(--vp-c-white);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  cursor: pointer;
}

button.secondary {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.caption {
  margin: 0.75rem 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 520px) {
  .table-demo {
    padding: 0.85rem;
  }
}
</style>
