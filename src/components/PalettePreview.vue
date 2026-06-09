<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { ColorStop } from '../ColorStop.ts';
import type { InterpolationMode } from '../Mandelbrot.ts';
import { Palette } from '../Palette.ts';
import colorShader from '../assets/color.wgsl?raw';
import { getDefaultTileTextureUrl, getDefaultSkyboxTextureUrl } from '../textureLibrary';
import {
  normalizeTextureMappingFromLegacy,
  textureMappingVariableId,
  type TextureMappingConfig,
} from '../TextureMapping';

// ── Float32 → Float16 (copied from Engine.ts) ──
const _f32 = new Float32Array(1);
const _u32 = new Uint32Array(_f32.buffer);
function float32ToFloat16(v: number): number {
  _f32[0] = v;
  const f = _u32[0];
  const sign = (f >>> 16) & 0x8000;
  const exponent = ((f >>> 23) & 0xff) - 127;
  const mantissa = f & 0x7fffff;
  if (exponent >= 16) return sign | 0x7c00;
  if (exponent >= -14) {
    const e16 = exponent + 15;
    return sign | (e16 << 10) | (mantissa >>> 13);
  }
  if (exponent >= -24) {
    const shift = -14 - exponent;
    return sign | ((mantissa | 0x800000) >>> (13 + shift));
  }
  return sign;
}
function float32ArrayToFloat16(src: Float32Array): Uint16Array {
  const dst = new Uint16Array(src.length);
  for (let i = 0; i < src.length; ++i) {
    dst[i] = float32ToFloat16(src[i]);
  }
  return dst;
}

const LAYER_COUNT = 8;
const PREVIEW_MU = 1000000;
const ORBIT_DIRECTION_SCALE = 4095;
const ORBIT_DIRECTION_BASE = 4096;
/** Number of synthetic iterations to display. */
const ITER_COUNT = 100;

