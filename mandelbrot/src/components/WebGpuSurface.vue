<script setup lang="ts">
import { onMounted, ref } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

const antialiasLevel = 4; // Change à 2 ou 4 pour x2 ou x4

function drawMandelbrot(
    ctx: GPUCanvasContext,
    device: GPUDevice,
    format: GPUTextureFormat,
    width: number,
    height: number,
    cx: number,
    cy: number,
    scale: number,
    antialiasLevel: number
) {
  // Shader WGSL Mandelbrot avec supersampling
  const shaderCode = `
    struct Uniforms {
      cx: f32,
      cy: f32,
      scale: f32,
      aspect: f32,
      aa: i32,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    struct VertexOutput {
      @builtin(position) position : vec4<f32>,
      @location(0) fragCoord : vec2<f32>
    };

    @vertex
    fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
      var pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>( 1.0,  1.0)
      );
      var out : VertexOutput;
      out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
      out.fragCoord = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
      return out;
    }

    fn mandelbrot(x0: f32, y0: f32) -> vec3<f32> {
      let max_iter: i32 = 256;
      var x: f32 = 0.0;
      var y: f32 = 0.0;
      var iter: i32 = 0;
      while (x*x + y*y <= 4.0 && iter < max_iter) {
        let xtemp = x*x - y*y + x0;
        y = 2.0*x*y + y0;
        x = xtemp;
        iter = iter + 1;
      }
      if (iter == max_iter) {
        return vec3<f32>(0.0, 0.0, 0.0);
      }
      let t = f32(iter) / f32(max_iter);
      return vec3<f32>(t, t*t, 0.5 + 0.5*t);
    }

    @fragment
    fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
      var color = vec3<f32>(0.0, 0.0, 0.0);
      let aa = uniforms.aa;
      if (aa == 2) {
        let offsets = array<vec2<f32>, 2>(
          vec2<f32>(0.25, 0.25),
          vec2<f32>(0.75, 0.75)
        );
        for (var i = 0; i < 2; i = i + 1) {
          let uv = fragCoord + (offsets[i] - vec2<f32>(0.5, 0.5)) / f32(${width});
          let x0 = (uv.x * 2.0 - 1.0) * uniforms.scale * uniforms.aspect + uniforms.cx;
          let y0 = (uv.y * 2.0 - 1.0) * uniforms.scale + uniforms.cy;
          color = color + mandelbrot(x0, y0);
        }
        color = color / 2.0;
      } else if (aa == 4) {
        let offsets = array<vec2<f32>, 4>(
          vec2<f32>(0.25, 0.25),
          vec2<f32>(0.75, 0.25),
          vec2<f32>(0.25, 0.75),
          vec2<f32>(0.75, 0.75)
        );
        for (var i = 0; i < 4; i = i + 1) {
          let uv = fragCoord + (offsets[i] - vec2<f32>(0.5, 0.5)) / f32(${width});
          let x0 = (uv.x * 2.0 - 1.0) * uniforms.scale * uniforms.aspect + uniforms.cx;
          let y0 = (uv.y * 2.0 - 1.0) * uniforms.scale + uniforms.cy;
          color = color + mandelbrot(x0, y0);
        }
        color = color / 4.0;
      } else {
        let x0 = (fragCoord.x * 2.0 - 1.0) * uniforms.scale * uniforms.aspect + uniforms.cx;
        let y0 = (fragCoord.y * 2.0 - 1.0) * uniforms.scale + uniforms.cy;
        color = mandelbrot(x0, y0);
      }
      return vec4<f32>(color, 1.0);
    }
  `;

  // Création du buffer uniform
  const uniformData = new Float32Array([
    cx,
    cy,
    scale,
    width / height,
    antialiasLevel
  ]);
  const uniformBuffer = device.createBuffer({
    size: uniformData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(uniformBuffer, 0, uniformData.buffer);

  const shaderModule = device.createShaderModule({ code: shaderCode });
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule, entryPoint: 'vs_main' },
    fragment: { module: shaderModule, entryPoint: 'fs_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' }
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
  });

  const commandEncoder = device.createCommandEncoder();
  const textureView = ctx.getCurrentTexture().createView();
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: textureView,
      clearValue: { r: 1, g: 1, b: 1, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }]
  });
  renderPass.setPipeline(pipeline);
  renderPass.setBindGroup(0, bindGroup);
  renderPass.draw(6, 1, 0, 0);
  renderPass.end();
  device.queue.submit([commandEncoder.finish()]);
}

