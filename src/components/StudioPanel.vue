<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Palette } from '../Palette'
import type { MandelbrotParams } from '../Mandelbrot'
import { log10FromDecimalString } from '../floatexp'
import {
  cameraKeyframes, cameraSegmentAt, discreteLookDiffers, formatSeconds, formatTimecode, keyframeTimes, lookKeyframes,
  moveStudioKeyframe, newStudioParcours, rampedTime, removeStudioKeyframe, snapshotStudioCamera, snapshotStudioLook,
  STUDIO_MAX_DURATION, STUDIO_MIN_DURATION,
  type StudioKeyframe, type StudioLook, type StudioParcours,
} from '../studioParcours'
import { deleteStudioParcours, readStudioParcoursRecords, saveStudioParcours, type StudioParcoursRecord } from '../studioParcoursStore'
import { recallStudioDraft, rememberStudioDraft } from '../studioDraft'
import { createStudioPlayer, type StudioController, type StudioEngine, type StudioTextures } from '../studioPlayer'
import { DenseField, DenseSeg, DenseToggle } from './dense'

// ── Studio: a Resolve-style timeline docked under the live view ──
// Pure UI over studioParcours.ts (model) and studioPlayer.ts (engine wiring).

const props = defineProps<{
  params: MandelbrotParams
  engine: StudioEngine | null
  controller: StudioController | null
  resolveTextures: (look: StudioLook) => Promise<StudioTextures>
}>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const FPS = 30
// The draft survives the dock closing and reopening (studioDraft.ts).
const draft = recallStudioDraft()
const parcours = reactive<StudioParcours>(draft?.parcours ?? newStudioParcours(t('studioPanel.newName')))
const savedId = ref(draft?.savedId ?? '')
const saved = ref<StudioParcoursRecord[]>([])
const selectedId = ref<string | null>(null)
const status = ref('')
const error = ref('')

const player = createStudioPlayer({
  getEngine: () => props.engine,
  getController: () => props.controller,
  params: { get value() { return props.params } },
  resolveTextures: look => props.resolveTextures(look),
})
player.setParcours(parcours)
const { time, playing, recording } = player
if (draft) time.value = Math.min(draft.time, parcours.durationSeconds)

const selected = computed(() => parcours.keyframes.find(k => k.id === selectedId.value) ?? null)
const cameraCount = computed(() => parcours.keyframes.filter(k => k.camera).length)
const lookCount = computed(() => parcours.keyframes.filter(k => k.look).length)
const CURVE_OPTIONS = computed(() => (['linear', 'gaussian', 'square', 'exponential'] as const).map(value => ({ value, label: t(`studioPanel.curves.${value}`) })))

function flash(message: string) { status.value = message; error.value = ''; setTimeout(() => { if (status.value === message) status.value = '' }, 2600) }
function fail(e: unknown) { error.value = e instanceof Error ? e.message : String(e) }

// ── Library ──
async function refreshLibrary() { try { saved.value = await readStudioParcoursRecords() } catch (e) { fail(e) } }
function replaceParcours(next: StudioParcours) {
  Object.assign(parcours, JSON.parse(JSON.stringify(next)))
  parcours.keyframes = next.keyframes.map(k => JSON.parse(JSON.stringify(k)))
  selectedId.value = parcours.keyframes[0]?.id ?? null
  player.pause()
  time.value = 0
  invalidate()
}
function newParcours() { savedId.value = ''; replaceParcours(newStudioParcours(t('studioPanel.newName'))) }
async function save() {
  try { const record = await saveStudioParcours(JSON.parse(JSON.stringify(parcours))); savedId.value = record.id; await refreshLibrary(); flash(t('studioPanel.library.saved')) }
  catch (e) { fail(e) }
}
function load(id: string) {
  const record = saved.value.find(r => r.id === id)
  if (!record) return
  savedId.value = id
  replaceParcours(record.parcours)
}
async function remove() {
  if (!savedId.value) return
  try { await deleteStudioParcours(savedId.value); savedId.value = ''; await refreshLibrary(); flash(t('studioPanel.library.deleted')) } catch (e) { fail(e) }
}