const props = defineProps<{
  colorStops: ColorStop[];
  interpolationMode?: InterpolationMode;
  tileTextureUrl?: string | null;
  skyboxTextureUrl?: string | null;
  tessellationLevel?: number;
  displacementAmount?: number;
  ambientOcclusionStrength?: number;
  microBumpStrength?: number;
  subsurfaceStrength?: number;
  reliefDepth?: number;
  localShadowStrength?: number;
  varnishStrength?: number;
  orbitTrapStrength?: number;
  phaseColoringStrength?: number;
  textureMapping?: TextureMappingConfig;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

/** Capture the current WebGPU canvas as a data URL (PNG). */
function getSnapshot(): string | null {
  if (!device || !ctx || !pipeline || !bindGroup) return null;
  render();
  try {
    return canvasRef.value?.toDataURL('image/png') ?? null;
  } catch {
    return null;
  }
}

defineExpose({ canvasRef, getSnapshot });

// ── GPU state ──
let device: GPUDevice | null = null;
let pipeline: GPURenderPipeline | null = null;
let bindGroup: GPUBindGroup | null = null;
let uniformBuffer: GPUBuffer | null = null;
let paletteTexture: GPUTexture | null = null;
let paletteTextureView: GPUTextureView | null = null;
let paletteSampler: GPUSampler | null = null;
let syntheticTexture: GPUTexture | null = null;
let syntheticArrayView: GPUTextureView | null = null;
let ctx: GPUCanvasContext | null = null;
let format: GPUTextureFormat = 'bgra8unorm';

// Resources needed to rebuild bind group when tile texture changes
let bindGroupLayout: GPUBindGroupLayout | null = null;
let tileTextureGpu: GPUTexture | null = null;
let skyboxTextureGpu: GPUTexture | null = null;
let skyboxSampler: GPUSampler | null = null;
let webcamTextureGpu: GPUTexture | null = null;
let frozenTextureGpu: GPUTexture | null = null;

/** Load an image URL into a GPUTexture (rgba8unorm). */
async function loadTexture(dev: GPUDevice, url: string): Promise<GPUTexture> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const bitmap = await createImageBitmap(img);
  const tex = dev.createTexture({
    size: [bitmap.width, bitmap.height, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    label: 'PalettePreview LoadedTexture',
  });
  dev.queue.copyExternalImageToTexture({ source: bitmap }, { texture: tex }, [bitmap.width, bitmap.height]);
  return tex;
}

/** Create a 1×1 rgba8unorm texture filled with a single color. */
function create1x1Texture(dev: GPUDevice, r: number, g: number, b: number, a: number): GPUTexture {
  const tex = dev.createTexture({
    size: [1, 1, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    label: 'PalettePreview 1x1',
  });
  dev.queue.writeTexture({ texture: tex }, new Uint8Array([r, g, b, a]), { bytesPerRow: 4 }, [1, 1]);
  return tex;
}

/**
 * Build the 8-layer r32float synthetic texture.
 *
 * Width = canvas pixel width, height = canvas pixel height (64 CSS px * dpr).
 * Each column of ~(width/ITER_COUNT) pixels represents one iteration (1..100).
 * The vertical axis varies the synthetic shading angle to show relief variation.
 *
 * Layer 0: iter (1..ITER_COUNT)
 * Layer 1: sentinel (0 — not used)
 * Layer 2: zx — real(z), on escape circle
 * Layer 3: zy — imag(z), on escape circle
 * Layer 4: distance height
 * Layer 5: derivative angle
 * Layer 6: ref_i + fractional stripe phase
 * Layer 7: packed average orbit direction
 */
function buildSyntheticData(w: number, h: number, mu: number): Float32Array[] {
  const layers: Float32Array[] = [];
  for (let l = 0; l < LAYER_COUNT; l++) {
    layers.push(new Float32Array(w * h));
  }

  const escapeRadius = Math.sqrt(mu) * 1.1; // just outside escape

  for (let y = 0; y < h; y++) {
    const vFrac = y / Math.max(h - 1, 1); // 0 at top, 1 at bottom
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      // Iteration: which of the ITER_COUNT buckets does this column fall into?
      const iterFloat = 1 + (x / Math.max(w - 1, 1)) * (ITER_COUNT - 1);

      // z on escape circle — angle varies with iteration for visual variety
      const zAngle = iterFloat * 0.3;
      const zx = escapeRadius * Math.cos(zAngle);
      const zy = escapeRadius * Math.sin(zAngle);

      // Stored shading data for escaped pixels.
      const distanceHeight = 4.0 + Math.sin(iterFloat * 0.22 + vFrac * Math.PI) * 0.6;
      const angleDer = (iterFloat / ITER_COUNT) * Math.PI * 2 + vFrac * Math.PI * 0.5;

      layers[0][idx] = iterFloat;  // iter
      layers[1][idx] = 1;          // genuine flag (1.0 = genuinely computed)
      layers[2][idx] = zx;
      layers[3][idx] = zy;
      layers[4][idx] = distanceHeight;
      layers[5][idx] = angleDer;
      const stripePhase = 0.5 + 0.5 * Math.sin(iterFloat * 0.2);
      const coherence = Math.abs(Math.sin(iterFloat * 0.065 + vFrac * Math.PI));
      const avgDirAngle = iterFloat * 0.08 + vFrac * Math.PI;
      const avgDirX = Math.cos(avgDirAngle) * coherence;
      const avgDirY = Math.sin(avgDirAngle) * coherence;
      const avgDirXQ = Math.round(Math.max(0, Math.min(1, avgDirX * 0.5 + 0.5)) * ORBIT_DIRECTION_SCALE);
      const avgDirYQ = Math.round(Math.max(0, Math.min(1, avgDirY * 0.5 + 0.5)) * ORBIT_DIRECTION_SCALE);
      layers[6][idx] = stripePhase;
      layers[7][idx] = avgDirXQ * ORBIT_DIRECTION_BASE + avgDirYQ;
    }
  }
  return layers;
}

/** Upload palette to GPU. */
function uploadPalette() {
  if (!device || !paletteTexture) return;
  const pal = new Palette(props.colorStops, props.interpolationMode ?? 'lab');
  const palTex = pal.generateTexture();
  const f16 = float32ArrayToFloat16(palTex.data);
  device.queue.writeTexture(
    { texture: paletteTexture },
    f16.buffer as ArrayBuffer,
    { bytesPerRow: palTex.width * 8 },
    [palTex.width, palTex.height],
  );
}

/** Render one frame. */
function render() {
  if (!device || !ctx || !pipeline || !bindGroup) return;
  const tex = ctx.getCurrentTexture();
  const encoder = device.createCommandEncoder({ label: 'PalettePreview Encoder' });
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: tex.createView(),
      loadOp: 'clear',
      storeOp: 'store',
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
    }],
    label: 'PalettePreview RenderPass',
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(6); // full-screen quad
  pass.end();
  device.queue.submit([encoder.finish()]);
}

