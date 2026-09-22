<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, toRaw, watch} from 'vue';
import {useRouter} from 'vue-router';
import {useI18n} from 'vue-i18n';
import type {ApproximationMode, InterpolationMode, MandelbrotParams} from "../Mandelbrot.ts";
import {kernelApproximationMode} from '../Engine.ts';
import {
  preserveSessionPerformanceFields,
  stripExplorationStateFields,
  stripSessionPerformanceFields,
} from "../Mandelbrot.ts";
import type {ColorStop, StopTransferCurve} from '../ColorStop.ts';
import {createInterpolatedColorStop, getStopTransferCurve} from '../ColorStop.ts';
import {
  applyStopPresetValues,
  ensureDefaultStopPresetEntries,
  getAllStopPresetEntries,
} from '../stopPresetStore.ts';
import type {StopPresetRecord} from '../stopPresetStore.ts';
import PaletteEditor from './PaletteEditor.vue';
import PresetActionsMenu from './PresetActionsMenu.vue';
import {prepareSceneShare} from '../sceneSharing';
import {registerSharedTexture} from '../sharedSceneTextures';
import PalettePreview from './PalettePreview.vue';
import GlissiereHandle from './GlissiereHandle.vue';
import AnimationPanel from './AnimationPanel.vue';
import StopTransferCurveSelector from './StopTransferCurveSelector.vue';
import { DenseField, DenseSection, DenseToggle, DenseSeg, DenseSelect, DenseLinkedChip, useLinkedRecord } from './dense';
import CoordinateField from './dense/CoordinateField.vue';
import {Palette} from '../Palette.ts';
import {hsl as d3hsl, rgb as d3rgb} from 'd3-color';
import type {TextureMetadata} from '../textureStore';
import {
  deleteTextureEntry,
  getTextureBlob,
  saveTextureEntry,
  updateTextureMetadata,
} from '../textureStore';
import {
  BUILT_IN_TEXTURE_NAMES,
  ensureTextureLibrary,
  SKYBOX_SELECTED_KEY,
  storedTextureObjectUrl,
  TEXTURE_SELECTED_KEY,
  textureSourceKey,
} from '../textureLibrary';
import {log10FromDecimalString} from '../floatexp';
import {centerOnMinibrot, frameMinibrot} from '../minibrotActions';
import type {PresetMetadata, PresetRecord} from '../presetStore';
import {
  computeScaleExponent,
  deletePresetEntry,
  getAllPresetEntries,
  getAllPresetRecords,
  getPresetById,
  savePresetEntry,
  updatePresetEntry,
} from '../presetStore';
import type {PaletteRecord} from '../paletteStore';
import {
  deletePaletteEntry,
  getAllPaletteEntries,
  savePaletteEntry,
} from '../paletteStore';
import {RemoteCatalogNameConflictError, uploadRemoteCatalogEntry, uploadRemoteTextureEntry} from '../remoteCatalog';
import type {TextureMappingPresetRecord} from '../textureMappingPresetStore';
import {
  deleteTextureMappingPresetEntry,
  getAllTextureMappingPresetEntries,
  saveTextureMappingPresetEntry,
} from '../textureMappingPresetStore';
import {
  normalizeTextureMappingFromLegacy,
  TEXTURE_MAPPING_SCALE_MAX,
  TEXTURE_MAPPING_SCALE_MIN,
  TEXTURE_MAPPING_VARIABLE_OPTIONS,
  textureMappingEquals,
} from '../TextureMapping';
import {cloneOrbitTrap, DEFAULT_ORBIT_TRAP, normalizeOrbitTrapFromLegacy} from '../OrbitTrap';
import {
  cloneAnimationConfig,
  normalizeAnimationConfig,
} from '../AnimationConfig';
import {
  normalizeIterationPaletteCurve,
  type IterationPaletteCurve,
} from '../IterationPaletteCurve';
import type {AnimationPresetRecord} from '../animationPresetStore';
import {
  saveAnimationPresetEntry,
} from '../animationPresetStore';
import type {UserRole} from '../authService';
import {canDeleteCatalogEntry, canOverwriteCatalogPayload, canShowAdminUpload} from '../catalogPermissions';
import {createGuid, nameForCatalogReference} from '../catalogIdentity';
import type {CatalogRemoteState} from '../catalogIdentity';
import {MAX_IMPORTED_TEXTURE_SIDE, normalizeTextureBlob} from '../textureNormalization';
import {
  assertActivePresetImportCapacity,
  createActivePresetImportBudget,
  PersonalPresetQuotaError,
  type PersonalPresetImportBudget,
} from '../personalQuotaGuard';
import {PERSONAL_PRESET_LIMIT} from '../personalLibraryTypes';
import {
  addPresetImportIdentity,
  buildPresetImportIdentitySet,
  hasPresetImportIdentity,
} from '../presetImportIdentity';
import {absolutePresetUrl} from '../presetDeepLink';

import type {Engine} from '../Engine.ts';
import type { ExpmapMotion } from '../expmap/motion';
import VideoExportPanel from './VideoExportPanel.vue';
import ExpmapPanel from './ExpmapPanel.vue';
import { expmapBusy, expmapOpenDocument } from '../expmap/runtime';
import {runVideoExportToWebm} from '../videoExportRunner';
import type {VideoOutputSpec, VideoPathLocation} from '../videoPath';
import {
  DEFAULT_TILED_EXPORT_MEMORY_PROFILE,
  type VideoExportRenderMode,
} from '../tiledKeyframeExport';
const props = defineProps<{
  engine: Engine | null;
  outputDiagnostics?: Engine['outputDiagnostics'] | null;
  hdrDisplayDisabled?: boolean;
  mandelbrotCtrl?: any;
  suspendShortcuts?: (suspend: boolean) => void;
  activeTab: string;
  primary?: string;
  pickerMode?: boolean;
  pickerAction?: 'add' | 'select';
  userRole?: UserRole;
  activePresetGuid?: string | null;
  requestSignIn?: () => Promise<void>;
}>();

const router = useRouter();
const { t, locale } = useI18n();
const textureVariableOptions = computed(() => TEXTURE_MAPPING_VARIABLE_OPTIONS.map(o => ({ label: t(`settings.textureVariables.${o.value}`), value: o.value })));
const settingsRoot = ref<HTMLElement | null>(null);
watch(() => props.primary, async () => {
  await nextTick();
  const body = settingsRoot.value?.closest('.body');
  if (body) body.scrollTop = 0;
});

const userRole = computed<UserRole>(() => props.userRole ?? 'guest');
const isAdmin = computed(() => canShowAdminUpload(userRole.value));
const uploadSuccessKeys = ref<Set<string>>(new Set());
const uploadSuccessTimers = new Map<string, ReturnType<typeof setTimeout>>();
const UPLOAD_SUCCESS_DURATION_MS = 2500;

function uploadSuccessKey(type: string, id: string | number): string {
  return `${type}:${id}`;
}

function isUploadSuccess(key: string): boolean {
  return uploadSuccessKeys.value.has(key);
}

function showUploadSuccess(key: string): void {
  const existingTimer = uploadSuccessTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);

  const nextKeys = new Set(uploadSuccessKeys.value);
  nextKeys.add(key);
  uploadSuccessKeys.value = nextKeys;

  uploadSuccessTimers.set(key, setTimeout(() => {
    const remainingKeys = new Set(uploadSuccessKeys.value);
    remainingKeys.delete(key);
    uploadSuccessKeys.value = remainingKeys;
    uploadSuccessTimers.delete(key);
  }, UPLOAD_SUCCESS_DURATION_MS));
}

function uploadButtonClasses(key: string, remote?: {publishedName?: string; lastUpdated?: string}) {
  return {
    'is-upload-success': isUploadSuccess(key),
    'is-remote': !!remote && !isUploadSuccess(key),
  };
}

function uploadButtonTitle(key: string, remote?: {publishedName?: string; lastUpdated?: string}): string {
  if (isUploadSuccess(key)) return t('settings.upload.success');
  if (remote) return t('settings.upload.alreadyShared');
  return t('settings.upload.upload');
}

function uploadButtonIcon(key: string): string {
  return isUploadSuccess(key) ? 'fa-solid fa-check' : 'fa-solid fa-upload';
}

function canUploadTexture(texture: TextureMetadata): boolean {
  return !!texture.guid;
}

// BLA radius ε on a log10 scale: slider value is the exponent (R = ε·|Z|).
// Bounded to [1e-12, 1e-4]: the affine BLA has no other error control, and
// above 1e-4 its blocks visibly diverge from exact stepping (1e-6 is the
// default; see Engine.BLA_LINEARIZATION_EPSILON).
const blaEpsilonExp = computed({
  get: () => Math.round(Math.log10(model.value.blaEpsilon ?? 1e-6)),
  set: (exp: number) => {
    model.value.blaEpsilon = Math.pow(10, Math.min(-4, Math.max(-12, Math.round(exp))));
  },
});

// Navigation precision budget on a power-of-ten scale: the slider value is the (negative)
// exponent of the target scale the reference stays precise at. Range 1e-1 … 1e-1000
// (≈ 3300 bits at the deepest). Default 1e-30. Deeper budgets cost more (full reference
// recompute) but keep deep zoom accurate; past the budget the render degrades (assumed).
const precisionBudgetExp = computed({
  get: () => {
    const m = /1e(-?\d+)/i.exec(model.value.precisionBudget ?? '1e-30');
    return m ? Math.abs(parseInt(m[1], 10)) : 30;
  },
  set: (exp: number) => {
    const e = Math.min(1000, Math.max(1, Math.round(exp)));
    model.value.precisionBudget = `1e-${e}`;
  },
});

const emit = defineEmits<{
  'toggle-picker': [action?: 'add' | 'select'];
  'open-video': [];
  'toggle-hdr-display': [];
  'preset-selected': [guid: string, isCatalogPreset: boolean];
}>();
const model =  defineModel<MandelbrotParams>({
  default: {
    angle: 0,
    cx: "0.0",
    cy: "0.0",
    scale: "2.5",
    mu: 1000000.0,
    epsilon: 1e-9,
    colorStops: [],
     palettePeriod: 256,
     paletteOffset: 0,
     paletteScreenShiftX: 0,
     paletteScreenShiftY: 0,
     heightPaletteShift: 0,
    paletteMirror: false,
    iterationPaletteCurve: 'linear',
    antialiasLevel: 1,
    aaAuto: false,
    aaAdaptive: true,
    tessellationLevel: 0,
    lightAngle: 0,
      displacementAmount: 0,
      animation: normalizeAnimationConfig(null, 1.0),
      activateAnimate: false,
      debugShading: false,
      animationSpeed: 1.0,
     microBumpStrength: 0,
     reliefDepth: 1,
     protrusionPhase: 0,
     protrusionSharpness: 2,
     protrusionStrength: 1,
     protrusionGeometryMix: 0,
     protrusionPeriod: 1,
     ambientOcclusionStrength: 0,
     localShadowStrength: 0,
     varnishStrength: 0,
     gradeContrast: 1.18,
     gradeSaturation: 1.12,
     orbitTrapStrength: 0,
     orbitTrap: cloneOrbitTrap(DEFAULT_ORBIT_TRAP),
     phaseColoringStrength: 0,
     stripeFrequency: 8,
     textureName: 'Gold',
      skyboxName: 'Window',
      textureMapping: normalizeTextureMappingFromLegacy({ textureMappingMode: 0 }),
    dprMultiplier: 1.0,
    maxIterationMultiplier: 1.0,
     interpolationMode: 'lab',
     approximationMode: 'bla',
     targetFps: 60,
  }
});

function ensureActiveTextureMapping() {
  model.value.textureMapping = normalizeTextureMappingFromLegacy(model.value);
  delete (model.value as any).textureMappingMode;
}

ensureActiveTextureMapping();

function ensureActiveOrbitTrap() {
  model.value.orbitTrap = normalizeOrbitTrapFromLegacy(model.value);
  model.value.orbitTrapStrength = model.value.orbitTrap.strength;
}

ensureActiveOrbitTrap();

const orbitTrapModeOptions = computed(() => [
  { label: t('settings.palettes.orbitTrap.modeOff'), value: 'off' },
  { label: t('settings.palettes.orbitTrap.modeTerminal'), value: 'terminal' },
  { label: t('settings.palettes.orbitTrap.modeSampled'), value: 'sampled' },
  { label: t('settings.palettes.orbitTrap.modeExact'), value: 'exact' },
]);

const iterationPaletteCurveOptions = computed((): {label: string; value: IterationPaletteCurve}[] => [
  { label: t('settings.palettes.curve.linear'), value: 'linear' },
  { label: t('settings.palettes.curve.softRoot'), value: 'soft-root' },
  { label: t('settings.palettes.curve.logarithmic'), value: 'logarithmic' },
  { label: t('settings.palettes.curve.quadratic'), value: 'quadratic' },
]);

const orbitTrapConfig = computed(() => normalizeOrbitTrapFromLegacy(model.value));

function setOrbitTrapMode(value: string | number) {
  ensureActiveOrbitTrap();
  const mode = value === 'terminal' || value === 'sampled' || value === 'exact'
    ? value
    : 'off';
  const next = { ...model.value.orbitTrap!, mode };
  if (mode !== 'off' && next.strength <= 0) next.strength = 70;
  model.value.orbitTrap = normalizeOrbitTrapFromLegacy({ orbitTrap: next });
  model.value.orbitTrapStrength = model.value.orbitTrap.strength;
}

function setOrbitTrapBoolean(field: 'includeInterior', value: boolean) {
  ensureActiveOrbitTrap();
  model.value.orbitTrap = normalizeOrbitTrapFromLegacy({
    orbitTrap: { ...model.value.orbitTrap!, [field]: value },
  });
}

function setOrbitTrapNumber(field: keyof typeof DEFAULT_ORBIT_TRAP, value: number) {
  ensureActiveOrbitTrap();
  const next = { ...model.value.orbitTrap } as unknown as Record<string, unknown>;
  next[field] = value;
  model.value.orbitTrap = normalizeOrbitTrapFromLegacy({ orbitTrap: next });
  if (field === 'strength') model.value.orbitTrapStrength = model.value.orbitTrap.strength;
}

const textureMappingXScaleSlider = computed({
  get: () => Math.log10(normalizeTextureMappingFromLegacy(model.value).xScale),
  set: (value: number) => {
    ensureActiveTextureMapping();
    model.value.textureMapping!.xScale = Number(Math.pow(10, value).toPrecision(4));
    triggerTextureMappingUpdate();
  },
});

const textureMappingYScaleSlider = computed({
  get: () => Math.log10(normalizeTextureMappingFromLegacy(model.value).yScale),
  set: (value: number) => {
    ensureActiveTextureMapping();
    model.value.textureMapping!.yScale = Number(Math.pow(10, value).toPrecision(4));
    triggerTextureMappingUpdate();
  },
});

const textureMappingXVariable = computed({
  get: () => normalizeTextureMappingFromLegacy(model.value).xVariable,
  set: (value) => {
    ensureActiveTextureMapping();
    model.value.textureMapping!.xVariable = value;
    triggerTextureMappingUpdate();
  },
});

const textureMappingYVariable = computed({
  get: () => normalizeTextureMappingFromLegacy(model.value).yVariable,
  set: (value) => {
    ensureActiveTextureMapping();
    model.value.textureMapping!.yVariable = value;
    triggerTextureMappingUpdate();
  },
});

const textureMappingMirror = computed({
  get: () => normalizeTextureMappingFromLegacy(model.value).mirrored,
  set: (value: boolean) => {
    ensureActiveTextureMapping();
    model.value.textureMapping!.mirrored = value;
    triggerTextureMappingUpdate();
  },
});

function applyTextureMapping(mapping: unknown) {
  model.value.textureMapping = normalizeTextureMappingFromLegacy({ textureMapping: mapping });
  delete (model.value as any).textureMappingMode;
}

const activeTextureMappingLabel = computed(() => {
  const active = normalizeTextureMappingFromLegacy(model.value);
  const matching = textureMappingPresets.value.find(preset => textureMappingEquals(preset.mapping, active));
  return matching?.name ?? 'Custom';
});


// Slider rotation : angle en ° mod 360 (wrapping)
const angleSlider = computed({
  get: () => (((model.value.angle * 180 / Math.PI) % 360 + 360) % 360),
  set: (deg: number) => {
    // [0, 360) vers radian
    model.value.angle = (deg % 360) * Math.PI / 180;
  },
});
// Slider palette period : logarithmique, 0–1 ↔ 1–1000000
const sliderPalettePeriod = computed({
  get: () => Math.log10(model.value.palettePeriod || 1) / 6,
  set: val => {
    model.value.palettePeriod = Number((10 ** (val * 6)).toPrecision(6));
  }
});

/** Format palettePeriod for display: use K/M suffixes for large values. */
function formatPalettePeriod(val: number): string {
  if (val >= 1_000_000) return (val / 1_000_000).toPrecision(3) + 'M';
  if (val >= 1_000) return (val / 1_000).toPrecision(3) + 'K';
  if (val >= 10) return val.toFixed(0);
  return val.toPrecision(3);
}
// Slider phase coloring : logarithmique, 0–1 ↔ 0–100
const sliderPhaseColoring = computed({
  get: () => {
    const v = model.value.phaseColoringStrength ?? 0;
    return v <= 0 ? 0 : Math.log10(v + 1) / 2;
  },
  set: val => {
    model.value.phaseColoringStrength = val <= 0 ? 0 : Math.round((10 ** (val * 2) - 1) * 10) / 10;
  }
});
// Decimal order of magnitude of a (possibly very deep) scale string, straight
// from the string's digits — the navigator emits PLAIN decimal strings
// ("0.000…000465"), which parseFloat underflows to 0 below ~1e-308 (the old
// implementation then read magnitude 0 and the slider snapped back to 1e-1).
// Returns log10(scale) (negative when zoomed in), 0 for zero/malformed input.
function scaleLog10(scaleStr: string): number {
  const log = log10FromDecimalString(scaleStr ?? '');
  return Number.isFinite(log) ? log : 0;
}

const SCALE_SLIDER_MAX = 1000;

// The slider maps to the decimal zoom depth: position v ⇒ scale 1e-v, so it
// reads directly as a power of ten (-10 → 10¹⁰ … 1000 → 10⁻¹⁰⁰⁰). The scale is set
// as a `1e-v` STRING — never `2**-v`, which underflows past ~1e-324. The
// arbitrary-precision navigator parses the string natively.
const scaleSlider = computed({
  get: () => {
    const mag = -scaleLog10(model.value.scale);
    if (!isFinite(mag)) return -10;
    // floor, not round: the decade shown is the one the fine slider is in.
    return Math.min(Math.max(Math.floor(mag + 1e-9), -10), SCALE_SLIDER_MAX);
  },
  set: (val: number) => {
    const v = Math.min(Math.max(Math.round(val), -10), SCALE_SLIDER_MAX);
    model.value.scale = `1e${-v}`;
  }
});

