<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {mandelbrot, MandelbrotStep} from "mandelbrot"

const canvasRef = ref<HTMLCanvasElement | null>(null)

const antialiasLevel = 1; // Peut être 1, 2 ou 4
const palettePeriod = 128; // Nombre d'itérations avant répétition de la palette
const orbit: MandelbrotStep[] = mandelbrot(0, 0, 1000000);

function drawMandelbrot(
    ctx: GPUCanvasContext,
    device: GPUDevice,
    format: GPUTextureFormat,
    width: number,
    height: number,
    cx: number,
    cy: number,
    scale: number,
    antialiasLevel: number,
    angle: number
) {

  // --- Création du buffer d'orbite sous forme de structure ---
  const mandelbrotBufferData = new Float32Array(orbit.length * 4);
  for (let i = 0; i < orbit.length; i++) {
    mandelbrotBufferData[i * 4] = orbit[i].zx;
    mandelbrotBufferData[i * 4 + 1] = orbit[i].zy;
    mandelbrotBufferData[i * 4 + 2] = orbit[i].dx;
    mandelbrotBufferData[i * 4 + 3] = orbit[i].dy;
  }
  // Correction : utiliser STORAGE au lieu de UNIFORM
  const mandelbrotBuffer = device.createBuffer({
    size: mandelbrotBufferData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(mandelbrotBuffer, 0, mandelbrotBufferData.buffer);

  // TODO : c'est vraiment n'importe quoi, il faut mettre des créer les pipeline et tout ce qui peut être réutilisé en dehors de cette fonction


  // --- Première passe : calcul des itérations et dérivée ---
  const shaderCodePass1 = `
    struct MandelbrotStep {
      zx: f32,
      zy: f32,
      dx: f32,
      dy: f32,
    };
    struct Uniforms {
      cx: f32,
      cy: f32,
      scale: f32,
      aspect: f32,
      antialiasLevel: i32,
      angle: f32,
      palettePeriod: f32,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;
    // Correction : utiliser storage buffer
    @group(0) @binding(1) var<storage, read> mandelbrot: array<MandelbrotStep>;
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
    fn get_orbit_step(iter: i32) -> MandelbrotStep {
      let idx = clamp(iter, 0, i32(arrayLength(&mandelbrot)) - 1);
      return mandelbrot[idx];
    }
    fn mandelbrot_func(x0: f32, y0: f32) -> vec2<f32> {
      let max_iter_f: f32 = clamp(80.0 + 40.0 * log2(1.0 / uniforms.scale), 128.0, f32(arrayLength(&mandelbrot)));
      let max_iter: i32 = i32(max_iter_f);
      var x: f32 = 0.0;
      var y: f32 = 0.0;
      var iter: i32 = 0;
      var x2: f32 = 0.0;
      var y2: f32 = 0.0;
      var dx: f32 = 0.0;
      var dy: f32 = 0.0;
      var d: f32 = 1.0;
      while (x2 + y2 <= 1000.0 && iter < max_iter) {
        let xtemp = x*x - y*y + x0;
        y = 2.0*x*y + y0;
        x = xtemp;
        x2 = x*x;
        y2 = y*y;
        d = 2.0 * sqrt(x2 + y2);
        iter = iter + 1;
      }
      let step = get_orbit_step(iter);
      let log_zn = log(x2 + y2) / 2.0;
      let nu = f32(iter) + 1.0 - log(log_zn / log(2.0)) / log(2.0);
      return vec2<f32>(nu, d);
    }
    fn rotate(x: f32, y: f32, angle: f32) -> vec2<f32> {
      let s = sin(angle);
      let c = cos(angle);
      return vec2<f32>(c * x - s * y, s * x + c * y);
    }
    @fragment
    fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
      var xy = rotate((fragCoord.x * 2.0 - 1.0) * uniforms.scale * uniforms.aspect, (fragCoord.y * 2.0 - 1.0) * uniforms.scale, uniforms.angle);
      let x0 = xy.x + uniforms.cx;
      let y0 = xy.y + uniforms.cy;
      let res = mandelbrot_func(x0, y0);
      return vec4<f32>(res.x, res.y, 0.0, 1.0);
    }
  `;

  // --- Deuxième passe : coloration + bloom ---
  const bloomRadius = 2; // rayon du bloom (pixels)
  const bloomStrength = 0.7; // force du bloom
  const shaderCodePass2 = `
    struct Uniforms {
      palettePeriod: f32,
      bloomRadius: i32,
      bloomStrength: f32,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;
    @group(0) @binding(1) var tex: texture_2d<f32>;
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
    fn palette(v: f32, d: f32, dx: f32, dy: f32) -> vec3<f32> {
      let t = abs(v * 2.0 - 1.0);
      let r = 0.5 + 0.5 * cos(1.0 + t * 6.28 - dx / 2.0);
      let g = 0.5 + 0.5 * sin(2.0 + t * 5.88 - dy / 4.0);
      let b = 0.5 + 0.5 * cos(t * 3.14 + ((dx) / 8.0));
      let baseColor = vec3<f32>(r, g, b);
      // Blinn-Phong shading
      let lightDir = normalize(vec3<f32>(-0.5, 0.7, 1.0));
      let normal = normalize(vec3<f32>(0.0, 0.0, 1.0 + d * 0.2));
      let viewDir = normalize(vec3<f32>(0.0, 0.0, 1.0));
      let halfDir = normalize(lightDir + viewDir);
      let diffuse = max(dot(normal, lightDir), 0.0);
      let specular = pow(max(dot(normal, halfDir), 0.0), 32.0);
      let ambient = 0.25;
      let color = baseColor * (ambient + 0.7 * diffuse) + vec3<f32>(1.0, 1.0, 1.0) * 0.3 * specular;
      return color;
    }
    fn luminance(c: vec3<f32>) -> f32 {
      return dot(c, vec3<f32>(0.299, 0.587, 0.114));
    }
    fn bloom(uv: vec2<f32>, texSize: vec2<i32>, baseColor: vec3<f32>) -> vec3<f32> {
      var sum: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
      var count: f32 = 0.0;
      let radius = uniforms.bloomRadius;
      let strength = uniforms.bloomStrength;
      let pixelCoord = vec2<i32>(uv * vec2<f32>(texSize));
      for (var dx = -radius; dx <= radius; dx = dx + 1) {
        for (var dy = -radius; dy <= radius; dy = dy + 1) {
          let coord = pixelCoord + vec2<i32>(dx, dy);
          if (coord.x >= 0 && coord.y >= 0 && coord.x < texSize.x && coord.y < texSize.y) {
            let data = textureLoad(tex, coord, 0);
            let nu = data.x;
            let d = data.y;
            let v = nu % uniforms.palettePeriod / uniforms.palettePeriod;
            let c = palette(v, d, f32(coord.x)/f32(texSize.x), f32(coord.y)/f32(texSize.y));
            if (luminance(c) > 0.7) { // seuil de luminosité
              sum = sum + c;
              count = count + 1.0;
            }
          }
        }
      }
      if (count > 0.0) {
        return baseColor + sum / count * strength;
      } else {
        return baseColor;
      }
    }
    @fragment
    fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
      let uv = fragCoord;
      let texSize = vec2<i32>(textureDimensions(tex, 0));
      // Correction de la conversion de types pour pixelCoord
      let pixelCoord = vec2<i32>(
        i32(uv.x * f32(texSize.x)),
        i32((1.0 - uv.y) * f32(texSize.y))
      );
      let data = textureLoad(tex, pixelCoord, 0);
      let nu = data.x;
      let d = data.y;
      let period = uniforms.palettePeriod;
      let v = nu % period / period;
      let baseColor = palette(v, d, fragCoord.x, fragCoord.y);
      //let color = bloom(uv, texSize, baseColor);
      return vec4<f32>(baseColor, 1.0);
    }
  `;

  // --- Création des buffers et textures ---
  const uniformData1 = new Float32Array([
    cx,
    cy,
    scale,
    width / height,
    antialiasLevel,
    angle,
    palettePeriod,
  ]);
  const uniformBuffer1 = device.createBuffer({
    size: uniformData1.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(uniformBuffer1, 0, uniformData1.buffer);

  const uniformData2 = new Float32Array([
    palettePeriod,
    bloomRadius,
    bloomStrength,
  ]);
  const uniformBuffer2 = device.createBuffer({
    size: uniformData2.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(uniformBuffer2, 0, uniformData2.buffer);

  // Texture intermédiaire pour la première passe
  const intermediateTexture = device.createTexture({
    size: { width, height, depthOrArrayLayers: 1 },
    format: 'rgba32float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
  });
  const intermediateView = intermediateTexture.createView();

  // --- Pipeline première passe ---
  const shaderModule1 = device.createShaderModule({ code: shaderCodePass1 });
  const pipeline1 = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule1, entryPoint: 'vs_main' },
    fragment: { module: shaderModule1, entryPoint: 'fs_main', targets: [{ format: 'rgba32float' }] },
    primitive: { topology: 'triangle-list' }
  });
  const bindGroup1 = device.createBindGroup({
    layout: pipeline1.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer1 } },
      { binding: 1, resource: { buffer: mandelbrotBuffer } }
    ]
  });

  // --- Pipeline deuxième passe ---
  const shaderModule2 = device.createShaderModule({ code: shaderCodePass2 });
  const pipeline2 = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule2, entryPoint: 'vs_main' },
    fragment: { module: shaderModule2, entryPoint: 'fs_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' }
  });
  const bindGroup2 = device.createBindGroup({
    layout: pipeline2.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer2 } },
      { binding: 1, resource: intermediateView }
    ]
  });

  // --- Commandes GPU ---
  const commandEncoder = device.createCommandEncoder();

  // Première passe : calcul des itérations et dérivée
  const renderPass1 = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: intermediateView,
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }]
  });
  renderPass1.setPipeline(pipeline1);
  renderPass1.setBindGroup(0, bindGroup1);
  renderPass1.draw(6, 1, 0, 0);
  renderPass1.end();

  // Deuxième passe : coloration
  const textureView = ctx.getCurrentTexture().createView();
  const renderPass2 = commandEncoder.beginRenderPass({
    colorAttachments: [{
      view: textureView,
      clearValue: { r: 1, g: 1, b: 1, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }]
  });
  renderPass2.setPipeline(pipeline2);
  renderPass2.setBindGroup(0, bindGroup2);
  renderPass2.draw(6, 1, 0, 0);
  renderPass2.end();

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
  let moveStep = 0.04; // déplacement relatif à scale

  // Variables pour navigation fluide
  let targetCx = cx;
  let targetCy = cy;
  let targetScale = scale;
  let velocityCx = 0;
  let velocityCy = 0;
  let velocityScale = 0;
  const accel = 0.05; // accélération
  const damping = 0.7; // amortissement

  // Variables pour la rotation
  let angle = 0.0;
  let targetAngle = 0.0;
  let velocityAngle = 0.0;
  const angleStep = 0.025; // vitesse de rotation

  function moveInCanvasAxis(dx: number, dy: number) {
    // Applique la rotation directe (angle) pour déplacer dans l'axe du canvas
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dxComplex = cosA * dx - sinA * dy;
    const dyComplex = sinA * dx + cosA * dy;
    targetCx += dxComplex;
    targetCy += dyComplex;
  }

  const pressedKeys: Record<string, boolean> = {};

  function handleKeydown(e: KeyboardEvent) {
    pressedKeys[e.key.toLowerCase()] = true;
  }

  function handleKeyup(e: KeyboardEvent) {
    pressedKeys[e.key.toLowerCase()] = false;
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = 0.8;
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
    { cx: -0.19569582393630502, cy: 1.1000276413181806}, // Zoom sur une autre région intéressante
  ];
  let currentInterestIndex = 0;
  function resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 0;
    const height = canvas.parentElement?.clientHeight || 0;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }

  function animate() {
    resize();
    if (!canvas) return;

    // Mouvement fluide selon les touches maintenues
    if (pressedKeys['z']) {
      moveInCanvasAxis(0, moveStep * targetScale);
    }
    if (pressedKeys['s']) {
      moveInCanvasAxis(0, -moveStep * targetScale);
    }
    if (pressedKeys['q']) {
      moveInCanvasAxis(-moveStep * targetScale, 0);
    }
    if (pressedKeys['d']) {
      moveInCanvasAxis(moveStep * targetScale, 0);
    }
    if (pressedKeys['a']) {
      targetAngle += angleStep;
    }
    if (pressedKeys['e']) {
      targetAngle -= angleStep;
    }

    // Animation fluide vers la cible
    velocityCx = (targetCx - cx) * accel + velocityCx * damping;
    velocityCy = (targetCy - cy) * accel + velocityCy * damping;
    velocityScale = (targetScale - scale) * accel + velocityScale * damping;
    velocityAngle = (targetAngle - angle) * accel + velocityAngle * damping;
    cx += velocityCx;
    cy += velocityCy;
    scale += velocityScale;
    angle += velocityAngle;
    drawMandelbrot(ctx, device, format, canvas.width, canvas.height, cx, cy, scale, antialiasLevel, angle);
    if (scale < 0.0000001) {
      currentInterestIndex = (currentInterestIndex + 1) % interestPointCollection.length;
      const point = interestPointCollection[currentInterestIndex];
      targetCx = cx = point.cx;
      targetCy = cy = point.cy;
      targetScale = scale = 2.5;
      velocityCx = velocityCy = velocityScale = 0;
      targetAngle = angle = 0.0;
      velocityAngle = 0.0;
    }
    requestAnimationFrame(animate);
  }

  let isDragging = false;
  let isRotating = false;
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
    if (e.button === 2) {
      isRotating = true;
    } else {
      isDragging = true;
      const coords = getCanvasCoords(e);
      startX = coords.x;
      startY = coords.y;
      startCx = targetCx;
      startCy = targetCy;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const coords = getCanvasCoords(e);
    if (isRotating) {
      // Rotation continue tant que le bouton droit est enfoncé
      const rect = canvasRef.value?.getBoundingClientRect();
      if (!rect) return;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const mouseX = coords.x;
      const mouseY = coords.y;
      targetAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
      return;
    }
    if (!isDragging) return;
    const dx = coords.x - startX;
    const dy = coords.y - startY;
    // Déplacement dans l'axe du canvas, mais appliqué dans le plan complexe selon la rotation
    const moveX = -dx * targetScale * 2 / coords.width * (coords.width / coords.height);
    const moveY = dy * targetScale * 2 / coords.height;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dxComplex = cosA * moveX - sinA * moveY;
    const dyComplex = sinA * moveX + cosA * moveY;
    targetCx = startCx + dxComplex;
    targetCy = startCy + dyComplex;
  }

  function handleMouseUp(e: MouseEvent) {
    if (e.button === 2) {
      isRotating = false;
    } else {
      isDragging = false;
    }
  }

  // Ajout des listeners
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
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