// ── Transport ──
function togglePlay() { if (playing.value) player.pause(); else player.play() }
function toggleRecord() { if (recording.value) player.stopRecording(); else { player.record(); flash(t('studioPanel.hints.record')) } }
function seek(value: number) { player.seek(value); invalidate() }
function stepKeyframe(direction: 1 | -1) {
  const times = keyframeTimes(parcours)
  const next = direction > 0 ? times.find(x => x > time.value + 1e-3) : [...times].reverse().find(x => x < time.value - 1e-3)
  if (next === undefined) return
  seek(next)
  selectedId.value = parcours.keyframes.find(k => k.time === next)?.id ?? selectedId.value
}
function addKeyframe(scope: 'both' | 'camera' | 'look' = 'both') {
  try {
    const keyframe = player.capture(scope)
    if (!keyframe) return
    selectedId.value = keyframe.id
    invalidate()
    flash(t('studioPanel.hints.keyframeAdded', { time: formatTimecode(keyframe.time, FPS) }))
  } catch (e) { fail(e) }
}
function deleteSelected() {
  if (!selected.value) return
  const index = parcours.keyframes.findIndex(k => k.id === selected.value!.id)
  removeStudioKeyframe(parcours, selected.value.id)
  selectedId.value = parcours.keyframes[Math.max(0, index - 1)]?.id ?? null
  afterEdit()
}
function afterEdit() { player.refresh(); invalidate() }

// Inspector edits
function setScope(kind: 'camera' | 'look', on: boolean) {
  const k = selected.value
  if (!k) return
  if (on) {
    if (kind === 'camera') k.camera = snapshotStudioCamera(props.params)
    else k.look = snapshotStudioLook(props.params)
  } else {
    if (kind === 'camera' && k.look) delete k.camera
    if (kind === 'look' && k.camera) delete k.look
  }
  afterEdit()
}
function recapture(kind: 'camera' | 'look') {
  const k = selected.value
  if (!k) return
  if (kind === 'camera') k.camera = snapshotStudioCamera(props.params)
  else k.look = snapshotStudioLook(props.params)
  invalidate()
  flash(t(kind === 'camera' ? 'studioPanel.hints.cameraCaptured' : 'studioPanel.hints.lookCaptured'))
}
function setSelectedTime(value: number) {
  if (!selected.value) return
  moveStudioKeyframe(parcours, selected.value.id, value)
  afterEdit()
}
function setDuration(value: number) {
  parcours.durationSeconds = Math.max(STUDIO_MIN_DURATION, Math.min(STUDIO_MAX_DURATION, value))
  for (const k of parcours.keyframes) if (k.time > parcours.durationSeconds) k.time = parcours.durationSeconds
  parcours.easeInSeconds = Math.min(parcours.easeInSeconds, parcours.durationSeconds / 2)
  parcours.easeOutSeconds = Math.min(parcours.easeOutSeconds, parcours.durationSeconds / 2)
  afterEdit()
}

const depthOf = (scale: string) => { const d = -log10FromDecimalString(scale); return Number.isFinite(d) ? d : 0 }
const selectedDepth = computed(() => selected.value?.camera ? depthOf(selected.value.camera.scale) : 0)

// ── Keyboard (called by the viewer while the studio is open) ──
function handleKey(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return false
  if (e.code === 'Space') { togglePlay(); return true }
  switch (e.key.toLowerCase()) {
    case 'k': if (!e.repeat) addKeyframe(); return true
    case 'j': stepKeyframe(-1); return true
    case 'l': stepKeyframe(1); return true
    case 'home': seek(0); return true
    case 'end': seek(parcours.durationSeconds); return true
    case 'arrowleft': if (e.shiftKey) { seek(time.value - 1 / FPS); return true } return false
    case 'arrowright': if (e.shiftKey) { seek(time.value + 1 / FPS); return true } return false
    case 'delete': case 'backspace': if (selected.value) { deleteSelected(); return true } return false
  }
  return false
}
defineExpose({ handleKey })

// ── Timeline canvas ──
const canvasRef = ref<HTMLCanvasElement | null>(null)
const RULER = 20, PAD = 10
const TRACKS = [
  { id: 'camera', h: 64 }, { id: 'look', h: 44 }, { id: 'discrete', h: 24 },
] as const
let frame: number | null = null
let drag: { kind: 'head' } | { kind: 'key'; id: string } | null = null
let lastSeek = 0
const paletteCache = new Map<string, string>()

