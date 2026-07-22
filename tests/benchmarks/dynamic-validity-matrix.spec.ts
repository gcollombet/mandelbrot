import { expect, test, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const ENABLED = process.env.MANDELBROT_RUN_DYNAMIC_VALIDITY_BENCHMARK === "1";
const OUTPUT_PATH = path.resolve(
  process.env.MANDELBROT_DYNAMIC_VALIDITY_BENCHMARK_PATH
    ?? "test-results/benchmarks/dynamic-validity-matrix.json",
);
const MIN_SAMPLES = 30;

type Variant = {
  id: "legacy-exact" | "legacy-bla" | "legacy-pade" | "legacy-jet" | "legacy-mobius"
    | "legacy-auto" | "dynamic-auto" | "dynamic-incremental-auto";
  mode: "perturbation" | "bla" | "pade" | "jet" | "mobius" | "auto";
  dynamic: boolean;
  incremental: boolean;
  expectedFlag: number;
};

const VARIANTS: Variant[] = [
  { id: "legacy-exact", mode: "perturbation", dynamic: false, incremental: false, expectedFlag: 0 },
  { id: "legacy-bla", mode: "bla", dynamic: false, incremental: false, expectedFlag: 1 },
  { id: "legacy-pade", mode: "pade", dynamic: false, incremental: false, expectedFlag: 2 },
  { id: "legacy-jet", mode: "jet", dynamic: false, incremental: false, expectedFlag: 3 },
  { id: "legacy-mobius", mode: "mobius", dynamic: false, incremental: false, expectedFlag: 4 },
  { id: "legacy-auto", mode: "auto", dynamic: false, incremental: false, expectedFlag: 5 },
  { id: "dynamic-auto", mode: "auto", dynamic: true, incremental: false, expectedFlag: 6 },
  { id: "dynamic-incremental-auto", mode: "auto", dynamic: true, incremental: true, expectedFlag: 6 },
];

function percentile(values: number[], quantile: number): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1))];
}

async function waitForConverged(page: Page, timeout = 180_000) {
  const deadline = Date.now() + timeout;
  let stable = 0;
  while (stable < 6) {
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
    stable = idle ? stable + 1 : 0;
    await page.waitForTimeout(200);
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
      workSession: -1,
      latestWork: null as null | {
        realizedSkip: number;
        totalApps: number;
        tierApps: number[];
        dynamicAttempts: number[];
        dynamicAccepts: number[];
        dynamicExactFallbacks: number;
      },
    };
    (window as any).__dynamicValidityMatrixSamples = state;
    const sample = () => {
      if (!state.active) return;
      const engine = (window as any).__mandelbrotEngine;
      if (engine) {
        if (engine.workStatsSessionSerial !== state.workSession) {
          state.workSession = engine.workStatsSessionSerial;
          state.latestWork = null;
        }
        if (engine.frameSerial !== state.lastFrameSerial) {
          state.lastFrameSerial = engine.frameSerial;
          if (engine.frameIntervalMs > 0 && engine.frameIntervalMs < 5_000) state.frameMs.push(engine.frameIntervalMs);
        }
        if (engine.iterationPassTimingSerial !== state.lastIterationSerial) {
          state.lastIterationSerial = engine.iterationPassTimingSerial;
          if (engine.lastIterationPassMs >= 0) state.iterationPassMs.push(engine.lastIterationPassMs);
        }
        if (engine.realLoopStepsApprox > 0 && engine.realizedSkip >= 1) {
          state.latestWork = {
            realizedSkip: engine.realizedSkip,
            totalApps: engine.realLoopStepsApprox,
            tierApps: [...engine.tierAppsApprox],
            dynamicAttempts: [...engine.dynamicTierAttemptsApprox],
            dynamicAccepts: [...engine.dynamicTierAcceptsApprox],
            dynamicExactFallbacks: engine.dynamicExactFallbacksApprox,
          };
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function sampleCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__dynamicValidityMatrixSamples?.iterationPassMs.length ?? 0);
}

async function stopSampling(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__dynamicValidityMatrixSamples;
    state.active = false;
    return {
      frameMs: state.frameMs as number[],
      iterationPassMs: state.iterationPassMs as number[],
      latestWork: state.latestWork,
    };
  });
}

async function readWorkSnapshot(page: Page) {
  return page.evaluate(async () => (window as any).__mandelbrotEngine.readWorkStatsSnapshot());
}

