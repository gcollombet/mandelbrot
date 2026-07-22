import { expect, test, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const ENABLED = process.env.MANDELBROT_RUN_NAVIGATION_BENCHMARK === "1";
const OUTPUT_PATH = path.resolve(
  process.env.MANDELBROT_NAVIGATION_BENCHMARK_PATH
    ?? "test-results/benchmarks/legacy-auto-navigation.json",
);

type NavigationSamples = {
  frameMs: number[];
  iterationPassMs: number[];
};

function percentile(values: number[], quantile: number): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1);
  return sorted[Math.max(0, index)];
}

async function waitForConverged(page: Page, timeout = 180_000) {
  const deadline = Date.now() + timeout;
  let stableSamples = 0;
  while (stableSamples < 8) {
    if (Date.now() > deadline) throw new Error("waitForConverged: timeout");
    const idle = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      return !!engine
        && engine.unfinishedPixelCount >= 0
        && engine.unfinishedPixelCount <= 10
        && !engine.isRendering
        && !engine.needRender
        && !engine.clearHistoryNextFrame
        && !engine.tableBuildActive;
    });
    stableSamples = idle ? stableSamples + 1 : 0;
    await page.waitForTimeout(250);
  }
}

async function startSampling(page: Page) {
  await page.evaluate(() => {
    const state = {
      active: true,
      lastFrameSerial: -1,
      lastIterationSerial: -1,
      frameMs: [] as number[],
      iterationPassMs: [] as number[],
    };
    (window as any).__legacyAutoNavigationSamples = state;

    const sample = () => {
      if (!state.active) return;
      const engine = (window as any).__mandelbrotEngine;
      if (engine) {
        if (engine.frameSerial !== state.lastFrameSerial) {
          state.lastFrameSerial = engine.frameSerial;
          if (engine.frameIntervalMs > 0 && engine.frameIntervalMs < 5_000) {
            state.frameMs.push(engine.frameIntervalMs);
          }
        }
        if (engine.iterationPassTimingSerial !== state.lastIterationSerial) {
          state.lastIterationSerial = engine.iterationPassTimingSerial;
          if (engine.lastIterationPassMs >= 0) {
            state.iterationPassMs.push(engine.lastIterationPassMs);
          }
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function stopSampling(page: Page): Promise<NavigationSamples> {
  return page.evaluate(() => {
    const state = (window as any).__legacyAutoNavigationSamples;
    state.active = false;
    return {
      frameMs: state.frameMs,
      iterationPassMs: state.iterationPassMs,
    };
  });
}

test.describe("legacy Auto navigation benchmark", () => {
  test.skip(!ENABLED, "Run explicitly with npm run benchmark:navigation");
  test.setTimeout(240_000);

  test("records cmax rebuilds, latency percentiles, skips, and exact fallback", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
    await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
    const splash = page.locator(".splash");
    if (await splash.isVisible().catch(() => false)) await splash.click({ force: true });

    await page.evaluate(() => (window as any).__mandelbrotEngine.setApproximationMode("auto"));
    await waitForConverged(page);

    const initial = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      return {
        cmaxOnlyTableRebuildCount: engine.cmaxOnlyTableRebuildCount as number,
        referenceResetSerial: engine.referenceResetSerial as number,
        timestampCapable: engine.timestampCapable as boolean,
      };
    });
    expect(initial.timestampCapable, "navigation timing requires WebGPU timestamp-query").toBe(true);

    await startSampling(page);
    // Smooth zoom-in followed by zoom-out keeps the reference orbit while
    // crossing several legacy cmax radius rungs in both directions.
    for (let i = 0; i < 36; i++) {
      await page.evaluate(() => {
        const engine = (window as any).__mandelbrotEngine;
        engine.mandelbrotNavigator.zoom(0.92);
        engine.needRender = true;
      });
      await page.waitForTimeout(50);
    }
    for (let i = 0; i < 36; i++) {
      await page.evaluate(() => {
        const engine = (window as any).__mandelbrotEngine;
        engine.mandelbrotNavigator.zoom(1 / 0.92);
        engine.needRender = true;
      });
      await page.waitForTimeout(50);
    }
    await waitForConverged(page);
    // Let the final exact GPU stats readback land after convergence.
    await page.waitForTimeout(1_000);
    const samples = await stopSampling(page);

    const final = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      const tierApps = (engine.tierAppsApprox ?? [-1, -1, -1, -1]) as number[];
      const totalApps = (engine.lastCompletionTotalApps ?? -1) as number;
      const blockApps = tierApps.every((value) => value >= 0)
        ? tierApps.reduce((sum, value) => sum + value, 0)
        : -1;
      return {
        cmaxOnlyTableRebuildCount: engine.cmaxOnlyTableRebuildCount as number,
        referenceResetSerial: engine.referenceResetSerial as number,
        realizedSkip: (engine.realizedSkip ?? -1) as number,
        totalApps,
        blockApps,
        exactFallbackAppsApprox: totalApps >= 0 && blockApps >= 0
          ? Math.max(0, totalApps - blockApps)
          : -1,
      };
    });

    const report = {
      schemaVersion: 1,
      variant: "legacy-auto",
      navigation: {
        zoomInSteps: 36,
        zoomOutSteps: 36,
        zoomFactor: 0.92,
        stepIntervalMs: 50,
      },
      samples: {
        iterationPass: samples.iterationPassMs.length,
        frame: samples.frameMs.length,
      },
      iterationPassMs: {
        p50: percentile(samples.iterationPassMs, 0.50),
        p95: percentile(samples.iterationPassMs, 0.95),
      },
      frameMs: {
        p50: percentile(samples.frameMs, 0.50),
        p95: percentile(samples.frameMs, 0.95),
      },
      cmaxOnlyTableRebuilds: final.cmaxOnlyTableRebuildCount - initial.cmaxOnlyTableRebuildCount,
      realizedSkip: final.realizedSkip,
      exactFallbackAppsApprox: final.exactFallbackAppsApprox,
      totalApps: final.totalApps,
      blockApps: final.blockApps,
      referenceResets: final.referenceResetSerial - initial.referenceResetSerial,
    };

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`legacy Auto navigation benchmark: ${JSON.stringify(report)}`);

    expect(samples.frameMs.length).toBeGreaterThan(0);
    expect(samples.iterationPassMs.length).toBeGreaterThan(0);
    expect(report.referenceResets, "benchmark must isolate cmax drift from reference replacement").toBe(0);
  });
});
