## Context

The renderer exposes per-pass GPU timings through a fixed `PASS_SLOTS` table and two timestamp queries per slot. Shader passes write timestamps through `timestampWrites`; results are resolved and mapped asynchronously. Because beginning-of-pass timestamps are unreliable on some tiled/mobile GPUs, normal pass durations are partitioned from consecutive end timestamps.

Two attribution ambiguities remain. The raw-cache utility compute pass is labelled “Reprojection” whether it performs a pan gather or a full sentinel clear. Separately, `copyTextureToTexture` commands used to freeze the resolved display have no native pass descriptor on which to attach `timestampWrites`, so their cost is currently absorbed by the next timed pass. The zoom merge path already has its own timed render pass and its preparatory scratch copies are intrinsic to that merge operation.

## Goals / Non-Goals

**Goals:**

- Expose four unambiguous categories: `Reprojection (pan)`, `Clear cache`, `Snapshot (zoom)`, and `Merge (zoom)`.
- Attribute the three resolved-to-frozen snapshot copies to `Snapshot (zoom)` rather than to the following pass.
- Preserve end-timestamp partitioning for ordinary compute/render passes and asynchronous readback without a CPU/GPU wait.
- Keep pass activation, EMA values, aggregate GPU span, and iteration-controller feedback coherent after adding slots.

**Non-Goals:**

- Optimizing reprojection, snapshot copies, merge, bind groups, dispatch size, or texture bandwidth.
- Changing raw/display texture formats, layer counts, cache state, shader output, AA behavior, pan behavior, or zoom behavior.
- Adding a new profiling panel or persisting profiling data.
- Running browser/Playwright performance benchmarks as part of this instrumentation-only change.

## Decisions

### Assign the shared utility pass to a semantic slot per frame

The utility compute pass SHALL select `Clear cache` when `clearHistoryNextFrame` is active and `Reprojection (pan)` otherwise. Clear takes precedence when a frame also carries a translation, matching the shader's existing clear-first behavior. The pipeline, bind group, dispatch, and texture swap remain unchanged.

This is preferred over retaining one utility metric plus a mode label because distinct slots preserve independent EMA histories and make intermittent costs directly comparable in the existing panel.

### Measure the copy-only snapshot region with end-timestamp boundaries

The resolved-to-frozen copy region SHALL receive a GPU timestamp boundary immediately before its first `copyTextureToTexture` and immediately after its last copy. Since command encoders do not expose portable inline timestamp writes for copy commands in the project's WebGPU typings, each boundary will be encoded as a compute pass with only an end-of-pass timestamp write and a one-thread no-op dispatch. The dispatch prevents browsers from eliminating a completely empty marker pass. The two robust end markers form the explicit start/end pair for the `Snapshot (zoom)` slot.

Timestamp readback SHALL recognize this slot as an explicit span and compute `afterCopyEnd - beforeCopyEnd`. Normal shader slots SHALL continue to use consecutive-end partitioning. The snapshot end marker also becomes the chronological predecessor of the following pass, preventing either omission or double attribution of the copies.

Boundary passes SHALL only be encoded when timestamp measurement is enabled. They bind a dedicated resource-free no-op pipeline, dispatch one thread, and do not modify renderer state.

### Keep merge as an end-to-end zoom-merge measurement

`Merge (zoom)` SHALL remain distinct from the resolved-to-frozen snapshot operation. Its duration continues to represent the complete merge operation, including the frozen-to-scratch preparation copies immediately preceding the merge shader. Those copies exist solely to make the merge legal and are therefore part of the merge cost rather than the independent snapshot cost.

To make that attribution robust even when merge is the first GPU operation in a frame, an end-marker boundary SHALL write the merge slot's start query before its preparation copies, while the merge render pass SHALL write only the slot's end query at pass completion. This uses the same explicit-span readback semantics as the snapshot without adding a second merge category.

### Reuse the existing statistics surface

The new slots SHALL be added to `PASS_SLOTS`, which remains the source of labels, help text, display order, active state, and timestamp-query sizing. Existing consumers of `passMeta`, `passTimingsMs`, `passActive`, `passGpuSumMs`, `passGpuSpanMs`, and `otherPassesGpuMs` SHALL continue to work without a parallel statistics path.

## Risks / Trade-offs

- **[Timestamp marker passes add small command-encoding/GPU overhead]** → Encode them only when timestamp queries are enabled, limit each marker to one no-op thread with no resources, and verify that the change does not alter rendering and that measured total span remains coherent.
- **[Explicit-span and end-gap calculations could double-count the snapshot copies]** → Treat the snapshot's post-copy marker as a normal chronological end boundary for the following pass, while using its pre-copy marker only for the snapshot's direct duration.
- **[A clear frame carrying a stale/non-zero translation could be reported as pan]** → Select the slot using the same clear-first precedence as `reproject_cs.wgsl`.
- **[Repeated use of one query pair in a frame is invalid]** → Bracket only the single resolved-to-frozen snapshot region; keep merge preparation in the merge metric.
- **[More slots increase query and bitmask bookkeeping]** → Derive query count from `PASS_SLOTS` as today and keep the slot count below the 32-bit active-mask limit.

## Migration Plan

1. Extend timing metadata and query allocation with the new semantic slots.
2. Route the existing utility pass timestamp to clear or pan according to its actual mode.
3. Add explicit GPU boundaries around the resolved-to-frozen copy block and handle that slot as a direct span during readback.
4. Update focused timing tests and perform TypeScript/build validation without changing renderer resources or shaders.

Rollback consists of restoring the single utility slot and removing the copy boundaries; no data or saved-state migration is involved.

## Open Questions

None. Any subsequent bandwidth or cache optimization will be proposed as a separate change after these measurements identify the dominant cost.