// ── Two-stage zoom ───────────────────────────────────────────────────
// The decade slider above moves one order of magnitude per step. The fine
// slider covers the decade [fineDecade, fineDecade+1] of decimal depth
// D = −log10(scale): its position is the fractional part of D. Releasing it
// at either end re-parametrises onto the neighbouring decade (the scale is
// unchanged at that instant), so a long fine zoom proceeds decade by decade.
const depthLog = computed(() => -scaleLog10(model.value.scale));
const fineDecade = ref(Math.floor(depthLog.value));
watch(depthLog, (d) => {
  // Follow external changes (wheel, coarse slider, presets) once D leaves
  // the decade the fine slider is parked on.
  if (d < fineDecade.value || d > fineDecade.value + 1) fineDecade.value = Math.floor(d);
});
/** Write scale = 10^-depth as mantissa·10^-(k+1), mantissa ∈ [1, 10]. */
function setDepth(depth: number) {
  const d = Math.min(Math.max(depth, -10), SCALE_SLIDER_MAX + 1);
  const k = Math.floor(d + 1e-9);
  const mantissa = 10 ** (1 - (d - k));
  model.value.scale = `${mantissa.toPrecision(7)}e${-(k + 1)}`;
}
const fineSlider = computed({
  get: () => Math.min(1, Math.max(0, depthLog.value - fineDecade.value)),
  set: (f: number) => setDepth(fineDecade.value + Math.min(1, Math.max(0, f))),
});
/** ± one decade, keeping the fractional depth (the fine position). */
function stepDecade(delta: number) { setDepth(depthLog.value + delta); }
function stepQuarterTurn(delta: number) { model.value.angle = model.value.angle + delta * Math.PI / 2; }
// Shown as decimal depth (13.861 = scale 10^-13.861) so the fine reading
// continues the decade slider instead of introducing a mantissa.
const fineFmt = (v: number) => (fineDecade.value + v).toFixed(3);
function onFineRelease() {
  const f = fineSlider.value;
  if (f >= 0.999) fineDecade.value += 1;
  else if (f <= 0.001 && fineDecade.value > -10) fineDecade.value -= 1;
}
/** Scientific rendering of the scale string with 6 significant digits. */
function scaleSciFormat(value: string): string {
  const m = /^\s*([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?\s*$/.exec(value);
  if (!m) return value;
  const digits = ((m[2] ?? '') + (m[3] ?? ''));
  const lead = digits.search(/[1-9]/);
  if (lead < 0) return '0';
  const exponent = (m[4] ? parseInt(m[4], 10) : 0) + (m[2] ?? '').length - 1 - lead;
  const mant = digits.slice(lead, lead + 7).padEnd(7, '0');
  const rounded = Math.round(parseInt(mant, 10) / 10) / 1e5;
  return `${m[1]}${rounded.toFixed(5)}e${exponent}`;
}
function parseScaleInput(text: string): string | null {
  const normalized = text.replace(/\s+/g, '').replace('×10^', 'e').replace('^', 'e');
  if (!/^\+?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(normalized)) return null;
  if (/^0*\.?0*(e|$)/i.test(normalized)) return null;
  return normalized.toLowerCase();
}

// ── Dense field formatters (Navigation) ──────────────────────────────
const zoomFmt = (v: number) => `1e${-Math.round(v)}`;
const angleFmt = (v: number) => v.toFixed(1);
const muFmt = (v: number) => Math.pow(10, v).toFixed(1);

// ── Dense field formatters (Performance) ─────────────────────────────
const radiusFmt = (v: number) => Math.pow(10, v).toExponential(0);
// Slider value is the positive exponent; display as the target scale (e.g. 30 → "1e-30").
const precisionBudgetFmt = (v: number) => `1e-${Math.round(v)}`;
// ── Quality presets (Performance tab) ────────────────────────────────
// Discrete choices replace free sliders: every value here is one the render
// path handles well (power-of-two AA budgets, DPR steps the surface fit can
// honour, swap ratios the frozen/live cycle was measured at).
const RESOLUTION_PRESETS = [0.125, 0.25, 0.5, 0.75, 1, 1.5, 2] as const;
const resolutionOptions = RESOLUTION_PRESETS.map(v => ({ label: 'DPR ×' + String(v), value: v }));
const AA_SAMPLE_PRESETS = [1, 2, 4, 8, 16, 32, 64, 128, 256] as const;
const aaSampleOptions = computed(() => AA_SAMPLE_PRESETS.map(v => ({ label: v === 1 ? t('common.off') : `${v}×`, value: v })));
const ZOOM_THRESHOLD_PRESETS = [2, 4, 6, 8, 16, 32, 64] as const;
const zoomThresholdOptions = ZOOM_THRESHOLD_PRESETS.map(v => ({ label: `×${v}`, value: v }));
/** Nearest preset, so a saved free value (e.g. DPR 0.625) still selects an option. */
function nearestPreset(value: number, presets: readonly number[]): number {
  let best = presets[0];
  for (const p of presets) if (Math.abs(p - value) < Math.abs(best - value)) best = p;
  return best;
}
const iterationsFmt = (v: number) => '×' + Math.pow(10, v).toPrecision(3);
const fpsFmt = (v: number) => v + ' fps';
// The engine implements exact perturbation and affine BLA only; presets
// carrying a retired mode (auto / pade / jet / mobius) run BLA.
const calculationOptions = computed(() => [
  { label: 'BLA', value: 'bla' },
  { label: t('settings.performance.advanced.noSkips'), value: 'perturbation' },
]);

// ── Dense field formatters (Palettes) ────────────────────────────────
const palettePeriodFmt = () => formatPalettePeriod(model.value.palettePeriod);
const pctFmt = (v: number) => (v * 100).toFixed(1) + '%';
const phaseColoringFmt = () => (model.value.phaseColoringStrength ?? 0).toFixed(1) + '×';
const degFmt = (v: number) => v + '°';
const radFmt = (v: number) => v.toFixed(2) + ' rad';
const imgDispFmt = (v: number) => '×' + v.toFixed(3);
const xScaleFmt = () => '×' + normalizeTextureMappingFromLegacy(model.value).xScale.toFixed(2);
const yScaleFmt = () => '×' + normalizeTextureMappingFromLegacy(model.value).yScale.toFixed(2);

// Texture-mapping presets are shown as a simple select (no visual preview).
const mappingSelectOptions = computed(() =>
  textureMappingPresets.value.map(p => ({
    label: p.name + (p.builtIn ? t('settings.textures.mapping.builtInSuffix') : ''),
    value: p.name,
  })),
);
const activeMappingPreset = computed(() =>
  textureMappingPresets.value.find(p => p.name === activeTextureMappingLabel.value),
);
function onSelectMappingPreset(name: string | number) {
  const preset = textureMappingPresets.value.find(p => p.name === name);
  if (preset) selectTextureMappingPresetFromDropdown(preset);
}


const coordsCopied = ref(false);
function copyCoordinates() {
  const txt = `${model.value.cx}, ${model.value.cy}`;
  navigator.clipboard?.writeText(txt);
  coordsCopied.value = true;
  window.setTimeout(() => { coordsCopied.value = false; }, 1200);
}

function updateCx(val: string) {
  model.value = {
    ...model.value,
    cx: val
  };
}

function updateCy(val: string) {
  model.value = {
    ...model.value,
    cy: val
  };
}

// Deep "find minibrot": ask the engine to detect the atom under the current
// view (full-precision period detection + Newton nucleus), then recentre the
// view exactly on its nucleus, keeping the current zoom.
const findingMinibrot = ref(false);
const zoomingMinibrot = ref(false);
const findMinibrotStatus = ref<string | null>(null);
let findMinibrotStatusTimer: ReturnType<typeof setTimeout> | null = null;


function setMinibrotStatus(text: string) {
  findMinibrotStatus.value = text;
  if (findMinibrotStatusTimer) clearTimeout(findMinibrotStatusTimer);
  findMinibrotStatusTimer = setTimeout(() => { findMinibrotStatus.value = null; }, 4000);
}

async function findMinibrot() {
  if (!props.engine || findingMinibrot.value || zoomingMinibrot.value) return;
  findingMinibrot.value = true;
  findMinibrotStatus.value = null;
  try {
    const { next, status } = await centerOnMinibrot(props.engine, model.value);
    // Setting the model centre teleports the view via the parent watcher
    // (cancel transition → origin → resetReference), keeping the zoom.
    if (next) model.value = next;
    setMinibrotStatus(status);
  } finally {
    findingMinibrot.value = false;
  }
}

// Neighbour of "Find minibrot": same detection, but the view is *framed* on the
// copy instead of merely centred on its nucleus (see minibrotActions.ts).
async function zoomToMinibrot() {
  if (!props.engine || findingMinibrot.value || zoomingMinibrot.value) return;
  zoomingMinibrot.value = true;
  findMinibrotStatus.value = null;
  try {
    const { next, status } = await frameMinibrot(props.engine, model.value);
    // One model replacement ⇒ the parent watcher applies centre + scale in the
    // same sync pass (teleport, then the new zoom), instead of two teleports.
    if (next) model.value = next;
    setMinibrotStatus(status);
  } finally {
    zoomingMinibrot.value = false;
  }
}

function generatePaletteThumbnail(colorStops: any[], mode: InterpolationMode = 'lab'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (colorStops.length === 0) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  const palette = new Palette(colorStops, mode);
  const rowData = palette.generateThumbnailRow(); // ImageData (4096×1, always opaque)

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = rowData.width;
  tempCanvas.height = 1;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return '';
  tempCtx.putImageData(rowData, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

const navigationPreview = ref<string | null>(null);
const presetName = ref('');
const presets = ref<PresetMetadata[]>([]);
/** Full record cache: loaded on demand when a preset is selected. */
const presetCache = new Map<number, PresetRecord>();

// Palette management
const paletteName = ref('');
const paletteEditorRef = ref<InstanceType<typeof PaletteEditor> | null>(null);
const animationPanelRef = ref<InstanceType<typeof AnimationPanel> | null>(null);
const palettes = ref<PaletteRecord[]>([]);
const selectedPalette = ref('');
const showPaletteDropdown = ref(false);
const applyToAll = ref(false);

const MAX_COLORS = 200;
const previewRef = ref<InstanceType<typeof PalettePreview> | null>(null);
const selectedIdx = ref<number | null>(0);
const paletteTab = ref('color');
const presetQuery = ref('');
const presetSort = ref('recent');

watch(() => model.value.colorStops.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    selectedIdx.value = newLen - 1;
  }
});

// ── Compact "Point · Couleur" quickbar, rendered above the palette strip.
// Mirrors PaletteEditor.vue's per-stop color/curve/effect fields but reads/writes
// `model` directly (no Teleport — see git history for why that approach was dropped).
const quickSelectedStop = computed(() => {
  if (selectedIdx.value === null) return null;
  return model.value.colorStops[selectedIdx.value] ?? null;
});

const quickSelectedHex = computed({
  get() {
    if (selectedIdx.value === null || model.value.colorStops.length === 0) return '#ffffff';
    const c = model.value.colorStops[selectedIdx.value]?.color || '#ffffff';
    try {
      return d3rgb(c).formatHex();
    } catch {
      return '#ffffff';
    }
  },
  set(hex: string) {
    if (selectedIdx.value !== null && model.value.colorStops[selectedIdx.value]) {
      model.value.colorStops[selectedIdx.value] = {
        ...model.value.colorStops[selectedIdx.value],
        color: hex,
      };
    }
  },
});

const quickSelectedIridescenceHex = computed({
  get() {
    if (!quickSelectedStop.value?.iridescenceColor) return '#ffffff';
    try {
      return d3rgb(quickSelectedStop.value.iridescenceColor).formatHex();
    } catch {
      return '#ffffff';
    }
  },
  set(hex: string) {
    if (applyToAll.value) {
      for (const stop of model.value.colorStops) stop.iridescenceColor = hex;
    } else {
      if (selectedIdx.value === null) return;
      const stop = model.value.colorStops[selectedIdx.value];
      if (!stop) return;
      stop.iridescenceColor = hex;
    }
  },
});

function quickEnableIridescenceColor() {
  quickSelectedIridescenceHex.value = quickSelectedHex.value;
}

function quickClearIridescenceColor() {
  if (applyToAll.value) {
    for (const stop of model.value.colorStops) delete stop.iridescenceColor;
  } else {
    if (selectedIdx.value === null) return;
    const stop = model.value.colorStops[selectedIdx.value];
    if (!stop) return;
    delete stop.iridescenceColor;
  }
}

const quickSelectedTransferCurve = computed<StopTransferCurve>({
  get() {
    return quickSelectedStop.value ? getStopTransferCurve(quickSelectedStop.value) : 'linear';
  },
  set(curve: StopTransferCurve) {
    const newCurve = curve === 'linear' ? undefined : curve;
    if (applyToAll.value) {
      for (const stop of model.value.colorStops) stop.transferCurve = newCurve;
    } else {
      if (selectedIdx.value === null) return;
      const stop = model.value.colorStops[selectedIdx.value];
      if (!stop) return;
      stop.transferCurve = newCurve;
    }
  },
});

// ── Stop preset list + current selection, shared with PaletteEditor's "Point · Presets"
// section below (v-model'd down as props so both stay in sync). ──
const stopPresets = ref<StopPresetRecord[]>([]);
const selectedStopPresetName = ref('');

async function refreshStopPresets() {
  await ensureDefaultStopPresetEntries();
  stopPresets.value = await getAllStopPresetEntries();
}

/** Quickbar preset picker: applies immediately when an entry is selected. */
function applyQuickStopPreset(name: string) {
  selectedStopPresetName.value = name;
  const preset = stopPresets.value.find(item => item.name === name);
  if (!preset) return;
  if (applyToAll.value) {
    for (let i = 0; i < model.value.colorStops.length; i += 1) {
      const stop = model.value.colorStops[i];
      if (stop) model.value.colorStops[i] = applyStopPresetValues(stop, preset.values);
    }
  } else {
    if (selectedIdx.value === null) return;
    const stop = model.value.colorStops[selectedIdx.value];
    if (!stop) return;
    model.value.colorStops[selectedIdx.value] = applyStopPresetValues(stop, preset.values);
  }
}

function selectColor(idx: number) {
  selectedIdx.value = idx;
}

function deleteSelectedStop() {
  if (selectedIdx.value === null) return;
  if (model.value.colorStops.length <= 2) return; // garder au moins 2 stops
  model.value.colorStops.splice(selectedIdx.value, 1);
  // Ajuster la sélection
  if (selectedIdx.value >= model.value.colorStops.length) {
    selectedIdx.value = model.value.colorStops.length - 1;
  }
}

function addPaletteStop() {
  if (model.value.colorStops.length >= MAX_COLORS) return;
  const current = quickSelectedStop.value?.position ?? 0;
  const positions = model.value.colorStops.map(p => p.position).sort((a, b) => a - b);
  const neighbor = current < 1
    ? positions.find(p => p > current) ?? 1
    : [...positions].reverse().find(p => p < current) ?? 0;
  const t = (current + neighbor) / 2;
  const pal = new Palette(model.value.colorStops, model.value.interpolationMode);
  model.value.colorStops.push(createInterpolatedColorStop(model.value.colorStops, t, pal.getColorAt(t)));
  selectedIdx.value = model.value.colorStops.length - 1;
  applyToAll.value = false;
}
function onPreviewDblClick(event: MouseEvent) {
  if (model.value.colorStops.length >= MAX_COLORS) return;
  const canvas = previewRef.value?.canvasRef;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  let t = (event.clientX - rect.left) / rect.width;
  t = Math.max(0, Math.min(1, t));
  const pal = new Palette(model.value.colorStops, model.value.interpolationMode);
  const sampledColor = pal.getColorAt(t);
  const newStop = createInterpolatedColorStop(model.value.colorStops, t, sampledColor);
  model.value.colorStops.push(newStop);
  selectedIdx.value = model.value.colorStops.length - 1;
}


async function deletePresetById(id: number) {
  const meta = presets.value.find(p => p.id === id);
  if (!canDeleteCatalogEntry(userRole.value, meta?.remote)) {
    window.alert(t('settings.presets.sharedCannotDelete'));
    return;
  }
  const label = meta?.name || formatPresetDate(meta?.date ?? '');
  if (!window.confirm(t('settings.presets.deleteConfirm', { name: label }))) return;
  await deletePresetEntry(id);
  presetCache.delete(id);
  presets.value = await getAllPresetEntries();
  if (sceneLink.origin.value?.key === String(id)) sceneLink.unlink();
  if (selectedPreset.value === id) {
    selectedPreset.value = null;
    presetName.value = '';
  }
}

async function refreshNavigationPreview() {
  if (props.engine) {
    navigationPreview.value = await props.engine.getSnapshotPng(256);
  }
}

const selectedPreset = ref<number | null>(null);
const showPresetDropdown = ref(false);

async function selectPresetFromDropdown(preset: PresetMetadata) {
  await selectPreset(preset.id);
  showPresetDropdown.value = false;
  emit('preset-selected', preset.guid, !!preset.remote);
}

/** Format an ISO date string for display. */
function formatPresetDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const loc = locale.value;
    return d.toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

/**
 * Unnamed entries fall back to an ISO timestamp as their `name` (see save logic).
 * Treat those as auto-named so the card shows only the date, not a raw ISO string.
 */
function isAutoName(name: string | undefined | null): boolean {
  if (!name || !name.trim()) return true;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(name);
}

/** The real user-given name, or '' when the entry is unnamed (date-only). */
function displayName(name: string | undefined | null): string {
  return isAutoName(name) ? '' : (name ?? '');
}

/** Format scale exponent for display, e.g. "10^42". */
function formatZoom(exp: number): string {
  if (exp <= 0) return '1\u00d7';
  return '10^' + exp;
}

// Navigation tab: load only location (cx, cy, scale, angle) from a preset
const selectedNavPreset = ref<number | null>(null);
const showNavPresetDropdown = ref(false);

const currentNavPresetMeta = computed(() => presets.value.find(p => p.id === selectedNavPreset.value));
const currentNavPresetThumbnail = computed(() => currentNavPresetMeta.value?.thumbnail);
const presetLinkCopied = ref(false);
let presetLinkCopiedTimer: ReturnType<typeof setTimeout> | null = null;

const shareBusy = ref(false);
const shareSaving = ref(false);
const shareMessage = ref('');
const shareError = ref(false);
const shareLabel = computed(() => {
  if (shareBusy.value || shareSaving.value) return t('settings.presets.share.syncing');
  if (sceneLink.origin.value?.remote && !sceneLink.dirty.value) return t('common.copyLink');
  if (userRole.value === 'guest') return t('settings.presets.share.signInToShare');
  if (!sceneLink.origin.value || sceneLink.locked.value) return t('settings.presets.share.saveAndCopyLink');
  return sceneLink.dirty.value ? t('settings.presets.share.saveAndCopyLink') : t('common.copyLink');
});

async function copyPresetLink(id: number): Promise<void> {
  if (shareBusy.value) return;
  shareBusy.value = true;
  shareMessage.value = '';
  shareError.value = false;
  try {
    const query = await prepareSceneShare(id);
    const url = absolutePresetUrl(router.resolve({path: '/', query}).href, window.location.href);
    try { await navigator.clipboard.writeText(url); }
    catch { window.prompt(t('settings.presets.share.copyPrompt'), url); return; }
    presetLinkCopied.value = true;
    shareMessage.value = t('settings.presets.share.linkCopiedMessage');
    if (presetLinkCopiedTimer) clearTimeout(presetLinkCopiedTimer);
    presetLinkCopiedTimer = setTimeout(() => { presetLinkCopied.value = false; }, 2500);
  } catch (error) {
    shareError.value = true;
    shareMessage.value = error instanceof Error ? error.message : t('settings.presets.share.failed');
  } finally { shareBusy.value = false; }
}

async function shareCurrentScene(): Promise<void> {
  if (shareBusy.value || shareSaving.value || sceneLinkBusy.value) return;
  shareSaving.value = true;
  shareError.value = false;
  shareMessage.value = '';
  try {
    if (sceneLink.origin.value?.remote && !sceneLink.dirty.value) {
      await copyPresetLink(Number(sceneLink.origin.value.key));
      return;
    }
    if (userRole.value === 'guest') {
      if (!props.requestSignIn) throw new Error(t('settings.presets.share.signInRequired'));
      const pending = buildScenePresetValue();
      for (const [guidKey, nameKey] of [['textureGuid', 'textureName'], ['skyboxGuid', 'skyboxName']] as const) {
        const texture = textures.value.find(t => t.guid === pending[guidKey]);
        if (!texture || texture.remote || texture.guid?.startsWith('shared:')) continue;
        const blob = await getTextureBlob(texture.name);
        if (!blob) throw new Error(t('settings.presets.share.textureUnavailable'));
        const alias = `shared:guest:${texture.guid}`;
        const name = `${texture.name} · partagé guest:${texture.guid}`;
        registerSharedTexture({...texture, guid: alias, name}, blob);
        pending[guidKey] = alias;
        pending[nameKey] = name;
      }
      await props.requestSignIn();
      model.value = preserveSessionPerformanceFields(pending, model.value);
      await loadTextures();
    }
    const origin = sceneLink.origin.value;
    let id: number;
    if (origin && !sceneLink.locked.value) {
      id = Number(origin.key);
      if (sceneLink.dirty.value) {
        const record = await getPresetById(id);
        if (!record) throw new Error(t('settings.presets.share.presetGone'));
        await updatePresetEntry({...record, value: buildScenePresetValue(), thumbnail: await sceneThumbnail(), lastUpdated: new Date().toISOString()});
        presetCache.delete(id);
        sceneLink.refresh();
      }
    } else {
      await savePreset();
      id = selectedPreset.value!;
    }
    await copyPresetLink(id);
    presets.value = await getAllPresetEntries();
  } catch (error) {
    shareError.value = true;
    shareMessage.value = error instanceof Error ? error.message : t('settings.presets.share.failed');
  } finally { shareSaving.value = false; }
}

async function renameSceneCard(preset: PresetMetadata) {
  const name = window.prompt(t('settings.presets.renamePrompt'), preset.name);
  try { if (name?.trim()) await renameLinkedScenePresetById(preset.id, name.trim()); }
  catch (error) { shareError.value = true; shareMessage.value = error instanceof Error ? error.message : String(error); }
}
async function duplicateSceneCard(preset: PresetMetadata) {
  try {
    const record = await getPresetById(preset.id);
    if (!record) return;
    await savePresetEntry(record.value, record.thumbnail, t('settings.copyName', { name: record.name }));
    presets.value = await getAllPresetEntries();
  } catch (error) { shareError.value = true; shareMessage.value = String(error); }
}

const favoritePresets = computed(() => presets.value.filter(p => p.favorite));
const favoritePalettes = computed(() => palettes.value.filter(p => p.favorite));
const FAVORITE_FILTER_STORAGE_KEY = 'mandelbrot_favorite_filters';

function loadFavoriteFilterState(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(FAVORITE_FILTER_STORAGE_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

const favoriteFilterState = loadFavoriteFilterState();
const showOnlyFavoriteNavigation = ref(favoriteFilterState.navigation ?? false);
const showOnlyFavoritePresets = ref(favoriteFilterState.presets ?? false);
const showOnlyFavoritePalettePresets = ref(favoriteFilterState.palettePresets ?? false);
const showOnlyFavoritePalettes = ref(favoriteFilterState.palettes ?? false);
const visibleNavPresets = computed(() => showOnlyFavoriteNavigation.value ? favoritePresets.value : presets.value);
const visiblePresets = computed(() => {
  const q = presetQuery.value.trim().toLocaleLowerCase();
  const list = (showOnlyFavoritePresets.value ? favoritePresets.value : presets.value)
    .filter(p => !q || `${p.name ?? ''} ${formatPresetDate(p.date)}`.toLocaleLowerCase().includes(q));
  return [...list].sort((a, b) => presetSort.value === 'name'
    ? (a.name ?? '').localeCompare(b.name ?? '') : String(b.date).localeCompare(String(a.date)));
});
const visiblePalettePresets = computed(() => showOnlyFavoritePalettePresets.value ? favoritePresets.value : presets.value);
const visiblePalettes = computed(() => showOnlyFavoritePalettes.value ? favoritePalettes.value : palettes.value);

watch(
  [showOnlyFavoriteNavigation, showOnlyFavoritePresets, showOnlyFavoritePalettePresets, showOnlyFavoritePalettes],
  ([navigation, presetsOnly, palettePresets, palettesOnly]) => {
    localStorage.setItem(FAVORITE_FILTER_STORAGE_KEY, JSON.stringify({
      navigation,
      presets: presetsOnly,
      palettePresets,
      palettes: palettesOnly,
    }));
  },
);

async function selectPresetLocation(id: number) {
  const record = await getCachedPreset(id);
  if (record) {
    selectedNavPreset.value = id;
    model.value.cx = record.value.cx;
    model.value.cy = record.value.cy;
    model.value.scale = record.value.scale;
    model.value.angle = record.value.angle;
  }
}

async function selectNavPresetFromDropdown(preset: PresetMetadata) {
  await selectPresetLocation(preset.id);
  showNavPresetDropdown.value = false;
}


/** Fetch a preset record, using cache to avoid repeated IDB reads. */
async function getCachedPreset(id: number): Promise<PresetRecord | null> {
  if (presetCache.has(id)) return presetCache.get(id)!;
  const record = await getPresetById(id);
  if (record) presetCache.set(id, record);
  return record;
}

/** The scene payload exactly as `savePreset` stores it (no thumbnail, no name). */
function buildScenePresetValue(): MandelbrotParams {
  // JSON clone (not structuredClone): after a whole-object model replacement the
  // params can carry nested Vue reactive Proxies that toRaw doesn't unwrap, and
  // structuredClone throws DataCloneError on a Proxy. The preset is JSON-saved anyway.
  const savedValue = JSON.parse(JSON.stringify(model.value));
  stripSessionPerformanceFields(savedValue);
  stripExplorationStateFields(savedValue);
  delete (savedValue as any).activateAnimate;
  delete (savedValue as any).debugShading;
  savedValue.animation = normalizeAnimationConfig(savedValue.animation, savedValue.animationSpeed);
  savedValue.animationSpeed = savedValue.animation.globalSpeed;
  savedValue.textureName = selectedTexture.value;
  savedValue.textureGuid = currentTextureObj.value?.guid;
  savedValue.skyboxName = selectedSkyboxTexture.value;
  savedValue.skyboxGuid = currentSkyboxObj.value?.guid;
  savedValue.textureMapping = normalizeTextureMappingFromLegacy(savedValue);
  savedValue.orbitTrap = normalizeOrbitTrapFromLegacy(savedValue);
  savedValue.orbitTrapStrength = savedValue.orbitTrap.strength;
  delete (savedValue as any).textureMappingMode;
  // Session-only diagnostic overlay, and fields older presets never carried:
  // normalize so a freshly loaded preset compares equal to itself.
  delete (savedValue as any).debugView;
  savedValue.paletteScreenShiftX ??= 0;
  savedValue.paletteScreenShiftY ??= 0;
  return savedValue;
}

async function sceneThumbnail(): Promise<string> {
  try {
    if (props.engine) return await props.engine.getSnapshotPng(256);
  } catch { /* ignore errors, no thumbnail */ }
  return '';
}

// ── Linked scene preset: write back / rename / detach ──
const sceneLink = useLinkedRecord('scene', () => buildScenePresetValue());
const sceneLinkBusy = ref(false);

function linkScenePreset(id: number, name: string, remote?: CatalogRemoteState): void {
  sceneLink.link({ kind: 'scene', key: String(id), name, remote });
}

async function updateLinkedScenePreset(): Promise<void> {
  const origin = sceneLink.origin.value;
  if (!origin || sceneLinkBusy.value) return;
  sceneLinkBusy.value = true;
  try {
    const record = await getCachedPreset(Number(origin.key));
    if (!record) { sceneLink.unlink(); return; }
    record.value = buildScenePresetValue();
    record.thumbnail = (await sceneThumbnail()) || record.thumbnail;
    record.lastUpdated = new Date().toISOString();
    record.scaleExponent = computeScaleExponent(record.value.scale);
    await updatePresetEntry(record);
    presetCache.set(record.id, record);
    presets.value = await getAllPresetEntries();
    sceneLink.refresh();
  } catch (error) {
    console.warn('Failed to update linked preset:', error);
  } finally {
    sceneLinkBusy.value = false;
  }
}

async function renameLinkedScenePresetById(id: number, name: string): Promise<void> {
  const record = await getCachedPreset(id);
  if (!record) return;
  record.name = name;
  record.lastUpdated = new Date().toISOString();
  await updatePresetEntry(record);
  presets.value = await getAllPresetEntries();
  record.name = presets.value.find(p => p.id === id)?.name ?? name;
  presetCache.set(id, record);
  if (sceneLink.origin.value?.key === String(id)) { sceneLink.refresh({ name: record.name }); presetName.value = record.name; }
}

async function renameLinkedScenePreset(name: string): Promise<void> {
  const origin = sceneLink.origin.value;
  if (!origin || sceneLinkBusy.value) return;
  sceneLinkBusy.value = true;
  try { await renameLinkedScenePresetById(Number(origin.key), name); }
  finally { sceneLinkBusy.value = false; }
}

function detachScenePreset(): void {
  sceneLink.unlink();
  selectedPreset.value = null;
  presetName.value = '';
}

async function saveScenePresetVariant(): Promise<void> {
  const origin = sceneLink.origin.value;
  if (!origin) return;
  presetName.value = presetName.value.trim() || t('settings.variantName', { name: origin.name });
  await savePreset();
}

async function savePreset() {
  const now = new Date().toISOString();
  const thumbnail = await sceneThumbnail();
  const savedValue = buildScenePresetValue();
  const name = presetName.value.trim();
  const id = await savePresetEntry(savedValue, thumbnail, name || undefined, now);
  presets.value = await getAllPresetEntries();
  const metadata = presets.value.find(preset => preset.id === id);
  const stored = await getPresetById(id);
  if (stored) {
    presetCache.set(id, stored);
    for (const key of ['textureGuid', 'textureName', 'skyboxGuid', 'skyboxName'] as const) model.value[key] = stored.value[key];
    await loadTextures();
  }
  // The freshly saved preset becomes the linked one.
  selectedPreset.value = id;
  presetName.value = metadata?.name ?? name;
  linkScenePreset(id, metadata?.name ?? (name || now), metadata?.remote);
  shareMessage.value = t('settings.presets.share.sceneSaved');
  shareError.value = false;
}

/**
 * Quick snapshot: save the current state without requiring a name.
 * Can be called from a keyboard shortcut via the parent component.
 */
async function quickSnapshot() {
  let thumbnail = '';
  try {
    if (props.engine) {
      thumbnail = await props.engine.getSnapshotPng(256);
    }
  } catch { /* ignore */ }
  // JSON clone (not structuredClone): after a whole-object model replacement the
  // params can carry nested Vue reactive Proxies that toRaw doesn't unwrap, and
  // structuredClone throws DataCloneError on a Proxy. The preset is JSON-saved anyway.
  const savedValue = JSON.parse(JSON.stringify(model.value));
  stripSessionPerformanceFields(savedValue);
  stripExplorationStateFields(savedValue);
  delete (savedValue as any).activateAnimate;
  delete (savedValue as any).debugShading;
  savedValue.animation = normalizeAnimationConfig(savedValue.animation, savedValue.animationSpeed);
  savedValue.animationSpeed = savedValue.animation.globalSpeed;
  savedValue.textureName = selectedTexture.value;
  savedValue.textureGuid = currentTextureObj.value?.guid;
  savedValue.skyboxName = selectedSkyboxTexture.value;
  savedValue.skyboxGuid = currentSkyboxObj.value?.guid;
  savedValue.textureMapping = normalizeTextureMappingFromLegacy(savedValue);
  savedValue.orbitTrap = normalizeOrbitTrapFromLegacy(savedValue);
  savedValue.orbitTrapStrength = savedValue.orbitTrap.strength;
  delete (savedValue as any).textureMappingMode;
  const now = new Date().toISOString();
  const id = await savePresetEntry(savedValue, thumbnail, undefined, now);
  presets.value = await getAllPresetEntries();
  const metadata = presets.value.find(preset => preset.id === id);
  presetCache.set(id, {
    id,
    guid: metadata?.guid ?? crypto.randomUUID(),
    name: metadata?.name ?? now,
    value: savedValue,
    thumbnail,
    date: now,
    lastUpdated: metadata?.lastUpdated ?? now,
    scaleExponent: computeScaleExponent(savedValue.scale),
    favorite: false,
    remote: metadata?.remote,
  });
}

async function refreshLibrary(): Promise<void> {
  presetCache.clear();
  sceneLink.unlink();
  selectedPreset.value = null;
  selectedNavPreset.value = null;
  selectedPalettePreset.value = null;
  selectedPalette.value = '';
  selectedStopPresetName.value = '';

  await Promise.all([
    loadPresets(),
    loadPalettes(),
    loadTextureMappingPresets(),
    loadTextures(),
    refreshStopPresets(),
    animationPanelRef.value?.refreshPresets(),
  ]);
}

async function refreshPaletteLibrary(): Promise<void> {
  await Promise.all([loadPalettes(), loadTextures()]);
}

// Expose cache refresh helpers so the parent can update an already-open tab
// after the active guest/user scope changes.
defineExpose({
  selectPaletteStop: (index: number) => { selectedIdx.value = index; },
  refreshPaletteLibrary,
  shareCurrentScene,
  quickSnapshot,
  refreshPresets: loadPresets,
  refreshLibrary,
});


async function loadPresets() {
  // Load metadata list
  presets.value = await getAllPresetEntries();
  syncActivePresetSelection();
}

function syncActivePresetSelection(): void {
  if (!props.activePresetGuid) return;
  const active = presets.value.find(preset => preset.guid === props.activePresetGuid);
  if (!active) return;
  selectedPreset.value = active.id;
  selectedNavPreset.value = active.id;
  selectedPalettePreset.value = active.id;
  if (sceneLink.origin.value?.key !== String(active.id)) linkScenePreset(active.id, active.name, active.remote);
}

async function loadPalettes() {
  palettes.value = await getAllPaletteEntries();
}



function triggerTextureMappingUpdate() {
  ensureActiveTextureMapping();
  model.value.textureMapping = { ...model.value.textureMapping! };
}


async function savePalette() {
  if (!paletteName.value.trim()) return;
  const existingPalette = palettes.value.find(item => item.name === paletteName.value.trim());
  if (!canOverwriteCatalogPayload(userRole.value, existingPalette?.remote)) {
    window.alert(t('settings.palettes.sharedCannotOverwrite'));
    return;
  }
  let thumbnail: string | undefined = undefined;
  let now = new Date().toISOString();
  // Try WebGPU snapshot first (shows effects), fall back to CPU gradient strip
  try {
    const snap = previewRef.value?.getSnapshot?.();
    if (snap) {
      thumbnail = snap;
    } else {
      thumbnail = generatePaletteThumbnail(model.value.colorStops, model.value.interpolationMode);
    }
  } catch { /* ignore errors, no thumbnail */ }
  const palette: PaletteRecord = {
    guid: existingPalette?.guid,
    name: paletteName.value.trim(),
    thumbnail,
    date: existingPalette?.date ?? now,
    lastUpdated: now,
    favorite: existingPalette?.favorite ?? false,
    remote: existingPalette?.remote,
    ...buildPaletteFields(),
  };
  await savePaletteEntry(palette);
  palettes.value = await getAllPaletteEntries();
  const stored = palettes.value.find(item => palette.guid && item.guid === palette.guid) ?? palettes.value.find(item => item.name === palette.name);
  paletteName.value = '';
  if (stored) {
    selectedPalette.value = stored.name;
    paletteName.value = stored.name;
    selectedPalettePreset.value = null;
    paletteLink.link({ kind: 'palette', key: stored.guid ?? stored.name, name: stored.name, remote: stored.remote });
  }
}

/** Every palette field `savePalette` persists (colours, distribution, look, textures). */
function buildPaletteFields(): Omit<PaletteRecord, 'name' | 'guid' | 'thumbnail' | 'date' | 'lastUpdated' | 'favorite' | 'remote'> {
  return {
    colorStops: JSON.parse(JSON.stringify(model.value.colorStops)),
    textureName: selectedTexture.value,
    textureGuid: currentTextureObj.value?.guid,
    skyboxName: selectedSkyboxTexture.value,
    skyboxGuid: currentSkyboxObj.value?.guid,
    interpolationMode: model.value.interpolationMode,
    palettePeriod: model.value.palettePeriod,
    paletteOffset: model.value.paletteOffset,
    paletteScreenShiftX: model.value.paletteScreenShiftX,
    paletteScreenShiftY: model.value.paletteScreenShiftY,
    heightPaletteShift: model.value.heightPaletteShift,
    paletteMirror: model.value.paletteMirror,
    iterationPaletteCurve: normalizeIterationPaletteCurve(model.value.iterationPaletteCurve),
    tessellationLevel: model.value.tessellationLevel,
    displacementAmount: model.value.displacementAmount,
    microBumpStrength: model.value.microBumpStrength,
    reliefDepth: model.value.reliefDepth,
    protrusionPhase: model.value.protrusionPhase,
    protrusionSharpness: model.value.protrusionSharpness,
    protrusionStrength: model.value.protrusionStrength,
    protrusionGeometryMix: model.value.protrusionGeometryMix,
    protrusionPeriod: model.value.protrusionPeriod,
    lightAngle: model.value.lightAngle,
    ambientOcclusionStrength: model.value.ambientOcclusionStrength,
    localShadowStrength: model.value.localShadowStrength,
    varnishStrength: model.value.varnishStrength,
    gradeContrast: model.value.gradeContrast,
    gradeSaturation: model.value.gradeSaturation,
    orbitTrapStrength: model.value.orbitTrapStrength,
    orbitTrap: normalizeOrbitTrapFromLegacy(model.value),
    phaseColoringStrength: model.value.phaseColoringStrength,
    stripeFrequency: model.value.stripeFrequency,
    textureMapping: normalizeTextureMappingFromLegacy(model.value),
  };
}

function paletteThumbnail(): string | undefined {
  try {
    return previewRef.value?.getSnapshot?.() || generatePaletteThumbnail(model.value.colorStops, model.value.interpolationMode);
  } catch { return undefined; }
}

// ── Linked palette (library palette, or the palette part of a scene preset) ──
const paletteLink = useLinkedRecord('palette', () => buildPaletteFields());
const paletteLinkBusy = ref(false);
const paletteLinkKind = computed(() => paletteLink.origin.value?.kind === 'scenePalette' ? t('settings.palettes.scenePaletteKind') : t('settings.palettes.paletteKind'));

async function updateLinkedPalette(): Promise<void> {
  const origin = paletteLink.origin.value;
  if (!origin || paletteLinkBusy.value) return;
  paletteLinkBusy.value = true;
  try {
    const now = new Date().toISOString();
    if (origin.kind === 'scenePalette') {
      const record = await getCachedPreset(Number(origin.key));
      if (!record) { paletteLink.unlink(); return; }
      Object.assign(record.value, buildPaletteFields());
      record.lastUpdated = now;
      await updatePresetEntry(record);
      presetCache.set(record.id, record);
      presets.value = await getAllPresetEntries();
      if (sceneLink.origin.value?.key === origin.key) sceneLink.refresh();
    } else {
      const existing = palettes.value.find(item => (item.guid ?? item.name) === origin.key);
      if (!existing) { paletteLink.unlink(); return; }
      await savePaletteEntry({ ...existing, ...buildPaletteFields(), thumbnail: paletteThumbnail() ?? existing.thumbnail, lastUpdated: now });
      palettes.value = await getAllPaletteEntries();
    }
    paletteLink.refresh();
  } catch (error) {
    console.warn('Failed to update linked palette:', error);
  } finally {
    paletteLinkBusy.value = false;
  }
}

async function renameLinkedPalette(name: string): Promise<void> {
  const origin = paletteLink.origin.value;
  if (!origin || paletteLinkBusy.value) return;
  paletteLinkBusy.value = true;
  try {
    if (origin.kind === 'scenePalette') {
      await renameLinkedScenePresetById(Number(origin.key), name);
      paletteLink.refresh({ name: presets.value.find(p => p.id === Number(origin.key))?.name ?? name });
    } else {
      const existing = palettes.value.find(item => (item.guid ?? item.name) === origin.key);
      if (!existing) { paletteLink.unlink(); return; }
      // Palettes are keyed by name: write the renamed copy, then drop the old key.
      await savePaletteEntry({ ...existing, name, lastUpdated: new Date().toISOString() });
      palettes.value = await getAllPaletteEntries();
      const stored = palettes.value.find(item => item.guid === existing.guid && item.name !== existing.name);
      if (stored) await deletePaletteEntry(existing.name);
      palettes.value = await getAllPaletteEntries();
      const finalName = stored?.name ?? existing.name;
      selectedPalette.value = finalName;
      paletteName.value = finalName;
      paletteLink.refresh({ name: finalName, key: stored?.guid ?? finalName });
    }
  } finally {
    paletteLinkBusy.value = false;
  }
}

function detachPalette(): void {
  paletteLink.unlink();
  selectedPalette.value = '';
  selectedPalettePreset.value = null;
  paletteName.value = '';
}

async function savePaletteVariant(): Promise<void> {
  const origin = paletteLink.origin.value;
  if (!origin) return;
  paletteName.value = t('settings.variantName', { name: origin.name });
  await savePalette();
}

function applyPaletteLookFields(source: Partial<PaletteRecord>): void {
  model.value.iterationPaletteCurve = normalizeIterationPaletteCurve(source.iterationPaletteCurve);
  model.value.tessellationLevel = source.tessellationLevel ?? 0;
  model.value.displacementAmount = source.displacementAmount ?? 0;
  model.value.microBumpStrength = source.microBumpStrength ?? 0;
  model.value.reliefDepth = source.reliefDepth ?? 1;
  model.value.protrusionPhase = source.protrusionPhase ?? 0;
  model.value.protrusionSharpness = source.protrusionSharpness ?? 2;
  model.value.protrusionStrength = source.protrusionStrength ?? 1;
  model.value.protrusionGeometryMix = source.protrusionGeometryMix ?? 0;
  model.value.protrusionPeriod = source.protrusionPeriod ?? 1;
  if (source.lightAngle != null) model.value.lightAngle = source.lightAngle;
  model.value.ambientOcclusionStrength = source.ambientOcclusionStrength ?? 0;
  model.value.localShadowStrength = source.localShadowStrength ?? 0;
  model.value.varnishStrength = source.varnishStrength ?? 0;
  model.value.gradeContrast = source.gradeContrast ?? 1.18;
  model.value.gradeSaturation = source.gradeSaturation ?? 1.12;
  model.value.orbitTrapStrength = source.orbitTrapStrength ?? 0;
  model.value.orbitTrap = normalizeOrbitTrapFromLegacy(source);
  model.value.orbitTrapStrength = model.value.orbitTrap.strength;
  model.value.phaseColoringStrength = source.phaseColoringStrength ?? 0;
  model.value.stripeFrequency = source.stripeFrequency ?? 8;
  model.value.textureMapping = normalizeTextureMappingFromLegacy(source);
  delete (model.value as any).textureMappingMode;
}

function selectPalette(name: string) {
  const palette = palettes.value.find(p => p.name === name);
  if (palette) {
    selectedPalette.value = name;
    paletteName.value = palette.name;
    model.value.colorStops = structuredClone(toRaw(palette.colorStops));
    // Restore interpolation mode and palette params if present
    if (palette.interpolationMode) model.value.interpolationMode = palette.interpolationMode;
    if (palette.palettePeriod != null) model.value.palettePeriod = palette.palettePeriod;
    if (palette.paletteOffset != null) model.value.paletteOffset = palette.paletteOffset;
    model.value.paletteScreenShiftX = palette.paletteScreenShiftX ?? 0;
    model.value.paletteScreenShiftY = palette.paletteScreenShiftY ?? 0;
    model.value.heightPaletteShift = palette.heightPaletteShift ?? 0;
    model.value.paletteMirror = palette.paletteMirror ?? false;
    applyPaletteLookFields(palette);
    // Restore texture if present
    const paletteTexture = textureNameForReference(palette.textureGuid, palette.textureName);
    if (paletteTexture) {
      selectTexture(paletteTexture);
    }
    const paletteSkybox = textureNameForReference(palette.skyboxGuid, palette.skyboxName);
    if (paletteSkybox) {
      selectSkyboxTexture(paletteSkybox);
    }
  }
    selectedPalettePreset.value = null;
    paletteLink.link({ kind: 'palette', key: palette.guid ?? palette.name, name: palette.name, remote: palette.remote });
}

function selectPaletteFromDropdown(palette: PaletteRecord) {
  selectPalette(palette.name);
  showPaletteDropdown.value = false;
}

// Palette tab: extract palette from a preset
const selectedPalettePreset = ref<number | null>(null);
const showPalettePresetDropdown = ref(false);

async function selectPaletteFromPreset(id: number) {
  const record = await getCachedPreset(id);
  if (record) {
    selectedPalettePreset.value = id;
    model.value.colorStops = structuredClone(toRaw(record.value.colorStops));
    model.value.interpolationMode = record.value.interpolationMode;
    model.value.palettePeriod = record.value.palettePeriod;
    model.value.paletteOffset = record.value.paletteOffset;
    model.value.paletteScreenShiftX = record.value.paletteScreenShiftX ?? 0;
    model.value.paletteScreenShiftY = record.value.paletteScreenShiftY ?? 0;
    model.value.heightPaletteShift = record.value.heightPaletteShift ?? model.value.heightPaletteShift;
    model.value.paletteMirror = record.value.paletteMirror ?? false;
    applyPaletteLookFields(record.value);
    // Restore textures if present
    const presetTexture = textureNameForReference(record.value.textureGuid, record.value.textureName);
    if (presetTexture) {
      selectTexture(presetTexture);
    }
    const presetSkybox = textureNameForReference(record.value.skyboxGuid, record.value.skyboxName);
    if (presetSkybox) {
      selectSkyboxTexture(presetSkybox);
    }
  }
    selectedPalette.value = '';
    paletteLink.link({ kind: 'scenePalette', key: String(id), name: record.name, remote: record.remote });
}

async function selectPalettePresetFromDropdown(preset: PresetMetadata) {
  await selectPaletteFromPreset(preset.id);
  showPalettePresetDropdown.value = false;
}

async function deletePaletteByName(name: string) {
  const palette = palettes.value.find(item => item.name === name);
  if (!palette) return;
  if (!canDeleteCatalogEntry(userRole.value, palette.remote)) {
    window.alert(t('settings.palettes.sharedCannotDelete'));
    return;
  }
  if (!window.confirm(t('settings.palettes.deleteConfirm', { name }))) return;
  await deletePaletteEntry(name);
  palettes.value = await getAllPaletteEntries();
  if (paletteLink.origin.value?.key === (palette.guid ?? palette.name)) paletteLink.unlink();
  if (selectedPalette.value === name) selectedPalette.value = '';
  if (paletteName.value === name) paletteName.value = '';
}

function exportPaletteByName(name: string) {
  const palette = palettes.value.find(item => item.name === name);
  if (!palette) return;
  downloadJsonFile(`mandelbrot-palette-${palette.name}.json`, palette);
}

async function togglePresetFavorite(id: number): Promise<void> {
  const metadata = presets.value.find(p => p.id === id);
  if (!metadata) return;
  metadata.favorite = !metadata.favorite;
  const record = await getCachedPreset(id);
  if (record) {
    record.favorite = metadata.favorite;
    try {
      await updatePresetEntry(record);
      presetCache.set(id, record);
    } catch (e) {
      metadata.favorite = !metadata.favorite;
      console.warn('Failed to save preset favorite:', e);
    }
  } else {
    metadata.favorite = !metadata.favorite;
  }
}

async function togglePaletteFavorite(name: string): Promise<void> {
  const palette = palettes.value.find(item => item.name === name);
  if (!palette) return;
  palette.favorite = !palette.favorite;
  try {
    await savePaletteEntry({ ...palette });
  } catch (e) {
    palette.favorite = !palette.favorite;
    console.warn('Failed to save palette favorite:', e);
  }
}

function handleUploadError(error: unknown) {
  if (error instanceof RemoteCatalogNameConflictError) {
    window.alert(t('settings.upload.nameConflict', { type: error.type, name: error.conflictName }));
    return;
  }
  console.warn('Remote catalog upload failed:', error);
  window.alert(t('settings.upload.failed'));
}

async function uploadCompletePreset(id: number): Promise<void> {
  if (!isAdmin.value) return;
  const record = await getCachedPreset(id);
  if (!record) return;
  try {
    const uploaded = await uploadRemoteCatalogEntry('completePreset', {
      guid: record.guid,
      name: record.name,
      lastUpdated: record.lastUpdated,
      value: record.value,
      thumbnail: record.thumbnail,
      scaleExponent: record.scaleExponent,
    });
    record.lastUpdated = uploaded.lastUpdated;
    record.remote = {publishedName: uploaded.name, lastUpdated: uploaded.lastUpdated};
    await updatePresetEntry(record);
    presetCache.set(id, record);
    presets.value = await getAllPresetEntries();
    showUploadSuccess(uploadSuccessKey('preset', id));
  } catch (error) {
    handleUploadError(error);
  }
}

async function uploadPalettePreset(palette: PaletteRecord): Promise<void> {
  if (!isAdmin.value) return;
  try {
    const uploadPalette = structuredClone(toRaw(palette));
    uploadPalette.guid = uploadPalette.guid || crypto.randomUUID();
    const uploaded = await uploadRemoteCatalogEntry('palettePreset', {
      ...uploadPalette,
      guid: uploadPalette.guid,
      name: uploadPalette.name,
      lastUpdated: uploadPalette.lastUpdated || uploadPalette.date || new Date().toISOString(),
    });
    await savePaletteEntry({
      ...uploadPalette,
      lastUpdated: uploaded.lastUpdated,
      remote: {publishedName: uploaded.name, lastUpdated: uploaded.lastUpdated},
    });
    palettes.value = await getAllPaletteEntries();
    showUploadSuccess(uploadSuccessKey('palette', uploadPalette.name));
  } catch (error) {
    handleUploadError(error);
  }
}

async function uploadAnimationPreset(preset: AnimationPresetRecord): Promise<void> {
  if (!isAdmin.value) return;
  try {
    const uploaded = await uploadRemoteCatalogEntry('animationPreset', {
      guid: preset.guid,
      name: preset.name,
      lastUpdated: preset.lastUpdated || preset.date || new Date().toISOString(),
      animation: cloneAnimationConfig(preset.animation),
    });
    await saveAnimationPresetEntry({
      ...preset,
      lastUpdated: uploaded.lastUpdated,
      remote: {publishedName: uploaded.name, lastUpdated: uploaded.lastUpdated},
    });
    showUploadSuccess(uploadSuccessKey('animation', preset.guid));
  } catch (error) {
    handleUploadError(error);
  }
}

async function uploadTexture(texture: TextureMetadata): Promise<void> {
  if (!isAdmin.value || !texture.guid) return;
  let blob: Blob | null = null;
  if (BUILT_IN_TEXTURE_NAMES.has(texture.name)) {
    const objectUrl = await storedTextureObjectUrl(texture.name);
    if (objectUrl) {
      try {
        const response = await fetch(objectUrl);
        blob = await response.blob();
      } catch (e) {
        console.warn('Failed to fetch built-in texture blob:', e);
      }
    }
  } else {
    blob = await getTextureBlob(texture.name);
  }
  if (!blob) return;
  try {
    const normalized = await normalizeTextureBlob(blob);
    blob = normalized.blob;
    const uploaded = await uploadRemoteTextureEntry({
      guid: texture.guid,
      name: texture.name,
      thumbnail: texture.thumbnail,
      lastUpdated: texture.lastUpdated || texture.date,
      contentType: blob.type,
      size: blob.size,
    }, blob);
    await saveTextureEntry(
      texture.name,
      blob,
      texture.thumbnail,
      texture.date,
      texture.guid,
      texture.favorite ?? false,
      {publishedName: uploaded.name, lastUpdated: uploaded.lastUpdated},
      {
        kind: texture.kind,
        contentType: 'image/webp',
        width: normalized.width,
        height: normalized.height,
        byteSize: blob.size,
      },
    );
    textures.value = await ensureTextureLibrary();
    showUploadSuccess(uploadSuccessKey('texture', texture.guid));
  } catch (error) {
    handleUploadError(error);
  }
}

async function toggleTextureFavorite(texture: TextureMetadata): Promise<void> {
  if (!texture.guid) return;
  const previous = texture.favorite ?? false;
  texture.favorite = !previous;
  try {
    await updateTextureMetadata(texture);
    textures.value = await ensureTextureLibrary();
  } catch (error) {
    texture.favorite = previous;
    console.warn('Failed to save texture favorite:', error);
  }
}

async function selectPreset(id: number) {
  const record = await getCachedPreset(id);
  if (record) {
    selectedPreset.value = id;
    presetName.value = record.name;
    // Restore all fields except performance params
    const saved = structuredClone(toRaw(record.value));
    stripExplorationStateFields(saved);
    saved.textureMapping = normalizeTextureMappingFromLegacy(saved);
    saved.orbitTrap = normalizeOrbitTrapFromLegacy(saved);
    saved.orbitTrapStrength = saved.orbitTrap.strength;
    saved.animation = normalizeAnimationConfig(saved.animation, saved.animationSpeed);
    delete (saved as any).textureMappingMode;
    const current = model.value;
    saved.activateAnimate = current.activateAnimate;
    model.value = preserveSessionPerformanceFields(saved, current);
    ensureActiveTextureMapping();
    ensureActiveOrbitTrap();
    // Restore texture if saved with the preset
    const texName = textureNameForReference(saved.textureGuid, saved.textureName);
    if (texName) {
      selectTexture(texName);
    }
    const skyName = textureNameForReference(saved.skyboxGuid, saved.skyboxName);
    if (skyName) {
      selectSkyboxTexture(skyName);
    }
    linkScenePreset(id, record.name, record.remote);
  }
}

// Escape radius SQUARED, on a log10 scale. The slider floor is log10(4), i.e.
// |z| = 2, and that is a correctness bound rather than taste: below it the
// escape test fires on orbits that have not escaped, and — measured, see
// MANDELBROT_BOX_DIMENSION_CENSUS.md — the exterior distance estimate the
// renderer stores in layer 4 collapses. Against a reference bailout of 1e12,
// the share of pixels whose distance is wrong by more than 2× runs 0–2 % at
// mu = 4, 10–27 % at mu = 2, and 43–100 % at mu = 1, where the median error
// reaches ×1484. That field drives the relief shading AND the adaptive-AA
// target, so a corrupt one silently pins every escaped pixel at the full
// sample count — adaptive AA paying full price for nothing.
// The getter stays faithful: a preset saved before this floor keeps showing the
// value it actually carries (the slider pins at its left edge) rather than a
// number the model does not hold. Only a user edit snaps it back into range.
const MU_MIN_LOG10 = Math.log10(4);
const muSlider = computed({
  get: () => Math.log10(model.value.mu ?? 4.0),
  set: (val: number) => {
    model.value.mu = Math.pow(10, Math.max(val, MU_MIN_LOG10));
  }
});
// Slider max iteration multiplier : logarithmique, 0.1–10
const maxIterMultSlider = computed({
  get: () => Math.log10(model.value.maxIterationMultiplier ?? 1.0),
  set: (val: number) => {
    model.value.maxIterationMultiplier = Number(Math.pow(10, val).toPrecision(3));
  }
});

onMounted(async () => {
  await loadPresets();
  await loadPalettes();
  await loadTextureMappingPresets();
  await loadTextures();
  await refreshStopPresets();
});

onUnmounted(() => {
  uploadSuccessTimers.forEach(timer => clearTimeout(timer));
  uploadSuccessTimers.clear();
  if (presetLinkCopiedTimer) clearTimeout(presetLinkCopiedTimer);
});

watch(() => props.activePresetGuid, syncActivePresetSelection);

watch([() => props.activeTab, () => props.engine], async ([tab]) => {
  if (tab === 'navigation') {
    window.setTimeout(() => { void refreshNavigationPreview(); }, 0);
  }
});

// =====================================================
// Import / Export Presets
// =====================================================
async function exportPresets() {
  // Build full records for export (legacy-compatible format)
  const allRecords: PresetRecord[] = [];
  for (const meta of presets.value) {
    const record = await getCachedPreset(meta.id);
    if (record) allRecords.push(record);
  }
  const exportData = allRecords.map(r => ({
    name: r.name,
    value: r.value,
    thumbnail: r.thumbnail,
    date: r.date,
    favorite: r.favorite ?? false,
  }));
  const data = JSON.stringify(exportData, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mandelbrot-presets.json';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJsonFile(filename: string, payload: unknown) {
  const data = JSON.stringify(payload, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportPresetById(id: number) {
  const record = await getCachedPreset(id);
  if (!record) return;
  downloadJsonFile(`mandelbrot-preset-${record.name || record.id}.json`, {
    name: record.name,
    value: record.value,
    thumbnail: record.thumbnail,
    date: record.date,
    favorite: record.favorite ?? false,
  });
}

async function exportSelectedPreset() {
  if (!selectedPreset.value) return;
  const record = await getCachedPreset(selectedPreset.value);
  if (!record) return;
  downloadJsonFile(`mandelbrot-preset-${record.name || record.id}.json`, {
    name: record.name,
    value: record.value,
    thumbnail: record.thumbnail,
    date: record.date,
    favorite: record.favorite ?? false,
  });
}

async function exportFavoritePresets() {
  const allRecords: PresetRecord[] = [];
  for (const meta of favoritePresets.value) {
    const record = await getCachedPreset(meta.id);
    if (record) allRecords.push(record);
  }
  const exportData = allRecords.map(r => ({
    name: r.name,
    value: r.value,
    thumbnail: r.thumbnail,
    date: r.date,
    favorite: r.favorite ?? false,
  }));
  downloadJsonFile('mandelbrot-favorite-presets.json', exportData);
}

async function exportSelectedNavigationPreset() {
  if (!selectedNavPreset.value) return;
  const record = await getCachedPreset(selectedNavPreset.value);
  if (!record) return;
  downloadJsonFile(`mandelbrot-navigation-${record.name || record.id}.json`, {
    name: record.name,
    date: record.date,
    favorite: record.favorite ?? false,
    value: {
      cx: record.value.cx,
      cy: record.value.cy,
      scale: record.value.scale,
      angle: record.value.angle,
    },
  });
}

async function exportFavoriteNavigationPresets() {
  const exportData = [];
  for (const meta of favoritePresets.value) {
    const record = await getCachedPreset(meta.id);
    if (!record) continue;
    exportData.push({
      name: record.name,
      date: record.date,
      favorite: record.favorite ?? false,
      value: {
        cx: record.value.cx,
        cy: record.value.cy,
        scale: record.value.scale,
        angle: record.value.angle,
      },
    });
  }
  downloadJsonFile('mandelbrot-favorite-navigation.json', exportData);
}

const presetFileInput = ref<HTMLInputElement | null>(null);
function triggerImportPresets() {
  if (!isAdmin.value) return;
  presetFileInput.value?.click();
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

async function readJsonFile(file: File): Promise<unknown> {
  return JSON.parse(await readFileAsText(file));
}

async function importPresets(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (files.length === 0) return;

  let budget: PersonalPresetImportBudget | null;
  try {
    budget = await createActivePresetImportBudget();
  } catch (error) {
    console.warn('[Settings] Unable to verify personal preset quota before import.', error);
    window.alert(t('settings.presets.import.quotaCheckFailed'));
    input.value = '';
    return;
  }
  const identities = buildPresetImportIdentitySet(await getAllPresetRecords());
  let importedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;
  let validCount = 0;
  let quotaReached = false;
  let firstFailure = '';
  let stopImport = false;
  for (const file of files) {
    let records: unknown[];
    try {
      const imported = await readJsonFile(file);
      records = Array.isArray(imported) ? imported : [imported];
    } catch (error) {
      failedCount += 1;
      firstFailure ||= error instanceof Error ? error.message : String(error);
      console.warn(`[Settings] Skipping invalid preset import file "${file.name}"`, error);
      continue;
    }
    for (const preset of records) {
      if (!preset || typeof preset !== 'object' || !('value' in preset)) continue;
      validCount += 1;
      try {
        const record = preset as {
          guid?: string;
          value: MandelbrotParams;
          thumbnail?: string;
          name?: string;
          date?: string;
          favorite?: boolean;
        };
        const name = record.name ?? '';
        const date = record.date ?? '';
        const value = structuredClone(record.value);
        stripSessionPerformanceFields(value);
        stripExplorationStateFields(value);
        value.textureMapping = normalizeTextureMappingFromLegacy(value);
        delete (value as any).textureMappingMode;
        const guid = record.guid || createGuid();
        const identityRecord = {guid: record.guid, name, date, value};
        if (
          hasPresetImportIdentity(identities, identityRecord)
          || (record.guid && budget?.existingGuids.has(record.guid))
        ) {
          duplicateCount += 1;
          continue;
        }
        if (budget && budget.remaining < 1) {
          quotaReached = true;
          stopImport = true;
          break;
        }
        await savePresetEntry(
          value,
          record.thumbnail ?? '',
          name,
          record.date,
          record.favorite ?? false,
          guid,
        );
        addPresetImportIdentity(identities, {...identityRecord, guid});
        if (budget) {
          budget.existingGuids.add(guid);
          budget.remaining -= 1;
        }
        importedCount += 1;
      } catch (error) {
        if (error instanceof PersonalPresetQuotaError) {
          quotaReached = true;
          stopImport = true;
          break;
        }
        failedCount += 1;
        firstFailure ||= error instanceof Error ? error.message : String(error);
        console.warn(`[Settings] Skipping one preset from "${file.name}"`, error);
      }
    }
    if (stopImport) break;
  }

  if (importedCount > 0) {
    presets.value = await getAllPresetEntries();
  }

  const summary: string[] = [];
  if (importedCount > 0) summary.push(t('settings.presets.import.imported', { count: importedCount }, importedCount));
  if (duplicateCount > 0) summary.push(t('settings.presets.import.duplicatesSkipped', { count: duplicateCount }, duplicateCount));
  if (failedCount > 0) {
    summary.push(firstFailure
      ? t('settings.presets.import.failedWithReason', { count: failedCount, reason: firstFailure }, failedCount)
      : t('settings.presets.import.failed', { count: failedCount }, failedCount));
  }
  if (quotaReached) {
    summary.push(t('settings.presets.import.quotaReached', { limit: PERSONAL_PRESET_LIMIT }));
  }
  if (showOnlyFavoritePresets.value && presets.value.length > visiblePresets.value.length) {
    summary.push(t('settings.presets.import.favoritesFilterActive', { visible: visiblePresets.value.length, total: presets.value.length }));
  }

  if (summary.length > 0) {
    window.alert(summary.join('\n'));
  } else if (validCount === 0) {
    window.alert(t('settings.presets.import.invalidFileFormat'));
  } else {
    window.alert(t('settings.presets.import.noPresetImported'));
  }

  // Reset pour pouvoir réimporter les mêmes fichiers
  input.value = '';
}

// =====================================================
// Import / Export Palettes
// =====================================================
function exportPalettes() {
  const data = JSON.stringify(palettes.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mandelbrot-palettes.json';
  a.click();
  URL.revokeObjectURL(url);
}

function exportSelectedPalette() {
  const palette = palettes.value.find(item => item.name === selectedPalette.value);
  if (!palette) return;
  downloadJsonFile(`mandelbrot-palette-${palette.name}.json`, palette);
}

function exportFavoritePalettes() {
  downloadJsonFile('mandelbrot-favorite-palettes.json', favoritePalettes.value);
}

const paletteFileInput = ref<HTMLInputElement | null>(null);
function triggerImportPalettes() {
  if (!isAdmin.value) return;
  paletteFileInput.value?.click();
}
async function importPalettes(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (files.length === 0) return;

  const existing = await getAllPaletteEntries();
  let importedCount = 0;
  let hadValid = false;
  for (const file of files) {
    try {
      const imported = await readJsonFile(file);
      const records = Array.isArray(imported) ? imported : [imported];
      for (const palette of records) {
        if (!palette || typeof palette !== 'object' || !('name' in palette) || !('colorStops' in palette)) continue;
        hadValid = true;
        const record = palette as PaletteRecord;
        record.textureMapping = normalizeTextureMappingFromLegacy(record);
        delete (record as any).textureMappingMode;
        const name = record.name ?? '';
        const date = record.date ?? '';
        if (existing.some(e => e.name === name && e.date === date)) continue;
        await assertActivePresetImportCapacity(record.guid);
        await savePaletteEntry(record);
        importedCount += 1;
      }
    } catch (error) {
      if (error instanceof PersonalPresetQuotaError) {
        window.alert(error.message);
        break;
      }
      console.warn(`[Settings] Skipping palette import file "${file.name}"`, error);
    }
  }

  if (importedCount > 0) {
    palettes.value = await getAllPaletteEntries();
  } else if (hadValid) {
    window.alert(t('settings.palettes.allAlreadyImported'));
  } else {
    window.alert(t('settings.palettes.invalidFileFormat'));
  }

  input.value = '';
}

// =====================================================
// LCH Global Adjustment Sliders (perceptually uniform)
// =====================================================
// Stores the baseline colorStops for color adjustments
const lchBaseStops = ref<ColorStop[] | null>(null);
const satShift = ref(0);     // HSL saturation shift (-100..100)
const lumShift = ref(0);     // HSL luminosity shift (-100..100)
const hslHueShift = ref(0); // HSL hue shift in degrees (-180..180)

// When user starts adjusting, save the current stops as baseline
function ensureLchBase() {
  if (lchBaseStops.value === null) {
    lchBaseStops.value = structuredClone(toRaw(model.value.colorStops));
  }
}

function resetLchBase() {
  lchBaseStops.value = null;
  satShift.value = 0;
  lumShift.value = 0;
  hslHueShift.value = 0;
}

function applyAllShifts() {
  if (!lchBaseStops.value) return;
  model.value.colorStops = lchBaseStops.value.map(stop => {
    const rgbC = d3rgb(stop.color);
    if (rgbC === null || rgbC === undefined) return { ...stop };

    // Apply HSL shifts
    const hslC = d3hsl(rgbC);
    const baseHslH = isNaN(hslC.h) ? 0 : hslC.h;
    const baseHslS = isNaN(hslC.s) ? 0 : hslC.s;
    const baseHslL = isNaN(hslC.l) ? 0 : hslC.l;
    let hslH = baseHslH + hslHueShift.value;
    hslH = ((hslH % 360) + 360) % 360;
    let sat = baseHslS + satShift.value / 100;
    sat = Math.max(0, Math.min(1, sat));
    let lum = baseHslL + lumShift.value / 100;
    lum = Math.max(0, Math.min(1, lum));
    // If resulting saturation is zero, keep hue undefined to avoid color artifacts
    const finalH = (sat === 0) ? NaN : hslH;
    const final = d3hsl(finalH, sat, lum);
    // Preserve all effect fields, only update color
    return { ...stop, color: d3rgb(final).formatHex() };
  });
}

function onSatInput(val: number) {
  ensureLchBase();
  satShift.value = val;
  applyAllShifts();
}

function onLumInput(val: number) {
  ensureLchBase();
  lumShift.value = val;
  applyAllShifts();
}

function onHslHueInput(val: number) {
  ensureLchBase();
  hslHueShift.value = val;
  applyAllShifts();
}

// =====================================================
// Interpolation Modes
// =====================================================
const interpolationModes: { key: InterpolationMode; label: string }[] = [
  { key: 'lab', label: 'Lab' },
  { key: 'rgb', label: 'RGB' },
  { key: 'hcl', label: 'HCL' },
  { key: 'hsl', label: 'HSL' },
  { key: 'cubehelix', label: 'Cubehelix' },
];

// =====================================================
// Palette Manipulation Tools
// =====================================================

/** Inverser : reverse stop order (position 0→1 becomes 1→0) */
function invertPalette() {
  if (model.value.colorStops.length === 0) return;
  model.value.colorStops = model.value.colorStops.map(s => ({
    ...s,
    position: 1 - s.position,
  })).sort((a, b) => a.position - b.position);
  resetLchBase();
}

/** Dupliquer : compress palette to first half and repeat it in the second half */
function duplicatePalette() {
  if (model.value.colorStops.length === 0) return;
  const first = model.value.colorStops.map(s => ({
    ...s,
    position: s.position * 0.5,
  }));
  const second = model.value.colorStops.map(s => ({
    ...s,
    position: 0.5 + s.position * 0.5,
  }));
  model.value.colorStops = [...first, ...second].sort((a, b) => a.position - b.position);
  resetLchBase();
}

/** Miroir : palette goes 0→0.5 then mirrors back 0.5→1 (palindrome) */
function mirrorPalette() {
  if (model.value.colorStops.length === 0) return;
  const first = model.value.colorStops.map(s => ({
    ...s,
    position: s.position * 0.5,
  }));
  const second = model.value.colorStops.map(s => ({
    ...s,
    position: 1 - s.position * 0.5,
  }));
  model.value.colorStops = [...first, ...second].sort((a, b) => a.position - b.position);
  resetLchBase();
}

/** Distribuer : space all stops evenly across [0, 1] while keeping color order */
function distributeEvenly() {
  const stops = model.value.colorStops.slice().sort((a, b) => a.position - b.position);
  if (stops.length < 2) return;
  const step = 1 / (stops.length - 1);
  model.value.colorStops = stops.map((s, i) => ({
    ...s,
    position: Number((i * step).toFixed(6)),
  }));
  resetLchBase();
}

/** Négatif : invert each color to its RGB complement (preserves effect fields) */
function negatePalette() {
  if (model.value.colorStops.length === 0) return;
  model.value.colorStops = model.value.colorStops.map(s => {
    const c = d3rgb(s.color);
    const inv = d3rgb(255 - (c.r || 0), 255 - (c.g || 0), 255 - (c.b || 0));
    return { ...s, color: inv.formatHex() };
  });
  resetLchBase();
}

/** Supprimer toute la palette : reset to 2 default stops (black → white) */
function clearPalette() {
  model.value.colorStops = [
    { color: '#000000', position: 0 },
    { color: '#ffffff', position: 1 },
  ];
  resetLchBase();
}



// =====================================================
// Image texture library
// =====================================================
const textureName = ref('');
const skyboxName = ref('Window');
const textures = ref<TextureMetadata[]>([]);
const textureMappingPresetName = ref('');
const textureMappingPresets = ref<TextureMappingPresetRecord[]>([]);
const selectedTextureMappingPreset = ref('Screen Space');
const showTextureMappingDropdown = ref(false);
const selectedTexture = ref('Gold');
const selectedSkyboxTexture = ref('Window');
const showTextureDropdown = ref(false);
const showSkyboxDropdown = ref(false);
let suppressTextureApply = false;

const currentTextureObj = computed(() => textures.value.find(t => t.name === selectedTexture.value));
const currentSkyboxObj = computed(() => textures.value.find(t => t.name === selectedSkyboxTexture.value));

async function loadTextureMappingPresets() {
  textureMappingPresets.value = await getAllTextureMappingPresetEntries();
}

function selectTextureMappingPresetFromDropdown(preset: TextureMappingPresetRecord) {
  selectedTextureMappingPreset.value = preset.name;
  textureMappingPresetName.value = preset.builtIn ? '' : preset.name;
  applyTextureMapping(preset.mapping);
  showTextureMappingDropdown.value = false;
  mappingLink.link({ kind: 'mapping', key: preset.guid ?? preset.name, name: preset.name, remote: preset.remote, builtIn: preset.builtIn });
}

// ── Linked texture mapping preset ──
const mappingLink = useLinkedRecord('mapping', () => normalizeTextureMappingFromLegacy(model.value));
const mappingLinkBusy = ref(false);

function linkedMappingRecord(): TextureMappingPresetRecord | undefined {
  const key = mappingLink.origin.value?.key;
  return textureMappingPresets.value.find(p => (p.guid ?? p.name) === key);
}

async function updateLinkedMapping(): Promise<void> {
  const existing = linkedMappingRecord();
  if (!existing || mappingLinkBusy.value) return;
  mappingLinkBusy.value = true;
  try {
    await saveTextureMappingPresetEntry({ ...existing, mapping: normalizeTextureMappingFromLegacy(model.value), lastUpdated: new Date().toISOString() });
    textureMappingPresets.value = await getAllTextureMappingPresetEntries();
    mappingLink.refresh();
  } catch (error) {
    console.warn('Failed to update linked mapping preset:', error);
  } finally {
    mappingLinkBusy.value = false;
  }
}

async function renameLinkedMapping(name: string): Promise<void> {
  const existing = linkedMappingRecord();
  if (!existing || mappingLinkBusy.value) return;
  mappingLinkBusy.value = true;
  try {
    await saveTextureMappingPresetEntry({ ...existing, name, lastUpdated: new Date().toISOString() });
    textureMappingPresets.value = await getAllTextureMappingPresetEntries();
    const stored = textureMappingPresets.value.find(p => p.guid === existing.guid && p.name !== existing.name);
    if (stored) await deleteTextureMappingPresetEntry(existing.name);
    textureMappingPresets.value = await getAllTextureMappingPresetEntries();
    const finalName = stored?.name ?? existing.name;
    selectedTextureMappingPreset.value = finalName;
    textureMappingPresetName.value = finalName;
    mappingLink.refresh({ name: finalName, key: stored?.guid ?? finalName });
  } finally {
    mappingLinkBusy.value = false;
  }
}

function detachMapping(): void {
  mappingLink.unlink();
  textureMappingPresetName.value = '';
}

async function saveMappingVariant(): Promise<void> {
  const origin = mappingLink.origin.value;
  if (!origin) return;
  textureMappingPresetName.value = t('settings.variantName', { name: origin.name });
  await saveTextureMappingPreset();
}

async function saveTextureMappingPreset() {
  const name = textureMappingPresetName.value.trim();
  if (!name) return;
  const existing = textureMappingPresets.value.find(item => item.name === name && !item.builtIn);
  if (!canOverwriteCatalogPayload(userRole.value, existing?.remote)) {
    window.alert(t('settings.textures.mapping.sharedCannotOverwrite'));
    return;
  }
  const now = new Date().toISOString();
  await saveTextureMappingPresetEntry({
    guid: existing?.guid ?? crypto.randomUUID(),
    name,
    mapping: normalizeTextureMappingFromLegacy(model.value),
    date: existing?.date ?? now,
    lastUpdated: now,
    favorite: existing?.favorite ?? false,
    remote: existing?.remote,
  });
  textureMappingPresets.value = await getAllTextureMappingPresetEntries();
  const stored = textureMappingPresets.value.find(p => existing ? p.guid === existing.guid : p.name === name) ?? textureMappingPresets.value.find(p => p.name === name);
  selectedTextureMappingPreset.value = stored?.name ?? name;
  textureMappingPresetName.value = stored?.name ?? name;
  if (stored) mappingLink.link({ kind: 'mapping', key: stored.guid ?? stored.name, name: stored.name, remote: stored.remote });
}

async function deleteTextureMappingPreset(preset: TextureMappingPresetRecord): Promise<void> {
  if (preset.builtIn) return;
  if (!canDeleteCatalogEntry(userRole.value, preset.remote)) {
    window.alert(t('settings.textures.mapping.sharedCannotDelete'));
    return;
  }
  if (!window.confirm(t('settings.textures.mapping.deleteConfirm', { name: preset.name }))) return;
  await deleteTextureMappingPresetEntry(preset.name);
  textureMappingPresets.value = await getAllTextureMappingPresetEntries();
  if (selectedTextureMappingPreset.value === preset.name) {
    selectedTextureMappingPreset.value = activeTextureMappingLabel.value;
  }
}

function textureNameForReference(guid?: string, fallbackName?: string): string | null {
  return nameForCatalogReference(textures.value, guid, fallbackName);
}

/** Active blob URL — must be revoked when changed to avoid memory leaks. */
const activeBlobUrl = ref<string | null>(null);
const activeSkyboxBlobUrl = ref<string | null>(null);

function revokeActiveBlobUrl() {
  if (activeBlobUrl.value) {
    if (activeBlobUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(activeBlobUrl.value);
    }
    activeBlobUrl.value = null;
  }
}

function revokeActiveSkyboxBlobUrl() {
  if (activeSkyboxBlobUrl.value) {
    if (activeSkyboxBlobUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(activeSkyboxBlobUrl.value);
    }
    activeSkyboxBlobUrl.value = null;
  }
}

/** Generate a small thumbnail (256px wide) from a blob URL or data URL */
function generateThumbnailFromUrl(url: string, maxWidth = 256): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(''); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

async function loadTextures() {
  suppressTextureApply = true;
  textures.value = await ensureTextureLibrary();

  // 4. Restore persisted selections:
  //    Priority: model value (from parent/preset) > localStorage > built-in default
  const modelName = model.value.textureName;
  const modelGuidName = textureNameForReference(model.value.textureGuid, undefined);
  const savedName = localStorage.getItem(TEXTURE_SELECTED_KEY);
  const restoredName = modelGuidName
    ? modelGuidName
    : (modelName && textures.value.some(t => t.name === modelName))
    ? modelName
    : (savedName && textures.value.some(t => t.name === savedName))
      ? savedName
      : 'Gold';
  const modelSkyboxName = model.value.skyboxName;
  const modelSkyboxGuidName = textureNameForReference(model.value.skyboxGuid, undefined);
  const savedSkyboxName = localStorage.getItem(SKYBOX_SELECTED_KEY);
  const restoredSkyboxName = modelSkyboxGuidName
    ? modelSkyboxGuidName
    : (modelSkyboxName && textures.value.some(t => t.name === modelSkyboxName))
    ? modelSkyboxName
    : (savedSkyboxName && textures.value.some(t => t.name === savedSkyboxName))
      ? savedSkyboxName
      : 'Window';
  selectedTexture.value = restoredName;
  model.value.textureName = restoredName;
  model.value.textureGuid = textures.value.find(t => t.name === restoredName)?.guid;
  textureName.value = restoredName;
  selectedSkyboxTexture.value = restoredSkyboxName;
  model.value.skyboxName = restoredSkyboxName;
  model.value.skyboxGuid = textures.value.find(t => t.name === restoredSkyboxName)?.guid;
  skyboxName.value = restoredSkyboxName;
  void nextTick().then(() => { suppressTextureApply = false; });
}

async function applyTextureToEngine(name: string, engine: import('../Engine').Engine) {
  const sourceKey = textureSourceKey(name, textures.value);
  const engineCurrent = engine.isTileTextureSourceCurrent(sourceKey);
  if (engineCurrent && activeBlobUrl.value) return;
  const objectUrl = await storedTextureObjectUrl(name);
  if (!objectUrl) return;
  revokeActiveBlobUrl();
  activeBlobUrl.value = objectUrl;
  if (!engineCurrent) {
    await engine.updateTileTexture(activeBlobUrl.value, sourceKey);
  }
}

async function applySkyboxToEngine(name: string, engine: import('../Engine').Engine) {
  const sourceKey = textureSourceKey(name, textures.value);
  const engineCurrent = engine.isSkyboxTextureSourceCurrent(sourceKey);
  if (engineCurrent && activeSkyboxBlobUrl.value) return;
  const objectUrl = await storedTextureObjectUrl(name);
  if (!objectUrl) return;
  revokeActiveSkyboxBlobUrl();
  activeSkyboxBlobUrl.value = objectUrl;
  if (!engineCurrent) {
    await engine.updateSkyboxTexture(activeSkyboxBlobUrl.value, sourceKey);
  }
}

// Apply texture to engine whenever selectedTexture or engine changes.
// This covers: initial load, tab re-mount, preset change, random, manual selection.
watch([selectedTexture, () => props.engine] as const, async ([name, engine]) => {
  if (suppressTextureApply) return;
  if (engine && name) {
    try {
      await applyTextureToEngine(name, engine);
    } catch (e) {
      console.warn('Failed to apply tile texture:', e);
    }
  }
});

watch([selectedSkyboxTexture, () => props.engine] as const, async ([name, engine]) => {
  if (suppressTextureApply) return;
  if (engine && name) {
    try {
      await applySkyboxToEngine(name, engine);
    } catch (e) {
      console.warn('Failed to apply skybox texture:', e);
    }
  }
});

async function selectTexture(name: string) {
  const tex = textures.value.find(t => t.name === name);
  if (!tex) return;
  selectedTexture.value = name;
  model.value.textureName = name;
  model.value.textureGuid = tex.guid;
  textureName.value = tex.name;
  showTextureDropdown.value = false;
  // Persist selection
  localStorage.setItem(TEXTURE_SELECTED_KEY, name);
  // Apply to engine
  if (props.engine) {
    try {
      await applyTextureToEngine(name, props.engine);
    } catch (e) {
      console.warn('Failed to update tile texture:', e);
    }
  }
}

function selectTextureFromDropdown(tex: TextureMetadata) {
  selectTexture(tex.name);
}

async function deleteTextureByName(name: string) {
  if (BUILT_IN_TEXTURE_NAMES.has(name)) {
    window.alert(t('settings.textures.builtInCannotDelete'));
    return;
  }
  const texture = textures.value.find(item => item.name === name);
  if (!canDeleteCatalogEntry(userRole.value, texture?.remote)) {
    window.alert(t('settings.textures.sharedCannotDelete'));
    return;
  }
  if (!window.confirm(t('settings.textures.deleteConfirm', { name }))) return;
  await deleteTextureEntry(name);
  textures.value = await ensureTextureLibrary();
  if (selectedTexture.value === name) await selectTexture('Gold');
  if (selectedSkyboxTexture.value === name) await selectSkyboxTexture('Window');
  if (textureName.value === name) textureName.value = '';
  if (skyboxName.value === name) skyboxName.value = '';
}

async function selectSkyboxTexture(name: string) {
  const tex = textures.value.find(t => t.name === name);
  if (!tex) return;
  selectedSkyboxTexture.value = name;
  model.value.skyboxName = name;
  model.value.skyboxGuid = tex.guid;
  skyboxName.value = tex.name;
  showSkyboxDropdown.value = false;
  localStorage.setItem(SKYBOX_SELECTED_KEY, name);
  if (props.engine) {
    try {
      await applySkyboxToEngine(name, props.engine);
    } catch (e) {
      console.warn('Failed to update skybox texture:', e);
    }
  }
}

function selectSkyboxFromDropdown(tex: TextureMetadata) {
  selectSkyboxTexture(tex.name);
}

async function deleteTexture() {
  const name = textureName.value.trim();
  if (!name) return;
  const texture = textures.value.find(item => item.name === name);
  if (!canDeleteCatalogEntry(userRole.value, texture?.remote)) {
    window.alert(t('settings.textures.sharedCannotDelete'));
    return;
  }
  if (BUILT_IN_TEXTURE_NAMES.has(name)) {
    window.alert(t('settings.textures.builtInCannotDelete'));
    return;
  }
   if (window.confirm(t('settings.textures.deleteConfirm', { name }))) {
    const idx = textures.value.findIndex(t => t.name === name);
    if (idx >= 0) {
      textures.value.splice(idx, 1);
      await deleteTextureEntry(name);
      selectedTexture.value = 'Gold';
      textureName.value = '';
      // Revert to default texture
      await selectTexture('Gold');
    }
  }
}

async function deleteSkyboxTexture() {
  const name = skyboxName.value.trim();
  if (!name) return;
  const texture = textures.value.find(item => item.name === name);
  if (!canDeleteCatalogEntry(userRole.value, texture?.remote)) {
    window.alert(t('settings.textures.sharedCannotDelete'));
    return;
  }
  if (BUILT_IN_TEXTURE_NAMES.has(name)) {
    window.alert(t('settings.textures.builtInCannotDelete'));
    return;
  }
  if (window.confirm(t('settings.textures.deleteSkyboxConfirm', { name }))) {
    const idx = textures.value.findIndex(t => t.name === name);
    if (idx >= 0) {
      textures.value.splice(idx, 1);
      await deleteTextureEntry(name);
      if (selectedTexture.value === name) {
        await selectTexture('Gold');
      }
      await selectSkyboxTexture('Window');
      skyboxName.value = 'Window';
    }
  }
}

const textureFileInput = ref<HTMLInputElement | null>(null);
const skyboxFileInput = ref<HTMLInputElement | null>(null);
function triggerImportTexture() {
  textureFileInput.value?.click();
}

function triggerImportSkybox() {
  skyboxFileInput.value?.click();
}

async function importTextureFor(event: Event, target: 'tile' | 'skybox') {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  // Validate file type
  if (!file.type.startsWith('image/')) {
    window.alert(t('settings.textures.selectImageFile'));
    input.value = '';
    return;
  }
  try {
    const normalized = await normalizeTextureBlob(file);
    // Use filename (without extension) as default name
    const baseName = file.name.replace(/\.[^/.]+$/, '') || t('settings.textures.defaultName');
    let name = baseName;
    let counter = 1;
    while (textures.value.some(t => t.name === name)) {
      name = `${baseName} (${counter++})`;
    }
    // Generate thumbnail from the normalized WebP blob.
    const thumbUrl = URL.createObjectURL(normalized.blob);
    const thumbnail = await generateThumbnailFromUrl(thumbUrl);
    URL.revokeObjectURL(thumbUrl);

    // Store blob in IndexedDB
    await saveTextureEntry(name, normalized.blob, thumbnail, undefined, undefined, false, undefined, {
      kind: target === 'skybox' ? 'skybox' : 'texture',
      contentType: 'image/webp',
      width: normalized.width,
      height: normalized.height,
      byteSize: normalized.blob.size,
    });

    // Refresh metadata list
    textures.value = await ensureTextureLibrary();

    // Auto-select the newly imported texture for the requested target
    if (target === 'skybox') {
      await selectSkyboxTexture(name);
      skyboxName.value = name;
    } else {
      await selectTexture(name);
      textureName.value = name;
    }
    input.value = '';
  } catch (error) {
    console.warn('Failed to normalize imported texture:', error);
    window.alert(t('settings.textures.processFailed', { max: MAX_IMPORTED_TEXTURE_SIDE }));
    input.value = '';
  }
}

async function importTexture(event: Event) {
  await importTextureFor(event, 'tile');
}

async function importSkyboxTexture(event: Event) {
  await importTextureFor(event, 'skybox');
}

// ── Video export tab ──────────────────────────────────────────────
const videoExportRunning = ref(false);
const videoFramesEmitted = ref(0);
const videoTotalFrames = ref(0);
const videoExportError = ref<string | null>(null);
const videoExportWarning = ref<string | null>(null);
let videoAbortSignal: {aborted: boolean} | null = null;

const videoMaxTextureDimension = computed(() =>
  props.engine?.device?.limits?.maxTextureDimension2D ?? 8192);
const videoTiledMemoryProfile = computed(() =>
  props.engine?.getTiledExportMemoryProfile() ?? DEFAULT_TILED_EXPORT_MEMORY_PROFILE);

function cancelVideoExport() {
  if (videoAbortSignal) videoAbortSignal.aborted = true;
}

function previewVideoLocation(location: VideoPathLocation) {
  if (videoExportRunning.value || expmapBusy.value) return;
  model.value = { ...model.value, ...location };
}

async function startVideoExport(payload: {
  durationSeconds: number;
  motion: ExpmapMotion;
  filename: string;
  output: VideoOutputSpec;
  codec: 'av1' | 'avc' | 'hevc' | 'vp9';
  aaSamplesPerFrame: number;
  renderMode: VideoExportRenderMode;
  tiledMemoryBudgetMiB: number;
  startLocation: VideoPathLocation;
  endLocation: VideoPathLocation;
}) {
  if (videoExportRunning.value || expmapBusy.value || !props.engine || !props.mandelbrotCtrl) return;
  expmapOpenDocument.value = null;
  expmapBusy.value = true;
  videoExportError.value = null;
  videoExportWarning.value = null;
  videoExportRunning.value = true;
  videoFramesEmitted.value = 0;
  videoTotalFrames.value = 0;
  const signal = {aborted: false};
  videoAbortSignal = signal;

  // Ask for the destination file FIRST, while the click that started this is
  // still the current user gesture — showSaveFilePicker refuses once any await
  // has intervened. Streaming to disk is what keeps a long export from holding
  // the whole film in memory ("array buffer allocation failed" at the end), and
  // fragmented MP4 keeps the partial file playable if the run is interrupted.
  const suggestedName = payload.filename;
  let writable: FileSystemWritableFileStream | null = null;
  const picker = (window as any).showSaveFilePicker as
    | ((options?: unknown) => Promise<FileSystemFileHandle>)
    | undefined;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName,
        types: [{description: t('settings.video.mp4Description'), accept: {'video/mp4': ['.mp4']}}],
      });
      writable = await handle.createWritable();
    } catch (error) {
      // A dismissed picker cancels the export; anything else falls back to
      // buffering in memory, which still works for short films.
      if ((error as DOMException)?.name === 'AbortError') {
        videoExportRunning.value = false;
      expmapBusy.value = false;
        videoAbortSignal = null;
        return;
      }
      writable = null;
    }
  }

  try {
    const outcome = await runVideoExportToWebm(
      {engine: props.engine as any, controller: props.mandelbrotCtrl},
      {
        from: payload.startLocation,
        to: payload.endLocation,
        durationSeconds: payload.durationSeconds,
        motion: payload.motion,
        output: payload.output,
        codec: payload.codec,
        aaSamplesPerFrame: payload.aaSamplesPerFrame,
        renderMode: payload.renderMode,
        tiledMemoryBudgetMiB: payload.tiledMemoryBudgetMiB,
        destination: writable
          ? {kind: 'stream', writable: writable as unknown as WritableStream<Uint8Array>}
          : {kind: 'buffer'},
        maxTextureDimension: videoMaxTextureDimension.value,
        signal,
        onWarning: (message) => { videoExportWarning.value = message; },
        onProgress: (p) => {
          videoFramesEmitted.value = p.framesEmitted;
          videoTotalFrames.value = p.totalFrames;
        },
      },
    );
    if (outcome.blob) {
      const url = URL.createObjectURL(outcome.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = suggestedName;
      link.click();
      // Revoke only after the browser has had a chance to start the download.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  } catch (error) {
    videoExportError.value = error instanceof Error ? error.message : String(error);
  } finally {
    // Closing the handle is what makes the bytes on disk a finished file. Done
    // on every path, so an interrupted or failed export still leaves something
    // playable rather than a truncated handle.
    if (writable) await writable.close().catch(() => undefined);
    videoExportRunning.value = false;
      expmapBusy.value = false;
    videoAbortSignal = null;
  }
}
</script>

<template>
  <div class="settings-container" ref="settingsRoot">
    <!-- Navigation tab -->
    <div v-if="activeTab === 'navigation'" class="cv-body sections">

      <!-- ============ 3. LOCATIONS LIBRARY ============ -->
      <DenseSection
        :title="t('settings.navigation.library.title')" initially-collapsed
        :scope="t('settings.navigation.library.scope')"
        icon='<path d=&quot;M4 19V5a2 2 0 012-2h3v18H6a2 2 0 01-2-2zM9 3h5v18H9zM17 4l4 16-3 1-4-16z&quot;/>'
      >

      <div class="lib-row">
        <button
          class="fav-filter"
          :class="{ on: showOnlyFavoriteNavigation }"
          type="button"
          :aria-pressed="showOnlyFavoriteNavigation"
          @click="showOnlyFavoriteNavigation = !showOnlyFavoriteNavigation"
        >
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
          {{ t('common.favorites') }}
        </button>
        <div class="dropdown cv-dropdown" :class="{ 'is-active': showNavPresetDropdown }">
          <div class="dropdown-trigger">
            <button class="cv-select-trigger" @click="showNavPresetDropdown = !showNavPresetDropdown" aria-haspopup="true" aria-controls="dropdown-menu-nav-presets" type="button">
              <img v-if="currentNavPresetThumbnail" :src="currentNavPresetThumbnail" :alt="t('settings.thumbnailAlt')" class="cv-trigger-thumb" />
              <span class="cv-trigger-label">{{ currentNavPresetMeta?.name || (selectedNavPreset ? formatPresetDate(currentNavPresetMeta?.date ?? '') : t('settings.navigation.choosePreset')) }}</span>
              <span class="cv-caret"></span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-nav-presets" role="menu">
            <div class="dropdown-content cv-dropdown-content">
              <a v-for="preset in visibleNavPresets" :key="preset.id" class="dropdown-item favorite-row"
                @click.prevent="selectNavPresetFromDropdown(preset)"
                :class="{ 'is-active': selectedNavPreset === preset.id }"
                style="display:flex; align-items:center; gap:0.75em;">
                <button
                  v-if="isAdmin"
                  class="favorite-button upload-button"
                  :class="uploadButtonClasses(uploadSuccessKey('preset', preset.id), preset.remote)"
                  type="button"
                  :title="uploadButtonTitle(uploadSuccessKey('preset', preset.id), preset.remote)"
                  :aria-label="uploadButtonTitle(uploadSuccessKey('preset', preset.id), preset.remote)"
                  @click.stop.prevent="uploadCompletePreset(preset.id)"
                >
                  <span class="favorite-heart" aria-hidden="true"><i :class="uploadButtonIcon(uploadSuccessKey('preset', preset.id))"></i></span>
                </button>
                <button
                  class="favorite-button"
                  :class="{ 'is-favorite': preset.favorite }"
                  type="button"
                  :title="preset.favorite ? t('common.removeFromFavorites') : t('common.addToFavorites')"
                  :aria-pressed="!!preset.favorite"
                  @click.stop.prevent="togglePresetFavorite(preset.id)"
                >
                  <span class="favorite-heart" aria-hidden="true"><i class="fa-heart" :class="preset.favorite ? 'fa-solid' : 'fa-regular'"></i></span>
                </button>
                <img v-if="preset.thumbnail" :src="preset.thumbnail" :alt="t('settings.thumbnailAlt')"
                  style="height:63px; width:112px; object-fit:cover; border-radius:4px; background:#aaa; flex-shrink:0; box-shadow:0 1px 6px rgba(0,0,0,0.16);"/>
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:0.15em;">
                  <span v-if="preset.name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:1.05em; font-weight:500;">{{ preset.name }}</span>
                  <span style="font-size:0.78em; color:var(--ink-3); display:flex; gap:0.6em;">
                    <span>{{ formatPresetDate(preset.date) }}</span>
                    <span v-if="preset.scaleExponent > 0" style="font-family:monospace;">{{ formatZoom(preset.scaleExponent) }}</span>
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="nav-preset-actions">
        <button class="mini-btn primary load-btn" @click="selectedNavPreset && selectPresetLocation(selectedNavPreset)" :disabled="!selectedNavPreset">
          <svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
          {{ t('settings.navigation.applyLocation') }}
        </button>
        <button
          class="mini-btn preset-link-btn"
          :class="{ copied: presetLinkCopied }"
          type="button"
          :disabled="!currentNavPresetMeta || shareBusy"
          :title="t('settings.navigation.copySceneLinkTitle')"
          @click="currentNavPresetMeta && copyPresetLink(currentNavPresetMeta.id)"
        >
          <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
          {{ presetLinkCopied ? t('common.linkCopied') : t('common.copyLink') }}
        </button>
      </div>
      <p v-if="shareMessage" role="status" :class="{ 'share-error': shareError }">{{ shareMessage }}</p>
      <p class="load-note">{{ t('settings.navigation.loadNote') }}</p>

      <div v-if="isAdmin" class="transfer">
        <button class="mini-btn primary" @click="triggerImportPresets"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5 5 5-5"/><path d="M5 3h14"/></svg>{{ t('common.import') }}</button>
        <button class="mini-btn" @click="exportSelectedNavigationPreset" :disabled="!selectedNavPreset"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>{{ t('settings.exportSelection') }}</button>
        <button class="mini-btn" @click="exportFavoriteNavigationPresets" :disabled="favoritePresets.length === 0"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9z"/></svg>{{ t('settings.exportFavorites') }}</button>
      </div>

      </DenseSection>

      <!-- ============ 1. LOCATION ============ -->
      <DenseSection
        :title="t('settings.navigation.location.title')"
        :scope="t('settings.navigation.location.scope')"
        icon='<circle cx=&quot;12&quot; cy=&quot;12&quot; r=&quot;3.2&quot;/><path d=&quot;M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22&quot;/><circle cx=&quot;12&quot; cy=&quot;12&quot; r=&quot;9&quot;/>'
      >
        <div class="coord-head">
          <span class="coord-title">{{ t('settings.navigation.center') }}</span>
          <button class="mini-btn coord-copy-all" :class="{ ok: coordsCopied }" type="button" :title="t('settings.navigation.copyCxCy')" @click="copyCoordinates">
            <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
            {{ coordsCopied ? t('common.copied') : t('settings.navigation.copyBoth') }}
          </button>
        </div>
        <div class="coord-lines">
          <CoordinateField label="Cx" :model-value="model.cx" :suspend-shortcuts="props.suspendShortcuts" @update:model-value="updateCx" />
          <CoordinateField label="Cy" :model-value="model.cy" :suspend-shortcuts="props.suspendShortcuts" @update:model-value="updateCy" />
        </div>

        <div class="find-minibrot-row">
          <button
            class="mini-btn"
            :disabled="!props.engine || findingMinibrot || zoomingMinibrot"
            :title="t('settings.navigation.findMinibrotTitle')"
            @click="findMinibrot"
          >
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
            {{ findingMinibrot ? t('settings.navigation.searching') : t('settings.navigation.findMinibrot') }}
          </button>
          <button
            class="mini-btn"
            :disabled="!props.engine || findingMinibrot || zoomingMinibrot"
            :title="t('settings.navigation.frameMinibrotTitle')"
            @click="zoomToMinibrot"
          >
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M8 11h6M11 8v6"/></svg>
            {{ zoomingMinibrot ? t('settings.navigation.framing') : t('settings.navigation.frameMinibrot') }}
          </button>
          <span v-if="findMinibrotStatus" class="find-minibrot-status">{{ findMinibrotStatus }}</span>
        </div>

        <div class="mu-row">
          <DenseField
            :label="t('settings.navigation.decade')" :min="-10" :max="1000" :step="1"
            :f="zoomFmt"
            :model-value="scaleSlider"
            @update:model-value="(v: number) => scaleSlider = v"
          />
          <button class="mini-btn mu-quick" @click="stepDecade(-1)" :title="t('settings.navigation.decadeBack')">−</button>
          <button class="mini-btn mu-quick" @click="scaleSlider = 0" :title="t('settings.navigation.initialZoom')">1e0</button>
          <button class="mini-btn mu-quick" @click="stepDecade(1)" :title="t('settings.navigation.decadeForward')">+</button>
        </div>
        <div class="mu-row fine-zoom" @pointerup="onFineRelease" @pointercancel="onFineRelease">
          <DenseField
            :label="t('settings.navigation.fine')" :min="0" :max="1" :step="0.001"
            :f="fineFmt"
            :model-value="fineSlider"
            @update:model-value="(v: number) => fineSlider = v"
          />
          <span class="mini-btn mu-quick fine-decade" :title="t('settings.navigation.fineDecadeTitle', { from: fineDecade, to: fineDecade + 1 })">→1e-{{ fineDecade + 1 }}</span>
        </div>
        <div class="coord-lines">
          <CoordinateField
            :label="t('settings.navigation.scale')" :model-value="model.scale" :format="scaleSciFormat" :parse="parseScaleInput"
            :suspend-shortcuts="props.suspendShortcuts"
            @update:model-value="(v: string) => model.scale = v"
          />
        </div>
        <div class="mu-row">
          <DenseField
            :label="t('settings.navigation.rotation')" :min="0" :max="359" :step="1" :default="0"
            :f="angleFmt" unit="°"
            :model-value="angleSlider"
            @update:model-value="(v: number) => angleSlider = v"
          />
          <button class="mini-btn mu-quick" @click="stepQuarterTurn(-1)" :title="t('settings.navigation.quarterTurnCcw')">−90°</button>
          <button class="mini-btn mu-quick" @click="model.angle = 0" :title="t('settings.navigation.zeroRotation')">0°</button>
          <button class="mini-btn mu-quick" @click="stepQuarterTurn(1)" :title="t('settings.navigation.quarterTurnCw')">+90°</button>
        </div>
        <div class="mu-row">
          <DenseField
            :label="t('settings.navigation.bailout')" :min="0.602" :max="5" :step="0.01" :default="MU_MIN_LOG10"
            :f="muFmt"
            :model-value="muSlider"
            @update:model-value="(v: number) => muSlider = v"
          />
          <button class="mini-btn mu-quick" @click="model.mu = 4" :title="t('settings.navigation.bailout4')">4</button>
        </div>
      </DenseSection>

    </div>

    <!-- Presets tab -->
    <div v-else-if="activeTab === 'presets'" class="cv-body sections">

      <div class="scene-share-row">
        <button type="button" class="mini-btn primary" :disabled="shareBusy || shareSaving || sceneLinkBusy" @click="shareCurrentScene">{{ shareLabel }}</button>
        <p class="section-help">{{ t('settings.presets.shareHelp') }}</p>
        <p v-if="shareMessage" role="status" :class="{ 'share-error': shareError }">{{ shareMessage }}</p>
      </div>
      <!-- ============ 1. SAVE CURRENT VIEW ============ -->
      <DenseSection
        :title="t('settings.presets.saveView.title')" initially-collapsed
        :scope="t('settings.presets.saveView.scope')"
        icon='<path d=&quot;M5 3h12l4 4v14H5z&quot;/><path d=&quot;M9 3v5h7V3M8 21v-7h8v7&quot;/>'
      >
      <DenseLinkedChip v-if="sceneLink.origin.value" :kind="t('settings.presets.sceneKind')" :name="sceneLink.origin.value.name" :dirty="sceneLink.dirty.value" :locked="sceneLink.locked.value" :busy="sceneLinkBusy" :suspend-shortcuts="props.suspendShortcuts"
        @update="updateLinkedScenePreset" @rename="renameLinkedScenePreset" @detach="detachScenePreset" @variant="saveScenePresetVariant" />
      <div class="save-row">
        <input class="txt-in" v-model="presetName" type="text" :placeholder="sceneLink.origin.value ? t('settings.saveCopyAs') : t('settings.presets.optionalName')"
          @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
          @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
        />
        <button class="mini-btn primary" @click="savePreset">
          <svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H5z"/><path d="M9 3v5h7V3M8 21v-7h8v7"/></svg>
          {{ t('common.save') }}
        </button>
      </div>
      </DenseSection>

      <!-- ============ 2. LIBRARY ============ -->
      <DenseSection
        :title="t('settings.presets.library.title')"
        :scope="t('settings.presets.library.scope')"
        icon='<path d=&quot;M4 19V5a2 2 0 012-2h3v18H6a2 2 0 01-2-2zM9 3h5v18H9zM17 4l4 16-3 1-4-16z&quot;/>'
      >

      <div class="lib-bar">
        <input class="txt-in gallery-search" v-model="presetQuery" type="search" :aria-label="t('settings.presets.searchAria')" :placeholder="t('settings.presets.searchPlaceholder')" />
        <select class="txt-in" v-model="presetSort" :aria-label="t('settings.presets.sortAria')"><option value="recent">{{ t('settings.presets.sortRecent') }}</option><option value="name">{{ t('settings.presets.sortName') }}</option></select>
        <button
          class="fav-filter"
          :class="{ on: showOnlyFavoritePresets }"
          type="button"
          :aria-pressed="showOnlyFavoritePresets"
          @click="showOnlyFavoritePresets = !showOnlyFavoritePresets"
        >
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
          {{ t('common.favorites') }}
        </button>
        <span class="count">
          {{ visiblePresets.length }}<template v-if="showOnlyFavoritePresets"> / {{ presets.length }}</template>
          {{ t('settings.presets.presetUnit', visiblePresets.length === 1 && !showOnlyFavoritePresets ? 1 : 2) }}
        </span>
      </div>

      <div class="grid">
        <div
          v-for="preset in visiblePresets"
          :key="preset.id"
          class="card"
          :class="{ sel: selectedPreset === preset.id }"
          @click="selectPresetFromDropdown(preset)"
        >
          <span class="sel-badge">{{ t('settings.applied') }}</span>
          <img v-if="preset.thumbnail" :src="preset.thumbnail" :alt="t('settings.thumbnailAlt')" class="thumb" />
          <div v-else class="thumb thumb-empty"></div>
          <div class="info"><PresetActionsMenu :label="preset.name">
              <button type="button" :disabled="shareBusy" @click="copyPresetLink(preset.id)">{{ t('common.copyLink') }}</button>
              <button type="button" @click="togglePresetFavorite(preset.id)">{{ preset.favorite ? t('common.removeFromFavorites') : t('common.addToFavorites') }}</button>
              <button v-if="canOverwriteCatalogPayload(userRole, preset.remote)" type="button" @click="renameSceneCard(preset)">{{ t('settings.renameEllipsis') }}</button>
              <button type="button" @click="duplicateSceneCard(preset)">{{ t('common.duplicate') }}</button>
              <button v-if="isAdmin" type="button" @click="exportPresetById(preset.id)">{{ t('settings.exportEllipsis') }}</button>
              <button v-if="isAdmin" type="button" @click="uploadCompletePreset(preset.id)">{{ isUploadSuccess(uploadSuccessKey('preset', preset.id)) ? t('settings.catalogUpdated') : t('settings.publishToCatalog') }}</button>
              <button v-if="canDeleteCatalogEntry(userRole, preset.remote)" type="button" class="danger" @click="deletePresetById(preset.id)">{{ t('settings.deleteEllipsis') }}</button>
            </PresetActionsMenu>
            <span v-if="preset.favorite" class="favorite-marker" :aria-label="t('settings.favoriteMarker')">♥</span>
            <div v-if="displayName(preset.name)" class="nm">{{ displayName(preset.name) }}</div>
            <div class="sub">
              <span>{{ formatPresetDate(preset.date) }}</span>
              <span v-if="preset.scaleExponent > 0" class="depth">{{ formatZoom(preset.scaleExponent) }}</span>
            </div>
          </div>
        </div>
        <div v-if="visiblePresets.length === 0" class="empty">
          {{ showOnlyFavoritePresets ? t('settings.presets.emptyFavorites') : t('settings.presets.emptyScenes') }}
        </div>
      </div>

      </DenseSection>

      <!-- ============ 3. TRANSFER ============ -->
      <DenseSection
        v-if="isAdmin"
        :title="t('settings.transfer.title')" initially-collapsed
        :scope="t('settings.transfer.scope')"
        icon='<path d=&quot;M12 3v12M7 10l5 5 5-5M5 21h14&quot;/>'
      >
      <div class="transfer">
        <button class="mini-btn primary" @click="triggerImportPresets"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5 5 5-5"/><path d="M5 3h14"/></svg>{{ t('common.import') }}</button>
        <button class="mini-btn" @click="exportPresets" :disabled="presets.length === 0"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>{{ t('settings.exportAll') }}</button>
        <button class="mini-btn" @click="exportSelectedPreset" :disabled="!selectedPreset"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>{{ t('settings.exportSelection') }}</button>
        <button class="mini-btn" @click="exportFavoritePresets" :disabled="favoritePresets.length === 0"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9z"/></svg>{{ t('settings.exportFavorites') }}</button>
        <input ref="presetFileInput" type="file" accept=".json" multiple style="display:none;" @change="importPresets" />
      </div>
      </DenseSection>
    </div>

    <!-- Animation tab -->
    <div v-else-if="activeTab === 'animation'" class="animation-tab">
      <AnimationPanel
        ref="animationPanelRef"
        v-model="model"
        :user-role="userRole"
        :is-admin="isAdmin"
        :upload-success-keys="uploadSuccessKeys"
        :suspend-shortcuts="props.suspendShortcuts"
        @upload-preset="uploadAnimationPreset"
      />
    </div>

    <div v-else-if="activeTab === 'expmap'" class="cv-body sections">
      <ExpmapPanel :current="model as unknown as Record<string, unknown>" :engine="props.engine ?? null" :controller="props.mandelbrotCtrl ?? null" @use-video="emit('open-video')"/>
    </div>

    <!-- Video export tab -->
    <div v-else-if="activeTab === 'video'" class="cv-body sections">
      <VideoExportPanel
        :engine="props.engine"
        :controller="props.mandelbrotCtrl"
        :current="model as unknown as Record<string, unknown>"
        :max-texture-dimension="videoMaxTextureDimension"
        :tiled-memory-profile="videoTiledMemoryProfile"
        :running="videoExportRunning"
        :frames-emitted="videoFramesEmitted"
        :total-frames="videoTotalFrames"
        :last-error="videoExportError"
        :warning="videoExportWarning"
        @preview="previewVideoLocation"
        @start="startVideoExport"
        @cancel="cancelVideoExport"
      />
    </div>

    <!-- Palettes tab -->
    <div v-else-if="activeTab === 'palettes'" class="cv-body palette-canvas-panel" :class="{ 'palette-library': primary === 'library' }">
      <DenseLinkedChip v-if="paletteLink.origin.value" :kind="paletteLinkKind" :name="paletteLink.origin.value.name" :dirty="paletteLink.dirty.value" :locked="paletteLink.locked.value" :busy="paletteLinkBusy" :suspend-shortcuts="props.suspendShortcuts"
        @update="updateLinkedPalette" @rename="renameLinkedPalette" @detach="detachPalette" @variant="savePaletteVariant" />
      <!-- ═══ Pipette + outils compact ═══ -->
      <div class="palette-strip-zone">
      <div class="top-bar palette-strip-bar mb-2 mt-2">
        <!-- Stop edit scope: apply edits to just the selected stop, or to all stops -->
        <select class="scope-select txt-in" :aria-label="t('settings.palettes.scopeAria')" :value="applyToAll ? 'all' : 'point'" @change="applyToAll = ($event.target as HTMLSelectElement).value === 'all'">
          <option value="point">{{ t('settings.palettes.scopePoint') }}</option><option value="all">{{ t('settings.palettes.scopeAll') }}</option>
        </select>
        <div class="color-picker-row">
          <button
            class="pipette-btn"
            :class="{ 'is-active': props.pickerMode && props.pickerAction !== 'select' }"
            :title="props.pickerMode ? t('settings.palettes.pipetteExit') : t('settings.palettes.pipetteAdd')"
            @click="emit('toggle-picker')"
          >
            <i class="fa-solid fa-eye-dropper fa-fw"></i>
          </button>
          <button class="pipette-btn" :class="{ 'is-active': props.pickerMode && props.pickerAction === 'select' }"
            :title="t('settings.palettes.pipetteSelectTitle')" :aria-label="t('settings.palettes.pipetteSelectAria')"
            :aria-pressed="props.pickerMode && props.pickerAction === 'select'" @click="emit('toggle-picker', 'select')">
            <i class="fa-solid fa-arrow-pointer fa-fw"></i>
          </button>
          <span v-if="props.pickerMode" class="picker-hint">{{ props.pickerAction === 'select' ? t('settings.palettes.hintSelect') : t('settings.palettes.hintAdd') }}</span>
        </div>
        <details class="palette-transform"><summary class="mini-btn" :aria-label="t('settings.palettes.transformGradient')" :title="t('settings.palettes.transformGradient')">⋯</summary><div class="outils-bar">
          <button class="button is-small is-light outils-btn" @click="invertPalette" :title="t('settings.palettes.invertTitle')">
            <i class="fa-solid fa-arrow-right-arrow-left fa-fw"></i> {{ t('settings.palettes.invert') }}
          </button>
          <button class="button is-small is-light outils-btn" @click="duplicatePalette" :title="t('settings.palettes.duplicateTitle')">
            <i class="fa-regular fa-copy fa-fw"></i> {{ t('common.duplicate') }}
          </button>
          <button class="button is-small is-light outils-btn" @click="mirrorPalette" :title="t('settings.palettes.palindromeTitle')">
            <i class="fa-solid fa-arrows-left-right fa-fw"></i> {{ t('settings.palettes.palindrome') }}
          </button>
          <button class="button is-small is-light outils-btn" @click="distributeEvenly" :title="t('settings.palettes.distributeTitle')">
            <i class="fa-solid fa-align-justify fa-fw"></i> {{ t('settings.palettes.distribute') }}
          </button>
          <button class="button is-small is-danger is-light outils-btn" @click="clearPalette" :title="t('settings.palettes.clearTitle')">
            <i class="fa-solid fa-trash-can fa-fw"></i> {{ t('settings.palettes.clear') }}
          </button>
        </div></details>
        <button class="mini-btn" :disabled="model.colorStops.length >= MAX_COLORS" @click="addPaletteStop">{{ t('settings.palettes.addPoint') }}</button>
      </div>

      <!-- Compact stop bar: color/iridescence/curve pickers + stop preset picker,
           shown above the strip on a single line so they're visible without scrolling. -->
      <div v-if="quickSelectedStop" class="stop-quickbar">
        <span class="quickbar-lab">{{ t('settings.palettes.color') }}</span>
        <span class="swatch" :style="{ background: quickSelectedHex }" :title="t('settings.palettes.pointColorTitle')">
          <input type="color" :value="quickSelectedHex" @input="quickSelectedHex = ($event.target as HTMLInputElement).value" />
        </span>
        <span class="quickbar-hex">{{ quickSelectedHex }}</span>

        <span class="quickbar-lab">{{ t('settings.palettes.iridescence') }}</span>
        <template v-if="quickSelectedStop.iridescenceColor">
          <span class="swatch" :style="{ background: quickSelectedIridescenceHex }" :title="t('settings.palettes.iridescenceColorTitle')">
            <input type="color" :value="quickSelectedIridescenceHex" @input="quickSelectedIridescenceHex = ($event.target as HTMLInputElement).value" />
          </span>
          <button class="col-clr" :title="t('settings.palettes.removeIridescence')" @click="quickClearIridescenceColor">✕</button>
        </template>
        <button v-else class="col-plus" :title="t('settings.palettes.enableIridescence')" @click="quickEnableIridescenceColor">+</button>

        <StopTransferCurveSelector v-model="quickSelectedTransferCurve" />


      </div>

      <!-- Live WebGPU material preview strip (mockup style) with handles overlaid -->
      <div class="canvas-row palette-strip mb-3" style="position:relative;" @dblclick="onPreviewDblClick" :title="t('settings.palettes.dblclickAddStop')">
        <PalettePreview
          ref="previewRef"
          class="palette-strip-fill"
          :colorStops="model.colorStops"
          :interpolationMode="model.interpolationMode"
          :iterationPaletteCurve="model.iterationPaletteCurve"
          :tileTextureUrl="activeBlobUrl"
          :skyboxTextureUrl="activeSkyboxBlobUrl"
          :tessellationLevel="model.tessellationLevel"
          :displacementAmount="model.displacementAmount"
          :microBumpStrength="model.microBumpStrength"
          :reliefDepth="model.reliefDepth"
          :protrusionPhase="model.protrusionPhase"
          :protrusionSharpness="model.protrusionSharpness"
          :protrusionStrength="model.protrusionStrength"
          :protrusionGeometryMix="model.protrusionGeometryMix"
          :protrusionPeriod="model.protrusionPeriod"
          :ambientOcclusionStrength="model.ambientOcclusionStrength"
          :localShadowStrength="model.localShadowStrength"
          :varnishStrength="model.varnishStrength"
          :gradeContrast="model.gradeContrast"
          :gradeSaturation="model.gradeSaturation"
          :orbitTrapStrength="model.orbitTrapStrength"
          :orbitTrap="model.orbitTrap"
          :phaseColoringStrength="model.phaseColoringStrength"
          :textureMapping="model.textureMapping"
        />
        <div class="canvas-shadow-overlay"></div>
        <div class="handles-overlay">
          <GlissiereHandle
            v-for="(stop, idx) in model.colorStops"
            :key="'handle-' + idx"
            :stop="stop"
            :selected="!applyToAll && selectedIdx === idx"
            :highlighted="applyToAll"
            :disabled="applyToAll"
            @update:position="t => model.colorStops[idx].position = t"
            @select="selectColor(idx)"
          />
          <!-- Bouton supprimer flottant au-dessus du curseur sélectionné -->
          <button
            v-if="!applyToAll && selectedIdx !== null && model.colorStops.length > 2"
            class="floating-delete-btn"
            :style="{ left: model.colorStops[selectedIdx]?.position * 100 + '%' }"
            :title="t('settings.palettes.deleteStop')"
            @mousedown.stop
            @click.stop="deleteSelectedStop"
          >
            &times;
          </button>
        </div>
      </div>

      <!-- Pinned quick fields under the strip (mockup HUD .pins) -->
      <details class="palette-distribution"><summary>{{ t('settings.palettes.distribution.title') }}</summary><div class="pins">
        <DenseField :label="t('settings.palettes.distribution.period')" :min="0" :max="1" :step="0.001" :default="Math.log10(256) / 6" :f="palettePeriodFmt"
          :model-value="sliderPalettePeriod" @update:model-value="(v: number) => sliderPalettePeriod = v" />
        <DenseSelect :label="t('settings.palettes.distribution.distribution')"
          :options="iterationPaletteCurveOptions"
          :model-value="normalizeIterationPaletteCurve(model.iterationPaletteCurve)"
          @update:model-value="(v: string | number) => model.iterationPaletteCurve = normalizeIterationPaletteCurve(v)" />
        <DenseField :label="t('settings.palettes.distribution.offset')" :min="0" :max="1" :step="0.001" :default="0" :f="pctFmt"
          :model-value="model.paletteOffset ?? 0" @update:model-value="(v: number) => model.paletteOffset = v" />
        <DenseField :label="t('settings.palettes.distribution.screenX')" :min="0" :max="2" :step="0.01" :default="0" f="p2"
          :model-value="model.paletteScreenShiftX ?? 0" @update:model-value="(v: number) => model.paletteScreenShiftX = v" />
        <DenseField :label="t('settings.palettes.distribution.screenY')" :min="0" :max="2" :step="0.01" :default="0" f="p2"
          :model-value="model.paletteScreenShiftY ?? 0" @update:model-value="(v: number) => model.paletteScreenShiftY = v" />
        <DenseField :label="t('settings.palettes.distribution.heightShift')" :min="0" :max="100" :step="0.01" :default="0" f="p2"
          :model-value="model.heightPaletteShift ?? 0" @update:model-value="(v: number) => model.heightPaletteShift = v" />
        <DenseField :label="t('settings.palettes.distribution.colorPhase')" :min="0" :max="1" :step="0.001" :default="0" :f="phaseColoringFmt"
          :model-value="sliderPhaseColoring" @update:model-value="(v: number) => sliderPhaseColoring = v" />
        <DenseToggle :label="t('settings.palettes.distribution.mirror')"
          :model-value="!!model.paletteMirror" @update:model-value="(v: boolean) => model.paletteMirror = v" />
      </div></details>
      </div>
      <nav v-if="primary !== 'library'" class="panel-tabs" :aria-label="t('settings.palettes.tabsAria')">
        <button v-for="item in [{id:'color',label:t('settings.palettes.tabs.color')}, {id:'material',label:t('settings.palettes.tabs.material')}, {id:'texture',label:t('settings.palettes.tabs.texture')}]" :key="item.id" :aria-pressed="paletteTab === item.id" @click="paletteTab = item.id">{{ item.label }}</button>
      </nav>
      <p v-if="primary !== 'library'" class="panel-note">{{ applyToAll ? t('settings.palettes.groupEdit') : t('settings.palettes.pointOf', { index: (selectedIdx ?? 0) + 1, total: model.colorStops.length }) }}</p>
      <div class="sections">


      <PaletteEditor
        ref="paletteEditorRef"
        :category="paletteTab"
        :color-stops="model.colorStops"
        :selected-idx="selectedIdx"
        :interpolation-mode="model.interpolationMode"
        :picker-mode="props.pickerMode"
        :suspend-shortcuts="props.suspendShortcuts"
        :tile-texture-url="activeBlobUrl"
        :skybox-texture-url="activeSkyboxBlobUrl"
        :tessellation-level="model.tessellationLevel"
        :displacement-amount="model.displacementAmount"
        :micro-bump-strength="model.microBumpStrength"
        :relief-depth="model.reliefDepth"
        :ambient-occlusion-strength="model.ambientOcclusionStrength"
        :local-shadow-strength="model.localShadowStrength"
        :varnish-strength="model.varnishStrength"
        :grade-contrast="model.gradeContrast"
        :grade-saturation="model.gradeSaturation"
        :orbit-trap-strength="model.orbitTrapStrength"
        :orbit-trap="model.orbitTrap"
        :phase-coloring-strength="model.phaseColoringStrength"
        :texture-mapping="model.textureMapping"
        :is-admin="isAdmin"
        v-model:apply-to-all="applyToAll"
        :stop-presets="stopPresets"
        v-model:selected-stop-preset-name="selectedStopPresetName"
        @refresh-stop-presets="refreshStopPresets"
      >
        <template #preset-selector>        <select
          class="quickbar-preset-select"
          :value="selectedStopPresetName"
          @change="applyQuickStopPreset(($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>{{ t('settings.palettes.choosePreset') }}</option>
          <option v-for="preset in stopPresets" :key="preset.guid || preset.name" :value="preset.name">{{ preset.name }}</option>
        </select></template>
      </PaletteEditor>

      <DenseSection group="params" :hue="320" v-show="paletteTab === 'material'" :title="t('settings.palettes.orbitTrap.title')" initially-collapsed :scope="t('settings.palettes.orbitTrap.scope')" icon='<circle cx=&quot;12&quot; cy=&quot;12&quot; r=&quot;4&quot;/><path d=&quot;M12 2c4 3 7 6 10 10-3 4-6 7-10 10-4-3-7-6-10-10 3-4 6-7 10-10z&quot;/>'>
        <div class="fields">
          <DenseSelect :label="t('settings.palettes.orbitTrap.mode')"
            :options="orbitTrapModeOptions"
            :model-value="orbitTrapConfig.mode"
            @update:model-value="setOrbitTrapMode" />
          <template v-if="orbitTrapConfig.mode !== 'off'">
          <DenseField :label="t('settings.palettes.orbitTrap.strength')" :min="0" :max="100" :step="0.1" :default="DEFAULT_ORBIT_TRAP.strength" f="p1"
            :model-value="orbitTrapConfig.strength" @update:model-value="(v: number) => setOrbitTrapNumber('strength', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.scale')" :min="0.05" :max="4" :step="0.01" :default="DEFAULT_ORBIT_TRAP.scale" f="p2"
            :model-value="orbitTrapConfig.scale" @update:model-value="(v: number) => setOrbitTrapNumber('scale', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.rotation')" :min="-3.1416" :max="3.1416" :step="0.01" :default="DEFAULT_ORBIT_TRAP.rotation" :f="radFmt"
            :model-value="orbitTrapConfig.rotation" @update:model-value="(v: number) => setOrbitTrapNumber('rotation', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.petals')" :min="1" :max="16" :step="1" :default="DEFAULT_ORBIT_TRAP.petals" f="p0"
            :model-value="orbitTrapConfig.petals" @update:model-value="(v: number) => setOrbitTrapNumber('petals', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.petalDepth')" :min="0" :max="1" :step="0.01" :default="DEFAULT_ORBIT_TRAP.petalDepth" f="p2"
            :model-value="orbitTrapConfig.petalDepth" @update:model-value="(v: number) => setOrbitTrapNumber('petalDepth', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.twist')" :min="-8" :max="8" :step="0.01" :default="DEFAULT_ORBIT_TRAP.twist" f="p2"
            :model-value="orbitTrapConfig.twist" @update:model-value="(v: number) => setOrbitTrapNumber('twist', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.width')" :min="0.005" :max="0.5" :step="0.001" :default="DEFAULT_ORBIT_TRAP.width" f="p3"
            :model-value="orbitTrapConfig.width" @update:model-value="(v: number) => setOrbitTrapNumber('width', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.hardness')" :min="0.25" :max="8" :step="0.05" :default="DEFAULT_ORBIT_TRAP.hardness" f="p2"
            :model-value="orbitTrapConfig.hardness" @update:model-value="(v: number) => setOrbitTrapNumber('hardness', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.centerX')" :min="-2" :max="2" :step="0.01" :default="DEFAULT_ORBIT_TRAP.centerX" f="p2"
            :model-value="orbitTrapConfig.centerX" @update:model-value="(v: number) => setOrbitTrapNumber('centerX', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.centerY')" :min="-2" :max="2" :step="0.01" :default="DEFAULT_ORBIT_TRAP.centerY" f="p2"
            :model-value="orbitTrapConfig.centerY" @update:model-value="(v: number) => setOrbitTrapNumber('centerY', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.anisotropyX')" :min="0.1" :max="4" :step="0.01" :default="DEFAULT_ORBIT_TRAP.anisotropyX" f="p2"
            :model-value="orbitTrapConfig.anisotropyX" @update:model-value="(v: number) => setOrbitTrapNumber('anisotropyX', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.anisotropyY')" :min="0.1" :max="4" :step="0.01" :default="DEFAULT_ORBIT_TRAP.anisotropyY" f="p2"
            :model-value="orbitTrapConfig.anisotropyY" @update:model-value="(v: number) => setOrbitTrapNumber('anisotropyY', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.shapePhase')" :min="-3.1416" :max="3.1416" :step="0.01" :default="DEFAULT_ORBIT_TRAP.phase" :f="radFmt"
            :model-value="orbitTrapConfig.phase" @update:model-value="(v: number) => setOrbitTrapNumber('phase', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.distanceBands')" :min="0" :max="32" :step="0.1" :default="DEFAULT_ORBIT_TRAP.distanceFrequency" f="p1"
            :model-value="orbitTrapConfig.distanceFrequency" @update:model-value="(v: number) => setOrbitTrapNumber('distanceFrequency', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.distanceWeight')" :min="-4" :max="4" :step="0.01" :default="DEFAULT_ORBIT_TRAP.distanceWeight" f="p2"
            :model-value="orbitTrapConfig.distanceWeight" @update:model-value="(v: number) => setOrbitTrapNumber('distanceWeight', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.iterationWeight')" :min="-4" :max="4" :step="0.01" :default="DEFAULT_ORBIT_TRAP.iterationWeight" f="p2"
            :model-value="orbitTrapConfig.iterationWeight" @update:model-value="(v: number) => setOrbitTrapNumber('iterationWeight', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.angleWeight')" :min="-4" :max="4" :step="0.01" :default="DEFAULT_ORBIT_TRAP.angleWeight" f="p2"
            :model-value="orbitTrapConfig.angleWeight" @update:model-value="(v: number) => setOrbitTrapNumber('angleWeight', v)" />
          <DenseField :label="t('settings.palettes.orbitTrap.colorOffset')" :min="-4" :max="4" :step="0.01" :default="DEFAULT_ORBIT_TRAP.phaseOffset" f="p2"
            :model-value="orbitTrapConfig.phaseOffset" @update:model-value="(v: number) => setOrbitTrapNumber('phaseOffset', v)" />
          <template v-if="orbitTrapConfig.mode === 'sampled' || orbitTrapConfig.mode === 'exact'">
            <DenseField :label="t('settings.palettes.orbitTrap.orbitStart')" :min="0" :max="10000" :step="1" :default="DEFAULT_ORBIT_TRAP.startIteration" f="p0"
            :model-value="orbitTrapConfig.startIteration" @update:model-value="(v: number) => setOrbitTrapNumber('startIteration', v)" />
            <DenseField :label="t('settings.palettes.orbitTrap.orbitEnd')" :min="0" :max="1000000" :step="1" :default="DEFAULT_ORBIT_TRAP.endIteration" f="p0"
            :model-value="orbitTrapConfig.endIteration" @update:model-value="(v: number) => setOrbitTrapNumber('endIteration', v)" />
            <DenseToggle :label="t('settings.palettes.orbitTrap.colorInterior')"
              :model-value="orbitTrapConfig.includeInterior"
              @update:model-value="(v: boolean) => setOrbitTrapBoolean('includeInterior', v)" />
          </template>
          </template>
        </div>
        <p v-if="orbitTrapConfig.mode === 'sampled' || orbitTrapConfig.mode === 'exact'" class="orbit-trap-note">
          {{ t('settings.palettes.orbitTrap.previewNote') }}
        </p>
      </DenseSection>

      <DenseSection group="params" :hue="25" v-show="paletteTab === 'material'" :title="t('settings.palettes.surface.title')" initially-collapsed :scope="t('settings.palettes.surface.scope')" icon='<path d=&quot;M3 17l5-6 4 4 5-7 4 5&quot;/><path d=&quot;M3 21h18&quot;/>'>
        <div class="fields">
          <DenseField :label="t('settings.palettes.surface.reliefDepth')" :min="0" :max="2" :step="0.01" :default="1" f="p2"
            :model-value="model.reliefDepth ?? 1" @update:model-value="(v: number) => model.reliefDepth = v" />
          <DenseField :label="t('settings.palettes.surface.protrusionPhase')" :min="0" :max="1" :step="0.001" :default="0" f="p3"
            :model-value="model.protrusionPhase ?? 0" @update:model-value="(v: number) => model.protrusionPhase = v" />
          <DenseField :label="t('settings.palettes.surface.protrusionSharpness')" :min="0.25" :max="16" :step="0.05" :default="2" f="p2"
            :model-value="model.protrusionSharpness ?? 2" @update:model-value="(v: number) => model.protrusionSharpness = v" />
          <DenseField :label="t('settings.palettes.surface.protrusionStrength')" :min="1" :max="4" :step="0.01" :default="1" f="p2"
            :model-value="model.protrusionStrength ?? 1" @update:model-value="(v: number) => model.protrusionStrength = v" />
          <DenseField :label="t('settings.palettes.surface.protrusionGeometry')" :min="0" :max="1" :step="0.01" :default="0" f="p2"
            :model-value="model.protrusionGeometryMix ?? 0" @update:model-value="(v: number) => model.protrusionGeometryMix = v" />
          <DenseField :label="t('settings.palettes.surface.geometricPeriod')" :min="0.1" :max="16" :step="0.05" :default="1" f="p2"
            :model-value="model.protrusionPeriod ?? 1" @update:model-value="(v: number) => model.protrusionPeriod = v" />
          <DenseField :label="t('settings.palettes.surface.lightDirection')" :min="0" :max="6.283" :step="0.01" :default="3.927" :f="radFmt"
            :model-value="model.lightAngle ?? 3.927" @update:model-value="(v: number) => model.lightAngle = v" />
          <DenseField :label="t('settings.palettes.surface.microBump')" :min="0" :max="2" :step="0.01" :default="0" f="p2"
            :model-value="model.microBumpStrength ?? 0" @update:model-value="(v: number) => model.microBumpStrength = v" />
          <DenseField :label="t('settings.palettes.surface.localShadows')" :min="0" :max="10" :step="0.01" :default="0" f="p2"
            :model-value="model.localShadowStrength ?? 0" @update:model-value="(v: number) => model.localShadowStrength = v" />
          <DenseField :label="t('settings.palettes.surface.ambientOcclusion')" :min="0" :max="10" :step="0.01" :default="0" f="p2"
            :model-value="model.ambientOcclusionStrength ?? 0" @update:model-value="(v: number) => model.ambientOcclusionStrength = v" />
          <DenseField :label="t('settings.palettes.surface.varnish')" :min="0" :max="100" :step="0.05" :default="0" f="p2"
            :model-value="model.varnishStrength ?? 1" @update:model-value="(v: number) => model.varnishStrength = v" />
          <DenseField :label="t('settings.palettes.surface.contrast')" :min="0.5" :max="2" :step="0.01" :default="1.18" f="p2"
            :model-value="model.gradeContrast ?? 1.18" @update:model-value="(v: number) => model.gradeContrast = v" />
          <DenseField :label="t('settings.palettes.surface.saturation')" :min="0" :max="2" :step="0.01" :default="1.12" f="p2"
            :model-value="model.gradeSaturation ?? 1.12" @update:model-value="(v: number) => model.gradeSaturation = v" />
        </div>
      </DenseSection>

      <DenseSection group="params" :hue="230" v-show="paletteTab === 'color'" :title="t('settings.palettes.colorSpace.title')" :scope="t('settings.palettes.colorSpace.scope')" icon='<circle cx=&quot;12&quot; cy=&quot;12&quot; r=&quot;9&quot;/><path d=&quot;M12 3a9 9 0 000 18&quot;/>'>
        <DenseSeg
          :label="t('settings.palettes.colorSpace.interpolation')"
          :options="interpolationModes.map(m => ({ label: m.label, value: m.key }))"
          :model-value="model.interpolationMode"
          @update:model-value="(v: string | number) => model.interpolationMode = v as InterpolationMode"
        />
        <div class="transfer">
          <button class="mini-btn" @click="negatePalette" :title="t('settings.palettes.colorSpace.negateRgb')">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none"/></svg>
            {{ t('settings.palettes.colorSpace.negateRgb') }}
          </button>
        </div>
        <div class="fields">
          <DenseField :label="t('settings.palettes.colorSpace.hue')" :min="-180" :max="180" :step="1" :default="0" :f="degFmt"
            :model-value="hslHueShift" @update:model-value="onHslHueInput" />
          <DenseField :label="t('settings.palettes.colorSpace.saturation')" :min="-100" :max="100" :step="1" :default="0" f="p0"
            :model-value="satShift" @update:model-value="onSatInput" />
          <DenseField :label="t('settings.palettes.colorSpace.lightness')" :min="-100" :max="100" :step="1" :default="0" f="p0"
            :model-value="lumShift" @update:model-value="onLumInput" />
        </div>
      </DenseSection>

      <DenseSection group="params" :hue="175" v-show="paletteTab === 'texture'" :preview="currentSkyboxObj?.thumbnail" :title="t('settings.textures.environment.title')" initially-collapsed :scope="t('settings.textures.environment.scope')" icon='<circle cx=&quot;12&quot; cy=&quot;12&quot; r=&quot;9&quot;/><path d=&quot;M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z&quot;/>'>
      <p class="section-help">{{ t('settings.textures.environment.help') }}</p>
      <div class="grid texture-grid">
        <div v-for="tex in textures" :key="'skybox-card-' + tex.name" class="card texture-card" :class="{ sel: selectedSkyboxTexture === tex.name, unavailable: tex.unavailable }" @click="selectSkyboxFromDropdown(tex)">
          <span class="sel-badge">{{ t('settings.applied') }}</span>
          <img v-if="tex.thumbnail" :src="tex.thumbnail" :alt="t('settings.thumbnailAlt')" class="thumb" />
          <div v-else class="thumb thumb-empty"></div>
          <div class="info"><PresetActionsMenu v-if="!tex.guid?.startsWith('shared:')" :label="tex.name">
              <button type="button" :disabled="BUILT_IN_TEXTURE_NAMES.has(tex.name)" @click="toggleTextureFavorite(tex)">{{ tex.favorite ? t('common.removeFromFavorites') : t('common.addToFavorites') }}</button>
              <button v-if="isAdmin" type="button" :disabled="!canUploadTexture(tex)" @click="uploadTexture(tex)">{{ t('settings.publishToCatalog') }}</button>
              <button v-if="!BUILT_IN_TEXTURE_NAMES.has(tex.name) && canDeleteCatalogEntry(userRole, tex.remote)" type="button" class="danger" @click="deleteTextureByName(tex.name)">{{ t('settings.deleteEllipsis') }}</button>
            </PresetActionsMenu><span v-if="tex.favorite" class="favorite-marker" :aria-label="t('settings.favoriteMarker')">♥</span><div class="nm">{{ tex.name }}</div><div class="sub"><span>{{ tex.unavailable ? t('settings.textures.unavailable') : BUILT_IN_TEXTURE_NAMES.has(tex.name) ? t('settings.textures.environment.builtIn') : t('settings.textures.environment.saved') }}</span></div></div>
        </div>
        <div v-if="textures.length === 0" class="empty">{{ t('settings.textures.environment.empty') }}</div>
      </div>
      <div class="transfer texture-transfer">
        <button class="tbtn primary" @click="triggerImportSkybox"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5 5 5-5"/><path d="M5 3h14"/></svg>{{ t('settings.textures.importImage') }}</button>
        <button class="tbtn danger" @click="deleteSkyboxTexture" :disabled="!skyboxName || BUILT_IN_TEXTURE_NAMES.has(skyboxName)"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>{{ t('settings.textures.deleteSelected') }}</button>
        <input ref="skyboxFileInput" type="file" accept="image/*" style="display:none;" @change="importSkyboxTexture" />
      </div>
      </DenseSection>

      <DenseSection group="params" :hue="175" v-show="paletteTab === 'texture'" :preview="currentTextureObj?.thumbnail" :title="t('settings.textures.images.title')" initially-collapsed :scope="t('settings.textures.images.scope')" icon='<rect x=&quot;3&quot; y=&quot;5&quot; width=&quot;18&quot; height=&quot;14&quot; rx=&quot;2&quot;/><circle cx=&quot;9&quot; cy=&quot;10&quot; r=&quot;2&quot;/><path d=&quot;M21 15l-5-5-11 9&quot;/>'>
      <p class="section-help">{{ t('settings.textures.images.help') }}</p>
      <div class="grid texture-grid">
        <div v-for="tex in textures" :key="tex.name" class="card texture-card" :class="{ sel: selectedTexture === tex.name, unavailable: tex.unavailable }" @click="selectTextureFromDropdown(tex)">
          <span class="sel-badge">{{ t('settings.applied') }}</span>
          <img v-if="tex.thumbnail" :src="tex.thumbnail" :alt="t('settings.thumbnailAlt')" class="thumb" />
          <div v-else class="thumb thumb-empty"></div>
          <div class="info"><PresetActionsMenu v-if="!tex.guid?.startsWith('shared:')" :label="tex.name">
              <button type="button" :disabled="BUILT_IN_TEXTURE_NAMES.has(tex.name)" @click="toggleTextureFavorite(tex)">{{ tex.favorite ? t('common.removeFromFavorites') : t('common.addToFavorites') }}</button>
              <button v-if="isAdmin" type="button" :disabled="!canUploadTexture(tex)" @click="uploadTexture(tex)">{{ t('settings.publishToCatalog') }}</button>
              <button v-if="!BUILT_IN_TEXTURE_NAMES.has(tex.name) && canDeleteCatalogEntry(userRole, tex.remote)" type="button" class="danger" @click="deleteTextureByName(tex.name)">{{ t('settings.deleteEllipsis') }}</button>
            </PresetActionsMenu><span v-if="tex.favorite" class="favorite-marker" :aria-label="t('settings.favoriteMarker')">♥</span><div class="nm">{{ tex.name }}</div><div class="sub"><span>{{ tex.unavailable ? t('settings.textures.unavailable') : BUILT_IN_TEXTURE_NAMES.has(tex.name) ? t('settings.textures.images.builtIn') : t('settings.textures.images.saved') }}</span></div></div>
        </div>
        <div v-if="textures.length === 0" class="empty">{{ t('settings.textures.images.empty') }}</div>
      </div>
      <div class="transfer texture-transfer">
        <button class="tbtn primary" @click="triggerImportTexture"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5 5 5-5"/><path d="M5 3h14"/></svg>{{ t('settings.textures.importImage') }}</button>
        <button class="tbtn danger" @click="deleteTexture" :disabled="!textureName || BUILT_IN_TEXTURE_NAMES.has(textureName)"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>{{ t('settings.textures.deleteSelected') }}</button>
        <input ref="textureFileInput" type="file" accept="image/*" style="display:none;" @change="importTexture" />
      </div>
      </DenseSection>

      <DenseSection group="params" :hue="175" v-show="paletteTab === 'texture'" :title="t('settings.textures.mapping.title')" :scope="t('settings.textures.mapping.scope')" icon='<rect x=&quot;3&quot; y=&quot;5&quot; width=&quot;18&quot; height=&quot;14&quot; rx=&quot;2&quot;/><path d=&quot;M3 15l5-4 4 3 4-5 5 6&quot;/>'>
        <div class="fields">
          <DenseField :label="t('settings.textures.mapping.imageScale')" :min="0.1" :max="10" :step="0.1" :default="1" f="p1"
            :model-value="model.tessellationLevel ?? 1" @update:model-value="(v: number) => model.tessellationLevel = v" />
          <DenseField :label="t('settings.textures.mapping.displacement')" :min="0" :max="0.1" :step="0.001" :default="0" :f="imgDispFmt"
            :model-value="model.displacementAmount ?? 0" @update:model-value="(v: number) => model.displacementAmount = v" />
        </div>

        <div class="fields">
          <DenseSelect :label="t('settings.textures.mapping.mappingX')"
            :options="textureVariableOptions"
            :model-value="textureMappingXVariable" @update:model-value="(v: string | number) => textureMappingXVariable = v as typeof textureMappingXVariable" />
          <DenseField :label="t('settings.textures.mapping.scaleX')" :min="Math.log10(TEXTURE_MAPPING_SCALE_MIN)" :max="Math.log10(TEXTURE_MAPPING_SCALE_MAX)" :step="0.01" :default="0" :f="xScaleFmt"
            :model-value="textureMappingXScaleSlider" @update:model-value="(v: number) => textureMappingXScaleSlider = v" />
          <DenseSelect :label="t('settings.textures.mapping.mappingY')"
            :options="textureVariableOptions"
            :model-value="textureMappingYVariable" @update:model-value="(v: string | number) => textureMappingYVariable = v as typeof textureMappingYVariable" />
          <DenseField :label="t('settings.textures.mapping.scaleY')" :min="Math.log10(TEXTURE_MAPPING_SCALE_MIN)" :max="Math.log10(TEXTURE_MAPPING_SCALE_MAX)" :step="0.01" :default="0" :f="yScaleFmt"
            :model-value="textureMappingYScaleSlider" @update:model-value="(v: number) => textureMappingYScaleSlider = v" />
        </div>

        <DenseToggle :label="t('settings.textures.mapping.mirrorTexture')"
          :model-value="textureMappingMirror" @update:model-value="(v: boolean) => textureMappingMirror = v" />

        <DenseSelect
          :label="t('settings.textures.mapping.mappingPreset')"
          :options="mappingSelectOptions"
          :model-value="activeTextureMappingLabel"
          @update:model-value="onSelectMappingPreset"
        />
        <DenseLinkedChip v-if="mappingLink.origin.value" :kind="t('settings.textures.mapping.kind')" :name="mappingLink.origin.value.name" :dirty="mappingLink.dirty.value" :locked="mappingLink.locked.value" :busy="mappingLinkBusy" :suspend-shortcuts="props.suspendShortcuts"
          @update="updateLinkedMapping" @rename="renameLinkedMapping" @detach="detachMapping" @variant="saveMappingVariant" />
        <div class="save-row">
          <input class="txt-in" v-model="textureMappingPresetName" type="text" :placeholder="mappingLink.origin.value ? t('settings.saveCopyAs') : t('settings.textures.mapping.namePlaceholder')"
            @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
            @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
            @keyup.enter="saveTextureMappingPreset"
          />
          <button class="mini-btn primary" @click="saveTextureMappingPreset"><svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H5z"/><path d="M9 3v5h7V3M8 21v-7h8v7"/></svg>{{ t('common.save') }}</button>
        </div>
        <div v-if="activeMappingPreset && !activeMappingPreset.builtIn && canDeleteCatalogEntry(userRole, activeMappingPreset.remote)" class="transfer">
          <button class="mini-btn danger" @click="deleteTextureMappingPreset(activeMappingPreset)"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>{{ t('common.delete') }}</button>
        </div>
      </DenseSection>

      <!-- ============ 2. RENDER MAPPING ============ -->
      <DenseSection
        :title="t('settings.palettes.iterations.title')" group="params" v-show="paletteTab === 'color'" initially-collapsed
        :scope="t('settings.palettes.iterations.scope')"
        icon='<rect x=&quot;4&quot; y=&quot;4&quot; width=&quot;16&quot; height=&quot;16&quot; rx=&quot;2&quot;/><path d=&quot;M4 12h16M12 4v16&quot;/>'
      >
        <div class="fields">
          <DenseField
            :label="t('settings.palettes.iterations.stripeFrequency')" :min="1" :max="32" :step="1" :default="8"
            f="p0"
            :model-value="model.stripeFrequency ?? 8"
            @update:model-value="(v: number) => model.stripeFrequency = v"
          />
        </div>
      </DenseSection>


      <DenseSection group="library" :hue="300" :title="t('settings.palettes.saved.title')" :scope="t('settings.palettes.saved.scope')" icon='<path d=&quot;M4 19V5a2 2 0 012-2h3v18H6a2 2 0 01-2-2zM9 3h5v18H9zM17 4l4 16-3 1-4-16z&quot;/>'>
      <p class="section-help">{{ t('settings.palettes.saved.help') }}</p>
      <div class="lib-bar">
        <button class="fav-filter" :class="{ on: showOnlyFavoritePalettes }" type="button" :aria-pressed="showOnlyFavoritePalettes" @click="showOnlyFavoritePalettes = !showOnlyFavoritePalettes">
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
          {{ t('common.favorites') }}
        </button>
        <span class="count">{{ visiblePalettes.length }} {{ t('settings.palettes.saved.paletteUnit', visiblePalettes.length) }}</span>
      </div>
      <div class="grid palette-library-grid saved-palette-grid">
        <div v-for="palette in visiblePalettes" :key="palette.name" class="card palette-card" :class="{ sel: selectedPalette === palette.name }" @click="selectPaletteFromDropdown(palette)">
          <span class="sel-badge">{{ t('settings.applied') }}</span>
          <img v-if="palette.thumbnail" :src="palette.thumbnail" :alt="t('settings.thumbnailAlt')" class="thumb palette-thumb" />
          <div v-else class="thumb thumb-empty palette-thumb"></div>
          <div class="info"><PresetActionsMenu :label="palette.name">
              <button type="button" @click="togglePaletteFavorite(palette.name)">{{ palette.favorite ? t('common.removeFromFavorites') : t('common.addToFavorites') }}</button>
              <button v-if="isAdmin" type="button" @click="exportPaletteByName(palette.name)">{{ t('settings.exportEllipsis') }}</button>
              <button v-if="isAdmin" type="button" @click="uploadPalettePreset(palette)">{{ t('settings.publishToCatalog') }}</button>
              <button v-if="canDeleteCatalogEntry(userRole, palette.remote)" type="button" class="danger" @click="deletePaletteByName(palette.name)">{{ t('settings.deleteEllipsis') }}</button>
            </PresetActionsMenu><span v-if="palette.favorite" class="favorite-marker" :aria-label="t('settings.favoriteMarker')">♥</span><div v-if="displayName(palette.name)" class="nm">{{ displayName(palette.name) }}</div><div class="sub"><span>{{ formatPresetDate(palette.date) }}</span></div></div>
        </div>
        <div v-if="visiblePalettes.length === 0" class="empty">{{ showOnlyFavoritePalettes ? t('settings.palettes.saved.emptyFavorites') : t('settings.palettes.saved.empty') }}</div>
      </div>
      <div class="save-row palette-save-row">
        <input class="txt-in" v-model="paletteName" type="text" :placeholder="paletteLink.origin.value ? t('settings.saveCopyAs') : t('settings.palettes.saved.savePaletteAs')"
          @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
          @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
          @keyup.enter="savePalette"
        />
        <button class="save-btn" @click="savePalette"><svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H5z"/><path d="M9 3v5h7V3M8 21v-7h8v7"/></svg>{{ t('common.save') }}</button>
      </div>
      </DenseSection>

      <DenseSection group="library" :hue="300" :title="t('settings.palettes.full.title')" :scope="t('settings.palettes.full.scope')" icon='<rect x=&quot;4&quot; y=&quot;4&quot; width=&quot;16&quot; height=&quot;16&quot; rx=&quot;2&quot;/><path d=&quot;M4 12h16M12 4v16&quot;/>'>
      <p class="section-help">{{ t('settings.palettes.full.help') }}</p>
      <div class="lib-bar">
        <button class="fav-filter" :class="{ on: showOnlyFavoritePalettePresets }" type="button" :aria-pressed="showOnlyFavoritePalettePresets" @click="showOnlyFavoritePalettePresets = !showOnlyFavoritePalettePresets">
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
          {{ t('common.favorites') }}
        </button>
        <span class="count">
          {{ visiblePalettePresets.length }}<template v-if="showOnlyFavoritePalettePresets"> / {{ presets.length }}</template>
          {{ t('settings.presets.presetUnit', visiblePalettePresets.length === 1 && !showOnlyFavoritePalettePresets ? 1 : 2) }}
        </span>
      </div>
      <div class="grid palette-library-grid full-preset-grid">
        <div v-for="preset in visiblePalettePresets" :key="preset.id" class="card" :class="{ sel: selectedPalettePreset === preset.id }" @click="selectPalettePresetFromDropdown(preset)">
          <span class="sel-badge">{{ t('settings.applied') }}</span>
          <img v-if="preset.thumbnail" :src="preset.thumbnail" :alt="t('settings.thumbnailAlt')" class="thumb" />
          <div v-else class="thumb thumb-empty"></div>
          <div class="info"><PresetActionsMenu :label="preset.name">
              <button type="button" :disabled="shareBusy" @click="copyPresetLink(preset.id)">{{ t('common.copyLink') }}</button>
              <button type="button" @click="togglePresetFavorite(preset.id)">{{ preset.favorite ? t('common.removeFromFavorites') : t('common.addToFavorites') }}</button>
              <button v-if="canOverwriteCatalogPayload(userRole, preset.remote)" type="button" @click="renameSceneCard(preset)">{{ t('settings.renameEllipsis') }}</button>
              <button type="button" @click="duplicateSceneCard(preset)">{{ t('common.duplicate') }}</button>
              <button v-if="isAdmin" type="button" @click="exportPresetById(preset.id)">{{ t('settings.exportEllipsis') }}</button>
              <button v-if="isAdmin" type="button" @click="uploadCompletePreset(preset.id)">{{ isUploadSuccess(uploadSuccessKey('preset', preset.id)) ? t('settings.catalogUpdated') : t('settings.publishToCatalog') }}</button>
              <button v-if="canDeleteCatalogEntry(userRole, preset.remote)" type="button" class="danger" @click="deletePresetById(preset.id)">{{ t('settings.deleteEllipsis') }}</button>
            </PresetActionsMenu>
            <span v-if="preset.favorite" class="favorite-marker" :aria-label="t('settings.favoriteMarker')">♥</span>
            <div v-if="displayName(preset.name)" class="nm">{{ displayName(preset.name) }}</div>
            <div class="sub"><span>{{ formatPresetDate(preset.date) }}</span><span v-if="preset.scaleExponent > 0" class="depth">{{ formatZoom(preset.scaleExponent) }}</span></div>
          </div>
        </div>
        <div v-if="visiblePalettePresets.length === 0" class="empty">{{ showOnlyFavoritePalettePresets ? t('settings.palettes.full.emptyFavorites') : t('settings.palettes.full.empty') }}</div>
      </div>
      </DenseSection>

      <DenseSection v-if="isAdmin" group="library" :hue="300" :title="t('settings.transfer.title')" initially-collapsed :scope="t('settings.transfer.scope')" icon='<path d=&quot;M12 3v12M7 10l5 5 5-5M5 21h14&quot;/>'>
      <div class="transfer">
        <button class="tbtn primary" @click="triggerImportPalettes"><svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5 5 5-5"/><path d="M5 3h14"/></svg>{{ t('common.import') }}</button>
        <button class="tbtn" @click="exportPalettes" :disabled="palettes.length === 0"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>{{ t('settings.exportAll') }}</button>
        <button class="tbtn" @click="exportSelectedPalette" :disabled="!selectedPalette"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>{{ t('settings.exportSelection') }}</button>
        <button class="tbtn" @click="exportFavoritePalettes" :disabled="favoritePalettes.length === 0"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9z"/></svg>{{ t('settings.exportFavorites') }}</button>
        <input ref="paletteFileInput" type="file" accept=".json" multiple style="display:none;" @change="importPalettes" />
      </div>
      </DenseSection>

      </div>
    </div>

    <div v-else-if="activeTab === 'performance'" class="graphics-tab sections">
      <DenseSection :title="t('settings.performance.display.title')">
        <DenseToggle
          :label="t('settings.performance.display.hdr')"
          :model-value="props.outputDiagnostics?.hdrRequested ?? false"
          :disabled="!props.outputDiagnostics || props.hdrDisplayDisabled"
          :desc="t('settings.performance.display.hdrDesc')"
          @update:model-value="emit('toggle-hdr-display')"
        />
        <template v-if="props.outputDiagnostics">
          <p class="panel-note" role="status">
            {{ t('settings.performance.display.surface') }} {{ props.outputDiagnostics.toneMapping === 'extended' ? 'HDR' : 'SDR' }} ·
            {{ props.outputDiagnostics.format === 'rgba16float' ? t('settings.performance.display.float16') : t('settings.performance.display.bits8') }}
          </p>
          <details class="display-diagnostics">
            <summary>{{ t('settings.performance.display.diagnostics') }}</summary>
            <p>{{ t('settings.performance.display.hdrCapable', { value: props.outputDiagnostics.hdrCapable ? t('common.yes') : t('common.no') }) }}</p>
            <p>{{ t('settings.performance.display.surfaceLine', { format: props.outputDiagnostics.format, colorSpace: props.outputDiagnostics.colorSpace }) }}</p>
            <p>{{ t('settings.performance.display.presentation', { mode: props.outputDiagnostics.toneMapping === 'extended' ? t('settings.performance.display.hdrExtended') : t('settings.performance.display.sdrStandard') }) }}</p>
            <p>{{ t('settings.performance.display.dithering', { value: props.outputDiagnostics.dithering }) }}</p>
            <p class="panel-note">{{ t('settings.performance.display.capabilityNote') }}</p>
          </details>
        </template>
        <p v-else class="panel-note">{{ t('settings.performance.display.preparing') }}</p>
      </DenseSection>
      <DenseSection :title="t('settings.performance.quality.title')">
        <div class="fields"><DenseSelect
            :label="t('settings.performance.quality.dpr')"
            :options="resolutionOptions"
            :model-value="nearestPreset(model.dprMultiplier ?? 1, RESOLUTION_PRESETS)"
            @update:model-value="(v) => model.dprMultiplier = Number(v)"
          />
<DenseField
            :label="t('settings.performance.quality.targetFps')" :min="10" :max="60" :step="1" :default="60"
            :f="fpsFmt"
            :model-value="model.targetFps ?? 60"
            @update:model-value="(v: number) => model.targetFps = v"
          />
<DenseSelect
            :label="t('settings.performance.quality.aa')"
            :options="aaSampleOptions"
            :model-value="nearestPreset(model.antialiasLevel ?? 1, AA_SAMPLE_PRESETS)"
            @update:model-value="(v) => model.antialiasLevel = Number(v)"
          />
<DenseSelect
            :label="t('settings.performance.quality.swap')"
            :options="zoomThresholdOptions"
            :model-value="nearestPreset(model.zoomMagnificationThreshold ?? 16, ZOOM_THRESHOLD_PRESETS)"
            @update:model-value="(v) => model.zoomMagnificationThreshold = Number(v)"
          />
<DenseToggle
            :label="t('settings.performance.quality.aaAuto')"
            :model-value="!!model.aaAuto"
            @update:model-value="(v: boolean) => model.aaAuto = v"
          /></div>
        <p v-if="model.activateAnimate && model.aaAuto" class="panel-note">{{ t('settings.performance.quality.aaPaused') }}</p>
        <p v-else-if="(model.antialiasLevel ?? 1) <= 1" class="panel-note">{{ t('settings.performance.quality.aaHint') }}</p>
        <p class="panel-note">{{ t('settings.performance.quality.swapNote') }}</p>
      </DenseSection>
      <DenseSection :title="t('settings.performance.advanced.title')" initially-collapsed>
        <div class="fields"><DenseField
            :label="t('settings.performance.advanced.precisionReserve')" :min="1" :max="1000" :step="1" :default="30"
            :f="precisionBudgetFmt"
            :model-value="precisionBudgetExp"
            @update:model-value="(v: number) => precisionBudgetExp = v"
          />
<DenseField
            :label="t('settings.performance.advanced.iterationBudget')" :min="-2" :max="2" :step="0.01" :default="0"
            :f="iterationsFmt"
            :model-value="maxIterMultSlider"
            @update:model-value="(v: number) => maxIterMultSlider = v"
          />
<DenseToggle
            :label="t('settings.performance.advanced.aaAdaptive')" :default="true"
            :model-value="model.aaAdaptive !== false"
            @update:model-value="(v: boolean) => model.aaAdaptive = v"
          /></div>
        <DenseSelect :label="t('settings.performance.advanced.algorithm')" :options="calculationOptions" :model-value="kernelApproximationMode(model.approximationMode ?? 'bla')" @update:model-value="(v) => model.approximationMode = v as ApproximationMode" />
        <p v-if="orbitTrapConfig.mode === 'exact'" class="panel-note">{{ t('settings.performance.advanced.orbitTrapExactNote') }}</p>
        <div v-else-if="model.approximationMode !== 'perturbation'" class="fields"><DenseField
            :label="t('settings.performance.advanced.approxTolerance')" :min="-12" :max="-4" :step="1" :default="-3"
            :f="radiusFmt"
            :model-value="blaEpsilonExp"
            @update:model-value="(v: number) => blaEpsilonExp = v"
          /></div>
        <p class="panel-note">{{ t('settings.performance.advanced.precisionNote') }}</p>
      </DenseSection>
    </div>
  </div>
</template>

<style scoped>
.orbit-trap-note {
  margin: 0.35rem 0 0;
  color: color-mix(in srgb, currentColor 68%, transparent);
  font-size: 0.72rem;
  line-height: 1.35;
}

.mb-3 {
  margin-bottom: 1.2em;
}
.math-display {
  color: #000;
  font-family: 'STIX Two Math', 'Cambria Math', 'Latin Modern Math', 'Times New Roman', serif;
  font-size: 1.15em;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 0.3em;
}
.math-i {
  color: #000;
  font-style: italic;
  margin: 0 0.1em;
}
.compact-label {
  font-weight: bold;
  margin-bottom: 0.2em;
}
.compact-input, .compact-select {
  font-size: 0.9em;
}
.preview-mandelbrot-thumb img {
  margin-top: 0.1em;
  margin-bottom: 0.1em;
  border: 1px solid #bbb;
}
.section-sep {
  border: none;
  border-top: 1px solid #B8B8B8;
  margin: 0.9em 0 0.75em 0;
}
.toggle-buttons {
  flex-wrap: wrap;
  gap: 0.4em;
}
.compact-buttons {
  margin-bottom: 0.45em;
}
.toggle-buttons .button {
  margin-bottom: 0 !important;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

/* ── Force light text across all tabs for dark mode ── */
:deep(.label),
:deep(.checkbox),
:deep(.help),
:deep(.control-label),
:deep(.title),
:deep(.subtitle),
:deep(.dropdown-item) {
  color: var(--ink) !important;
}

:deep(.dropdown-content) {
  background-color: var(--panel-2) !important;
  border: 1px solid var(--line) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
}

:deep(.dropdown-item:hover),
:deep(.dropdown-item.is-active) {
  background-color: var(--row-on) !important;
  color: var(--ink) !important;
}

.settings-container {
  font-family: var(--sans);
  color: var(--ink);
}

/* Custom slider styling matching the model */
:deep(input[type=range]) {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: var(--track) !important;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
}
:deep(input[type=range]::-webkit-slider-thumb) {
  -webkit-appearance: none;
  width: var(--thumb);
  height: var(--thumb);
  border-radius: 50%;
  background: var(--accent-bright) !important;
  border: 3px solid var(--bg-0) !important;
  box-shadow: 0 0 0 1px var(--accent), 0 4px 12px -2px var(--accent) !important;
  cursor: pointer;
  transition: .12s;
}
:deep(input[type=range]::-webkit-slider-thumb:hover) {
  transform: scale(1.12);
}
:deep(input[type=range]::-moz-range-thumb) {
  width: var(--thumb);
  height: var(--thumb);
  border-radius: 50%;
  background: var(--accent-bright) !important;
  border: 3px solid var(--bg-0) !important;
  box-shadow: 0 0 0 1px var(--accent) !important;
  cursor: pointer;
}

/* Custom dark styling for standard controls */
:deep(.input) {
  background-color: var(--bg-0) !important;
  border: 1px solid var(--line) !important;
  color: var(--ink) !important;
  border-radius: 10px !important;
}
:deep(.input:focus) {
  border-color: var(--accent) !important;
  box-shadow: none !important;
}

:deep(.select select) {
  appearance: none !important;
  -webkit-appearance: none !important;
  width: 100%;
  font-family: var(--mono) !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  color: var(--ink) !important;
  background: var(--bg-0) !important;
  border: 1px solid var(--line) !important;
  border-radius: 10px !important;
  padding: 8px 34px 8px 14px !important;
  cursor: pointer;
  text-transform: lowercase !important;
}
:deep(.select::after) {
  border-right: 2px solid var(--ink-3) !important;
  border-bottom: 2px solid var(--ink-3) !important;
  border-left: 0 !important;
  border-top: 0 !important;
  content: "" !important;
  display: block !important;
  height: 7px !important;
  margin-top: -6px !important;
  position: absolute !important;
  right: 14px !important;
  top: 50% !important;
  transform: rotate(45deg) !important;
  transform-origin: center !important;
  width: 7px !important;
  pointer-events: none !important;
  z-index: 4 !important;
}
:deep(.select select:focus) {
  border-color: var(--accent) !important;
  outline: none !important;
}

:deep(.button) {
  background-color: var(--row) !important;
  border: 1px solid var(--line) !important;
  color: var(--ink-2) !important;
  font-family: var(--sans) !important;
  font-weight: 600 !important;
  border-radius: 11px !important;
  transition: .16s !important;
}
:deep(.button:hover) {
  color: var(--ink) !important;
  background-color: var(--panel-2) !important;
  border-color: var(--line) !important;
}
:deep(.button.is-link) {
  background-color: var(--accent) !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 8px 22px -10px var(--accent) !important;
}
:deep(.button.is-link:hover) {
  background-color: var(--accent-bright) !important;
}
:deep(.button.is-warning) {
  background-color: var(--magenta) !important;
  color: #fff !important;
  border: none !important;
}
:deep(.button.is-danger) {
  background-color: oklch(0.60 0.18 20) !important;
  color: #fff !important;
  border: none !important;
}

/* Invert HR */
:deep(.section-sep) {
  border-top: 1px solid var(--line) !important;
}

/* ── Graphics tab layout ── */
.graphics-tab {
  color: var(--ink);
}
.animation-tab {
  color: var(--ink);
  min-width: 0;
}

/* ---------- Playback ---------- */
.playback {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--row);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 16px;
  margin-bottom: 20px;
}
.play-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  border-radius: 11px;
  background: var(--accent);
  color: #fff;
  border: none;
  cursor: pointer;
  font-family: var(--sans);
  font-weight: 700;
  font-size: var(--font-lg);
  letter-spacing: .02em;
  transition: .16s;
  box-shadow: 0 8px 22px -10px var(--accent);
}
.play-btn:hover {
  background: var(--accent-bright);
}
.play-btn.paused {
  background: var(--row-on);
  color: var(--ink);
  box-shadow: none;
  border: 1px solid var(--line);
}
.play-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}
.pb-label {
  font-family: var(--sans);
  font-weight: 600;
  font-size: 14px;
  color: var(--ink-2);
  white-space: nowrap;
}
.pb-slider {
  flex: 1;
  display: flex;
  align-items: center;
}
.pb-slider input[type="range"] {
  width: 100%;
}
.pb-val {
  font-family: var(--mono);
  font-size: 14px;
  color: var(--accent);
  font-weight: 700;
  min-width: 50px;
  text-align: right;
}
.compact-library {
  margin-top: 0.55em;
  margin-bottom: 0.8em;
}
.palette-library-label {
  display: block;
  font-size: 0.86em;
  font-weight: 600;
  color: var(--ink-2);
  margin-bottom: 0.32em;
}
.palette-library-hint {
  font-size: 0.8em;
  color: var(--ink-3);
  margin-bottom: 0.45em;
  line-height: 1.25;
}

.mixer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row {
  display: grid;
  grid-template-columns: 248px 124px 1fr 1fr;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 11px;
  position: relative;
  transition: .18s;
}
.row::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-top-left-radius: 11px;
  border-bottom-left-radius: 11px;
  background: transparent;
  transition: .18s;
}
.row.on {
  background: var(--row-on);
  border-color: #2b3340;
}
.row.on::before {
  background: var(--accent-bright);
  box-shadow: 0 0 12px var(--accent);
}
.row.off .ctl {
  opacity: 0.4;
  pointer-events: none;
}
.row.off .name {
  color: var(--ink-3);
}

/* toggle + name */
.name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.toggle {
  --w: 38px;
  --h: 22px;
  width: var(--w);
  height: var(--h);
  flex: none;
  border-radius: 999px;
  background: var(--track);
  border: 1px solid var(--line);
  position: relative;
  cursor: pointer;
  transition: .18s;
}
.toggle::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: .18s;
}
.toggle.on {
  background: var(--accent);
  border-color: var(--accent);
}
.toggle.on::after {
  left: 18px;
  background: #fff;
}
.name {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* waveform select */
.wave {
  position: relative;
}
.wave select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  background: var(--bg-0);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 30px 6px 12px;
  cursor: pointer;
  text-transform: lowercase;
}
.wave::after {
  content: "";
  position: absolute;
  right: 13px;
  top: 50%;
  transform: translateY(-60%) rotate(45deg);
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--ink-3);
  border-bottom: 2px solid var(--ink-3);
  pointer-events: none;
}
.wave select:focus {
  outline: none;
  border-color: var(--accent);
}

/* param group: label / slider / value */
.param {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.param .plabel {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--ink-3);
  width: 46px;
}
.param .pval {
  font-family: var(--mono);
  font-weight: 700;
  font-size: var(--font-md);
  color: var(--ink);
  min-width: 88px;
  text-align: right;
  white-space: nowrap;
}
.param .pval .unit {
  font-size: 12px;
  color: var(--ink-3);
  margin-left: 3px;
  font-weight: 600;
}

/* ---------- Section title ---------- */
.gfx-section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 20px 0 16px;
}
.gfx-section-title::before {
  content: "";
  width: 6px;
  height: 14px;
  border-radius: 3px;
  background: linear-gradient(180deg, var(--accent-bright), var(--mauve));
  display: inline-block;
}
.gfx-section-title::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line-soft);
}

