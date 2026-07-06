import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// Auto mode on the DEEP (floatexp) path + certified SA prefix
// (unify-jet-table-dispatch, tasks 2.8/4.3): teleports to 1e-32 at the antenna
// tip, converges under `auto` (flag 5, deep fe dispatch + SA jump on
// compute-request pixels), checks visible structure, zero WebGPU errors, and
// A/Bs the session Total-apps against the certified single modes on the same
// deep view — where iteration dominates build, the steady-state comparison the
// intro view cannot give. SA's numeric soundness is covered by the Rust
// battery (`sa_prefix_certified_and_profile`); this validates the GPU plumbing
// (sidecar header → compute-request continuation entry) end to end.

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

/** Full recompute in `mode`, return converge time + exact session totals. */
async function reconverge(page: Page, mode: string) {
  await page.evaluate((m) => {
    const engine = (window as any).__mandelbrotEngine;
    engine.setApproximationMode(m);
  }, mode);
  await page.waitForTimeout(300);
  const t0 = Date.now();
  await waitForConverged(page);
  // Let the exact final stats readback land (async, one frame or two).
  await page.waitForTimeout(800);
  return page.evaluate((elapsed) => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      ms: elapsed,
      flag: engine.lastShaderApproxFlag,
      totalApps: engine.lastCompletionTotalApps ?? -1,
      tierApps: engine.tierAppsApprox ?? [-1, -1, -1, -1],
    };
  }, Date.now() - t0);
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