function invalidate() { if (frame === null) frame = requestAnimationFrame(() => { frame = null; draw() }) }
function cssVar(name: string): string { return canvasRef.value ? getComputedStyle(canvasRef.value).getPropertyValue(name).trim() : '#888' }
function xOf(seconds: number, width: number) { return PAD + (width - 2 * PAD) * seconds / Math.max(1e-6, parcours.durationSeconds) }
function tOf(x: number, width: number) { return Math.max(0, Math.min(parcours.durationSeconds, (x - PAD) / (width - 2 * PAD) * parcours.durationSeconds)) }
function lookGradient(look: StudioLook): string {
  const key = JSON.stringify([look.colorStops, look.interpolationMode])
  let g = paletteCache.get(key)
  if (!g) {
    const p = new Palette(look.colorStops, look.interpolationMode)
    g = Array.from({ length: 12 }, (_, i) => p.getColorAt(i / 11)).join('|')
    paletteCache.set(key, g)
  }
  return g
}
function rows(): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {}
  let y = RULER
  for (const tr of TRACKS) { out[tr.id] = [y, y + tr.h]; y += tr.h }
  return out
}
function diamond(c: CanvasRenderingContext2D, x: number, y: number, color: string, isSelected: boolean) {
  c.save(); c.translate(x, y); c.rotate(Math.PI / 4)
  c.fillStyle = isSelected ? '#fff' : color; c.fillRect(-5, -5, 10, 10)
  if (isSelected) { c.strokeStyle = color; c.lineWidth = 2; c.strokeRect(-5, -5, 10, 10) }
  c.restore()
}
function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const box = canvas.parentElement!.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.max(120, box.width), h = RULER + TRACKS.reduce((a, b) => a + b.h, 0)
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.height = `${h}px` }
  const c = canvas.getContext('2d')!
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  c.clearRect(0, 0, w, h)
  const ink = cssVar('--ink') || '#f2f4f8', ink3 = cssVar('--ink-3') || '#717889', line = cssVar('--line-soft') || '#1c2029'
  const camColor = 'oklch(0.72 0.15 245)', lookColor = 'oklch(0.72 0.16 320)', discColor = 'oklch(0.78 0.14 75)', red = cssVar('--red') || '#d44'
  const r = rows()
  c.font = '10px "JetBrains Mono", ui-monospace, monospace'; c.textBaseline = 'middle'
  // Ruler
  const duration = parcours.durationSeconds
  const tickStep = duration <= 20 ? 1 : duration <= 60 ? 5 : duration <= 300 ? 15 : duration <= 1200 ? 60 : 300
  for (let s = 0; s <= duration + 1e-6; s += tickStep) {
    const x = xOf(s, w), major = Math.round(s / tickStep) % (duration <= 60 ? 2 : 4) === 0
    c.fillStyle = line; c.fillRect(x, RULER - (major ? 8 : 4), 1, major ? 8 : 4)
    if (major) { c.fillStyle = ink3; c.fillText(formatSeconds(s), x + 3, RULER - 7) }
  }
  for (const tr of TRACKS) { c.fillStyle = line; c.fillRect(0, r[tr.id][1] - 1, w, 1) }
  // Ramps: shade the eased ends of the camera track.
  if (parcours.easeInSeconds > 0 || parcours.easeOutSeconds > 0) {
    c.fillStyle = 'rgba(255,255,255,0.035)'
    c.fillRect(xOf(0, w), r.camera[0], xOf(parcours.easeInSeconds, w) - xOf(0, w), r.camera[1] - r.camera[0])
    c.fillRect(xOf(duration - parcours.easeOutSeconds, w), r.camera[0], xOf(duration, w) - xOf(duration - parcours.easeOutSeconds, w), r.camera[1] - r.camera[0])
  }
  // Camera: depth curve over parcours time (ramps and retime applied) + diamonds.
  const cams = cameraKeyframes(parcours)
  if (cams.length) {
    const depths = cams.map(k => depthOf(k.camera.scale))
    const lo = Math.min(...depths) - 0.25, hi = Math.max(...depths) + 0.25
    const yv = (d: number) => r.camera[0] + 8 + (r.camera[1] - r.camera[0] - 16) * (hi - d) / (hi - lo)
    if (cams.length > 1) {
      c.strokeStyle = camColor; c.lineWidth = 1.5; c.beginPath()
      for (let x = PAD; x <= w - PAD; x += 2) {
        const seg = cameraSegmentAt(parcours, tOf(x, w))!
        const f = seg.duration > 0 ? seg.localElapsed / seg.duration : 0
        const d = depthOf(seg.from.scale) + (depthOf(seg.to.scale) - depthOf(seg.from.scale)) * f
        if (x === PAD) c.moveTo(x, yv(d)); else c.lineTo(x, yv(d))
      }
      c.stroke()
    }
    if (parcours.retime) {
      c.globalAlpha = 0.35; c.fillStyle = camColor
      for (const k of parcours.keyframes) if (k.camera) c.fillRect(xOf(k.time, w) - 0.5, r.camera[0] + 4, 1, r.camera[1] - r.camera[0] - 8)
      c.globalAlpha = 1
    }
    cams.forEach((k, i) => diamond(c, xOf(k.time, w), yv(depths[i]), camColor, k.id === selectedId.value))
    c.fillStyle = ink3; c.fillText(`1e-${depths[0].toFixed(1)} → 1e-${depths[depths.length - 1].toFixed(1)}`, PAD + 4, r.camera[0] + 8)
  } else {
    c.fillStyle = ink3; c.fillText(t('studioPanel.tracks.emptyCamera'), PAD + 4, (r.camera[0] + r.camera[1]) / 2)
  }
  // Look: palette bands, held part darkened, transfer curve of the arriving keyframe.
  const looks = lookKeyframes(parcours)
  const y0 = r.look[0] + 8, bandH = 16
  looks.forEach((k, i) => {
    const next = looks[i + 1]
    const x0 = xOf(k.time, w), x1 = xOf(next ? next.time : duration, w)
    const colors = lookGradient(k.look).split('|')
    const g = c.createLinearGradient(x0, 0, Math.max(x0 + 1, x1), 0)
    colors.forEach((col, j) => g.addColorStop(j / (colors.length - 1), col))
    c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, bandH)
    if (next) {
      const holdX = x0 + (x1 - x0) * next.hold
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(holdX, y0, x1 - holdX, bandH)
      c.strokeStyle = lookColor; c.lineWidth = 1; c.beginPath()
      for (let x = holdX; x <= x1; x += 2) {
        const f = (x - holdX) / Math.max(1, x1 - holdX)
        const probe = tOf(x, w)
        const state = probe <= k.time ? 0 : f
        const yy = y0 + bandH - bandH * state
        if (x === holdX) c.moveTo(x, yy); else c.lineTo(x, yy)
      }
      c.stroke()
    }
    diamond(c, x0, y0 + bandH / 2, lookColor, k.id === selectedId.value)
  })
  if (!looks.length) { c.fillStyle = ink3; c.fillText(t('studioPanel.tracks.emptyLook'), PAD + 4, (r.look[0] + r.look[1]) / 2) }
  // Discrete: markers where a look keyframe switches texture, skybox, µ, stops…
  looks.forEach((k, i) => {
    if (i === 0 || !discreteLookDiffers(looks[i - 1].look, k.look)) return
    const x = xOf(k.time, w)
    c.fillStyle = discColor; c.fillRect(x - 1, r.discrete[0] + 4, 2, r.discrete[1] - r.discrete[0] - 8)
    const labels: string[] = []
    const prev = looks[i - 1].look
    if (prev.textureGuid !== k.look.textureGuid || prev.textureName !== k.look.textureName) labels.push(t('studioPanel.discrete.texture'))
    if (prev.skyboxGuid !== k.look.skyboxGuid || prev.skyboxName !== k.look.skyboxName) labels.push(t('studioPanel.discrete.skybox'))
    if (prev.mu !== k.look.mu) labels.push('µ')
    if (JSON.stringify(prev.colorStops) !== JSON.stringify(k.look.colorStops)) labels.push(t('studioPanel.discrete.stops'))
    c.fillStyle = ink3; c.fillText(labels.join(' · '), x + 5, (r.discrete[0] + r.discrete[1]) / 2)
  })
  // Playhead
  const x = xOf(Math.min(time.value, duration), w)
  c.fillStyle = recording.value ? red : ink
  c.fillRect(x - 0.5, 0, 1, h)
  c.beginPath(); c.moveTo(x - 6, 0); c.lineTo(x + 6, 0); c.lineTo(x, 8); c.fill()
}

