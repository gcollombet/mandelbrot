<script setup lang="ts">
import { computed, defineProps, defineEmits, ref } from 'vue';
import type {ColorStop} from "../ColorStop.ts";

const props = defineProps<{
  stop: ColorStop;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
}>();

const isEmphasized = computed(() => !!props.selected || !!props.highlighted);
const selectedStroke = computed(() => (props.highlighted ? '#111' : '#fff'));

const emit = defineEmits(['update:position', 'select']);

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
  if (props.disabled) {
    e.preventDefault();
    return;
  }
  e.preventDefault();
  emit('select');
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

function onTouchStart(e: TouchEvent) {
  if (props.disabled) {
    e.preventDefault();
    return;
  }
  e.preventDefault();
  emit('select');
  const touch = e.touches[0];
  if (!touch) return;
  const startX = touch.clientX;
  const startVal = props.stop.position;
  const svg = svgRef.value;
  if (!svg) return;
  const parent = svg.parentElement as HTMLElement;
  const rect = parent.getBoundingClientRect();
  function onTouchMove(ev: TouchEvent) {
    const t0 = ev.touches[0];
    if (!t0) return;
    const dx = t0.clientX - startX;
    let t = startVal + dx / rect.width;
    t = Math.max(0, Math.min(1, t));
    emit('update:position', t);
  }
  function onTouchEnd() {
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchEnd);
  }
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('touchcancel', onTouchEnd);
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
    width: props.selected ? '38px' : (isEmphasized ? '34px' : '32px'),
    transform: 'translateX(-50%)',
     zIndex: props.selected ? 10 : (isEmphasized ? 4 : 1),
     cursor: props.disabled ? 'not-allowed' : 'ew-resize',
     pointerEvents: 'auto',
     background: 'transparent',
     filter: props.highlighted
       ? 'drop-shadow(0 0 4px rgba(255,255,255,0.85)) drop-shadow(0 0 8px rgba(240,180,41,0.75))'
       : (props.selected ? 'drop-shadow(0 0 3px rgba(255,255,255,0.75)) drop-shadow(0 0 5px rgba(100,150,255,0.65))' : 'none'),
     transition: 'filter 0.15s, width 0.15s',
  }"
    :viewBox="props.selected ? '0 0 26 64' : (isEmphasized ? '0 0 24 64' : '0 0 22 64')"
    @mousedown="onDown"
    @touchstart="onTouchStart"
  >
    <!-- Rectangle vertical (plus large si sélectionné) -->
    <rect
      :x="props.selected ? 5 : (isEmphasized ? 5.5 : 6)"
      y="0"
      :width="props.selected ? 16 : (isEmphasized ? 13 : 12)"
      height="64"
      :rx="props.selected ? 10 : (isEmphasized ? 9 : 8)"
      :fill="props.stop.color"
      :stroke="props.selected ? selectedStroke : (props.highlighted ? '#f0b429' : borderColor)"
      :stroke-width="props.selected ? 3 : (isEmphasized ? 2.4 : 2)"
    />
  </svg>
</template>

<style scoped>
</style>
