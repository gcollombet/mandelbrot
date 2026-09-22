<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { rgb } from 'd3-color'
import { Palette } from '../Palette'
import { applyStopTransferCurve } from '../ColorStop'
import type { MandelbrotParams } from '../Mandelbrot'
import type { Engine } from '../Engine'
import { getAllPaletteEntries, type PaletteRecord } from '../paletteStore'
import { getAllPresetEntries, getPresetById, type PresetMetadata } from '../presetStore'
import { newPalettePath, snapshotPathAppearance, validatePalettePath, pathSegment, type PalettePath, type PalettePathStop } from '../palettePath'
import { readPalettePaths, savePalettePath, deletePalettePath } from '../palettePathStore'
import { log10FromDecimalString } from '../floatexp'
import { savePalettePathSnapshot } from '../savePalettePathSnapshot'
import { DenseSection, DenseField, DenseSelect, DenseSeg, DenseToggle, DenseCard } from './dense'

const props = defineProps<{ current: MandelbrotParams; engine: Engine | null; disabled?: boolean; editingStopId?: string | null }>()
const emit = defineEmits<{ change: [path: PalettePath]; 'palette-saved': []; 'edit-stop': [stopId: string] }>()

const { t } = useI18n()
const MAGNITUDE_MIN = -10, MAGNITUDE_MAX = 1000, STOP_GAP = 0.0002
const CURVE_OPTIONS = computed(() => [
  { value: 'linear', label: t('palettePathPanel.curves.linear') }, { value: 'gaussian', label: t('palettePathPanel.curves.gaussian') },
  { value: 'square', label: t('palettePathPanel.curves.square') }, { value: 'exponential', label: t('palettePathPanel.curves.exponential') },
] as const)
const MODE_OPTIONS = computed(() => [{ value: 'radial', label: t('palettePathPanel.modes.radial') }, { value: 'global', label: t('palettePathPanel.modes.global') }])
const OUTSIDE_OPTIONS = computed(() => [{ value: 'hold', label: t('palettePathPanel.outside.hold') }, { value: 'manual', label: t('palettePathPanel.outside.manual') }])
const SIZE_OPTIONS = [{ value: 512, label: '512 px' }, { value: 1024, label: '1024 px' }, { value: 2048, label: '2048 px' }]

const depth = computed(() => -log10FromDecimalString(props.current.scale))
const depthOrZero = () => (Number.isFinite(depth.value) ? depth.value : 0)
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const draft = ref<PalettePath>(props.current.palettePath ? copy(props.current.palettePath) : newPalettePath(props.current, depthOrZero()))
const selected = ref(draft.value.stops[0].id), savedId = ref('')
const saved = ref<PalettePath[]>([]), palettes = ref<PaletteRecord[]>([]), error = ref(''), status = ref('')
const presets = ref<PresetMetadata[]>([]), picker = ref<'palettes' | 'presets' | null>(null), query = ref(''), loadingPreset = ref(false)
const savingSnapshot = ref(false), snapshotStatus = ref(''), saveStatus = ref('')

// ── Derived geometry ──
const stops = computed(() => draft.value.stops)
const stop = computed(() => stops.value.find(s => s.id === selected.value) ?? stops.value[0])
const stopIndex = computed(() => stops.value.findIndex(s => s.id === stop.value.id))
const isEndpoint = computed(() => stopIndex.value <= 0 || stopIndex.value >= stops.value.length - 1)
const start = computed(() => stops.value[0].magnitude), end = computed(() => stops.value[stops.value.length - 1].magnitude)
const percent = (m: number) => 100 * (m - start.value) / (end.value - start.value)
const progress = computed(() => Math.max(0, Math.min(100, percent(depth.value))))
const stopMin = computed(() => isEndpoint.value ? start.value : stops.value[stopIndex.value - 1].magnitude + STOP_GAP)
const stopMax = computed(() => isEndpoint.value ? end.value : stops.value[stopIndex.value + 1].magnitude - STOP_GAP)
const editingStop = computed(() => stops.value.find(s => s.id === props.editingStopId))
const savedOptions = computed(() => [{ value: '', label: t('palettePathPanel.savedNew') }, ...saved.value.map(p => ({ value: p.id, label: p.name }))])
const fmt = (v: number) => v.toFixed(2)

