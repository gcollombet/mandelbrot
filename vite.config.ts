import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vite.dev/config/
export default defineConfig({
  base: './',  // Chemins relatifs pour servir depuis n'importe quel dossier
  // `referenceWorker.ts` imports both the wasm-bindgen classes and their
  // exported linear memory for zero-copy buffer reads. Pre-bundling the linked
  // local package can instantiate a second copy of the WASM module after a
  // rebuild, leaving class pointers and `memory.buffer` unrelated.
  optimizeDeps: {
      exclude: ['mandelbrot']
  },
  plugins: [
      vue(),
      wasm(),
      topLevelAwait()
  ],
  worker: {
    format: 'es',
    plugins: () => [
      wasm(),
      topLevelAwait()
    ]
  },
  build: {
    target: 'esnext',
    outDir: 'docs',
    assetsDir: ''  // Met les assets à la racine au lieu de assets/
  }
})