.gfx-hint {
  font-size: 0.82em;
  color: var(--ink-2);
  margin-bottom: 0.45em;
  line-height: 1.3;
}
.palette-canvas-panel {
  --palette-label-width: var(--label-w);
}
.palette-strip-zone {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  margin: 8px 0 16px;
}
.palette-strip-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  margin: 0 0 10px !important;
}
.palette-strip-bar .color-picker-row {
  flex: 1 1 auto;
  min-width: 0;
}
.palette-strip-bar .picker-hint {
  color: var(--ink-3);
  font-size: 13px;
}
.palette-strip-bar .outils-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.stop-scope-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: var(--row);
  padding: 2px;
}
.scope-btn {
  border: 0 !important;
  border-radius: 8px !important;
  min-width: 92px;
  height: 30px;
  line-height: 30px;
  font-size: 13px !important;
  font-weight: 600;
  color: var(--ink-2) !important;
  background: transparent !important;
  transition: .15s;
}
.scope-btn:hover {
  color: var(--ink) !important;
  background: var(--row-on) !important;
}
.scope-btn.is-active {
  color: #fff !important;
  background: var(--accent) !important;
  box-shadow: 0 2px 8px -2px var(--accent) !important;
}
.scope-btn.is-active:hover {
  background: var(--accent-bright) !important;
}
.stop-quickbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  padding: 8px 10px;
  margin-bottom: 10px;
}
.stop-quickbar .swatch {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
}
.quickbar-lab {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-3);
  flex: 0 0 auto;
  white-space: nowrap;
}
.quickbar-hex {
  font-family: var(--mono);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink);
  flex: 0 0 auto;
  margin-right: 4px;
}
.stop-quickbar .col-plus,
.stop-quickbar .col-clr {
  flex: 0 0 auto;
}
.quickbar-preset-select {
  flex: 1 1 160px;
  min-width: 140px;
  height: 34px;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  background: var(--bg-0);
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 0 10px;
  cursor: pointer;
}
.quickbar-preset-select:focus {
  outline: none;
  border-color: var(--accent);
}
.palette-strip {
  margin-bottom: 0 !important;
  overflow: hidden;
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  background: #07080d;
}
.palette-canvas-panel .pipette-btn {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  padding: 0 !important;
  border-radius: 9px !important;
  border: 1px solid var(--line) !important;
  background: var(--row-on) !important;
  color: var(--ink-2) !important;
}
.palette-canvas-panel .outils-btn.button {
  height: 34px;
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  padding: 0 12px !important;
  border-radius: 9px !important;
  border: 1px solid var(--line) !important;
  background: var(--row-on) !important;
  color: var(--ink-2) !important;
  font-size: 12px !important;
  font-weight: 600;
  white-space: nowrap;
}
.palette-canvas-panel .pipette-btn:hover,
.palette-canvas-panel .outils-btn.button:hover {
  color: var(--ink) !important;
  border-color: #333a47 !important;
}
.palette-canvas-panel .pipette-btn.is-active {
  background: var(--accent) !important;
  color: #fff !important;
  border-color: var(--accent) !important;
}
.gfx-slider-row,
.palette-control-row {
  display: grid;
  grid-template-columns: var(--palette-label-width) minmax(0, 1fr) var(--value-w);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-1) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-1);
}
.gfx-slider-row input[type="range"],
.palette-control-row input[type="range"] {
  min-width: 0;
}
.gfx-slider-label,
.palette-control-label {
  font-size: var(--font-md);
  color: var(--ink);
  font-weight: 600;
  line-height: 1.2;
}
.gfx-slider-label .l1,
.palette-control-label .l1,
.palette-compact-label .l1 {
  display: block;
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}
.gfx-slider-label .l2,
.palette-control-label .l2,
.palette-compact-label .l2 {
  display: block;
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
  line-height: 1.3;
}
.gfx-slider-value,
.palette-control-value {
  text-align: right;
  font-family: var(--mono);
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.palette-subtabs {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 18px;
}
/* Canvas-style subtab pills (canvas/Palettes Panel — .subtab) */
.palette-subtab-button.button {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  font-family: var(--sans);
  font-weight: 600;
  font-size: var(--font-md);
  color: var(--ink-2);
  background: var(--row);
  border: 1px solid var(--line-soft);
  transition: 0.15s;
}
.palette-subtab-button.button.is-light:hover {
  color: var(--ink);
  background: var(--row-on);
}
.palette-subtab-button.button.is-link {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  box-shadow: 0 6px 18px -8px var(--accent);
}
.palette-top-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}
.palette-icon-toggle {
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  height: auto;
  padding: var(--space-3) var(--space-4) !important;
  font-size: var(--font-lg);
  border-radius: var(--radius-md) !important;
  border-color: var(--line-soft) !important;
  color: var(--ink) !important;
  background: var(--row) !important;
}
.palette-icon-toggle.is-active {
  border-color: var(--accent) !important;
  color: #fff !important;
  background: var(--accent) !important;
}
.palette-compact-control {
  display: grid;
  grid-template-columns: var(--palette-label-width) minmax(0, 1fr) var(--value-w);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-1) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-1);
  min-width: 0;
}
.palette-compact-control input[type="range"] {
  min-width: 0;
}
.palette-compact-label {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}
.palette-compact-value {
  font-family: var(--mono);
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
@media (max-width: 520px) {
  .palette-subtabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .gfx-slider-row,
  .palette-control-row,
  .palette-compact-control {
    grid-template-columns: 1fr 82px;
  }
  .gfx-slider-label,
  .palette-control-label,
  .palette-compact-label {
    grid-column: 1 / -1;
  }
}
.palette-button-group {
  flex: 1 1 auto;
  min-width: 0;
  margin-bottom: 0 !important;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  background: var(--row);
  border: 1px solid var(--line);
  border-radius: 10px;
}
.palette-button-group .control {
  margin: 0 !important;
}
.palette-button-group .button {
  border: 0 !important;
  border-radius: 7px !important;
  background: transparent !important;
  color: var(--ink-3) !important;
  box-shadow: none !important;
  font-family: var(--sans) !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  padding: 8px 12px !important;
  height: auto !important;
}
.palette-button-group .button:hover {
  color: var(--ink-2) !important;
}
.palette-button-group .button.is-link {
  background: var(--accent-soft) !important;
  color: var(--accent-bright) !important;
  box-shadow: 0 0 0 1px oklch(0.7 0.17 245 / 0.5) inset !important;
}

/* ---------- Favorites ---------- */
.favorite-row {
  position: relative;
  padding-right: 5.7em !important;
}
.favorite-row.has-delete {
  padding-right: 7.7em !important;
}
.favorite-row.has-delete .favorite-button {
  right: 3.05em;
}
.favorite-row.has-delete .favorite-button.upload-button {
  right: 5.4em;
}
.favorite-button {
  position: absolute;
  top: 50%;
  right: 0.7em;
  width: 1.9em;
  height: 1.9em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  cursor: pointer;
  z-index: 2;
}
.favorite-button.upload-button {
  right: 3.05em;
}
.delete-preset-button {
  position: absolute;
  top: 50%;
  right: 0.7em;
  width: 1.9em;
  height: 1.9em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  cursor: pointer;
  z-index: 2;
}
.delete-preset-button .favorite-heart {
  color: #fff;
}
.delete-preset-button:hover .favorite-heart {
  color: #ff3860;
}
.favorite-button.upload-button.is-remote .favorite-heart,
.favorite-button.upload-button.is-remote:hover .favorite-heart {
  color: #4fb7ff;
}
.favorite-button.upload-button.is-remote::after {
  content: "✓";
  position: absolute;
  right: 0.12em;
  bottom: 0.05em;
  width: 0.95em;
  height: 0.95em;
  border-radius: 999px;
  background: #27c46a;
  color: #fff;
  font-size: 0.62em;
  font-weight: 800;
  line-height: 0.95em;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
.favorite-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.favorite-heart {
  font-size: 1.35em;
  line-height: 1;
  color: #fff;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.85));
}
.favorite-button.is-favorite {
  color: #ec3d7a;
}
.favorite-button:hover {
  color: #ec3d7a;
}
.favorite-button.is-favorite .favorite-heart,
.favorite-button:hover .favorite-heart {
  color: #ec3d7a;
}
.favorite-button.is-upload-success .favorite-heart,
.favorite-button.is-upload-success:hover .favorite-heart {
  color: #27c46a;
}
.favorite-filter {
  margin-bottom: 0.55em;
  gap: 0.35em;
  color: var(--ink-3);
  border-color: var(--line) !important;
  background-color: var(--row) !important;
}
.favorite-filter.is-active {
  border-color: #ec3d7a !important;
  color: #ec3d7a !important;
}
.favorite-filter-heart {
  line-height: 1;
  color: inherit;
}
/* ── Palette preview toolbar styles ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5em;
  flex-wrap: wrap;
}
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.outils-bar {
  display: flex;
  gap: 0.2em;
}
.outils-btn {
  font-size: 0.72em !important;
  padding: 0.2em 0.5em !important;
  min-width: 0 !important;
}

.canvas-row {
  display: flex;
  justify-content: center;
  overflow: visible;
  position: relative;
  height: 56px;
  border-radius: var(--radius-md);
}
/* tighter margin under the palette preview strip (overrides generic .mb-3) */
.canvas-row.palette-strip.mb-3 {
  margin-bottom: var(--space-3);
}
.palette-strip-fill {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-md);
  background-size: 100% 100%;
  background-repeat: no-repeat;
  border: 1px solid var(--line);
  z-index: 1;
}
.canvas-shadow-overlay {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  pointer-events: none;
  box-shadow: 0 8px 26px -12px #000 inset, 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  z-index: 2;
}
.handles-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}
.floating-delete-btn {
  position: absolute;
  top: -24px;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel-2);
  color: oklch(0.70 0.18 20);
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 20;
  line-height: 1;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.floating-delete-btn:hover {
  border-color: oklch(0.60 0.18 20);
  background: oklch(0.60 0.18 20);
  color: #fff;
  box-shadow: 0 3px 8px rgba(195, 68, 68, 0.32);
  transform: translateX(-50%) translateY(-1px);
}
.pipette-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--row);
  color: var(--ink);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
