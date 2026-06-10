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

function animationTrackAmplitudeValueOnly(id: AnimationTrackId): string {
  const definition = animationTrackDefinition(id);
  const value = animationTrack(id).amplitude;
  const decimals = definition.amplitudeStep < 0.01 ? 3 : definition.amplitudeStep < 0.1 ? 2 : 1;
  return value.toFixed(decimals);
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
  <div class="animation-tab-container" v-if="model.animation">
    <label class="gfx-section-title">Playback</label>
    <div class="playback">
      <button
        class="play-btn"
        :class="{ 'paused': model.activateAnimate }"
        type="button"
        :aria-pressed="model.activateAnimate"
        title="Play/Pause animation"
        @click="model.activateAnimate = !model.activateAnimate"
      >
        <span class="sheen"></span>
        <svg v-if="!model.activateAnimate" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        <svg v-else viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        <span>{{ model.activateAnimate ? 'Pause' : 'Animate' }}</span>
      </button>
      <span class="pb-label">Global Speed</span>
      <div class="pb-slider">
        <input
          type="range"
          min="0"
          max="5"
          step="0.05"
          v-model.number="model.animation.globalSpeed"
          @input="model.animationSpeed = model.animation.globalSpeed; triggerAnimationUpdate()"
        />
      </div>
      <span class="pb-val">&times;{{ (model.animation?.globalSpeed ?? 1).toFixed(2) }}</span>
    </div>

    <label class="gfx-section-title">Mixer</label>
    <div class="mixer">
      <div
        v-for="track in ANIMATION_TRACK_DEFINITIONS"
        :key="track.id"
        class="row"
        :class="model.animation.tracks[track.id].enabled ? 'on' : 'off'"
      >
        <div class="name-cell">
          <div
            class="toggle"
            :class="{ 'on': model.animation.tracks[track.id].enabled }"
            role="switch"
            :aria-checked="model.animation.tracks[track.id].enabled"
            tabindex="0"
            @click="model.animation.tracks[track.id].enabled = !model.animation.tracks[track.id].enabled; triggerAnimationUpdate()"
            @keydown.space.prevent="model.animation.tracks[track.id].enabled = !model.animation.tracks[track.id].enabled; triggerAnimationUpdate()"
            @keydown.enter.prevent="model.animation.tracks[track.id].enabled = !model.animation.tracks[track.id].enabled; triggerAnimationUpdate()"
          ></div>
          <span class="name">{{ animationTrackLabel(track.id) }}</span>
        </div>

        <div class="wave ctl">
          <select v-model="model.animation.tracks[track.id].type" @change="triggerAnimationUpdate">
            <option v-for="type in ANIMATION_TYPES" :key="`${track.id}-${type}`" :value="type">{{ type }}</option>
          </select>
        </div>

        <div class="param ctl">
          <span class="plabel">Speed</span>
          <input type="range" min="0" max="5" step="0.05" v-model.number="model.animation.tracks[track.id].speed" @input="triggerAnimationUpdate" />
          <span class="pval">&times;{{ model.animation.tracks[track.id].speed.toFixed(2) }}</span>
        </div>

        <div class="param ctl">
          <span class="plabel">Range</span>
          <input type="range" :min="track.minAmplitude" :max="track.maxAmplitude" :step="track.amplitudeStep" v-model.number="model.animation.tracks[track.id].amplitude" @input="triggerAnimationUpdate" />
          <span class="pval">
            {{ animationTrackAmplitudeValueOnly(track.id) }}<span class="unit">{{ animationTrackAmplitudeUnit(track.id) }}</span>
          </span>
        </div>
      </div>
    </div>

    <hr class="section-sep"/>

    <div class="mb-3 compact-library">
      <label class="palette-library-label">Animation Presets</label>
      <button
        class="button is-small favorite-filter"
        :class="{ 'is-active': showOnlyFavoriteAnimationPresets }"
        type="button"
        :aria-pressed="showOnlyFavoriteAnimationPresets"
        @click="showOnlyFavoriteAnimationPresets = !showOnlyFavoriteAnimationPresets"
      >
        <span class="favorite-filter-heart"><i class="fa-heart" :class="showOnlyFavoriteAnimationPresets ? 'fa-solid' : 'fa-regular'"></i></span>
        <span>Favorites</span>
      </button>
      <div class="dropdown" :class="{ 'is-active': showAnimationPresetDropdown }" style="width:100%;">
        <div class="dropdown-trigger" style="width:100%;">
          <button class="button is-fullwidth is-small" @click="showAnimationPresetDropdown = !showAnimationPresetDropdown" aria-haspopup="true" aria-controls="dropdown-menu-animation-presets" type="button">
            <span style="display:flex; align-items:center; min-height:28px;">
              <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.88em;">{{ animationPresetName || selectedAnimationPreset || 'Choose animation preset...' }}</span>
              <span class="icon is-small" style="margin-left:4px;">
                <i class="fas fa-angle-down" aria-hidden="true"></i>
              </span>
            </span>
          </button>
        </div>
        <div class="dropdown-menu" id="dropdown-menu-animation-presets" role="menu" style="width:100%;">
          <div class="dropdown-content" style="max-height:260px; overflow-y:auto;">
            <a v-for="preset in visibleAnimationPresets" :key="preset.guid" class="dropdown-item favorite-row"
              @click.prevent="selectAnimationPresetFromDropdown(preset)"
              :class="{ 'is-active': selectedAnimationPreset === preset.name, 'has-delete': canDeleteCatalogEntry(props.userRole, preset.remote) }"
              style="display:flex; align-items:center; gap:0.5em;">
              <button
                v-if="props.isAdmin"
                class="favorite-button upload-button"
                :class="uploadButtonClasses(preset)"
                type="button"
                :title="uploadButtonTitle(preset)"
                :aria-label="uploadButtonTitle(preset)"
                @click.stop.prevent="emit('upload-preset', preset)"
              >
                <span class="favorite-heart" aria-hidden="true"><i :class="uploadButtonIcon(preset)"></i></span>
              </button>
              <button
                class="favorite-button"
                :class="{ 'is-favorite': preset.favorite }"
                type="button"
                :title="preset.favorite ? 'Remove from favorites' : 'Add to favorites'"
                :aria-pressed="!!preset.favorite"
                @click.stop.prevent="toggleAnimationPresetFavorite(preset)"
              >
                <span class="favorite-heart" aria-hidden="true"><i class="fa-heart" :class="preset.favorite ? 'fa-solid' : 'fa-regular'"></i></span>
              </button>
              <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.95em;">{{ preset.name }}</span>
              <button
                v-if="canDeleteCatalogEntry(props.userRole, preset.remote)"
                class="delete-preset-button"
                type="button"
                title="Delete animation preset"
                aria-label="Delete animation preset"
                @click.stop.prevent="deleteAnimationPreset(preset)"
              >
                <span class="favorite-heart" aria-hidden="true"><i class="fa-solid fa-trash"></i></span>
              </button>
            </a>
          </div>
        </div>
      </div>
      <div class="field is-grouped" style="margin-top:0.5em;">
        <div class="control is-expanded">
          <input class="input is-small" v-model="animationPresetName" type="text" placeholder="Animation preset name..."
            @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
            @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
            @keyup.enter="saveAnimationPreset"
          />
        </div>
        <div class="control">
          <button class="button is-link is-small" @click="saveAnimationPreset"><i class="fa-solid fa-floppy-disk mr-1"></i> Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Playback styles from mockup */
.playback {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--row);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 30px;
}

