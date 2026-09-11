<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { rgb } from 'd3-color'
import { Palette } from '../Palette'
import { applyStopTransferCurve } from '../ColorStop'
import type { MandelbrotParams } from '../Mandelbrot'
import type { Engine } from '../Engine'
import { getAllPaletteEntries, type PaletteRecord } from '../paletteStore'
import { getAllPresetEntries, getPresetById, type PresetMetadata } from '../presetStore'
import { newPalettePath, snapshotPathAppearance, validatePalettePath, pathSegment, type PalettePath } from '../palettePath'
import { readPalettePaths, savePalettePath, deletePalettePath } from '../palettePathStore'
import { log10FromDecimalString } from '../floatexp'
import { savePalettePathSnapshot } from '../savePalettePathSnapshot'
const props = defineProps<{ current: MandelbrotParams; engine: Engine | null; disabled?: boolean }>()
const emit = defineEmits<{ change: [path: PalettePath]; 'palette-saved': [] }>()
const depth = computed(() => -log10FromDecimalString(props.current.scale))
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const draft = ref<PalettePath>(props.current.palettePath ? copy(props.current.palettePath) : newPalettePath(props.current, Number.isFinite(depth.value) ? depth.value : 0))
const selected = ref(draft.value.stops[0].id), savedId = ref('')
const saved = ref<PalettePath[]>([]), palettes = ref<PaletteRecord[]>([]), error = ref(''), status = ref('')
const presets = ref<PresetMetadata[]>([]), picker = ref<'palettes' | 'presets' | null>(null), query = ref(''), loadingPreset = ref(false)
const savingSnapshot = ref(false), snapshotStatus = ref('')
async function extractCurrentMix() {
  if (props.disabled || savingSnapshot.value) return
  savingSnapshot.value = true; error.value = ''; snapshotStatus.value = ''
  try {
    const palette = await savePalettePathSnapshot(props.current.palettePath ?? draft.value, depth.value, props.current)
    snapshotStatus.value = `Palette « ${palette.name} » enregistrée dans la bibliothèque.`
    emit('palette-saved')
    palettes.value = await getAllPaletteEntries()
  } catch (e) { error.value = String(e) }
  finally { savingSnapshot.value = false }
}
const filteredPalettes = computed(() => palettes.value.filter(p => p.name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())))
const filteredPresets = computed(() => presets.value.filter(p => p.name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())))
function paletteGradient(p: PaletteRecord) {
  const palette = new Palette(p.colorStops, p.interpolationMode)
  return `linear-gradient(to right, ${Array.from({ length: 24 }, (_, i) => palette.getColorAt(i / 23)).join(',')})`
}
async function openPicker(source: 'palettes' | 'presets') {
  picker.value = picker.value === source ? null : source; query.value = ''; error.value = ''
  try {
    if (picker.value === 'presets') presets.value = await getAllPresetEntries()
    else if (picker.value === 'palettes') palettes.value = await getAllPaletteEntries()
  } catch (e) { error.value = String(e) }
}
async function extractPreset(preset: PresetMetadata) {
  const stopId = stop.value.id
  loadingPreset.value = true; error.value = ''
  try {
    const record = await getPresetById(preset.id)
    if (!record) throw new Error('Ce preset n’est plus disponible.')
    const target = draft.value.stops.find(s => s.id === stopId)
    if (!target || props.disabled) return
    target.appearance = snapshotPathAppearance(record.value); target.name = preset.name || 'Preset sans nom'
    picker.value = null; publish()
  } catch (e) { error.value = String(e) }
  finally { loadingPreset.value = false }
}
const canvas = ref<HTMLCanvasElement>(), dragging = ref(false)
const stop = computed(() => draft.value.stops.find(s => s.id === selected.value) ?? draft.value.stops[0])
const start = computed(() => draft.value.stops[0].magnitude), end = computed(() => draft.value.stops[draft.value.stops.length - 1].magnitude)
const percent = (m: number) => 100 * (m - start.value) / (end.value - start.value)
const progress = computed(() => Math.max(0, Math.min(100, percent(depth.value))))
function guard(action: () => void) { error.value = ''; try { action() } catch (e) { error.value = String(e) } }
function publish() { guard(() => { draft.value = validatePalettePath(draft.value); delete draft.value.resourceHashes; emit('change', copy(draft.value)) }) }
function refresh() { guard(() => { saved.value = readPalettePaths() }) }
function chooseSaved() {
  const p = saved.value.find(p => p.id === savedId.value)
  if (p) { draft.value = copy(p); selected.value = p.stops[0].id; publish() }
}
function save(duplicate = false) { guard(() => {
  if (duplicate) { draft.value.id = crypto.randomUUID(); draft.value.name += ' · copie' }
  savePalettePath(draft.value); savedId.value = draft.value.id; refresh(); publish()
}) }
function removeSaved() { guard(() => { deletePalettePath(savedId.value); savedId.value = ''; refresh() }) }
function create() { draft.value = newPalettePath(props.current, Number.isFinite(depth.value) ? depth.value : 0); selected.value = draft.value.stops[0].id; savedId.value = ''; publish() }
function setRange(value: string, first: boolean) { guard(() => {
  const a = first ? Number(value) : start.value, b = first ? end.value : Number(value)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b - a < 0.001) throw new Error('La magnitude d’arrivée doit dépasser celle du départ.')
  const oldA = start.value, span = end.value - oldA
  draft.value.stops.forEach(s => { s.magnitude = a + (s.magnitude - oldA) / span * (b - a) }); publish()
}) }
function add(m = depth.value) {
  if (draft.value.stops.length >= 64) return
  const magnitude = Math.max(start.value + 0.0002, Math.min(end.value - 0.0002, m))
  if (draft.value.stops.some(s => Math.abs(s.magnitude - magnitude) < 0.0001)) return
  const s = { id: crypto.randomUUID(), magnitude, name: 'Palette actuelle', appearance: snapshotPathAppearance(props.current), curve: 'linear' as const }
  draft.value.stops.push(s); draft.value.stops.sort((a, b) => a.magnitude - b.magnitude); selected.value = s.id; publish()
}
function addInGap() {
  const stops = draft.value.stops
  let index = stops.findIndex(s => s.id === selected.value)
  if (index >= stops.length - 1 || stops[index + 1].magnitude - stops[index].magnitude < 0.0004) {
    index = 0
    for (let i = 1; i < stops.length - 1; i++) if (stops[i + 1].magnitude - stops[i].magnitude > stops[index + 1].magnitude - stops[index].magnitude) index = i
  }
  add((stops[index].magnitude + stops[index + 1].magnitude) / 2)
}
function removeStop() { if (draft.value.stops.length <= 2) return; draft.value.stops = draft.value.stops.filter(s => s.id !== selected.value); selected.value = draft.value.stops[0].id; publish() }
function choosePalette(palette: PaletteRecord) {
  stop.value.appearance = snapshotPathAppearance(palette); stop.value.name = palette.name; picker.value = null; publish()
}
function capture() { stop.value.appearance = snapshotPathAppearance(props.current); stop.value.name = 'Palette actuelle'; publish() }
function moveStop(value: number) {
  const i = draft.value.stops.findIndex(s => s.id === selected.value)
  if (i <= 0 || i >= draft.value.stops.length - 1) return
  stop.value.magnitude = Math.max(draft.value.stops[i - 1].magnitude + 0.0001, Math.min(draft.value.stops[i + 1].magnitude - 0.0001, value))
}
function pointer(event: PointerEvent, id: string) { selected.value = id; dragging.value = true; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId) }
function drag(event: PointerEvent) {
  if (!dragging.value || !canvas.value) return
  const box = canvas.value.getBoundingClientRect(); moveStop(start.value + (event.clientX - box.left) / box.width * (end.value - start.value))
}
function drop() { if (!dragging.value) return; dragging.value = false; publish() }
function paint() {
  const ctx = canvas.value?.getContext('2d'); if (!ctx) return
  const w = 600, h = 48, img = ctx.createImageData(w, h)
  const rows = draft.value.stops.map(s => { const p = new Palette(s.appearance.colorStops, s.appearance.interpolationMode); return Array.from({ length: h }, (_, y) => rgb(p.getColorAt(y / (h - 1)))) })
  for (let x = 0; x < w; x++) {
    const segment = pathSegment(draft.value, start.value + x / (w - 1) * (end.value - start.value))!
    const t = applyStopTransferCurve(draft.value.stops[segment.a].curve, segment.t)
    for (let y = 0; y < h; y++) {
      const a = rows[segment.a][y], b = rows[segment.b][y], i = (y * w + x) * 4
      img.data[i] = a.r + (b.r - a.r) * t; img.data[i + 1] = a.g + (b.g - a.g) * t; img.data[i + 2] = a.b + (b.b - a.b) * t; img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}
watch(() => props.current.palettePath, p => { if (p) { draft.value = copy(p); if (!p.stops.some(s => s.id === selected.value)) selected.value = p.stops[0].id } })
watch(draft, () => { void nextTick(paint) }, { deep: true })
let timer: ReturnType<typeof setInterval> | undefined
onMounted(async () => { refresh(); try { palettes.value = await getAllPaletteEntries() } catch (e) { error.value = String(e) }; paint(); timer = setInterval(() => { status.value = props.engine?.palettePathStatus ?? '' }, 400) })
onUnmounted(() => clearInterval(timer))
</script>
<template>
  <div class="palette-path-panel">
    <fieldset :disabled="disabled">
      <label class="enable"><input v-model="draft.enabled" type="checkbox" @change="publish"> Activer le parcours</label>
      <div class="row"><label>Application<select v-model="draft.mode" @change="publish"><option value="radial">Cercles concentriques</option><option value="global">Toute l’image</option></select></label><label>Hors plage<select v-model="draft.outside" @change="publish"><option value="hold">Palette de début / fin</option><option value="manual">Palette manuelle</option></select></label></div>
      <p class="hint">La magnitude augmente en zoomant. En mode cercles, la profondeur varie avec la distance au centre de la vue.</p>
      <div class="row"><label>Départ<input type="number" step="0.1" :value="start" @change="setRange(($event.target as HTMLInputElement).value, true)"></label><label>Arrivée<input type="number" step="0.1" :value="end" @change="setRange(($event.target as HTMLInputElement).value, false)"></label></div>
      <div class="timeline">
        <canvas ref="canvas" width="600" height="48" aria-label="Parcours de palettes" @dblclick="add(start + $event.offsetX / ($event.target as HTMLElement).clientWidth * (end - start))" />
        <span class="cursor" :style="{ left: progress + '%' }" :title="'Magnitude actuelle : ' + depth.toFixed(3)"></span>
        <button v-for="s in draft.stops" :key="s.id" class="stop" :class="{ selected: s.id === selected }" :style="{ left: percent(s.magnitude) + '%' }" :aria-label="s.name + ' à ' + s.magnitude" :title="s.name + ' · ' + s.magnitude.toFixed(3)" @pointerdown="pointer($event, s.id)" @pointermove="drag" @pointerup="drop" @pointercancel="drop" @click="selected = s.id">◆</button>
      </div>
      <div class="row toolbar"><span>{{ draft.stops.length }} stops · {{ depth.toFixed(3) }}</span><button @click="addInGap" :disabled="draft.stops.length >= 64">+ Stop</button><button @click="removeStop" :disabled="draft.stops.length <= 2">Supprimer le stop</button></div>
      <button :disabled="savingSnapshot || !Number.isFinite(depth)" @click="extractCurrentMix">{{ savingSnapshot ? 'Capture en cours…' : 'Extraire la palette au curseur' }}</button>
      <p class="hint">Enregistre le mix à la magnitude actuelle, avec ses matériaux et images. Approximation éditable sur 200 points ; en mode cercles, capture au curseur uniquement.</p>
      <p v-if="snapshotStatus" class="hint" role="status">{{ snapshotStatus }}</p>
      <div class="selected-stop">
        <strong>{{ stop.name }}</strong>
        <div class="row"><label>Magnitude<input type="number" step="0.01" :value="stop.magnitude" :disabled="stop.id === draft.stops[0].id || stop.id === draft.stops[draft.stops.length - 1].id" @change="moveStop(Number(($event.target as HTMLInputElement).value)); publish()"></label><label>Transition suivante<select v-model="stop.curve" @change="publish"><option value="linear">Linéaire</option><option value="gaussian">Gaussienne</option><option value="square">Carrée</option><option value="exponential">Exponentielle</option></select></label></div>
        <div class="row toolbar">
          <button :aria-expanded="picker === 'palettes'" @click="openPicker('palettes')">Choisir une palette…</button>
          <button :aria-expanded="picker === 'presets'" @click="openPicker('presets')">Extraire d’un preset…</button>
        </div>
        <div v-if="picker" class="appearance-picker" :aria-busy="loadingPreset">
          <label>Rechercher<input v-model="query" type="search" placeholder="Nom…"></label>
          <div class="appearance-grid">
            <template v-if="picker === 'palettes'">
              <button v-for="p in filteredPalettes" :key="p.name" class="appearance-card" :title="p.name" @click="choosePalette(p)">
                <img v-if="p.thumbnail" :src="p.thumbnail" alt="" loading="lazy">
                <span v-else class="palette-swatch" :style="{ background: paletteGradient(p) }"></span>
                <span>{{ p.name }}</span>
              </button>
              <p v-if="!filteredPalettes.length" class="hint">Aucune palette trouvée.</p>
            </template>
            <template v-else>
              <button v-for="p in filteredPresets" :key="p.id" class="appearance-card preset-card" :title="p.name || 'Preset sans nom'" :disabled="loadingPreset" @click="extractPreset(p)">
                <img v-if="p.thumbnail" :src="p.thumbnail" alt="" loading="lazy">
                <span v-else class="palette-swatch">Aperçu indisponible</span>
                <span>{{ p.name || 'Preset sans nom' }}</span>
              </button>
              <p v-if="!filteredPresets.length" class="hint">Aucun preset trouvé.</p>
            </template>
          </div>
          <p v-if="picker === 'presets'" class="hint">Copie les couleurs, matériaux et images dans ce stop.</p>
        </div>
        <button @click="capture">Copier la palette manuelle et ses matériaux</button>
      </div>
      <details><summary>Textures et calcul</summary><label>Résolution maximale des images<select v-model.number="draft.textureSize" @change="publish"><option :value="512">512 px</option><option :value="1024">1024 px</option><option :value="2048">2048 px</option></select></label><p class="hint">Images communes partagées, budget de 128 Mio. La fréquence orbitale et la géométrie des traps restent communes ; les poids des matériaux et effets varient entre les stops. L’ExpMap cuit toujours les cercles.</p></details>
      <hr>
      <label>Parcours enregistrés<select v-model="savedId" @change="chooseSaved"><option value="">Nouveau / non enregistré</option><option v-for="p in saved" :key="p.id" :value="p.id">{{ p.name }}</option></select></label>
      <label>Nom<input v-model="draft.name" maxlength="100" @change="publish"></label>
      <div class="row toolbar"><button @click="save()">Enregistrer</button><button @click="save(true)">Dupliquer</button><button @click="create">Nouveau</button><button :disabled="!savedId" @click="removeSaved">Supprimer</button></div>
      <p class="hint">Sauvegarde locale sur ce navigateur. Chaque stop conserve une copie de sa palette.</p>
    </fieldset>
    <p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="status" class="hint" role="status">{{ status }}</p>
  </div>
</template>
<style scoped>
.palette-path-panel{padding:10px;font-size:12px;max-width:620px;color:var(--ink,#e5e7eb)}fieldset{border:0;padding:0;margin:0;min-width:0}label{display:flex;flex-direction:column;gap:4px;margin:6px 0;flex:1;min-width:0}.enable{flex-direction:row;align-items:center;font-weight:600}.row{display:flex;gap:8px;align-items:center}.toolbar{flex-wrap:wrap;justify-content:space-between;margin:8px 0}input,select,button{font:inherit;color:var(--ink,#e5e7eb);background:var(--row,#252530);border:1px solid var(--line,#6665);border-radius:5px;padding:5px;min-width:0}button{cursor:pointer}button:disabled{opacity:.4}.hint{font-size:11px;opacity:.7;line-height:1.4}.timeline{position:relative;margin:12px 8px 20px;touch-action:none}canvas{display:block;width:100%;height:48px;border-radius:5px}.stop{position:absolute;bottom:-15px;transform:translateX(-50%);padding:0 3px;font-size:18px;background:var(--row,#20202c);color:var(--ink,#ccc);touch-action:none}.stop.selected{color:#e9beff;border-color:#db9aff;z-index:2}.cursor{position:absolute;top:0;bottom:0;width:2px;background:white;pointer-events:none;box-shadow:0 0 2px #000}.selected-stop strong{color:var(--ink,#e5e7eb)}.selected-stop{padding:8px;border:1px solid #8884;border-radius:6px}.error{color:#ff9999}hr{border:0;border-top:1px solid #8884;margin:12px 0}
.appearance-picker{padding:6px;border:1px solid var(--line,#6665);border-radius:5px}.appearance-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:6px;max-height:260px;overflow:auto}.appearance-card{display:flex;flex-direction:column;gap:4px;text-align:left;overflow:hidden}.appearance-card img,.palette-swatch{display:block;width:100%;height:36px;object-fit:cover;border-radius:3px}.preset-card img,.preset-card .palette-swatch{height:72px}.appearance-card>span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%}
</style>
