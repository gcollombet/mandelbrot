import { test, expect, type Page } from "@playwright/test";

// Contrast-driven AA target (add-adaptive-antialiasing, task 10.5): with a
// short-period palette, color banding aliases far from the set boundary where
// the DE ramp alone leaves target = 1. The bake fuses DE ∪ Sobel ∪ moiré in
// target space, so the AA-eligible band must grow substantially when the
// contrast predictors are enabled — measured through the reseed's frontier
// counters (eligible = texels whose target exceeds the last sample index).
// A/B on the same view, same jitters: aaContrastEnabled false → true.
// The DE-only ring is also asserted non-empty (filament coverage preserved).

const LS_KEY = "mandelbrot_last_settings";
const AA_LEVEL = 8;

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

async function runAaAccumulation(page: Page, contrast: boolean, timeout = 180_000) {
  await page.evaluate((useContrast) => {
    const engine = (window as any).__mandelbrotEngine;
    engine.aaContrastEnabled = useContrast;
    engine.triggerAaAccumulation();
  }, contrast);
  const deadline = Date.now() + timeout;
  for (;;) {
    const p = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      return { ...engine.aaProgress };
    });
    if (!p.active && p.done >= AA_LEVEL) {
      break;
    }
    if (Date.now() > deadline) {
      throw new Error(`runAaAccumulation: timeout at ${JSON.stringify(p)}`);
    }
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      stamped: engine.aaFrontierStamped as number,
      eligible: engine.aaFrontierEligible as number,
    };
  });
}

test("contrast predictors widen the AA band on a short-period palette", async ({ page }) => {
  test.setTimeout(420_000);
  const gpuErrors = collectGpuErrors(page);

  // Auto mode, 8× manual AA, SHORT palette period (dense banding across the
  // whole exterior — aliasing the DE ramp cannot see).
  await page.addInitScript(([key, level]) => {
    const raw = localStorage.getItem(key as string);
    const params = raw ? JSON.parse(raw) : {};
    params.approximationMode = "auto";
    params.antialiasLevel = level;
    params.aaAuto = false;
    params.palettePeriod = 0.2;
    localStorage.setItem(key as string, JSON.stringify(params));
  }, [LS_KEY, AA_LEVEL] as const);
  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360);
  await page.waitForTimeout(1_500);
  await waitForConverged(page);

  // ── Run 1: DE ramp only ───────────────────────────────────────────
  const deOnly = await runAaAccumulation(page, false);
  console.log(`DE-only frontier: ${deOnly.stamped}/${deOnly.eligible}`);

  // ── Run 2: DE ∪ Sobel ∪ moiré ─────────────────────────────────────
  const fused = await runAaAccumulation(page, true);
  console.log(`contrast-fused frontier: ${fused.stamped}/${fused.eligible}`);

  expect(gpuErrors, `WebGPU errors:\n${gpuErrors.join("\n")}`).toEqual([]);

  // The DE ring exists (filament coverage preserved as the floor)…
  expect(deOnly.eligible).toBeGreaterThan(0);
  // …and the contrast predictors widen the band substantially on banding.
  expect(fused.eligible).toBeGreaterThan(deOnly.eligible * 1.5);
  expect(fused.eligible - deOnly.eligible).toBeGreaterThan(1000);
});
