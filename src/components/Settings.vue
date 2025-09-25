<script setup lang="ts">
import { defineProps, computed, ref, onMounted, defineEmits } from 'vue';
import type { MandelbrotParams } from "../Mandelbrot.ts";
import PaletteEditor from './PaletteEditor.vue';

const props = defineProps<{ modelValue: MandelbrotParams }>();
const emit = defineEmits(['update:ModelValue']);

const angleDeg = computed(() => (Number.parseFloat(props.modelValue.angle)  * 180 / Math.PI).toFixed(2));
const scaleSci = computed(() => props.modelValue.scale);
const cxSci = computed(() => props.modelValue.cx);
const cySci = computed(() => props.modelValue.cy);

const presetName = ref('');
const presets = ref<{ name: string, value: MandelbrotParams }[]>([]);
const selectedPreset = ref('');
const STORAGE_KEY = 'mandelbrot_presets';

function savePreset() {
  if (!presetName.value.trim()) return;
  const preset = {
    name: presetName.value.trim(),
    value: props.modelValue
  };
  const idx = presets.value.findIndex(p => p.name === preset.name);
  if (idx >= 0) {
    presets.value[idx] = preset;
  } else {
    presets.value.push(preset);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value));
  presetName.value = '';
}

function loadPresets() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      presets.value = JSON.parse(raw);
    } catch {}
  }
}

function selectPreset(name: string) {
  const preset = presets.value.find(p => p.name === name);
  if (preset) {
    selectedPreset.value = name;
    emit('update:ModelValue', preset.value );
  }
}

const muSlider = computed({
  get: () => Math.log10(props.modelValue.mu ?? 1.0),
  set: (val: number) => {
    props.modelValue.mu = Math.pow(10, val);
  }
});
const epsilonSlider = computed({
  get: () => Math.log10(props.modelValue.epsilon ?? 1e-8),
  set: (val: number) => {
    props.modelValue.epsilon = Math.pow(10, val);
  }
});

onMounted(() => {
  loadPresets();
});

const activeTab = ref('navigation');
</script>

<template>
  <div class="block bulma-settings-block" style="color: black !important;">
    <div class="tabs is-toggle is-fullwidth is-small">
      <ul>
        <li :class="{ 'is-active': activeTab === 'navigation' }">
          <a @click="activeTab = 'navigation'">Navigation</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'color' }">
          <a @click="activeTab = 'color'">Palette</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'performance' }">
          <a @click="activeTab = 'performance'">Graphics</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'presets' }">
          <a @click="activeTab = 'presets'">Presets</a>
        </li>
      </ul>
    </div>
    <div v-if="activeTab === 'navigation'">
      <div class="mb-3">
        <span class="math-display">
          Échelle&nbsp;:
          <span v-html="scaleSci" />
          <button class="button is-small" style="margin-left:0.7em;" @click="props.modelValue.scale = '2.5'">Réinitialiser</button>
        </span>
      </div>
      <div class="mb-3">
        <p>
          <span class="math-display">Cx&nbsp;:<span v-html="cxSci" /></span>
        </p>
        <p>
          <span class="math-display">Cy&nbsp;:<span class="math-i">i</span><span v-html="cySci" /></span>
        </p>
      </div>
      <div class="mb-3">
        <span class="math-display">
          Angle&nbsp;:
          <span>{{ angleDeg }}°</span>
        </span>
      </div>
    </div>
    <div v-else-if="activeTab === 'color'">
      <div class="mb-3">
        <PaletteEditor :color-stops="props.modelValue.colorStops" />
      </div>
    </div>
    <div v-else-if="activeTab === 'performance'">
      <div class="field">
        <label class="label">Mu (log)</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="0" max="5" step="0.01" v-model="muSlider" />
        </div>
        <span class="math-display">{{ (props.modelValue.mu ?? 1.0).toFixed(1) }}</span>
      </div>
      <div class="field">
        <label class="label">Epsilon (log)</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="-12" max="0" step="0.01" v-model="epsilonSlider" />
        </div>
        <span class="math-display">{{ (props.modelValue.epsilon ?? 1e-8).toExponential(2) }}</span>
      </div>
      <!--     <div class="field">
           <label class="label">Max iterations</label>
           <div class="control">
             <input class="slider is-fullwidth" type="range" min="10" max="5000" step="1" v-model.number="props.modelValue.maxIterations" />
           </div>
           <span class="math-display">{{ props.modelValue.maxIterations }}</span>
         </div>
       <div class="field">
           <label class="label">Antialias level</label>
           <div class="control">
             <input class="slider is-fullwidth" type="range" min="1" max="8" step="1" v-model.number="props.modelValue.antialiasLevel" />
           </div>
           <span class="math-display">{{ props.modelValue.antialiasLevel }}</span>
         </div>-->
      <div class="field">
        <label class="label">Palette period</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="0.1" max="10" step="0.1" v-model.number="props.modelValue.palettePeriod" />
        </div>
        <span class="math-display">{{ props.modelValue.palettePeriod }}</span>
      </div>
      <div class="field">
        <label class="label">Tesselation</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="0.1" max="10" step="0.1" v-model.number="props.modelValue.tessellationLevel" />
        </div>
        <span class="math-display">{{ props.modelValue.tessellationLevel }}</span>
      </div>
<!--      <div class="field">
        <label class="label">Shading level</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="1" max="100" step="1" v-model.number="props.modelValue.shadingLevel" />
        </div>
        <span class="math-display">{{ props.modelValue.shadingLevel }}</span>
      </div>-->
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="props.modelValue.activateWebcam" />
          &nbsp;Activer la webcam
        </label>
      </div>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="props.modelValue.activateTessellation" />
          &nbsp;Tessellation GPU
        </label>
      </div>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="props.modelValue.activateShading" />
          &nbsp;Shading avancé
        </label>
      </div>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="props.modelValue.activateSkybox" />
          &nbsp;Skybox
        </label>
      </div>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="props.modelValue.activatePalette" />
          &nbsp;Palette
        </label>
      </div>
    </div>
    <div v-else-if="activeTab === 'presets'">
      <div class="mb-3">
        <div class="field">
          <label class="label">Presets enregistrés</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select v-model="selectedPreset" @change="selectPreset(selectedPreset)">
                <option value="" disabled>Choisir un preset...</option>
                <option v-for="preset in presets" :key="preset.name" :value="preset.name">{{ preset.name }}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="field is-grouped">
          <div class="control is-expanded">
            <input class="input" v-model="presetName" type="text" placeholder="Nom..." />
          </div>
          <div class="control">
            <button class="button is-link is-small" @click="savePreset">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bulma-settings-block {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(8px) contrast(110%);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-radius: 8px;
  padding: 1.2em 1.5em;
  width: 420px;
  height: 100%;
  max-width: 100vw;
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
</style>