<script setup lang="ts">
import ExpmapEffectsControls from './ExpmapEffectsControls.vue'
import { documentEffects } from '../expmap/effects'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { MandelbrotExposed } from '../types/MandelbrotExposed'
import { parkExpmapSession } from '../expmap/session'
import type { Engine } from '../Engine'
import { expmapLastView, expmapOpenDocument, expmapPreviewView } from '../expmap/runtime'
import { expmapLibraryEntries, expmapLibraryFilename, openExpmapLibraryEntry, selectedExpmapDocumentId } from '../expmap/library'
import { EXPMAP_SAMPLE_LIMITS, expmapPlayerResolution } from '../expmap/renderer'
import { ExpmapGpuPlayer } from '../expmap/gpuPlayer'
import { interpolateScale, scaleDoublements } from '../expmap/decimal'
import { magnitudeSummary } from '../expmap/controls'
import { advanceExpmapPlayback, expmapTimeLabel } from '../expmap/playback'
const props = defineProps<{ engine: Engine | null; controller: MandelbrotExposed | null }>()
const surface = ref<HTMLElement | null>(null), canvas = ref<HTMLCanvasElement | null>(null)
let exactPreview: { position: number; scale: string } | null = null
const position = ref(0), angle = ref(0), error = ref(''), loading = ref(false), ready = ref(false)
const maxSamples=ref(16), renderedResolution=ref('')
const playing = ref(false), rate = ref(1), direction = ref(1), loop = ref(false)
const title = computed(() => { const entry = expmapLibraryEntries.value.find(e => e.id === expmapOpenDocument.value?.manifest.documentId); return entry ? expmapLibraryFilename(entry) : 'ExpMap' })
const magnitude = computed(() => { const d = expmapOpenDocument.value?.manifest.projection.domain; return d ? magnitudeSummary(d.startScale, d.endScale) : '' })
let selectionGeneration = 0
async function selectDocument(id: string) {
  const entry = expmapLibraryEntries.value.find(e => e.id === id), current = ++selectionGeneration
  if (!entry) return
  playing.value = false
  try {
    const opened = await openExpmapLibraryEntry(entry)
    if (current !== selectionGeneration || !expmapOpenDocument.value) return
    selectedExpmapDocumentId.value = id; expmapOpenDocument.value = opened
  } catch (e) { if (current === selectionGeneration) error.value = String(e) }
}
const duration = computed(() => {
  const domain = expmapOpenDocument.value?.manifest.projection.domain
  return domain ? Math.max(0.001, scaleDoublements(domain.startScale, domain.endScale) / 2 || 5) : 5
})
let release: (() => void) | undefined, raf = 0, previousTime = 0, returnFocus: HTMLElement | null = null
const player = new ExpmapGpuPlayer((image, view) => {
  const target = canvas.value
  if (!target) { image.close(); return }
  target.width = view.width; target.height = view.height
  target.getContext('bitmaprenderer')!.transferFromImageBitmap(image)
  const id = expmapOpenDocument.value?.manifest.documentId
  if (id) expmapLastView.value = { documentId: id, scale: view.scale, angle: view.angle }
  renderedResolution.value=`${view.width} × ${view.height} px · AA ≤ ${view.maxSamples ?? 1}`
  loading.value = false
}, failure => { error.value = String(failure); loading.value = false; playing.value = false })
function request() {
  const doc = expmapOpenDocument.value
  if (!doc || !ready.value) return
  const p = doc.manifest.projection
  const {width,height}=expmapPlayerResolution(p,surface.value?.clientWidth || window.innerWidth,
    surface.value?.clientHeight || window.innerHeight,window.devicePixelRatio)
  loading.value = true; error.value = ''
  player.request({ effects: { ...documentEffects(doc.manifest.documentId) }, width, height, maxSamples:maxSamples.value, scale: exactPreview?.position === position.value ? exactPreview.scale : interpolateScale(p.domain.startScale, p.domain.endScale, position.value), angle: angle.value })
}
function seek(value: number) { playing.value = false; position.value = Math.max(0, Math.min(1, value)) }
function togglePlay() {
  if (!ready.value) return
  if (!playing.value && ((direction.value > 0 && position.value >= 1) || (direction.value < 0 && position.value <= 0))) position.value = direction.value > 0 ? 0 : 1
  playing.value = !playing.value
}
function tick(now: number) {
  if (!playing.value) return
  // Let a requested frame finish: repeatedly aborting it would starve playback.
  if (!loading.value) {
    const next = advanceExpmapPlayback(position.value, (now - previousTime) / 1000, duration.value, rate.value, direction.value, loop.value)
    previousTime = now; position.value = next.position
    if (next.ended) { playing.value = false; return }
  }
  raf = requestAnimationFrame(tick)
}
watch(playing, value => { cancelAnimationFrame(raf); if (value) { previousTime = performance.now(); raf = requestAnimationFrame(tick) } })
async function fullscreen() {
  try {
    if (document.fullscreenElement === surface.value) await document.exitFullscreen()
    else await surface.value?.requestFullscreen()
  } catch (e) { error.value = String(e) }
}
function close() {
  selectionGeneration++
  playing.value = false
  if (document.fullscreenElement === surface.value) void document.exitFullscreen().catch(() => {})
  expmapOpenDocument.value = null
}
function keyboard(event: KeyboardEvent) {
  if (!expmapOpenDocument.value) return
  const target = event.target as HTMLElement | null
  if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); return }
  if (event.key === 'Tab') {
    const controls = Array.from(surface.value?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,summary') ?? [])
    const first = controls[0], last = controls[controls.length - 1]
    if (first && (event.shiftKey ? target === first || target === surface.value : target === last || target === surface.value)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus()
    }
    return
  }
  if (target?.matches('input,select,textarea,button,summary') || target?.isContentEditable) return
  const actions: Record<string, () => void> = {
    ' ': togglePlay, ArrowLeft: () => seek(position.value - 5 / duration.value), ArrowRight: () => seek(position.value + 5 / duration.value),
    Home: () => seek(0), End: () => seek(1), f: () => { void fullscreen() },
  }
  if (actions[event.key]) { event.preventDefault(); event.stopImmediatePropagation(); actions[event.key]() }
}
function visibility() { if (document.hidden) playing.value = false }
watch([expmapOpenDocument, () => props.engine], async ([doc], _previous, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  playing.value = false; ready.value = false
  player.dispose(); release?.(); release = undefined
  exactPreview = null
  position.value = 0; angle.value = 0; error.value = ''; renderedResolution.value = ''
  if (!doc) { returnFocus?.focus(); returnFocus = null; return }
  const preview = expmapPreviewView.value
  if (preview?.documentId === doc.manifest.documentId) {
    const d = doc.manifest.projection.domain, distance = scaleDoublements(d.startScale, d.endScale)
    position.value = distance ? Math.max(0, Math.min(1, scaleDoublements(d.startScale, preview.scale) / distance)) : 0
    exactPreview = { position: position.value, scale: preview.scale }
    angle.value = preview.angle
    expmapPreviewView.value = null
  }
  if (!returnFocus) returnFocus = document.activeElement as HTMLElement | null
  release = parkExpmapSession(props.engine, props.controller)
  loading.value = true
  await nextTick(); if (!current) return
  surface.value?.focus()
  try { if (await player.setSource(doc.store, doc.manifest, props.engine?.device)) { ready.value = true; request() } }
  catch (e) { if (current) { error.value = String(e); loading.value = false } }
}, { immediate: true })
watch([position, angle, maxSamples], request)
watch(() => expmapOpenDocument.value ? documentEffects(expmapOpenDocument.value.manifest.documentId) : null, request, { deep: true })
let sizeObserver:ResizeObserver|undefined, densityQuery:MediaQueryList|undefined
function watchDensity() {
  densityQuery?.removeEventListener('change',densityChanged)
  densityQuery=window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
  densityQuery.addEventListener('change',densityChanged)
}
function densityChanged() {watchDensity();request()}
watch(surface, element=>{
  sizeObserver?.disconnect()
  if(element) {sizeObserver=new ResizeObserver(request);sizeObserver.observe(element)}
})
onMounted(() => { watchDensity(); window.addEventListener('keydown', keyboard, true); window.addEventListener('resize', request); document.addEventListener('visibilitychange', visibility) })
onUnmounted(() => {
  sizeObserver?.disconnect();densityQuery?.removeEventListener('change',densityChanged)
  cancelAnimationFrame(raf); player.dispose(); release?.()
  window.removeEventListener('keydown', keyboard, true); window.removeEventListener('resize', request); document.removeEventListener('visibilitychange', visibility)
})
</script>
<template>
  <Teleport to="body">
    <div v-if="expmapOpenDocument" ref="surface" class="expmap-surface" role="dialog" aria-modal="true" aria-label="Lecteur ExpMap" tabindex="-1" @wheel.prevent="seek(position + $event.deltaY / 5000)" @pointerdown.stop @keydown.stop>
      <canvas ref="canvas" @click="togglePlay" aria-label="Rendu ExpMap" />
      <header><div><strong>LECTEUR EXPMAP</strong><select aria-label="Fichier ExpMap du lecteur" :title="title" :value="expmapOpenDocument.manifest.documentId" @change="selectDocument(($event.target as HTMLSelectElement).value)"><option v-for="entry in expmapLibraryEntries.filter(e => e.state === 'ready')" :key="entry.id" :value="entry.id">{{ expmapLibraryFilename(entry) }}</option></select><small>{{ magnitude }}</small><small>Apparence cuite · {{ playing ? 'Lecture' : 'Pause' }}</small><small class="resolution" aria-label="Résolution et AA du rendu">{{ renderedResolution }}</small></div><button class="exit" @click="close">✕ Quitter <small>Échap</small></button></header>
      <div class="expmap-controls" @wheel.stop>
        <div class="timeline"><span>{{ expmapTimeLabel(position * duration) }}</span><input :value="position" @input="seek(Number(($event.target as HTMLInputElement).value))" aria-label="Position de lecture" type="range" min="0" max="1" step="0.0001"><span>{{ expmapTimeLabel(duration) }}</span></div>
        <div class="transport">
          <button title="Retour au début" @click="seek(0)">⏮</button>
          <button class="play" :disabled="!ready" :aria-label="playing ? 'Pause' : 'Lecture'" @click="togglePlay">{{ playing ? '❚❚ Pause' : '▶ Lecture' }}</button>
          <button title="Reculer de 5 secondes" @click="seek(position - 5 / duration)">−5 s</button><button title="Avancer de 5 secondes" @click="seek(position + 5 / duration)">+5 s</button>
          <label>Vitesse <select v-model.number="rate"><option v-for="value in [0.25,0.5,1,2,4]" :key="value" :value="value">{{ value }}×</option></select></label>
          <button :aria-pressed="direction === -1" @click="direction *= -1">{{ direction === 1 ? '→ Zoom' : '← Dézoom' }}</button>
          <button :aria-pressed="loop" @click="loop = !loop">↻ Boucle</button>
          <label>Rotation <input v-model.number="angle" aria-label="Rotation ExpMap" type="range" min="-6.283185" max="6.283185" step="0.01" @input="playing = false"></label>
          <label title="Maximum de prélèvements par pixel, selon la densité disponible">AA <select v-model.number="maxSamples" aria-label="Prélèvements AA maximum"><option v-for="value in EXPMAP_SAMPLE_LIMITS" :key="value" :value="value">{{ value === 1 ? 'Non' : value }}</option></select></label>
          <button v-if="surface?.requestFullscreen" @click="fullscreen">Plein écran</button>
          <span class="status" role="status">{{ loading ? 'Chargement…' : '2 doublements/s à 1×' }}</span>
        </div>
        <ExpmapEffectsControls :document-id="expmapOpenDocument.manifest.documentId"/>
        <p v-if="error" role="alert">{{ error }}</p>
      </div>
    </div>
  </Teleport>
