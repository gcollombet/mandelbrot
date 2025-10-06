import DefaultTheme from 'vitepress/theme-without-fonts'
import ImageViewerP from '@miletorix/vitepress-image-viewer'
import '@miletorix/vitepress-image-viewer/style.css'

import './custom.css'

export default {
    extends: DefaultTheme,
    enhanceApp(ctx) {
        ImageViewerP(ctx.app)
    }
}