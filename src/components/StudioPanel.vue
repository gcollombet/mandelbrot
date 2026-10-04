<script setup lang="ts">
import { centerOn, clampView, revealTime, rulerStep, snapTime, viewSpan, zoomAround, type TimelineView } from '../studioTimelineView'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, nextTick, toRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { Palette } from '../Palette'
import type { MandelbrotParams } from '../Mandelbrot'
import { log10FromDecimalString } from '../floatexp'
import {
  cameraClockAt, cameraDistance, cameraKeyframes, cameraSegmentAt, copyPlain, discreteLookFields, formatSeconds, formatTimecode,
  keyframeDisplayTime, keyframeTimes, keyframeTrack, lookKeyframes, lookStateAt, moveStudioKeyframe, newStudioParcours,
  parcoursTimeOfCameraTime, rampedTime, removeStudioKeyframe, snapshotStudioCamera, snapshotStudioLook, validateStudioParcours,
  STUDIO_CAMERA_EASES, STUDIO_MAX_DURATION, STUDIO_MIN_DURATION,
  STUDIO_MAX_MARKERS, STUDIO_LOOK_REST_SECONDS, STUDIO_KEYFRAME_MIN_GAP, addStudioKeyframe, cameraKnots, type StudioMarker, type StudioCamera, type StudioCameraEase, type StudioKeyframe, type StudioLook, type StudioParcours, type StudioTrack,
} from '../studioParcours'
import { StudioHistory } from '../studioHistory'
import { getAllPaletteEntries, type PaletteRecord } from '../paletteStore'
import { paletteRecordAppearance } from '../paletteLook'
import { deleteStudioParcours, readStudioParcoursRecords, saveStudioParcours, type StudioParcoursRecord } from '../studioParcoursStore'
import { createStudioPlayer, type StudioAudioSource, type StudioController, type StudioEngine, type StudioTextures } from '../studioPlayer'
import { AUDIO_FEATURES, type AudioAnalysis } from '../audioAnalysis'
import { buildMusicParcours, ModulatorBank, MODULATOR_TARGETS, newModulator, MODULATOR_MAX, type StudioModulator } from '../studioAudio'
import { decodeStudioAudio, getStudioAudioRecord, importStudioAudio } from '../studioAudioStore'
import { publishStudioParcours, recallStudioDraft, rememberStudioDraft, studioExportAudio, studioLookClipboard } from '../studioDraft'
import { DenseField, DenseSeg, DenseSelect, DenseToggle } from './dense'
import StudioBin from './StudioBin.vue'
import { AUTO_KEY_DETECTORS, detectAutoKeyTimes, isPeakDetector, type AutoKeyDetector } from '../studioAutoKeys'
import { getAllPresetEntries, getPresetById, type PresetMetadata } from '../presetStore'
import { binDrag, cameraThumbKey, distributeBinItems, placeThumbs, rememberPlaceThumb, shrinkThumbnail, type BinItem, type BinOrder } from '../studioBin'

// ── Studio: a Resolve-style timeline docked under the live view ──
// Pure UI over studioParcours.ts (model) and studioPlayer.ts (engine wiring).

const props = defineProps<{
  params: MandelbrotParams
  engine: StudioEngine | null
  controller: StudioController | null
  resolveTextures: (look: StudioLook) => Promise<StudioTextures>
}>()
const emit = defineEmits<{
  close: []
  export: []
  /** Open the Palettes panel to edit the look the selected keyframe will capture. */
  openPalettes: []
  /** Editor layout: the rectangle (viewport px) the live view must fill; null in dock layout. */
  stage: [rect: { left: number; top: number; width: number; height: number } | null]
}>()
const { t } = useI18n()

// ── Layout: `dock` overlays the timeline on the full-screen view; `editor`
// is the Resolve-style page (viewer rectangle, tall inspector, timeline). ──
const LAYOUT_KEY = 'mandelbrot_studio_layout'
const EDITOR_MIN_WIDTH = 900
const layout = ref<'dock' | 'editor'>((() => {
  try { return localStorage.getItem(LAYOUT_KEY) === 'editor' ? 'editor' : 'dock' } catch { return 'dock' }
})())
const wide = ref(window.innerWidth > EDITOR_MIN_WIDTH)
const editor = computed(() => layout.value === 'editor' && wide.value)
const stageRef = ref<HTMLElement | null>(null)
let stageObserver: ResizeObserver | null = null
function toggleLayout() {
  layout.value = layout.value === 'editor' ? 'dock' : 'editor'
  try { localStorage.setItem(LAYOUT_KEY, layout.value) } catch { /* ignore */ }
}
function publishStage() {
  const el = stageRef.value
  if (!editor.value || !el) { emit('stage', null); return }
  const box = el.getBoundingClientRect()
  emit('stage', { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width), height: Math.round(box.height) })
}
function onWindowResize() { wide.value = window.innerWidth > EDITOR_MIN_WIDTH; publishStage() }

const FPS = 30
// The draft survives the dock closing and reopening (studioDraft.ts).
const draft = recallStudioDraft()
// A draft from before the one-track-per-keyframe model is split on the way in.
const parcours = reactive<StudioParcours>((() => {
  try { if (draft) return validateStudioParcours(draft.parcours) } catch { /* start fresh */ }
  return newStudioParcours(t('studioPanel.newName'))
})())
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
  onSettled: () => onSettled(),
})
player.setParcours(parcours)
const { time, playing, recording } = player

// ── Music (studioAudioStore.ts): decoded buffer + analysis + modulator bank ──
const audio = ref<{ analysis: AudioAnalysis; source: StudioAudioSource; name: string } | null>(studioExportAudio.value && parcours.audio
  ? null : null)
const audioBusy = ref(false)
const audioInput = ref<HTMLInputElement | null>(null)
const FEATURE_OPTIONS = computed(() => AUDIO_FEATURES.map(value => ({ value, label: t(`studioPanel.features.${value}`) })))
const TARGET_OPTIONS = computed(() => MODULATOR_TARGETS.map(value => ({ value, label: t(`studioPanel.targets.${value}`) })))
const audioSummary = computed(() => audio.value
  ? t('studioPanel.audio.loaded', { name: audio.value.name, duration: formatSeconds(audio.value.analysis.durationSeconds), bpm: audio.value.analysis.bpm, sections: audio.value.analysis.sections.length + 1 })
  : '')

function bindAudio(decoded: { buffer: AudioBuffer; analysis: AudioAnalysis; name: string } | null) {
  if (!decoded) {
    audio.value = null
    player.setAudio(null)
    studioExportAudio.value = null
    return
  }
  const source: StudioAudioSource = { buffer: decoded.buffer, bank: new ModulatorBank(decoded.analysis) }
  audio.value = { analysis: decoded.analysis, source, name: decoded.name }
  player.setAudio(source)
  studioExportAudio.value = source
  invalidate()
}

async function importAudio(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  audioBusy.value = true
  try {
    const decoded = await importStudioAudio(file)
    parcours.audio = { id: decoded.record.id, name: decoded.record.name, durationSeconds: decoded.buffer.duration }
    bindAudio({ buffer: decoded.buffer, analysis: decoded.analysis, name: decoded.record.name })
    if (!parcours.keyframes.length) parcours.durationSeconds = Math.max(1, Math.round(decoded.buffer.duration * 10) / 10)
    flash(audioSummary.value)
  } catch (e) { fail(e) }
  finally { audioBusy.value = false; if (audioInput.value) audioInput.value.value = '' }
}

/** Reload the parcours' music from the store (after a load or a reopen). */
async function restoreAudio() {
  const ref_ = parcours.audio
  if (!ref_) { bindAudio(null); return }
  if (audio.value && studioExportAudio.value && parcours.audio && audio.value.name === ref_.name) return
  audioBusy.value = true
  try {
    const record = await getStudioAudioRecord(ref_.id)
    if (!record) { bindAudio(null); error.value = t('studioPanel.audio.missing', { name: ref_.name }); return }
    const decoded = await decodeStudioAudio(record)
    bindAudio({ buffer: decoded.buffer, analysis: decoded.analysis, name: record.name })
  } catch (e) { fail(e) }
  finally { audioBusy.value = false }
}

function removeAudio() {
  delete parcours.audio
  bindAudio(null)
  afterEdit()
}

function generateFromMusic() {
  if (!audio.value) return
  player.pause()
  recordEdit()
  const result = buildMusicParcours(parcours, audio.value.analysis, props.params)
  selectedId.value = parcours.keyframes[0]?.id ?? null
  afterEdit()
  flash(t('studioPanel.audio.generated', { duration: formatSeconds(result.duration), added: result.added, sections: result.sections }))
}

function addModulator() {
  if (parcours.modulators.length >= MODULATOR_MAX) return
  recordEdit()
  parcours.modulators.push(newModulator())
}
function removeModulator(id: string) { recordEdit(); parcours.modulators = parcours.modulators.filter(m => m.id !== id) }
function updateModulator(m: StudioModulator, patch: Partial<StudioModulator>) { recordEdit(`mod:${m.id}:${Object.keys(patch).join()}`); Object.assign(m, patch); invalidate() }
if (draft) time.value = Math.min(draft.time, parcours.durationSeconds)

const selected = computed(() => parcours.keyframes.find(k => k.id === selectedId.value) ?? null)
// Multiple selection: `selectedId` stays the keyframe the inspector shows,
// `multi` holds the others picked with Shift/Ctrl + click or a Shift + drag box.
const multi = reactive(new Set<string>())
const selection = computed(() => parcours.keyframes.filter(k => k.id === selectedId.value || multi.has(k.id)))
watch(selectedId, id => { if (!id || !multi.has(id)) multi.clear() })
const sameTrackSelection = computed(() => selected.value ? selection.value.filter(k => keyframeTrack(k) === keyframeTrack(selected.value!)) : [])

// ── Double keyframes ──
// A double keyframe has an arrival side (what the previous plan glides to)
// and a departure side (what the next plan leaves from); the view cuts from
// one to the other. The playhead picks the side: a few milliseconds before
// the keyframe it rests on the arrival side, on the keyframe it shows the
// departure side. Edits always go to the side on screen.
type Side = 'in' | 'out'
const IN_OFFSET = STUDIO_LOOK_REST_SECONDS / 2
const isDouble = (k: StudioKeyframe) => !!(k.cameraIn || k.lookIn)
function sideOf(k: StudioKeyframe): Side {
  if (!isDouble(k)) return 'out'
  const before = keyframeDisplayTime(parcours, k) - time.value
  return before > 0.002 && before < 0.5 / FPS ? 'in' : 'out'
}
const selectedSide = computed<Side>(() => selected.value ? sideOf(selected.value) : 'out')
const cameraOf = (k: StudioKeyframe) => sideOf(k) === 'in' && k.cameraIn ? k.cameraIn : k.camera
const lookOf = (k: StudioKeyframe) => sideOf(k) === 'in' && k.lookIn ? k.lookIn : k.look
function setCamera(k: StudioKeyframe, camera: StudioCamera) { if (sideOf(k) === 'in' && k.cameraIn) k.cameraIn = camera; else k.camera = camera }
function setLook(k: StudioKeyframe, look: StudioLook) { if (sideOf(k) === 'in' && k.lookIn) k.lookIn = look; else k.look = look }
function selectSide(k: StudioKeyframe, side: Side) {
  selectedId.value = k.id
  if (!playing.value) seek(keyframeDisplayTime(parcours, k) - (side === 'in' && isDouble(k) ? IN_OFFSET : 0))
}
function previousOfTrack(k: StudioKeyframe): StudioKeyframe | null {
  const track = parcours.keyframes.filter(x => keyframeTrack(x) === keyframeTrack(k)).sort((a, b) => a.time - b.time)
  // By id: `k` may be the raw object while the list holds reactive proxies.
  const i = track.findIndex(x => x.id === k.id)
  return i > 0 ? track[i - 1] : null
}
/** Make keyframes double. The arrival side starts as the previous keyframe's
 *  state: the plan before stays still, then cuts. */
