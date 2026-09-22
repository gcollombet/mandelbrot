<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MandelbrotParams } from "../Mandelbrot.ts";
import {
  ANIMATION_TRACK_DEFINITIONS,
  ANIMATION_TYPES,
  animationTrackDefinition,
  cloneAnimationConfig,
  normalizeAnimationConfig,
  type AnimationTrackId,
} from '../AnimationConfig';
import type { AnimationPresetRecord } from '../animationPresetStore';
import {
  deleteAnimationPresetEntry,
  getAllAnimationPresetEntries,
  saveAnimationPresetEntry,
} from '../animationPresetStore';
import type { UserRole } from '../authService';
import {
  canDeleteCatalogEntry,
  canOverwriteCatalogPayload,
} from '../catalogPermissions';
import { DenseField, DenseSection, DenseSelect, DenseLinkedChip, useLinkedRecord } from './dense';

const props = defineProps<{
  userRole: UserRole;
  isAdmin: boolean;
  uploadSuccessKeys: Set<string>;
  suspendShortcuts?: (suspend: boolean) => void;
}>();

const { t } = useI18n();

const model = defineModel<MandelbrotParams>({ required: true });

const emit = defineEmits<{
  (e: 'upload-preset', preset: AnimationPresetRecord): void;
}>();

const animationPresets = ref<AnimationPresetRecord[]>([]);
const animationPresetName = ref('');
const selectedAnimationPreset = ref('');
const showAnimationPresetDropdown = ref(false);
const showOnlyFavoriteAnimationPresets = ref(false);

const favoriteAnimationPresets = computed(() =>
  animationPresets.value.filter(p => p.favorite)
);

const visibleAnimationPresets = computed(() =>
  showOnlyFavoriteAnimationPresets.value
    ? favoriteAnimationPresets.value
    : animationPresets.value
);

function ensureAnimationConfig() {
  const current = model.value.animation;
  if (!current || !current.tracks || Object.keys(current.tracks).length < ANIMATION_TRACK_DEFINITIONS.length) {
    model.value.animation = normalizeAnimationConfig(current, model.value.animationSpeed);
    model.value.animationSpeed = model.value.animation.globalSpeed;
  }
}

function animationTrack(id: AnimationTrackId) {
  ensureAnimationConfig();
  return model.value.animation!.tracks[id];
}

function animationTrackLabel(id: AnimationTrackId): string {
  return animationTrackDefinition(id).label;
}

function animationTrackAmplitudeUnit(id: AnimationTrackId): string {
  return animationTrackDefinition(id).unit || '';
}

async function loadAnimationPresets() {
  animationPresets.value = await getAllAnimationPresetEntries();
}

defineExpose({refreshPresets: loadAnimationPresets});

async function saveAnimationPreset() {
  const name = animationPresetName.value.trim();
  if (!name) return;
  const existing = animationPresets.value.find(item => item.name === name);
  if (!canOverwriteCatalogPayload(props.userRole, existing?.remote)) {
    window.alert(t('animationPanel.alerts.cannotOverwriteShared'));
    return;
  }
  ensureAnimationConfig();
  const now = new Date().toISOString();
  await saveAnimationPresetEntry({
    guid: existing?.guid ?? crypto.randomUUID(),
    name,
    animation: cloneAnimationConfig(model.value.animation!),
    date: existing?.date ?? now,
    lastUpdated: now,
    favorite: existing?.favorite ?? false,
    remote: existing?.remote,
  });
  animationPresets.value = await getAllAnimationPresetEntries();
  const stored = animationPresets.value.find(p => existing ? p.guid === existing.guid : p.name === name) ?? animationPresets.value.find(p => p.name === name);
  selectedAnimationPreset.value = stored?.name ?? name;
  animationPresetName.value = '';
  if (stored) animationLink.link({ kind: 'animation', key: stored.guid ?? stored.name, name: stored.name, remote: stored.remote });
}