/* AI-style animated Drift button */
.play-btn {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 22px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  color: #fff;
  background: transparent;
  font-family: var(--sans);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: .02em;
  transition: transform .16s, filter .16s;
  flex-shrink: 0;
}

/* rotating gradient border + glow */
.play-btn::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 14px;
  z-index: -2;
  background: conic-gradient(from var(--ai-angle, 0deg),
    var(--accent-bright), var(--mauve-bright), var(--magenta),
    var(--accent), var(--accent-bright));
  filter: blur(0.5px);
  animation: ai-spin 4s linear infinite;
}

/* solid inner fill so only the border shows the gradient */
.play-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 12px;
  z-index: -1;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 42%),
    linear-gradient(110deg, var(--accent), oklch(0.62 0.16 285));
  box-shadow: 0 8px 26px -8px var(--accent), 0 0 22px -6px var(--mauve);
}

/* sheen sweep */
.play-btn .sheen {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
}

.play-btn .sheen::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 42%;
  left: -60%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  transform: skewX(-18deg);
  animation: ai-sheen 3.4s ease-in-out infinite;
}

.play-btn > svg, .play-btn > span {
  position: relative;
  z-index: 1;
}

.play-btn:hover {
  transform: translateY(-1px);
  filter: saturate(1.15) brightness(1.05);
}

