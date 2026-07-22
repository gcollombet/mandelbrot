import { expect, test, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

type Fixture = {
  name: string;
  cx: string;
  cy: string;
  scale: string;
  path: "shallow" | "deep";
  scenario: string;
};

const fixturePath = path.resolve("tests/fixtures/dynamic-validity-parity.csv");
const fixtures: Fixture[] = fs.readFileSync(fixturePath, "utf8")
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map(row => {
    const [name, cx, cy, scale, arithmeticPath, scenario] = row.split(",");
    return { name, cx, cy, scale, path: arithmeticPath as Fixture["path"], scenario };
  });

test.afterEach(async ({ page }) => {
  if (!page.isClosed()) {
    await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      engine?.destroy();
      delete (window as any).__mandelbrotEngine;
    }).catch(() => undefined);
    await page.waitForTimeout(100);
  }
});

function collectGpuErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", message => {
    const text = message.text();
    if ((message.type() === "error" || /validation|shader|WebGPU|Tint/i.test(text))
      && /error|invalid|fail/i.test(text)) {
      errors.push(text);
    }
  });
  page.on("pageerror", error => errors.push(String(error)));
  return errors;
}

async function waitForIdle(page: Page, timeout = 60_000) {
  const deadline = Date.now() + timeout;
  let stable = 0;
  while (stable < 4) {
    if (Date.now() > deadline) throw new Error("dynamic parity render did not converge");
    const idle = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      return engine
        && engine.unfinishedPixelCount >= 0
        && engine.unfinishedPixelCount <= 10
        && engine.currentReferenceAvailableIter >= engine.currentMaxIterations
        && !engine.pendingRefActive
        && !engine.isReferenceValidating
        && !engine.isRendering
        && !engine.needRender
        && !engine.clearHistoryNextFrame;
    });
    stable = idle ? stable + 1 : 0;
    await page.waitForTimeout(100);
  }
}

async function teleport(page: Page, fixture: Fixture) {
  await page.evaluate(({ cx, cy, scale, path, scenario }) => {
    const engine = (window as any).__mandelbrotEngine;
    const nav = engine.mandelbrotNavigator;
    engine.setApproximationMode("perturbation");
    engine.setDynamicBlockValidity(true);
    engine.setIncrementalReferenceTable(true);
    engine.targetFps = scenario === "continuation" ? 120 : 15;
    if (path === "deep") engine.setPrecisionBudget("1e-40");
    nav.cancel_transition();
    nav.origin(cx, cy);
    nav.scale(scale);
    nav.angle(0);
    engine.resetReference(cx, cy);
  }, fixture);
  await waitForIdle(page);
}

async function iterationClassHash(page: Page): Promise<{ hash: string; escaped: number; inside: number; iterationSum: number }> {
  return page.evaluate(async () => {
    const engine = (window as any).__mandelbrotEngine;
    const device = engine.device as GPUDevice;
    const size = engine.neutralSize as number;
    const bytesPerRow = Math.ceil((size * 4) / 256) * 256;
    const buffer = device.createBuffer({
      size: bytesPerRow * size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture: engine.rawTexture, origin: { x: 0, y: 0, z: 0 } },
      { buffer, bytesPerRow },
      { width: size, height: size, depthOrArrayLayers: 1 },
    );
    device.queue.submit([encoder.finish()]);
    await buffer.mapAsync(GPUMapMode.READ);
    const values = new Float32Array(buffer.getMappedRange());
    const rowWords = bytesPerRow / 4;
    let hash = 0x811c9dc5;
    let escaped = 0;
    let inside = 0;
    let iterationSum = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const value = values[y * rowWords + x];
        const classification = value > 0 ? Math.floor(value) : value === 0 ? 0 : -1;
        escaped += classification > 0 ? 1 : 0;
        inside += classification === 0 ? 1 : 0;
        iterationSum += Math.max(0, classification);
        let word = classification >>> 0;
        for (let byte = 0; byte < 4; byte++) {
          hash ^= word & 0xff;
          hash = Math.imul(hash, 0x01000193) >>> 0;
          word >>>= 8;
        }
      }
    }
    buffer.unmap();
    buffer.destroy();
    return { hash: hash.toString(16), escaped, inside, iterationSum };
  });
}