function selectAnimationPresetFromDropdown(preset: AnimationPresetRecord) {
  selectedAnimationPreset.value = preset.name;
  animationPresetName.value = preset.name;
  model.value.animation = cloneAnimationConfig(preset.animation);
  model.value.animationSpeed = model.value.animation.globalSpeed;
  showAnimationPresetDropdown.value = false;
  triggerAnimationUpdate();
  animationLink.link({ kind: 'animation', key: preset.guid ?? preset.name, name: preset.name, remote: preset.remote });
}

// ── Linked animation preset ──
const animationLink = useLinkedRecord('animation', () => model.value.animation ? normalizeAnimationConfig(cloneAnimationConfig(model.value.animation)) : null);
const animationLinkBusy = ref(false);

function linkedAnimationRecord(): AnimationPresetRecord | undefined {
  const key = animationLink.origin.value?.key;
  return animationPresets.value.find(p => (p.guid ?? p.name) === key);
}

async function updateLinkedAnimationPreset(): Promise<void> {
  const existing = linkedAnimationRecord();
  if (!existing || animationLinkBusy.value) return;
  animationLinkBusy.value = true;
  try {
    ensureAnimationConfig();
    await saveAnimationPresetEntry({ ...existing, animation: cloneAnimationConfig(model.value.animation!), lastUpdated: new Date().toISOString() });
    animationPresets.value = await getAllAnimationPresetEntries();
    animationLink.refresh();
  } catch (error) {
    console.warn('Failed to update linked animation preset:', error);
  } finally {
    animationLinkBusy.value = false;
  }
}

async function renameLinkedAnimationPreset(name: string): Promise<void> {
  const existing = linkedAnimationRecord();
  if (!existing || animationLinkBusy.value) return;
  animationLinkBusy.value = true;
  try {
    // Animation presets are keyed by name: write the renamed copy, then drop the old key.
    await saveAnimationPresetEntry({ ...existing, name, lastUpdated: new Date().toISOString() });
    animationPresets.value = await getAllAnimationPresetEntries();
    const stored = animationPresets.value.find(p => p.guid === existing.guid && p.name !== existing.name);
    if (stored) await deleteAnimationPresetEntry(existing.name);
    animationPresets.value = await getAllAnimationPresetEntries();
    const finalName = stored?.name ?? existing.name;
    selectedAnimationPreset.value = finalName;
    animationPresetName.value = finalName;
    animationLink.refresh({ name: finalName, key: stored?.guid ?? finalName });
  } finally {
    animationLinkBusy.value = false;
  }
}

function detachAnimationPreset(): void {
  animationLink.unlink();
  selectedAnimationPreset.value = '';
  animationPresetName.value = '';
}

async function saveAnimationPresetVariant(): Promise<void> {
  const origin = animationLink.origin.value;
  if (!origin) return;
  animationPresetName.value = t('animationPanel.variantName', { name: origin.name });
  await saveAnimationPreset();
}

async function toggleAnimationPresetFavorite(preset: AnimationPresetRecord): Promise<void> {
  const previous = preset.favorite ?? false;
  preset.favorite = !previous;
  try {
    await saveAnimationPresetEntry({ ...preset });
    animationPresets.value = await getAllAnimationPresetEntries();
  } catch (error) {
    preset.favorite = previous;
    console.warn('Failed to save animation preset favorite:', error);
  }
}

async function deleteAnimationPreset(preset: AnimationPresetRecord): Promise<void> {
  if (!canDeleteCatalogEntry(props.userRole, preset.remote)) {
    window.alert(t('animationPanel.alerts.cannotDeleteShared'));
    return;
  }
  if (!window.confirm(t('animationPanel.alerts.confirmDelete', { name: preset.name }))) return;
  await deleteAnimationPresetEntry(preset.name);
  animationPresets.value = await getAllAnimationPresetEntries();
  if (selectedAnimationPreset.value === preset.name) {
    selectedAnimationPreset.value = '';
    animationPresetName.value = '';
  }
}