function hitKeyframe(px: number, py: number, width: number): StudioKeyframe | null {
  const r = rows()
  const cams = cameraKeyframes(parcours)
  for (const k of parcours.keyframes) {
    const camTime = cams.find(c => c.id === k.id)?.time ?? k.time
    if (k.camera && Math.abs(px - xOf(camTime, width)) <= 8 && py >= r.camera[0] && py < r.camera[1]) return k
    if (k.look && Math.abs(px - xOf(k.time, width)) <= 8 && py >= r.look[0] && py < r.look[1]) return k
  }
  return null
}
function onPointerDown(e: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const box = canvas.getBoundingClientRect(), px = e.clientX - box.left, py = e.clientY - box.top
  canvas.setPointerCapture(e.pointerId)
  const k = hitKeyframe(px, py, box.width)
  if (k) { selectedId.value = k.id; drag = { kind: 'key', id: k.id } }
  else { drag = { kind: 'head' }; throttledSeek(tOf(px, box.width), true) }
  invalidate()
}
function onPointerMove(e: PointerEvent) {
  const canvas = canvasRef.value
  if (!drag || !canvas) return
  const box = canvas.getBoundingClientRect(), value = tOf(e.clientX - box.left, box.width)
  if (drag.kind === 'head') throttledSeek(value, false)
  else { moveStudioKeyframe(parcours, drag.id, Math.round(value * FPS) / FPS); invalidate() }
}
function onPointerUp(e: PointerEvent) {
  const canvas = canvasRef.value
  if (!drag || !canvas) return
  const box = canvas.getBoundingClientRect(), value = tOf(e.clientX - box.left, box.width)
  if (drag.kind === 'head') throttledSeek(value, true)
  else afterEdit()
  drag = null
}
/** Scrubbing teleports the camera and resets the reference orbit: cap the rate. */
function throttledSeek(value: number, force: boolean) {
  const now = performance.now()
  time.value = value
  invalidate()
  if (!force && now - lastSeek < 150) return
  lastSeek = now
  player.seek(value)
}

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  void refreshLibrary()
  resizeObserver = new ResizeObserver(() => invalidate())
  if (canvasRef.value?.parentElement) resizeObserver.observe(canvasRef.value.parentElement)
  invalidate()
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (frame !== null) cancelAnimationFrame(frame)
  player.destroy()
  rememberStudioDraft(parcours, savedId.value, time.value)
})
watch([time, playing, recording, selectedId], invalidate)
watch(() => JSON.stringify(parcours), invalidate)