.pipette-btn:hover {
  background: var(--panel-2);
  border-color: var(--ink-3);
}
.pipette-btn.is-active {
  background: oklch(0.60 0.18 20);
  border-color: oklch(0.60 0.18 20);
  color: #fff;
}
.picker-hint {
  font-size: 0.82em;
  color: oklch(0.60 0.18 20);
  font-weight: 500;
  white-space: nowrap;
}

/* =========================================================================
   Canvas design system — shared by Navigation, Presets & Palettes panels
   (mockups: canvas/Navigation Panel.html, Presets Panel.html, Palettes Panel)
   ========================================================================= */
.cv-body {
  font-family: var(--sans);
  color: var(--ink);
}

/* section label with gradient tick */
.cv-body .section-label {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--font-md);
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: var(--space-5) 0 var(--space-1);
}
.cv-body .section-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line-soft);
}
.cv-body .section-label .tick {
  width: 6px;
  height: 14px;
  border-radius: 3px;
  flex: none;
  background: linear-gradient(180deg, var(--accent-bright), var(--mauve));
}
.cv-body .section-label:first-child {
  margin-top: 0;
}
.cv-body .section-help {
  font-size: var(--font-md);
  color: var(--ink-3);
  margin: 2px 0 var(--space-3);
  line-height: 1.4;
}