function splitInto(keys: readonly StudioKeyframe[]) {
  const ids = new Set(keys.map(k => k.id))
  for (const k of parcours.keyframes.filter(x => ids.has(x.id)).sort((a, b) => a.time - b.time)) {
    const previous = previousOfTrack(k)
    if (!previous) continue
    if (k.camera && !k.cameraIn && previous.camera) k.cameraIn = copyPlain(previous.camera)
    if (k.look && !k.lookIn && previous.look) k.lookIn = copyPlain(previous.look)
  }
}
function splitSelection() { recordEdit(); splitInto(selection.value); afterEdit() }
function mergeSelection() {
  recordEdit()
  for (const k of selection.value) { delete k.cameraIn; delete k.lookIn }
  afterEdit()
}
const canSplit = computed(() => selection.value.some(k => !isDouble(k) && previousOfTrack(k)))
const canMerge = computed(() => selection.value.some(isDouble))
const cameraCount = computed(() => parcours.keyframes.filter(k => k.camera).length)
const lookCount = computed(() => parcours.keyframes.filter(k => k.look).length)
const EASE_OPTIONS = computed(() => STUDIO_CAMERA_EASES.map(value => ({ value, label: t(`studioPanel.eases.${value}`) })))
const firstCameraId = computed(() => cameraKeyframes(parcours)[0]?.id ?? null)
function setEase(value: StudioCameraEase) {
  if (!selected.value) return
  recordEdit()
  for (const k of sameTrackSelection.value) {
    if (value === 'linear') delete k.ease
    else k.ease = value
  }
  afterEdit()
}
const CURVE_OPTIONS = computed(() => (['linear', 'gaussian', 'square', 'exponential'] as const).map(value => ({ value, label: t(`studioPanel.curves.${value}`) })))

function flash(message: string) { status.value = message; error.value = ''; setTimeout(() => { if (status.value === message) status.value = '' }, 2600) }
function fail(e: unknown) { error.value = e instanceof Error ? e.message : String(e) }

// ── Undo / redo (studioHistory.ts) ──
// Every edit records the parcours before it; bursts under one key coalesce.
// The music reference is not part of the history: undo never unloads a track.
const history = new StudioHistory<StudioParcours>()
const historyVersion = ref(0)
const canUndo = computed(() => (historyVersion.value, history.canUndo))
const canRedo = computed(() => (historyVersion.value, history.canRedo))
function recordEdit(key = '') { history.record(copyPlain(parcours), key); historyVersion.value++ }
function restoreSnapshot(snapshot: StudioParcours | null) {
  if (!snapshot) return
  const audioRef = parcours.audio
  Object.assign(parcours, snapshot)
  if (audioRef) parcours.audio = audioRef; else delete parcours.audio
  if (!parcours.keyframes.some(k => k.id === selectedId.value)) selectedId.value = null
  historyVersion.value++
  afterEdit()
}
function undo() { player.pause(); restoreSnapshot(history.undo(copyPlain(parcours))) }
function redo() { player.pause(); restoreSnapshot(history.redo(copyPlain(parcours))) }

// ── Library ──
async function refreshLibrary() { try { saved.value = await readStudioParcoursRecords() } catch (e) { fail(e) } }
function replaceParcours(next: StudioParcours) {
  Object.assign(parcours, JSON.parse(JSON.stringify(next)))
  parcours.keyframes = next.keyframes.map(k => JSON.parse(JSON.stringify(k)))
  parcours.markers = (next.markers ?? []).map(m => ({ ...m }))
  selectedId.value = parcours.keyframes[0]?.id ?? null
  pending.camera = null
  pending.look = null
  history.clear()
  historyVersion.value++
  view.zoom = 1; view.start = 0
  player.pause()
  time.value = 0
  void restoreAudio()
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
const displayTime = (k: StudioKeyframe) => keyframeDisplayTime(parcours, k)
/** Select a keyframe and bring the playhead onto it: the view shows what the
 *  inspector edits. */
function selectKeyframe(k: StudioKeyframe) {
  selectedId.value = k.id
  if (!playing.value) seek(displayTime(k))
}
function stepKeyframe(direction: 1 | -1) {
  const times = keyframeTimes(parcours)
  const next = direction > 0 ? times.find(x => x > time.value + 1e-3) : [...times].reverse().find(x => x < time.value - 1e-3)
  if (next === undefined) return
  const here = parcours.keyframes.filter(k => Math.abs(displayTime(k) - next) < 2e-3)
  const preferred = here.find(k => selected.value && keyframeTrack(k) === keyframeTrack(selected.value)) ?? here[0]
  if (preferred) selectKeyframe(preferred)
  else seek(next)
}
function addKeyframe(scope: 'both' | 'camera' | 'look' = 'both') {
  try {
    recordEdit()
    const created = player.capture(scope)
    if (!created.length) return
    // What was pending on a captured track now lives in a keyframe.
    if (scope !== 'look') pending.camera = null
    if (scope !== 'camera') { pending.look = null; lookBaseline = lookSnapshotJson() }
    selectedId.value = created[created.length - 1].id
    for (const k of created) if (k.camera) void snapThumb(k.camera)
    invalidate()
    flash(t('studioPanel.hints.keyframeAdded', { time: formatTimecode(time.value, FPS) }))
  } catch (e) { fail(e) }
}
function deleteSelected() {
  if (!selected.value) return
  recordEdit()
  const index = parcours.keyframes.findIndex(k => k.id === selected.value!.id)
  for (const k of selection.value) removeStudioKeyframe(parcours, k.id)
  multi.clear()
  selectedId.value = parcours.keyframes[Math.max(0, Math.min(parcours.keyframes.length - 1, index - 1))]?.id ?? null
  afterEdit()
}
function afterEdit() { player.refresh(); invalidate() }

// ── Editing linked to the keyframe under the playhead ──
//
// The live view is the editor. While the playhead rests on a keyframe of a
// track, edits of that track (navigation for the camera, palette and look
// controls for the look) are written into it as they happen. Elsewhere they
// are kept as PENDING: nothing overwrites them. A seek re-evaluates the
// parcours, then shows the pending look and view again over it, so they can
// be applied to another keyframe, pinned as a new one, or discarded.
const pending = reactive<{ camera: StudioCamera | null; look: StudioLook | null }>({ camera: null, look: null })
/** The look the parcours itself puts on the view at the playhead (JSON). */
let lookBaseline = ''
let staleAfterExport = false
let disposed = false
const HALF_FRAME = 0.5 / FPS
const CAMERA_EDIT_TOLERANCE = 1e-4

function lookSnapshotJson(): string {
  try { return JSON.stringify(snapshotStudioLook(props.params)) } catch { return lookBaseline }
}
const lookKeyAtPlayhead = computed(() => lookKeyframes(parcours).find(k => Math.abs(k.time - time.value) < HALF_FRAME) ?? null)
const cameraKeyAtPlayhead = computed(() => {
  const cams = cameraKeyframes(parcours)
  return cams.find(k => Math.abs(keyframeDisplayTime(parcours, k, cams) - time.value) < HALF_FRAME) ?? null
})
const editing = computed(() => !playing.value && !recording.value)

/** Called by the player once the params hold the parcours' state again. */
function onSettled() {
  if (disposed) return
  lookBaseline = lookSnapshotJson()
  // Show what is pending over the evaluated parcours.
  if (pending.look) Object.assign(props.params, copyPlain(pending.look))
  if (pending.camera) props.controller?.resetReferenceTo(pending.camera.cx, pending.camera.cy, pending.camera.scale, pending.camera.angle)
}

function editsBlocked(): boolean {
  if (props.controller?.isExporting()) { staleAfterExport = true; return true }
  if (staleAfterExport) { staleAfterExport = false; player.refresh(); return true }
  return disposed || playing.value || recording.value || player.driving.value
}

function checkLookEdit() {
  if (editsBlocked() || !lookKeyframes(parcours).length) return
  const now = lookSnapshotJson()
  if (now === lookBaseline) return
  const target = lookKeyAtPlayhead.value
  if (target && !pending.look) {
    recordEdit(`look:${target.id}`)
    setLook(target, JSON.parse(now))
    lookBaseline = now
  } else {
    pending.look = JSON.parse(now)
  }
}

function checkCameraEdit() {
  if (editsBlocked() || !cameraKeyframes(parcours).length) return
  const placed = player.placedCamera.value
  if (!placed) return
  const current = snapshotStudioCamera(props.params)
  if (cameraDistance(current, placed) < CAMERA_EDIT_TOLERANCE) return
  const target = cameraKeyAtPlayhead.value
  if (target && !pending.camera) {
    recordEdit(`camera:${target.id}`)
    setCamera(target, current)
    player.placedCamera.value = current
    void snapThumb(current)
  } else {
    pending.camera = current
  }
}

let lookTimer: ReturnType<typeof setTimeout> | null = null
let cameraTimer: ReturnType<typeof setTimeout> | null = null
watch(lookSnapshotJson, () => { if (lookTimer) clearTimeout(lookTimer); lookTimer = setTimeout(() => { lookTimer = null; checkLookEdit() }, 200) })
watch(() => [props.params.cx, props.params.cy, props.params.scale, props.params.angle], () => {
  if (cameraTimer) clearTimeout(cameraTimer)
  cameraTimer = setTimeout(() => { cameraTimer = null; checkCameraEdit() }, 250)
})

/** Write the pending edit of a track into the keyframe under the playhead. */
function applyPending(track: StudioTrack) {
  const target = track === 'look' ? lookKeyAtPlayhead.value : cameraKeyAtPlayhead.value
  if (!target) return
  recordEdit()
  if (track === 'look' && pending.look) { setLook(target, copyPlain(pending.look)); pending.look = null; lookBaseline = lookSnapshotJson() }
  if (track === 'camera' && pending.camera) { setCamera(target, copyPlain(pending.camera)); player.placedCamera.value = pending.camera; pending.camera = null }
  selectedId.value = target.id
  invalidate()
  flash(t('studioPanel.edit.applied', { time: formatTimecode(time.value, FPS) }))
}
function discardPending(track: StudioTrack) {
  if (track === 'look') pending.look = null
  else pending.camera = null
  player.refresh()
}

// Inspector edits
/** Open the full palette editor on this keyframe's look: edits there are
 *  written into it while the playhead stays here. */
function editLook() {
  const k = selected.value
  if (!k) return
  selectKeyframe(k)
  emit('openPalettes')
}
function setSelectedTime(value: number) {
  const k = selected.value
  if (!k) return
  recordEdit(`time:${k.id}`)
  // A camera keyframe lives on the camera clock.
  moveStudioKeyframe(parcours, k.id, k.camera ? rampedTime(parcours, value) : value)
  time.value = displayTime(k)
  afterEdit()
}
function setLookField(field: 'curve' | 'hold', value: unknown) {
  const k = selected.value
  if (!k) return
  recordEdit(`${field}:${k.id}`)
  for (const x of sameTrackSelection.value) {
    if (field === 'curve') x.curve = value as StudioKeyframe['curve']
    else x.hold = value as number
  }
  afterEdit()
}
function setSetting<K extends 'easeInSeconds' | 'easeOutSeconds' | 'retime' | 'cornerSeconds'>(field: K, value: StudioParcours[K]) {
  recordEdit(field)
  parcours[field] = value
  afterEdit()
}
function setDuration(value: number) {
  recordEdit('duration')
  parcours.durationSeconds = Math.max(STUDIO_MIN_DURATION, Math.min(STUDIO_MAX_DURATION, value))
  for (const k of parcours.keyframes) if (k.time > parcours.durationSeconds) k.time = parcours.durationSeconds
  parcours.easeInSeconds = Math.min(parcours.easeInSeconds, parcours.durationSeconds / 2)
  parcours.easeOutSeconds = Math.min(parcours.easeOutSeconds, parcours.durationSeconds / 2)
  afterEdit()
}

// ── Look library: saved palettes and a look clipboard ──
const palettes = ref<PaletteRecord[]>([])
async function refreshPalettes() {
  try {
    const all = await getAllPaletteEntries()
    palettes.value = all.filter(p => p.colorStops?.length).sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || a.name.localeCompare(b.name))
  } catch (e) { fail(e) }
}
const paletteSwatches = new WeakMap<object, string>()
function paletteSwatch(p: PaletteRecord): string {
  // Memoised: the template re-renders at every playback tick.
  const raw = toRaw(p)
  let swatch = paletteSwatches.get(raw)
  if (!swatch) { swatch = paletteSwatchOf(raw); paletteSwatches.set(raw, swatch) }
  return swatch
}
function paletteSwatchOf(p: PaletteRecord): string {
  return `linear-gradient(to right, ${lookGradient({ colorStops: p.colorStops, interpolationMode: p.interpolationMode ?? 'lab' } as StudioLook).split('|').join(',')})`
}
function applyPalette(p: PaletteRecord) {
  const k = selected.value
  if (!k?.look) return
  recordEdit()
  for (const x of sameTrackSelection.value) setLook(x, snapshotStudioLook({ ...lookOf(x), ...paletteRecordAppearance(p) }))
  if (Math.abs(k.time - time.value) < HALF_FRAME) pending.look = null
  afterEdit()
  flash(t('studioPanel.palettes.applied', { name: p.name }))
}
function copyLook() {
  const k = selected.value
  if (!k?.look) return
  studioLookClipboard.value = copyPlain(lookOf(k)!)
  flash(t('studioPanel.palettes.copied'))
}
function pasteLook() {
  const k = selected.value
  if (!k?.look || !studioLookClipboard.value) return
  recordEdit()
  for (const x of sameTrackSelection.value) setLook(x, copyPlain(studioLookClipboard.value))
  afterEdit()
  flash(t('studioPanel.palettes.pasted'))
}