async function collectWorkMix(page: Page) {
  const previous = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.targetFps = 5;
    engine.iterationBatchSize = 4;
    engine.clearHistoryNextFrame = true;
    engine.needRender = true;
    return {
      serial: engine.iterationPassTimingSerial as number,
      session: engine.workStatsSessionSerial as number,
    };
  });
  await page.waitForFunction((before: {serial: number; session: number}) => {
    const engine = (window as any).__mandelbrotEngine;
    return engine.iterationPassTimingSerial > before.serial
      && engine.workStatsSessionSerial > before.session
      && engine.realLoopStepsApprox > 0
      && engine.realizedSkip >= 1;
  }, previous, { timeout: 15_000 });
  const snapshot = await readWorkSnapshot(page);
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.targetFps = 60;
  });
  return snapshot;
}

async function collectStaticSamples(page: Page) {
  await startSampling(page);
  const deadline = Date.now() + 180_000;
  let earlyWorkSnapshot: any = null;
  let lastSnapshotSample = -1;
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.clearHistoryNextFrame = true;
    engine.needRender = true;
  });
  while (await sampleCount(page) < MIN_SAMPLES) {
    if (Date.now() > deadline) throw new Error("static sample collection timed out");
    const count = await sampleCount(page);
    if (!earlyWorkSnapshot && count >= 2 && count - lastSnapshotSample >= 3) {
      lastSnapshotSample = count;
      const snapshot = await readWorkSnapshot(page);
      const dynamicAttempts = snapshot.dynamic.tierAttempts.reduce((sum: number, value: number) => sum + value, 0);
      if (snapshot.totalApps > 0 || dynamicAttempts > 0) earlyWorkSnapshot = snapshot;
    }
    const idle = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      return !engine.isRendering && !engine.needRender && !engine.clearHistoryNextFrame;
    });
    if (idle) {
      await page.evaluate(() => {
        const engine = (window as any).__mandelbrotEngine;
        engine.clearHistoryNextFrame = true;
        engine.needRender = true;
      });
    }
    await page.waitForTimeout(100);
  }
  const workSnapshot = earlyWorkSnapshot ?? await readWorkSnapshot(page);
  return { ...(await stopSampling(page)), workSnapshot };
}

