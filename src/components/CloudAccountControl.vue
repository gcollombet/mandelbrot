<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  signedIn: boolean;
  email: string;
  cloudEnabled: boolean;
  busy: boolean;
  error?: string;
  syncState: 'idle' | 'syncing' | 'synced' | 'error';
  contextual?: boolean;
  compact?: boolean;
}>();
const emit = defineEmits<{ login: []; logout: [] }>();
const status = computed(() => {
  if (!props.cloudEnabled) return 'Compte connecté';
  if (props.syncState === 'syncing') return 'Sauvegarde cloud en cours…';
  if (props.syncState === 'synced') return 'Presets synchronisés';
  if (props.syncState === 'error') return 'Sauvegarde cloud à vérifier';
  return 'Presets · synchronisation cloud';
});
</script>

<template>
  <div class="cloud-account" :class="{ contextual, compact }" @pointerdown.stop @touchstart.stop @touchend.stop @wheel.stop>
    <template v-if="!signedIn">
      <p v-if="contextual && cloudEnabled" class="explanation">Vos presets personnels restent dans ce navigateur. Connectez-vous pour les sauvegarder dans le cloud et les retrouver sur vos autres appareils.</p>
      <button class="account-trigger guest" type="button" aria-label="Connexion avec Google — sauvegarde des presets dans le cloud" :disabled="busy" @click="emit('login')"
        :title="cloudEnabled ? 'Connexion avec Google pour sauvegarder vos presets dans votre bibliothèque cloud personnelle' : 'Connexion avec Google'">
        <i class="fa-solid fa-cloud" aria-hidden="true"></i>
        <span class="account-copy">
          <strong>{{ busy ? 'Connexion…' : compact ? 'Connexion' : 'Se connecter avec Google' }}</strong>
          <small v-if="cloudEnabled && !compact">Sauvegarder mes presets dans le cloud</small>
        </span>
      </button>
    </template>
    <details v-else class="account-menu">
      <summary class="account-trigger" :class="syncState" :title="status" :aria-label="`Mon compte — ${status}`">
        <i class="fa-solid fa-cloud" aria-hidden="true"></i>
        <span class="account-copy"><strong>Mon compte</strong><small v-if="!compact" role="status">{{ status }}</small></span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div class="account-details">
        <p v-if="compact" role="status">{{ status }}</p>
        <strong class="email">{{ email || 'Compte Google connecté' }}</strong>
        <p v-if="cloudEnabled">Vos presets personnels sont synchronisés avec ce compte pour les retrouver sur vos appareils.</p>
        <p v-if="cloudEnabled && syncState === 'error'" role="alert">La synchronisation avec le cloud a échoué. Vos modifications restent disponibles dans ce navigateur.</p>
        <button type="button" :disabled="busy" @click="emit('logout')">{{ busy ? 'Déconnexion…' : 'Se déconnecter' }}</button>
      </div>
    </details>
    <p v-if="error" class="account-error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.cloud-account { position: relative; max-width: calc(100vw - 24px); pointer-events: auto; color: #f4f1ff; font: 12px/1.4 var(--sans, sans-serif); }
.account-trigger { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 7px 12px; border: 1px solid #a89be478; border-radius: 10px; background: #171523ed; color: inherit; cursor: pointer; text-align: left; font: inherit; box-shadow: 0 4px 16px #0003; }
.account-trigger:hover { background: #302841; border-color: #c1b3ff; }
.account-trigger:focus-visible, .account-details button:focus-visible { outline: 2px solid #c1b3ff; outline-offset: 3px; }
.account-trigger:disabled, .account-details button:disabled { opacity: .65; cursor: wait; }
.account-trigger > i { color: #c1b3ff; font-size: 17px; }
.account-copy { display: flex; flex-direction: column; gap: 1px; }
.account-copy strong { font-size: 12px; font-weight: 650; }
.account-copy small { font-size: 11px; color: #ded8ee; }
.account-menu summary { list-style: none; }
.account-menu summary::-webkit-details-marker { display: none; }
.account-trigger.synced > i { color: #81d7a5; }
.account-trigger.error > i { color: #ffbd83; }
.account-details, .account-error { padding: 12px; border: 1px solid #796d91; border-radius: 10px; background: #191622; box-shadow: 0 8px 24px #0005; }
.account-details { position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%); width: min(300px, calc(100vw - 24px)); box-sizing: border-box; }
.email { display: block; overflow-wrap: anywhere; }
p { margin: 0 0 10px; }
.account-details p { margin-top: 8px; }
.account-details button { min-height: 36px; padding: 5px 10px; border: 1px solid #796d91; border-radius: 6px; background: #302841; color: inherit; cursor: pointer; font: inherit; }
.account-error { max-width: 300px; margin-top: 6px; color: #ffd0ca; }
.contextual { max-width: none; margin: 10px 12px; padding: 10px; border: 1px solid var(--line, #796d91); border-radius: 10px; background: var(--row, #191622); color: var(--ink, #f4f1ff); }
.explanation { font-size: 12px; line-height: 1.5; }
.compact { align-self: stretch; flex-shrink: 0; }
.compact .account-trigger { min-height: 32px; height: 100%; box-sizing: border-box; padding: 6px 9px; gap: 7px; border: 0; border-radius: 8px; background: transparent; box-shadow: none; color: var(--ink-2, #d5d1dc); }
.compact .account-trigger:hover { background: #ffffff0d; color: var(--ink, #fff); }
.compact .account-trigger > i { color: inherit; font-size: 13px; }
.compact .account-trigger.synced > i { color: #81d7a5; }
.compact .account-trigger.error > i { color: #ffbd83; }
.compact .account-menu { height: 100%; }
.compact .account-details { left: auto; right: 0; transform: none; }
.compact .account-error { position: absolute; right: 0; top: 100%; width: min(280px, calc(100vw - 24px)); box-sizing: border-box; }
@media (max-width: 1023px) {
  .compact .account-copy, .compact summary > span:last-child { display: none; }
  .compact .account-trigger { min-width: 32px; justify-content: center; }
}
</style>