const depthOf = (scale: string) => { const d = -log10FromDecimalString(scale); return Number.isFinite(d) ? d : 0 }
const selectedDepth = computed(() => selected.value?.camera ? depthOf(cameraOf(selected.value)!.scale) : 0)

// ── Thumbnails of camera keyframes (session memory, studioBin.ts) ──
async function snapThumb(camera: StudioCamera) {
  const engine = props.engine as unknown as { getSnapshotPng?(size: number): Promise<string> } | null
  if (!engine?.getSnapshotPng) return
  try { rememberPlaceThumb(camera, await shrinkThumbnail(await engine.getSnapshotPng(256))) } catch { /* no thumbnail */ }
}
const thumbImages = new Map<string, HTMLImageElement>()
function thumbImage(camera: StudioCamera): HTMLImageElement | null {
  const source = placeThumbs.get(cameraThumbKey(camera))
  if (!source) return null
  let image = thumbImages.get(source)
  if (!image) { image = new Image(); image.onload = invalidate; image.src = source; thumbImages.set(source, image) }
  return image.complete && image.naturalWidth ? image : null
}
watch(() => placeThumbs.size, () => invalidate())

// ── Bin (StudioBin.vue): apply, drop and fill ──
const inspTab = ref<'inspector' | 'bin'>('inspector')
function writeBinItem(k: StudioKeyframe, item: BinItem, side: Side) {
  if (item.kind === 'place' && item.camera && k.camera) {
    const camera = copyPlain(item.camera)
    if (side === 'in' && k.cameraIn) k.cameraIn = camera; else k.camera = camera
    rememberPlaceThumb(camera, item.thumb)
  } else if (item.kind === 'look' && item.look && k.look) {
    const inSide = side === 'in' && !!k.lookIn
    const look = snapshotStudioLook({ ...(inSide ? k.lookIn : k.look), ...copyPlain(item.look) })
    if (inSide) k.lookIn = look; else k.look = look
  }
}
/** A bin tile was clicked: put it on the selected keyframes of its track. */
function applyBinItem(item: BinItem) {
  const track: StudioTrack = item.kind === 'place' ? 'camera' : 'look'
  const keys = selection.value.filter(k => keyframeTrack(k) === track)
  if (!keys.length) { flash(t(`studioPanel.bin.selectFirst.${item.kind}`)); return }
  recordEdit()
  for (const k of keys) writeBinItem(k, item, keys.length === 1 ? sideOf(k) : 'out')
  if (track === 'look') pending.look = null; else pending.camera = null
  afterEdit()
  flash(t('studioPanel.bin.applied', { name: item.name, count: keys.length }))
}
/** Pin a bin item as a new keyframe at parcours time `at`. */
function keyframeFromItem(item: BinItem, at: number): StudioKeyframe | undefined {
  if (item.kind === 'place' && item.camera) {
    rememberPlaceThumb(item.camera, item.thumb)
    return addStudioKeyframe(parcours, at, { camera: item.camera }, rampedTime(parcours, at))[0]
  }
  if (item.kind === 'look' && item.look) {
    const base = lookStateAt(parcours, at)?.a ?? snapshotStudioLook(props.params)
    return addStudioKeyframe(parcours, at, { look: snapshotStudioLook({ ...base, ...copyPlain(item.look) }) })[0]
  }
  return undefined
}
/** The keyframes a distribution lands on: the selected ones of the track when
 *  several are selected, otherwise every keyframe of the track (inside the
 *  loop range when there is one), in time order. */
function fillTargets(track: StudioTrack): StudioKeyframe[] {
  const cams = cameraKeyframes(parcours)
  const at = (k: StudioKeyframe) => keyframeDisplayTime(parcours, k, cams)
  const picked = selection.value.filter(k => keyframeTrack(k) === track)
  const range = loopRange.value
  const keys = picked.length > 1 ? picked
    : parcours.keyframes.filter(k => keyframeTrack(k) === track && (!range || (at(k) >= range[0] - 1e-3 && at(k) <= range[1] + 1e-3)))
  return [...keys].sort((a, b) => at(a) - at(b))
}
const fillCounts = computed(() => ({ place: fillTargets('camera').length, look: fillTargets('look').length }))
/** Hand the items out over the existing keyframes, in order or shuffled.
 *  `cut` makes each one double, its arrival side on the keyframe before it:
 *  every plan holds still, then cuts. */
function fillFromBin(request: { items: BinItem[]; order: BinOrder; cut: boolean }) {
  const kind = request.items[0]?.kind
  if (!kind) return
  const targets = fillTargets(kind === 'place' ? 'camera' : 'look')
  if (!targets.length) { flash(t(`studioPanel.bin.fill.none.${kind}`)); return }
  player.pause()
  recordEdit()
  try {
    const picks = distributeBinItems(request.items, targets.length, request.order)
    targets.forEach((k, i) => writeBinItem(k, picks[i], 'out'))
    if (request.cut) {
      // The arrival sides follow the new neighbours, older ones included.
      for (const k of targets) { delete k.cameraIn; delete k.lookIn }
      splitInto(targets)
    }
    if (kind === 'look') pending.look = null; else pending.camera = null
    flash(t('studioPanel.bin.fill.done', { count: targets.length }))
  } catch (e) { fail(e) }
  afterEdit()
}

// ── Automatic keyframes from the music (studioAutoKeys.ts) ──
// A detector lists instants; they show as ticks on the audio track while the
// settings are tuned, then one click pins a keyframe on each.
const auto = reactive<{ detector: AutoKeyDetector; sensitivity: number; minGap: number; beatDivision: number; track: 'camera' | 'look' | 'both' }>(
  { detector: 'kick', sensitivity: 0.5, minGap: 0.3, beatDivision: 1, track: 'camera' })
const DETECTOR_OPTIONS = computed(() => AUTO_KEY_DETECTORS.map(value => ({ value, label: t(`studioPanel.auto.detectors.${value}`) })))
const AUTO_TRACK_OPTIONS = computed(() => (['camera', 'look', 'both'] as const).map(value => ({ value, label: t(`studioPanel.auto.tracks.${value}`) })))
const autoTimes = computed(() => {
  if (!audio.value) return []
  const range = loopRange.value
  return detectAutoKeyTimes(audio.value.analysis, {
    detector: auto.detector, sensitivity: auto.sensitivity, minGapSeconds: Math.max(STUDIO_KEYFRAME_MIN_GAP, auto.minGap), beatDivision: auto.beatDivision,
    from: range?.[0] ?? 0, to: range?.[1] ?? parcours.durationSeconds,
  })
})
watch(autoTimes, () => invalidate())
/** Pin a keyframe on every detected instant: the current view for the camera,
 *  the look the parcours has there for the look. An instant that already has
 *  a keyframe of the track is left alone. */
function addAutoKeyframes() {
  const times = autoTimes.value
  if (!times.length) return
  player.pause()
  recordEdit()
  const camera = snapshotStudioCamera(props.params), currentLook = snapshotStudioLook(props.params)
  const created: StudioKeyframe[] = []
  let skipped = 0
  try {
    for (const at of times) {
      if (auto.track !== 'look') {
        const cameraTime = rampedTime(parcours, at)
        if (parcours.keyframes.some(k => k.camera && Math.abs(k.time - cameraTime) < STUDIO_KEYFRAME_MIN_GAP)) skipped++
        else created.push(...addStudioKeyframe(parcours, at, { camera }, cameraTime))
      }
      if (auto.track !== 'camera') {
        if (parcours.keyframes.some(k => k.look && Math.abs(k.time - at) < STUDIO_KEYFRAME_MIN_GAP)) skipped++
        else created.push(...addStudioKeyframe(parcours, at, { look: lookStateAt(parcours, at)?.a ?? currentLook }))
      }
    }
    flash(t('studioPanel.auto.done', { count: created.length, skipped }))
  } catch (e) { fail(e) }
  // Selected, so the bin can be distributed over them straight away.
  multi.clear()
  selectedId.value = created[0]?.id ?? selectedId.value
  for (const k of created) multi.add(k.id)
  afterEdit()
}

// ── Places: saved scenes, one click puts a location on the keyframe ──
const places = ref<PresetMetadata[]>([])
async function refreshPlaces() {
  try { places.value = (await getAllPresetEntries()).sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || a.name.localeCompare(b.name)) } catch (e) { fail(e) }
}
async function applyPlace(meta: PresetMetadata) {
  try {
    const record = await getPresetById(meta.id)
    if (!record) return
    applyBinItem({ id: meta.guid, kind: 'place', name: meta.name, camera: snapshotStudioCamera(record.value), thumb: await shrinkThumbnail(meta.thumbnail) })
  } catch (e) { fail(e) }
}

