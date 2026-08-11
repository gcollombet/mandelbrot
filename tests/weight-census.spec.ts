import { test, expect, type Page } from "@playwright/test";

// Weight census — the measurement that decides whether a per-pixel adaptive
// batch is worth building, and in what shape.
//
// The engine already owns the CONTROL LAW for a per-pixel budget: batch size is
// R·T/Σw (batchSizeForWorkRate over effectiveRemainingPixelCount) and a texel's
// limit is B·w, so Σ Lᵢ = R·T — the split is conservative whatever the mix, and
// attenuation cancels itself once the population is uniform. What it does NOT
// own is a general PREDICTOR: w only ever moves when the periodic certificate
// half-succeeds. This census asks whether generalizing it would pay, by
// classifying every active continuation from its ENTRY state without applying
// anything (rendering stays bit-identical; only counter words 4..15 change).
//
// Three numbers come out, each answering one open question:
//
//  1. waveUniformFraction — ARCHITECTURE. A wave costs the max over its lanes,
//     not their sum, so a per-lane weight buys nothing unless its whole wave
//     agrees. High here (≳0.8) means a per-lane weight can be applied as-is;
//     low means the budget must first be reduced to a wave-uniform one, and
//     that the existing periodic weighting only works because interior regions
//     happen to be large compact blobs.
//
//  2. deferrableFraction — CEILING. The share of the tail the eighth class
//     would defer. Nothing any weight scheme does can reallocate more than
//     this, so a small figure closes the direction outright.
//
//  3. workPerTermination — NUMBER OF STEPS. Classes whose work-per-termination
//     figures are not separated are one population cut in an arbitrary place.
//     Three steps are inherited from the periodic certificate's three verdicts,
//     not derived; this is what says whether the general predictor supports
//     three, two, or more.
//
// Measured in the TAIL (≤5% of the peak active population), because that is
// where the whole question lives: pooled over a full run, the first dense
// passes drown the tail they are meant to explain.

type CensusVerdict = {
  waveUniformFraction: number;
  deferrableFraction: number;
  workPerTermination: [number, number, number];
  sampleCount: number;
};

type CensusRun = {
  peakActive: number;
  dispatches: number;
  freshShare: number;
  classShare: [number, number, number];
  /**
   * Fraction of classified dispatches in which no single class holds ≥99% of
   * that dispatch's classified texels — i.e. where the predictor partitions
   * SPACE rather than TIME.
   *
   * This is the gate on every other number here. A predictor whose classes
   * flip wholesale between passes reports classShare quantized to 1/dispatch
   * and waveUniformFraction pinned at 100%, both of which look like findings
   * and are artifacts. Near zero here means the calibration is degenerate and
   * nothing else in the report may be read.
   */
  mixedDispatchFraction: number;
  /**
   * Wave-uniformity pooled ONLY over mixed dispatches — the honest answer to
   * the architecture question. The whole-run figure is inflated by
   * single-class dispatches, whose waves are uniform by construction and
   * therefore say nothing about whether a per-lane weight is wave-coherent.
   */
  mixedWaveUniformFraction: number;
  tail: CensusVerdict;
  whole: CensusVerdict;
};

/** Runtime census thresholds; a sweep point costs no pipeline rebuild. */
type Thresholds = {
  borderLog2Margin: number;
  contractBias: number;
  contractSlope: number;
  contractBiasStrong: number;
  contractSlopeStrong: number;
};

type ViewReport = CensusRun & { name: string };

/** A view that converged before any continuation existed to classify. */
type CensusEmpty = { empty: true; dispatches: number };

/** Views chosen to span the regimes the predictor has to separate. */
const VIEWS = [
  {
    name: "seahorse valley deep (filaments + interior)",
    cx: "-0.743643887037151",
    cy: "0.13182590420533",
    scale: "1e-20",
    precisionBudget: null,
  },
  {
    name: "seahorse valley (filaments + interior)",
    cx: "-0.743643887037151",
    cy: "0.13182590420533",
    scale: "1e-12",
    precisionBudget: null,
  },
  {
    // Main cardioid: every texel runs to maxIterations. Upper bound on what
    // any deferral scheme could ever find.
    name: "main cardioid (pure interior)",
    cx: "-0.5",
    cy: "0",
    scale: "1e-6",
    precisionBudget: null,
  },
  {
    // Control. Sits just outside the boundary, so it still needs several
    // passes (an open exterior view converges in one and censuses nothing),
    // but the eighth class should stay small. If it does not, the contraction
    // predicate is misfiring and no other number here can be trusted.
    name: "near-boundary exterior (control)",
    cx: "-0.75",
    cy: "0.1",
    scale: "1e-8",
    precisionBudget: null,
  },
] as const;

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