function triggerAnimationUpdate() {
  if (model.value.animation) {
    model.value.animation = cloneAnimationConfig(model.value.animation);
  }
}

function uploadButtonClasses(preset: AnimationPresetRecord) {
  const key = `animation:${preset.guid}`;
  return {
    'is-upload-success': props.uploadSuccessKeys.has(key),
    'is-remote': !!preset.remote && !props.uploadSuccessKeys.has(key),
  };
}

function uploadButtonTitle(preset: AnimationPresetRecord): string {
  const key = `animation:${preset.guid}`;
  if (props.uploadSuccessKeys.has(key)) return t('animationPanel.upload.success');
  if (preset.remote) return t('animationPanel.upload.alreadyShared');
  return t('animationPanel.upload.toCatalog');
}

function uploadButtonIcon(preset: AnimationPresetRecord): string {
  const key = `animation:${preset.guid}`;
  return props.uploadSuccessKeys.has(key) ? 'fa-solid fa-check' : 'fa-solid fa-upload';
}

// ── Dense field wiring ──────────────────────────────────────────────
const waveOptions = ANIMATION_TYPES.map(t => ({ label: t, value: t }));

const speedFmt = (v: number) => '×' + v.toFixed(2);

function amplitudeFmt(id: AnimationTrackId) {
  const step = animationTrackDefinition(id).amplitudeStep;
  const decimals = step < 0.01 ? 3 : step < 0.1 ? 2 : 1;
  return (v: number) => v.toFixed(decimals);
}

function setGlobalSpeed(v: number) {
  ensureAnimationConfig();
  model.value.animation!.globalSpeed = v;
  model.value.animationSpeed = v;
  triggerAnimationUpdate();
}

function setTrackType(id: AnimationTrackId, v: string | number) {
  animationTrack(id).type = v as typeof ANIMATION_TYPES[number];
  triggerAnimationUpdate();
}

function setTrackSpeed(id: AnimationTrackId, v: number) {
  animationTrack(id).speed = v;
  triggerAnimationUpdate();
}

function setTrackAmplitude(id: AnimationTrackId, v: number) {
  animationTrack(id).amplitude = v;
  triggerAnimationUpdate();
}

function toggleTrack(id: AnimationTrackId) {
  const t = animationTrack(id);
  t.enabled = !t.enabled;
  triggerAnimationUpdate();
}

const TRACK_LABEL_IDS = [
  'paletteOffset', 'heightPaletteShift', 'lightAngle', 'textureDrift', 'skyReflectionDrift', 'phaseColoring',
  'varnish', 'microBump', 'displacement', 'tessellation', 'protrusionPhase', 'reliefDepth',
  'orbitTrapPhaseOffset', 'orbitTrapStrength', 'gradeSaturation', 'gradeContrast', 'palettePathOffset',
] as const;
const trackLabels = computed<Record<string, string>>(() =>
  Object.fromEntries(TRACK_LABEL_IDS.map(id => [id, t(`animationPanel.tracks.${id}`)])));
const visibleAnimationPresetCount = computed(() => visibleAnimationPresets.value.length);

onMounted(() => {
  ensureAnimationConfig();
  loadAnimationPresets();
});

watch(
  () => model.value.animation,
  () => {
    ensureAnimationConfig();
  },
  { immediate: true }
);
</script>