// ── Loop range (I / O, X clears): playback repeats it, the fill uses it ──
const loop = reactive<{ in: number | null; out: number | null }>({ in: null, out: null })
const loopRange = computed<[number, number] | null>(() => loop.in !== null && loop.out !== null && loop.out > loop.in ? [loop.in, loop.out] : null)
function setLoop(edge: 'in' | 'out') {
  loop[edge] = time.value
  if (loop.in !== null && loop.out !== null && loop.out <= loop.in) loop[edge === 'in' ? 'out' : 'in'] = null
  invalidate()
}
function clearLoop() { loop.in = null; loop.out = null; invalidate() }
watch(time, value => { const range = loopRange.value; if (range && playing.value && value >= range[1]) player.seek(range[0]) })
// ── Keyboard (called by the viewer while the studio is open) ──
function handleKey(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return false
  const mod = e.metaKey || e.ctrlKey
  if (mod) {
    switch (e.code) {
      case 'KeyZ': if (e.shiftKey) redo(); else undo(); return true
      case 'KeyY': redo(); return true
      case 'KeyA': multi.clear(); for (const k of parcours.keyframes) if (!selected.value || keyframeTrack(k) === keyframeTrack(selected.value)) multi.add(k.id); if (!selected.value) selectedId.value = parcours.keyframes[0]?.id ?? null; invalidate(); return true
      case 'KeyC': if (selected.value?.look) { copyLook(); return true } return false
      case 'KeyV': if (selected.value?.look && studioLookClipboard.value) { pasteLook(); return true } return false
    }
    return false
  }
  if (e.code === 'Space') { togglePlay(); return true }
  // Physical keys: Alt+K types "˚" on a Mac layout.
  if (e.code === 'KeyK') { if (!e.repeat) addKeyframe(e.shiftKey ? 'camera' : e.altKey ? 'look' : 'both'); return true }
  if (e.code === 'KeyZ' && e.shiftKey) { zoomFit(); return true }
  switch (e.key.toLowerCase()) {
    case '+': case '=': zoomBy(1.5); return true
    case '-': case '_': zoomBy(1 / 1.5); return true
    case 'f': toggleFollow(); return true
    case 'm': if (!e.repeat) addMarker(); return true
    case 'i': setLoop('in'); return true
    case 'o': setLoop('out'); return true
    case 'x': clearLoop(); return true
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
  { id: 'camera', h: 64 }, { id: 'look', h: 44 }, { id: 'discrete', h: 24 }, { id: 'audio', h: 56 }, { id: 'modulator', h: 28 },
] as const
let frame: number | null = null
let drag: { kind: 'head' } | { kind: 'key'; id: string; moved: boolean; group: boolean } | { kind: 'box'; x0: number; y0: number; x1: number; y1: number } | { kind: 'marker'; id: string; moved: boolean } | { kind: 'pan'; x: number; start: number } | null = null
let lastSeek = 0
const paletteCache = new Map<string, string>()

// The tracks are drawn into an off-screen layer and only redrawn when something
// other than the playhead changes; a playback tick blits the layer and draws
// the playhead over it. `invalidate` marks the tracks stale, `invalidateHead`
// only asks for a repaint.
let tracksStale = true
let tracksKey = ''
let tracksLayer: HTMLCanvasElement | null = null
let headInk = '#f2f4f8', headRed = '#d44'
function invalidateHead() { if (frame === null) frame = requestAnimationFrame(() => { frame = null; draw() }) }
function invalidate() { tracksStale = true; invalidateHead() }
function cssVar(name: string): string { return canvasRef.value ? getComputedStyle(canvasRef.value).getPropertyValue(name).trim() : '#888' }
// Horizontal zoom and scroll (studioTimelineView.ts). Zoom 1 fits the parcours.
const FOLLOW_KEY = 'mandelbrot_studio_follow'
const view = reactive<TimelineView>({ zoom: 1, start: 0 })
const follow = ref((() => { try { return localStorage.getItem(FOLLOW_KEY) !== '0' } catch { return true } })())
let viewTime = -1
/** Deepest zoom: one frame about 14 px wide. */
function maxZoom(width: number) { return Math.max(1, parcours.durationSeconds * FPS * 14 / Math.max(1, width - 2 * PAD)) }
function canvasWidth() { return Math.max(120, canvasRef.value?.parentElement?.getBoundingClientRect().width ?? 120) }
function setView(next: TimelineView) { Object.assign(view, clampView(next, parcours.durationSeconds, maxZoom(canvasWidth()))); invalidate() }
/** Zoom from a button or a key: around the playhead when it is in view. */
function zoomBy(factor: number, anchor?: number) {
  const span = viewSpan(view, parcours.durationSeconds), head = time.value
  const at = anchor ?? (head >= view.start && head <= view.start + span ? head : view.start + span / 2)
  setView(zoomAround(view, parcours.durationSeconds, factor, at, maxZoom(canvasWidth())))
}
function zoomFit() { setView({ zoom: 1, start: 0 }) }
function toggleFollow() {
  follow.value = !follow.value
  try { localStorage.setItem(FOLLOW_KEY, follow.value ? '1' : '0') } catch { /* ignore */ }
  if (follow.value) setView(centerOn(view, parcours.durationSeconds, time.value))
}
/** Keep the playhead in view: centred while playing in follow mode, otherwise
 *  the window only jumps when the playhead leaves it. */
function syncView(width: number) {
  const duration = parcours.durationSeconds
  let next = clampView(view, duration, maxZoom(width))
  if (time.value !== viewTime && (!drag || drag.kind === 'key')) {
    next = follow.value && playing.value ? centerOn(next, duration, time.value) : revealTime(next, duration, time.value)
  }
  viewTime = time.value
  Object.assign(view, next)
}
function xOf(seconds: number, width: number) { return PAD + (width - 2 * PAD) * (seconds - view.start) / Math.max(1e-6, viewSpan(view, parcours.durationSeconds)) }
function tOf(x: number, width: number) { return Math.max(0, Math.min(parcours.durationSeconds, view.start + (x - PAD) / (width - 2 * PAD) * viewSpan(view, parcours.durationSeconds))) }
// Per-look strings the timeline needs at every redraw (which happens at every
// playback tick): serialising a look is too slow to repeat for each keyframe.
// Looks are replaced, never edited in place, so the object is the cache key.
const lookSignatures = new WeakMap<object, { discrete: string; stops: string }>()
function lookSignature(look: StudioLook) {
  const raw = toRaw(look)
  let signature = lookSignatures.get(raw)
  if (!signature) {
    signature = { discrete: JSON.stringify(discreteLookFields(raw)), stops: JSON.stringify([raw.colorStops, raw.interpolationMode]) }
    lookSignatures.set(raw, signature)
  }
  return signature
}
function lookGradient(look: StudioLook): string {
  const key = lookSignature(look).stops
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
/** One half of a double keyframe: `side` -1 arrival (left), 1 departure (right). */
function halfDiamond(c: CanvasRenderingContext2D, x: number, y: number, color: string, isSelected: boolean, side: -1 | 1, scale = 1) {
  c.beginPath(); c.moveTo(x + side * 1.5, y - 7 * scale); c.lineTo(x + side * (1.5 + 7 * scale), y); c.lineTo(x + side * 1.5, y + 7 * scale); c.closePath()
  c.fillStyle = isSelected ? '#fff' : color; c.fill()
  if (isSelected) { c.strokeStyle = color; c.lineWidth = 2; c.stroke() }
}
/** A keyframe on the timeline: a diamond, or two halves when it is double.
 *  The bin item hovering over it makes it swell. */
function keyMark(c: CanvasRenderingContext2D, k: StudioKeyframe, x: number, yIn: number, yOut: number, color: string) {
  const isSelected = k.id === selectedId.value || multi.has(k.id)
  const target = drop.id === k.id
  if (isDouble(k)) {
    const side = k.id === selectedId.value && !multi.size ? sideOf(k) : null
    halfDiamond(c, x, yIn, color, target ? drop.side === 'in' : isSelected && side !== 'out', -1, target && drop.side === 'in' ? 1.7 : 1)
    halfDiamond(c, x, yOut, color, target ? drop.side === 'out' : isSelected && side !== 'in', 1, target && drop.side === 'out' ? 1.7 : 1)
    return
  }
  if (target) { c.save(); c.translate(x, yOut); c.scale(1.7, 1.7); c.translate(-x, -yOut); diamond(c, x, yOut, color, true); c.restore() }
  else diamond(c, x, yOut, color, isSelected)
}
function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const box = canvas.parentElement!.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.max(120, box.width), h = RULER + TRACKS.reduce((a, b) => a + b.h, 0)
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.height = `${h}px` }
  syncView(w)
  // What the tracks depend on besides the parcours itself: the window, the
  // canvas size and the side of the selected double keyframe under the playhead.
  const key = `${canvas.width}x${canvas.height}|${view.zoom}|${view.start}|${selected.value ? sideOf(selected.value) : ''}`
  if (tracksStale || key !== tracksKey || !tracksLayer) {
    tracksLayer ??= document.createElement('canvas')
    if (tracksLayer.width !== canvas.width || tracksLayer.height !== canvas.height) { tracksLayer.width = canvas.width; tracksLayer.height = canvas.height }
    const layer = tracksLayer.getContext('2d')!
    layer.setTransform(dpr, 0, 0, dpr, 0, 0)
    layer.clearRect(0, 0, w, h)
    drawTracks(layer, w, h)
    tracksStale = false
    tracksKey = key
  }
  const c = canvas.getContext('2d')!
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.clearRect(0, 0, canvas.width, canvas.height)
  c.drawImage(tracksLayer, 0, 0)
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  // Playhead
  const x = xOf(Math.min(time.value, parcours.durationSeconds), w)
  c.fillStyle = recording.value ? headRed : headInk
  c.fillRect(x - 0.5, 0, 1, h)
  c.beginPath(); c.moveTo(x - 6, 0); c.lineTo(x + 6, 0); c.lineTo(x, 8); c.fill()
}
function drawTracks(c: CanvasRenderingContext2D, w: number, h: number) {
  const ink = cssVar('--ink') || '#f2f4f8', ink3 = cssVar('--ink-3') || '#717889', line = cssVar('--line-soft') || '#1c2029'
  const camColor = 'oklch(0.72 0.15 245)', lookColor = 'oklch(0.72 0.16 320)', discColor = 'oklch(0.78 0.14 75)'
  headInk = ink; headRed = cssVar('--red') || '#d44'
  const r = rows()
  c.font = '10px "JetBrains Mono", ui-monospace, monospace'; c.textBaseline = 'middle'
  // Ruler
  const duration = parcours.durationSeconds
  const span = viewSpan(view, duration), viewEnd = Math.min(duration, view.start + span)
  const { step: tickStep, labelEvery } = rulerStep((w - 2 * PAD) / span, FPS)
  for (let i = Math.floor(view.start / tickStep); i * tickStep <= viewEnd + 1e-6; i++) {
    const s = i * tickStep, x = xOf(s, w), major = i % labelEvery === 0
    if (x < PAD - 0.5) continue
    c.fillStyle = line; c.fillRect(x, RULER - (major ? 8 : 4), 1, major ? 8 : 4)
    if (major) { c.fillStyle = ink3; c.fillText(tickStep < 1 ? formatTimecode(s + 0.5 / FPS, FPS) : formatSeconds(s), x + 3, RULER - 7) }
  }
  // Zoomed in: a thin bar shows which part of the parcours is in view.
  if (view.zoom > 1) {
    c.fillStyle = line; c.fillRect(PAD, 0, w - 2 * PAD, 2)
    c.fillStyle = ink3; c.fillRect(PAD + (w - 2 * PAD) * view.start / duration, 0, Math.max(6, (w - 2 * PAD) / view.zoom), 2)
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
    const allDepths = [...depths, ...cams.filter(k => k.cameraIn).map(k => depthOf(k.cameraIn!.scale))]
    const lo = Math.min(...allDepths) - 0.25, hi = Math.max(...allDepths) + 0.25
    const yv = (d: number) => r.camera[0] + 8 + (r.camera[1] - r.camera[0] - 16) * (hi - d) / (hi - lo)
    if (cams.length > 1) {
      // Built once: the curve samples the camera every other pixel.
      const knots = cameraKnots(parcours)
      c.strokeStyle = camColor; c.lineWidth = 1.5; c.beginPath()
      for (let x = PAD; x <= w - PAD; x += 2) {
        const seg = cameraSegmentAt(parcours, tOf(x, w), knots)!
        const f = seg.duration > 0 ? seg.localElapsed / seg.duration : 0
        const d = depthOf(seg.from.scale) + (depthOf(seg.to.scale) - depthOf(seg.from.scale)) * f
        if (x === PAD) c.moveTo(x, yv(d)); else c.lineTo(x, yv(d))
      }
      c.stroke()
    }
    if (parcours.retime) {
      c.globalAlpha = 0.35; c.fillStyle = camColor
      // Ghosts: where the keyframes were placed before the retiming.
      for (const k of parcours.keyframes) if (k.camera) c.fillRect(xOf(parcoursTimeOfCameraTime(parcours, k.time), w) - 0.5, r.camera[0] + 4, 1, r.camera[1] - r.camera[0] - 8)
      c.globalAlpha = 1
    }
    const camX = cams.map(k => xOf(parcoursTimeOfCameraTime(parcours, k.time), w))
    // Thumbnails, where the keyframes leave room for them.
    cams.forEach((k, i) => {
      const image = camX[i] > -40 && camX[i] < w && (i === cams.length - 1 || camX[i + 1] - camX[i] >= 44) ? thumbImage(k.camera) : null
      if (!image) return
      c.globalAlpha = 0.9; c.drawImage(image, camX[i] + 4, r.camera[1] - 24, 36, 20); c.globalAlpha = 1
      c.strokeStyle = line; c.lineWidth = 1; c.strokeRect(camX[i] + 4.5, r.camera[1] - 23.5, 35, 19)
    })
    cams.forEach((k, i) => keyMark(c, k, camX[i], yv(k.cameraIn ? depthOf(k.cameraIn.scale) : depths[i]), yv(depths[i]), camColor))
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
    if (x1 < -10 || x0 > w + 10) return
    const colors = lookGradient(k.look).split('|')
    const g = c.createLinearGradient(x0, 0, Math.max(x0 + 1, x1), 0)
    colors.forEach((col, j) => g.addColorStop(j / (colors.length - 1), col))
    c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, bandH)
    if (next) {
      const holdX = x0 + (x1 - x0) * next.hold
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(holdX, y0, x1 - holdX, bandH)
      c.strokeStyle = lookColor; c.lineWidth = 1; c.beginPath()
      for (let x = Math.max(holdX, 0); x <= Math.min(x1, w); x += 2) {
        const f = (x - holdX) / Math.max(1, x1 - holdX)
        const state = lookStateAt(parcours, tOf(x, w), looks)?.w ?? f
        const yy = y0 + bandH - bandH * state
        if (x === Math.max(holdX, 0)) c.moveTo(x, yy); else c.lineTo(x, yy)
      }
      c.stroke()
    }
    keyMark(c, k, x0, y0 + bandH / 2, y0 + bandH / 2, lookColor)
  })
  if (!looks.length) { c.fillStyle = ink3; c.fillText(t('studioPanel.tracks.emptyLook'), PAD + 4, (r.look[0] + r.look[1]) / 2) }
  // Discrete: markers where a look keyframe switches texture, skybox, µ, stops…
  looks.forEach((k, i) => {
    if (i === 0 || lookSignature(looks[i - 1].look).discrete === lookSignature(k.look).discrete) return
    const x = xOf(k.time, w)
    c.fillStyle = discColor; c.fillRect(x - 1, r.discrete[0] + 4, 2, r.discrete[1] - r.discrete[0] - 8)
    const labels: string[] = []
    const prev = looks[i - 1].look
    if (prev.textureGuid !== k.look.textureGuid || prev.textureName !== k.look.textureName) labels.push(t('studioPanel.discrete.texture'))
    if (prev.skyboxGuid !== k.look.skyboxGuid || prev.skyboxName !== k.look.skyboxName) labels.push(t('studioPanel.discrete.skybox'))
    if (prev.mu !== k.look.mu) labels.push('µ')
    if (lookSignature(prev).stops !== lookSignature(k.look).stops) labels.push(t('studioPanel.discrete.stops'))
    c.fillStyle = ink3; c.fillText(labels.join(' · '), x + 5, (r.discrete[0] + r.discrete[1]) / 2)
  })
  // Audio: loudness waveform, section boundaries, beat grid (every 4 beats).
  {
    const y0 = r.audio[0], hh = r.audio[1] - r.audio[0], mid = y0 + hh / 2
    const audioColor = 'oklch(0.72 0.17 350)'
    if (audio.value) {
      const a = audio.value.analysis, rms = a.features.rms
      c.fillStyle = audioColor; c.globalAlpha = 0.55
      for (let x = PAD; x <= w - PAD; x += 1) {
        const seconds = tOf(x, w)
        if (seconds > a.durationSeconds) break
        const v = rms[Math.min(rms.length - 1, Math.floor(seconds * a.rate))] ?? 0
        c.fillRect(x, mid - v * (hh / 2 - 6), 1, Math.max(1, v * (hh - 12)))
      }
      c.globalAlpha = 0.35; c.fillStyle = ink3
      a.beats.forEach((b, i) => { if (i % 4 === 0 && b <= duration) c.fillRect(xOf(b, w), y0 + hh - 6, 1, 6) })
      c.globalAlpha = 1; c.fillStyle = audioColor
      for (const sct of a.sections) if (sct <= duration) c.fillRect(xOf(sct, w), y0, 1.5, hh)
      // Instants the automatic keyframes would land on.
      c.fillStyle = 'oklch(0.85 0.16 95)'
      for (const at of autoTimes.value) { const ax = xOf(at, w); if (ax >= 0 && ax <= w) c.fillRect(ax - 0.5, y0 + 2, 1.5, 9) }
      c.fillStyle = ink3; c.fillText(`${a.bpm} bpm · ${a.sections.length + 1} ${t('studioPanel.audio.title').toLowerCase()}`, PAD + 4, y0 + 8)
    } else { c.fillStyle = ink3; c.fillText(t('studioPanel.tracks.emptyAudio'), PAD + 4, mid) }
  }
  // Modulator: envelope of the first enabled one.
  {
    const y0 = r.modulator[0], hh = r.modulator[1] - r.modulator[0]
    const m = parcours.modulators.find(x => x.enabled)
    if (m && audio.value) {
      c.strokeStyle = 'oklch(0.75 0.13 200)'; c.lineWidth = 1; c.beginPath()
      for (let x = PAD; x <= w - PAD; x += 1) {
        const v = audio.value.source.bank.valueAt(m, tOf(x, w))
        const yy = y0 + hh - 3 - v * (hh - 8)
        if (x === PAD) c.moveTo(x, yy); else c.lineTo(x, yy)
      }
      c.stroke()
      c.fillStyle = ink3; c.fillText(`${t(`studioPanel.features.${m.feature}`)} → ${t(`studioPanel.targets.${m.target}`)} ×${m.amount.toFixed(2)} · A ${m.attackMs} ms · R ${m.releaseMs} ms`, PAD + 4, y0 + 8)
    } else { c.fillStyle = ink3; c.fillText(t('studioPanel.tracks.emptyModulator'), PAD + 4, y0 + hh / 2) }
  }
  // Loop range on the ruler.
  if (loop.in !== null || loop.out !== null) {
    const loopColor = 'oklch(0.75 0.13 200)'
    const range = loopRange.value
    if (range) { c.fillStyle = loopColor; c.globalAlpha = 0.22; c.fillRect(xOf(range[0], w), 14, xOf(range[1], w) - xOf(range[0], w), 6); c.globalAlpha = 1 }
    c.fillStyle = loopColor
    if (loop.in !== null) c.fillRect(xOf(loop.in, w) - 0.5, 10, 1.5, 10)
    if (loop.out !== null) c.fillRect(xOf(loop.out, w) - 1, 10, 1.5, 10)
  }
  // Selection box (Shift + drag).
  if (drag?.kind === 'box') {
    c.strokeStyle = ink; c.globalAlpha = 0.7; c.lineWidth = 1
    c.strokeRect(Math.min(drag.x0, drag.x1) + 0.5, Math.min(drag.y0, drag.y1) + 0.5, Math.abs(drag.x1 - drag.x0), Math.abs(drag.y1 - drag.y0))
    c.globalAlpha = 0.08; c.fillStyle = ink
    c.fillRect(Math.min(drag.x0, drag.x1), Math.min(drag.y0, drag.y1), Math.abs(drag.x1 - drag.x0), Math.abs(drag.y1 - drag.y0))
    c.globalAlpha = 1
  }
  // A bin item hovering over an empty stretch: where its keyframe would land.
  if (drop.time !== null) {
    const track = drop.track === 'camera' ? r.camera : r.look
    c.fillStyle = drop.track === 'camera' ? camColor : lookColor
    c.globalAlpha = 0.9; c.fillRect(xOf(drop.time, w) - 1, track[0] + 2, 2, track[1] - track[0] - 4); c.globalAlpha = 1
  }
  // Markers: a flag on the ruler, a faint line down the tracks.
  const markerColor = 'oklch(0.8 0.15 150)'
  for (const m of parcours.markers) {
    const mx = xOf(m.time, w)
    if (mx < 0 || mx > w) continue
    c.fillStyle = markerColor; c.globalAlpha = 0.25; c.fillRect(mx - 0.5, RULER, 1, h - RULER); c.globalAlpha = 1
    c.beginPath(); c.moveTo(mx - 4, 3); c.lineTo(mx + 4, 3); c.lineTo(mx + 4, 9); c.lineTo(mx, 13); c.lineTo(mx - 4, 9); c.fill()
    if (m.name && markerEdit.value?.id !== m.id) {
      const tw = c.measureText(m.name).width
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(mx + 6, 2, tw + 6, 12)
      c.fillStyle = markerColor; c.fillText(m.name, mx + 9, 8.5)
    }
  }
  // Magnet guide: what the dragged item is stuck to.
  if (snapGuide !== null) {
    c.fillStyle = 'oklch(0.82 0.16 95)'; c.globalAlpha = 0.8
    c.fillRect(xOf(snapGuide, w) - 0.5, RULER, 1, h - RULER)
    c.globalAlpha = 1
  }
}

