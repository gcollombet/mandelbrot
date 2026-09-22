<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
defineProps<{label: string}>();
const {t} = useI18n();
const open = ref(false);
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const position = ref({top: '0px', left: '0px'});
async function toggle() {
  open.value = !open.value;
  if (!open.value) return;
  const rect = trigger.value!.getBoundingClientRect();
  position.value = {top: `${rect.bottom + 4}px`, left: `${Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228))}px`};
  await nextTick();
  const bounds = panel.value!.getBoundingClientRect();
  if (bounds.bottom > window.innerHeight - 8) position.value.top = `${Math.max(8, rect.top - bounds.height - 4)}px`;
  panel.value?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
}
function close(restore = false) { open.value = false; if (restore) trigger.value?.focus(); }
function outside(event: Event) {
  if (!panel.value?.contains(event.target as Node) && !trigger.value?.contains(event.target as Node)) close();
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); close(true); }
  if (event.key === 'Tab') close();
}
onMounted(() => { document.addEventListener('pointerdown', outside, true); window.addEventListener('resize', outside); });
onUnmounted(() => { document.removeEventListener('pointerdown', outside, true); window.removeEventListener('resize', outside); });
</script>
<template>
  <span class="preset-actions" @click.stop @pointerdown.stop @keydown.stop>
    <button ref="trigger" type="button" class="more" :aria-label="t('presetActionsMenu.actionsFor', { label })" :aria-expanded="open" @click="toggle">⋯</button>
    <Teleport to="body">
      <div v-if="open" ref="panel" class="preset-actions-panel" :style="position" :aria-label="t('presetActionsMenu.actionsFor', { label })" role="group"
        @pointerdown.stop @click.stop="close(true)" @keydown.stop="keydown"><slot /></div>
    </Teleport>
  </span>
</template>
<style scoped>
.preset-actions { float: right; }
.more { border: 0; border-radius: 5px; background: transparent; color: inherit; font-size: 22px; line-height: 1; min-width: 32px; min-height: 30px; cursor: pointer; }
.more:hover, .more:focus-visible { background: #80808030; }
.preset-actions-panel { position: fixed; z-index: 10000; width: 220px; max-height: calc(100vh - 16px); overflow-y: auto; padding: 5px; border: 1px solid #ffffff30; border-radius: 9px; background: #20242b; color: #f5f5f5; box-shadow: 0 8px 28px #0007; }
.preset-actions-panel :deep(button) { display: block; width: 100%; padding: 9px 10px; border: 0; border-radius: 5px; background: transparent; color: inherit; font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
.preset-actions-panel :deep(button:hover), .preset-actions-panel :deep(button:focus-visible) { background: #ffffff20; }
.preset-actions-panel :deep(button:disabled) { opacity: .45; cursor: default; }
.preset-actions-panel :deep(.danger) { color: #ff9999; border-top: 1px solid #ffffff20; margin-top: 4px; }
</style>
