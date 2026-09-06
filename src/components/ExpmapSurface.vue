<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import type { MandelbrotExposed } from '../types/MandelbrotExposed'
import { parkExpmapSession } from '../expmap/session'
import type { Engine } from '../Engine'
import { expmapLastView, expmapOpenDocument } from '../expmap/runtime'
import { ExpmapGpuPlayer } from '../expmap/gpuPlayer'
import { interpolateScale } from '../expmap/decimal'
const props = defineProps<{ engine: Engine | null; controller: MandelbrotExposed | null }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const position = ref(0), angle = ref(0), error = ref(''), loading = ref(false)
let release: (() => void) | undefined
const player = new ExpmapGpuPlayer((image, view) => {
  const target = canvas.value
  if (!target) { image.close(); return }
  target.width = view.width; target.height = view.height
  target.getContext('bitmaprenderer')!.transferFromImageBitmap(image)
  const id = expmapOpenDocument.value?.manifest.documentId
  if (id) expmapLastView.value = { documentId: id, scale: view.scale, angle: view.angle }
  loading.value = false
}, failure => { error.value = String(failure); loading.value = false })
function request() {
  const doc = expmapOpenDocument.value
  if (!doc) return
  const p = doc.manifest.projection
  // Match the available display size up to the document resolution.
  const factor = Math.min(1, window.innerWidth / p.width, window.innerHeight / p.height)
  const height = Math.max(1, Math.floor(p.height * factor))
  const width = Math.max(1, Math.floor(height * p.width / p.height))
  loading.value = true; error.value = ''
  player.request({ width, height, scale: interpolateScale(p.domain.startScale, p.domain.endScale, position.value), angle: angle.value })
}
watch([expmapOpenDocument, () => props.engine], async ([doc], _previous, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  player.dispose(); release?.(); release = undefined
  expmapLastView.value = null
  position.value = 0; angle.value = 0; error.value = ''
  if (!doc) return
  release = parkExpmapSession(props.engine, props.controller)
  loading.value = true
  try { if (await player.setSource(doc.store, doc.manifest, props.engine?.device)) request() }
  catch (e) { if (current) { error.value = String(e); loading.value = false } }
}, { immediate: true })
watch([position, angle], request)
onUnmounted(() => { player.dispose(); release?.() })
</script>
<template>
  <div v-if="expmapOpenDocument" class="expmap-surface" @wheel.prevent="position = Math.max(0, Math.min(1, position + $event.deltaY / 5000))" @pointerdown.stop>
    <canvas ref="canvas" />
    <div class="expmap-controls dense" @wheel.stop>
      <span>ExpMap · lecture GPU · apparence cuite</span>
      <label>Zoom <input v-model.number="position" aria-label="Zoom ExpMap" type="range" min="0" max="1" step="0.001"></label>
      <label>Rotation <input v-model.number="angle" aria-label="Rotation ExpMap" type="range" min="-6.283185" max="6.283185" step="0.01"></label>
      <span v-if="loading">Reconstruction…</span><span v-if="error" role="alert">{{ error }}</span>
      <button @click="expmapOpenDocument = null">Retour Mandelbrot</button>
    </div>
  </div>
</template>
<style scoped>
.expmap-surface{position:fixed;inset:0;z-index:5;background:#000;display:flex;align-items:center;justify-content:center}.expmap-surface canvas{max-width:100%;max-height:100%;width:auto;height:100%;object-fit:contain}.expmap-controls{position:absolute;bottom:18px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;max-width:90%;padding:8px;background:#191b22ed;color:#eee;font-size:11px;border-radius:6px}.expmap-controls label{display:flex;align-items:center;gap:4px}.expmap-controls input{width:90px}
</style>
