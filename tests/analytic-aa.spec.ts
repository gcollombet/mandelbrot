import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// Analytic antialiasing (unify-jet-table-dispatch, task 5.5): 16× AA A/B on the
// intro view under auto mode — analytic Taylor-payload expansion vs brute
// per-sample re-iteration. Checks:
//   (a) zero WebGPU validation errors on the analytic path;
//   (b) the reseed's frontier split is real: with analytic ON only margin-fail
//       texels re-iterate (stamped < eligible); with analytic OFF the whole
//       boundary band re-iterates (stamped == eligible);
//   (c) the final images match within the second-order Taylor bound. The floor
//       is CALIBRATED with a brute-vs-brute rerun: the converged base is not
//       bit-deterministic run to run (adaptive batching moves pass boundaries
//       and the derS two-sum compensation resets per pass, so DE low bits — and
//       with them ~1-3 % of the band-edge AA targets — drift), so the analytic
//       delta is asserted against the measured brute↔brute noise, sibling-spec
//       style (bla↔pade calibration);
//   (d) the per-AA-sample apps_total is logged when the final readback lands
//       (each sample runs in its own work session, so lastCompletionTotalApps
//       after accumulation is the LAST sample's cost).
// The escaping-dominated deep-view half of 5.5 is the field round (user GPU).

const SCREENSHOT_DIR = path.resolve("tests/screenshots");
const LS_KEY = "mandelbrot_last_settings";
const AA_LEVEL = 16;

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

/** Trigger a fresh AA accumulation and wait until all samples are composited. */
async function runAaAccumulation(page: Page, analytic: boolean, timeout = 150_000) {
  await page.evaluate((useAnalytic) => {
    const engine = (window as any).__mandelbrotEngine;
    engine.aaAnalyticEnabled = useAnalytic;
    engine.triggerAaAccumulation();
  }, analytic);
  const deadline = Date.now() + timeout;
  let lastLog = 0;
  for (;;) {
    const p = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      return {
        ...engine.aaProgress,
        unfinished: engine.unfinishedPixelCount,
        activePx: engine.activePixelCount,
        needRender: engine.needRender,
        clearPending: engine.clearHistoryNextFrame,
        sampleIndex: engine.aaSampleIndex,
      };
    });
    if (!p.active && p.done >= AA_LEVEL) {
      break;
    }
    if (Date.now() - lastLog > 5_000) {
      lastLog = Date.now();
      console.log(`aa progress: ${JSON.stringify(p)}`);
    }
    if (Date.now() > deadline) {
      throw new Error(`runAaAccumulation: timeout at ${JSON.stringify(p)}`);
    }
    await page.waitForTimeout(300);
  }
  // Let the final present + completion stats settle.
  await page.waitForTimeout(1_000);
  return page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      frontierStamped: engine.aaFrontierStamped as number,
      frontierEligible: engine.aaFrontierEligible as number,
      lastSampleApps: engine.lastCompletionTotalApps as number,
    };
  });
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

