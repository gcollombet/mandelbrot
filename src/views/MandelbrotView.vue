<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import {computed, onMounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import MandelbrotViewer from '../components/MandelbrotViewer.vue';
import SplashScreen from '../components/SplashScreen.vue';
const { t } = useI18n();

const route = useRoute();
const isWebGPUSupported = ref(false);
// DEV FLAG: `?forceui` renders the UI even without WebGPU. Keeping this in the
// route makes browser back/forward update the shell without reloading the page.
const forceUI = computed(() => Object.prototype.hasOwnProperty.call(route.query, 'forceui'));

onMounted(() => {
  isWebGPUSupported.value = typeof navigator !== 'undefined' && 'gpu' in navigator;
});
</script>

<template>
  <div id="fullscreen" v-if="isWebGPUSupported || forceUI">
    <MandelbrotViewer />
    <SplashScreen />
  </div>
  <div v-else class="section is-flex is-flex-direction-column is-align-items-center is-justify-content-center" style="height: 100vh;">
    <div class="box has-text-centered" style="max-width: 400px;">
      <span class="icon is-large has-text-danger">
        <i class="fas fa-exclamation-triangle fa-2x"></i>
      </span>
      <h1 class="title is-4 mt-3">
        {{ t('app.webgpu.title') }}
      </h1>
      <p>
        {{ t('app.webgpu.body1') }}<br>
        {{ t('app.webgpu.body2') }}
      </p>
      <a class="button is-link mt-4" href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility" target="_blank">
        {{ t('app.webgpu.browserList') }}
      </a>
    </div>
  </div>
</template>

<style>
#fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
html, body {
  overscroll-behavior-y: contain;
}
</style>
