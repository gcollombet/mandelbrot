import { expect, test } from "@playwright/test";

test.afterEach(async ({ page }) => {
  // Closing a Playwright context does not run Vue's onUnmounted hook. Release
  // the 80 MiB reference buffer and the dynamic table explicitly so the next
  // WebGPU test does not inherit device-memory pressure from this one.
  if (!page.isClosed()) {
    await page.evaluate(() => {
      const engine = (window as any).__mandelbrotEngine;
      engine?.destroy();
      delete (window as any).__mandelbrotEngine;
    }).catch(() => undefined);
    await page.waitForTimeout(100);
  }
});

test("dynamic Auto waits for and activates a matching packed validity table", async ({ page }) => {
  const criticalErrors: string[] = [];
  page.on("console", message => {
    const text = message.text();
    if (message.type() === "error" || /validation error|shader.*error/i.test(text)) {
      criticalErrors.push(text);
    }
  });

  await page.goto("/");
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, {
    timeout: 15_000,
  });
  const rolloutDefaults = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      dynamic: engine.dynamicBlockValidity,
      incremental: engine.incrementalReferenceTable,
      stats: engine.getDynamicValidityStatsEnabled(),
      navigatorDynamic: engine.mandelbrotNavigator.get_dynamic_block_validity(),
      navigatorIncremental: engine.mandelbrotNavigator.get_incremental_reference_table(),
    };
  });
  expect(rolloutDefaults).toEqual({
    dynamic: true,
    incremental: true,
    stats: false,
    navigatorDynamic: true,
    navigatorIncremental: true,
  });
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    // This scenario audits the atomic one-shot publication. Incremental
    // publication has dedicated coverage below and is now the rollout default.
    engine.setApproximationMode("auto");
    engine.setIncrementalReferenceTable(false);
    engine.setDynamicBlockValidity(true);
    engine.setDynamicValidityStatsEnabled(true);
  });

  await page.waitForFunction(() => {
    const engine = (window as any).__mandelbrotEngine;
    return engine.dynamicValidityReady
      && engine.dynamicValidityGeneration === engine.tableGeneration
      && engine.currentBlaLevelCount > 0
      && engine.lastShaderApproxFlag === 6;
  }, undefined, { timeout: 60_000 });

  const activation = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      ready: engine.dynamicValidityReady,
      domain: engine.dynamicValidityReferenceLog2Dc,
      generation: engine.dynamicValidityGeneration,
      tableGeneration: engine.tableGeneration,
      levels: engine.currentBlaLevelCount,
      flag: engine.lastShaderApproxFlag,
    };
  });

  const state = await page.evaluate(async () => {
    const engine = (window as any).__mandelbrotEngine;
    const snapshot = await engine.readDynamicValidityCounters();
    return {
      attempts: snapshot.tierAttempts,
      accepts: snapshot.tierAccepts,
      skipBuckets: snapshot.skipBuckets,
      candidateUses: snapshot.candidateUses,
      rejectionReasons: snapshot.rejectionReasons,
      exactFallbacks: snapshot.exactFallbacks,
    };
  });
  expect(activation.ready).toBe(true);
  expect(Number.isFinite(activation.domain)).toBe(true);
  expect(activation.generation).toBe(activation.tableGeneration);
  expect(activation.levels).toBeGreaterThan(0);
  expect(activation.flag).toBe(6);
  expect(state.attempts).toHaveLength(4);
  expect(state.accepts).toHaveLength(4);
  expect(state.attempts.every((value: number) => value >= 0)).toBe(true);
  expect(state.accepts.every((value: number, index: number) => value <= state.attempts[index])).toBe(true);
  expect(state.skipBuckets).toHaveLength(4);
  expect(state.candidateUses).toBeGreaterThanOrEqual(0);
  expect(state.rejectionReasons).toHaveLength(6);
  expect(state.exactFallbacks).toBeGreaterThanOrEqual(0);
  expect(criticalErrors).toEqual([]);
});