// ── Markers ──
// Named points on the ruler (M). Drag to move, double-click to rename, an
// empty name deletes. They are magnet targets and never affect the render.
const markerEdit = ref<{ id: string; x: number; name: string } | null>(null)
const markerInput = ref<HTMLInputElement | null>(null)
function markerAt(px: number, py: number, width: number): StudioMarker | null {
  if (py >= RULER) return null
  let best: StudioMarker | null = null, distance = 7
  for (const m of parcours.markers) {
    const d = Math.abs(px - xOf(m.time, width))
    if (d < distance) { best = m; distance = d }
  }
  return best
}
function editMarker(m: StudioMarker) {
  markerEdit.value = { id: m.id, x: Math.max(0, Math.min(canvasWidth() - 130, xOf(m.time, canvasWidth()))), name: m.name }
  void nextTick(() => { markerInput.value?.focus(); markerInput.value?.select() })
}
function addMarker() {
  if (parcours.markers.length >= STUDIO_MAX_MARKERS) return
  const existing = parcours.markers.find(m => Math.abs(m.time - time.value) < 0.5 / FPS)
  if (existing) { editMarker(existing); return }
  recordEdit()
  const marker: StudioMarker = { id: crypto.randomUUID(), time: time.value, name: '' }
  parcours.markers.push(marker)
  parcours.markers.sort((a, b) => a.time - b.time)
  invalidate()
  editMarker(marker)
}
function commitMarker(keep = true) {
  const edit = markerEdit.value
  if (!edit) return
  markerEdit.value = null
  const m = parcours.markers.find(x => x.id === edit.id)
  if (!m) return
  const name = edit.name.trim().slice(0, 40)
  if (keep && name) { if (name !== m.name) { recordEdit(); m.name = name } }
  // Empty name, or Escape on a marker that never had one: remove it.
  else if (!name || !m.name) { recordEdit(); parcours.markers = parcours.markers.filter(x => x.id !== m.id) }
  invalidate()
}

// ── Magnet ──
// A dragged playhead or keyframe sticks to the other keyframes, then to the
// music (sections, beats), then to whole seconds. Shift turns it off.
const SNAP_PIXELS = 7
let snapGuide: number | null = null
function snapped(value: number, width: number, e: { shiftKey: boolean }, exceptId?: string): number {
  snapGuide = null
  if (e.shiftKey) return value
  const duration = parcours.durationSeconds
  const pixelsPerSecond = (width - 2 * PAD) / viewSpan(view, duration)
  const cams = cameraKeyframes(parcours)
  const keys = parcours.keyframes.filter(k => k.id !== exceptId).map(k => keyframeDisplayTime(parcours, k, cams))
  const groups: number[][] = [[...keys, ...parcours.markers.filter(m => m.id !== exceptId).map(m => m.time), 0, duration]]
  const a = audio.value?.analysis
  if (a) {
    groups.push(a.sections)
    // Targets closer than the magnet's reach would make every position stick.
    if (a.bpm > 0 && 60 / a.bpm * pixelsPerSecond >= 3 * SNAP_PIXELS) groups.push(a.beats)
  }
  if (pixelsPerSecond >= 3 * SNAP_PIXELS) groups.push([Math.round(value)])
  const hit = snapTime(value, groups, SNAP_PIXELS / pixelsPerSecond)
  if (hit.snapped) snapGuide = hit.time
  return Math.max(0, Math.min(duration, hit.time))
}

// ── Dropping a bin item on the timeline ──
const drop = reactive<{ id: string | null; side: Side; time: number | null; track: StudioTrack }>({ id: null, side: 'out', time: null, track: 'camera' })
function clearDrop() { drop.id = null; drop.time = null; snapGuide = null; invalidate() }
function aimDrop(e: DragEvent): BinItem | null {
  const item = binDrag.value, canvas = canvasRef.value
  if (!item || !canvas) return null
  const box = canvas.getBoundingClientRect(), px = e.clientX - box.left
  drop.track = item.kind === 'place' ? 'camera' : 'look'
  const cams = cameraKeyframes(parcours)
  // Magnet: a keyframe of the item's track within reach takes the drop.
  let best: StudioKeyframe | null = null, distance = 18
  for (const k of parcours.keyframes) {
    if (keyframeTrack(k) !== drop.track) continue
    const d = Math.abs(px - xOf(keyframeDisplayTime(parcours, k, cams), box.width))
    if (d < distance) { best = k; distance = d }
  }
  if (best) {
    drop.id = best.id; drop.time = null; snapGuide = null
    drop.side = isDouble(best) && px < xOf(keyframeDisplayTime(parcours, best, cams), box.width) ? 'in' : 'out'
  } else {
    drop.id = null
    drop.time = snapped(tOf(px, box.width), box.width, e)
  }
  invalidate()
  return item
}
function onDragOver(e: DragEvent) {
  if (!aimDrop(e)) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}