type View = {
  readonly name: string;
  readonly cx: string;
  readonly cy: string;
  readonly scale: string;
  readonly precisionBudget: string | null;
};

async function gotoView(page: Page, view: View) {
  await page.evaluate((v) => {
    const engine = (window as any).__mandelbrotEngine;
    const nav = engine.mandelbrotNavigator;
    if (v.precisionBudget) engine.setPrecisionBudget(v.precisionBudget);
    nav.cancel_transition();
    nav.origin(v.cx, v.cy);
    nav.scale(v.scale);
    nav.angle(0);
    engine.resetReference(v.cx, v.cy);
  }, view);
  await page.waitForTimeout(2_000);
  await waitForConverged(page);
}

/**
 * Restart the view from a cleared sentinel grid with a fresh census series, so
 * one run = one sweep point over one full convergence.
 */
async function runCensus(
  page: Page,
  thresholds: Thresholds | null = null,
): Promise<CensusRun | CensusEmpty> {
  await page.evaluate((t) => {
    const engine = (window as any).__mandelbrotEngine;
    if (t) Object.assign(engine.weightCensusThresholds, t);
    // Re-arm: the setter clears the series, so toggle off/on to drop whatever
    // the teleport itself recorded.
    engine.setWeightCensusEnabled(false);
    engine.setWeightCensusEnabled(true);
    engine.clearHistoryNextFrame = true;
    engine.needRender = true;
  }, thresholds);
  await page.waitForTimeout(300);
  await waitForConverged(page);

  return page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    const series = engine.weightCensusSeries as Array<{
      unfinished: number;
      waveActive: number;
      fresh: number;
      classCount: [number, number, number];
    }>;
    const active = series.filter((s) => s.waveActive > 0);
    // Self-calibrating tail cut: the first pass carries essentially the whole
    // visible population, so its own peak is the right denominator.
    const peakActive = active.reduce((m, s) => Math.max(m, s.unfinished), 0);
    const tailCut = peakActive * 0.05;

    let fresh = 0;
    let mixedDispatches = 0;
    let mixedWaveActive = 0;
    let mixedWaveUniform = 0;
    const classTotal = [0, 0, 0];
    for (const s of active) {
      fresh += s.fresh;
      for (let i = 0; i < 3; i++) classTotal[i] += s.classCount[i];
      const inDispatch = s.classCount[0] + s.classCount[1] + s.classCount[2];
      const dominant = Math.max(s.classCount[0], s.classCount[1], s.classCount[2]);
      if (inDispatch > 0 && dominant / inDispatch < 0.99) {
        mixedDispatches += 1;
        mixedWaveActive += s.waveActive;
        mixedWaveUniform += s.waveUniform;
      }
    }
    const classified = classTotal[0] + classTotal[1] + classTotal[2];
    // A view that converges in a single pass has no continuation to classify.
    // That is a legitimate outcome, not a failure — it simply carries no
    // information about scheduling, so it is reported as skipped.
    if (active.length === 0 || classified === 0) {
      return { empty: true, dispatches: series.length };
    }

    return {
      peakActive,
      dispatches: active.length,
      freshShare: classified + fresh > 0 ? fresh / (classified + fresh) : -1,
      classShare: (classified > 0
        ? classTotal.map((c) => c / classified)
        : [-1, -1, -1]) as [number, number, number],
      mixedDispatchFraction: mixedDispatches / active.length,
      mixedWaveUniformFraction: mixedWaveActive > 0
        ? mixedWaveUniform / mixedWaveActive
        : -1,
      tail: engine.weightCensusVerdict(tailCut) as CensusVerdict,
      whole: engine.weightCensusVerdict() as CensusVerdict,
    };
  });
}

const pct = (v: number) => (v < 0 ? "n/a" : `${(v * 100).toFixed(1)}%`);
const num = (v: number) => (v < 0 ? "n/a" : v.toFixed(1));

async function boot(page: Page) {
  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360); // dismiss intro splash
  await page.waitForTimeout(1_500);
  await waitForConverged(page);
}

/**
 * The view the determinism spec certifies as bit-reproducible: antenna tip,
 * exactly representable, boundary structure at every depth. The parity check
 * borrows it deliberately — proving the weight changes nothing requires a
 * baseline that is already known to change nothing on its own.
 */
