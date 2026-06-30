<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
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
import { DenseField, DenseSection, DenseSelect } from './dense';

const props = defineProps<{
  userRole: UserRole;
  isAdmin: boolean;
  uploadSuccessKeys: Set<string>;
  suspendShortcuts?: (suspend: boolean) => void;
}>();

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

async function saveAnimationPreset() {
  const name = animationPresetName.value.trim();
  if (!name) return;
  const existing = animationPresets.value.find(item => item.name === name);
  if (!canOverwriteCatalogPayload(props.userRole, existing?.remote)) {
    window.alert('Shared catalog animation presets cannot be overwritten. Save a local variant with a new name.');
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
  selectedAnimationPreset.value = name;
  animationPresetName.value = '';
}

function selectAnimationPresetFromDropdown(preset: AnimationPresetRecord) {
  selectedAnimationPreset.value = preset.name;
  animationPresetName.value = preset.name;
  model.value.animation = cloneAnimationConfig(preset.animation);
  model.value.animationSpeed = model.value.animation.globalSpeed;
  showAnimationPresetDropdown.value = false;
  triggerAnimationUpdate();
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
    window.alert('Shared catalog animation presets cannot be deleted locally.');
    return;
  }
  if (!window.confirm(`Delete animation preset "${preset.name}"? This cannot be undone.`)) return;
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
  if (props.uploadSuccessKeys.has(key)) return 'Uploaded successfully';
  if (preset.remote) return 'Already in shared catalog. Upload again to update.';
  return 'Upload to shared catalog';
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

        <!-- ═══ Lecture ═══ -->
        <DenseSection
          title="Lecture"
          scope="Marche/arrêt global et vitesse maître"
          icon='<path d=&quot;M8 5v14l11-7z&quot;/>'
        >
          <div class="playbar">
            <button
              class="play-btn"
              :class="{ paused: !model.activateAnimate }"
              type="button"
              :aria-pressed="model.activateAnimate"
              title="Play/Pause animation"
              @click="model.activateAnimate = !model.activateAnimate"
            >
              <svg v-if="model.activateAnimate" viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>
              <svg v-else viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <span>{{ model.activateAnimate ? 'En pause' : 'Drift' }}</span>
            </button>
          </div>
          <div class="fields">
            <DenseField
              label="Vitesse globale"
              :min="0" :max="5" :step="0.05"
              :f="speedFmt"
              :model-value="model.animation.globalSpeed"
              @update:model-value="setGlobalSpeed"
            />
          </div>
        </DenseSection>

        <!-- ═══ Mixer ═══ -->
        <DenseSection
          title="Mixer"
          scope="Paramètres animés — onde, vitesse, amplitude"
          icon='<path d=&quot;M4 12q4-7 8 0t8 0&quot;/><path d=&quot;M4 17h16&quot;/>'
        >
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
                  :aria-checked="model.animation.tracks[track.id].enabled"
                  tabindex="0"
                  @click="toggleTrack(track.id)"
                  @keydown.space.prevent="toggleTrack(track.id)"
                  @keydown.enter.prevent="toggleTrack(track.id)"
                ></span>
                <span class="mc-name">{{ animationTrackLabel(track.id) }}</span>
                <DenseSelect
                  class="mc-wave"
                  :options="waveOptions"
                  :model-value="model.animation.tracks[track.id].type"
                  @update:model-value="(v) => setTrackType(track.id, v)"
                />
              </div>
              <div class="mc-fields">
                <DenseField
                  label="Vitesse"
                  :min="0" :max="5" :step="0.05"
                  :f="speedFmt"
                  :model-value="model.animation.tracks[track.id].speed"
                  @update:model-value="(v) => setTrackSpeed(track.id, v)"
                />
                <DenseField
                  label="Amplitude"
                  :min="track.minAmplitude" :max="track.maxAmplitude" :step="track.amplitudeStep"
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
          title="Préréglages"
          scope="Enregistrer & appliquer une animation"
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
              Favoris
            </button>
            <span class="lib-count">{{ visibleAnimationPresetCount }} préréglage{{ visibleAnimationPresetCount > 1 ? 's' : '' }}</span>
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
                :title="preset.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
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
                title="Supprimer le préréglage"
                aria-label="Supprimer le préréglage"
                @click.stop="deleteAnimationPreset(preset)"
              >
                <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>
              </button>
            </div>
          </div>

          <div class="save-row">
            <input
              class="txt-in"
              v-model="animationPresetName"
              type="text"
              placeholder="Nom du préréglage…"
              @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
              @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
              @keyup.enter="saveAnimationPreset"
            />
            <button class="mini-btn primary" type="button" @click="saveAnimationPreset">
              <svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H5z"/><path d="M9 3v5h7V3M8 21v-7h8v7"/></svg>
              Enregistrer
            </button>
          </div>
        </DenseSection>

  </div>
</template>


<style scoped>
/* ── Lecture: play bar ──────────────────────────────────────── */
.playbar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: var(--gap);
  flex-wrap: wrap;
}
.play-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 18px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  color: #fff;
  font-family: var(--sans);
  font-weight: 700;
  font-size: 14px;
  background: linear-gradient(110deg, var(--accent), oklch(var(--lit) calc(var(--chroma) * var(--cmul)) 300));
  box-shadow: 0 8px 22px -10px var(--accent);
  transition: .15s;
}
.play-btn:hover { filter: brightness(1.07); }
.play-btn svg { width: 14px; height: 14px; fill: currentColor; }
.play-btn.paused {
  background: var(--row-on);
  color: var(--ink-2);
  border-color: var(--line);
  box-shadow: none;
}

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