function onDrop(e: DragEvent) {
  const item = aimDrop(e)
  if (!item) return
  e.preventDefault()
  player.pause()
  recordEdit()
  try {
    const target = drop.id ? parcours.keyframes.find(k => k.id === drop.id) : null
    if (target) { writeBinItem(target, item, drop.side); selectedId.value = target.id }
    else if (drop.time !== null) { const created = keyframeFromItem(item, drop.time); if (created) selectedId.value = created.id }
    if (drop.track === 'look') pending.look = null; else pending.camera = null
  } catch (error) { fail(error) }
  binDrag.value = null
  clearDrop()
  afterEdit()
}

let hitSide: Side = 'out'
function hitKeyframe(px: number, py: number, width: number): StudioKeyframe | null {
  const r = rows()
  const cams = cameraKeyframes(parcours)
  let best: StudioKeyframe | null = null, bestDistance = 9
  for (const k of parcours.keyframes) {
    const [top, bottom] = k.camera ? r.camera : r.look
    if (py < top || py >= bottom) continue
    const distance = Math.abs(px - xOf(keyframeDisplayTime(parcours, k, cams), width))
    if (distance < bestDistance) { best = k; bestDistance = distance; hitSide = isDouble(k) && px < xOf(keyframeDisplayTime(parcours, k, cams), width) ? 'in' : 'out' }
  }
  return best
}
function onPointerDown(e: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const box = canvas.getBoundingClientRect(), px = e.clientX - box.left, py = e.clientY - box.top
  canvas.setPointerCapture(e.pointerId)
  // Middle button, or Alt + drag: scroll the timeline.
  if (e.button === 1 || e.altKey) { e.preventDefault(); drag = { kind: 'pan', x: e.clientX, start: view.start }; return }
  const marker = markerAt(px, py, box.width)
  if (marker) { drag = { kind: 'marker', id: marker.id, moved: false }; return }
  const k = hitKeyframe(px, py, box.width)
  if (k && (e.shiftKey || e.metaKey || e.ctrlKey)) {
    // Add to, or remove from, the selection.
    if (selectedId.value) multi.add(selectedId.value)
    if (multi.has(k.id)) multi.delete(k.id); else multi.add(k.id)
    selectedId.value = multi.has(k.id) ? k.id : [...multi][0] ?? null
    invalidate()
    return
  }
  if (k) {
    const group = multi.has(k.id) && multi.size > 1
    if (group) selectedId.value = k.id; else { multi.clear(); selectSide(k, hitSide) }
    drag = { kind: 'key', id: k.id, moved: false, group }
  } else if (e.shiftKey) drag = { kind: 'box', x0: px, y0: py, x1: px, y1: py }
  else { drag = { kind: 'head' }; throttledSeek(snapped(tOf(px, box.width), box.width, e), true) }
  invalidate()
}
function onPointerMove(e: PointerEvent) {
  const canvas = canvasRef.value
  if (!drag || !canvas) return
  const box = canvas.getBoundingClientRect(), value = tOf(e.clientX - box.left, box.width)
  if (drag.kind === 'pan') {
    setView({ zoom: view.zoom, start: drag.start - (e.clientX - drag.x) / (box.width - 2 * PAD) * viewSpan(view, parcours.durationSeconds) })
    return
  }
  if (drag.kind === 'head') { throttledSeek(snapped(value, box.width, e), false); return }
  if (drag.kind === 'box') {
    drag.x1 = e.clientX - box.left; drag.y1 = e.clientY - box.top
    const x0 = Math.min(drag.x0, drag.x1), x1 = Math.max(drag.x0, drag.x1), y0 = Math.min(drag.y0, drag.y1), y1 = Math.max(drag.y0, drag.y1)
    const r = rows(), cams = cameraKeyframes(parcours)
    multi.clear()
    for (const k of parcours.keyframes) {
      const [top, bottom] = k.camera ? r.camera : r.look, x = xOf(keyframeDisplayTime(parcours, k, cams), box.width)
      if (x >= x0 && x <= x1 && bottom > y0 && top < y1) multi.add(k.id)
    }
    if (!selectedId.value || !multi.has(selectedId.value)) selectedId.value = [...multi][0] ?? null
    invalidate()
    return
  }
  if (drag.kind === 'marker') {
    const markerDrag = drag, m = parcours.markers.find(x => x.id === markerDrag.id)
    if (!m) return
    if (!markerDrag.moved) { recordEdit(); markerDrag.moved = true }
    m.time = Math.round(snapped(value, box.width, e, m.id) * FPS) / FPS
    invalidate()
    return
  }
  const keyDrag = drag
  const k = parcours.keyframes.find(x => x.id === keyDrag.id)
  if (!k) return
  if (!keyDrag.moved) { recordEdit(); keyDrag.moved = true }
  // The playhead rides with the keyframe, so it stays the one being edited.
  const at = Math.round(snapped(value, box.width, e, k.id) * FPS) / FPS
  if (keyDrag.group) {
    // Move the whole selection by the same amount, leading edge first so the
    // keyframes do not block one another.
    // The group keeps its shape: it stops against the parcours' ends and
    // against the unselected keyframes of its tracks.
    const ids = new Set(selection.value.map(x => x.id))
    let lo = -Infinity, hi = Infinity
    for (const x of selection.value) {
      const from = displayTime(x)
      lo = Math.max(lo, -from); hi = Math.min(hi, parcours.durationSeconds - from)
      for (const y of parcours.keyframes) {
        if (ids.has(y.id) || keyframeTrack(y) !== keyframeTrack(x)) continue
        const gap = displayTime(y) - from
        if (gap > 0) hi = Math.min(hi, gap - STUDIO_KEYFRAME_MIN_GAP); else lo = Math.max(lo, gap + STUDIO_KEYFRAME_MIN_GAP)
      }
    }
    const delta = Math.max(Math.min(lo, 0), Math.min(Math.max(hi, 0), at - displayTime(k)))
    const keys = selection.value.map(x => ({ x, at: displayTime(x) })).sort((a, b) => delta > 0 ? b.at - a.at : a.at - b.at)
    for (const { x, at: from } of keys) moveStudioKeyframe(parcours, x.id, x.camera ? rampedTime(parcours, from + delta) : from + delta)
  } else moveStudioKeyframe(parcours, k.id, k.camera ? rampedTime(parcours, at) : at)
  time.value = displayTime(k)
  invalidate()
}
function onPointerUp(e: PointerEvent) {
  const canvas = canvasRef.value
  if (!drag || !canvas) return
  const box = canvas.getBoundingClientRect(), value = tOf(e.clientX - box.left, box.width)
  if (drag.kind === 'head') throttledSeek(snapped(value, box.width, e), true)
  else if (drag.kind === 'key' && drag.moved) afterEdit()
  else if (drag.kind === 'marker') {
    // A plain click on a marker jumps to it.
    const m = parcours.markers.find(x => x.id === (drag as { id: string }).id)
    if (m && !drag.moved) seek(m.time)
    else parcours.markers.sort((a, b) => a.time - b.time)
  }
  drag = null
  snapGuide = null
  invalidate()
}
/** Double-click on the ruler: fit the whole parcours. */
function onDoubleClick(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const box = canvas.getBoundingClientRect()
  const marker = markerAt(e.clientX - box.left, e.clientY - box.top, box.width)
  if (marker) editMarker(marker)
  else if (e.clientY - box.top < RULER) zoomFit()
}
/** Wheel: zoom around the pointer. Horizontal wheel or Shift + wheel: scroll. */
function onWheel(e: WheelEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const box = canvas.getBoundingClientRect(), unit = e.deltaMode === 1 ? 16 : 1
  const duration = parcours.durationSeconds, inner = box.width - 2 * PAD
  if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit
    setView({ zoom: view.zoom, start: view.start + delta / inner * viewSpan(view, duration) })
    return
  }
  // Following the playhead: it is the anchor, the window stays centred on it.
  const anchor = follow.value && playing.value ? time.value : view.start + (e.clientX - box.left - PAD) / inner * viewSpan(view, duration)
  zoomBy(Math.exp(-e.deltaY * unit * 0.0025), Math.max(0, Math.min(duration, anchor)))
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
  void refreshPalettes()
  void refreshPlaces()
  void restoreAudio()
  resizeObserver = new ResizeObserver(() => invalidate())
  if (canvasRef.value?.parentElement) resizeObserver.observe(canvasRef.value.parentElement)
  stageObserver = new ResizeObserver(() => publishStage())
  window.addEventListener('resize', onWindowResize)
  invalidate()
})
watch(stageRef, (el, previous) => {
  if (previous) stageObserver?.unobserve(previous)
  if (el) stageObserver?.observe(el)
  publishStage()
}, { flush: 'post', immediate: true })
onBeforeUnmount(() => {
  disposed = true
  if (lookTimer) clearTimeout(lookTimer)
  if (cameraTimer) clearTimeout(cameraTimer)
  resizeObserver?.disconnect()
  stageObserver?.disconnect()
  window.removeEventListener('resize', onWindowResize)
  emit('stage', null)
  if (frame !== null) cancelAnimationFrame(frame)
  player.destroy()
  rememberStudioDraft(parcours, savedId.value, time.value)
})
watch([time, recording], invalidateHead)
watch([playing, selectedId], invalidate)
// Any edit of the parcours redraws the tracks, whoever made it.
watch(parcours, invalidate, { deep: true })
watch(() => multi.size, invalidate)
watch(() => JSON.stringify(parcours), () => { invalidate(); publishStudioParcours(parcours) }, { immediate: true })

const timecode = computed(() => formatTimecode(time.value, FPS))
const durationLabel = computed(() => formatSeconds(parcours.durationSeconds))
const cameraTimeLabel = computed(() => formatTimecode(cameraClockAt(parcours, time.value).time, FPS))
</script>