const PARITY_VIEW = {
  name: "needle (determinism anchor)",
  cx: "-2",
  cy: "0",
  scale: "1e-32",
  precisionBudget: "1e-40",
} as const;

const RAW_LAYERS = [0, 2, 3, 4, 5, 6, 7, 8];

/** One FNV-1a hash per raw state layer, read back through the engine's device. */
async function hashRawLayers(page: Page): Promise<Record<number, string>> {
  return page.evaluate(async (layers: number[]) => {
    const engine = (window as any).__mandelbrotEngine;
    const dev = engine.device as GPUDevice;
    const size = engine.neutralSize as number;
    const bpr = Math.ceil((size * 4) / 256) * 256;
    const out: Record<number, string> = {};
    for (const layer of layers) {
      const buf = dev.createBuffer({ size: bpr * size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      const enc = dev.createCommandEncoder();
      enc.copyTextureToBuffer(
        { texture: engine.rawTexture, origin: { x: 0, y: 0, z: layer } },
        { buffer: buf, bytesPerRow: bpr },
        { width: size, height: size, depthOrArrayLayers: 1 },
      );
      dev.queue.submit([enc.finish()]);
      await buf.mapAsync(GPUMapMode.READ);
      const data = new Uint32Array(buf.getMappedRange());
      const rowWords = bpr / 4;
      let h = 0x811c9dc5;
      for (let y = 0; y < size; y++) {
        const base = y * rowWords;
        for (let x = 0; x < size; x++) {
          let v = data[base + x];
          for (let b = 0; b < 4; b++) {
            h ^= v & 0xff;
            h = (h * 0x01000193) >>> 0;
          v >>>= 8;
          }
        }
      }
      buf.unmap();
      buf.destroy();
      out[layer] = h.toString(16);
    }
    return out;
  }, RAW_LAYERS);
}

async function recomputeFromScratch(page: Page) {
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.clearHistoryNextFrame = true;
    engine.needRender = true;
  });
  await page.waitForTimeout(300);
  await waitForConverged(page);
}

/**
 * The contract. The adaptive weight decides how much of a dispatch a texel
 * receives, never its verdict, so the converged raw state must be BIT-identical
 * with the weight on and off. The determinism spec already establishes that the
 * same view converges identically regardless of where the progressive pass
 * boundaries fall, so any difference here is attributable to the weight itself
 * — i.e. a contract violation, not measurement noise.
 */
test("adaptive weight leaves the converged image bit-identical", async ({ page }) => {
  test.setTimeout(900_000);
  const gpuErrors = collectGpuErrors(page);
  // One full page load per sample. An in-session recompute is NOT a clean
  // repeat: clearHistoryNextFrame resets the raw grid but leaves the reference
  // orbit and the block tables in place, so the second run starts from
  // different state and diverges for reasons unrelated to the weight. The
  // determinism spec compares across page loads for the same reason.
  const runToHash = async (weightOn: boolean) => {
    await boot(page);
    await page.evaluate(
      (v) => { (window as any).__mandelbrotEngine.setAdaptiveWeightEnabled(v); },
      weightOn,
    );
    await gotoView(page, PARITY_VIEW);
    await recomputeFromScratch(page);
    return hashRawLayers(page);
  };

  // Warm-up, discarded. The very first load of a fresh browser context starts
  // from the app's default view with empty localStorage; every later load
  // starts from the view the previous run persisted. That different startup
  // path shifts the carried state (layers 2..8) while leaving iteration counts
  // identical, so the first sample is systematically the odd one out.
  // Clearing localStorage does NOT fix it — it makes every load a first load
  // and none of them agree. Discarding one warm-up does.
  await runToHash(false);

  // Control: two further loads with the weight OFF. Without it the comparison
  // below is uninterpretable — a view that is not run-to-run deterministic in
  // THIS harness would fail parity for reasons having nothing to do with the
  // weight.
  const offA = await runToHash(false);
  const offB = await runToHash(false);
  const on = await runToHash(true);

  console.log(`control OFF/OFF  ${JSON.stringify(offA)}\n                 ${JSON.stringify(offB)}`);
  console.log(`weight  ON       ${JSON.stringify(on)}`);
  expect(offB, "control: the view is not run-to-run deterministic in this harness").toEqual(offA);
  expect(on, "adaptive weight changed the converged state").toEqual(offA);

  if (gpuErrors.length > 0) {
    throw new Error(`GPU errors during parity run:\n${gpuErrors.join("\n")}`);
  }
});