test("16x analytic AA matches brute within the Taylor bound and only re-iterates the frontier", async ({ page }) => {
  test.setTimeout(600_000);
  const gpuErrors = collectGpuErrors(page);

  // Force auto mode + 16× manual AA through the persisted params BEFORE the app
  // boots (an in-page write races the params watcher's own persistence).
  await page.addInitScript(([key, level]) => {
    const raw = localStorage.getItem(key as string);
    const params = raw ? JSON.parse(raw) : {};
    params.approximationMode = "auto";
    params.antialiasLevel = level;
    params.aaAuto = false;
    localStorage.setItem(key as string, JSON.stringify(params));
  }, [LS_KEY, AA_LEVEL] as const);
  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  // Dismiss the intro splash — its animated backdrop pollutes pixel diffs.
  await page.mouse.click(640, 360);
  await page.waitForTimeout(1_500);
  await waitForConverged(page);

  // The analytic payload is auto-mode only: the shader must run flag 5.
  const flag = await page.evaluate(() => (window as any).__mandelbrotEngine.lastShaderApproxFlag);
  expect(flag).toBe(5);

  // Symmetric base: run A from a full-clear recompute too (run B gets one
  // automatically via triggerAaAccumulation's jittered-base clear), so both
  // accumulations bake the AA target from the exact same converged values.
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.clearHistoryNextFrame = true;
    engine.needRender = true;
  });
  await page.waitForTimeout(500);
  await waitForConverged(page);

  // ── Run 1: brute re-iteration (noise-floor reference) ────────────
  const brute1 = await runAaAccumulation(page, false);
  const brute1Shot = await canvasScreenshot(page, "analytic-aa-00-brute1");
  console.log(
    `brute run 1 — frontier ${brute1.frontierStamped}/${brute1.frontierEligible},`
    + ` last-sample apps ${brute1.lastSampleApps}`,
  );

  // ── Run 2: analytic AA on the same view, same jitter sequence ────
  const analytic = await runAaAccumulation(page, true);
  const analyticShot = await canvasScreenshot(page, "analytic-aa-01-analytic");
  console.log(
    `analytic run — frontier ${analytic.frontierStamped}/${analytic.frontierEligible}`
    + ` (${analytic.frontierEligible > 0 ? (100 * analytic.frontierStamped / analytic.frontierEligible).toFixed(1) : "?"}%),`
    + ` last-sample apps ${analytic.lastSampleApps}`,
  );

  // ── Run 3: brute again (measures the pipeline's run-to-run noise) ─
  const brute2 = await runAaAccumulation(page, false);
  const brute2Shot = await canvasScreenshot(page, "analytic-aa-02-brute2");
  console.log(
    `brute run 2 — frontier ${brute2.frontierStamped}/${brute2.frontierEligible},`
    + ` last-sample apps ${brute2.lastSampleApps}`,
  );

  expect(gpuErrors, `WebGPU errors:\n${gpuErrors.join("\n")}`).toEqual([]);

  // Frontier split: analytic must freeze at least part of the boundary band;
  // brute must re-iterate all of it.
  expect(analytic.frontierEligible).toBeGreaterThan(0);
  expect(analytic.frontierStamped).toBeLessThan(analytic.frontierEligible);
  expect(brute1.frontierEligible).toBeGreaterThan(0);
  expect(brute1.frontierStamped).toBe(brute1.frontierEligible);

  // Per-AA-sample cost: the analytic last sample re-iterates only the frontier.
  if (analytic.lastSampleApps >= 0 && brute1.lastSampleApps > 0) {
    const ratio = analytic.lastSampleApps / brute1.lastSampleApps;
    console.log(`per-sample apps ratio analytic/brute = ${ratio.toFixed(3)}`);
  }

  // Image A/B against the calibrated floor: brute↔brute captures the pipeline's
  // own run-to-run noise (band-edge AA-target drift from non-bit-deterministic
  // DE); the analytic delta on top of it is the tagged pixels + their
  // gradient-coupled shading neighbours, bounded by the Taylor margin.
  const floorDiff = await diffStats(page, brute1Shot, brute2Shot);
  const analyticDiff = await diffStats(page, analyticShot, brute1Shot);
  const pct = (d: { significant: number; total: number }) => 100 * d.significant / d.total;
  console.log(
    `brute↔brute floor: ${floorDiff.significant}/${floorDiff.total} (${pct(floorDiff).toFixed(3)}%), max=${floorDiff.maxDelta}`,
  );
  console.log(
    `analytic↔brute: ${analyticDiff.significant}/${analyticDiff.total} (${pct(analyticDiff).toFixed(3)}%), max=${analyticDiff.maxDelta}`,
  );
  expect(pct(analyticDiff)).toBeLessThan(Math.max(3 * pct(floorDiff), 1.5));

  // Gamma-correct accumulation unchanged: both runs flow through the same
  // linear-RGB additive path; the accumulator average is what we screenshotted.
});
