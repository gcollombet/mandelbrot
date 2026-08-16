import { expect, test, type Page } from "@playwright/test";

// After an export, the interactive view must come back. The export pins the
// compute surface to the film's geometry and parks the render loop, so a
// mistake here leaves the user staring at a black canvas.

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

/** Fraction of non-black pixels in a screenshot of the canvas element. */
async function canvasBrightness(page: Page) {
  const shot = await page.locator("#fullscreen canvas").screenshot();
  return page.evaluate(async (bytes) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonBlack = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] + data[i + 1] + data[i + 2] > 24) nonBlack++;
    }
    return { nonBlackRatio: nonBlack / (data.length / 4), width: canvas.width, height: canvas.height };
  }, Array.from(shot));
}

for (const supersample of [1, 2]) {
  test(`interactive view survives an export at supersample x${supersample}`, async ({ page }) => {
    test.setTimeout(240_000);

    await page.goto("/");
    await page.evaluate(() => import("/src/videoExportRunner.ts").then(() => true, () => false))
      .catch(() => undefined);
    await page.waitForTimeout(4_000);
    await bootConverged(page);

    const before = await canvasBrightness(page);
    expect(before.nonBlackRatio).toBeGreaterThan(0.2);

    const outcome = await page.evaluate(async ([lookup, ss]) => {
      const { runVideoExportToWebm } = await import("/src/videoExportRunner.ts");
      const engine = (window as any).__mandelbrotEngine;
      // eslint-disable-next-line no-eval
      const controller = eval(lookup as string);
      const p = controller.getParams();
      const result = await runVideoExportToWebm(
        { engine, controller },
        {
          from: { cx: p[0], cy: p[1], scale: p[2], angle: parseFloat(p[3]) },
          // Ends where it starts, so "after" is comparable to "before". A
          // parcours that travels elsewhere legitimately leaves the view on a
          // different — often darker — destination, which would make any
          // brightness threshold meaningless.
          to: { cx: p[0], cy: p[1], scale: p[2], angle: parseFloat(p[3]) },
          durationSeconds: 0.25,
          codec: "av1",
          destination: { kind: "buffer" },
          output: { width: 480, height: 270, fps: 24, supersample: ss as number, magnificationThreshold: 2 },
          maxTextureDimension: engine.device.limits.maxTextureDimension2D,
        },
      );
      return {
        bytes: result.blob ? result.blob.size : 0,
        renderLoopRunning: engine._rafId !== null,
        aaSamples: engine.aaAccumulatedSamples,
        surface: { w: engine.width, h: engine.height },
      };
    }, [CONTROLLER_LOOKUP, supersample] as const);

    expect(outcome.bytes).toBeGreaterThan(500);
    // The parked loop must be handed back, or nothing ever paints again.
    expect(outcome.renderLoopRunning).toBe(true);

    // Give the restored loop a moment to repaint the interactive view.
    await page.waitForTimeout(4_000);
    const diag = await page.evaluate(() => {
      const e = (window as any).__mandelbrotEngine;
      const canvas = document.querySelector("#fullscreen canvas") as HTMLCanvasElement;
      return {
        rafArmed: e._rafId !== null,
        drawFn: !!e._drawFn,
        needsMoreFrames: e.needsMoreFrames(),
        needRender: e.needRender,
        unfinished: e.unfinishedPixelCount,
        fps: e.fps,
        surface: { w: e.width, h: e.height, neutral: e.neutralSize },
        canvasAttr: { w: canvas.width, h: canvas.height },
        canvasCss: { w: canvas.clientWidth, h: canvas.clientHeight },
        previousRenderOptions: !!e.previousRenderOptions,
        exportActive: e.isVideoExportActive(),
      };
    });
    console.log("diag", JSON.stringify(diag));
    const after = await canvasBrightness(page);
    console.log(`ss=${supersample} before=${before.nonBlackRatio.toFixed(3)} `
      + `after=${after.nonBlackRatio.toFixed(3)} surfaceDuringExport=${JSON.stringify(outcome.surface)}`);

    // The parcours returns to its starting view, so the restored canvas must
    // look like it did before the export — not merely "not black".
    expect(after.nonBlackRatio).toBeGreaterThan(before.nonBlackRatio * 0.8);
  });
}
