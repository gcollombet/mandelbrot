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
        ]
    },
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {text: 'Home', link: '/'},
        ],
        sidebar: [],
        socialLinks: [
            {icon: 'github', link: 'https://github.com/vuejs/vitepress'}
        ]
    }
})
