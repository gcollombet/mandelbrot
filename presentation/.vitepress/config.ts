import {defineConfig} from 'vitepress'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "Mandelbrot",
    description: "Realtime Online Mandelbrot set explorer",
    // Sous-chemin correspondant à GitHub Pages : gcollombet.github.io/mandelbrot/presentation/
    base: '/mandelbrot/presentation/',
    // Sortie directement dans docs/presentation/ pour cohabiter avec le viewer
    outDir: '../docs/presentation',
    markdown: {
        math: true
    },
    vite: {
        plugins: [
            wasm(),
            topLevelAwait()
        ],
        build: {
            target: 'esnext'
        },
        worker: {
            format: 'es',
            plugins: () => [
                wasm(),
                topLevelAwait()
            ]
        },
        ssr: {
            noExternal: ['mandelbrot']
        }
    },
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {text: 'Home', link: '/'},
            {text: 'Optimisations', link: '/optimisation'},
            {text: 'Mathématiques', link: '/mathematiques'},
        ],
        sidebar: [
            {
                items: [
                    {text: 'Présentation', link: '/'},
                    {text: 'Optimisations de rendu', link: '/optimisation'},
                    {text: 'Mathématiques et preuves Lean', link: '/mathematiques'},
                ]
            }
        ],
        socialLinks: [
            {icon: 'github', link: 'https://github.com/gcollombet/mandelbrot'}
        ]
    }
})
