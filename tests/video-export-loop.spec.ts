import { expect, test, type Page } from "@playwright/test";

// Runs the real export loop end to end. This is the test whose absence let a
// microtask-starvation bug through: every unit test passed, the capture and the
// encoder each worked in isolation, and the assembled loop could not converge a
// single frame.

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

/** Reach the Mandelbrot component's exposed API through the Vue instance tree. */
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

test("runs a full export loop and produces a video file", async ({ page }) => {
  test.setTimeout(240_000);

  // Warm Vite's dependency optimizer: the first mediabunny import reloads.
  await page.goto("/");
  await page.evaluate(() => import("/src/videoExportRunner.ts").then(() => true, () => false))
    .catch(() => undefined);
  await page.waitForTimeout(4_000);

  await bootConverged(page);

  const result = await page.evaluate(async (lookup) => {
    const { runVideoExportToWebm } = await import("/src/videoExportRunner.ts");
    const engine = (window as any).__mandelbrotEngine;
    // eslint-disable-next-line no-eval
    const controller = eval(lookup);
    if (!controller) throw new Error("controller not reachable");

    // Stop the interactive render loop first. The export must drive every
    // render it needs, including the one that fulfils each capture: relying on
    // rAF made every frame wait for an animation tick and deadlocked outright
    // in a background tab, where rAF never fires.
    engine.stopRenderLoop();

    const params = controller.getParams();
    const from = { cx: params[0], cy: params[1], scale: params[2], angle: parseFloat(params[3]) };
    // Six octaves so the frozen/live cycle actually swaps during the run.
    const to = { cx: params[0], cy: params[1], scale: String(parseFloat(params[2]) / 64), angle: from.angle };

    // The frozen/live cycle must SURVIVE across frames. The engine derives its
    // zoom events by comparing against the previous PASS, and an export pumps
    // many passes at a fixed camera — which looked exactly like "the user
    // stopped zooming". `scaleStable` then merged, cleared history and dropped
    // back to idle on the second pump of every frame, so the cycle was rebuilt
    // from scratch each time and the magnification threshold changed nothing.
    let idleReturns = 0;
    let swaps = 0;
    let wasReprojecting = false;
    let lastFrozen: number | null = null;
    const originalDrawOnce = controller.drawOnce;
    controller.drawOnce = async function (...args: unknown[]) {
      const result = await originalDrawOnce.apply(this, args);
      const zoom = engine.zoomState;
      if (wasReprojecting && zoom.kind === "idle") idleReturns++;
      if (zoom.kind === "reprojecting" && zoom.frozenScale !== lastFrozen) {
        lastFrozen = zoom.frozenScale;
        swaps++;
      }
      wasReprojecting = zoom.kind === "reprojecting";
      return result;
    };

    const progress: number[] = [];
    const outcome = await runVideoExportToWebm(
      { engine, controller },
      {
        from, to,
        durationSeconds: 0.5,
        codec: "av1",
        destination: { kind: "buffer" },
        output: { width: 240, height: 135, fps: 24, supersample: 2, magnificationThreshold: 2 },
        maxTextureDimension: engine.device.limits.maxTextureDimension2D,
        onProgress: (p: any) => progress.push(p.framesEmitted),
      },
    );

    controller.drawOnce = originalDrawOnce;

    const head = outcome.blob
      ? Array.from(new Uint8Array(await outcome.blob.slice(0, 8).arrayBuffer()))
      : null;

    return {
      framesEmitted: outcome.framesEmitted,
      totalPumps: outcome.totalPumps,
      freeFrames: outcome.freeFrames,
      codec: outcome.codec,
      codec: outcome.codec,
      fileExtension: outcome.fileExtension,
      cancelled: outcome.cancelled,
      bytes: outcome.blob ? outcome.blob.size : 0,
      magic: head,
      progressLength: progress.length,
      renderLoopRunning: engine._rafId !== null,
      zoomCycleIdleReturns: idleReturns,
      swaps,
      // The session must hand every real-time setting back.
      exportStillActive: engine.isVideoExportActive(),
      animationOverride: engine.animationTimeOverride,
      threshold: engine.zoomMagnificationThreshold,
    };
  }, CONTROLLER_LOOKUP);

  console.log("export loop:", JSON.stringify(result));

  expect(result.cancelled).toBe(false);
  expect(result.framesEmitted).toBe(12); // ceil(0.5 * 24)
  expect(result.progressLength).toBe(12);
  // ISO-BMFF: the first box is 'ftyp', whose type sits at bytes 4..7.
  expect(result.magic.slice(4)).toEqual([0x66, 0x74, 0x79, 0x70]);
  expect(result.codec).toBe("av1");
  expect(result.fileExtension).toBe("mp4");
  expect(result.bytes).toBeGreaterThan(500);

  // Proof the loop is self-driving: the interactive loop was stopped before the
  // export and must not have been restarted to make it work.
  expect(result.renderLoopRunning).toBe(false);

  // The frozen/live cycle's whole point: a zoom must cost far fewer
  // convergences than it has frames. Without reuse every frame would be a full
  // reconverge, so pumps would scale with the frame count.
  expect(result.freeFrames).toBeGreaterThan(0);
  expect(result.totalPumps).toBeLessThan(result.framesEmitted * 4);

  // The cycle must never collapse back to idle mid-export: that was the defect
  // that made the threshold inert and every frame a full reconverge.
  expect(result.zoomCycleIdleReturns).toBe(0);

  // Session teardown, on the success path.
  expect(result.exportStillActive).toBe(false);
  expect(result.animationOverride).toBeNull();
  expect(result.threshold).toBe(16);
});