<template>
  <div class="studio" :class="{ recording, playing, editor }">
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
        <div class="key-group">
          <button class="sbtn sbtn-primary" type="button" :title="t('studioPanel.transport.keyframeTitle')" @click="addKeyframe()">
            <i class="fa-solid fa-diamond"></i> {{ t('studioPanel.transport.keyframe') }} <kbd>K</kbd>
          </button>
          <button class="tbtn key-cam" type="button" :title="t('studioPanel.transport.keyframeCamera')" :aria-label="t('studioPanel.transport.keyframeCamera')" @click="addKeyframe('camera')"><i class="fa-solid fa-video"></i></button>
          <button class="tbtn key-look" type="button" :title="t('studioPanel.transport.keyframeLook')" :aria-label="t('studioPanel.transport.keyframeLook')" @click="addKeyframe('look')"><i class="fa-solid fa-palette"></i></button>
        </div>
        <button class="tbtn" type="button" :disabled="!canUndo" :title="t('studioPanel.transport.undo')" :aria-label="t('studioPanel.transport.undo')" @click="undo"><i class="fa-solid fa-rotate-left"></i></button>
        <button class="tbtn" type="button" :disabled="!canRedo" :title="t('studioPanel.transport.redo')" :aria-label="t('studioPanel.transport.redo')" @click="redo"><i class="fa-solid fa-rotate-right"></i></button>
        <button class="sbtn" type="button" :disabled="!cameraCount" @click="player.pause(); emit('export')">
          <i class="fa-solid fa-film"></i> {{ t('studioPanel.transport.export') }}
        </button>
      </div>
      <div class="studio-status">
        <span v-if="error" class="err">{{ error }}</span>
        <span v-else-if="status">{{ status }}</span>
        <span v-else>{{ t('studioPanel.status.keyframes', { total: parcours.keyframes.length, camera: cameraCount, look: lookCount }) }}</span>
      </div>
      <button v-if="wide" class="tbtn" type="button" :aria-pressed="editor" :title="t(editor ? 'studioPanel.layout.dock' : 'studioPanel.layout.editor')" :aria-label="t(editor ? 'studioPanel.layout.dock' : 'studioPanel.layout.editor')" @click="toggleLayout">
        <i :class="editor ? 'fa-solid fa-window-maximize' : 'fa-solid fa-table-columns'"></i>
      </button>
      <button class="tbtn" type="button" :aria-label="t('common.close')" @click="emit('close')"><i class="fa-solid fa-xmark"></i></button>
    </div>

    <!-- Editor layout: the live view is laid under this hole by the viewer. -->
    <div v-if="editor" ref="stageRef" class="studio-stage" aria-hidden="true"></div>

    <div class="studio-main">
      <div class="studio-timeline">
        <div class="studio-heads">
          <div class="ruler" :title="`TC · ${FPS} fps`">
            <button class="vbtn" type="button" :disabled="view.zoom <= 1" :title="t('studioPanel.view.zoomOut')" :aria-label="t('studioPanel.view.zoomOut')" @click="zoomBy(1 / 1.5)"><i class="fa-solid fa-magnifying-glass-minus"></i></button>
            <button class="vbtn" type="button" :title="t('studioPanel.view.zoomIn')" :aria-label="t('studioPanel.view.zoomIn')" @click="zoomBy(1.5)"><i class="fa-solid fa-magnifying-glass-plus"></i></button>
            <button class="vbtn" type="button" :disabled="view.zoom <= 1" :title="t('studioPanel.view.fit')" :aria-label="t('studioPanel.view.fit')" @click="zoomFit"><i class="fa-solid fa-arrows-left-right-to-line"></i></button>
            <button class="vbtn" type="button" :title="t('studioPanel.markers.add')" :aria-label="t('studioPanel.markers.add')" @click="addMarker"><i class="fa-solid fa-location-pin"></i></button>
            <button class="vbtn" type="button" :aria-pressed="follow" :title="t('studioPanel.view.follow')" :aria-label="t('studioPanel.view.follow')" @click="toggleFollow"><i class="fa-solid fa-arrows-to-dot"></i></button>
          </div>
          <div class="hd" style="height:64px"><span class="dot cam"></span>{{ t('studioPanel.tracks.camera') }}</div>
          <div class="hd" style="height:44px"><span class="dot look"></span>{{ t('studioPanel.tracks.look') }}</div>
          <div class="hd" style="height:24px"><span class="dot disc"></span>{{ t('studioPanel.tracks.discrete') }}</div>
          <div class="hd" style="height:56px"><span class="dot audio"></span>{{ t('studioPanel.tracks.audio') }}</div>
          <div class="hd" style="height:28px"><span class="dot mod"></span>{{ t('studioPanel.tracks.modulator') }}</div>
        </div>
        <div class="studio-canvas">
          <canvas ref="canvasRef" :aria-label="t('studioPanel.tracks.ariaTimeline')" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp" @wheel.prevent="onWheel" @dblclick="onDoubleClick" @dragover="onDragOver" @dragleave="clearDrop" @drop="onDrop"></canvas>
          <input v-if="markerEdit" ref="markerInput" v-model="markerEdit.name" class="marker-input" maxlength="40" :style="{ left: `${markerEdit.x}px` }"
            :placeholder="t('studioPanel.markers.placeholder')" :aria-label="t('studioPanel.markers.placeholder')"
            @keydown.enter.prevent="commitMarker()" @keydown.esc.prevent.stop="commitMarker(false)" @blur="commitMarker()" />
        </div>
      </div>

      <aside class="studio-insp">
        <div class="insp-tabs" role="tablist">
          <button type="button" role="tab" :aria-selected="inspTab === 'inspector'" @click="inspTab = 'inspector'"><i class="fa-solid fa-sliders"></i> {{ t('studioPanel.tabs.inspector') }}</button>
          <button type="button" role="tab" :aria-selected="inspTab === 'bin'" @click="inspTab = 'bin'"><i class="fa-solid fa-box-open"></i> {{ t('studioPanel.tabs.bin') }}</button>
        </div>
        <StudioBin v-show="inspTab === 'bin'" :params="props.params" :engine="(props.engine as any)" :target-counts="fillCounts" @apply="applyBinItem" @fill="fillFromBin" @error="fail" />
        <template v-if="inspTab === 'inspector'">
        <!-- Edit state: where live edits go (studioPanel § editing linked to the keyframe). -->
        <section v-if="editing && (pending.camera || pending.look || cameraKeyAtPlayhead || lookKeyAtPlayhead)" class="edit-state">
          <div v-for="track in (['camera', 'look'] as const)" :key="track">
            <div v-if="pending[track]" class="pending" :class="track">
              <p><i></i>{{ t(`studioPanel.edit.pending.${track}`) }}</p>
              <div class="pending-actions">
                <button v-if="track === 'look' ? lookKeyAtPlayhead : cameraKeyAtPlayhead" class="sbtn sbtn-primary" type="button" @click="applyPending(track)">{{ t('studioPanel.edit.applyHere', { time: formatTimecode(time, FPS) }) }}</button>
                <button class="sbtn" type="button" @click="addKeyframe(track)">{{ t('studioPanel.edit.newKeyframe') }}</button>
                <button class="sbtn" type="button" @click="discardPending(track)">{{ t('studioPanel.edit.discard') }}</button>
              </div>
            </div>
            <p v-else-if="track === 'look' ? lookKeyAtPlayhead : cameraKeyAtPlayhead" class="linked" :class="track"><i></i>{{ t(`studioPanel.edit.linked.${track}`) }}</p>
          </div>
        </section>

        <template v-if="selection.length > 1">
          <h3>{{ t('studioPanel.batch.title', { count: selection.length }) }}</h3>
          <p class="hint">{{ t('studioPanel.batch.hint') }}</p>
          <div class="row2">
            <button class="sbtn" type="button" :disabled="!canSplit" :title="t('studioPanel.double.splitDesc')" @click="splitSelection"><i class="fa-solid fa-code-compare"></i> {{ t('studioPanel.double.split') }}</button>
            <button class="sbtn" type="button" :disabled="!canMerge" @click="mergeSelection"><i class="fa-solid fa-diamond"></i> {{ t('studioPanel.double.merge') }}</button>
          </div>
          <DenseSelect v-if="selected?.camera" :model-value="selected.ease ?? 'linear'" :label="t('studioPanel.inspector.ease')" :options="EASE_OPTIONS" @update:model-value="setEase($event as StudioCameraEase)" />
          <DenseSeg v-else-if="selected?.look" :model-value="selected.curve" :label="t('studioPanel.inspector.curve')" :options="CURVE_OPTIONS" @update:model-value="setLookField('curve', $event)" />
          <button class="sbtn sbtn-danger" type="button" @click="deleteSelected">{{ t('studioPanel.batch.delete', { count: selection.length }) }}</button>
        </template>
        <template v-else-if="selected">
          <h3>{{ t(selected.camera ? 'studioPanel.inspector.titleCamera' : 'studioPanel.inspector.titleLook') }} <small>{{ formatTimecode(displayTime(selected), FPS) }}</small></h3>
          <div v-if="isDouble(selected)" class="sides" role="tablist" :aria-label="t('studioPanel.double.side')">
            <button type="button" role="tab" :aria-selected="selectedSide === 'in'" :title="t('studioPanel.double.sideInDesc')" @click="selectSide(selected, 'in')"><i class="fa-solid fa-caret-left"></i> {{ t('studioPanel.double.sideIn') }}</button>
            <button type="button" role="tab" :aria-selected="selectedSide === 'out'" :title="t('studioPanel.double.sideOutDesc')" @click="selectSide(selected, 'out')">{{ t('studioPanel.double.sideOut') }} <i class="fa-solid fa-caret-right"></i></button>
          </div>
          <div class="row2">
            <button v-if="!isDouble(selected)" class="sbtn" type="button" :disabled="!canSplit" :title="t('studioPanel.double.splitDesc')" @click="splitSelection"><i class="fa-solid fa-code-compare"></i> {{ t('studioPanel.double.split') }}</button>
            <button v-else class="sbtn" type="button" :title="t('studioPanel.double.mergeDesc')" @click="mergeSelection"><i class="fa-solid fa-diamond"></i> {{ t('studioPanel.double.merge') }}</button>
          </div>
          <DenseField :model-value="displayTime(selected)" :label="t('studioPanel.inspector.time')" :min="0" :max="parcours.durationSeconds" :step="1 / FPS" f="p2" unit="s" @update:model-value="setSelectedTime" />
          <template v-if="selected.camera">
            <div class="readout"><span>{{ t('studioPanel.inspector.scaleExp') }}</span><b>1e-{{ selectedDepth.toFixed(2) }}</b></div>
            <div class="readout"><span>{{ t('studioPanel.inspector.angle') }}</span><b>{{ (cameraOf(selected)!.angle * 180 / Math.PI).toFixed(1) }}°</b></div>
            <DenseSelect v-if="selected.id !== firstCameraId" :model-value="selected.ease ?? 'linear'" :label="t('studioPanel.inspector.ease')" :options="EASE_OPTIONS" :desc="t('studioPanel.inspector.easeDesc')" @update:model-value="setEase($event as StudioCameraEase)" />
            <p class="hint">{{ t('studioPanel.inspector.cameraHint') }}</p>
            <h3>{{ t('studioPanel.places.title') }} <small>{{ places.length }}</small></h3>
            <!-- v-memo: the template re-renders at every playback tick, and rebuilding each tile's data-URL style then costs far more than a frame. -->
            <div v-if="places.length" v-memo="[places]" class="palette-grid">
              <button v-for="p in places" :key="p.id" type="button" class="palette-tile place-tile" :title="t('studioPanel.places.applyTitle', { name: p.name })" @click="applyPlace(p)">
                <span class="place-thumb" :style="p.thumbnail ? { backgroundImage: `url(${p.thumbnail})` } : {}"></span>
                <span class="palette-name"><i v-if="p.favorite" class="fa-solid fa-star"></i>{{ p.name }}</span>
              </button>
            </div>
            <p v-else class="empty">{{ t('studioPanel.places.empty') }}</p>
          </template>
          <template v-else-if="selected.look">
            <div class="swatch" :style="{ background: `linear-gradient(to right, ${lookGradient(lookOf(selected)!).split('|').join(',')})` }"></div>
            <DenseSeg :model-value="selected.curve" :label="t('studioPanel.inspector.curve')" :options="CURVE_OPTIONS" @update:model-value="setLookField('curve', $event)" />
            <DenseField :model-value="selected.hold" :label="t('studioPanel.inspector.hold')" :min="0" :max="0.95" :step="0.05" :f="(v: number) => String(Math.round(v * 100))" unit="%" :desc="t('studioPanel.inspector.holdDesc')" @update:model-value="setLookField('hold', $event)" />
            <div class="row2">
              <button class="sbtn" type="button" :title="t('studioPanel.palettes.copyTitle')" @click="copyLook"><i class="fa-regular fa-copy"></i> {{ t('studioPanel.palettes.copy') }}</button>
              <button class="sbtn" type="button" :disabled="!studioLookClipboard" :title="t('studioPanel.palettes.pasteTitle')" @click="pasteLook"><i class="fa-regular fa-paste"></i> {{ t('studioPanel.palettes.paste') }}</button>
            </div>
            <button class="sbtn" type="button" :title="t('studioPanel.inspector.editLookDesc')" @click="editLook"><i class="fa-solid fa-sliders"></i> {{ t('studioPanel.inspector.editLook') }}</button>
            <h3>{{ t('studioPanel.palettes.title') }} <small>{{ palettes.length }}</small></h3>
            <div v-if="palettes.length" v-memo="[palettes]" class="palette-grid">
              <button v-for="p in palettes" :key="p.guid ?? p.name" type="button" class="palette-tile" :title="t('studioPanel.palettes.applyTitle', { name: p.name })" @click="applyPalette(p)">
                <span class="palette-thumb" :style="p.thumbnail ? { backgroundImage: `url(${p.thumbnail})` } : { background: paletteSwatch(p) }"></span>
                <span class="palette-name"><i v-if="p.favorite" class="fa-solid fa-star"></i>{{ p.name }}</span>
              </button>
            </div>
            <p v-else class="empty">{{ t('studioPanel.palettes.empty') }}</p>
          </template>
          <button class="sbtn sbtn-danger" type="button" @click="deleteSelected">{{ t('studioPanel.inspector.delete') }}</button>
        </template>
        <p v-else class="empty">{{ t('studioPanel.inspector.empty') }}</p>
        </template>
        <template v-if="inspTab === 'inspector'">

        <h3>{{ t('studioPanel.settings.title') }}</h3>
        <DenseField :model-value="parcours.durationSeconds" :label="t('studioPanel.settings.duration')" :min="STUDIO_MIN_DURATION" :max="600" :step="0.5" f="p1" unit="s" @update:model-value="setDuration" />
        <DenseField :model-value="parcours.easeInSeconds" :label="t('studioPanel.settings.easeIn')" :min="0" :max="parcours.durationSeconds / 2" :step="0.1" f="p1" unit="s" @update:model-value="setSetting('easeInSeconds', $event)" />
        <DenseField :model-value="parcours.easeOutSeconds" :label="t('studioPanel.settings.easeOut')" :min="0" :max="parcours.durationSeconds / 2" :step="0.1" f="p1" unit="s" @update:model-value="setSetting('easeOutSeconds', $event)" />
        <DenseToggle :model-value="parcours.retime" :label="t('studioPanel.settings.retime')" :desc="t('studioPanel.settings.retimeDesc')" @update:model-value="setSetting('retime', $event)" />
        <DenseField :model-value="parcours.cornerSeconds" :label="t('studioPanel.settings.corner')" :min="0" :max="5" :step="0.1" f="p1" unit="s" :default="1" :desc="t('studioPanel.settings.cornerDesc')" @update:model-value="setSetting('cornerSeconds', $event)" />

        <h3>{{ t('studioPanel.audio.title') }}</h3>
        <p v-if="audioBusy" class="empty">{{ t('studioPanel.audio.importing') }}</p>
        <template v-else-if="audio">
          <p class="readout audio-line"><span>{{ audioSummary }}</span></p>
          <button class="sbtn" type="button" :title="t('studioPanel.audio.generateHint')" @click="generateFromMusic">{{ t('studioPanel.audio.generate') }}</button>
          <h3>{{ t('studioPanel.auto.title') }} <small>{{ autoTimes.length }}</small></h3>
          <DenseSelect :model-value="auto.detector" :label="t('studioPanel.auto.detector')" :options="DETECTOR_OPTIONS" :desc="t('studioPanel.auto.detectorDesc')" @update:model-value="auto.detector = $event as AutoKeyDetector" />
          <DenseField v-if="isPeakDetector(auto.detector)" :model-value="auto.sensitivity" :label="t('studioPanel.auto.sensitivity')" :min="0" :max="1" :step="0.01" f="p2" :default="0.5" @update:model-value="auto.sensitivity = $event" />
          <DenseField v-if="auto.detector === 'beats'" :model-value="auto.beatDivision" :label="t('studioPanel.auto.beatDivision')" :min="1" :max="16" :step="1" f="p0" :default="1" @update:model-value="auto.beatDivision = $event" />
          <DenseField :model-value="auto.minGap" :label="t('studioPanel.auto.minGap')" :min="STUDIO_KEYFRAME_MIN_GAP" :max="8" :step="0.05" f="p2" unit="s" :default="0.3" @update:model-value="auto.minGap = $event" />
          <DenseSeg :model-value="auto.track" :label="t('studioPanel.auto.track')" :options="AUTO_TRACK_OPTIONS" @update:model-value="auto.track = $event as typeof auto.track" />
          <button class="sbtn sbtn-primary" type="button" :disabled="!autoTimes.length" :title="t('studioPanel.auto.hint')" @click="addAutoKeyframes"><i class="fa-solid fa-wand-magic-sparkles"></i> {{ t('studioPanel.auto.run', { count: autoTimes.length }) }}</button>
          <div class="row2">
            <button class="sbtn" type="button" @click="audioInput?.click()">{{ t('studioPanel.audio.import') }}</button>
            <button class="sbtn sbtn-danger" type="button" style="margin-top:0" @click="removeAudio">{{ t('studioPanel.audio.remove') }}</button>
          </div>
        </template>
        <template v-else>
          <p class="empty">{{ t('studioPanel.audio.none') }}</p>
          <button class="sbtn" type="button" @click="audioInput?.click()">{{ t('studioPanel.audio.import') }}</button>
        </template>
        <input ref="audioInput" type="file" accept="audio/*" hidden @change="importAudio" />

        <h3>{{ t('studioPanel.modulators.title') }} <small>{{ parcours.modulators.length }}/{{ MODULATOR_MAX }}</small></h3>
        <p v-if="!audio" class="empty">{{ t('studioPanel.modulators.needAudio') }}</p>
        <template v-else>
          <div v-for="m in parcours.modulators" :key="m.id" class="modrow" :class="{ off: !m.enabled }">
            <div class="modhead">
              <label class="modtoggle"><input type="checkbox" :checked="m.enabled" @change="updateModulator(m, { enabled: ($event.target as HTMLInputElement).checked })" /> <span>{{ t(`studioPanel.features.${m.feature}`) }} → {{ t(`studioPanel.targets.${m.target}`) }}</span></label>
              <button class="tbtn" type="button" :aria-label="t('common.delete')" @click="removeModulator(m.id)"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <DenseSelect :model-value="m.feature" :label="t('studioPanel.modulators.feature')" :options="FEATURE_OPTIONS" @update:model-value="updateModulator(m, { feature: $event as StudioModulator['feature'] })" />
            <DenseSelect :model-value="m.target" :label="t('studioPanel.modulators.target')" :options="TARGET_OPTIONS" @update:model-value="updateModulator(m, { target: $event as StudioModulator['target'] })" />
            <DenseField :model-value="m.amount" :label="t('studioPanel.modulators.amount')" :min="-2" :max="2" :step="0.05" f="p2" :default="0.6" @update:model-value="updateModulator(m, { amount: $event })" />
            <DenseField :model-value="m.attackMs" :label="t('studioPanel.modulators.attack')" :min="0" :max="2000" :step="5" f="p0" unit="ms" @update:model-value="updateModulator(m, { attackMs: $event })" />
            <DenseField :model-value="m.releaseMs" :label="t('studioPanel.modulators.release')" :min="0" :max="5000" :step="10" f="p0" unit="ms" @update:model-value="updateModulator(m, { releaseMs: $event })" />
          </div>
          <p v-if="!parcours.modulators.length" class="empty">{{ t('studioPanel.modulators.empty') }}</p>
          <button class="sbtn" type="button" :disabled="parcours.modulators.length >= MODULATOR_MAX" @click="addModulator"><i class="fa-solid fa-plus"></i> {{ t('studioPanel.modulators.add') }}</button>
        </template>
        </template>
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
.studio-heads .ruler { gap: 2px; padding: 0 4px; }
.marker-input { position: absolute; top: 0; width: 130px; height: 20px; padding: 0 6px; border: 1px solid oklch(0.8 0.15 150 / .7); border-radius: 4px; background: var(--row); color: var(--ink); font: 11px var(--mono); outline: none; }
.vbtn { width: 20px; height: 16px; border: 0; background: none; border-radius: 4px; color: var(--ink-3); display: grid; place-items: center; cursor: pointer; font-size: 9.5px; }
.vbtn:hover:not(:disabled) { background: var(--row-on); color: var(--ink); }
.vbtn:disabled { opacity: .35; cursor: default; }
.vbtn[aria-pressed="true"] { color: oklch(0.72 0.15 245); }
.studio-heads .hd { display: flex; align-items: center; gap: 7px; padding: 0 8px; border-bottom: 1px solid var(--line-soft); font-size: 11.5px; font-weight: 600; color: var(--ink-2); }
.dot { width: 8px; height: 8px; border-radius: 2px; flex: none; }
.dot.cam { background: oklch(0.72 0.15 245); } .dot.look { background: oklch(0.72 0.16 320); } .dot.disc { background: oklch(0.78 0.14 75); }
.dot.audio { background: oklch(0.72 0.17 350); } .dot.mod { background: oklch(0.75 0.13 200); }
.audio-line span { color: var(--ink); font-family: var(--mono); font-size: 11px; white-space: normal; }
.modrow { border: 1px solid var(--line-soft); border-radius: 8px; padding: 4px 6px 6px; margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }
.modrow.off { opacity: .55; }
.modhead { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 12px; font-weight: 600; }
.modtoggle { display: flex; align-items: center; gap: 6px; cursor: pointer; min-width: 0; }
.modtoggle input { accent-color: oklch(0.75 0.13 200); margin: 0; }
.modtoggle span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row2 { display: flex; gap: 6px; }
.studio-canvas { position: relative; overflow: hidden; }
.studio-canvas canvas { display: block; width: 100%; touch-action: none; cursor: crosshair; }
.studio-insp { border-left: 1px solid var(--line-soft); padding: 6px 10px 10px; overflow: auto; min-height: 0; display: flex; flex-direction: column; gap: 4px; }
.studio-insp > * { flex: none; }
.key-group { display: inline-flex; gap: 2px; }
.insp-tabs, .sides { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.insp-tabs button, .sides button { height: 26px; border: 1px solid var(--line-soft); border-radius: 6px; background: none; color: var(--ink-3); font: inherit; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.insp-tabs button[aria-selected="true"], .sides button[aria-selected="true"] { background: var(--row-on); color: var(--ink); border-color: var(--line); }
.place-thumb { aspect-ratio: 16 / 9; border-radius: 4px; background-color: var(--row-on); background-size: cover; background-position: center; }
.place-tile:hover { border-color: oklch(0.72 0.15 245 / .6); }
.key-cam { color: oklch(0.72 0.15 245); } .key-look { color: oklch(0.72 0.16 320); }
.tbtn:disabled { opacity: .4; cursor: default; }
.edit-state { display: flex; flex-direction: column; gap: 6px; margin: 2px 0 4px; }
.edit-state .linked, .edit-state .pending p { margin: 0; display: flex; align-items: center; gap: 7px; font-size: 11.5px; line-height: 1.35; color: var(--ink-2); }
.edit-state i { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.edit-state .camera i { background: oklch(0.72 0.15 245); } .edit-state .look i { background: oklch(0.72 0.16 320); }
.edit-state .pending { border: 1px solid oklch(0.78 0.14 75 / .55); background: oklch(0.78 0.14 75 / .10); border-radius: 8px; padding: 6px 8px; display: flex; flex-direction: column; gap: 6px; }
.edit-state .pending p { color: var(--ink); font-weight: 600; }
.pending-actions { display: flex; flex-wrap: wrap; gap: 4px; }
.pending-actions .sbtn { height: 24px; padding: 0 8px; font-size: 11.5px; }
.hint { color: var(--ink-3); font-size: 11.5px; line-height: 1.4; margin: 2px 0; }
.palette-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 6px; max-height: 236px; overflow: auto; padding-right: 2px; }
.palette-tile { display: flex; flex-direction: column; gap: 3px; padding: 4px; border: 1px solid var(--line-soft); border-radius: 7px; background: var(--row); color: var(--ink-2); font: inherit; font-size: 11px; cursor: pointer; text-align: left; min-width: 0; }
.palette-tile:hover { border-color: oklch(0.72 0.16 320 / .6); color: var(--ink); }
.palette-thumb { height: 22px; border-radius: 4px; background-size: cover; background-position: center; }
.palette-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.palette-name i { color: oklch(0.82 0.15 85); font-size: 9px; margin-right: 4px; }
.studio-insp h3 { margin: 6px 0 4px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); display: flex; justify-content: space-between; }
.studio-insp h3 small { font-family: var(--mono); text-transform: none; letter-spacing: 0; }
.readout { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-2); padding: 2px 0; }
.readout b { font-family: var(--mono); color: var(--ink); font-weight: 600; }
.swatch { height: 12px; border-radius: 4px; margin: 2px 0 4px; border: 1px solid var(--line-soft); }
.empty { color: var(--ink-3); font-size: 12px; margin: 8px 0; line-height: 1.45; }
/* Editor layout: bar on top, viewer hole + timeline on the left, inspector full height on the right. */
.studio.editor { display: grid; grid-template-columns: minmax(0, 1fr) clamp(320px, 26vw, 420px); grid-template-rows: auto minmax(0, 1fr) auto; gap: 6px; pointer-events: none; }
.studio.editor .studio-main { display: contents; }
.studio.editor .studio-bar, .studio.editor .studio-timeline, .studio.editor .studio-insp {
  pointer-events: auto; background: var(--panel-bg); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--line); border-radius: 10px;
}
.studio.editor .studio-bar { grid-column: 1 / -1; grid-row: 1; }
.studio.editor .studio-stage { grid-column: 1; grid-row: 2; min-height: 0; border: 1px solid var(--line); border-radius: 4px; pointer-events: none; }
.studio.editor .studio-timeline { grid-column: 1; grid-row: 3; }
.studio.editor .studio-insp { grid-column: 2; grid-row: 2 / 4; padding: 10px 14px 14px; gap: 6px; }
.tbtn[aria-pressed="true"]:not(.tbtn-play):not(.tbtn-rec) { background: var(--row-on); }
@media (max-width: 900px) {
  .studio-main { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
  .studio-insp { border-left: 0; border-top: 1px solid var(--line-soft); }
  .studio-transport { margin-left: 0; }
}
</style>
