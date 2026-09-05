<script setup lang="ts">
import { computed, ref } from 'vue';
import { showTip, hideTip } from './denseTip';

const props = defineProps<{
  title: string;
  initiallyCollapsed?: boolean;
  preview?: string | null;
  /** SVG inner markup (paths) drawn in a 0..24 viewBox for the icon chip. */
  icon?: string;
  /** Right-aligned scope hint. */
  scope?: string;
  /** Grouping for ptabs primary filtering: 'params' | 'library'. */
  group?: string;
  /** Marks this section active in tabs layout. */
  active?: boolean;
  /** Span all masonry columns (for wide content like editors/grids). */
  span?: boolean;
  /** Section accent hue (oklch hue angle) — tints the icon chip. */
  hue?: number;
}>();

const collapsed = ref(!!props.initiallyCollapsed);

// Per-section accent: tints the icon chip (fields keep their own hue).
const sectionStyle = computed(() =>
  props.hue !== undefined
    ? { '--accent': `oklch(var(--lit) calc(var(--chroma)*var(--cmul,1)) ${props.hue})` }
    : undefined,
);

function toggle() {
  collapsed.value = !collapsed.value;
}
</script>

<template>
  <section
    class="section"
    :class="{ collapsed, active, 'span-all': span }"
    :data-group="group"
    :style="sectionStyle"
  >
    <button type="button" class="sec-head" :aria-expanded="!collapsed" @click="toggle">
      <span v-if="icon" class="sec-ico"><svg viewBox="0 0 24 24" v-html="icon"></svg></span>
      <img v-if="preview" :src="preview" alt="Sélection actuelle" class="section-preview" />
      <span class="sec-title">{{ title }}</span>
      <span
        v-if="scope"
        class="sec-scope"
        @pointerenter="showTip(scope, $event.clientX, $event.clientY)"
        @pointerleave="hideTip()"
      >{{ scope }}</span>
      <svg class="sec-caret" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
    <div class="sec-body">
      <slot />
    </div>
  </section>
</template>