/** Rebuild the bind group from current GPU resources. */
function rebuildBindGroup() {
  if (!device || !bindGroupLayout || !uniformBuffer || !syntheticArrayView
      || !tileTextureGpu || !skyboxTextureGpu || !webcamTextureGpu
      || !paletteTextureView || !frozenTextureGpu || !paletteSampler || !skyboxSampler) return;
  const frozenView = frozenTextureGpu.createView({
    dimension: '2d-array',
    baseArrayLayer: 0,
    arrayLayerCount: LAYER_COUNT,
  });
  bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: syntheticArrayView },
      { binding: 2, resource: tileTextureGpu.createView() },
      { binding: 3, resource: skyboxTextureGpu.createView() },
      { binding: 4, resource: webcamTextureGpu.createView() },
      { binding: 5, resource: paletteTextureView },
      { binding: 6, resource: frozenView },
      { binding: 7, resource: paletteSampler },
      { binding: 8, resource: skyboxSampler },
    ],
    label: 'PalettePreview BindGroup',
  });
}

async function init() {
  const canvas = canvasRef.value;
  if (!canvas || !navigator.gpu) return;

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return;
  device = await adapter.requestDevice();

  ctx = canvas.getContext('webgpu') as GPUCanvasContext;
  format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'opaque' });

  // ── Canvas size: adapt to CSS layout ──
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  canvas.width = w;
  canvas.height = h;

  // ── Synthetic texture (8 layers of r32float) ──
  const mu = PREVIEW_MU;
  const layerData = buildSyntheticData(w, h, mu);
  syntheticTexture = device.createTexture({
    size: { width: w, height: h, depthOrArrayLayers: LAYER_COUNT },
    format: 'r32float',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    label: 'PalettePreview SyntheticTexture',
  });
  for (let l = 0; l < LAYER_COUNT; l++) {
    device.queue.writeTexture(
      { texture: syntheticTexture, origin: { x: 0, y: 0, z: l } },
      layerData[l].buffer as ArrayBuffer,
      { bytesPerRow: w * 4 },
      { width: w, height: h, depthOrArrayLayers: 1 },
    );
  }
  syntheticArrayView = syntheticTexture.createView({
    dimension: '2d-array',
    baseArrayLayer: 0,
    arrayLayerCount: LAYER_COUNT,
    label: 'PalettePreview SyntheticArrayView',
  });

  // ── Tile & skybox textures (loaded from assets) ──
  const tileUrl = props.tileTextureUrl || getDefaultTileTextureUrl();
  const skyboxUrl = props.skyboxTextureUrl || getDefaultSkyboxTextureUrl();
  const [tileTexGpu, skyboxTexGpu] = await Promise.all([
    tileUrl ? loadTexture(device, tileUrl) : Promise.resolve(create1x1Texture(device, 255, 255, 255, 255)),
    skyboxUrl ? loadTexture(device, skyboxUrl) : Promise.resolve(create1x1Texture(device, 255, 255, 255, 255)),
  ]);
  tileTextureGpu = tileTexGpu;
  skyboxTextureGpu = skyboxTexGpu;

  // ── Webcam placeholder (1×1 black) ──
  webcamTextureGpu = create1x1Texture(device, 0, 0, 0, 255);

  // ── Palette texture (4096 x 6 rgba16float) ──
  const initialPalette = new Palette(props.colorStops, props.interpolationMode ?? 'lab').generateTexture();
  paletteTexture = device.createTexture({
    size: [initialPalette.width, initialPalette.height, 1],
    format: 'rgba16float',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    label: 'PalettePreview PaletteTexture',
  });
  paletteTextureView = paletteTexture.createView();
  paletteSampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'repeat',
    addressModeV: 'clamp-to-edge',
  });
  skyboxSampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'repeat',
    addressModeV: 'repeat',
  });
  uploadPalette();

  // ── Frozen texture placeholder (same size, dummy) ──
  frozenTextureGpu = device.createTexture({
    size: { width: w, height: h, depthOrArrayLayers: LAYER_COUNT },
    format: 'r32float',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    label: 'PalettePreview FrozenTexture',
  });

  // ── Uniform buffer (44 floats, padded to 176 bytes for 16-byte alignment) ──
  uniformBuffer = device.createBuffer({
    size: 4 * 44,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: 'PalettePreview UniformBuffer',
  });
  // palettePeriod = ITER_COUNT * 2 to compensate for the `* 2.0` in the shader's
  // `deep = v * 2.0; palettePhase = fract(deep / palettePeriod)`, so we get exactly one cycle.
  const previewLightAngle = 3.927;
  const previewLightLen = Math.hypot(Math.cos(previewLightAngle), Math.sin(previewLightAngle), 1.85);
  const textureMapping = normalizeTextureMappingFromLegacy({ textureMapping: props.textureMapping });
  const uniforms = new Float32Array([
    ITER_COUNT * 2, // palettePeriod
    0,            // paletteOffset
    1,            // bloomStrength
    0,            // time
    w / h,        // aspect
    0,            // angle
    0,            // animate
    mu,           // mu
    1,            // zoomFactor (no zoom)
    0,            // frozenAligned (no frozen texture)
    1,            // liveZoomFactor (no zoom)
    0,            // frozenShiftU
    0,            // frozenShiftV
    props.tessellationLevel ?? 0, // tessellationLevel
    props.displacementAmount ?? 0, // displacementAmount
    1.0,          // animationSpeed
    1e-10,        // epsilon (interior detection, not relevant for preview)
    props.ambientOcclusionStrength ?? 0, // ambientOcclusionStrength
    props.microBumpStrength ?? 0, // microBumpStrength
    props.subsurfaceStrength ?? 0.0, // subsurfaceStrength
    props.reliefDepth ?? 0, // reliefDepth
    props.localShadowStrength ?? 0, // localShadowStrength
    previewLightAngle, // lightAngle
    props.varnishStrength ?? 0, // varnishStrength
    Math.log(mu),     // logMu
    0,                // sceneSin
    1,                // sceneCos
    Math.cos(previewLightAngle) / previewLightLen, // lightDirX
    Math.sin(previewLightAngle) / previewLightLen, // lightDirY
    1.85 / previewLightLen, // lightDirZ
    0, // paletteMirror
    0, // debugShading
    0, // heightPaletteShift
    props.orbitTrapStrength ?? 0, // orbitTrapStrength
    props.phaseColoringStrength ?? 0, // phaseColoringStrength
    textureMappingVariableId(textureMapping.xVariable), // textureMappingXVariable
    textureMappingVariableId(textureMapping.yVariable), // textureMappingYVariable
    textureMapping.xScale, // textureMappingXScale
    textureMapping.yScale, // textureMappingYScale
    textureMapping.mirrored ? 1 : 0, // textureMappingMirror
    -0.7, // centerX
    0, // centerY
    1.2, // scale
    0, // _pad
  ]);
  device.queue.writeBuffer(uniformBuffer, 0, uniforms.buffer as ArrayBuffer);

  // ── Bind group layout ──
  bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 6, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
      { binding: 7, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 8, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    ],
    label: 'PalettePreview BindGroupLayout',
  });

  // ── Pipeline ──
  const module = device.createShaderModule({ code: colorShader, label: 'PalettePreview ShaderModule' });
  pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: { module, entryPoint: 'vs_main' },
    fragment: { module, entryPoint: 'fs_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
    label: 'PalettePreview RenderPipeline',
  });

  // ── Bind group ──
  rebuildBindGroup();

  render();
}

