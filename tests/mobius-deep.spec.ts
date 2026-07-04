import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// Möbius-c+ on the DEEP (floatexp) shader path + the near-critical passage
// (add-mobius-cplus, task 6.2): (1) teleports to 1e-32 — below the deep
// threshold 2^-100 — at the antenna tip and checks the deep fe apply converges
// with flag 4, a live table and visible structure; (2) renders the seahorse
// near-critical reference (the historical guard-(G) region) and checks it is
// traversed without blackout. Numeric correctness is covered by the Rust CPU
// battery; this validates the GPU plumbing end to end.

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

test("mobius+ renders on the deep floatexp path and traverses the near-critical view", async ({ page }) => {
  test.setTimeout(240_000);
  const gpuErrors = collectGpuErrors(page);

  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360); // dismiss intro splash
  await page.waitForTimeout(1_500);
  await waitForConverged(page);

  // ── Deep fe path: antenna tip c = −2 at 1e-32 ─────────────────────
  // Exactly representable centre with a bounded reference orbit; the needle
  // crosses the view at every depth, guaranteeing boundary structure.
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.setApproximationMode("mobius");
    engine.setPrecisionBudget("1e-40");
  });
  await teleport(page, "-2", "0", "1e-32");

  const deepState = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      flag: engine.lastShaderApproxFlag,
      levels: engine.lastShaderBlaLevelCount,
      unfinished: engine.unfinishedPixelCount,
    };
  });
  const deepContent = await contentStats(page, "mobius-deep-01");
  console.log(`deep mobius: flag=${deepState.flag} levels=${deepState.levels} content mean=${deepContent.mean.toFixed(1)} std=${deepContent.std.toFixed(1)}`);

  expect(deepState.flag).toBe(4);
  expect(deepState.levels).toBeGreaterThan(0);
  expect(deepState.unfinished).toBeLessThanOrEqual(10);
  // A blank frame would mean the deep mobius apply broke despite "converging".
  expect(deepContent.std).toBeGreaterThan(3);
  expect(gpuErrors, `WebGPU errors on the deep mobius path:\n${gpuErrors.join("\n")}`).toEqual([]);

  // ── Near-critical passage: the seahorse guard-(G) region ──────────
  // Plain Möbius/Padé needed guard (G) here; mobius+ traverses on its
  // certified radius alone. A blackout (structureless frame) or a validation
  // error would flag the annihilation/certification plumbing.
  await teleport(page, "-0.743643887037151", "0.131825904205330", "1e-10");

  const seaState = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      flag: engine.lastShaderApproxFlag,
      levels: engine.lastShaderBlaLevelCount,
      unfinished: engine.unfinishedPixelCount,
      realizedSkip: engine.realizedSkip,
    };
  });
  const seaContent = await contentStats(page, "mobius-deep-02-seahorse");
  console.log(`seahorse mobius: flag=${seaState.flag} levels=${seaState.levels} skip=${seaState.realizedSkip?.toFixed?.(1)} content mean=${seaContent.mean.toFixed(1)} std=${seaContent.std.toFixed(1)}`);

  expect(seaState.flag).toBe(4);
  expect(seaState.levels).toBeGreaterThan(0);
  expect(seaState.unfinished).toBeLessThanOrEqual(10);
  expect(seaContent.std).toBeGreaterThan(3);
  expect(gpuErrors, `WebGPU errors on the seahorse view:\n${gpuErrors.join("\n")}`).toEqual([]);

  // ── Wall-clock comparison at depth (feeds the 6.3 field round) ─────
  for (const mode of ["pade", "jet", "mobius"] as const) {
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
    console.log(`seahorse reconverge [${mode}]: ${ms}ms, realizedSkip=${m.skip?.toFixed?.(1)}, flag=${m.flag}`);
  }
  expect(gpuErrors, `WebGPU errors during mode sweep:\n${gpuErrors.join("\n")}`).toEqual([]);
});