@property --ai-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes ai-spin {
  to {
    --ai-angle: 360deg;
  }
}

@keyframes ai-sheen {
  0% {
    left: -60%;
  }
  55%, 100% {
    left: 130%;
  }
}

/* paused: freeze + dim, neutral look */
.play-btn.paused {
  color: var(--ink);
}

.play-btn.paused::before {
  animation-play-state: paused;
  filter: grayscale(0.7) brightness(0.6);
}

.play-btn.paused::after {
  background: var(--row-on);
  box-shadow: none;
  border: 1px solid var(--line);
}

.play-btn.paused .sheen::before {
  animation-play-state: paused;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .play-btn::before, .play-btn .sheen::before {
    animation: none;
  }
}

.play-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.playback .pb-label {
  font-weight: 600;
  font-size: 16px;
  color: var(--ink-2);
  min-width: 106px;
}

.playback .pb-slider {
  flex: 1;
}

.playback .pb-val {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 18px;
  color: var(--ink);
  min-width: 80px;
  text-align: right;
}

/* Mixer styles from mockup */
.mixer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: grid;
  grid-template-columns: 248px 124px 1fr 1fr;
  align-items: center;
  gap: 22px;
  padding: 8px 18px;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 13px;
  position: relative;
  transition: .18s;
}

.row::before {
  content: "";
  position: absolute;
  left: 0;
  top: 9px;
  bottom: 9px;
  width: 3px;
  border-radius: 3px;
  background: transparent;
  transition: .18s;
}

.row.on {
  background: var(--row-on);
  border-color: #2b3340;
}

.row.on::before {
  background: linear-gradient(180deg, var(--accent-bright), var(--mauve));
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
  gap: 14px;
}

.toggle {
  --w: 46px;
  --h: 26px;
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
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #8a91a1;
  transition: .18s;
}

.toggle.on {
  background: var(--accent);
  border-color: var(--accent);
}

.toggle.on::after {
  left: 22px;
  background: #fff;
}

.name {
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -.01em;
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
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  background: #0b0d12;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 34px 10px 14px;
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
  font-size: 15px;
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

/* range sliders */
input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: var(--track);
  border-radius: 999px;
  outline: none;
  cursor: pointer;
}

input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent-bright);
  border: 3px solid #0b0d12;
  box-shadow: 0 0 0 1px var(--accent), 0 4px 12px -2px var(--accent);
  cursor: pointer;
  transition: .12s;
}

input[type=range]::-webkit-slider-thumb:hover {
  transform: scale(1.12);
}

input[type=range]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-bright);
  border: 3px solid #0b0d12;
  box-shadow: 0 0 0 1px var(--accent);
  cursor: pointer;
}

.pb-slider input[type=range] {
  height: 7px;
}

/* gfx-section-title styles local to keep consistency with settings */
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

@media (max-width: 880px) {
  .row {
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .name-cell {
    grid-column: 1 / -1;
  }
  .wave {
    grid-column: 1 / -1;
  }
}

@media (max-width: 560px) {
  .param {
    grid-template-columns: auto 1fr auto;
  }
}
</style>