const timecode = computed(() => formatTimecode(time.value, FPS))
const durationLabel = computed(() => formatSeconds(parcours.durationSeconds))
const cameraTimeLabel = computed(() => formatTimecode(rampedTime(parcours, time.value), FPS))
</script>

<template>
  <div class="studio" :class="{ recording, playing }">
    <div class="studio-bar">
      <div class="studio-brand">
        <i class="fa-solid fa-clapperboard" aria-hidden="true"></i>
        <input class="studio-name" v-model="parcours.name" :aria-label="t('studioPanel.library.name')" maxlength="100" />
        <select class="studio-select" :value="savedId" :aria-label="t('studioPanel.library.select')" @change="load(($event.target as HTMLSelectElement).value)">
          <option value="">{{ t('studioPanel.library.unsaved') }}</option>
          <option v-for="r in saved" :key="r.id" :value="r.id">{{ r.name }} · {{ formatSeconds(r.parcours.durationSeconds) }}</option>
        </select>
        <button class="sbtn" type="button" @click="newParcours">{{ t('studioPanel.library.new') }}</button>
        <button class="sbtn" type="button" @click="save">{{ t('common.save') }}</button>
        <button class="sbtn" type="button" :disabled="!savedId" @click="remove">{{ t('common.delete') }}</button>
      </div>
      <div class="studio-transport">
        <button class="tbtn" type="button" :title="t('studioPanel.transport.start')" @click="seek(0)"><i class="fa-solid fa-backward-fast"></i></button>
        <button class="tbtn" type="button" :title="t('studioPanel.transport.prevKey')" @click="stepKeyframe(-1)"><i class="fa-solid fa-backward-step"></i></button>
        <button class="tbtn tbtn-play" type="button" :aria-pressed="playing" :title="playing ? t('studioPanel.transport.pause') : t('studioPanel.transport.play')" @click="togglePlay">
          <i :class="playing ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i>
        </button>
        <button class="tbtn" type="button" :title="t('studioPanel.transport.nextKey')" @click="stepKeyframe(1)"><i class="fa-solid fa-forward-step"></i></button>
        <button class="tbtn" type="button" :title="t('studioPanel.transport.end')" @click="seek(parcours.durationSeconds)"><i class="fa-solid fa-forward-fast"></i></button>
        <button class="tbtn tbtn-rec" type="button" :aria-pressed="recording" :title="recording ? t('studioPanel.transport.stopRecord') : t('studioPanel.transport.record')" @click="toggleRecord"><i class="fa-solid fa-circle"></i></button>
        <div class="studio-tc" :title="t('studioPanel.transport.cameraTime', { time: cameraTimeLabel })">{{ timecode }}<small>/ {{ durationLabel }}</small></div>
        <button class="sbtn sbtn-primary" type="button" :title="t('studioPanel.transport.keyframeTitle')" @click="addKeyframe()">
          <i class="fa-solid fa-diamond"></i> {{ t('studioPanel.transport.keyframe') }} <kbd>K</kbd>
        </button>
      </div>
      <div class="studio-status">
        <span v-if="error" class="err">{{ error }}</span>
        <span v-else-if="status">{{ status }}</span>
        <span v-else>{{ t('studioPanel.status.keyframes', { total: parcours.keyframes.length, camera: cameraCount, look: lookCount }) }}</span>
      </div>
      <button class="tbtn" type="button" :aria-label="t('common.close')" @click="emit('close')"><i class="fa-solid fa-xmark"></i></button>
    </div>

    <div class="studio-main">
      <div class="studio-timeline">
        <div class="studio-heads">
          <div class="ruler">TC · {{ FPS }} fps</div>
          <div class="hd" style="height:64px"><span class="dot cam"></span>{{ t('studioPanel.tracks.camera') }}</div>
          <div class="hd" style="height:44px"><span class="dot look"></span>{{ t('studioPanel.tracks.look') }}</div>
          <div class="hd" style="height:24px"><span class="dot disc"></span>{{ t('studioPanel.tracks.discrete') }}</div>
        </div>
        <div class="studio-canvas">
          <canvas ref="canvasRef" :aria-label="t('studioPanel.tracks.ariaTimeline')" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp"></canvas>
        </div>
      </div>

      <aside class="studio-insp">
        <template v-if="selected">
          <h3>{{ t('studioPanel.inspector.title') }} <small>{{ formatTimecode(selected.time, FPS) }}</small></h3>
          <DenseField :model-value="selected.time" :label="t('studioPanel.inspector.time')" :min="0" :max="parcours.durationSeconds" :step="1 / FPS" f="p2" unit="s" @update:model-value="setSelectedTime" />
          <div class="scope">
            <button type="button" class="chip cam" :aria-pressed="!!selected.camera" @click="setScope('camera', !selected.camera)"><i></i>{{ t('studioPanel.tracks.camera') }}</button>
            <button type="button" class="chip look" :aria-pressed="!!selected.look" @click="setScope('look', !selected.look)"><i></i>{{ t('studioPanel.tracks.look') }}</button>
          </div>
          <template v-if="selected.camera">
            <div class="readout"><span>{{ t('studioPanel.inspector.scaleExp') }}</span><b>1e-{{ selectedDepth.toFixed(2) }}</b></div>
            <div class="readout"><span>{{ t('studioPanel.inspector.angle') }}</span><b>{{ (selected.camera.angle * 180 / Math.PI).toFixed(1) }}°</b></div>
            <button class="sbtn" type="button" @click="recapture('camera')">{{ t('studioPanel.inspector.captureCamera') }}</button>
          </template>
          <template v-if="selected.look">
            <div class="swatch" :style="{ background: `linear-gradient(to right, ${lookGradient(selected.look).split('|').join(',')})` }"></div>
            <DenseSeg :model-value="selected.curve" :label="t('studioPanel.inspector.curve')" :options="CURVE_OPTIONS" @update:model-value="selected.curve = $event as StudioKeyframe['curve']; afterEdit()" />
            <DenseField :model-value="selected.hold" :label="t('studioPanel.inspector.hold')" :min="0" :max="0.95" :step="0.05" :f="(v: number) => String(Math.round(v * 100))" unit="%" :desc="t('studioPanel.inspector.holdDesc')" @update:model-value="selected.hold = $event; afterEdit()" />
            <button class="sbtn" type="button" @click="recapture('look')">{{ t('studioPanel.inspector.captureLook') }}</button>
          </template>
          <button class="sbtn sbtn-danger" type="button" @click="deleteSelected">{{ t('studioPanel.inspector.delete') }}</button>
        </template>
        <p v-else class="empty">{{ t('studioPanel.inspector.empty') }}</p>

        <h3>{{ t('studioPanel.settings.title') }}</h3>
        <DenseField :model-value="parcours.durationSeconds" :label="t('studioPanel.settings.duration')" :min="STUDIO_MIN_DURATION" :max="600" :step="0.5" f="p1" unit="s" @update:model-value="setDuration" />
        <DenseField :model-value="parcours.easeInSeconds" :label="t('studioPanel.settings.easeIn')" :min="0" :max="parcours.durationSeconds / 2" :step="0.1" f="p1" unit="s" @update:model-value="parcours.easeInSeconds = $event; afterEdit()" />
        <DenseField :model-value="parcours.easeOutSeconds" :label="t('studioPanel.settings.easeOut')" :min="0" :max="parcours.durationSeconds / 2" :step="0.1" f="p1" unit="s" @update:model-value="parcours.easeOutSeconds = $event; afterEdit()" />
        <DenseToggle :model-value="parcours.retime" :label="t('studioPanel.settings.retime')" :desc="t('studioPanel.settings.retimeDesc')" @update:model-value="parcours.retime = $event; afterEdit()" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.studio { display: flex; flex-direction: column; height: 100%; min-height: 0; color: var(--ink); font-family: var(--sans); font-size: 12.5px; }
