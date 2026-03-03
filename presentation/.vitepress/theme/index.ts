import DefaultTheme from 'vitepress/theme-without-fonts'
import ImageViewerP from '@miletorix/vitepress-image-viewer'
import '@miletorix/vitepress-image-viewer/style.css'
import CustomLayout from './CustomLayout.vue'

import './custom.css'

export default {
    extends: DefaultTheme,
    Layout: CustomLayout,
    enhanceApp(ctx) {
        ImageViewerP(ctx.app)
    }
}