async function enableDynamicAndConverge(page: Page) {
  await page.evaluate(() => (window as any).__mandelbrotEngine.setApproximationMode("auto"));
  try {
    await page.waitForFunction(() => {
      const engine = (window as any).__mandelbrotEngine;
      return !!engine
        && engine.dynamicValidityReady
        && engine.dynamicValidityGeneration === engine.tableGeneration
        && engine.lastShaderApproxFlag === 6
        && engine.currentBlaLevelCount > 0
        && !engine.tableBuildActive
        && engine.currentReferenceAvailableIter >= engine.currentMaxIterations
        && engine.incrementalTableBuiltOrbit >= engine.currentMaxIterations + 1
        && engine.incrementalTableOrbitCoverage > 1;
    }, undefined, { timeout: 60_000 });
  } catch (error) {
    const state = await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      if (!engine) return null;
      return {
        ready: engine.dynamicValidityReady,
        generation: [engine.dynamicValidityGeneration, engine.tableGeneration],
        modes: [engine.approximationMode, engine.mandelbrotNavigator.get_approximation_mode()],
        epsilons: [engine.blaEpsilon, engine.mandelbrotNavigator.get_bla_epsilon()],
        flag: engine.lastShaderApproxFlag,
        levels: engine.currentBlaLevelCount,
        active: engine.tableBuildActive,
        available: engine.currentReferenceAvailableIter,
        target: engine.currentMaxIterations,
        coverage: engine.incrementalTableOrbitCoverage,
        built: engine.incrementalTableBuiltOrbit,
      };
    });
    throw new Error(`dynamic table did not converge: ${JSON.stringify(state)}; ${String(error)}`);
  }
  const beforeFrame = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    const serials = {
      frame: engine.frameSerial,
      iteration: engine.iterationPassTimingSerial,
    };
    engine.clearHistoryNextFrame = true;
    // A bare history clear leaves the previous completed counter at zero,
    // allowing the scheduler to present the cleared texture without another
    // iteration pass. Mirror a real render invalidation as well.
    engine.invalidateCounterReadback();
    engine.needRender = true;
    return serials;
  });
  await page.waitForFunction((before: { frame: number; iteration: number }) => {
    const engine = (window as any).__mandelbrotEngine;
    return !!engine
      && engine.frameSerial > before.frame
      && engine.iterationPassTimingSerial > before.iteration
      && engine.lastShaderApproxFlag === 6;
  }, beforeFrame, { timeout: 60_000 });
  await waitForIdle(page);
}

async function enableExactAndConverge(page: Page) {
  const beforeFrame = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    const serials = {
      frame: engine.frameSerial,
      iteration: engine.iterationPassTimingSerial,
    };
    engine.setApproximationMode("perturbation");
    return serials;
  });
  await page.waitForFunction((before: { frame: number; iteration: number }) => {
    const engine = (window as any).__mandelbrotEngine;
    return !!engine
      && engine.frameSerial > before.frame
      && engine.iterationPassTimingSerial > before.iteration
      && engine.lastShaderApproxFlag === 0;
  }, beforeFrame, { timeout: 60_000 });
  await waitForIdle(page);
}

test.describe.configure({ mode: "serial" });

for (const fixture of fixtures) {
  test(`dynamic validity parity fixture: ${fixture.name}`, async ({ page }) => {
    test.setTimeout(120_000);
    const gpuErrors = collectGpuErrors(page);
    await page.setViewportSize({ width: 480, height: 320 });
    await page.goto("/");
    await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
    await page.mouse.click(240, 160);
    await teleport(page, fixture);
    await enableDynamicAndConverge(page);
    const dynamic = await iterationClassHash(page);
    const counters = await page.evaluate(() =>
      (window as any).__mandelbrotEngine.readDynamicValidityCounters()
    );
    // Compare against perturbation immediately after the dynamic render so
    // both sides use the same promoted arbitrary-precision reference.
    await enableExactAndConverge(page);
    const exact = await iterationClassHash(page);

    // At this 400×400 neutral target, 64 pixels = 0.04%. This covers the
    // measured cross-pass rounding floor of the resumable approximate path
    // while remaining far below a visible classification regression.
    const comparison = JSON.stringify({ dynamic, exact, counters });
    expect(
      Math.abs(dynamic.escaped - exact.escaped),
      `${fixture.name}: escaped classification ${comparison}`,
    ).toBeLessThanOrEqual(64);
    expect(
      Math.abs(dynamic.inside - exact.inside),
      `${fixture.name}: interior classification ${comparison}`,
    ).toBeLessThanOrEqual(64);
    expect(
      Math.abs(dynamic.iterationSum - exact.iterationSum) / Math.max(1, exact.iterationSum),
      `${fixture.name}: integer escape-iteration aggregate (${exact.hash}/${dynamic.hash})`,
    ).toBeLessThan(3e-3);
    expect(counters.tierAttempts).toHaveLength(4);
    expect(counters.rejectionReasons).toHaveLength(6);
    expect(counters.exactFallbacks).toBeGreaterThanOrEqual(0);
    expect(gpuErrors, `${fixture.name}: GPU errors\n${gpuErrors.join("\n")}`).toEqual([]);
  });
}