async function initWebGPU() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  if (!navigator.gpu) {
    alert('WebGPU non supporté sur ce navigateur.');
    return;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return;
  const device = await adapter.requestDevice();
  const ctx = canvas.getContext('webgpu') as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'opaque' });

  // Point d'intérêt (zoom deep)
  let cx = -0.743643887037158704752191506114774;
  let cy = 0.131825904205311970493132056385139;
  let scale = 2.5;
  let isUserZooming = false;
  let moveStep = 0.05; // déplacement relatif à scale

  // Variables pour navigation fluide
  let targetCx = cx;
  let targetCy = cy;
  let targetScale = scale;
  let velocityCx = 0;
  let velocityCy = 0;
  let velocityScale = 0;
  const accel = 0.15; // accélération
  const damping = 0.0; // amortissement

  function handleKeydown(e: KeyboardEvent) {
    // ZQSD
    if (e.key === 'z' || e.key === 'Z') {
      targetCy += moveStep * targetScale;
    } else if (e.key === 's' || e.key === 'S') {
      targetCy -= moveStep * targetScale;
    } else if (e.key === 'q' || e.key === 'Q') {
      targetCx -= moveStep * targetScale;
    } else if (e.key === 'd' || e.key === 'D') {
      targetCx += moveStep * targetScale;
    }
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    isUserZooming = true;
    const zoomFactor = 0.9;
    if (e.deltaY < 0) {
      targetScale *= zoomFactor;
    } else {
      targetScale /= zoomFactor;
    }
  }

  const interestPointCollection = [
    { cx: -0.743643887037158704752191506114774, cy: 0.131825904205311970493132056385139 }, // Deep zoom
    { cx: -1.749705768080503, cy: -6.13369029080495e-05 }, // Zoom sur une autre région intéressante
    { cx: -0.5503295086752807, cy:-0.6259346555912755 }, // Zoom sur une autre région intéressante
    { cx: 1.9854527029227764, cy:0.00019009159314173224}, // Zoom sur une autre région intéressante
    { cx: -0.19569582393630502, cy: 1.1000276413181806}, // Zoom sur une autre région intéressante
  ];
  let currentInterestIndex = 0;
  function resize() {
    if(!canvas) return;
    canvas.height = canvas.parentElement?.clientHeight || 0;
    canvas.width = canvas.parentElement?.clientWidth || 0;
  }

  function animate() {
    resize();
    if (!canvas) return;
    // Animation fluide vers la cible
    velocityCx = (targetCx - cx) * accel + velocityCx * damping;
    velocityCy = (targetCy - cy) * accel + velocityCy * damping;
    velocityScale = (targetScale - scale) * accel + velocityScale * damping;
    cx += velocityCx;
    cy += velocityCy;
    scale += velocityScale;
    drawMandelbrot(ctx, device, format, canvas.width, canvas.height, cx, cy, scale, antialiasLevel);
    // Zoom auto si pas d'interaction utilisateur
    if (!isUserZooming && scale > 0.0001) {
      targetScale *= 0.985;
    }
    if (scale < 0.0001) {
      currentInterestIndex = (currentInterestIndex + 1) % interestPointCollection.length;
      const point = interestPointCollection[currentInterestIndex];
      targetCx = cx = point.cx;
      targetCy = cy = point.cy;
      targetScale = scale = 2.5;
      velocityCx = velocityCy = velocityScale = 0;
      isUserZooming = false;
    }
    requestAnimationFrame(animate);
  }

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startCx = 0;
  let startCy = 0;

  function getCanvasCoords(e: MouseEvent) {
    const canvas = canvasRef.value;
    if (!canvas) return { x: 0, y: 0, width: 0, height: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  function handleMouseDown(e: MouseEvent) {
    isDragging = true;
    const coords = getCanvasCoords(e);
    startX = coords.x;
    startY = coords.y;
    startCx = targetCx;
    startCy = targetCy;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const coords = getCanvasCoords(e);
    const dx = coords.x - startX;
    const dy = coords.y - startY;
    targetCx = startCx - dx * targetScale * 2 / coords.width * (coords.width / coords.height);
    targetCy = startCy + dy * targetScale * 2 / coords.height;
  }

  function handleMouseUp() {
    isDragging = false;
  }

  // Ajout des listeners
  window.addEventListener('keydown', handleKeydown);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  animate();
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
