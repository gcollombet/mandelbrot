import { test, expect, type Page } from "@playwright/test";
import path from "path";

// Debug visualization pipeline (mandelbrot_debug.wgsl): renders instrumented
// block-skipping diagnostics as colors. Checks the pass runs without WebGPU
// errors and produces non-trivial imagery on a deep view in jet mode.

function collectGpuErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (/WebGPU|GPUValidationError|validation|Tint/i.test(t) && /error|invalid|fail/i.test(t)) errors.push(t);
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

test("debug views render diagnostics for jet and pade", async ({ page }) => {
  test.setTimeout(120_000);
  const gpuErrors = collectGpuErrors(page);
  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360);
  await page.waitForTimeout(1_500);

  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    const nav = engine.mandelbrotNavigator;
    engine.setApproximationMode("jet");
    engine.setPrecisionBudget("1e-40");
    nav.cancel_transition();
    nav.origin("-2", "0");
    nav.scale("1e-32");
    nav.angle(0);
    engine.resetReference("-2", "0");
  });
  await page.waitForTimeout(8_000); // let the reference + jet table land

  for (const [mode, view] of [["jet", 2], ["jet", 3], ["pade", 2]] as const) {
    await page.evaluate(([m, v]) => {
      const engine = (window as any).__mandelbrotEngine;
      engine.setApproximationMode(m);
      engine.debugViewOverride = v;
      engine.needRender = true;
    }, [mode, view] as const);
    await page.waitForTimeout(3_000);
    const shot = await page.screenshot({
      path: path.join("tests/screenshots", `debug-${mode}-view${view}.png`),
      clip: { x: 300, y: 100, width: 900, height: 500 },
    });
    const stats = await page.evaluate(async (b64) => {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const el = new Image();
        el.onload = () => res(el); el.onerror = rej;
        el.src = `data:image/png;base64,${b64}`;
      });
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, sum2 = 0;
      const n = d.length / 4;
      for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
        sum += v; sum2 += v * v;
      }
      const mean = sum / n;
      return { mean, std: Math.sqrt(Math.max(0, sum2 / n - mean * mean)) };
    }, shot.toString("base64"));
    console.log(`debug ${mode} view ${view}: mean=${stats.mean.toFixed(1)} std=${stats.std.toFixed(1)}`);
    expect(stats.mean).toBeGreaterThan(1);
  }
  await page.evaluate(() => { (window as any).__mandelbrotEngine.debugViewOverride = 0; });
  expect(gpuErrors, `WebGPU errors:\n${gpuErrors.join("\n")}`).toEqual([]);
});