test("cmax-only motion refreshes optional headers without rebuilding the dynamic table", async ({ page }) => {
  const criticalErrors: string[] = [];
  page.on("console", message => {
    const text = message.text();
    if (message.type() === "error" || /validation error|shader.*error/i.test(text)) {
      criticalErrors.push(text);
    }
  });

  await page.goto("/");
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, {
    timeout: 15_000,
  });
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.setApproximationMode("auto");
    engine.setIncrementalReferenceTable(false);
    engine.setDynamicBlockValidity(true);
  });
  await page.waitForFunction(() => {
    const engine = (window as any).__mandelbrotEngine;
    return engine.dynamicValidityReady
      && engine.currentBlaLevelCount > 0
      && engine.currentUnifiedBlockCount > 0;
  }, undefined, { timeout: 60_000 });
  // Let the one-time exact -> Auto activation restart land before taking the
  // work-session baseline; the cmax assertion below concerns only navigation.
  await page.waitForTimeout(250);

  const before = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    const frame = engine.prevFrameMandelbrot;
    const scale = Number(frame?.scale ?? engine.mandelbrotNavigator.get_scale?.() ?? 1);
    const nextScale = (scale * 1024).toExponential(17); // ten octaves outward
    const nextMaxIterations = Math.max(32, Math.floor(engine.currentMaxIterations / 2));
    const snapshot = {
      headerRefreshes: engine.optionalHeaderRefreshCount,
      tableCompletions: engine.tableBuildCompletionSerial,
      cmaxRebuilds: engine.cmaxOnlyTableRebuildCount,
      blockCount: engine.currentUnifiedBlockCount,
      validityGeneration: engine.dynamicValidityGeneration,
      validityDomain: engine.dynamicValidityReferenceLog2Dc,
      levels: engine.currentBlaLevelCount,
      workSession: engine.workStatsSessionSerial,
      referenceResets: engine.referenceResetSerial,
    };
    engine.postReferenceWorker({
      type: "updateView",
      jobId: engine.referenceJobId,
      cx: frame.cx,
      cy: frame.cy,
      scale: nextScale,
      angle: frame.angle,
      maxIterations: nextMaxIterations,
      viewportAspect: engine.width / Math.max(1, engine.height),
    });
    return snapshot;
  });

  await page.waitForFunction((refreshes: number) => {
    const engine = (window as any).__mandelbrotEngine;
    return engine.optionalHeaderRefreshCount > refreshes;
  }, before.headerRefreshes, { timeout: 30_000 });

  const after = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      headerRefreshes: engine.optionalHeaderRefreshCount,
      tableCompletions: engine.tableBuildCompletionSerial,
      cmaxRebuilds: engine.cmaxOnlyTableRebuildCount,
      blockCount: engine.currentUnifiedBlockCount,
      validityGeneration: engine.dynamicValidityGeneration,
      validityDomain: engine.dynamicValidityReferenceLog2Dc,
      levels: engine.currentBlaLevelCount,
      workSession: engine.workStatsSessionSerial,
      referenceResets: engine.referenceResetSerial,
      lastStages: engine.lastTableBuildStages,
    };
  });

  expect(after.headerRefreshes).toBeGreaterThan(before.headerRefreshes);
  expect(after.lastStages).toBe(16);
  expect(after.tableCompletions).toBe(before.tableCompletions);
  expect(after.cmaxRebuilds).toBe(before.cmaxRebuilds);
  expect(after.blockCount).toBe(before.blockCount);
  expect(after.validityGeneration).toBe(before.validityGeneration);
  expect(after.validityDomain).toBe(before.validityDomain);
  expect(after.levels).toBe(before.levels);
  expect(after.workSession).toBe(before.workSession);
  expect(after.referenceResets).toBe(before.referenceResets);
  expect(criticalErrors).toEqual([]);
});

