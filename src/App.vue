<script setup lang="ts">
import MandelbrotNavigator from "./components/MandelbrotNavigator.vue";
import { ref, onMounted } from "vue";

const isWebGPUSupported = ref(false);
const isFrench = ref(true);

onMounted(() => {
  isWebGPUSupported.value = typeof navigator !== "undefined" && "gpu" in navigator;
  if (typeof navigator !== "undefined") {
    isFrench.value = navigator.language.startsWith("fr");
  }
});
</script>

<template>
  <div id="fullscreen" v-if="isWebGPUSupported">
    <MandelbrotNavigator />
  </div>
  <div v-else class="section is-flex is-flex-direction-column is-align-items-center is-justify-content-center" style="height: 100vh;">
    <div class="box has-text-centered" style="max-width: 400px;">
      <span class="icon is-large has-text-danger">
        <i class="fas fa-exclamation-triangle fa-2x"></i>
      </span>
      <h1 class="title is-4 mt-3">
        {{ isFrench ? "WebGPU non supporté" : "WebGPU not supported" }}
      </h1>
      <p>
        <span v-if="isFrench">
          Ce navigateur ne supporte pas WebGPU.<br>
          Veuillez utiliser un navigateur compatible WebGPU.
        </span>
        <span v-else>
          This browser does not support WebGPU.<br>
          Please use a WebGPU-compatible browser.
        </span>
      </p>
      <a class="button is-link mt-4" href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility" target="_blank">
        {{ isFrench ? "Liste des navigateurs compatibles WebGPU" : "List of WebGPU-compatible browsers" }}
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
