import {createRouter, createWebHistory} from 'vue-router';
import MandelbrotView from './views/MandelbrotView.vue';

export const MANDELBROT_ROUTE_NAME = 'mandelbrot';

// The production build deliberately uses a relative Vite base. Resolve it
// against the current document so history navigation stays under /mandelbrot/
// on GitHub Pages while remaining rooted at / during local development.
const routerBase = new URL(import.meta.env.BASE_URL, window.location.href).pathname;

export const router = createRouter({
  history: createWebHistory(routerBase),
  routes: [
    {
      path: '/',
      name: MANDELBROT_ROUTE_NAME,
      component: MandelbrotView,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});