test("incremental Auto publishes a visible prefix before headroom and survives generation churn", async ({ page }) => {
  const criticalErrors: string[] = [];
  page.on("console", message => {
    const text = message.text();
    if (message.type() === "error" || /validation error|shader.*error/i.test(text)) {
      criticalErrors.push(text);
    }
  });

  await page.goto("/");
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.waitForTimeout(1_000); // let persisted UI parameters finish their initial sync
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.setApproximationMode("auto");
    engine.setDynamicBlockValidity(true);
    engine.setIncrementalReferenceTable(true);
  });

  await page.waitForFunction(() => {
    const engine = (window as any).__mandelbrotEngine;
    return !!engine
      && engine.incrementalTableOrbitCoverage > 1
      && engine.currentBlaLevelCount > 0
      && engine.lastShaderApproxFlag === 6;
  }, undefined, { timeout: 60_000 });

  const firstPrefix = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      coverage: engine.incrementalTableOrbitCoverage,
      built: engine.incrementalTableBuiltOrbit,
      available: engine.referenceAvailableOrbitLen,
      target: engine.currentMaxIterations + 1,
      generation: engine.tableGeneration,
      layoutGeneration: engine.incrementalTableLayout?.tableGeneration,
      layoutRefId: engine.incrementalTableLayout?.refId,
      activeRefId: engine.activeRef?.refId,
      levels: engine.incrementalTableLevelBlocks,
      levelMaxRadii: [...(engine.incrementalTableLayout?.maxDynamicRadius ?? [])],
      flag: engine.lastShaderApproxFlag,
    };
  });
  expect(firstPrefix.coverage).toBeLessThanOrEqual(firstPrefix.built);
  expect(firstPrefix.built).toBeLessThanOrEqual(firstPrefix.available);
  expect(firstPrefix.layoutGeneration).toBe(firstPrefix.generation);
  expect(firstPrefix.layoutRefId).toBe(firstPrefix.activeRefId);
  expect(firstPrefix.levels[0]).toBeGreaterThan(0);
  expect(firstPrefix.levelMaxRadii.length).toBeGreaterThanOrEqual(firstPrefix.levels.length);
  expect(firstPrefix.levelMaxRadii.some((value: number) => Number.isFinite(value))).toBe(true);
  expect(firstPrefix.flag).toBe(6);

  await page.waitForFunction(() => {
    const engine = (window as any).__mandelbrotEngine;
    const headroomTarget = Math.min(engine.currentMaxIterations * 2, 10_000_000) + 1;
    return !engine.tableBuildActive
      && engine.referenceAvailableOrbitLen >= headroomTarget
      && engine.incrementalTableBuiltOrbit >= engine.referenceAvailableOrbitLen;
  }, undefined, { timeout: 60_000 });

  const warmedHeadroom = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      available: engine.referenceAvailableOrbitLen,
      built: engine.incrementalTableBuiltOrbit,
      visibleTarget: engine.currentMaxIterations + 1,
    };
  });
  expect(warmedHeadroom.built).toBe(warmedHeadroom.available);
  expect(warmedHeadroom.built).toBeGreaterThanOrEqual(warmedHeadroom.visibleTarget);

  // Leave the immutable proof domain by a wide zoom-out while lowering the
  // visible maxIter.  Neither event may reset/shrink the reference-owned
  // append-only table; out-of-domain pixels simply use exact perturbation.
  const lifetimeBefore = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    const frame = engine.prevFrameMandelbrot;
    const scale = Number(frame?.scale ?? engine.mandelbrotNavigator.get_scale?.() ?? 1);
    const snapshot = {
      coverage: engine.incrementalTableOrbitCoverage,
      built: engine.incrementalTableBuiltOrbit,
      levels: [...engine.incrementalTableLevelBlocks],
      capacity: engine.incrementalTableLayout?.capacityOrbitLength,
      domain: engine.dynamicValidityReferenceLog2Dc,
      generation: engine.incrementalTableLayout?.tableGeneration,
      refId: engine.incrementalTableLayout?.refId,
      referenceResets: engine.referenceResetSerial,
      headerRefreshes: engine.optionalHeaderRefreshCount,
      scale: frame.scaleStr ?? String(frame.scale),
      maxIterations: engine.currentMaxIterations,
    };
    engine.postReferenceWorker({
      type: "updateView",
      jobId: engine.referenceJobId,
      cx: frame.cx,
      cy: frame.cy,
      scale: (scale * 1024).toExponential(17),
      angle: frame.angle,
      maxIterations: Math.max(32, Math.floor(engine.currentMaxIterations / 2)),
      viewportAspect: engine.width / Math.max(1, engine.height),
    });
    return snapshot;
  });
  await page.waitForFunction((refreshes: number) => {
    const engine = (window as any).__mandelbrotEngine;
    return engine.optionalHeaderRefreshCount > refreshes && !engine.tableBuildActive;
  }, lifetimeBefore.headerRefreshes, { timeout: 30_000 });
  const lifetimeAfter = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      coverage: engine.incrementalTableOrbitCoverage,
      built: engine.incrementalTableBuiltOrbit,
      levels: [...engine.incrementalTableLevelBlocks],
      capacity: engine.incrementalTableLayout?.capacityOrbitLength,
      domain: engine.dynamicValidityReferenceLog2Dc,
      generation: engine.incrementalTableLayout?.tableGeneration,
      refId: engine.incrementalTableLayout?.refId,
      referenceResets: engine.referenceResetSerial,
      headerRefreshes: engine.optionalHeaderRefreshCount,
    };
  });
  expect(lifetimeAfter.headerRefreshes).toBeGreaterThan(lifetimeBefore.headerRefreshes);
  expect(lifetimeAfter.coverage).toBeGreaterThanOrEqual(lifetimeBefore.coverage);
  expect(lifetimeAfter.built).toBeGreaterThanOrEqual(lifetimeBefore.built);
  expect(lifetimeAfter.capacity).toBe(lifetimeBefore.capacity);
  expect(lifetimeAfter.domain).toBe(lifetimeBefore.domain);
  expect(lifetimeAfter.generation).toBe(lifetimeBefore.generation);
  expect(lifetimeAfter.refId).toBe(lifetimeBefore.refId);
  expect(lifetimeAfter.referenceResets).toBe(lifetimeBefore.referenceResets);
  expect(lifetimeAfter.levels.length).toBe(lifetimeBefore.levels.length);
  lifetimeAfter.levels.forEach((count: number, index: number) => {
    expect(count).toBeGreaterThanOrEqual(lifetimeBefore.levels[index] ?? 0);
  });

  // Restore the worker view before exercising generation churn below.
  await page.evaluate((snapshot: any) => {
    const engine = (window as any).__mandelbrotEngine;
    const frame = engine.prevFrameMandelbrot;
    engine.postReferenceWorker({
      type: "updateView",
      jobId: engine.referenceJobId,
      cx: frame.cx,
      cy: frame.cy,
      scale: snapshot.scale,
      angle: frame.angle,
      maxIterations: snapshot.maxIterations,
      viewportAspect: engine.width / Math.max(1, engine.height),
    });
  }, lifetimeBefore);

  // Several parameter changes are queued while cooperative units yield. Only
  // the final generation may survive; stale ranges must never mix into it.
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.setBlaEpsilon(engine.blaEpsilon * 0.75);
    engine.setApproximationMode("perturbation");
    engine.setApproximationMode("auto");
  });
  await page.waitForFunction(() => {
    const engine = (window as any).__mandelbrotEngine;
    return !!engine
      && engine.incrementalTableLayout?.tableGeneration === engine.tableGeneration
      && engine.incrementalTableLayout?.refId === engine.activeRef?.refId
      && engine.currentBlaLevelCount > 0
      && engine.lastShaderApproxFlag === 6;
  }, undefined, { timeout: 60_000 });
  const afterChurn = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      generation: engine.tableGeneration,
      layoutGeneration: engine.incrementalTableLayout?.tableGeneration,
      layoutRefId: engine.incrementalTableLayout?.refId,
      activeRefId: engine.activeRef?.refId,
      cancellations: engine.incrementalTableCancellations,
      levels: engine.incrementalTableLevelBlocks,
    };
  });
  expect(afterChurn.layoutGeneration).toBe(afterChurn.generation);
  expect(afterChurn.layoutRefId).toBe(afterChurn.activeRefId);
  expect(afterChurn.cancellations).toBeGreaterThanOrEqual(0);
  expect(afterChurn.levels[0]).toBeGreaterThan(0);

  // Replace the reference while the old builder may still have queued units.
  // The next published prefix must belong exclusively to the new ref/job.
  const replaced = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    const previousRefId = engine.activeRef?.refId;
    const previousJobId = engine.referenceJobId;
    const frame = engine.prevFrameMandelbrot;
    engine.resetReference(frame.cx, frame.cy);
    return { previousRefId, previousJobId };
  });
  await page.waitForFunction((previous: any) => {
    const engine = (window as any).__mandelbrotEngine;
    return !!engine
      && engine.referenceJobId > previous.previousJobId
      && engine.activeRef?.refId !== previous.previousRefId
      && engine.incrementalTableLayout?.refId === engine.activeRef?.refId
      && engine.incrementalTableLayout?.tableGeneration === engine.tableGeneration
      && engine.currentBlaLevelCount > 0
      && engine.lastShaderApproxFlag === 6;
  }, replaced, { timeout: 60_000 });
  expect(criticalErrors).toEqual([]);
});