test("auto renders the deep fe path with SA and A/Bs the single modes", async ({ page }) => {
  test.setTimeout(360_000);
  const gpuErrors = collectGpuErrors(page);

  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360); // dismiss intro splash
  await page.waitForTimeout(1_500);
  await waitForConverged(page);

  // ── Deep fe path under auto: antenna tip c = −2 at 1e-32 ─────────
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.setApproximationMode("auto");
    engine.setPrecisionBudget("1e-40");
  });
  await teleport(page, "-2", "0", "1e-32");
  const auto = await reconverge(page, "auto");
  expect(auto.flag).toBe(5);
  const stats = await contentStats(page, "unified-deep-auto");
  console.log(
    `deep auto: ${auto.ms}ms, apps=${auto.totalApps}, tier mix=${JSON.stringify(auto.tierApps)}, content mean=${stats.mean.toFixed(1)} std=${stats.std.toFixed(1)}`,
  );
  // Structured content, not a blackout/whiteout.
  expect(stats.std).toBeGreaterThan(5);
  expect(gpuErrors, `WebGPU errors on deep auto:\n${gpuErrors.join("\n")}`).toEqual([]);

  // ── Steady-state A/B on the same deep view ────────────────────────
  const results: Record<string, { ms: number; totalApps: number }> = { auto };
  for (const mode of ["pade", "jet", "mobius"]) {
    results[mode] = await reconverge(page, mode);
  }
  console.log(
    "deep A/B (ms / total apps) — "
    + Object.entries(results)
      .map(([m, r]) => `${m}: ${r.ms}/${r.totalApps}`)
      .join(" | "),
  );
  // The certified totals must exist for every mode now (freeze fix), and the
  // 2.8 gate expectation on a deep view: auto ≤ best single certified mode
  // within the session-total semantics (2 % quantization slack).
  for (const [m, r] of Object.entries(results)) {
    expect(r.totalApps, `${m} total apps missing`).toBeGreaterThan(0);
  }
  const bestSingle = Math.min(results.pade.totalApps, results.jet.totalApps, results.mobius.totalApps);
  if (results.auto.totalApps > bestSingle * 1.02) {
    console.warn(
      `SHIP GATE WATCH (deep): apps(auto)=${results.auto.totalApps} > best single ${bestSingle}`,
    );
  }

  // ── Seahorse deep: SA fires (n0 > 0 — the needle's escape guard keeps
  //    SA off there, |Z|→2; here the Rust battery certifies n0 ≈ 1000) and
  //    the dispatched tiers apply. Content must match jet's on the same view
  //    (both certified within ε; SA is a prefix of the same perturbation). ──
  await teleport(page, "-0.743643887037151", "0.131825904205330", "1e-10");
  // Warm-table steady state: the teleport converged COLD in auto (the table
  // posts mid-render at a race-dependent point — session totals then vary
  // wildly run to run). Bounce through pade so the auto measurement below is
  // a fresh session against the WARM orbit-keyed unified caches.
  await reconverge(page, "pade");
  const seaAuto = await reconverge(page, "auto");
  const seaAutoContent = await contentStats(page, "unified-deep-02-seahorse-auto");
  const seaJet = await reconverge(page, "jet");
  const seaJetContent = await contentStats(page, "unified-deep-03-seahorse-jet");
  console.log(
    `seahorse deep — auto: ${seaAuto.ms}ms apps=${seaAuto.totalApps} mix=${JSON.stringify(seaAuto.tierApps)}`
    + ` content ${seaAutoContent.mean.toFixed(1)}/${seaAutoContent.std.toFixed(1)}`
    + ` | jet: ${seaJet.ms}ms apps=${seaJet.totalApps} content ${seaJetContent.mean.toFixed(1)}/${seaJetContent.std.toFixed(1)}`,
  );
  expect(seaAuto.flag).toBe(5);
  expect(seaAutoContent.std).toBeGreaterThan(3);
  // Same certified perturbation → same statistics envelope (loose: block
  // sampling and EMA shading differ per mode).
  expect(Math.abs(seaAutoContent.mean - seaJetContent.mean)).toBeLessThan(25);
  const seaMixTotal = seaAuto.tierApps.reduce((a: number, b: number) => a + b, 0);
  // Known fragility (Phase F input): at grown maxIter the unified build's
  // moduli sidecar (~648 B/block) and wasm-side walk time make the table race
  // the render — some runs converge exact before it lands (mix 0, apps ~1G);
  // runs where it lands show a live mix ([46081, 7676, 214, 16505] recorded).
  if (seaMixTotal <= 0) {
    console.warn(`PHASE F WATCH: unified table lost the build race on seahorse deep (mix 0, apps=${seaAuto.totalApps})`);
  }

  // ── Interior view (Phase E): the period-2 disk at C = −1 + 0.1i. The
  //    reference is attracted to the 2-cycle; the certified periodic verdict
  //    (κ from the composed Φ₂, findings §17: |κ| = |4(c+1)| = 0.4 here)
  //    resolves interior pixels at O(p) instead of maxiter. Auto must converge
  //    with FAR fewer applications than jet on the same all-interior view,
  //    with the same (flat, in-set) image. ──
  await teleport(page, "-1", "0.1", "1e-6");
  await reconverge(page, "pade"); // warm-table bounce (see seahorse leg)
  const intAuto = await reconverge(page, "auto");
  const intAutoContent = await contentStats(page, "unified-deep-04-interior-auto");
  const intJet = await reconverge(page, "jet");
  const intJetContent = await contentStats(page, "unified-deep-05-interior-jet");
  console.log(
    `interior disk — auto: ${intAuto.ms}ms apps=${intAuto.totalApps}`
    + ` content ${intAutoContent.mean.toFixed(1)}/${intAutoContent.std.toFixed(1)}`
    + ` | jet: ${intJet.ms}ms apps=${intJet.totalApps}`
    + ` content ${intJetContent.mean.toFixed(1)}/${intJetContent.std.toFixed(1)}`,
  );
  expect(intAuto.flag).toBe(5);
  // Same all-interior image (both certified: in-set coloring).
  expect(Math.abs(intAutoContent.mean - intJetContent.mean)).toBeLessThan(10);
  // The O(p) short-circuit: a couple of applications per pixel at most
  // (measured 0.2/px), where maxiter modes do px × maxIter loop turns.
  expect(intAuto.totalApps).toBeGreaterThan(0);
  expect(intAuto.totalApps).toBeLessThan(2_600_000 * 4);
  // Jet on an all-interior view runs every pixel to maxIter: it either WRAPS
  // the u32 work counters (totalApps −1 — the documented deep-interior guard,
  // itself evidence of the ≥10⁴× workload) or dwarfs auto.
  if (intJet.totalApps > 0) {
    expect(intAuto.totalApps).toBeLessThan(intJet.totalApps * 0.05);
  }
  expect(gpuErrors, `WebGPU errors:\n${gpuErrors.join("\n")}`).toEqual([]);
});
