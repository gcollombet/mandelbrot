<script setup lang="ts">
import WebGpuSurface from "./components/WebGpuSurface.vue";
import {onMounted} from "vue";
import HelloWorld from "./components/HelloWorld.vue";
onMounted(() => {
  const elem = document.getElementById("fullscreen");
    elem.webkitRequestFullscreen()
})
</script>

<template>
  <div id="fullscreen">
    <WebGpuSurface/>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
