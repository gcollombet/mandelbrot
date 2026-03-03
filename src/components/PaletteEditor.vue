<script setup lang="ts">
import {computed, defineEmits, defineProps, nextTick, onMounted, ref, watch} from 'vue';
import GlissiereHandle from './GlissiereHandle.vue';
import {Palette} from '../Palette';
import {rgb as d3rgb} from 'd3-color';
import type {ColorStop} from "../ColorStop.ts";
import type {InterpolationMode} from "../Mandelbrot.ts";

const props = withDefaults(defineProps<{
  colorStops: ColorStop[];
  interpolationMode?: InterpolationMode;
  pickerMode?: boolean;
}>(), {
  interpolationMode: 'lab',
  pickerMode: false,
});
const emit = defineEmits<{
  (e: 'update:colorStops', value: ColorStop[]): void;
  (e: 'toggle-picker'): void;
}>();

const MAX_COLORS = 200;

const canvasRef = ref<HTMLCanvasElement|null>(null);

// Texture générée à partir de la palette courante
const texture = computed(() => {
  const pal = new Palette(props.colorStops, props.interpolationMode);
  return pal.generateTexture(); // ImageData
});

watch(texture, (img) => {
  if (!canvasRef.value || !img) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, 4096, 32);
  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  ctx.drawImage(tmp, 0, 0, 4096, 1, 0, 0, 4096, 32);
});

onMounted(() => {
  nextTick(() => {
    const img = texture.value;
    if (!canvasRef.value || !img) return;
    const ctx = canvasRef.value.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 4096, 32);
    const tmp = document.createElement('canvas');
    tmp.width = img.width;
    tmp.height = img.height;
    tmp.getContext('2d')!.putImageData(img, 0, 0);
    ctx.drawImage(tmp, 0, 0, 4096, 1, 0, 0, 4096, 32);
  });
});

function onCanvasDblClick(event: MouseEvent) {
  if (props.colorStops.length >= MAX_COLORS) return;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  let t = (event.clientX - rect.left) / rect.width;
  t = Math.max(0, Math.min(1, t));
  // Sampler la couleur de la palette à cette position (ajout non-destructif)
  const pal = new Palette(props.colorStops, props.interpolationMode);
  const sampledColor = pal.getColorAt(t);
  props.colorStops.push({ color: sampledColor, position: t });
  emit('update:colorStops', props.colorStops);
  selectedIdx.value = props.colorStops.length - 1;
}

// Index de la couleur sélectionnée
const selectedIdx = ref<number|null>(0);

// Auto-sélectionner le dernier curseur ajouté (ex: via pipette)
watch(() => props.colorStops.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    selectedIdx.value = newLen - 1;
  }
});

function selectColor(idx: number) {
  selectedIdx.value = idx;
}

/** Supprime le stop sélectionné (minimum 2 stops requis). */
function deleteSelectedStop() {
  if (selectedIdx.value === null) return;
  if (props.colorStops.length <= 2) return; // garder au moins 2 stops
  props.colorStops.splice(selectedIdx.value, 1);
  emit('update:colorStops', props.colorStops);
  // Ajuster la sélection
  if (selectedIdx.value >= props.colorStops.length) {
    selectedIdx.value = props.colorStops.length - 1;
  }
}

// Hex color of the selected stop (for the native color picker)
const selectedHex = computed({
  get() {
    if (selectedIdx.value === null || props.colorStops.length === 0) return '#ffffff';
    const c = props.colorStops[selectedIdx.value]?.color || '#ffffff';
    // Ensure it's a valid 7-char hex for the input
    try {
      return d3rgb(c).formatHex();
    } catch {
      return '#ffffff';
    }
  },
  set(hex: string) {
    if (selectedIdx.value !== null && props.colorStops[selectedIdx.value]) {
      //@ts-ignore
      props.colorStops[selectedIdx.value] = {
        ...props.colorStops[selectedIdx.value],
        color: hex
      };
      emit('update:colorStops', props.colorStops);
    }
  }
});

</script>

<template>
  <div class="palette-editor">
    <div class="canvas-row" style="position:relative;" @dblclick="onCanvasDblClick">
      <canvas ref="canvasRef" width="4096" height="32"
              style="width:100%;max-width:100%;height:32px;border-radius:2px;box-shadow:0 1px 4px #0001;">
      </canvas>
      <div class="handles-overlay">
        <GlissiereHandle
          v-for="(stop, idx) in colorStops"
          :key="'handle-' + idx"
          :stop="stop"
          :selected="selectedIdx === idx"
          @update:position="t => colorStops[idx].position = t"
          @select="selectColor(idx)"
        />
        <!-- Bouton supprimer flottant au-dessus du curseur sélectionné -->
        <button
          v-if="selectedIdx !== null && colorStops.length > 2"
          class="floating-delete-btn"
          :style="{ left: colorStops[selectedIdx]?.position * 100 + '%' }"
          :title="'Supprimer ce stop'"
          @mousedown.stop
          @click.stop="deleteSelectedStop"
        >
          &times;
        </button>
      </div>
    </div>
    <!-- Couleur sélectionnée + pipette -->
    <div class="color-picker-row">
      <button
        class="pipette-btn"
        :class="{ 'is-active': props.pickerMode }"
        :title="props.pickerMode ? 'Quitter le mode pipette (Échap)' : 'Pipette : cliquer sur le fractal pour ajouter un curseur'"
        @click="emit('toggle-picker')"
      >
        <!-- Icône pipette SVG -->
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 22l1-1h3l9-9"/>
          <path d="M3 21l9-9"/>
          <path d="M15 6l3-3 3 3-3 3"/>
          <path d="M12 9l3 3"/>
        </svg>
      </button>
      <input
        type="color"
        :value="selectedHex"
        @input="selectedHex = ($event.target as HTMLInputElement).value"
        class="native-color-input"
      />
      <span class="color-hex-label">{{ selectedHex }}</span>
      <span v-if="props.pickerMode" class="picker-hint">Cliquez sur le fractal…</span>
    </div>
  </div>
</template>

<style scoped>
.palette-editor {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1em;
}
.canvas-row {
  margin-top: 1.5em;
  display: flex;
  justify-content: center;
  overflow: visible;
}
.handles-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}
.floating-delete-btn {
  position: absolute;
  top: -22px;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  border: 1px solid #ccc;
  border-radius: 50%;
  background: #f5f5f5;
  color: #c44;
  font-size: 1em;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 20;
  line-height: 1;
  padding: 0;
  transition: background 0.15s, color 0.15s;
}
.floating-delete-btn:hover {
  background: #c44;
  color: #fff;
}
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 0.8em;
}
.pipette-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #f5f5f5;
  color: #555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
.pipette-btn:hover {
  background: #e8e8e8;
  border-color: #aaa;
}
.pipette-btn.is-active {
  background: #c44;
  border-color: #c44;
  color: #fff;
}
.picker-hint {
  font-size: 0.82em;
  color: #c44;
  font-weight: 500;
  white-space: nowrap;
}
.native-color-input {
  width: 48px;
  height: 36px;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 2px;
  cursor: pointer;
  background: none;
}
.color-hex-label {
  font-family: monospace;
  font-size: 0.95em;
  color: #333;
}

</style>