async function collectNavigationSamples(page: Page) {
  await startSampling(page);
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
  const deadline = Date.now() + 120_000;
  while (await sampleCount(page) < MIN_SAMPLES) {
    if (Date.now() > deadline) throw new Error("navigation sample collection timed out");
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(750);
  const workSnapshot = await readWorkSnapshot(page);
  return { ...(await stopSampling(page)), workSnapshot };
}

function timings(samples: {frameMs: number[]; iterationPassMs: number[]}) {
  return {
    samples: { frame: samples.frameMs.length, iterationPass: samples.iterationPassMs.length },
    iterationPassMs: { p50: percentile(samples.iterationPassMs, 0.5), p95: percentile(samples.iterationPassMs, 0.95) },
    frameMs: { p50: percentile(samples.frameMs, 0.5), p95: percentile(samples.frameMs, 0.95) },
  };
}

test.describe("dynamic validity performance matrix", () => {
  test.skip(!ENABLED, "Run explicitly with npm run benchmark:dynamic-validity");
  test.setTimeout(900_000);

  test("records static and navigation gates for every rollout variant", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
    await page.waitForTimeout(1_000);
    const reports: any[] = [];

    for (const [variantIndex, variant] of VARIANTS.entries()) {
      if (variantIndex > 0) {
        await page.evaluate(() => {
          const engine = (window as any).__mandelbrotEngine;
          engine?.destroy();
          delete (window as any).__mandelbrotEngine;
        });
        await page.reload();
        await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
        await page.waitForTimeout(1_000);
      }
      console.log(`dynamic validity matrix: starting ${variant.id}`);
      const activationStarted = Date.now();
      await page.evaluate((config) => {
        const engine = (window as any).__mandelbrotEngine;
        engine.setDynamicValidityShadow(false);
        engine.setDynamicValidityStatsEnabled(false);
        engine.setIncrementalReferenceTable(false);
        engine.setDynamicBlockValidity(config.dynamic);
        engine.setApproximationMode(config.mode);
        engine.setIncrementalReferenceTable(config.incremental);
        engine.clearHistoryNextFrame = true;
        engine.needRender = true;
      }, variant);
      await page.waitForFunction((config) => {
        const engine = (window as any).__mandelbrotEngine;
        return engine.lastShaderApproxFlag === config.expectedFlag
          && (config.expectedFlag === 0 || (engine.currentBlaLevelCount > 0 && !engine.tableBuildActive));
      }, variant, { timeout: 180_000 });
      await waitForConverged(page);

      const activationWallMs = Date.now() - activationStarted;
      if (variant.dynamic) {
        await page.evaluate(() => {
          const engine = (window as any).__mandelbrotEngine;
          engine.setDynamicValidityStatsEnabled(true);
        });
        await waitForConverged(page);
      }
      const workMix = await collectWorkMix(page);
      if (variant.dynamic) {
        await page.evaluate(() => {
          const engine = (window as any).__mandelbrotEngine;
          engine.setDynamicValidityStatsEnabled(false);
        });
        await waitForConverged(page);
      }
      const baseline = await page.evaluate(() => {
        const engine = (window as any).__mandelbrotEngine;
        return {
          cmaxOnlyTableRebuildCount: engine.cmaxOnlyTableRebuildCount as number,
          referenceResetSerial: engine.referenceResetSerial as number,
        };
      });
      const staticSamples = await collectStaticSamples(page);
      const navigationSamples = await collectNavigationSamples(page);
      const final = await page.evaluate(async (config) => {
        const engine = (window as any).__mandelbrotEngine;
        const work = await engine.readWorkStatsSnapshot();
        const tierApps = [...work.tierApps] as number[];
        const dynamicAttempts = [...work.dynamic.tierAttempts] as number[];
        const dynamicAccepts = [...work.dynamic.tierAccepts] as number[];
        const totalApps = work.totalApps as number;
        const blockApps = tierApps.reduce((sum, value) => sum + value, 0);
        const validityWords = Math.ceil(Math.max(1, engine.mandelbrotValidityBufferCapacity) * (24 + 2) / 4) * 4;
        const gpuTableBytes = engine.mandelbrotJetBufferCapacity * 27 * 4
          + engine.mandelbrotJetRadiiBufferCapacity * 4 * 4
          + engine.mandelbrotJetLevelBufferCapacity * 4 * 4
          + validityWords * 4;
        const incrementalCpuMs = (engine.incrementalTableMergeCoefficientsMs as number)
          + (engine.incrementalTableEnvelopeMs as number);
        return {
          cmaxOnlyTableRebuildCount: engine.cmaxOnlyTableRebuildCount as number,
          referenceResetSerial: engine.referenceResetSerial as number,
          cpuStagesMs: {
            total: config.expectedFlag === 0 ? -1 : (
              config.incremental ? incrementalCpuMs : engine.lastTableBuildMs as number
            ),
            coefficients: config.expectedFlag === 0 ? -1 : (
              config.incremental
                ? engine.incrementalTableMergeCoefficientsMs as number
                : engine.lastTableCoefficientsMs as number
            ),
            bounds: config.expectedFlag === 0 ? -1 : (
              config.incremental ? 0 : engine.lastTableBoundsMs as number
            ),
            radiiOrEnvelope: config.expectedFlag === 0 ? -1 : (
              config.incremental
                ? engine.incrementalTableEnvelopeMs as number
                : engine.lastTableRadiiMs as number
            ),
          },
          memory: {
            gpuTableBytes: config.expectedFlag === 0 ? 0 : gpuTableBytes,
            builderPeakBytes: engine.incrementalTablePeakRetainedBytes as number,
            transferredBytes: engine.incrementalTableTransferredBytes as number,
            capacityGrowths: engine.incrementalTableCapacityGrowths as number,
          },
          tierApps,
          dynamicAttempts,
          dynamicAccepts,
          realizedSkip: work.realizedSkip as number,
          exactFallback: config.dynamic
            ? work.dynamic.exactFallbacks as number
            : (totalApps >= 0 && blockApps >= 0 ? Math.max(0, totalApps - blockApps) : -1),
          totalApps,
          blockApps,
        };
      }, variant);

      const controlledMix = workMix.totalApps > 0
        || workMix.dynamic.tierAttempts.some((value: number) => value > 0)
        ? {
          realizedSkip: workMix.realizedSkip,
          totalApps: workMix.totalApps,
          tierApps: workMix.tierApps,
          dynamicAttempts: workMix.dynamic.tierAttempts,
          dynamicAccepts: workMix.dynamic.tierAccepts,
          dynamicExactFallbacks: workMix.dynamic.exactFallbacks,
        }
        : null;
      const observedWork = controlledMix
        ?? navigationSamples.latestWork
        ?? (navigationSamples.workSnapshot.totalApps > 0 ? {
          realizedSkip: navigationSamples.workSnapshot.realizedSkip,
          totalApps: navigationSamples.workSnapshot.totalApps,
          tierApps: navigationSamples.workSnapshot.tierApps,
          dynamicAttempts: navigationSamples.workSnapshot.dynamic.tierAttempts,
          dynamicAccepts: navigationSamples.workSnapshot.dynamic.tierAccepts,
          dynamicExactFallbacks: navigationSamples.workSnapshot.dynamic.exactFallbacks,
        } : null)
        ?? staticSamples.latestWork
        ?? (staticSamples.workSnapshot.totalApps > 0 ? {
          realizedSkip: staticSamples.workSnapshot.realizedSkip,
          totalApps: staticSamples.workSnapshot.totalApps,
          tierApps: staticSamples.workSnapshot.tierApps,
          dynamicAttempts: staticSamples.workSnapshot.dynamic.tierAttempts,
          dynamicAccepts: staticSamples.workSnapshot.dynamic.tierAccepts,
          dynamicExactFallbacks: staticSamples.workSnapshot.dynamic.exactFallbacks,
        } : null);
      const observedTierApps = observedWork?.tierApps ?? final.tierApps;
      const observedBlockApps = observedTierApps.reduce((sum: number, value: number) => sum + value, 0);
      const observedTotalApps = observedWork?.totalApps ?? final.totalApps;

      reports.push({
        variant: variant.id,
        activationWallMs,
        static: timings(staticSamples),
        navigation: timings(navigationSamples),
        cmaxOnlyTableRebuilds: final.cmaxOnlyTableRebuildCount - baseline.cmaxOnlyTableRebuildCount,
        referenceResets: final.referenceResetSerial - baseline.referenceResetSerial,
        ...final,
        tierApps: observedTierApps,
        dynamicAttempts: observedWork?.dynamicAttempts ?? final.dynamicAttempts,
        dynamicAccepts: observedWork?.dynamicAccepts ?? final.dynamicAccepts,
        realizedSkip: observedWork?.realizedSkip ?? final.realizedSkip,
        exactFallback: variant.dynamic
          ? (observedWork?.dynamicExactFallbacks ?? final.exactFallback)
          : (observedTotalApps >= 0 ? Math.max(0, observedTotalApps - observedBlockApps) : -1),
        totalApps: observedTotalApps,
        blockApps: observedBlockApps,
      });
      console.log(`dynamic validity matrix: completed ${variant.id}`);
    }

    const byId = Object.fromEntries(reports.map(report => [report.variant, report]));
    const legacy = byId["legacy-auto"];
    const dynamic = byId["dynamic-incremental-auto"];
    const ratio = (value: number | null, base: number | null) => value !== null && base !== null && base > 0 ? value / base : null;
    const gates = {
      zeroCmaxOnlyRebuilds: dynamic.cmaxOnlyTableRebuilds === 0,
      boundedMemory: dynamic.memory.builderPeakBytes > 0 && dynamic.memory.builderPeakBytes < 256 * 1024 * 1024,
      staticIterationP95Ratio: ratio(dynamic.static.iterationPassMs.p95, legacy.static.iterationPassMs.p95),
      staticFrameP95Ratio: ratio(dynamic.static.frameMs.p95, legacy.static.frameMs.p95),
      navigationIterationP95Ratio: ratio(dynamic.navigation.iterationPassMs.p95, legacy.navigation.iterationPassMs.p95),
      navigationFrameP95Ratio: ratio(dynamic.navigation.frameMs.p95, legacy.navigation.frameMs.p95),
    };
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      deviceConsistency: "same Chromium process/adapter class, fresh GPUDevice per variant, 1280x720, same preset",
      sampleMinimum: MIN_SAMPLES,
      variants: reports,
      gates,
    };
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`dynamic validity matrix: ${JSON.stringify(report)}`);

    for (const variant of reports) {
      expect(variant.static.samples.iterationPass, `${variant.variant} static samples`).toBeGreaterThanOrEqual(MIN_SAMPLES);
      expect(variant.navigation.samples.iterationPass, `${variant.variant} navigation samples`).toBeGreaterThan(0);
      expect(variant.referenceResets, `${variant.variant} must isolate cmax drift`).toBe(0);
    }
    expect(gates.zeroCmaxOnlyRebuilds, "cmax-only motion must not rebuild the dynamic table").toBe(true);
    expect(gates.boundedMemory, "incremental builder peak must stay below 256 MiB").toBe(true);
    expect(gates.staticIterationP95Ratio, "static iteration-pass p95 ratio").toBeLessThanOrEqual(1.10);
    expect(gates.staticFrameP95Ratio, "static frame p95 ratio").toBeLessThanOrEqual(1.10);
    expect(gates.navigationIterationP95Ratio, "navigation iteration-pass p95 ratio").toBeLessThanOrEqual(1.00);
    expect(gates.navigationFrameP95Ratio, "navigation frame p95 ratio").toBeLessThanOrEqual(1.00);
  });
});
