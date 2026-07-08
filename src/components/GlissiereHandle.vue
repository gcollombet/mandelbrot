<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ColorStop } from "../ColorStop.ts";

const props = defineProps<{
  stop: ColorStop;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
}>();

const zIndex = computed(() => (props.selected ? 10 : (props.highlighted ? 4 : 1)));

const emit = defineEmits(['update:position', 'select']);

const markerRef = ref<HTMLElement | null>(null);

function onDown(e: MouseEvent) {
  if (props.disabled) {
    e.preventDefault();
    return;
  }
  e.preventDefault();
  emit('select');
  const startX = e.clientX;
  const startVal = props.stop.position;
  const marker = markerRef.value;
  if (!marker) return;
  const parent = marker.parentElement as HTMLElement;
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
  const marker = markerRef.value;
  if (!marker) return;
  const parent = marker.parentElement as HTMLElement;
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
  <div
    ref="markerRef"
    class="stop-marker"
    :class="{ sel: props.selected, highlighted: props.highlighted }"
    :style="{
      left: props.stop.position * 100 + '%',
      background: props.stop.color,
      zIndex,
    }"
    @mousedown="onDown"
    @touchstart="onTouchStart"
  ></div>
</template>

<style scoped>
.stop-marker {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 12px;
  transform: translateX(-50%);
  border-radius: 6px;
  border: 2px solid #fff;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.5);
  cursor: grab;
  pointer-events: auto;
  transition: width 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
}

.stop-marker:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.6);
}

.stop-marker.highlighted {
  border-color: #f0b429;
}

.stop-marker.sel {
  width: 16px;
  border-color: var(--accent-bright);
  box-shadow: 0 0 0 2px var(--accent), 0 3px 9px rgba(0, 0, 0, 0.6);
}

.stop-marker:active {
  cursor: grabbing;
}
</style>
