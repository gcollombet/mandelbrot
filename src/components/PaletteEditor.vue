<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, defineProps, defineEmits } from 'vue';
import GlissiereHandle from './GlissiereHandle.vue';
import LchPicker from './LchPicker.vue';
import { Palette } from '../Palette';
import { rgb as d3rgb, lch as d3lch } from 'd3-color';
import type {ColorStop} from "../ColorStop.ts";

const props = defineProps<{ colorStops: ColorStop[] }>();
const emit = defineEmits<(e: 'update:colorStops', value: ColorStop[]) => void>();

const MAX_COLORS = 12;

const canvasRef = ref<HTMLCanvasElement|null>(null);

// Texture générée à partir de la palette courante
const texture = computed(() => {
  const pal = new Palette(props.colorStops);
  return pal.generateTexture(); // ImageData
});

watch(texture, (img) => {
  if (!canvasRef.value || !img) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, 4096, 32);
  // On étire verticalement la bande 4096x1 sur 4096x32 pour la visibilité
  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  ctx.drawImage(tmp, 0, 0, 4096, 1, 0, 0, 4096, 32);
});

onMounted(() => {
  // Ajout d'une glissière par défaut si aucune couleur
  nextTick(() => {
    const img = texture.value;
    if (!canvasRef.value || !img) return;
    const ctx = canvasRef.value.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 4096, 32);
    // On étire verticalement la bande 4096x1 sur 4096x32 pour la visibilité
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
  // Utilise la couleur actuellement sélectionnée comme base
  const baseColor = selectedIdx.value !== null ? props.colorStops[selectedIdx.value].color : '#ffffff';
  // On clone le tableau pour respecter l'immuabilité
  props.colorStops.push({ color: baseColor, position: t });
  emit('update:colorStops', props.colorStops);
  // Sélectionne la nouvelle couleur
  selectedIdx.value = props.colorStops.length - 1;
}

// Index de la couleur sélectionnée
const selectedIdx = ref<number|null>(0);

function selectColor(idx: number) {
  selectedIdx.value = idx;
}

// Conversion hex -> LCH
function hexToLch(hex: string) {
  const rgb = d3rgb(hex);
  if (!rgb) return { l: 100, c: 0, h: 0 };
  const lch = d3lch(rgb);
  return { l: lch.l, c: lch.c, h: lch.h };
}
// Conversion LCH -> hex
function lchToHex(lchObj: { l: number, c: number, h: number }) {
  const lch = d3lch(lchObj.l, lchObj.c, lchObj.h);
  const rgb = d3rgb(lch);
  return rgb.formatHex();
}

// Pour LchPicker : getter/setter sur la couleur du colorStop sélectionné
const selectedColor = computed({
  get() {
    if (selectedIdx.value === null || props.colorStops.length === 0) return { l: 100, c: 0, h: 0 };
    return hexToLch(props.colorStops[selectedIdx.value].color);
  },
  set(val: { l: number, c: number, h: number }) {
    if (selectedIdx.value !== null && props.colorStops[selectedIdx.value]) {
      // On clone le tableau pour respecter l'immuabilité
      props.colorStops[selectedIdx.value] = {
        ...props.colorStops[selectedIdx.value],
        color: lchToHex(val)
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
          @click.native="selectColor(idx)"
        />
      </div>
    </div>
    <LchPicker
      v-model="selectedColor"
      :width="450"
    />
  </div>
</template>

<style scoped>
.palette-editor {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1em;
}
input[type="color"] {
  width: 1.8em;
  height: 1.8em;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}
input[type="range"] {
  width: 4em;
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
</style>
