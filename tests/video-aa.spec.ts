import { expect, test, type Page } from "@playwright/test";

// Per-frame AA relies on the engine's selective reseed: a jittered sample
// re-stamps only the boundary sliver and skips analytically-tagged texels, so it
// must cost far less than a fresh convergence. This measures that claim rather
// than assuming it.

async function bootConverged(page: Page) {
  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360);
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

const CONTROLLER_LOOKUP = `(() => {
  let node = document.querySelector('#fullscreen canvas');
  while (node) {
    let c = node.__vueParentComponent;
    while (c) {
      if (c.exposed && c.exposed.setExportTime) return c.exposed;
      c = c.parent;
    }
    node = node.parentElement;
  }
  return null;
})()`;

test("per-frame AA smooths edges without a full reconvergence", async ({ page }) => {
  test.setTimeout(240_000);
  await bootConverged(page);

  const result = await page.evaluate(async (lookup) => {
    const engine = (window as any).__mandelbrotEngine;
    // eslint-disable-next-line no-eval
    const controller = eval(lookup);
    engine.stopRenderLoop();

    const W = 480, H = 270;

    const grab = async (aa: number) => {
      await engine.beginVideoExportSession({
        magnificationThreshold: 8, outputWidth: W, outputHeight: H,
        supersample: 1, batchTargetFps: 1, aaSamplesPerFrame: aa,
      });
      controller.setExportTime(0);
      engine.beginExportFrameAa();
      let pumps = 0;
      for (; pumps < 600 && !engine.videoFrameReady(); pumps++) {
        await controller.drawOnce();
        await engine.waitForSubmittedWork();
      }
      const pending = engine.captureExportFrame({
        outputWidth: W, outputHeight: H, supersample: 1,
        timestampMicros: 0, durationMicros: 41666,
      });
      let settled = false;
      const done = pending.then((f: VideoFrame) => { settled = true; return f; });
      for (let i = 0; i < 8 && !settled; i++) {
        await controller.drawOnce();
        await engine.waitForSubmittedWork();
      }
      const frame = await done;
      const buf = new Uint8Array(frame.allocationSize());
      await frame.copyTo(buf);
      frame.close();
      const accumulated = engine.aaAccumulatedSamples;
      // The engine counts how many texels the last reseed stamped, and how many
      // were eligible — the direct measure of how thin the boundary sliver is.
      const stamped = engine.aaFrontierStamped;
      const eligible = engine.aaFrontierEligible;
      engine.endVideoExportSession();
      await new Promise(r => setTimeout(r, 300));
      return { pumps, accumulated, stamped, eligible, buf };
    };

    // Neighbour-difference energy: anti-aliasing lowers it, while the mean
    // brightness must stay put — a darker or blank frame would also score low.
    const stats = (buf: Uint8Array) => {
      let edge = 0, n = 0, sum = 0, nonBlack = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 1; x < W; x++) {
          const i = (y * W + x) * 4, j = (y * W + x - 1) * 4;
          edge += Math.abs(buf[i] - buf[j]) + Math.abs(buf[i + 1] - buf[j + 1])
            + Math.abs(buf[i + 2] - buf[j + 2]);
          n++;
        }
      }
      for (let k = 0; k < buf.length; k += 4) {
        sum += buf[k] + buf[k + 1] + buf[k + 2];
        if (buf[k] + buf[k + 1] + buf[k + 2] > 12) nonBlack++;
      }
      return {
        edgeEnergy: edge / n,
        mean: sum / (buf.length / 4) / 3,
        nonBlackRatio: nonBlack / (buf.length / 4),
      };
    };

    const one = await grab(1);
    const four = await grab(4);

    let differing = 0;
    for (let k = 0; k < one.buf.length; k += 4) {
      if (one.buf[k] !== four.buf[k]) differing++;
    }

    return {
      aa1: { pumps: one.pumps, accumulated: one.accumulated, ...stats(one.buf) },
      aa4: {
        pumps: four.pumps, accumulated: four.accumulated,
        stamped: four.stamped, eligible: four.eligible,
        stampedPctOfSurface: four.stamped >= 0 ? (100 * four.stamped) / (W * H) : -1,
        ...stats(four.buf),
      },
      differingPixelsPct: (100 * differing) / (one.buf.length / 4),
    };
  }, CONTROLLER_LOOKUP);

  console.log("aa:", JSON.stringify(result));

  // Both frames must be real images, or every other number here is meaningless.
  expect(result.aa1.nonBlackRatio).toBeGreaterThan(0.2);
  expect(result.aa4.nonBlackRatio).toBeGreaterThan(0.2);

  // The accumulation actually ran.
  expect(result.aa4.accumulated).toBe(4);

  // AA changed the image...
  expect(result.differingPixelsPct).toBeGreaterThan(1);
  // ...by smoothing it, not by darkening it.
  expect(result.aa4.edgeEnergy).toBeLessThan(result.aa1.edgeEnergy);
  expect(Math.abs(result.aa4.mean - result.aa1.mean)).toBeLessThan(result.aa1.mean * 0.1);

  // The point of the selective reseed: an extra sample re-stamps a thin band,
  // not the field. A handful of pumps for three extra samples, against the
  // hundreds a cold convergence of this surface takes.
  expect(result.aa4.pumps).toBeLessThan(30);
  // And when the engine reports the frontier, that band must be a small
  // fraction of the frame rather than most of it.
  if (result.aa4.stamped >= 0) {
    expect(result.aa4.stampedPctOfSurface).toBeLessThan(25);
  }
});
