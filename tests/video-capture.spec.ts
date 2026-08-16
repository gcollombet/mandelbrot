import { expect, test, type Page } from "@playwright/test";

// End-to-end checks for the video export capture chain.
//
// These drive the REAL app in a visible window and read back actual pixels.
// Deliberately not modelled on visual.spec.ts, which only produces screenshots
// without dismissing the splash — its tests pass whether or not anything
// renders.

async function bootConverged(page: Page) {
  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360); // dismiss intro splash
  await page.waitForTimeout(1_500);

  const deadline = Date.now() + 60_000;
  let stable = 0;
  while (stable < 4) {
    if (Date.now() > deadline) throw new Error("bootConverged: timeout");
    const idle = await page.evaluate(() => {
      const e = (window as any).__mandelbrotEngine;
      return !!e && e.unfinishedPixelCount >= 0 && e.unfinishedPixelCount <= 10 && !e.needRender;
    });
    stable = idle ? stable + 1 : 0;
    await page.waitForTimeout(250);
  }
}

/** Capture one frame and return its pixels as plain arrays. */
async function capture(page: Page, outputWidth: number, outputHeight: number, supersample: number) {
  return page.evaluate(async ([w, h, ss]) => {
    const engine = (window as any).__mandelbrotEngine;
    const frame: VideoFrame = await engine.captureExportFrame({
      outputWidth: w, outputHeight: h, supersample: ss,
      timestampMicros: 12345, durationMicros: 33333,
    });
    const buf = new Uint8Array(frame.allocationSize());
    await frame.copyTo(buf);
    const meta = {
      format: frame.format,
      codedWidth: frame.codedWidth,
      codedHeight: frame.codedHeight,
      timestamp: frame.timestamp,
      duration: frame.duration,
    };
    frame.close();
    return { meta, pixels: Array.from(buf) };
  }, [outputWidth, outputHeight, supersample] as const);
}

test("captures a VideoFrame at a resolution independent of the canvas", async ({ page }) => {
  test.setTimeout(120_000);
  await bootConverged(page);

  const canvasSize = await page.evaluate(() => {
    const e = (window as any).__mandelbrotEngine;
    return { width: e.width, height: e.height };
  });

  const { meta, pixels } = await capture(page, 320, 180, 2);

  expect(meta.codedWidth).toBe(320);
  expect(meta.codedHeight).toBe(180);
  expect(meta.timestamp).toBe(12345);
  expect(meta.duration).toBe(33333);
  // The whole point of rendering offscreen: the film's size does not follow the
  // window. If these matched, the export would not be reproducible across
  // window resizes.
  expect(canvasSize.width).not.toBe(320);

  // Real image, not a cleared buffer.
  let nonBlack = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 12) nonBlack++;
  }
  expect(nonBlack).toBeGreaterThan(320 * 180 * 0.2);
});

test("reduces in linear light, not in sRGB", async ({ page }) => {
  test.setTimeout(120_000);
  await bootConverged(page);

  // Same view twice: once reduced 2x by the capture chain, once at the
  // supersampled resolution with no reduction. Reducing the second in JS two
  // ways tells us which space the shader averaged in.
  const reduced = await capture(page, 160, 90, 2);
  const full = await capture(page, 320, 180, 1);

  const srgbToLinear = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const linearToSrgb = (c: number) => {
    const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, v * 255));
  };

  let linearErr = 0;
  let srgbErr = 0;
  let samples = 0;

  for (let y = 0; y < 90; y++) {
    for (let x = 0; x < 160; x++) {
      for (let ch = 0; ch < 3; ch++) {
        const quad: number[] = [];
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            quad.push(full.pixels[((2 * y + dy) * 320 + (2 * x + dx)) * 4 + ch]);
          }
        }
        // Only high-contrast neighbourhoods separate the two hypotheses; flat
        // areas average identically in either space.
        if (Math.max(...quad) - Math.min(...quad) < 60) continue;

        const actual = reduced.pixels[(y * 160 + x) * 4 + ch];
        const linearMean = linearToSrgb(quad.reduce((s, v) => s + srgbToLinear(v), 0) / 4);
        const srgbMean = quad.reduce((s, v) => s + v, 0) / 4;

        linearErr += Math.abs(actual - linearMean);
        srgbErr += Math.abs(actual - srgbMean);
        samples++;
      }
    }
  }

  expect(samples).toBeGreaterThan(200);
  const linearMae = linearErr / samples;
  const srgbMae = srgbErr / samples;
  console.log(`linear MAE ${linearMae.toFixed(2)} vs sRGB MAE ${srgbMae.toFixed(2)} over ${samples} samples`);

  // Averaging after the sRGB encode darkens edges; the linear hypothesis must
  // fit clearly better. Tolerance covers dither, which is applied at each
  // target's own resolution and so differs between the two captures.
  expect(linearMae).toBeLessThan(srgbMae);
  expect(linearMae).toBeLessThan(4);
});