/**
 * Calibration sweep. The contraction slope is the only parameter that decides
 * whether the predictor partitions the image at all, so it gets its own run on
 * the single view where the answer matters — a mixed one. Read
 * mixedDispatchFraction first: every other column is meaningless until it
 * leaves zero.
 */
test("contraction slope sweep on a mixed view", async ({ page }) => {
  test.setTimeout(900_000);
  const gpuErrors = collectGpuErrors(page);
  await boot(page);
  await gotoView(page, VIEWS[1]); // seahorse 1e-12

  const SLOPES = [0.02, 0.035, 0.05, 0.08, 0.12];
  const lines: string[] = ["", "═══ CONTRACTION SLOPE SWEEP (seahorse 1e-12) ═══", ""];
  lines.push("  slope   strong    mixed    [eighth, quarter, full]        wave-unif(mixed)  deferrable");
  for (const slope of SLOPES) {
    const strong = slope / 4;
    const r = await runCensus(page, {
      borderLog2Margin: 2,
      contractBias: 0,
      contractSlope: slope,
      contractBiasStrong: 0,
      contractSlopeStrong: strong,
    });
    if ("empty" in r) {
      lines.push(`  ${slope.toFixed(3)}   ${strong.toFixed(4)}    (no data)`);
      continue;
    }
    lines.push(
      `  ${slope.toFixed(3)}   ${strong.toFixed(4)}    ${pct(r.mixedDispatchFraction).padStart(6)}   `
      + `[${pct(r.classShare[0])}, ${pct(r.classShare[1])}, ${pct(r.classShare[2])}]`.padEnd(30)
      + ` ${pct(r.mixedWaveUniformFraction).padStart(8)}          ${pct(r.whole.deferrableFraction)}`,
    );
  }
  lines.push("");
  console.log(lines.join("\n"));

  if (gpuErrors.length > 0) {
    throw new Error(`GPU errors during sweep:\n${gpuErrors.join("\n")}`);
  }
});

test("weight census over the four regimes", async ({ page }) => {
  test.setTimeout(900_000);
  const gpuErrors = collectGpuErrors(page);
  await boot(page);

  const reports: ViewReport[] = [];
  const skipped: string[] = [];
  for (const view of VIEWS) {
    await gotoView(page, view);
    const result = await runCensus(page);
    if ("empty" in result) {
      skipped.push(`${view.name} (converged in ${result.dispatches} dispatches)`);
      continue;
    }
    reports.push({ name: view.name, ...result });
  }

  const lines: string[] = [];
  lines.push("");
  lines.push("═══ WEIGHT CENSUS ═══");
  for (const r of reports) {
    lines.push("");
    lines.push(`── ${r.name}`);
    lines.push(`   peak active ${r.peakActive}  ·  ${r.dispatches} classified dispatches  ·  fresh ${pct(r.freshShare)}`);
    lines.push(`   class share  [eighth ${pct(r.classShare[0])}  quarter ${pct(r.classShare[1])}  full ${pct(r.classShare[2])}]`);
    lines.push(`   mixed dispatches ${pct(r.mixedDispatchFraction)}   ← gate: near 0 = classes flip per PASS, rest is artifact`);
    lines.push(`   wave-uniform within mixed dispatches ${pct(r.mixedWaveUniformFraction)}`);
    lines.push(`   TAIL  (n=${r.tail.sampleCount})  wave-uniform ${pct(r.tail.waveUniformFraction)}  ·  deferrable ${pct(r.tail.deferrableFraction)}`);
    lines.push(`         work/termination [${num(r.tail.workPerTermination[0])}, ${num(r.tail.workPerTermination[1])}, ${num(r.tail.workPerTermination[2])}]`);
    lines.push(`   WHOLE (n=${r.whole.sampleCount})  wave-uniform ${pct(r.whole.waveUniformFraction)}  ·  deferrable ${pct(r.whole.deferrableFraction)}`);
    lines.push(`         work/termination [${num(r.whole.workPerTermination[0])}, ${num(r.whole.workPerTermination[1])}, ${num(r.whole.workPerTermination[2])}]`);
  }
  if (skipped.length > 0) {
    lines.push("");
    lines.push(`── no data (no continuation to classify): ${skipped.join(", ")}`);
  }
  lines.push("");
  console.log(lines.join("\n"));
  console.log("CENSUS_JSON " + JSON.stringify(reports));

  if (gpuErrors.length > 0) {
    throw new Error(`GPU errors during census:\n${gpuErrors.join("\n")}`);
  }
});
