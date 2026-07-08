<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {getKeyboardLayout, getShortcutGroups} from '../keyboardShortcuts';

const visible = ref(true);
const isFrench = ref(true);
const shortcutGroups = computed(() => getShortcutGroups(getKeyboardLayout()));

let autoDismissTimer: number | null = null;

function dismiss() {
  visible.value = false;
  if (autoDismissTimer !== null) {
    clearTimeout(autoDismissTimer);
    autoDismissTimer = null;
  }
}

onMounted(() => {
  if (typeof navigator !== 'undefined') {
    isFrench.value = navigator.language.startsWith('fr');
  }
  autoDismissTimer = window.setTimeout(dismiss, 10000);
});

onBeforeUnmount(() => {
  if (autoDismissTimer !== null) clearTimeout(autoDismissTimer);
});
</script>

<template>
  <div class="splash" :class="{ hide: !visible }" @click="dismiss" @touchend.prevent="dismiss">
    <div class="mark">
      <svg viewBox="0 0 54 54" aria-hidden="true">
        <defs>
          <linearGradient id="splash-mark-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="oklch(0.78 0.16 240)"/>
            <stop offset="1" stop-color="oklch(0.77 0.15 322)"/>
          </linearGradient>
        </defs>
        <path d="M38 27c0-2.8-1.6-5.2-4.2-6 1-1.1 1.6-2.6 1.6-4.2 0-3.5-2.8-6.3-6.3-6.3-4.6 0-7 3.6-7.6 6.8-4.7.8-9.5 4.4-9.5 10.7 0 6.2 4.8 9.9 9.5 10.7.6 3.2 3 6.8 7.6 6.8 3.5 0 6.3-2.8 6.3-6.3 0-1.6-.6-3.1-1.6-4.2 2.6-.8 4.2-3.2 4.2-6z"
          fill="none" stroke="url(#splash-mark-gradient)" stroke-width="2.4" stroke-linejoin="round"/>
        <circle cx="42.5" cy="27" r="3.4" fill="url(#splash-mark-gradient)"/>
        <circle cx="48.5" cy="27" r="1.6" fill="url(#splash-mark-gradient)" opacity="0.7"/>
      </svg>
    </div>
    <p class="kicker">Realtime</p>
    <h2>Mandelbrot<br><span class="grad">Renderer</span></h2>
    <div class="loader"></div>
    <div class="shortcut-groups">
      <div v-for="group in shortcutGroups" :key="group.label" class="shortcut-group">
        <span class="shortcut-label">{{ group.label }}</span>
        <div class="shortcut-keys">
          <span v-for="(k, i) in group.keys" :key="i" class="shortcut-key">{{ k }}</span>
        </div>
      </div>
    </div>
    <p class="tap">{{ isFrench ? 'Toucher pour explorer' : 'Tap to explore' }}</p>
  </div>
</template>

<style scoped>
.splash {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(420px 300px at 50% 32%, oklch(0.4 0.14 280 / 0.35), transparent 70%),
    rgba(5, 6, 10, 0.62);
  backdrop-filter: blur(22px) saturate(1.2);
  -webkit-backdrop-filter: blur(22px) saturate(1.2);
  cursor: pointer;
  opacity: 1;
  transition: opacity 0.5s ease, visibility 0.5s;
}

.splash.hide {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.splash .mark {
  position: relative;
  width: 108px;
  height: 108px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin-bottom: 30px;
  isolation: isolate;
}

.splash .mark::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  z-index: -2;
  background: conic-gradient(from var(--ai-angle, 0deg),
    var(--accent-bright), var(--mauve-bright), var(--magenta), var(--accent), var(--accent-bright));
  animation: ai-spin 6s linear infinite;
  filter: blur(0.5px) drop-shadow(0 0 26px oklch(0.65 0.18 290 / 0.6));
}

.splash .mark::after {
  content: "";
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  z-index: -1;
  background: #0a0c12;
}

.splash .mark svg {
  width: 54px;
  height: 54px;
  position: relative;
  z-index: 1;
}

.splash .kicker {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.38em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 14px;
}

.splash h2 {
  font-family: var(--sans);
  font-size: 34px;
  line-height: 1.12;
  font-weight: 700;
  letter-spacing: -0.015em;
  text-align: center;
  max-width: 300px;
  color: var(--ink);
  margin: 0;
}

.splash h2 .grad {
  background: linear-gradient(100deg, var(--accent-bright), var(--mauve-bright));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.splash .loader {
  width: 180px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  margin: 36px 0 0;
  overflow: hidden;
  position: relative;
  border: none;
  animation: none;
}

.splash .loader::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent-bright), var(--mauve-bright));
  transform-origin: left;
  transform: scaleX(0);
  animation: splash-load 2.2s cubic-bezier(0.25, 0.8, 0.35, 1) forwards;
}

@keyframes splash-load {
  to { transform: scaleX(1); }
}

.splash .shortcut-groups {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 28px;
  opacity: 0;
  animation: splash-tap-in 0.4s ease 2.3s forwards;
}

.splash .shortcut-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.splash .shortcut-label {
  font-size: 0.72rem;
  font-weight: 600;
  min-width: 4.2em;
  text-align: right;
  color: var(--ink-3);
}

.splash .shortcut-keys {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-wrap: wrap;
}

.splash .shortcut-key {
  font-family: var(--mono);
  font-size: 0.68rem;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--line);
  color: var(--ink-2);
}

.splash .tap {
  margin-top: 22px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-2);
  opacity: 0;
  animation: splash-tap-in 0.4s ease 2.3s forwards, splash-tap-pulse 2.2s ease 2.8s infinite;
}

@keyframes splash-tap-in {
  to { opacity: 1; }
}

@keyframes splash-tap-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

@media (prefers-reduced-motion: reduce) {
  .splash .mark::before {
    animation: none;
  }
  .splash .loader::before {
    animation-duration: 0.01s;
  }
  .splash .tap {
    animation: splash-tap-in 0.01s forwards;
  }
}
</style>
