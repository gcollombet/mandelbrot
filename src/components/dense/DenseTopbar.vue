<script setup lang="ts">
import { ref } from 'vue';
import DenseViewMenu from './DenseViewMenu.vue';

interface PTab { value: string; label: string }

defineProps<{
  title: string;
  /** Optional primary grouping tabs (sets data-primary on the panel root). */
  ptabs?: PTab[];
  /** Currently active ptab value. */
  primary?: string;
  /** The "Affichage" view menu is admin-only. */
  isAdmin?: boolean;
  /** Whether auth is configured for this deployment — shows the Login/Logout control when true. */
  authConfigured?: boolean;
  /** Signed-in user's email, if any. Empty/undefined renders the "Login" state. */
  authUserEmail?: string;
  syncState?: 'idle' | 'syncing' | 'synced' | 'error';
  syncError?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:primary', v: string): void;
  /** Forwarded pointerdown on the brand area, for the host to drive window drag. */
  (e: 'drag-start', ev: PointerEvent): void;
  (e: 'login'): void;
  (e: 'logout'): void;
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
    <button
      v-if="authConfigured"
      class="tb-btn auth-btn"
      type="button"
      :title="authUserEmail ? 'Logout (' + authUserEmail + ')' : 'Login'"
      @click="authUserEmail ? emit('logout') : emit('login')"
    >
      <svg v-if="authUserEmail" viewBox="0 0 24 24"><path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 12H3m0 0l3-3m-3 3l3 3"/></svg>
      <svg v-else viewBox="0 0 24 24"><path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M3 12h11m0 0l-3-3m3 3l-3 3"/></svg>
      <span class="lbl">{{ authUserEmail ? 'Logout' : 'Login' }}</span>
    </button>
    <button v-if="isAdmin" class="tb-btn" @click="menuOpen = !menuOpen">
      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
      <span class="lbl">Affichage</span>
    </button>
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
