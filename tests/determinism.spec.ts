import { test, expect, type Page } from "@playwright/test";

// Determinism spec (all-compute-der-cartesian): successor of the retired
// fragment-vs-compute parity spec (inplace-compute.spec.ts). There is a single
// production iteration path now, so the meaningful invariant is run-to-run
// determinism: rendering the same deep view to convergence twice from scratch
// must produce BIT-IDENTICAL raw state layers — iteration counts AND the
// DE-relevant derivative layers — regardless of where the progressive pass
// boundaries fall (GPU-timing-adaptive batches). The Cartesian der carry
// (layers 4/5/8 raw) makes the pass boundary lossless, which is what turns
// this from flaky-by-construction into bit-exact.
//
// The comparison reads the raw texture back through the engine's own GPU
// device (copyTextureToBuffer + map) rather than comparing canvas pixels:
// the canvas also bakes animated display parameters (palette drift), which
// are out of scope here.

function collectGpuErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (/WebGPU|GPUValidationError|validation|Tint/i.test(text)
      && /error|invalid|fail/i.test(text)) {
      errors.push(text);
    }
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

async function waitForConverged(page: Page, timeout = 90_000) {
  const deadline = Date.now() + timeout;
  let stableSamples = 0;
  while (stableSamples < 8) {
    if (Date.now() > deadline) {
      throw new Error("waitForConverged: timeout");
    }
    const idle = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      return !!engine
        && engine.unfinishedPixelCount >= 0
        && engine.unfinishedPixelCount <= 10
        && !engine.isRendering
        && !engine.needRender
        && !engine.clearHistoryNextFrame;
    });
    stableSamples = idle ? stableSamples + 1 : 0;
    await page.waitForTimeout(250);
  }
}

/** Restart the current view from a cleared state (fresh sentinel grid). */
async function recomputeFromScratch(page: Page) {
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.clearHistoryNextFrame = true;
    engine.needRender = true;
  });
  await page.waitForTimeout(300);
  await waitForConverged(page);
}

/** Teleport to a deep view (antenna tip c = −2: exactly representable, the
 *  needle guarantees boundary structure at every depth). */
async function gotoDeepView(page: Page) {
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    const nav = engine.mandelbrotNavigator;
    engine.setPrecisionBudget("1e-40");
    const cx = "-2";
    const cy = "0";
    nav.cancel_transition();
    nav.origin(cx, cy);
    nav.scale("1e-32");
    nav.angle(0);
    engine.resetReference(cx, cy);
  });
  await page.waitForTimeout(2_000);
  await waitForConverged(page);
}

const RAW_LAYERS = [0, 2, 3, 4, 5, 6, 7, 8];

/** Read the raw state texture back, one FNV-1a hash per layer (bit-level). */
async function hashRawLayers(page: Page): Promise<Record<number, string>> {
  return page.evaluate(async (layers: number[]) => {
    const engine = (window as any).__mandelbrotEngine;
    const dev = engine.device as GPUDevice;
    const size = engine.neutralSize as number;
    const bpr = Math.ceil((size * 4) / 256) * 256;
    const out: Record<number, string> = {};
    for (const layer of layers) {
      const buf = dev.createBuffer({ size: bpr * size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      const enc = dev.createCommandEncoder();
      enc.copyTextureToBuffer(
        { texture: engine.rawTexture, origin: { x: 0, y: 0, z: layer } },
        { buffer: buf, bytesPerRow: bpr },
        { width: size, height: size, depthOrArrayLayers: 1 },
      );
      dev.queue.submit([enc.finish()]);
      await buf.mapAsync(GPUMapMode.READ);
      const data = new Uint32Array(buf.getMappedRange());
      const rowWords = bpr / 4;
      // FNV-1a over the meaningful row prefixes.
      let h = 0x811c9dc5;
      for (let y = 0; y < size; y++) {
        const base = y * rowWords;
        for (let x = 0; x < size; x++) {
          let v = data[base + x];
          for (let b = 0; b < 4; b++) {
            h ^= v & 0xff;
            h = (h * 0x01000193) >>> 0;
            v >>>= 8;
          }
        }
      }
      buf.unmap();
      buf.destroy();
      out[layer] = h.toString(16);
    }
    return out;
  }, RAW_LAYERS);
}

test("same deep view twice from scratch has bit-identical raw layers", async ({ page }) => {
  test.setTimeout(240_000);
  const gpuErrors = collectGpuErrors(page);

  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360); // dismiss intro splash
  await page.waitForTimeout(1_500);
  await waitForConverged(page);

  await gotoDeepView(page);

  await recomputeFromScratch(page);
  const hashesA = await hashRawLayers(page);

  await recomputeFromScratch(page);
  const hashesB = await hashRawLayers(page);

  console.log("determinism A:", JSON.stringify(hashesA));
  console.log("determinism B:", JSON.stringify(hashesB));
  expect(hashesB).toEqual(hashesA);
  expect(gpuErrors).toEqual([]);
});

test("raw layers are independent of the iteration batch size", async ({ page }) => {
  test.setTimeout(240_000);
  const gpuErrors = collectGpuErrors(page);

  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360);
  await page.waitForTimeout(1_500);
  await waitForConverged(page);

  await gotoDeepView(page);

  // Small batches: the adaptive controller chases a high frame rate, so the
  // progressive pass boundaries land in completely different places.
  await page.evaluate(() => { (window as any).__mandelbrotEngine.targetFps = 120 });
  await recomputeFromScratch(page);
  const hashesSmall = await hashRawLayers(page);

  // Large batches.
  await page.evaluate(() => { (window as any).__mandelbrotEngine.targetFps = 15 });
  await recomputeFromScratch(page);
  const hashesLarge = await hashRawLayers(page);

  console.log("determinism small batches:", JSON.stringify(hashesSmall));
  console.log("determinism large batches:", JSON.stringify(hashesLarge));
  expect(hashesLarge).toEqual(hashesSmall);
  expect(gpuErrors).toEqual([]);
});