</template>
<style scoped>
.expmap-surface{position:fixed;inset:0;z-index:10000;background:#050609;color:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:12px;outline:none}.expmap-surface canvas{max-width:100%;max-height:100%;width:auto;height:100%;object-fit:contain}.expmap-surface header{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 18px;background:linear-gradient(#080b13ed,transparent)}header div{display:flex;gap:12px;align-items:center;flex-wrap:wrap}header strong{color:#9abaff;font-size:11px;letter-spacing:.12em}header small{color:#abb4c7}.expmap-controls{position:absolute;bottom:max(12px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(960px,calc(100% - 24px));padding:10px 12px;background:#121827f2;border:1px solid #35415c;border-radius:12px;box-shadow:0 8px 30px #0008}.timeline{display:flex;align-items:center;gap:10px;font-variant-numeric:tabular-nums;margin-bottom:8px}.timeline input{flex:1;min-width:40px}.transport{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.transport label{display:flex;align-items:center;gap:5px}.transport label input{width:85px}button,select{color:inherit;background:#263047;border:1px solid #455271;border-radius:6px;padding:6px 9px;cursor:pointer}button:hover{background:#364563}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #a8c5ff;outline-offset:2px}button[aria-pressed=true],.play{background:#334f7c}button:disabled{opacity:.5;cursor:default}.exit{white-space:nowrap}.exit small{margin-left:8px}.status{color:#b7c6df;margin-left:auto}.expmap-controls p{color:#ffc2b9;margin:8px 0 0}@media(max-width:600px){header small:not(.resolution){display:none}.expmap-surface header{padding:10px}.transport{gap:6px}button,select{min-height:36px}.status{width:100%;margin:0}.expmap-controls{padding:8px}}
</style>
