<script setup lang="ts">
import { computed } from 'vue';
import { DenseSection } from './dense';
import { getKeyboardLayout, getShortcutGroups } from '../keyboardShortcuts';

const shortcutGroups = computed(() => getShortcutGroups(getKeyboardLayout()));
</script>

<template>
  <div class="about-tab sections">
    <DenseSection
      title="Aide"
      scope="Raccourcis clavier"
      icon='<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.6-2.5 2.1-2.5 3.8M12 17h.01"/>'
    >
      <div class="shortcut-groups">
        <div v-for="group in shortcutGroups" :key="group.label" class="shortcut-group">
          <span class="shortcut-label">{{ group.label }}</span>
          <div class="shortcut-keys">
            <span v-for="(k, i) in group.keys" :key="i" class="tag is-black is-rounded">{{ k }}</span>
          </div>
        </div>
      </div>
    </DenseSection>

    <DenseSection
      title="Crédits"
      scope="Technologies & projet"
      icon='<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'
    >
      <p class="about-credit-line">
        <a href="https://wgpu.rs/" target="_blank" rel="noopener" class="about-link" aria-label="wGPU">
          Made with
          <img
            src="https://raw.githubusercontent.com/gfx-rs/wgpu/refs/heads/trunk/logo.png"
            alt="wGPU logo"
            class="wgpu-logo"
          />
        </a>
      </p>
      <p class="about-credit-line">
        <a href="https://github.com/gcollombet/mandelbrot" target="_blank" rel="noopener" class="about-link" aria-label="GitHub">
          <svg class="github-logo" height="18" viewBox="0 0 16 16" width="18" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
          GitHub
        </a>
      </p>
      <p class="about-blurb">
        Ce moteur de rendu Mandelbrot en temps réel est développé par Guillaume Collombet.
        Il s'appuie sur WebGPU pour le calcul GPU parallèle, Vue 3 pour l'interface,
        et Rust/WebAssembly pour les calculs de référence en précision arbitraire.
      </p>
    </DenseSection>

    <a href="./presentation/" class="about-presentation-cta">
      <i class="fa-solid fa-display fa-fw"></i>
      Découvrir la présentation complète
    </a>
  </div>
</template>

<style scoped>
.about-tab {
  display: flex;
  flex-direction: column;
  gap: var(--gap, 12px);
}

.shortcut-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.shortcut-label {
  font-weight: 600;
  min-width: 4.5em;
  font-size: 0.82rem;
  color: var(--ink-2);
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-wrap: wrap;
}

.shortcut-keys .tag {
  font-size: 0.72rem;
  padding: 2px 8px;
  height: auto;
  line-height: 1.5;
  background-color: var(--row-on);
  color: var(--accent-bright);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: var(--mono);
}

.about-credit-line {
  margin: 0 0 8px;
}

.about-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-2);
  text-decoration: underline;
  transition: color 0.2s;
}

.about-link:hover {
  color: var(--accent-bright);
}

.wgpu-logo {
  height: 20px;
  width: 20px;
  vertical-align: middle;
}

.github-logo {
  display: inline-block;
  vertical-align: middle;
}

.about-blurb {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: var(--ink-2);
  line-height: 1.5;
}

.about-presentation-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  color: var(--accent-bright);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.02em;
  transition: background 0.2s, color 0.2s, transform 0.15s;
}

.about-presentation-cta:hover {
  background: var(--accent);
  color: #fff;
  transform: scale(1.02);
}
</style>
