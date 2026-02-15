import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vite.dev/config/
export default defineConfig({
  base: './',  // Chemins relatifs pour servir depuis n'importe quel dossier
  plugins: [
      vue(),
      wasm(),
      topLevelAwait()
  ],
  build: {
    outDir: 'dist',
    assetsDir: ''  // Met les assets à la racine au lieu de assets/
  }
})