/* generic row : [label+sub] [control] [value] */
.cv-body .frow {
  display: grid;
  grid-template-columns: var(--label-w) 1fr 92px;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-1) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-1);
}
.cv-body .frow .lab .l1 {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}
.cv-body .frow .lab .l2 {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
  line-height: 1.3;
}
.cv-body .frow .val,
.cv-body .coords .val {
  font-family: var(--mono);
  font-weight: 700;
  font-size: var(--font-md);
  color: var(--ink);
  text-align: right;
  white-space: nowrap;
}
.cv-body .frow .val .unit {
  font-size: 11px;
  color: var(--ink-3);
  margin-left: 2px;
}

/* coordinates: one full-width line per value (CoordinateField) */
.cv-body .coord-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 2px 0 var(--gap, 5px);
}
.cv-body .coord-title { font-size: var(--font-md); font-weight: 600; }
.cv-body .coord-copy-all { display: inline-flex; align-items: center; gap: 6px; }
.cv-body .coord-copy-all svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2; }
.cv-body .coord-copy-all.ok { color: var(--accent-bright); }
.cv-body .coord-lines { display: flex; flex-direction: column; gap: var(--gap, 5px); margin-bottom: var(--gap, 5px); }
.cv-body .fine-decade { cursor: default; font-size: 11px; }

