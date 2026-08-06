## Context

The current renderer advances two competing notions of progress:

```text
spatial progress:  coarse sentinels -> dyadic refinement -> exact texels
temporal progress: active texels -> adaptive iteration batches -> completion
```

Super Pixel adds a feedback loop from the previous resolved texture to the spatial loop, with fractional step markers, terminal Taylor coverage, rejection diagnostics, and special completion rules. The resolve and color stages still run around this machinery, and measured refinement cost has been about 6–7 ms in the reported view (2–3 ms in favorable cases).

With a seed step of 1, every texel begins as an exact compute request and the dyadic loop has no useful work. The remaining progressive behavior is temporal: an orbit may consume several adaptive iteration batches before it finishes. The existing resolve can still show a temporary bilinear estimate for those incomplete orbits.

The adaptive AA system is a separate idle/on-demand loop over a converged step-1 field. It remains in scope as a consumer of exact reseeds and, where available, analytic derivative payloads.

## Goals / Non-Goals

**Goals:**

- Reduce the normal renderer to one convergence mechanism: per-pixel adaptive iteration batches.
- Seed every visible raw texel as an exact request at step 1.
- Preserve stable progressive display through temporary bilinear resolution of incomplete orbits.
- Remove Super Pixel feedback, spatial-refinement state, controls, markers, counters, and diagnostics.
- Collapse remaining-work accounting where spatial and temporal counts have become equivalent.
- Retain live/frozen reprojection, navigation behavior, and adaptive AA.
- Use one f32 shader-arithmetic variant while allowing explicit 16-bit storage formats.

**Non-Goals:**

- Removing adaptive AA, analytic AA, or derivative data shared with those paths.
- Changing approximation algorithms in the Rust/WASM reference calculus or WGSL orbit engine.
- Redesigning the resolved/frozen display ABI; that belongs to `cache-packed-geometry-fields`.
- Removing bilinear display fallback for budget-exhausted pixels.
- Claiming a GPU speedup from static/build checks alone.

## Decisions

### One exact spatial grid

History clear and newly exposed pixels are seeded with `iter = -1` at step 1. Negative power-of-two sentinels, grid offsets, minimum brush steps, and `refine_sentinel` are removed. Both the in-place compute path and the render ping-pong fallback SHALL produce the same exact-request topology.

This replaces coarse first coverage with an immediate full-screen work wave. The adaptive controller continues to bound iteration work per active texel; its minimum batch remains one iteration so the initial wave can be divided across frames.

**Alternative considered:** retain dyadic refinement but default both step settings to 1. This hides rather than removes the second state machine and leaves its branches, UI, tests, and maintenance cost in place.

### Temporal batching is the only convergence loop

After a dispatch, a texel remains unfinished only if it is still an exact request or a non-terminal continuation. A single post-dispatch remaining-pixel count drives `needsMoreFrames()` and the adaptive batch controller. Separate counts that existed to distinguish uncovered sentinels from active orbit continuations are removed or made aliases during migration.

Batch timing SHALL continue to reserve time for fixed passes such as resolve, geometry/color, and presentation. The controller MUST NOT interpret a reduction in refinement cost as permission to spend the whole frame on iteration.

### Bilinear resolve is temporary presentation, not convergence

The raw texture contains exact orbit state only. Resolve treats a completed texel as genuine step 1. For a budget-exhausted/incomplete texel it searches dyadic support distances starting at 2 and emits the best available bilinear display value plus its support step. When no finished support exists it emits no-data.

The support step remains part of the current display ABI because live/frozen compositing still needs a quality ordering. The later `cache-packed-geometry-fields` change may encode it compactly, but this change does not remove the semantic.

**Alternative considered:** show the last incomplete orbit value directly. That can expose unstable escape metrics and produces less coherent navigation than the existing finished-neighbor fallback.

### Remove Super Pixel without removing shared analytic data

All Super Pixel-specific controls, previous-resolve feedback bindings, half-step coverage markers, rejection tags, Taylor terminal fill branches, counter exclusions, wakeups, timestamp labels, and debug legends are removed.

`z″` production/storage that is still required by analytic AA or by the subsequent cached-geometry change is retained. The ownership boundary is consumer-based: terminal spatial fill disappears, shared derivative infrastructure does not.

### Keep adaptive AA as a distinct step-1 consumer

AA remains inactive during ordinary convergence and starts only through its existing manual/auto idle trigger. Its selective reseed already stamps exact requests on a step-1 grid, so it no longer needs to check configurable brush/refinement steps. Interaction still aborts AA and returns to ordinary temporal convergence.

### Remove the shader-f16 arithmetic fork

Feature negotiation and source variants used only to enable f16 arithmetic in the color shader are removed. Shader calculations use f32 consistently. Storage formats such as `rgba16float` remain valid because their values are converted to f32 when loaded; storage precision and arithmetic precision are separate decisions.

**Alternative considered:** keep the variant behind `?f16=off`. The small localized code cost is outweighed by duplicated shader creation and validation paths without a demonstrated rendering benefit.

### Remove obsolete performance settings

The zoom brush step and sentinel seed step controls, defaults, validation, and persisted keys are removed. Existing browser-storage entries are ignored and may be deleted opportunistically; no replacement setting is introduced.

## Risks / Trade-offs

- **Initial step-1 dispatch touches the full grid** → keep a one-iteration minimum batch, include fixed-pass reserve in the controller, and compare first-frame and steady-state GPU timings separately.
- **Temporary bilinear regions may remain visible longer in expensive views** → retain finished-neighbor fallback and verify pan/zoom stability at multiple iteration budgets.
- **Removing user step controls eliminates a manual escape hatch** → expose actual frame-budget behavior through existing timing/debug telemetry rather than spatial-quality knobs.
- **Removing f16 arithmetic could regress a particular GPU** → compare the legacy f16 and unified f32 variants before deletion on user-approved browser/GPU runs; keep 16-bit storage independent.
- **Shared `z″` code may be mistaken for dead Super Pixel code** → classify each producer and layer by remaining AA/geometry consumers before removal.
- **Two active OpenSpec changes touch the display pipeline** → implement and validate this simplification first, then rebase the packed-geometry work on the simplified contract.

## Migration Plan

1. Force step-1 seeding and disable Super Pixel through existing controls to establish a comparison baseline without deleting code.
2. Adapt counters, resolve behavior, AA preconditions, and navigation paths to the single-grid model.
3. Remove Super Pixel/refinement pipelines, bindings, uniforms, UI, persistence, debug views, and dead shader branches.
4. Remove the shader-f16 variant while retaining any explicitly selected 16-bit texture formats.
5. Run static shader/type/build validation and focused non-Playwright checks.
6. With explicit user confirmation, compare browser/GPU timing and visual behavior for reset, deep convergence, pan, zoom reprojection, frozen/live merge, and AA.

Rollback is a source rollback of the change. There is no persisted data migration beyond ignoring obsolete local-storage keys.

## Open Questions

- What frame-time reduction is observed after separating iteration, resolve, and color timings on the target GPU?
- Does a full-screen step-1 reset require retuning the adaptive controller's fixed-pass reserve or only its initial estimate?
- Are there any user workflows that still depend on the removed step controls enough to warrant a non-default diagnostic override outside the normal UI?
