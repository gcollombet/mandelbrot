<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDenseView } from './useDenseView';
import { showTip, hideTip } from './denseTip';

const props = defineProps<{
  title: string;
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

const view = useDenseView();
const collapsed = ref(false);

// Per-section accent: tints the icon chip (fields keep their own hue).
const sectionStyle = computed(() =>
  props.hue !== undefined
    ? { '--accent': `oklch(var(--lit) calc(var(--chroma)*var(--cmul,1)) ${props.hue})` }
    : undefined,
);

function toggle() {
  // Collapsing is only meaningful in inspector / tabs layouts.
  if (view.layout === 'columns') return;
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
    <header class="sec-head" @click="toggle">
      <span v-if="icon" class="sec-ico"><svg viewBox="0 0 24 24" v-html="icon"></svg></span>
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
    </header>
    <div class="sec-body">
      <slot />
    </div>
  </section>
</template>
