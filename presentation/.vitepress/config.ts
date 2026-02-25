import {defineConfig} from 'vitepress'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "Mandelbrot",
    description: "Realtime Online Mandelbrot set explorer",
    markdown: {
        math: true
    },
    vite: {
        plugins: [
            wasm(),
            topLevelAwait()
        ],
        ssr: {
            noExternal: ['mandelbrot']
        }
    },
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {text: 'Home', link: '/'},
            {text: 'Optimisations', link: '/optimisation'},
        ],
        sidebar: [
            {
                items: [
                    {text: 'Présentation', link: '/'},
                    {text: 'Optimisations de rendu', link: '/optimisation'},
                ]
            }
        ],
        socialLinks: [
            {icon: 'github', link: 'https://github.com/vuejs/vitepress'}
        ]
    }
})
