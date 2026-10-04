<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MandelbrotParams } from '../Mandelbrot'
import { Palette } from '../Palette'
import { getAllPaletteEntries, type PaletteRecord } from '../paletteStore'
import { getAllPresetEntries, getPresetById, type PresetMetadata } from '../presetStore'
import { paletteRecordAppearance } from '../paletteLook'
import { snapshotStudioCamera, snapshotStudioLook, type StudioLook } from '../studioParcours'
import {
  BIN_MAX_COLLECTIONS, BIN_MAX_ITEMS, binDrag, loadStudioBin, newBinCollection, rememberPlaceThumb, saveStudioBin, shrinkThumbnail,
  type BinItem, type BinKind, type BinOrder,
} from '../studioBin'

// ── Studio bin: the places and looks picked for the edit ──
// Collections are shared by every parcours. Tiles are dragged onto the
// timeline, or clicked to apply to the selected keyframes.

const props = defineProps<{
  params: MandelbrotParams
  engine: { getSnapshotPng(size: number): Promise<string> } | null
  /** How many keyframes a distribution would land on, per kind. */
  targetCounts: Record<BinKind, number>
}>()
const emit = defineEmits<{
  apply: [item: BinItem]
  fill: [request: { items: BinItem[]; order: BinOrder; cut: boolean }]
  error: [error: unknown]
}>()
const { t } = useI18n()

const bin = reactive(loadStudioBin())
const collectionId = ref(bin.collections[0]?.id ?? '')
const kind = ref<BinKind>('place')
const picking = ref(false)
/** Where the Palettes tab picks from: saved palettes, or the palette of a saved scene. */
const lookSource = ref<'palettes' | 'scenes'>('palettes')
const order = ref<BinOrder>('sequence')
const cut = ref(true)
const presets = ref<PresetMetadata[]>([])
const palettes = ref<PaletteRecord[]>([])

const collection = computed(() => bin.collections.find(c => c.id === collectionId.value) ?? null)
const items = computed(() => collection.value?.items.filter(i => i.kind === kind.value) ?? [])
const count = (k: BinKind) => collection.value?.items.filter(i => i.kind === k).length ?? 0

function persist() { try { saveStudioBin(bin) } catch (e) { emit('error', e) } }
function ensureCollection() {
  if (collection.value) return collection.value
  const created = newBinCollection(t('studioPanel.bin.defaultCollection'))
  bin.collections.push(created)
  collectionId.value = created.id
  return bin.collections[bin.collections.length - 1]
}
function addCollection() {
  if (bin.collections.length >= BIN_MAX_COLLECTIONS) return
  const name = window.prompt(t('studioPanel.bin.collectionName'), '')?.trim()
  if (!name) return
  const created = newBinCollection(name)
  bin.collections.push(created)
  collectionId.value = created.id
  persist()
}
function renameCollection() {
  const c = collection.value
  if (!c) return
  const name = window.prompt(t('studioPanel.bin.collectionName'), c.name)?.trim()
  if (!name) return
  c.name = name.slice(0, 40)
  persist()
}
function removeCollection() {
  const c = collection.value
  if (!c || (c.items.length && !window.confirm(t('studioPanel.bin.confirmDelete', { name: c.name, count: c.items.length })))) return
  bin.collections.splice(bin.collections.indexOf(c), 1)
  collectionId.value = bin.collections[0]?.id ?? ''
  persist()
}
function push(item: BinItem) {
  const c = ensureCollection()
  if (c.items.length >= BIN_MAX_ITEMS) { emit('error', new Error(t('studioPanel.bin.full', { max: BIN_MAX_ITEMS }))); return }
  c.items.push(item)
  if (item.kind === 'place') rememberPlaceThumb(item.camera, item.thumb)
  persist()
}
function removeItem(item: BinItem) {
  const c = collection.value
  if (!c) return
  c.items = c.items.filter(i => i.id !== item.id)
  persist()
}