// ── Colour helpers: every stop shows the palette it carries ──
const paletteCache = new Map<string, Palette>()
function paletteOf(s: PalettePathStop): Palette {
  const key = JSON.stringify([s.appearance.colorStops, s.appearance.interpolationMode])
  let p = paletteCache.get(key)
  if (!p) { p = new Palette(s.appearance.colorStops, s.appearance.interpolationMode); paletteCache.set(key, p) }
  return p
}
const gradientOf = (p: Palette) => `linear-gradient(to right, ${Array.from({ length: 24 }, (_, i) => p.getColorAt(i / 23)).join(',')})`
const stopColor = (s: PalettePathStop) => paletteOf(s).getColorAt(0.5)
const stopGradient = (s: PalettePathStop) => gradientOf(paletteOf(s))
function paletteGradient(p: PaletteRecord) { return gradientOf(new Palette(p.colorStops, p.interpolationMode)) }

// ── Publishing: numeric scrubs are debounced so the GPU path is rebuilt once ──
function guard(action: () => void) { error.value = ''; try { action() } catch (e) { error.value = String(e) } }
function publish() { guard(() => { draft.value = validatePalettePath(draft.value); delete draft.value.resourceHashes; emit('change', copy(draft.value)) }) }
let publishTimer: ReturnType<typeof setTimeout> | undefined
function publishSoon() { clearTimeout(publishTimer); publishTimer = setTimeout(publish, 180) }

// ── Range and stops ──
function setRange(value: number, first: boolean) { guard(() => {
  const a = first ? value : start.value, b = first ? end.value : value
  if (!Number.isFinite(a) || !Number.isFinite(b) || b - a < 0.001) throw new Error(t('palettePathPanel.errors.endAfterStart'))
  const oldA = start.value, span = end.value - oldA
  stops.value.forEach(s => { s.magnitude = a + (s.magnitude - oldA) / span * (b - a) }); publishSoon()
}) }
function add(m = depth.value) {
  if (stops.value.length >= 64) return
  const magnitude = Math.max(start.value + STOP_GAP, Math.min(end.value - STOP_GAP, m))
  if (stops.value.some(s => Math.abs(s.magnitude - magnitude) < 0.0001)) return
  const s: PalettePathStop = { id: crypto.randomUUID(), magnitude, name: t('palettePathPanel.currentPalette'), appearance: snapshotPathAppearance(props.current), curve: 'linear' }
  stops.value.push(s); stops.value.sort((a, b) => a.magnitude - b.magnitude); selected.value = s.id; publish()
}
function addInGap() {
  let index = stopIndex.value
  if (index >= stops.value.length - 1 || stops.value[index + 1].magnitude - stops.value[index].magnitude < 2 * STOP_GAP) {
    index = 0
    for (let i = 1; i < stops.value.length - 1; i++) if (stops.value[i + 1].magnitude - stops.value[i].magnitude > stops.value[index + 1].magnitude - stops.value[index].magnitude) index = i
  }
  add((stops.value[index].magnitude + stops.value[index + 1].magnitude) / 2)
}
function removeStop() { if (stops.value.length <= 2) return; draft.value.stops = stops.value.filter(s => s.id !== selected.value); selected.value = stops.value[0].id; publish() }
function moveStop(value: number) {
  if (isEndpoint.value) return
  stop.value.magnitude = Math.max(stopMin.value, Math.min(stopMax.value, value))
}
function onMagnitude(value: number) { moveStop(value); publishSoon() }

