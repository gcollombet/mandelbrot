import { createApp } from 'vue'
import './style.css'
import './dense.css'
import App from './App.vue'
import {router} from './router'
// import the pkg

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('./sw.js')
    } else {
      navigator.serviceWorker.getRegistrations().then(r => r.forEach(s => s.unregister()))
    }
  });
}

createApp(App).use(router).mount('#app')
