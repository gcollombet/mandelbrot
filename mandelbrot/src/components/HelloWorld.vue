<script setup lang="ts">
import {onMounted} from 'vue'

// import {run_web} from "mandelbrot"

onMounted(() => {
  window.addEventListener('resize', resize)
  resize()
  // run_web()
})

function resize() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  if (!canvas || !canvas.parentElement) return
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