<template>
  <div class="sections" v-if="model.animation">

        <!-- ═══ Mixer ═══ -->
        <DenseSection
          :title="t('animationPanel.mixer.title')"
          :scope="t('animationPanel.mixer.scope')"
          icon='<path d=&quot;M4 12q4-7 8 0t8 0&quot;/><path d=&quot;M4 17h16&quot;/>'
        >
          <div class="fields">
            <DenseField
              :label="t('animationPanel.mixer.globalSpeed')"
              :min="0" :max="5" :step="0.05" :default="1"
              :f="speedFmt"
              :model-value="model.animation.globalSpeed"
              @update:model-value="setGlobalSpeed"
            />
          </div>
          <div class="mixgrid">
            <div
              v-for="track in ANIMATION_TRACK_DEFINITIONS"
              :key="track.id"
              class="mixcell"
              :class="{ off: !model.animation.tracks[track.id].enabled }"
            >
              <div class="mc-head">
                <span
                  class="tog"
                  :class="{ on: model.animation.tracks[track.id].enabled }"
                  role="switch"
                  :aria-label="animationTrackLabel(track.id)"
                  :aria-checked="model.animation.tracks[track.id].enabled"
                  tabindex="0"
                  @click="toggleTrack(track.id)"
                  @keydown.space.prevent="toggleTrack(track.id)"
                  @keydown.enter.prevent="toggleTrack(track.id)"
                ></span>
                <span class="mc-name">{{ trackLabels[track.id] ?? animationTrackLabel(track.id) }}</span>
                <DenseSelect
                  v-if="model.animation.tracks[track.id].enabled" class="mc-wave"
                  :options="waveOptions"
                  :model-value="model.animation.tracks[track.id].type"
                  @update:model-value="(v) => setTrackType(track.id, v)"
                />
              </div>
              <div v-if="model.animation.tracks[track.id].enabled" class="mc-fields">
                <DenseField
                  :label="t('animationPanel.mixer.speed')"
                  :min="0" :max="5" :step="0.05" :default="track.defaultSpeed"
                  :f="speedFmt"
                  :model-value="model.animation.tracks[track.id].speed"
                  @update:model-value="(v) => setTrackSpeed(track.id, v)"
                />
                <DenseField
                  :label="t('animationPanel.mixer.amplitude')"
                  :min="track.minAmplitude" :max="track.maxAmplitude" :step="track.amplitudeStep" :default="track.defaultAmplitude"
                  :f="amplitudeFmt(track.id)"
                  :unit="animationTrackAmplitudeUnit(track.id)"
                  :model-value="model.animation.tracks[track.id].amplitude"
                  @update:model-value="(v) => setTrackAmplitude(track.id, v)"
                />
              </div>
            </div>
          </div>
        </DenseSection>

        <!-- ═══ Préréglages ═══ -->
        <DenseSection
          :title="t('animationPanel.presets.title')" initially-collapsed
          :scope="t('animationPanel.presets.scope')"
          icon='<rect x=&quot;5&quot; y=&quot;3&quot; width=&quot;14&quot; height=&quot;18&quot; rx=&quot;2&quot;/><path d=&quot;M9 3v5h7V3M8 21v-7h8v7&quot;/>'
        >
          <div class="lib-bar2">
            <button
              class="mini-btn favf"
              :class="{ on: showOnlyFavoriteAnimationPresets }"
              type="button"
              :aria-pressed="showOnlyFavoriteAnimationPresets"
              @click="showOnlyFavoriteAnimationPresets = !showOnlyFavoriteAnimationPresets"
            >
              <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
              {{ t('common.favorites') }}
            </button>
            <span class="lib-count">{{ t('animationPanel.presets.count', { count: visibleAnimationPresetCount }, visibleAnimationPresetCount) }}</span>
          </div>

          <div class="anim-preset-list">
            <div
              v-for="preset in visibleAnimationPresets"
              :key="preset.guid"
              class="anim-preset-row"
              :class="{ sel: selectedAnimationPreset === preset.name }"
              @click="selectAnimationPresetFromDropdown(preset)"
            >
              <button
                v-if="props.isAdmin"
                class="iconbtn"
                :class="uploadButtonClasses(preset)"
                type="button"
                :title="uploadButtonTitle(preset)"
                :aria-label="uploadButtonTitle(preset)"
                @click.stop="emit('upload-preset', preset)"
              >
                <i :class="uploadButtonIcon(preset)"></i>
              </button>
              <button
                class="iconbtn favf"
                :class="{ on: preset.favorite }"
                type="button"
                :title="preset.favorite ? t('common.removeFromFavorites') : t('common.addToFavorites')"
                :aria-pressed="!!preset.favorite"
                @click.stop="toggleAnimationPresetFavorite(preset)"
              >
                <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
              </button>
              <span class="ap-name">{{ preset.name }}</span>
              <button
                v-if="canDeleteCatalogEntry(props.userRole, preset.remote)"
                class="iconbtn danger"
                type="button"
                :title="t('animationPanel.presets.delete')"
                :aria-label="t('animationPanel.presets.delete')"
                @click.stop="deleteAnimationPreset(preset)"
              >
                <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>
              </button>
            </div>
          </div>

          <DenseLinkedChip v-if="animationLink.origin.value" :kind="t('animationPanel.presets.kind')" :name="animationLink.origin.value.name" :dirty="animationLink.dirty.value" :locked="animationLink.locked.value" :busy="animationLinkBusy" :suspend-shortcuts="props.suspendShortcuts"
            @update="updateLinkedAnimationPreset" @rename="renameLinkedAnimationPreset" @detach="detachAnimationPreset" @variant="saveAnimationPresetVariant" />
          <div class="save-row">
            <input
              class="txt-in"
              v-model="animationPresetName"
              type="text"
              :placeholder="animationLink.origin.value ? t('animationPanel.presets.saveCopyAs') : t('animationPanel.presets.namePlaceholder')"
              @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
              @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
              @keyup.enter="saveAnimationPreset"
            />
            <button class="mini-btn primary" type="button" @click="saveAnimationPreset">
              <svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H5z"/><path d="M9 3v5h7V3M8 21v-7h8v7"/></svg>
              {{ t('common.save') }}
            </button>
          </div>
        </DenseSection>

  </div>
