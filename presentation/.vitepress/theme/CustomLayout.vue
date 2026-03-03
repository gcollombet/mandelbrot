<script setup lang="ts">
import DefaultTheme from 'vitepress/theme-without-fonts'

const { Layout } = DefaultTheme

function goToExplorer() {
  window.location.href = '/mandelbrot/'
}
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <button
        class="explorer-button"
        title="Ouvrir l'explorateur Mandelbrot"
        @click="goToExplorer"
      >
        Ouvrir l'explorateur
      </button>
    </template>
  </Layout>
</template>

<style scoped>
.explorer-button {
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  margin-left: 12px;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-brand-1, #e25555);
  color: #fff !important;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none !important;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.explorer-button:hover {
  background: var(--vp-c-brand-2, #c94444);
  transform: scale(1.04);
}
</style>