// Re-render when palette changes
watch(
  [() => props.colorStops, () => props.interpolationMode],
  () => {
    if (!device) return;
    uploadPalette();
    render();
  },
  { deep: true },
);

// Re-render when material-shaping uniforms change
watch(
  [() => props.tessellationLevel, () => props.displacementAmount, () => props.ambientOcclusionStrength, () => props.microBumpStrength, () => props.subsurfaceStrength, () => props.reliefDepth, () => props.localShadowStrength, () => props.varnishStrength, () => props.orbitTrapStrength, () => props.phaseColoringStrength, () => props.textureMapping],
  () => {
    if (!device || !uniformBuffer) return;
    const previewLightAngle = 3.927;
    const previewLightLen = Math.hypot(Math.cos(previewLightAngle), Math.sin(previewLightAngle), 1.85);
    const textureMapping = normalizeTextureMappingFromLegacy({ textureMapping: props.textureMapping });
    const patch = new Float32Array([
      props.tessellationLevel ?? 0,
      props.displacementAmount ?? 0,
      1.0,
      1e-10,
      props.ambientOcclusionStrength ?? 0,
      props.microBumpStrength ?? 0,
      props.subsurfaceStrength ?? 0.0,
      props.reliefDepth ?? 1,
      props.localShadowStrength ?? 0,
      previewLightAngle,
      props.varnishStrength ?? 0,
      Math.log(PREVIEW_MU),
      0,
      1,
      Math.cos(previewLightAngle) / previewLightLen,
      Math.sin(previewLightAngle) / previewLightLen,
      1.85 / previewLightLen,
      0,
      0,
      0,
      props.orbitTrapStrength ?? 0,
      props.phaseColoringStrength ?? 0,
      textureMappingVariableId(textureMapping.xVariable),
      textureMappingVariableId(textureMapping.yVariable),
      textureMapping.xScale,
      textureMapping.yScale,
      textureMapping.mirrored ? 1 : 0,
      -0.7,
      0,
      1.2,
      0,
    ]);
    device.queue.writeBuffer(uniformBuffer, 13 * 4, patch.buffer as ArrayBuffer);
    render();
  },
);