/* coordinates card */
.cv-body .coords {
  display: grid;
  grid-template-columns: var(--label-w) 1fr auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}
.cv-body .coords .lab .l1 {
  font-size: var(--font-md);
  font-weight: 600;
}
.cv-body .coords .lab .l2 {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}
.cv-body .coords .vals {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.cv-body .coords .vals .cline {
  display: flex;
  gap: 10px;
  white-space: nowrap;
  overflow: hidden;
}
.cv-body .coords .vals .ax {
  color: var(--ink-4);
  flex: none;
  width: 24px;
}
.cv-body .coords .vals .num {
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink);
}
.cv-body .coords .vals .cline .coord-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  color: var(--ink);
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 600;
  padding: 4px 8px;
  min-width: 0;
  width: 100%;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, background-color 0.2s;
}
.cv-body .coords .vals .cline .coord-input:focus {
  border-color: var(--accent);
  background: rgba(0, 0, 0, 0.45);
}
.cv-body .copy {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--row-on);
  color: var(--ink-2);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: 0.15s;
  flex: none;
}
.cv-body .copy:hover {
  color: var(--ink);
  border-color: #333a47;
}
.cv-body .copy svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.8;
}
.cv-body .copy.ok {
  color: oklch(0.78 0.16 150);
  border-color: oklch(0.5 0.13 150 / 0.5);
}

