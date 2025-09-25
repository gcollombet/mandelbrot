<script setup lang="ts">
import { computed, defineProps, defineEmits, ref } from 'vue';
import type {ColorStop} from "../ColorStop.ts";

const props = defineProps<{
  stop: ColorStop;
}>();

const emit = defineEmits(['update:position']);

const svgRef = ref<SVGSVGElement|null>(null);

// Calcul de la luminance pour choisir la couleur de bordure
function luminance(hex: string): number {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substring(0,2), 16) / 255;
  const g = parseInt(c.substring(2,4), 16) / 255;
  const b = parseInt(c.substring(4,6), 16) / 255;
  return 0.299*r + 0.587*g + 0.114*b;
}
const borderColor = computed(() => luminance(props.stop.color) > 0.5 ? '#222' : '#fff');

function onDown(e: MouseEvent) {
  e.preventDefault();
  const startX = e.clientX;
  const startVal = props.stop.position;
  const svg = svgRef.value;
  if (!svg) return;
  const parent = svg.parentElement as HTMLElement;
  const rect = parent.getBoundingClientRect();
  function onMove(ev: MouseEvent) {
    const dx = ev.clientX - startX;
    let t = startVal + dx / rect.width;
    t = Math.max(0, Math.min(1, t));
    emit('update:position', t);
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}
</script>

<template>
  <svg
    ref="svgRef"
    :style="{
    position: 'absolute',
    left: props.stop.position * 100 + '%',
    top: 0,
    height: '100%',
    width: '32px',
    transform: 'translateX(-50%)',
     zIndex: 1,
     cursor: 'ew-resize',
     pointerEvents: 'auto',
     background: 'transparent'
  }"
    viewBox="0 0 22 64"
    @mousedown="onDown"
  >
    <!-- Rectangle vertical -->
    <rect x="6" y="0" width="12" height="64" rx="8" :fill="props.stop.color" :stroke="borderColor" stroke-width="2"/>
  </svg>
</template>

<style scoped>
</style>
