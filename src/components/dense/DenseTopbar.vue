<script setup lang="ts">
import { ref } from 'vue';
import DenseViewMenu from './DenseViewMenu.vue';

interface PTab { value: string; label: string }

defineProps<{
  title: string;
  expanded?: boolean;
  /** Optional primary grouping tabs (sets data-primary on the panel root). */
  ptabs?: PTab[];
  /** Currently active ptab value. */
  primary?: string;
  /** The "Affichage" view menu is admin-only. */
  isAdmin?: boolean;
  /** Signed-in user email, used to display synchronization status. */
  authUserEmail?: string;
  syncState?: 'idle' | 'syncing' | 'synced' | 'error';
  syncError?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'toggle-size'): void;
  (e: 'update:primary', v: string): void;
  /** Forwarded pointerdown on the brand area, for the host to drive window drag. */
  (e: 'drag-start', ev: PointerEvent): void;
}>();

const menuOpen = ref(false);

/** Drag from anywhere on the topbar background — but not from buttons/controls. */
function onHeaderPointerDown(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button')) return;
  emit('drag-start', e);
}
</script>

<template>
  <header class="topbar" @pointerdown="onHeaderPointerDown">
    <div class="brand">
      <span class="dot"></span>
      <h1>{{ title }}</h1>
    </div>
    <slot name="lead" />
    <div v-if="ptabs && ptabs.length" class="ptabs">
      <button
        v-for="t in ptabs"
        :key="t.value"
        class="ptab"
        :class="{ active: t.value === primary }"
        @click="emit('update:primary', t.value)"
      >{{ t.label }}</button>
    </div>
    <span class="spacer"></span>
    <slot name="actions" />
    <span
      v-if="authUserEmail && syncState && syncState !== 'idle'"
      class="sync-state"
      :class="syncState"
      :title="syncState === 'error' ? (syncError || 'Cloud sync failed; retry scheduled') : syncState === 'syncing' ? 'Synchronisation cloud…' : 'Bibliothèque synchronisée'"
      :aria-label="syncState === 'error' ? 'Erreur de synchronisation cloud' : syncState === 'syncing' ? 'Synchronisation cloud en cours' : 'Bibliothèque synchronisée'"
    ></span>
    <button v-if="isAdmin && title === 'Aide'" class="tb-btn" aria-label="Préférences d’affichage" @click="menuOpen = !menuOpen">
      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
      <span class="lbl">Affichage</span>
    </button>
    <button class="tb-btn sheet-size" type="button" :aria-label="expanded ? 'Réduire le panneau' : 'Agrandir le panneau'" :aria-expanded="expanded" @click="emit('toggle-size')">{{ expanded ? '⌄' : '⌃' }}</button>
    <button class="close" aria-label="Fermer" @click="emit('close')">✕</button>
    <DenseViewMenu v-if="menuOpen && isAdmin" @close="menuOpen = false" />
  </header>
</template>

<style scoped>
.sync-state {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--muted, #777);
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 16%, transparent);
}
.sync-state.syncing { background: #e6a93d; animation: sync-pulse 1s ease-in-out infinite; }
.sync-state.synced { background: #46bf78; }
.sync-state.error { background: #e35d6a; }
@keyframes sync-pulse { 50% { opacity: .4; } }
</style>