/* sliders */
.cv-body input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: var(--track);
  border-radius: 999px;
  outline: none;
  cursor: pointer;
}
.cv-body input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: var(--thumb);
  height: var(--thumb);
  border-radius: 50%;
  background: var(--accent-bright);
  border: 3px solid var(--bg-0);
  box-shadow: 0 0 0 1px var(--accent), 0 4px 12px -2px var(--accent);
  cursor: pointer;
  transition: 0.12s;
}
.cv-body input[type=range]::-webkit-slider-thumb:hover {
  transform: scale(1.12);
}
.cv-body input[type=range]::-moz-range-thumb {
  width: var(--thumb);
  height: var(--thumb);
  border-radius: 50%;
  background: var(--accent-bright);
  border: 3px solid var(--bg-0);
  box-shadow: 0 0 0 1px var(--accent);
  cursor: pointer;
}

/* mu : slider + quick button */
.cv-body .mu-ctl {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cv-body .mu-ctl input {
  flex: 1;
}
.cv-body .mu-row {
  display: flex;
  align-items: center;
  gap: var(--gap, 5px);
  margin-bottom: var(--gap, 5px);
}
.cv-body .mu-row .fld {
  flex: 1 1 auto;
}
.cv-body .mu-quick {
  flex: none;
  background: var(--bg-0);
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--accent-bright);
  font-family: var(--mono);
  font-size: 12.5px;
  font-weight: 700;
  padding: 4px 10px;
  cursor: pointer;
  transition: 0.15s;
}
.cv-body .mu-quick:hover {
  background: var(--row-on);
  color: var(--ink);
}