// Re-render when tile texture URL changes
watch(
  () => props.tileTextureUrl,
  async (url) => {
    if (!device) return;
    const resolvedUrl = url || getDefaultTileTextureUrl();
    try {
      const oldTile = tileTextureGpu;
      tileTextureGpu = resolvedUrl
        ? await loadTexture(device, resolvedUrl)
        : create1x1Texture(device, 255, 255, 255, 255);
      oldTile?.destroy();
      rebuildBindGroup();
      render();
    } catch (e) {
      console.warn('PalettePreview: failed to load tile texture:', e);
    }
  },
);

// Re-render when skybox texture URL changes
watch(
  () => props.skyboxTextureUrl,
  async (url) => {
    if (!device) return;
    const resolvedUrl = url || getDefaultSkyboxTextureUrl();
    try {
      const oldSkybox = skyboxTextureGpu;
      skyboxTextureGpu = resolvedUrl
        ? await loadTexture(device, resolvedUrl)
        : create1x1Texture(device, 255, 255, 255, 255);
      oldSkybox?.destroy();
      rebuildBindGroup();
      render();
    } catch (e) {
      console.warn('PalettePreview: failed to load skybox texture:', e);
    }
  },
);

onMounted(() => {
  init().catch(e => console.warn('PalettePreview init failed:', e));
});

onUnmounted(() => {
  device?.destroy();
  device = null;
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="palette-preview-canvas"
    style="width: 100%; height: 64px; border-radius: 2px; box-shadow: 0 1px 4px #0001;"
  ></canvas>
</template>

<style scoped>
.palette-preview-canvas {
  display: block;
}
</style>