async function addCurrent() {
  try {
    if (kind.value === 'place') {
      const camera = snapshotStudioCamera(props.params)
      const thumb = props.engine ? await shrinkThumbnail(await props.engine.getSnapshotPng(256)) : undefined
      const depth = -Math.log10(Number(camera.scale))
      push({ id: crypto.randomUUID(), kind: 'place', name: Number.isFinite(depth) ? `1e-${depth.toFixed(1)}` : camera.scale, camera, thumb })
    } else {
      push({ id: crypto.randomUUID(), kind: 'look', name: t('studioPanel.bin.currentLook'), look: snapshotStudioLook(props.params) })
    }
  } catch (e) { emit('error', e) }
}
async function openPicker() {
  picking.value = !picking.value
  if (!picking.value) return
  try {
    presets.value = (await getAllPresetEntries()).sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || a.name.localeCompare(b.name))
    if (kind.value === 'look') palettes.value = (await getAllPaletteEntries()).filter(p => p.colorStops?.length).sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || a.name.localeCompare(b.name))
  } catch (e) { emit('error', e) }
}
async function addPreset(meta: PresetMetadata) {
  try {
    const record = await getPresetById(meta.id)
    if (!record) return
    push({ id: crypto.randomUUID(), kind: 'place', name: meta.name, camera: snapshotStudioCamera(record.value), thumb: await shrinkThumbnail(meta.thumbnail) })
  } catch (e) { emit('error', e) }
}
/** The palette of a saved scene: its stops, surface and textures, not its location. */
async function addScenePalette(meta: PresetMetadata) {
  try {
    const record = await getPresetById(meta.id)
    if (!record?.value.colorStops?.length) return
    push({ id: crypto.randomUUID(), kind: 'look', name: meta.name, look: JSON.parse(JSON.stringify(paletteRecordAppearance({ ...record.value, name: meta.name } as PaletteRecord))) as StudioLook })
  } catch (e) { emit('error', e) }
}
function addPalette(p: PaletteRecord) {
  // A palette is a partial look: stops and surface, completed where applied.
  push({ id: crypto.randomUUID(), kind: 'look', name: p.name, look: JSON.parse(JSON.stringify(paletteRecordAppearance(p))) as StudioLook })
}
function swatch(look: Pick<StudioLook, 'colorStops' | 'interpolationMode'>): string {
  try {
    const p = new Palette(look.colorStops, look.interpolationMode ?? 'lab')
    return `linear-gradient(to right, ${Array.from({ length: 10 }, (_, i) => p.getColorAt(i / 9)).join(',')})`
  } catch { return 'none' }
}
function tileStyle(item: BinItem) {
  if (item.kind === 'look' && item.look) return { background: swatch(item.look) }
  return item.thumb ? { backgroundImage: `url(${item.thumb})` } : {}
}
function onDragStart(e: DragEvent, item: BinItem) {
  binDrag.value = item
  e.dataTransfer?.setData('text/plain', item.name)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
function onDragEnd() { binDrag.value = null }
function fill() {
  if (items.value.length) emit('fill', { items: items.value.map(i => JSON.parse(JSON.stringify(i))), order: order.value, cut: cut.value })
}

onMounted(() => {
  for (const c of bin.collections) for (const item of c.items) if (item.kind === 'place') rememberPlaceThumb(item.camera, item.thumb)
})
</script>

<template>
  <div class="bin">
    <div class="bin-head">
      <select class="bin-select" :value="collectionId" :aria-label="t('studioPanel.bin.collection')" @change="collectionId = ($event.target as HTMLSelectElement).value">
        <option v-if="!bin.collections.length" value="">{{ t('studioPanel.bin.defaultCollection') }}</option>
        <option v-for="c in bin.collections" :key="c.id" :value="c.id">{{ c.name }} · {{ c.items.length }}</option>
      </select>
      <button class="bbtn" type="button" :title="t('studioPanel.bin.newCollection')" :aria-label="t('studioPanel.bin.newCollection')" @click="addCollection"><i class="fa-solid fa-plus"></i></button>
      <button class="bbtn" type="button" :disabled="!collection" :title="t('studioPanel.bin.renameCollection')" :aria-label="t('studioPanel.bin.renameCollection')" @click="renameCollection"><i class="fa-solid fa-pen"></i></button>
      <button class="bbtn" type="button" :disabled="!collection" :title="t('studioPanel.bin.deleteCollection')" :aria-label="t('studioPanel.bin.deleteCollection')" @click="removeCollection"><i class="fa-solid fa-trash"></i></button>
    </div>
    <div class="bin-kinds" role="tablist">
      <button v-for="k in (['place', 'look'] as const)" :key="k" type="button" role="tab" :aria-selected="kind === k" :class="k" @click="kind = k; picking = false">
        {{ t(`studioPanel.bin.kinds.${k}`) }} <small>{{ count(k) }}</small>
      </button>
    </div>
    <div v-if="items.length" class="bin-grid">
      <div v-for="item in items" :key="item.id" class="bin-tile" :class="item.kind" draggable="true" role="button" tabindex="0"
        :title="t('studioPanel.bin.tileTitle', { name: item.name })"
        @dragstart="onDragStart($event, item)" @dragend="onDragEnd" @click="emit('apply', item)" @keydown.enter="emit('apply', item)">
        <span class="bin-thumb" :style="tileStyle(item)"></span>
        <span class="bin-name">{{ item.name }}</span>
        <button class="bin-x" type="button" :aria-label="t('common.delete')" @click.stop="removeItem(item)"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>
    <p v-else class="bin-empty">{{ t(`studioPanel.bin.empty.${kind}`) }}</p>
    <div class="bin-actions">
      <button class="bbtn wide" type="button" @click="addCurrent"><i class="fa-solid fa-plus"></i> {{ t(`studioPanel.bin.addCurrent.${kind}`) }}</button>
      <button class="bbtn wide" type="button" :aria-pressed="picking" @click="openPicker"><i class="fa-solid fa-book"></i> {{ t('studioPanel.bin.fromLibrary') }}</button>
    </div>
    <div v-if="picking" class="bin-grid picker">
      <template v-if="kind === 'place'">
        <button v-for="p in presets" :key="p.id" type="button" class="bin-tile place" :title="t('studioPanel.bin.addTitle', { name: p.name })" @click="addPreset(p)">
          <span class="bin-thumb" :style="p.thumbnail ? { backgroundImage: `url(${p.thumbnail})` } : {}"></span>
          <span class="bin-name">{{ p.name }} <small>e-{{ p.scaleExponent }}</small></span>
        </button>
        <p v-if="!presets.length" class="bin-empty">{{ t('studioPanel.bin.noPresets') }}</p>
      </template>
      <template v-else>
        <div class="bin-source" role="tablist">
          <button type="button" role="tab" :aria-selected="lookSource === 'palettes'" @click="lookSource = 'palettes'">{{ t('studioPanel.bin.sources.palettes') }}</button>
          <button type="button" role="tab" :aria-selected="lookSource === 'scenes'" @click="lookSource = 'scenes'">{{ t('studioPanel.bin.sources.scenes') }}</button>
        </div>
        <template v-if="lookSource === 'scenes'">
          <button v-for="p in presets" :key="p.id" type="button" class="bin-tile place" :title="t('studioPanel.bin.addSceneTitle', { name: p.name })" @click="addScenePalette(p)">
            <span class="bin-thumb" :style="p.thumbnail ? { backgroundImage: `url(${p.thumbnail})` } : {}"></span>
            <span class="bin-name">{{ p.name }}</span>
          </button>
          <p v-if="!presets.length" class="bin-empty">{{ t('studioPanel.bin.noPresets') }}</p>
        </template>
        <template v-else>
        <button v-for="p in palettes" :key="p.guid ?? p.name" type="button" class="bin-tile look" :title="t('studioPanel.bin.addTitle', { name: p.name })" @click="addPalette(p)">
          <span class="bin-thumb" :style="p.thumbnail ? { backgroundImage: `url(${p.thumbnail})` } : { background: swatch({ colorStops: p.colorStops, interpolationMode: p.interpolationMode ?? 'lab' }) }"></span>
          <span class="bin-name">{{ p.name }}</span>
        </button>
        <p v-if="!palettes.length" class="bin-empty">{{ t('studioPanel.bin.noPalettes') }}</p>
        </template>
      </template>
    </div>
    <div class="bin-fill">
      <h4>{{ t('studioPanel.bin.fill.title') }}</h4>
      <div class="bin-fill-row">
        <select class="bin-select" v-model="order" :aria-label="t('studioPanel.bin.fill.order')">
          <option value="sequence">{{ t('studioPanel.bin.fill.sequence') }}</option>
          <option value="shuffle">{{ t('studioPanel.bin.fill.shuffle') }}</option>
        </select>
        <label class="bin-check"><input v-model="cut" type="checkbox" /> {{ t('studioPanel.bin.fill.cut') }}</label>
      </div>
      <button class="bbtn wide" type="button" :disabled="!items.length || !targetCounts[kind]" :title="t('studioPanel.bin.fill.hint')" @click="fill">
        <i class="fa-solid fa-wand-magic-sparkles"></i> {{ t('studioPanel.bin.fill.run', { count: targetCounts[kind] }) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.bin { display: flex; flex-direction: column; gap: 6px; }
.bin-head { display: flex; gap: 4px; }
.bin-select { flex: 1; min-width: 0; height: 26px; background: var(--row); border: 1px solid var(--line-soft); border-radius: 6px; color: var(--ink); padding: 0 6px; font: inherit; }
.bbtn { height: 26px; min-width: 28px; padding: 0 8px; border: 1px solid var(--line); background: var(--row); border-radius: 6px; color: var(--ink); font: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; }
.bbtn:hover:not(:disabled), .bbtn[aria-pressed="true"] { background: var(--row-on); }
.bbtn:disabled { opacity: .45; cursor: default; }
.bbtn.wide { flex: 1; }
.bin-kinds { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.bin-kinds button { height: 26px; border: 1px solid var(--line-soft); border-radius: 6px; background: none; color: var(--ink-3); font: inherit; font-weight: 600; cursor: pointer; }
.bin-kinds button[aria-selected="true"] { background: var(--row-on); color: var(--ink); }
.bin-kinds .place[aria-selected="true"] { border-color: oklch(0.72 0.15 245 / .6); }
.bin-kinds .look[aria-selected="true"] { border-color: oklch(0.72 0.16 320 / .6); }
.bin-kinds small { font-family: var(--mono); color: var(--ink-3); margin-left: 4px; }
.bin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 6px; max-height: 260px; overflow: auto; padding-right: 2px; }
.bin-source { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.bin-source button { height: 24px; border: 1px solid var(--line-soft); border-radius: 6px; background: none; color: var(--ink-3); font: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; }
.bin-source button[aria-selected="true"] { background: var(--row-on); color: var(--ink); }
.bin-grid.picker { border-top: 1px solid var(--line-soft); padding-top: 6px; max-height: 220px; }
.bin-tile { position: relative; display: flex; flex-direction: column; gap: 3px; padding: 4px; border: 1px solid var(--line-soft); border-radius: 7px; background: var(--row); color: var(--ink-2); font: inherit; font-size: 11px; cursor: grab; text-align: left; min-width: 0; }
.bin-tile.place:hover { border-color: oklch(0.72 0.15 245 / .7); color: var(--ink); }
.bin-tile.look:hover { border-color: oklch(0.72 0.16 320 / .7); color: var(--ink); }
.bin-thumb { border-radius: 4px; background-color: var(--row-on); background-size: cover; background-position: center; }
.place .bin-thumb { aspect-ratio: 16 / 9; }
.look .bin-thumb { height: 22px; }
.bin-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bin-name small { color: var(--ink-3); font-family: var(--mono); }
.bin-x { position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; border: 0; border-radius: 50%; background: rgba(0, 0, 0, .6); color: #fff; font-size: 8px; display: none; place-items: center; cursor: pointer; }
.bin-tile:hover .bin-x, .bin-tile:focus-within .bin-x { display: grid; }
.bin-empty { color: var(--ink-3); font-size: 12px; line-height: 1.45; margin: 4px 0; grid-column: 1 / -1; }
.bin-actions { display: flex; gap: 4px; flex-wrap: wrap; }
.bin-fill { border-top: 1px solid var(--line-soft); padding-top: 6px; display: flex; flex-direction: column; gap: 5px; }
.bin-fill h4 { margin: 0; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); }
.bin-fill-row { display: flex; gap: 8px; align-items: center; }
.bin-check { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--ink-2); white-space: nowrap; cursor: pointer; }
</style>
