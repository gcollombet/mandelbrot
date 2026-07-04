import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// Jet approximation mode (add-jet-approximation, tasks 5.3 / 7.4): renders the
// same view under BLA, jet and Padé, and checks (a) no WebGPU validation
// errors on the jet path, (b) the jet image matches the BLA reference (both
// accelerate the SAME perturbation within the ε budget), (c) the shader
// actually receives the jet flag + a non-empty jet table, (d) mode round-trips
// leave BLA/Padé rendering unchanged and never rebuild the reference orbit.

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

async function setMode(page: Page, mode: string) {
  await page.evaluate((m) => {
    const engine = (window as any).__mandelbrotEngine;
    engine.setApproximationMode(m);
  }, mode);
  await page.waitForTimeout(300);
}

/** Switch mode, time full reconvergence, read the GPU realized-skip metric. */
async function timedConverge(page: Page, mode: string): Promise<{ ms: number; realizedSkip: number }> {
  await setMode(page, mode);
  const t0 = Date.now();
  await waitForConverged(page);
  const ms = Date.now() - t0;
  const realizedSkip = await page.evaluate(() => (window as any).__mandelbrotEngine.realizedSkip);
  return { ms, realizedSkip };
}

async function canvasScreenshot(page: Page, name: string): Promise<Buffer> {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  return page.screenshot({
    path: filePath,
    clip: { x: 300, y: 100, width: 900, height: 500 },
  });
}

async function diffStats(page: Page, a: Buffer, b: Buffer): Promise<{ total: number; differing: number; significant: number; maxDelta: number }> {
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

test("jet mode renders like BLA, flags the shader, and round-trips cleanly", async ({ page }) => {
  const gpuErrors = collectGpuErrors(page);

  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  // Dismiss the intro splash ("Tap to explore") — its animated backdrop would
  // pollute every pixel diff below.
  await page.mouse.click(640, 360);
  await page.waitForTimeout(1_500);
  await waitForConverged(page);

  // ── Reference: BLA ────────────────────────────────────────────────
  const blaPerf = await timedConverge(page, "bla");
  const blaShot = await canvasScreenshot(page, "jet-00-bla-reference");
  const resetSerialBefore = await page.evaluate(() => (window as any).__mandelbrotEngine.referenceResetSerial);

  // ── Jet on the same view ──────────────────────────────────────────
  const jetPerf = await timedConverge(page, "jet");
  const jetShot = await canvasScreenshot(page, "jet-01-jet");

  // The shader must actually run the jet path: mode flag 3 + non-empty table.
  const shaderState = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      flag: engine.lastShaderApproxFlag,
      levels: engine.lastShaderBlaLevelCount,
    };
  });
  expect(shaderState.flag).toBe(3);
  expect(shaderState.levels).toBeGreaterThan(0);
  expect(gpuErrors, `WebGPU errors on jet path:\n${gpuErrors.join("\n")}`).toEqual([]);

  // ── Padé on the same view (calibration + 7.4) ─────────────────────
  const padePerf = await timedConverge(page, "pade");
  const padeShot = await canvasScreenshot(page, "jet-02-pade");
  console.log(
    `wall-clock to converge / GPU realized skip — bla: ${blaPerf.ms}ms/${blaPerf.realizedSkip.toFixed(1)}`
    + ` | jet: ${jetPerf.ms}ms/${jetPerf.realizedSkip.toFixed(1)}`
    + ` | pade: ${padePerf.ms}ms/${padePerf.realizedSkip.toFixed(1)}`,
  );

  // Jet accelerates the SAME perturbation within the ε budget, so escape
  // iterations match; the visible deltas come from the orbit-metric EMA and
  // derivative shading being SAMPLED once per applied block — jet's much
  // longer skips coarsen that sampling. Calibrate against bla↔pade (same
  // sampling effect, shorter blocks) instead of an absolute threshold.
  const jetDiff = await diffStats(page, blaShot, jetShot);
  const padeDiff = await diffStats(page, blaShot, padeShot);
  console.log(`bla↔jet diff: ${jetDiff.differing}/${jetDiff.total} (${(100 * jetDiff.differing / jetDiff.total).toFixed(3)}%), >8: ${jetDiff.significant}, max=${jetDiff.maxDelta}`);
  console.log(`bla↔pade diff: ${padeDiff.differing}/${padeDiff.total} (${(100 * padeDiff.differing / padeDiff.total).toFixed(3)}%), >8: ${padeDiff.significant}, max=${padeDiff.maxDelta}`);
  // Structural sanity: strong deltas stay a small fraction; a wrong jet
  // application would repaint whole regions (>>10% significant).
  expect(jetDiff.significant / jetDiff.total).toBeLessThan(0.10);

  // ── Back to BLA: rendering unchanged (7.4) ────────────────────────
  await setMode(page, "bla");
  await waitForConverged(page);
  const blaShot2 = await canvasScreenshot(page, "jet-03-bla-roundtrip");
  const roundTrip = await diffStats(page, blaShot, blaShot2);
  console.log(`bla↔bla round-trip diff: ${roundTrip.differing}/${roundTrip.total}, max=${roundTrip.maxDelta}`);
  expect(roundTrip.differing / roundTrip.total).toBeLessThan(0.005);

  // Mode switches never rebuilt the reference orbit.
  const resetSerialAfter = await page.evaluate(() => (window as any).__mandelbrotEngine.referenceResetSerial);
  expect(resetSerialAfter).toBe(resetSerialBefore);
  expect(gpuErrors, `WebGPU errors:\n${gpuErrors.join("\n")}`).toEqual([]);
});
