import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// import the pkg

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/mandelbrot/sw.js');
  });
}

createApp(App).mount('#app')