test("incremental capacity growth preserves committed ranges and render history", async ({ page }) => {
  const criticalErrors: string[] = [];
  page.on("console", message => {
    const text = message.text();
    if (message.type() === "error" || /validation error|shader.*error/i.test(text)) {
      criticalErrors.push(text);
    }
  });

  await page.goto("/");
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.waitForTimeout(1_000); // let persisted UI parameters finish their initial sync
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.setApproximationMode("auto");
    engine.setDynamicBlockValidity(true);
    engine.setIncrementalReferenceTable(true);
  });
  await page.waitForFunction(() => {
    const engine = (window as any).__mandelbrotEngine;
    return engine.incrementalTableOrbitCoverage > 1024
      && engine.currentBlaLevelCount > 0
      && engine.lastShaderApproxFlag === 6;
  }, undefined, { timeout: 60_000 });
  await page.waitForTimeout(250);

  const before = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    const frame = engine.prevFrameMandelbrot;
    const nextMaxIterations = Math.min(9_000_000, engine.currentMaxIterations * 2);
    const snapshot = {
      coverage: engine.incrementalTableOrbitCoverage,
      growths: engine.incrementalTableCapacityGrowths,
      workSession: engine.workStatsSessionSerial,
      levelBlocks: [...engine.incrementalTableLevelBlocks],
      tableGeneration: engine.tableGeneration,
      refId: engine.activeRef?.refId,
      nextMaxIterations,
    };
    engine.postReferenceWorker({
      type: "updateView",
      jobId: engine.referenceJobId,
      cx: frame.cx,
      cy: frame.cy,
      // The worker protocol carries arbitrary-precision view values as
      // decimal strings. Engine.syncReferenceWorkerView normally performs
      // this conversion; this test posts directly to isolate capacity growth.
      scale: frame.scaleStr ?? String(frame.scale),
      angle: frame.angle,
      maxIterations: nextMaxIterations,
      viewportAspect: engine.width / Math.max(1, engine.height),
    });
    return snapshot;
  });

  await page.waitForFunction((snapshot: any) => {
    const engine = (window as any).__mandelbrotEngine;
    return engine.incrementalTableCapacityGrowths > snapshot.growths
      && engine.incrementalTableOrbitCoverage > snapshot.coverage;
  }, before, { timeout: 60_000 });
  const after = await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    return {
      coverage: engine.incrementalTableOrbitCoverage,
      growths: engine.incrementalTableCapacityGrowths,
      workSession: engine.workStatsSessionSerial,
      levelBlocks: engine.incrementalTableLevelBlocks,
      tableGeneration: engine.incrementalTableLayout?.tableGeneration,
      refId: engine.incrementalTableLayout?.refId,
      activeRefId: engine.activeRef?.refId,
      flag: engine.lastShaderApproxFlag,
      levels: engine.currentBlaLevelCount,
    };
  });
  expect(after.coverage).toBeGreaterThan(before.coverage);
  expect(after.growths).toBeGreaterThan(before.growths);
  expect(after.levelBlocks[0]).toBeGreaterThanOrEqual(before.levelBlocks[0]);
  expect(after.workSession).toBe(before.workSession);
  expect(after.tableGeneration).toBe(before.tableGeneration);
  expect(after.refId).toBe(before.refId);
  expect(after.refId).toBe(after.activeRefId);
  expect(after.flag).toBe(6);
  expect(after.levels).toBeGreaterThan(0);
  expect(criticalErrors).toEqual([]);
});

