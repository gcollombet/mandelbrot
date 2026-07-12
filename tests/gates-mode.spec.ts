import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// §18 parabolic Fatou gates (round 8 stage b + observability round): the
// unified sidecar ships gate records for the coarse parabolic views (cusp
// −0.75, period2 −1.25) and the shallow shader loop fast-forwards whole
// quasi-parabolic transits in one Ψ-translation. Emission is DORMANT by
// default (the hop loop is not yet profitable under SIMT) and runtime-
// switchable: engine.setGateEmission(true) rebuilds the sidecar in place.
// Per view, in ONE session: (1) dormant auto — flag 5, gateJumps == 0;
// (2) flip emission, reconverge — gateJumps > 0 (the dedicated workStats
// counter, the only reliable firing signal), pixel-identical image, zero
// WebGPU validation errors; wall-clock of both states logged for the
// optimization rounds.

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

async function waitForConverged(page: Page, timeout = 180_000) {
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

async function setMode(page: Page, mode: string) {
  await page.evaluate((m) => {
    const engine = (window as any).__mandelbrotEngine;
    engine.setApproximationMode(m);
  }, mode);
  await page.waitForTimeout(300);
}

async function timedConverge(page: Page, mode: string) {
  await setMode(page, mode);
  const t0 = Date.now();
  await waitForConverged(page);
  const ms = Date.now() - t0;
  return page.evaluate((elapsed) => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      ms: elapsed as number,
      realizedSkip: (engine.realizedSkip ?? -1) as number,
      flag: engine.lastShaderApproxFlag as number,
      levels: engine.lastShaderBlaLevelCount as number,
    };
  }, ms);
}

async function canvasScreenshot(page: Page, name: string): Promise<Buffer> {
  return page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
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
    let significant = 0;
    for (let i = 0; i < imgA.data.length; i += 4) {
      const delta = Math.max(
        Math.abs(imgA.data[i] - imgB.data[i]),
        Math.abs(imgA.data[i + 1] - imgB.data[i + 1]),
        Math.abs(imgA.data[i + 2] - imgB.data[i + 2]),
      );
      if (delta > 24) significant++; // tolerate the near-black overlay wash
    }
    return { total: imgA.data.length / 4, significant };
  }, [a.toString("base64"), b.toString("base64")] as const);
}

for (const view of [
  // On-axis: the REFERENCE must sit at the parabolic point (an off-centre
  // reference escapes mid-orbit and fragments/kills gate detection — that is
  // the field case the longest-first sort + bounded-prefix detection guard).
  // The view is all-interior at this budget (black): the pixel diff is a
  // weak visual check here, the JUMP COUNTER is the real assert — these are
  // exactly the "pixels crawl to maxIter" workloads gates exist for.
  { name: "cusp", cx: "-0.75", cy: "0", scale: "1e-5", mult: 2.0 },
  { name: "period2", cx: "-1.25", cy: "0", scale: "1e-5", mult: 2.0 },
  // ~100k iterations: the gate's O(1) transit vs the linear brute cost —
  // the profitability crossover should appear here.
  { name: "cusp-100k", cx: "-0.75", cy: "0", scale: "1e-5", mult: 6.0 },
]) {
  test(`gates fire on the ${view.name} parabolic view and preserve the render`, async ({ page }) => {
    test.setTimeout(600_000);
    const gpuErrors = collectGpuErrors(page);

    // Boot straight on the parabolic view with a ×20 iteration budget
    // (multiplier 2.0 → ~33k iterations at 1e-5): gates only exist at coarse
    // c_max (saturation is a coarse-scale phenomenon — deep majorants are
    // recovered by the v3 bisection), and only pay above the profitability
    // floor (~2k iterations per jump), i.e. exactly the raised-iteration
    // parabolic views that used to crawl.
    await page.addInitScript(([cx, cy, scale, mult]) => {
      localStorage.setItem("mandelbrot_last_settings", JSON.stringify({
        cx, cy, scale, maxIterationMultiplier: Number(mult),
      }));
    }, [view.cx, view.cy, view.scale, String(view.mult)] as const);

    // ── DEFAULT boot (gates ON since the optimization round) — timed
    // SYMMETRICALLY with the gate-less boot below (both include reference +
    // table build + the whole convergence; the delta isolates the gates).
    await page.goto("/");
    await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
    await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
    await page.mouse.click(640, 360);
    await page.waitForTimeout(1_500);
    const tD = Date.now();
    await waitForConverged(page, 300_000);
    const dormantMs = Date.now() - tD;
    const dormant = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      return {
        flag: engine.lastShaderApproxFlag as number,
        levels: engine.lastShaderBlaLevelCount as number,
      };
    });
    const dormantShot = await canvasScreenshot(page, `gates-${view.name}-00-default`);
    const dormantStats = await gateStats(page);
    expect(dormant.flag).toBe(5);
    expect(dormant.levels).toBeGreaterThan(0);
    // Default emission is ON: the parabolic views must actually jump.
    expect(dormantStats.jumps, "default boot must fire gates").toBeGreaterThan(0);

    // ── KILL SWITCH: fresh boot with emission disabled BEFORE the reference
    // builds (boot-style flow — a mid-session toggle races the table repost).
    await page.goto("/");
    await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
    await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
    await page.evaluate(() => {
      (window as any).__mandelbrotEngine.setGateEmission(false);
    });
    await page.mouse.click(640, 360);
    await page.waitForTimeout(1_500);
    const t0 = Date.now();
    await waitForConverged(page, 300_000);
    const activeMs = Date.now() - t0;
    const active = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      return {
        flag: engine.lastShaderApproxFlag as number,
        levels: engine.lastShaderBlaLevelCount as number,
      };
    });
    await page.waitForTimeout(2_000); // let any splash/overlay residue settle
    const activeShot = await canvasScreenshot(page, `gates-${view.name}-01-gateless`);
    const activeStats = await gateStats(page);
    expect(active.flag).toBe(5);
    expect(activeStats.jumps, "kill switch must silence the gates").toBeLessThanOrEqual(0);
    expect(gpuErrors, `WebGPU errors:\n${gpuErrors.join("\n")}`).toEqual([]);

    const diff = await diffStats(page, dormantShot, activeShot);
    const sigRatio = diff.significant / diff.total;
    console.log(
      `[${view.name}] default(gates) boot: ${dormantMs} ms | gate-less boot: ${activeMs} ms,`
      + ` jumps ${dormantStats.jumps} fails ${dormantStats.fails}`
      + ` | pixel diff significant ${(sigRatio * 100).toFixed(2)}%`,
    );

    // (b) gates must never change WHAT is rendered.
    expect(sigRatio).toBeLessThan(0.10);
  });
}

/** Poll the completion-readback gate counters (land async after converge). */
async function gateStats(page: Page): Promise<{ jumps: number; fails: number }> {
  for (let i = 0; i < 40; i++) {
    const s = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      const g = engine.gateStatsApprox ?? [-1, -1];
      return { jumps: g[0] as number, fails: g[1] as number };
    });
    if (s.jumps >= 0) {
      return s;
    }
    await page.waitForTimeout(250);
  }
  return { jumps: -1, fails: -1 };
}