</template>


<style scoped>
/* ── Mixer cells ────────────────────────────────────────────── */
.mixgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
}
.mixcell {
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 11px;
  padding: 8px 9px 9px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mc-head { display: flex; align-items: center; gap: 9px; }
.mc-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mixcell.off .mc-name { color: var(--ink-3); }
.mixcell.off .mc-fields { opacity: .38; pointer-events: none; }
.mc-wave { flex: none; width: 92px; min-width: 0; }
.mc-fields { display: flex; flex-direction: column; gap: 5px; transition: opacity .15s; }
/* the wave select inside the head sheds its row chrome */
.mc-wave :deep(.fld) {
  height: auto;
  padding: 0;
  background: transparent;
  border: none;
  overflow: visible;
}
.mc-wave :deep(.selbox) { margin-left: 0; min-width: 0; width: 100%; }

/* ── Préréglages library ────────────────────────────────────── */
.lib-bar2 { display: flex; align-items: center; gap: 9px; margin-bottom: 9px; }
.lib-count {
  margin-left: auto;
  font-family: var(--mono);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-3);
}
.mini-btn.favf.on {
  color: oklch(.74 .15 322);
  border-color: oklch(.7 .15 322 / .5);
  background: oklch(.7 .15 322 / .12);
}
.mini-btn.favf.on svg { fill: currentColor; }

.anim-preset-list { display: flex; flex-direction: column; gap: 5px; }
.anim-preset-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 7px;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 7px;
  cursor: pointer;
  transition: border-color .14s, background .14s;
}
.anim-preset-row:hover { border-color: var(--line); background: var(--row-on); }
.anim-preset-row.sel {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.ap-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.anim-preset-row .iconbtn { flex: none; font-size: 12px; }
.anim-preset-row .iconbtn.favf.on {
  color: oklch(.74 .15 322);
  border-color: oklch(.7 .15 322 / .5);
}
.anim-preset-row .iconbtn.is-upload-success { color: oklch(.74 .16 150); border-color: oklch(.5 .13 150 / .5); }
.anim-preset-row .iconbtn.is-remote { color: var(--accent); border-color: oklch(.6 .12 255 / .5); }
</style>

<style scoped>
.mixgrid { grid-template-columns: 1fr; gap: 5px; }
.mixcell { padding: 6px 8px; border-radius: 7px; }
.mc-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.mc-name { white-space: normal; }
</style>
