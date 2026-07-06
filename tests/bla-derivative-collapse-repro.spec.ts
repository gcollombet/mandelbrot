import { test, expect, type Page } from "@playwright/test";
import path from "path";

// Repro/regression for fix-shallow-bla-derivative-collapse: classic BLA/Padé's
// shallow (f32) block-apply path (try_apply_bla) collapsed its distance-
// estimation derivative starting around zoom ~1e-18 (dot(dz,dz) f32
// underflow + no derS fold discipline), while jet/mobius+ (which route
// through the fe-domain block-table path) stayed correct at the same view.
// This renders the same near-critical (seahorse) coordinate at scale 1e-19 —
// well within the shallow regime (DEEP_EXP_THRESHOLD is 2^-100 ~ 8e-31) —
// across all four approximation modes and checks: no WebGPU errors, and
// BLA/Padé's relief-shaded (DE-driven) content statistics are in the same
// ballpark as jet/mobius+ at the identical view, instead of the degenerate
// (near-flat or wildly-noisy) output a corrupted derivative produces.

const SCREENSHOT_DIR = path.resolve("tests/screenshots");

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

async function waitForConverged(page: Page, timeout = 120_000) {
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

async function teleport(page: Page, cx: string, cy: string, scale: string) {
  await page.evaluate(([x, y, s]) => {
    const engine = (window as any).__mandelbrotEngine;
    const nav = engine.mandelbrotNavigator;
    nav.cancel_transition();
    nav.origin(x, y);
    nav.scale(s);
    nav.angle(0);
    engine.resetReference(x, y);
  }, [cx, cy, scale] as const);
  await page.waitForTimeout(2_000);
  await waitForConverged(page);
}

async function contentStats(page: Page, name: string): Promise<{ mean: number; std: number }> {
  const shot = await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    clip: { x: 300, y: 100, width: 900, height: 500 },
  });
  return page.evaluate(async (b64) => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = `data:image/png;base64,${b64}`;
    });
    const probe = document.createElement("canvas");
    probe.width = img.width;
    probe.height = img.height;
    const ctx = probe.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, probe.width, probe.height).data;
    let sum = 0;
    let sum2 = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sum += v;
      sum2 += v * v;
    }
    const mean = sum / n;
    return { mean, std: Math.sqrt(Math.max(0, sum2 / n - mean * mean)) };
  }, shot.toString("base64"));
}

test("shallow BLA/Padé DE stays sane at zoom ~1e-19 (matches jet/mobius+)", async ({ page }) => {
  test.setTimeout(240_000);
  const gpuErrors = collectGpuErrors(page);

  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360); // dismiss intro splash
  await page.waitForTimeout(1_500);
  await waitForConverged(page);

  const stats: Record<string, { mean: number; std: number }> = {};

  for (const mode of ["bla", "pade", "jet", "mobius"] as const) {
    await page.evaluate((m) => {
      const engine = (window as any).__mandelbrotEngine;
      engine.setApproximationMode(m);
    }, mode);
    // Antenna tip c = -2: exactly representable, bounded reference orbit, the
    // needle crosses the view at every depth so boundary structure is
    // guaranteed (same rationale as mobius-deep.spec.ts). 1e-19 is comfortably
    // in the shallow-BLA failure range (DEEP_EXP_THRESHOLD is 2^-100 ~ 8e-31).
    await teleport(page, "-2", "0", "1e-19");
    const s = await contentStats(page, `bla-de-collapse-${mode}`);
    stats[mode] = s;
    console.log(`${mode}: mean=${s.mean.toFixed(1)} std=${s.std.toFixed(1)}`);
  }

  expect(gpuErrors, `WebGPU errors:\n${gpuErrors.join("\n")}`).toEqual([]);

  // A collapsed derivative feeds relief/DE shading with garbage: either a
  // structureless flat frame (std collapses toward 0) or the value channel's
  // own escape-boundary structure swamped by per-pixel derivative noise
  // (std blows up far past the other modes). Neither mode should be blank.
  for (const mode of ["bla", "pade", "jet", "mobius"] as const) {
    expect(stats[mode].std, `${mode} produced a blank/flat frame`).toBeGreaterThan(3);
  }

  // BLA/Padé's relief-shaded content should be in the same ballpark as
  // jet/mobius+ at the identical view — not proof of bit-exact DE agreement
  // (the modes' skip lengths differ), but a collapsed derivative is expected
  // to diverge far more than ordinary per-mode shading variance.
  const reference = (stats.jet.std + stats.mobius.std) / 2;
  for (const mode of ["bla", "pade"] as const) {
    const ratio = stats[mode].std / reference;
    console.log(`${mode} std / jet+mobius avg std = ${ratio.toFixed(2)}`);
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(5);
  }
});
