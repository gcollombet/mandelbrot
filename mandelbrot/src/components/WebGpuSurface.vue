<script setup lang="ts">
import { onMounted, ref } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

// Taille du damier
const GRID_SIZE = 25

function drawCheckerboard(
    ctx: GPUCanvasContext,
    device: GPUDevice,
    format: GPUTextureFormat,
    width: number,
    height: number
) {
  // Pour un damier simple, on va utiliser un shader WGSL minimal
  const shaderCode = `
    @vertex
    fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> @builtin(position) vec4<f32> {
      var pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>( 1.0,  1.0)
      );
      return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
    }

    @fragment
    fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
      let cell_width = f32(${width}) / f32(${GRID_SIZE});
      let cell_height = f32(${height}) / f32(${GRID_SIZE});
      let x = u32(pos.x / cell_width);
      let y = u32(pos.y / cell_height);
      let checker = (x + y) % 2u;
      // Coordonnées locales dans la case (0.0 à 1.0)
      let local_x = fract(pos.x / cell_width);
      let local_y = fract(pos.y / cell_height);
      // Dégradé diagonal sur chaque case
      let t = (local_x + local_y) * 0.5;
      let color_a = select(vec3<f32>(1.0,0.2,0.5), vec3<f32>(0.7,0.1,0.5), checker == 1u);
      let color_b = select(vec3<f32>(0.8,0.8,1.0), vec3<f32>(0.2,0.2,0.3), checker == 1u);
      let color = mix(color_a, color_b, t);
      return vec4<f32>(color, 1.0);
    }
  `

  const shaderModule = device.createShaderModule({ code: shaderCode })
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule, entryPoint: 'vs_main' },
    fragment: { module: shaderModule, entryPoint: 'fs_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' }
  })

  const commandEncoder = device.createCommandEncoder()
  const textureView = ctx.getCurrentTexture().createView()
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: textureView,
      clearValue: { r: 0.9, g: 0.5, b: 0.5, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }]
  })
  renderPass.setPipeline(pipeline)
  renderPass.draw(6, 1, 0, 0)
  renderPass.end()
  device.queue.submit([commandEncoder.finish()])
}

async function initWebGPU() {
  const canvas = canvasRef.value
  if (!canvas) return
  if (!navigator.gpu) {
    alert('WebGPU non supporté sur ce navigateur.')
    return
  }
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) return
  const device = await adapter.requestDevice()
  const ctx = canvas.getContext('webgpu') as GPUCanvasContext
  const format = navigator.gpu.getPreferredCanvasFormat()
  ctx.configure({ device, format, alphaMode: 'opaque' })

  function resize() {
    if(!canvas) return
    canvas.height = canvas.parentElement.clientHeight
    canvas.width = canvas.parentElement.clientWidth
    drawCheckerboard(ctx, device, format, canvas.width, canvas.height)
  }

  window.addEventListener('resize', resize)
  resize()
}

onMounted(() => {
  initWebGPU()
})
</script>

<template>
    <canvas ref="canvasRef"></canvas>
</template>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