// ── Timeline interaction ──
const canvas = ref<HTMLCanvasElement>(), strip = ref<HTMLElement>(), dragging = ref(false)
function pointer(event: PointerEvent, id: string) { selected.value = id; dragging.value = true; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId) }
function drag(event: PointerEvent) {
  if (!dragging.value || !strip.value) return
  const box = strip.value.getBoundingClientRect(); moveStop(start.value + (event.clientX - box.left) / box.width * (end.value - start.value))
}
function drop() { if (!dragging.value) return; dragging.value = false; publish() }
function addAt(event: MouseEvent) {
  if (!strip.value) return
  const box = strip.value.getBoundingClientRect(); add(start.value + (event.clientX - box.left) / box.width * (end.value - start.value))
}
function paint() {
  const ctx = canvas.value?.getContext('2d'); if (!ctx) return
  const w = 600, h = 44, img = ctx.createImageData(w, h)
  const rows = stops.value.map(s => { const p = paletteOf(s); return Array.from({ length: h }, (_, y) => rgb(p.getColorAt(y / (h - 1)))) })
  for (let x = 0; x < w; x++) {
    const segment = pathSegment(draft.value, start.value + x / (w - 1) * (end.value - start.value))!
    const t = applyStopTransferCurve(stops.value[segment.a].curve, segment.t)
    for (let y = 0; y < h; y++) {
      const a = rows[segment.a][y], b = rows[segment.b][y], i = (y * w + x) * 4
      img.data[i] = a.r + (b.r - a.r) * t; img.data[i + 1] = a.g + (b.g - a.g) * t; img.data[i + 2] = a.b + (b.b - a.b) * t; img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

// ── Filling a stop: library palette, complete preset, or the manual palette ──
const filteredPalettes = computed(() => palettes.value.filter(p => p.name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())))
const filteredPresets = computed(() => presets.value.filter(p => p.name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())))
async function openPicker(source: 'palettes' | 'presets') {
  picker.value = picker.value === source ? null : source; query.value = ''; error.value = ''
  try {
    if (picker.value === 'presets') presets.value = await getAllPresetEntries()
    else if (picker.value === 'palettes') palettes.value = await getAllPaletteEntries()
  } catch (e) { error.value = String(e) }
}
function choosePalette(palette: PaletteRecord) {
  stop.value.appearance = snapshotPathAppearance(palette); stop.value.name = palette.name; picker.value = null; publish()
}
async function extractPreset(preset: PresetMetadata) {
  const stopId = stop.value.id
  loadingPreset.value = true; error.value = ''
  try {
    const record = await getPresetById(preset.id)
    if (!record) throw new Error(t('palettePathPanel.errors.presetUnavailable'))
    const target = stops.value.find(s => s.id === stopId)
    if (!target || props.disabled) return
    target.appearance = snapshotPathAppearance(record.value); target.name = preset.name || t('palettePathPanel.unnamedPreset')
    picker.value = null; publish()
  } catch (e) { error.value = String(e) }
  finally { loadingPreset.value = false }
}
function capture() { picker.value = null; stop.value.appearance = snapshotPathAppearance(props.current); stop.value.name = t('palettePathPanel.currentPalette'); publish() }
async function extractCurrentMix() {
  if (props.disabled || savingSnapshot.value) return
  savingSnapshot.value = true; error.value = ''; snapshotStatus.value = ''
  try {
    const palette = await savePalettePathSnapshot(props.current.palettePath ?? draft.value, depth.value, props.current)
    snapshotStatus.value = t('palettePathPanel.status.snapshotSaved', { name: palette.name })
    emit('palette-saved')
    palettes.value = await getAllPaletteEntries()
  } catch (e) { error.value = String(e) }
  finally { savingSnapshot.value = false }
}

// ── Saved paths (local to this browser) ──
function refresh() { guard(() => { saved.value = readPalettePaths() }) }
function chooseSaved(id: string | number) {
  savedId.value = String(id); saveStatus.value = ''
  const p = saved.value.find(p => p.id === savedId.value)
  if (p) { draft.value = copy(p); selected.value = p.stops[0].id; publish() }
}
function save(duplicate = false) { guard(() => {
  if (duplicate) { draft.value.id = crypto.randomUUID(); draft.value.name += ' · ' + t('palettePathPanel.copySuffix') }
  savePalettePath(draft.value); savedId.value = draft.value.id; refresh(); publish()
  saveStatus.value = t('palettePathPanel.status.pathSaved', { name: draft.value.name })
}) }
function removeSaved() { guard(() => { const name = draft.value.name; deletePalettePath(savedId.value); savedId.value = ''; refresh(); saveStatus.value = t('palettePathPanel.status.pathDeleted', { name }) }) }
function create() { draft.value = newPalettePath(props.current, depthOrZero()); selected.value = draft.value.stops[0].id; savedId.value = ''; saveStatus.value = ''; publish() }

// ── Lifecycle ──
watch(() => props.current.palettePath, p => { if (p) { draft.value = copy(p); if (!p.stops.some(s => s.id === selected.value)) selected.value = p.stops[0].id } })
watch(draft, () => { void nextTick(paint) }, { deep: true })
const onStatus = (s: string) => { status.value = s }
onMounted(async () => {
  refresh(); paint()
  status.value = props.engine?.palettePathStatus ?? ''
  props.engine?.palettePathStatusListeners.add(onStatus)
  try { palettes.value = await getAllPaletteEntries() } catch (e) { error.value = String(e) }
})
onUnmounted(() => { props.engine?.palettePathStatusListeners.delete(onStatus); clearTimeout(publishTimer) })
</script>

<template>
  <div class="palette-path-panel body">
    <fieldset :disabled="disabled" class="sections">
      <DenseSection :title="t('palettePathPanel.path.title')" active :hue="285" :scope="t('palettePathPanel.path.scope')"
        icon='<path d=&quot;M3 17c4 0 4-10 8-10s4 10 8 10&quot;/><circle cx=&quot;3&quot; cy=&quot;17&quot; r=&quot;1.5&quot;/><circle cx=&quot;11&quot; cy=&quot;7&quot; r=&quot;1.5&quot;/><circle cx=&quot;19&quot; cy=&quot;17&quot; r=&quot;1.5&quot;/>'>
        <div class="fields">
          <DenseToggle v-model="draft.enabled" :label="t('palettePathPanel.path.enable')" :default="false" @update:model-value="publish" />
          <DenseSelect v-model="draft.outside" :label="t('palettePathPanel.path.outside')" :options="OUTSIDE_OPTIONS" default="hold" @update:model-value="publish" />
          <DenseSeg v-model="draft.mode" :label="t('palettePathPanel.path.mode')" :options="MODE_OPTIONS" default="radial" class="span2" @update:model-value="publish" />
          <DenseField :label="t('palettePathPanel.path.start')" :min="MAGNITUDE_MIN" :max="MAGNITUDE_MAX" :step="0.1" :f="fmt" :model-value="start" @update:model-value="setRange($event, true)" />
          <DenseField :label="t('palettePathPanel.path.end')" :min="MAGNITUDE_MIN" :max="MAGNITUDE_MAX" :step="0.1" :f="fmt" :model-value="end" @update:model-value="setRange($event, false)" />
        </div>
        <p class="panel-note">{{ t('palettePathPanel.path.note') }}</p>
        <div ref="strip" class="strip timeline" @dblclick="addAt">
          <canvas ref="canvas" width="600" height="44" :aria-label="t('palettePathPanel.path.timelineLabel')"></canvas>
          <span class="cursor" :style="{ left: progress + '%' }" :title="t('palettePathPanel.path.currentMagnitude', { value: fmt(depth) })"></span>
          <button v-for="s in stops" :key="s.id" type="button" class="stop-marker" :class="{ sel: s.id === selected, editing: s.id === editingStopId }"
            :style="{ left: percent(s.magnitude) + '%', background: stopColor(s) }"
            :aria-label="t('palettePathPanel.path.stopAt', { name: s.name, value: fmt(s.magnitude) }) + (s.id === editingStopId ? t('palettePathPanel.path.editingSuffix') : '')"
            :title="s.name + ' · ' + fmt(s.magnitude)"
            @pointerdown="pointer($event, s.id)" @pointermove="drag" @pointerup="drop" @pointercancel="drop" @click="selected = s.id" @dblclick.stop="emit('edit-stop', s.id)"></button>
        </div>
        <p class="panel-note">{{ t('palettePathPanel.path.hints') }}</p>
        <p v-if="editingStop" class="panel-note editing-note" role="status">{{ t('palettePathPanel.path.editingNote', { name: editingStop.name }) }}</p>
        <div class="transfer">
          <span class="count">{{ t('palettePathPanel.path.count', { count: stops.length, value: fmt(depth) }) }}</span>
          <button type="button" class="mini-btn" :disabled="stops.length >= 64" @click="addInGap">{{ t('palettePathPanel.path.addStop') }}</button>
          <button type="button" class="mini-btn" :disabled="savingSnapshot || !Number.isFinite(depth)" :title="t('palettePathPanel.path.extractTitle')" @click="extractCurrentMix">{{ savingSnapshot ? t('palettePathPanel.path.extracting') : t('palettePathPanel.path.extract') }}</button>
        </div>
        <p v-if="snapshotStatus" class="panel-note" role="status">{{ snapshotStatus }}</p>
      </DenseSection>

      <DenseSection :title="t('palettePathPanel.stop.title')" active :hue="320" :scope="t('palettePathPanel.stop.scope')"
        icon='<path d=&quot;M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.9z&quot;/>'>
        <div class="stop-head">
          <span class="stop-swatch" :style="{ background: stopGradient(stop) }"></span>
          <span class="stop-name">{{ stop.name }}</span>
          <span class="stop-pos">{{ stopIndex + 1 }} / {{ stops.length }}</span>
        </div>
        <div class="fields">
          <fieldset :disabled="isEndpoint" class="bare" :title="isEndpoint ? t('palettePathPanel.stop.endpointLocked') : undefined">
            <DenseField :label="t('palettePathPanel.stop.magnitude')" :min="stopMin" :max="stopMax" :step="0.01" :f="fmt" :model-value="stop.magnitude" @update:model-value="onMagnitude" />
          </fieldset>
          <DenseSelect v-model="stop.curve" :label="t('palettePathPanel.stop.nextTransition')" :options="CURVE_OPTIONS" default="linear" @update:model-value="publish" />
        </div>
        <div class="subhead">{{ t('palettePathPanel.stop.fill') }}</div>
        <div class="seg fill-seg">
          <button type="button" :class="{ on: picker === 'palettes' }" :aria-expanded="picker === 'palettes'" @click="openPicker('palettes')">{{ t('palettePathPanel.stop.fromLibrary') }}</button>
          <button type="button" :class="{ on: picker === 'presets' }" :aria-expanded="picker === 'presets'" @click="openPicker('presets')">{{ t('palettePathPanel.stop.fromPreset') }}</button>
          <button type="button" :title="t('palettePathPanel.stop.captureTitle')" @click="capture">{{ t('palettePathPanel.stop.capture') }}</button>
        </div>
        <div v-if="picker" class="picker" :aria-busy="loadingPreset">
          <div class="save-row"><input v-model="query" class="txt-in" type="search" :placeholder="t('palettePathPanel.stop.searchPlaceholder')" :aria-label="t('palettePathPanel.stop.search')"></div>
          <div class="grid">
            <template v-if="picker === 'palettes'">
              <DenseCard v-for="p in filteredPalettes" :key="p.name" :name="p.name" :thumb="p.thumbnail || undefined" @select="choosePalette(p)">
                <template #thumb><span class="card-gradient" :style="{ background: paletteGradient(p) }"></span></template>
              </DenseCard>
              <p v-if="!filteredPalettes.length" class="panel-note">{{ t('palettePathPanel.stop.noPalette') }}</p>
            </template>
            <template v-else>
              <DenseCard v-for="p in filteredPresets" :key="p.id" :name="p.name || t('palettePathPanel.unnamedPreset')" :sub="t('palettePathPanel.stop.presetSub')" :thumb="p.thumbnail || undefined" @select="!loadingPreset && extractPreset(p)">
                <template #thumb><span class="card-gradient muted">{{ t('palettePathPanel.stop.noPreview') }}</span></template>
              </DenseCard>
              <p v-if="!filteredPresets.length" class="panel-note">{{ t('palettePathPanel.stop.noPreset') }}</p>
            </template>
          </div>
        </div>
        <div class="transfer">
          <button type="button" class="mini-btn danger" :disabled="stops.length <= 2" @click="removeStop">{{ t('palettePathPanel.stop.remove') }}</button>
        </div>
      </DenseSection>

      <DenseSection :title="t('palettePathPanel.saved.title')" active :hue="300" :scope="t('palettePathPanel.saved.scope')"
        icon='<path d=&quot;M4 19V5a2 2 0 012-2h3v18H6a2 2 0 01-2-2zM9 3h5v18H9zM17 4l4 16-3 1-4-16z&quot;/>'>
        <div class="fields">
          <DenseSelect :label="t('palettePathPanel.saved.select')" :options="savedOptions" :model-value="savedId" class="span2" @update:model-value="chooseSaved" />
        </div>
        <div class="save-row"><input v-model="draft.name" class="txt-in" maxlength="100" :aria-label="t('palettePathPanel.saved.name')" :placeholder="t('palettePathPanel.saved.name')" @change="publish"></div>
        <div class="transfer">
          <button type="button" class="mini-btn primary" @click="save()">{{ t('palettePathPanel.saved.save') }}</button>
          <button type="button" class="mini-btn" @click="save(true)">{{ t('palettePathPanel.saved.duplicate') }}</button>
          <button type="button" class="mini-btn" @click="create">{{ t('palettePathPanel.saved.new') }}</button>
          <button type="button" class="mini-btn danger" :disabled="!savedId" @click="removeSaved">{{ t('palettePathPanel.saved.delete') }}</button>
        </div>
        <p class="panel-note">{{ t('palettePathPanel.saved.note') }}</p>
        <p v-if="saveStatus" class="panel-note" role="status">{{ saveStatus }}</p>
      </DenseSection>

      <DenseSection :title="t('palettePathPanel.textures.title')" active initially-collapsed :hue="175" :scope="t('palettePathPanel.textures.scope')"
        icon='<rect x=&quot;3&quot; y=&quot;5&quot; width=&quot;18&quot; height=&quot;14&quot; rx=&quot;2&quot;/><circle cx=&quot;9&quot; cy=&quot;10&quot; r=&quot;2&quot;/><path d=&quot;M21 15l-5-5-11 9&quot;/>'>
        <div class="fields">
          <DenseSelect :model-value="draft.textureSize" :label="t('palettePathPanel.textures.maxSize')" :options="SIZE_OPTIONS" :default="1024" class="span2" @update:model-value="draft.textureSize = Number($event) as 512 | 1024 | 2048; publish()" />
        </div>
        <p class="panel-note">{{ t('palettePathPanel.textures.note') }}</p>
      </DenseSection>
    </fieldset>
    <p v-if="error" role="alert" class="panel-note error">{{ error }}</p>
    <p v-if="status" class="panel-note" role="status">{{ status }}</p>
  </div>
</template>

<style scoped>
.palette-path-panel { display: flex; flex-direction: column; gap: 7px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
fieldset.sections { display: flex; flex-direction: column; gap: 7px; }
fieldset.bare { display: contents; }
fieldset.bare:disabled .fld { opacity: .55; cursor: default; }
.timeline { margin: 8px 6px 18px; overflow: visible; touch-action: none; }
.timeline canvas { display: block; width: 100%; height: 100%; border-radius: inherit; }
.timeline .cursor { position: absolute; top: -3px; bottom: -3px; width: 2px; background: #fff; pointer-events: none; box-shadow: 0 0 3px #000; }
.timeline .stop-marker { top: auto; bottom: -13px; height: 22px; width: 14px; margin-left: -7px; padding: 0; }
.timeline .stop-marker.editing { border-color: #5cc8ff; box-shadow: 0 0 0 2px #5cc8ff, 0 3px 9px rgba(0,0,0,.6); }
.transfer { align-items: center; }
.transfer .count { font-size: 11.5px; color: var(--ink-3); margin-right: auto; }
.editing-note { color: var(--ink); }
.stop-head { display: flex; align-items: center; gap: 8px; margin: 2px 0 8px; }
.stop-swatch { width: 44px; height: 20px; border-radius: 5px; border: 1px solid var(--line); flex: none; }
.stop-name { font-weight: 600; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stop-pos { margin-left: auto; font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
.fill-seg { margin-bottom: 6px; }
.picker { margin: 4px 0 8px; }
.picker .save-row { margin: 0 0 8px; }
.picker .grid { max-height: 280px; overflow: auto; }
.card-gradient { display: block; width: 100%; height: 40px; }
.card-gradient.muted { display: grid; place-items: center; font-size: 10px; color: var(--ink-3); background: var(--row); }
.error { color: var(--red); }
</style>