/* toggle switch */
.cv-body .toggle {
  width: 46px;
  height: 26px;
  flex: none;
  border-radius: 999px;
  background: var(--track);
  border: 1px solid var(--line);
  position: relative;
  cursor: pointer;
  transition: 0.18s;
}
.cv-body .toggle::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #8a91a1;
  transition: 0.18s;
}
.cv-body .toggle.on {
  background: var(--accent);
  border-color: var(--accent);
}
.cv-body .toggle.on::after {
  left: 22px;
  background: #fff;
}
.cv-body .trow {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}
.cv-body .trow .lab {
  flex: 1;
}
.cv-body .trow .lab .l1 {
  font-size: var(--font-md);
  font-weight: 600;
}
.cv-body .trow .lab .l2 {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}
.cv-body .crow {
  display: grid;
  grid-template-columns: var(--label-w) 1fr;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}
.cv-body .crow .lab .l1 {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}
.cv-body .crow .lab .l2 {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
  line-height: 1.3;
}
.cv-body .crow .ctl {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.cv-body .seg {
  display: inline-flex;
  gap: 4px;
  background: var(--row);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 4px;
  flex-wrap: wrap;
}
.cv-body .seg button {
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  transition: 0.15s;
}
.cv-body .seg button:hover {
  color: var(--ink-2);
}
.cv-body .seg button.on {
  background: var(--accent-soft);
  color: var(--accent-bright);
  box-shadow: 0 0 0 1px oklch(0.7 0.17 245 / 0.5) inset;
}
.cv-body .select-box {
  position: relative;
  flex: 1;
  min-width: 0;
}
.cv-body .select-box select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  font-family: var(--mono);
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--ink);
  background: var(--bg-0);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: var(--space-2) 36px var(--space-2) var(--space-4);
  cursor: pointer;
}
.cv-body .select-box::after {
  content: "";
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-60%) rotate(45deg);
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--ink-3);
  border-bottom: 2px solid var(--ink-3);
  pointer-events: none;
}
.cv-body .select-box select:focus {
  outline: none;
  border-color: var(--accent);
}

/* library row : favorites filter + preset picker */
.cv-body .lib-row {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}
.cv-body .lib-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.cv-body .count {
  font-family: var(--mono);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-3);
  margin-left: auto;
}
.cv-body .fav-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 0 16px;
  border-radius: 12px;
  cursor: pointer;
  background: var(--row);
  border: 1px solid var(--line-soft);
  color: var(--ink-2);
  font-family: var(--sans);
  font-weight: 600;
  font-size: 14px;
  transition: 0.15s;
}
.cv-body .lib-bar .fav-filter {
  padding: 10px 16px;
  border-radius: 11px;
}
.cv-body .fav-filter svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.9;
}
.cv-body .fav-filter:hover {
  color: var(--ink);
}
.cv-body .fav-filter.on {
  color: var(--mauve-bright);
  border-color: oklch(0.7 0.17 320 / 0.5);
  background: oklch(0.7 0.17 320 / 0.12);
}
.cv-body .fav-filter.on svg {
  fill: currentColor;
}

/* preset picker (rich dropdown styled as canvas select) */
.cv-body .cv-dropdown {
  position: relative;
  flex: 1;
  min-width: 0;
}
.cv-body .cv-dropdown .dropdown-trigger {
  width: 100%;
}
.cv-body .cv-select-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  font-family: var(--sans);
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--ink);
  background: var(--bg-0);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: var(--space-3) 40px var(--space-3) var(--space-4);
  cursor: pointer;
  position: relative;
  text-align: left;
}
.cv-body .cv-select-trigger:focus {
  outline: none;
  border-color: var(--accent);
}
.cv-body .cv-trigger-thumb {
  height: 30px;
  width: 52px;
  object-fit: cover;
  border-radius: 5px;
  background: #222;
  flex: none;
}
.cv-body .cv-trigger-label {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cv-body .cv-caret {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-60%) rotate(45deg);
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--ink-3);
  border-bottom: 2px solid var(--ink-3);
  pointer-events: none;
}
.cv-body .cv-dropdown-content {
  max-height: 450px;
  overflow-y: auto;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 12px;
}

/* navigation preset actions */
.cv-body .nav-preset-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-bottom: 4px;
}
.cv-body .load-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid oklch(0.7 0.17 245 / 0.4);
  background: var(--accent-soft);
  color: var(--accent-bright);
  font-family: var(--sans);
  font-weight: 700;
  font-size: var(--font-lg);
  cursor: pointer;
  transition: 0.15s;
  margin-bottom: 0;
}
.cv-body .load-btn:hover {
  background: oklch(0.7 0.17 245 / 0.28);
}
.cv-body .load-btn svg {
  width: 17px;
  height: 17px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}
.cv-body .load-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.cv-body .preset-link-btn {
  justify-content: center;
  min-width: 138px;
  padding: 0 14px;
}
.cv-body .preset-link-btn.copied {
  color: oklch(0.8 0.17 155);
  border-color: oklch(0.72 0.17 155 / 0.55);
  background: oklch(0.72 0.17 155 / 0.12);
}
.cv-body .preset-link-btn:disabled {
  opacity: 0.42;
  cursor: default;
}
.cv-body .load-note {
  font-size: 12px;
  color: var(--ink-3);
  text-align: center;
  margin: 0 0 12px;
}

/* transfer group */
.cv-body .transfer {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
}
.cv-body .transfer .tlab {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
  flex: none;
  margin-right: 4px;
}
.cv-body .tbtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 15px;
  border-radius: 9px;
  cursor: pointer;
  font-family: var(--sans);
  font-weight: 600;
  font-size: 13.5px;
  transition: 0.15s;
  background: var(--row-on);
  color: var(--ink-2);
  border: 1px solid var(--line);
}
.cv-body .tbtn:hover {
  color: var(--ink);
  border-color: #333a47;
}
.cv-body .tbtn svg {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}
.cv-body .tbtn.primary {
  background: linear-gradient(110deg, var(--accent), var(--mauve));
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 18px -8px var(--mauve);
}
.cv-body .tbtn.primary:hover {
  filter: brightness(1.1);
}
.cv-body .tbtn:disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}
.cv-body .find-minibrot-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0 4px;
  flex-wrap: wrap;
}
.cv-body .find-minibrot-status {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--ink-2);
}
.cv-body .tbtn.danger {
  margin-left: auto;
  color: var(--red);
  border-color: oklch(0.5 0.15 25 / 0.5);
  background: oklch(0.45 0.18 25 / 0.12);
}
.cv-body .tbtn.danger:hover {
  background: oklch(0.5 0.2 25 / 0.22);
  color: oklch(0.72 0.22 25);
}

/* save current view */
.cv-body .save-row {
  display: flex;
  gap: 10px;
}
.cv-body .txt-in {
  flex: 1;
  font-family: var(--sans);
  font-size: var(--font-lg);
  color: var(--ink);
  background: var(--bg-0);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
}
.cv-body .txt-in::placeholder {
  color: var(--ink-4);
}
.cv-body .txt-in:focus {
  outline: none;
  border-color: var(--accent);
}
.cv-body .save-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: none;
  padding: 0 22px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0) 45%),
    linear-gradient(110deg, var(--accent), var(--mauve));
  color: #fff;
  font-family: var(--sans);
  font-weight: 700;
  font-size: var(--font-lg);
  cursor: pointer;
  box-shadow: 0 8px 22px -10px var(--mauve);
  transition: 0.15s;
}
.cv-body .save-btn:hover {
  filter: brightness(1.08);
}
.cv-body .save-btn svg {
  width: 17px;
  height: 17px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}

/* preset card grid — responsive auto-fill (no fixed column count) */
.cv-body .grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--gallery-min), 1fr));
  gap: var(--space-2);
  max-height: 436px;
  overflow-y: auto;
  padding: 2px 6px 2px 2px;
  overscroll-behavior: contain;
}
.cv-body .grid::-webkit-scrollbar {
  width: 8px;
}
.cv-body .grid::-webkit-scrollbar-thumb {
  background: #2a2f3b;
  border-radius: 8px;
}
.cv-body .grid::-webkit-scrollbar-track {
  background: transparent;
}
.cv-body .card {
  position: relative;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 13px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.cv-body .card:hover {
  border-color: #333a47;
  transform: translateY(-2px);
}
.cv-body .card.sel {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), 0 10px 30px -14px var(--accent);
}
.cv-body .card .thumb {
  width: 100%;
  aspect-ratio: 16 / 10;
  display: block;
  background: #000;
  object-fit: cover;
}
.cv-body .card .thumb-empty {
  background: linear-gradient(135deg, #14171f, #0c0e14);
}
.cv-body .card .info {
  padding: 10px 12px 11px;
}
.cv-body .card .nm {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cv-body .card .sub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
  font-size: 12px;
  color: var(--ink-3);
}
.cv-body .card .depth {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-bright);
  background: var(--accent-soft);
  border-radius: 5px;
  padding: 1px 6px;
}
.cv-body .acts {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transform: translateY(-3px);
  transition: 0.15s;
}
.cv-body .card:hover .acts {
  opacity: 1;
  transform: none;
}
.cv-body .abtn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(8, 10, 15, 0.72);
  backdrop-filter: blur(8px);
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: 0.13s;
}
.cv-body .abtn svg {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}
.cv-body .abtn:hover {
  background: rgba(20, 24, 33, 0.9);
}
.cv-body .abtn:disabled {
  opacity: 0.42;
  cursor: default;
  pointer-events: none;
}
.cv-body .abtn.heart.faved {
  color: var(--mauve-bright);
  opacity: 1;
}
.cv-body .card .abtn.heart.faved {
  opacity: 1;
}
.cv-body .abtn.heart.faved svg {
  fill: currentColor;
}
.cv-body .abtn.del:hover {
  color: var(--red);
  border-color: oklch(0.5 0.15 25 / 0.6);
}
.cv-body .sel-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  background: var(--accent);
  border-radius: 6px;
  padding: 3px 8px;
  display: none;
  z-index: 1;
}
.cv-body .card.sel .sel-badge {
  display: block;
}
.cv-body .empty {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--ink-3);
  font-size: 14px;
  padding: 40px 0;
}
.cv-body .palette-library-grid,
.cv-body .texture-grid {
  margin-bottom: var(--space-2);
}
.cv-body .palette-thumb {
  aspect-ratio: 16 / 3;
}
.cv-body .saved-palette-grid {
  grid-template-columns: 1fr;
  gap: 1px;
}
.cv-body .saved-palette-grid .palette-card {
  display: grid;
  grid-template-columns: minmax(220px, 54%) minmax(0, 1fr);
  align-items: stretch;
  height: 38px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.cv-body .saved-palette-grid .palette-card:hover {
  transform: translateY(-1px);
}
.cv-body .saved-palette-grid .palette-thumb {
  width: 100%;
  height: 38px;
  aspect-ratio: auto;
  object-fit: cover;
  display: block;
}
.cv-body .saved-palette-grid .palette-card .info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: var(--space-1) 112px var(--space-1) var(--space-4);
}
.cv-body .saved-palette-grid .palette-card .acts {
  opacity: 1;
  transform: none;
  top: 50%;
  right: 10px;
  translate: 0 -50%;
}
.cv-body .full-preset-grid {
  /* denser cards → smaller min so more columns pack in */
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
}
.cv-body .full-preset-grid .card .thumb {
  aspect-ratio: 16 / 8;
}
.cv-body .full-preset-grid .card .info {
  padding: 8px 10px 9px;
}
.cv-body .full-preset-grid .card .nm {
  font-size: 13px;
}
.cv-body .full-preset-grid .card .sub {
  font-size: 11px;
}
.cv-body .texture-grid {
  max-height: 250px;
}
.cv-body .texture-card .thumb {
  aspect-ratio: 16 / 9;
}
.cv-body .mapping-thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 4;
  color: var(--accent-bright);
  font-size: 22px;
}
.cv-body .palette-save-row,
.cv-body .texture-save-row,
.cv-body .texture-transfer {
  margin-bottom: 14px;
}

@media (max-width: 720px) {
  /* .grid / .full-preset-grid reflow on their own via auto-fill minmax() */
  .cv-body .saved-palette-grid .palette-card {
    grid-template-columns: minmax(160px, 48%) minmax(0, 1fr);
  }
}
@media (max-width: 520px) {
  .cv-body .frow {
    grid-template-columns: 1fr 90px;
  }
  .cv-body .frow .lab {
    grid-column: 1 / -1;
  }
  .cv-body .coords {
    grid-template-columns: 1fr auto;
  }
  .cv-body .coords .lab {
    grid-column: 1 / -1;
  }
  .cv-body .crow {
    grid-template-columns: 1fr;
  }
  .cv-body .saved-palette-grid {
    grid-template-columns: 1fr;
  }
  .cv-body .saved-palette-grid .palette-card {
    grid-template-columns: 1fr;
  }
  .cv-body .save-row {
    flex-direction: column;
  }
  .cv-body .transfer {
    flex-wrap: wrap;
  }
}
</style>

<style scoped>
.palette-strip-zone { display: flex; flex-direction: column; gap: 6px; padding: 7px; margin: 0 0 7px; border-radius: 8px; }
.palette-strip-zone .palette-strip { order: -1; height: 46px; min-height: 46px; margin: 4px 0 !important; }
.palette-strip-bar { gap: 5px; margin: 0 !important; }
.palette-strip-bar .color-picker-row { flex: 0 0 auto; }
.palette-strip-bar .outils-bar { display: flex; flex-wrap: wrap; gap: 5px; }
.palette-transform { position: relative; margin-left: auto; }
.palette-transform[open] { flex-basis: 100%; order: 4; }
.palette-transform summary { padding: 5px 7px; }
.stop-quickbar { display: flex; flex-wrap: wrap; gap: 6px; padding: 5px; min-width: 0; }
.stop-quickbar .quickbar-preset-select { width: 100%; min-width: 0; }
.palette-strip-zone .pins { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 5px; }
.palette-library .palette-strip-zone > :not(.palette-strip) { display: none; }
.palette-library .handles-overlay { display: none; }
.palette-library .palette-strip-zone { padding: 3px; }
.lib-bar { flex-wrap: wrap; gap: 6px; }
.lib-bar .gallery-search { flex: 1 1 180px; }
.lib-bar select { width: auto; }
.coords { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 6px; }
.coords .lab { display: none; }
.coords .vals { min-width: 0; }
.coord-input { width: 100%; min-width: 0; }
.coord-input:focus { font-size: 13px; }
.find-minibrot-row { flex-wrap: wrap; gap: 5px; margin: 6px 0; }
.save-row { display: flex; flex-wrap: wrap; gap: 5px; }
.save-row .txt-in { flex: 1 1 140px; min-width: 0; }
</style>

<style scoped>
.scope-select { width: 130px; flex: 0 1 130px; height: 32px; padding: 4px 7px; }
.palette-transform { margin-left: auto; }
.palette-strip-bar { flex-wrap: nowrap; }
.palette-transform[open] { position: absolute; z-index: 5; right: 12px; width: min(330px, calc(100% - 24px)); background: var(--panel-2); border: 1px solid var(--line); border-radius: 8px; padding: 8px; }
.point-presets-disclosure { border-bottom: 1px solid var(--line-soft); }
.point-presets-disclosure select { max-width: 100%; }
.cv-body .grid { max-height: none; overflow: visible; }
.cv-body .acts { position: static; opacity: 1; transform: none; pointer-events: auto; }
</style>

<style scoped>
.cv-body .scope-select { padding: 0 8px; height: 32px; font-size: 12px; line-height: normal; min-width: 0; }
.cv-body .lib-bar .txt-in { padding: 6px 9px; font-size: 12px; }
</style>

<style scoped>
.cv-body .saved-palette-grid .palette-card { display: flex; flex-direction: column; height: auto; min-width: 0; border-radius: 8px; }
.cv-body .saved-palette-grid .palette-card .palette-thumb { height: 36px; width: 100%; }
.cv-body .saved-palette-grid .palette-card .acts { position: static; translate: none; transform: none; padding: 3px; }
.cv-body .saved-palette-grid .palette-card .info { padding: 4px 6px; }
.cv-body .saved-palette-grid .palette-card .sub { display: none; }
</style>

<style scoped>
.display-diagnostics { margin-top: 6px; font-size: 11px; }
.display-diagnostics summary { cursor: pointer; opacity: .8; }
.display-diagnostics p { margin: 5px 0; overflow-wrap: anywhere; }
</style>

<style scoped>
.scene-share-row { padding: 8px 0; }
.scene-share-row p { margin: 6px 0 0; font-size: 12px; }
.share-error { color: #e47979; }
.favorite-marker { color: var(--accent, #e898a2); margin-right: 4px; font-size: 11px; }
.cv-body .card .info { min-height: 38px; }
</style>
