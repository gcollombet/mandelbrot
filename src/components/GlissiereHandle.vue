<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ColorStop } from "../ColorStop.ts";

const props = defineProps<{
  stop: ColorStop;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
}>();

const isEmphasized = computed(() => !!props.selected || !!props.highlighted);
const selectedStroke = computed(() => (props.highlighted ? '#111' : 'var(--accent-bright)'));

const emit = defineEmits(['update:position', 'select']);

const svgRef = ref<SVGSVGElement|null>(null);

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
      left: props.stop.position * 100 + '%',
      zIndex: props.selected ? 10 : (isEmphasized ? 4 : 1),
    }"
    viewBox="0 0 32 80"
    @mousedown="onDown"
    @touchstart="onTouchStart"
    class="stop-marker"
    :class="{ 'sel': props.selected, 'highlighted': props.highlighted }"
  >
    <!-- Rectangle vertical -->
    <rect
      :x="props.selected ? 8 : 9"
      y="0"
      :width="props.selected ? 16 : 14"
      height="80"
      rx="8"
      :fill="props.stop.color"
      :stroke="props.selected ? selectedStroke : (props.highlighted ? '#f0b429' : '#fff')"
      :stroke-width="props.selected ? 3 : 2.5"
    />
  </svg>
</template>

<style scoped>
.stop-marker {
  position: absolute;
  top: 8px;
  height: calc(100% - 16px);
  width: 32px;
  transform: translateX(-50%) scaleY(1);
  cursor: grab;
  pointer-events: auto;
  background: transparent;
  transition: transform 0.12s ease, filter 0.12s ease, width 0.12s ease;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.55));
  overflow: visible;
}

.stop-marker:hover {
  transform: translateX(-50%) scaleY(1.04);
}

.stop-marker.sel {
  width: 36px;
  transform: translateX(-50%) scaleY(1.06);
  filter: drop-shadow(0 0 0 2px var(--accent)) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6));
}

.stop-marker:active {
  cursor: grabbing;
}
</style>