test("dynamic shadow records certificates while legacy tags remain authoritative", async ({ page }) => {
  const criticalErrors: string[] = [];
  page.on("console", message => {
    const text = message.text();
    if (message.type() === "error" || /validation error|shader.*error/i.test(text)) {
      criticalErrors.push(text);
    }
  });

  await page.goto("/");
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.waitForTimeout(1_000);
  await page.evaluate(() => {
    const engine = (window as any).__mandelbrotEngine;
    engine.setApproximationMode("auto");
    engine.setDynamicBlockValidity(true);
    engine.setIncrementalReferenceTable(false);
    engine.setDynamicValidityShadow(true);
  });
  await page.waitForFunction(() => {
    const engine = (window as any).__mandelbrotEngine;
    return engine.lastShaderApproxFlag === 7
      && engine.currentBlaLevelCount > 0
      && engine.getDynamicValidityShadow()
      && !engine.getIncrementalReferenceTable();
  }, undefined, { timeout: 60_000 });

  await expect.poll(async () => page.evaluate(async () => {
    const engine = (window as any).__mandelbrotEngine;
    const snapshot = await engine.readDynamicValidityCounters();
    return snapshot.tierAttempts.reduce((sum: number, count: number) => sum + count, 0);
  }), { timeout: 30_000 }).toBeGreaterThan(0);
  expect(criticalErrors).toEqual([]);
});
