<script setup lang="ts">
import {onMounted, ref} from 'vue'

import {run_web} from "mandelbrot"

onMounted(() => {
  window.addEventListener('resize', resize)
  resize()
  run_web()
})

function resize() {
  canvas.height = canvas.parentElement.clientHeight
  canvas.width = canvas.parentElement.clientWidth
}

</script>

<template>
  <canvas id="canvas"></canvas>
</template>

<style>
canvas {
  width: 100%;
  height: 100%;
}
</style>
