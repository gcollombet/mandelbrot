import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// Validation of the in-place compute path (fused brush+mandelbrot+count):
// renders the same view with the render ping-pong path and the in-place
// compute path, and checks the converged images match while watching for
// WebGPU validation errors on the console.

const SCREENSHOT_DIR = path.resolve("tests/screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

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

/**
 * Wait until the engine reports convergence (idle, no unfinished pixels) and
 * stays converged for 2 s — a single sample can race the intro/preset camera
 * animation or a pending clearHistory.
 */
async function waitForConverged(page: Page, timeout = 60_000) {
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

/** Force a full recompute of the current view on the given path. */
async function recompute(page: Page, useInplace: boolean) {
  await page.evaluate((inplace) => {
    const engine = (window as any).__mandelbrotEngine;
    engine.useInplaceCompute = inplace;
    engine.clearHistoryNextFrame = true;
    engine.needRender = true;
  }, useInplace);
  await page.waitForTimeout(300);
}

async function canvasScreenshot(page: Page, name: string): Promise<Buffer> {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  // Central region of the canvas only: the UI overlays (nav bar, control
  // panel, FPS pill) change between frames and would pollute the pixel diff.
  const buffer = await page.screenshot({
    path: filePath,
    clip: { x: 300, y: 100, width: 900, height: 500 },
  });
  return buffer;
}

/** Decode both PNGs in the browser (2D canvas) and compare pixel data. */
async function diffStats(page: Page, a: Buffer, b: Buffer): Promise<{ total: number; differing: number; maxDelta: number }> {
  return page.evaluate(async ([b64a, b64b]) => {
    const decode = (b64: string) => new Promise<ImageData>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = reject;
      img.src = `data:image/png;base64,${b64}`;
    });
    const [imgA, imgB] = await Promise.all([decode(b64a), decode(b64b)]);
    if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
      throw new Error(`size mismatch: ${imgA.width}×${imgA.height} vs ${imgB.width}×${imgB.height}`);
    }
    let differing = 0;
    let significant = 0;
    let maxDelta = 0;
    for (let i = 0; i < imgA.data.length; i += 4) {
      const delta = Math.max(
        Math.abs(imgA.data[i] - imgB.data[i]),
        Math.abs(imgA.data[i + 1] - imgB.data[i + 1]),
        Math.abs(imgA.data[i + 2] - imgB.data[i + 2]),
      );
      if (delta > 0) {
        differing++;
        if (delta > 8) significant++;
        if (delta > maxDelta) maxDelta = delta;
      }
    }
    return { total: imgA.data.length / 4, differing, significant, maxDelta };
  }, [a.toString("base64"), b.toString("base64")] as const);
}

test("in-place compute path matches render path and reports convergence", async ({ page }) => {
  const gpuErrors = collectGpuErrors(page);

  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });

  // Let the initial preset / intro camera animation fully settle first,
  // so both paths render the exact same view.
  await waitForConverged(page);

  // ── Reference: render ping-pong path ──────────────────────────────
  await recompute(page, false);
  await waitForConverged(page);
  const referenceShot = await canvasScreenshot(page, "inplace-00-reference-renderpath");

  // ── In-place compute path on the same view ────────────────────────
  await recompute(page, true);
  await waitForConverged(page);
  const inplaceShot = await canvasScreenshot(page, "inplace-01-compute-path");

  // No WebGPU validation errors on either path.
  expect(gpuErrors, `WebGPU errors:\n${gpuErrors.join("\n")}`).toEqual([]);

  // Counter semantics: converged → counts at 0, engine idle (5.3).
  const counts = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      unfinished: engine.unfinishedPixelCount,
      active: engine.activePixelCount,
      rendering: engine.isRendering,
      resolveSkippedFlagExists: "useInplaceCompute" in engine,
    };
  });
  expect(counts.unfinished).toBeLessThanOrEqual(10);
  expect(counts.active).toBe(0);

  // Image equivalence: the WGSL math is identical but the fragment and
  // compute compilations contract FMAs differently, producing 1-4 RGB-unit
  // deltas scattered along busy fractal structures (measured ~0.85% of
  // pixels, 98.8% of them ≤ 4/255).  A logic bug would instead show
  // structured patterns (refinement grid) or large/widespread deltas.
  const stats = await diffStats(page, referenceShot, inplaceShot);
  const differingRatio = stats.differing / stats.total;
  const significantRatio = stats.significant / stats.total;
  console.log(`pixel diff: ${stats.differing}/${stats.total} (${(differingRatio * 100).toFixed(4)}%), >8: ${stats.significant}, maxDelta=${stats.maxDelta}`);
  expect(differingRatio).toBeLessThan(0.02);
  expect(significantRatio).toBeLessThan(0.0005);

  // ── Resolve gating (C1) engages on idle re-renders ────────────────
  // Force a frame without invalidating the computation (color-only change):
  // the converged image lets the engine skip copy A→resolved + resolve.
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.needRender = true;
  });
  await page.waitForTimeout(500);
  const gating = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return { resolveSkipped: engine.resolveSkipped };
  });
  expect(gating.resolveSkipped).toBe(true);
  expect(gpuErrors, `WebGPU errors during gating:\n${gpuErrors.join("\n")}`).toEqual([]);

  // ── Convergence still works after pan on the compute path (5.2) ───
  const canvas = page.locator("#fullscreen canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(cx + (120 * i) / 10, cy + (60 * i) / 10);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await waitForConverged(page);
  await canvasScreenshot(page, "inplace-02-after-pan");
  expect(gpuErrors, `WebGPU errors after pan:\n${gpuErrors.join("\n")}`).toEqual([]);

  // Counter reaches 0 again after the pan (mixed pan/compute frames).
  const afterPan = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return { unfinished: engine.unfinishedPixelCount, active: engine.activePixelCount };
  });
  expect(afterPan.unfinished).toBeLessThanOrEqual(10);
  expect(afterPan.active).toBe(0);
});