.studio-bar { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-bottom: 1px solid var(--line-soft); flex: none; flex-wrap: wrap; }
.studio-brand { display: flex; align-items: center; gap: 6px; min-width: 0; }
.studio-brand > i { color: var(--accent); }
.studio-name { background: var(--row); border: 1px solid var(--line-soft); border-radius: 6px; color: var(--ink); padding: 4px 8px; font: inherit; font-weight: 600; width: 180px; min-width: 0; }
.studio-select { background: var(--row); border: 1px solid var(--line-soft); border-radius: 6px; color: var(--ink-2); padding: 4px 6px; font: inherit; max-width: 200px; }
.sbtn { height: 28px; padding: 0 10px; border: 1px solid var(--line); background: var(--row); border-radius: 6px; color: var(--ink); font: inherit; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.sbtn:hover { background: var(--row-on); }
.sbtn:disabled { opacity: .45; cursor: default; }
.sbtn-primary { background: var(--accent-soft, oklch(0.70 0.17 245 / .18)); border-color: oklch(0.70 0.17 245 / .5); }
.sbtn-danger { color: var(--red); margin-top: 6px; }
.sbtn kbd { font: 10px var(--mono); color: var(--ink-3); border: 1px solid var(--line); border-radius: 4px; padding: 0 4px; }
.studio-transport { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.tbtn { width: 30px; height: 28px; border: 1px solid var(--line); background: var(--row); border-radius: 6px; color: var(--ink); display: grid; place-items: center; cursor: pointer; font-size: 11px; }
.tbtn:hover { background: var(--row-on); }
.tbtn-play[aria-pressed="true"] { background: oklch(0.72 0.17 150 / .18); border-color: oklch(0.72 0.17 150 / .5); }
.tbtn-rec { color: var(--red); border-color: oklch(0.65 0.2 25 / .5); }
.tbtn-rec[aria-pressed="true"] { background: oklch(0.65 0.2 25 / .18); animation: studio-blink 1.2s steps(2) infinite; }
@keyframes studio-blink { 50% { box-shadow: 0 0 0 3px oklch(0.65 0.2 25 / .25); } }
@media (prefers-reduced-motion: reduce) { .tbtn-rec[aria-pressed="true"] { animation: none; } }
.studio-tc { font-family: var(--mono); font-size: 14px; font-weight: 600; letter-spacing: .02em; padding: 3px 10px; background: var(--row); border: 1px solid var(--line); border-radius: 6px; font-variant-numeric: tabular-nums; min-width: 128px; text-align: center; }
.studio-tc small { color: var(--ink-3); font-size: 11px; margin-left: 6px; }
.studio-status { font-family: var(--mono); font-size: 11px; color: var(--ink-3); min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 32ch; }
.studio-status .err { color: var(--red); }
.studio-main { display: grid; grid-template-columns: minmax(0, 1fr) 280px; flex: 1; min-height: 0; }
.studio-timeline { display: grid; grid-template-columns: 112px minmax(0, 1fr); min-height: 0; overflow: hidden; }
.studio-heads { border-right: 1px solid var(--line-soft); }
.studio-heads .ruler { height: 20px; border-bottom: 1px solid var(--line-soft); display: flex; align-items: center; padding: 0 8px; font: 10px var(--mono); color: var(--ink-3); letter-spacing: .05em; }
.studio-heads .hd { display: flex; align-items: center; gap: 7px; padding: 0 8px; border-bottom: 1px solid var(--line-soft); font-size: 11.5px; font-weight: 600; color: var(--ink-2); }
.dot { width: 8px; height: 8px; border-radius: 2px; flex: none; }
.dot.cam { background: oklch(0.72 0.15 245); } .dot.look { background: oklch(0.72 0.16 320); } .dot.disc { background: oklch(0.78 0.14 75); }
.studio-canvas { position: relative; overflow: hidden; }
.studio-canvas canvas { display: block; width: 100%; touch-action: none; cursor: crosshair; }
.studio-insp { border-left: 1px solid var(--line-soft); padding: 6px 10px 10px; overflow: auto; min-height: 0; display: flex; flex-direction: column; gap: 4px; }
.studio-insp h3 { margin: 6px 0 4px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); display: flex; justify-content: space-between; }
.studio-insp h3 small { font-family: var(--mono); text-transform: none; letter-spacing: 0; }
.scope { display: flex; gap: 6px; margin: 2px 0 4px; }
.chip { border: 1px solid var(--line); background: var(--row); color: var(--ink-2); border-radius: 999px; padding: 3px 10px; font-size: 11.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-family: inherit; }
.chip i { width: 7px; height: 7px; border-radius: 50%; opacity: .35; }
.chip.cam i { background: oklch(0.72 0.15 245); } .chip.look i { background: oklch(0.72 0.16 320); }
.chip[aria-pressed="true"] { color: var(--ink); } .chip[aria-pressed="true"] i { opacity: 1; }
.chip.cam[aria-pressed="true"] { background: oklch(0.72 0.15 245 / .18); border-color: oklch(0.72 0.15 245 / .5); }
.chip.look[aria-pressed="true"] { background: oklch(0.72 0.16 320 / .18); border-color: oklch(0.72 0.16 320 / .5); }
.readout { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-2); padding: 2px 0; }
.readout b { font-family: var(--mono); color: var(--ink); font-weight: 600; }
.swatch { height: 12px; border-radius: 4px; margin: 2px 0 4px; border: 1px solid var(--line-soft); }
.empty { color: var(--ink-3); font-size: 12px; margin: 8px 0; line-height: 1.45; }
@media (max-width: 900px) {
  .studio-main { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
  .studio-insp { border-left: 0; border-top: 1px solid var(--line-soft); }
  .studio-transport { margin-left: 0; }
}
</style>
