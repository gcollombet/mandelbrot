import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// Unified auto mode (unify-jet-table-dispatch, task 2.8): renders the same
// view under BLA, Padé, jet, mobius+ and AUTO (per-block tier dispatch), and
// checks (a) no WebGPU validation errors on the auto path, (b) the auto image
// matches the BLA reference within the block-sampling floor, (c) the shader
// actually receives flag 5 + a live unified table, (d) mode round-trips leave
// the other modes untouched and never rebuild the reference orbit. The
// apps_total comparison is LOGGED for the record: the strict ship gate
// (apps_total(auto) ≤ best single mode per benchmark view) is the field-round
// half of 2.8 — note that per-BLOCK tags can legitimately cost a few
// applications vs pure jet when |dz| lands between the tagged tier's radius
// and r_jet (the census replay dispatched per-entry; the GPU tag is per-block).

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

/** Switch mode, reconverge, read the frozen Total-apps + realized skip. */
async function timedConverge(page: Page, mode: string): Promise<{ ms: number; realizedSkip: number; totalApps: number }> {
  await setMode(page, mode);
  const t0 = Date.now();
  await waitForConverged(page);
  const ms = Date.now() - t0;
  return page.evaluate((elapsed) => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      ms: elapsed,
      realizedSkip: engine.realizedSkip ?? -1,
      totalApps: engine.lastCompletionTotalApps ?? -1,
    };
  }, ms);
}

async function canvasScreenshot(page: Page, name: string): Promise<Buffer> {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  return page.screenshot({
    path: filePath,
    clip: { x: 300, y: 100, width: 900, height: 500 },
  });
}

async function diffStats(page: Page, a: Buffer, b: Buffer) {
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

test("auto mode renders like BLA, flags the shader, and round-trips cleanly", async ({ page }) => {
  const gpuErrors = collectGpuErrors(page);

  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  // Dismiss the intro splash — its animated backdrop pollutes pixel diffs.
  await page.mouse.click(640, 360);
  await page.waitForTimeout(1_500);
  await waitForConverged(page);

  // ── Reference: BLA ────────────────────────────────────────────────
  const blaPerf = await timedConverge(page, "bla");
  const blaShot = await canvasScreenshot(page, "unified-00-bla-reference");
  const resetSerialBefore = await page.evaluate(() => (window as any).__mandelbrotEngine.referenceResetSerial);

  // ── Auto (unified dispatch) on the same view ──────────────────────
  const autoPerf = await timedConverge(page, "auto");
  const autoShot = await canvasScreenshot(page, "unified-01-auto");

  // The shader must actually run the unified path: mode flag 5 + live table.
  const shaderState = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      flag: engine.lastShaderApproxFlag,
      levels: engine.lastShaderBlaLevelCount,
    };
  });
  expect(shaderState.flag).toBe(5);
  expect(shaderState.levels).toBeGreaterThan(0);
  expect(gpuErrors, `WebGPU errors on auto path:\n${gpuErrors.join("\n")}`).toEqual([]);

  // ── Single modes on the same view (A/B record) ────────────────────
  const padePerf = await timedConverge(page, "pade");
  const padeShot = await canvasScreenshot(page, "unified-02-pade");
  const jetPerf = await timedConverge(page, "jet");
  const mobiusPerf = await timedConverge(page, "mobius");
  console.log(
    `converge ms / realized skip / total apps —`
    + ` bla: ${blaPerf.ms}/${blaPerf.realizedSkip.toFixed(1)}/${blaPerf.totalApps}`
    + ` | auto: ${autoPerf.ms}/${autoPerf.realizedSkip.toFixed(1)}/${autoPerf.totalApps}`
    + ` | pade: ${padePerf.ms}/${padePerf.realizedSkip.toFixed(1)}/${padePerf.totalApps}`
    + ` | jet: ${jetPerf.ms}/${jetPerf.realizedSkip.toFixed(1)}/${jetPerf.totalApps}`
    + ` | mobius: ${mobiusPerf.ms}/${mobiusPerf.realizedSkip.toFixed(1)}/${mobiusPerf.totalApps}`,
  );
  // Ship-gate record (field half of 2.8): flag when auto needs more apps than
  // the best single mode on this view — logged, not asserted (the gate runs on
  // the user's benchmark views; per-block tags may cost a few applications vs
  // per-entry dispatch by design).
  const bestSingle = Math.min(
    ...[padePerf.totalApps, jetPerf.totalApps, mobiusPerf.totalApps].filter((v) => v > 0),
  );
  if (autoPerf.totalApps > bestSingle * 1.02) {
    console.warn(
      `SHIP GATE WATCH: apps_total(auto)=${autoPerf.totalApps} > best single mode ${bestSingle} on the intro view`,
    );
  }

  // Pixel floor, calibrated against bla↔pade like the sibling specs.
  const autoDiff = await diffStats(page, blaShot, autoShot);
  const padeDiff = await diffStats(page, blaShot, padeShot);
  console.log(`bla↔auto diff: ${autoDiff.differing}/${autoDiff.total} (${(100 * autoDiff.differing / autoDiff.total).toFixed(3)}%), >8: ${autoDiff.significant}, max=${autoDiff.maxDelta}`);
  console.log(`bla↔pade diff: ${padeDiff.differing}/${padeDiff.total} (${(100 * padeDiff.differing / padeDiff.total).toFixed(3)}%), >8: ${padeDiff.significant}, max=${padeDiff.maxDelta}`);
  expect(autoDiff.significant / autoDiff.total).toBeLessThan(0.10);

  // ── Back to BLA: rendering unchanged ──────────────────────────────
  await setMode(page, "bla");
  await waitForConverged(page);
  const blaShot2 = await canvasScreenshot(page, "unified-03-bla-roundtrip");
  const roundTrip = await diffStats(page, blaShot, blaShot2);
  console.log(`bla↔bla round-trip diff: ${roundTrip.differing}/${roundTrip.total}, max=${roundTrip.maxDelta}`);
  expect(roundTrip.differing / roundTrip.total).toBeLessThan(0.005);

  // Jet after auto must land back on the jet table (shared GPU buffers —
  // identical stride here, so ONLY the active-table kind audit protects this).
  await setMode(page, "jet");
  await waitForConverged(page);
  const jetFlag = await page.evaluate(() => (window as any).__mandelbrotEngine.lastShaderApproxFlag);
  expect(jetFlag).toBe(3);
  await setMode(page, "auto");
  await waitForConverged(page);
  const autoFlag = await page.evaluate(() => (window as any).__mandelbrotEngine.lastShaderApproxFlag);
  expect(autoFlag).toBe(5);

  // Mode switches never rebuilt the reference orbit.
  const resetSerialAfter = await page.evaluate(() => (window as any).__mandelbrotEngine.referenceResetSerial);
  expect(resetSerialAfter).toBe(resetSerialBefore);
  expect(gpuErrors, `WebGPU errors:\n${gpuErrors.join("\n")}`).toEqual([]);
});
