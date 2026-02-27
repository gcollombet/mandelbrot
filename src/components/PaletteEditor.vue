<script setup lang="ts">
import {computed, defineEmits, defineProps, nextTick, onMounted, ref, watch} from 'vue';
import GlissiereHandle from './GlissiereHandle.vue';
import {Palette} from '../Palette';
import {rgb as d3rgb} from 'd3-color';
import type {ColorStop} from "../ColorStop.ts";
import type {InterpolationMode} from "../Mandelbrot.ts";

const props = withDefaults(defineProps<{ colorStops: ColorStop[]; interpolationMode?: InterpolationMode }>(), {
  interpolationMode: 'lab',
});
const emit = defineEmits<(e: 'update:colorStops', value: ColorStop[]) => void>();

const MAX_COLORS = 12;

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
  const baseColor = selectedIdx.value !== null ? props.colorStops[selectedIdx.value]?.color || '#ffffff' : '#ffffff';
  props.colorStops.push({ color: baseColor, position: t });
  emit('update:colorStops', props.colorStops);
  selectedIdx.value = props.colorStops.length - 1;
}

// Index de la couleur sélectionnée
const selectedIdx = ref<number|null>(0);

function selectColor(idx: number) {
  selectedIdx.value = idx;
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
          :index="idx"
          @update:position="t => colorStops[idx].position = t"
          @select="selectColor(idx)"
        />
      </div>
    </div>
    <!-- Native color picker -->
    <div class="color-picker-row">
      <input
        type="color"
        :value="selectedHex"
        @input="selectedHex = ($event.target as HTMLInputElement).value"
        class="native-color-input"
      />
      <span class="color-hex-label">{{ selectedHex }}</span>
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
  margin-top: 1em;
  display: flex;
  justify-content: center;
}
.handles-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 0.8em;
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
