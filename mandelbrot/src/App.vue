<script setup lang="ts">
import WebGpuSurface from "./components/WebGpuSurface.vue";
import {onMounted} from "vue";

onMounted(() => {


})
</script>

<template>
  <div id="fullscreen">
    <WebGpuSurface/>
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

</style>
