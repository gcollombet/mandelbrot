import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// Jet mode on the DEEP (floatexp) shader path (add-jet-approximation, task
// 6.2): teleports to a scale of 1e-32 — well below the deep threshold
// 2^-100 ≈ 1e-30 — in the Feigenbaum cascade region, renders in jet mode, and
// checks the deep loop converges with the jet flag active and no WebGPU
// validation errors. The numeric correctness of the deep evaluation is covered
// by the Rust CPU harness; this validates the GPU plumbing (fe evaluation,
// log-space radii, table upload) end to end.

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

test("jet mode renders on the deep floatexp path", async ({ page }) => {
  test.setTimeout(180_000);
  const gpuErrors = collectGpuErrors(page);

  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360); // dismiss intro splash
  await page.waitForTimeout(1_500);
  await waitForConverged(page);

  // Teleport to the deep view in jet mode (same snap sequence as a completed
  // "travel to preset": cancel transition, snap centre/scale, hard reference
  // reset). Centre: the antenna tip c = −2 — EXACTLY representable, its
  // reference orbit is bounded (0 → −2 → 2 → 2 → …), and the needle crosses
  // the view horizontally at every depth, guaranteeing boundary structure.
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    const nav = engine.mandelbrotNavigator;
    engine.setApproximationMode("jet");
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

  const state = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      flag: engine.lastShaderApproxFlag,
      levels: engine.lastShaderBlaLevelCount,
      unfinished: engine.unfinishedPixelCount,
    };
  });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "jet-deep-01.png"),
    clip: { x: 300, y: 100, width: 900, height: 500 },
  });

  // The deep path ran in jet mode with a live table and converged.
  expect(state.flag).toBe(3);
  expect(state.levels).toBeGreaterThan(0);
  expect(state.unfinished).toBeLessThanOrEqual(10);
  expect(gpuErrors, `WebGPU errors on the deep jet path:\n${gpuErrors.join("\n")}`).toEqual([]);

  // Non-trivial content: the needle must produce visible structure (a blank
  // frame would mean the deep jet loop broke even though it "converged").
  // NOTE: read the compositor screenshot, not the canvas — WebGPU canvases
  // don't preserve their drawing buffer for 2D readback.
  const shot = await page.screenshot({ clip: { x: 300, y: 100, width: 900, height: 500 } });
  const content = await page.evaluate(async (b64) => {
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
  console.log(`deep jet content: mean=${content.mean.toFixed(1)} std=${content.std.toFixed(1)}`);
  expect(content.std).toBeGreaterThan(3);

  // ── Regression: field-reported dead table at 1e-51 (deep fe path) ──
  // Gate (b)'s Cauchy tail used the JOINT majorant (carrying the |a10|R_z
  // z-part), so below some c_max every radius died: realizedSkip 1 vs BLA 38
  // at 1e-51. Fixed with a c-axis majorant; assert jet actually skips there.
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    const nav = engine.mandelbrotNavigator;
    engine.setApproximationMode("jet");
    nav.cancel_transition();
    nav.origin("-2", "0");
    nav.scale("1e-51");
    nav.angle(0);
    engine.resetReference("-2", "0");
  });
  await page.waitForTimeout(2_000);
  await waitForConverged(page);
  // realizedSkip is only sampled while dispatches run: force a recompute and
  // poll DURING it, keeping the max sample seen.
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.clearHistoryNextFrame = true;
    engine.needRender = true;
  });
  let midSkip = -1;
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(200);
    const s = await page.evaluate(() => (window as any).__mandelbrotEngine.realizedSkip);
    if (s > midSkip) midSkip = s;
  }
  const midFlag = await page.evaluate(() => (window as any).__mandelbrotEngine.lastShaderApproxFlag);
  console.log(`deep 1e-51 jet: realizedSkip=${midSkip?.toFixed?.(2)}, flag=${midFlag}`);
  expect(midFlag).toBe(3);
  expect(midSkip).toBeGreaterThan(1.2);
  expect(gpuErrors, `WebGPU errors in the underflow band:\n${gpuErrors.join("\n")}`).toEqual([]);

  // ── Wall-clock comparison at depth (task 8.2) ─────────────────────
  // Full reconvergence of the same deep view per mode.
  for (const mode of ["bla", "pade", "jet"] as const) {
    await page.evaluate((m) => {
      const engine = (window as any).__mandelbrotEngine;
      engine.setApproximationMode(m);
    }, mode);
    await page.waitForTimeout(500);
    const t0 = Date.now();
    await waitForConverged(page);
    const ms = Date.now() - t0;
    await page.waitForTimeout(1_200); // let a counter readback land
    const m = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      return { skip: engine.realizedSkip, flag: engine.lastShaderApproxFlag };
    });
    console.log(`deep reconverge [${mode}]: ${ms}ms, realizedSkip=${m.skip?.toFixed?.(1)}, flag=${m.flag}`);
  }
  expect(gpuErrors, `WebGPU errors during mode sweep:\n${gpuErrors.join("\n")}`).toEqual([]);
});
