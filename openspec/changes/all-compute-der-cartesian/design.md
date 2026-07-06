# Design — all-compute-der-cartesian

## Context

Two rendering paths write the raw per-pixel state (8-layer r32float arrays A =
`rawTexture`, B = `rawBrushTexture`):

- **compute in-place** (`mandelbrot_brush.wgsl` cs_main): the hot path (static
  view / zoom), fused brush+iterate+count, in place on A, finished texels write
  nothing. Writes via `textureStore` — no MRT involvement.
- **fragment ping-pong** (`reproject.wgsl` A→B then `mandelbrot.wgsl` B→A):
  taken only when `hasTranslationShift` (pan needs a neighbour read — racy in
  place) or `clearHistoryNextFrame` (sentinel re-stamp). Both are 8-target MRT
  passes; 8 × r32float = 32 B/sample = exactly the WebGPU default
  `maxColorAttachmentBytesPerSample` — a 9th raw layer is impossible on this
  path.

The der continuation state (in-progress pixels) lives in layers 4/5 as polar
(angle, log|der|): `atan2 + log` on store, `cos + sin` on load, at EVERY pass
boundary — boundaries whose count varies run-to-run (timing-adaptive batch) →
the measured DE non-determinism. Cartesian needs 3 slots. Display-side textures
(`resolvedTexture`, `frozenTexture`) and passes (resolve/color/merge_frozen,
all MRT-8) consume only the ESCAPED format (height, angle) and never carry
continuation state — they are out of scope.

Session measurements that shaped this: reference precision is NOT the binding
factor (f32 orbit bit-identical across DBig budgets); polar round-trip × 
variable pass boundaries is the non-determinism; derS drift is handled by the
separate `compensate-ders` change.

## Goals / Non-Goals

**Goals:**
- One production iteration shader (compute); fragment iteration twin deleted.
- Pan and clear handled by a compute utility pass (ping-pong A→B — neighbour
  reads race-free because A is read-only during the pass).
- Raw A/B at 9 layers; in-progress der carried raw (zero transcendentals at
  boundaries); polar computed once at escape.
- Run-to-run deterministic DE (bit-identical), regardless of batch adaptivity.
- Hot-path performance preserved BY CONSTRUCTION: the in-place dispatch and its
  zero-write-for-finished-texels property are not modified.

**Non-Goals:**
- Porting display-side passes (resolve/color/merge) to compute — MRT-8 suffices
  there, and they carry no continuation state.
- The A/B pointer-swap optimization (keep today's copy B→A; recorded follow-up).
- derM phase compensation or derS_lo storage (contingency below, not built).
- The debug shader (separate tool, keeps its own loop).

## Decisions

> **Implementation note (2.1):** the port deliberately DROPS sentinel
> refinement from the utility pass. The fused in-place shader refines on every
> dispatch — including the one following the utility pass in the same frame —
> so refining in reproject_cs too would halve the sentinel step twice per pan
> frame. One-refinement-per-frame is preserved by letting cs_main own it; the
> utility pass does clear stamping + integer pan gather + out-of-bounds
> clears only. Budget-exhausted pixels pass through (verbatim fragment-brush
> behavior — continuation is the iteration shader's job).

### D1 — Utility pass is a ping-pong compute port of reproject.wgsl

`reproject_cs` reads A (`texture_2d_array`), writes B (`textureStore`,
write-only storage texture, 9 layers) — every texel writes all layers (this
pass runs on pan/clear frames only, full rewrite is its job today too). Ports
verbatim: integer-texel pan gather (`coord − shift`), sentinel stamping,
resolution refinement (`minBrushStep`, `allowRefinement`), budget-exhausted
conversion, out-of-bounds clear. Spike 1.1 verifies the shift is always
integer-texel (Engine "Option B" alignment comment says so; if a fractional
case exists, the pan keeps bilinear behavior via 4 `textureLoad`s — a local
detail, not a design change).

### D2 — Frame routing: utility-then-iterate, copy kept

Pan/clear frames become `[reproject_cs A→B] → [copyTextureToTexture B→A] →
[in-place on A]`, one encoder. The fragment path's `blitz` frame semantics
(brush + iterate in one frame) are preserved — iteration now happens in the
same frame's in-place dispatch. `useInplacePath` becomes unconditional; the
old gates (`hasTranslationShift`, `clearHistoryNextFrame`) only decide whether
the utility pass runs first. Counter/workStats semantics: the utility pass
does not touch counters (parity with today's brush); `lastRawMutationFrame`
bookkeeping follows the same conditions as today.

### D3 — Deletion, not deprecation

Once routing is proven (Playwright pan/clear/zoom specs), `mandelbrot.wgsl`,
`reproject.wgsl`, `pipelineMandelbrot`, `pipelineBrush`, their bind groups and
the MRT target list for raw go away in the same change. Keeping the twin
"just in case" defeats the change's main payoff (every mode edit costs ×2 —
lived on mobius). Rollback story = git revert of the change.

### D4 — Layer split: RAW_LAYERS = 9, DISPLAY_LAYERS = 8

`LAYER_COUNT` splits into two constants. 9 layers apply to `rawTexture`,
`rawBrushTexture` (creation, per-layer views, array views, the B→A copy
extent, aa_reseed's storage binding is an array view — unchanged semantics).
Display textures and their MRT pipelines keep 8. Memory cost: +12.5 % on the
two raw arrays only.

### D5 — Cartesian der format, escape-time polar

In-progress pixels: layers 4/5/8 = raw `derM.x, derM.y, derS` (register
copies — exact f32 round-trip). Escaped pixels: layers 4/5 = (DE height,
relief angle) exactly as today, layer 8 dead. Discriminant: the existing
iter-layer state (sentinel/in-progress vs finished) — already how 4/5's dual
meaning is resolved today. `der_to_polar` survives at exactly one site: escape
shading. Loads reconstruct `derM`/`derS` directly; the LOG_DER_ZERO empty-state
sentinel is replaced by the same iter-based discriminant.

### D6 — Determinism spec replaces the parity spec

`inplace-compute.spec.ts` (fragment-vs-compute pixel diff, failing pre-mobius,
open bisect task) is retired with the fragment path itself. Its successor
renders the same deep view twice from scratch and asserts the DE-relevant
output is bit-identical — directly testing the user-visible complaint
(run-to-run DE flicker), which no existing spec covers.

### D7 — Contingency: derS_lo 10th layer

If field testing still shows boundary residue (from `compensate-ders`'s
dropped lo), the post-refactor layer budget (no MRT, max 256) makes a 10th
layer a ~20-line follow-up. Not built now.

## Risks / Trade-offs

- [Fractional pan shift assumption wrong] → spike 1.1 settles it first; the
  fallback (manual bilinear gather) is local to reproject_cs.
- [Gather compute slower than rasterized full-frame rewrite on pan frames] →
  pan is transient (user is moving, not judging detail); measured in 5.2 but
  non-blocking. The copy B→A already exists today on these frames.
- [Hidden fragment-path dependencies (AA reseed staging, resolve gating,
  needsMoreFrames) keyed on the old path split] → task 1.2 inventories every
  `useInplacePath` / `pipelineMandelbrot` / `pipelineBrush` consumer before any
  deletion; routing lands behind the existing flags first.
- [9-layer creation cost on resize paths] → same allocation sites as today,
  +1 layer; no new allocation pattern.
- [Losing the fragment twin as a debugging reference] → `mandelbrot_debug.wgsl`
  remains; git history keeps the twin.

## Migration Plan

1. Phase 1 lands first and alone (routing + deletion) — behavior-identical
   rendering (8 layers, polar carry) but single-path; Playwright pan/clear/zoom
   green before proceeding.
2. Phase 2 (9 layers + Cartesian) lands second; determinism spec green; field
   check on the user's deep views.
3. Rollback: each phase is a coherent revert unit.

## Spike Results

### 1.1 — Pan shift is always integer-texel (verified)

`reproject.wgsl` applies `vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)))`
before the gather — the GPU shift is integer by construction even though the
uniform carries the unrounded value. The JS side is consistent: 
`hasTranslationShift` gates on the ROUNDED shift, `cumulativeShiftX/Y` (grid
alignment) accumulate the ROUNDED shift, and the known fractional case
(small-zoom stop, un-snapped cx delta) forces `clearHistoryNextFrame` so the
shift is zero on that frame (Engine.ts "small-zoom stop" block). reproject_cs
ports the same `round()` + integer gather; no bilinear fallback needed.

### 1.2 — Path-split consumer inventory & routing table (verified against Engine.ts)

**Path selector** (`render()`): `useInplacePath = useInplaceCompute &&
!clearHistoryNextFrame && !hasTranslationShift && pipelineInplace &&
bindGroupInplace && counterBuffer`. Consumers and their post-refactor routing:

| Consumer (site) | Today | After |
|---|---|---|
| Frame branch (`if (useInplacePath)`) | in-place dispatch vs [brush MRT A→B, copy B→A, mandelbrot MRT B→A, count pass] | ALWAYS in-place; when `clearHistoryNextFrame \|\| hasTranslationShift`, prepend [reproject_cs A→B, copy B→A] in the same encoder |
| `lastRawMutationFrame` | set when `!useInplacePath \|\| unfinished≠0 \|\| active≠0` | set when `utilityRan \|\| unfinished≠0 \|\| active≠0` (utility pass rewrites A wholesale — same conservative meaning) |
| Resolve gating `skipResolve` | requires `useInplacePath` + converged + `counterSampleFrame >= lastRawMutationFrame` | drop the path term (always in-place); rest unchanged — utility frames bump `lastRawMutationFrame`, so they can't skip resolve stale |
| Counters/workStats | in-place: clearBuffer + in-shader atomics + counter+workStats readback; fragment: separate `pipelineCount` dispatch, counter-only readback, NO workStats | single path: fused counters every frame (clear/pan frames included — the same-frame in-place dispatch counts). `pipelineCount`/`counterBindGroup`/`uniformBufferCount`/`count_unfinished.wgsl` become dead → delete with the fragment path |
| render() early-outs | bail if `pipelineBrush/pipelineMandelbrot/bindGroupBrush/bindGroupMandelbrot` missing | bail if `pipelineInplace/bindGroupInplace` (+ reproject_cs pipeline) missing |
| `rebuildMandelbrotBindGroup()` | also creates `bindGroupDebug` and chains `rebuildInplaceBindGroup()` | extract debug-bind-group creation + inplace rebuild before deleting it (debug tool stays) |
| AA reseed staging | dispatch inside the `useInplacePath` branch; trigger gated on `useInplaceCompute` | unchanged — branch becomes unconditional; fallback `clearHistoryNextFrame=true` now routes through the utility pass (same one-frame reconverge semantics) |
| `needsMoreFrames()` | path-agnostic (clearHistory is a reason) | unchanged |
| `makeMrtAttachments` + `mrtTargets` (8×r32float) | brush/mandelbrot/resolve/merge | resolve/merge only (display side, stays 8 = DISPLAY_LAYERS) |
| Copy extents (`LAYER_COUNT`) | B→A prefill; frozen→B (merge scratch); resolved→frozen (freeze); A→resolved (resolve prefill) | B→A becomes RAW_LAYERS(9); frozen→B stays DISPLAY_LAYERS(8) (B is 9-layer, copying 8 into it is legal); resolved→frozen 8; A→resolved 8 (raw layer 8 is continuation-only, display never reads it) |
| `uniformBufferBrush` | brush fragment pass + inplace binding 5 | reproject_cs uses the same BrushUniforms buffer + inplace binding 5 (unchanged) |
| B (`rawBrushTexture`) usage | MRT target + merge scratch read | reproject_cs storage-write target (+STORAGE_BINDING usage) + merge scratch read (9-layer array view read by merge's 8-layer loop — legal) |
| `shaderPassCompute` indirection (mandelbrot.wgsl source) | feeds `pipelineMandelbrot` | delete with the pipeline |
| aa_target / aa_reseed | read/write A's array view | unchanged views; 9-layer view legal for both (they touch layers 0/1 and read 4/5 post-convergence only) |

Expected in-progress 4/5 consumers outside the iteration shader: none — resolve
copies layers wholesale (no interpretation), aa_target bakes only after full
convergence (escaped format), color reads 4/5 only for escaped/inside pixels.
Re-verified at 4.2 when the discriminant changes.

## Close-out (5.3)

- **Retired**: `tests/inplace-compute.spec.ts` (fragment-vs-compute parity; its
  pre-existing failure and the bisect task on it are moot — the fragment path
  no longer exists). Successor: `tests/determinism.spec.ts`, which reads the
  raw layers back through the engine device and asserts bit-identical hashes
  across from-scratch reruns and across batch-size perturbation — both green
  at 1e-32 (validated 2026-07-05).
- **Measured**: the screenshot-level comparison retains a ~0.3 % / max-5-u8
  residual from animated display parameters (palette drift) — display-chain
  only, raw layers are bit-exact.
- **Follow-up (not built): A/B pointer swap** — pan/clear frames still pay the
  B→A copy (9 layers now). Swapping the A/B roles per utility frame would
  remove it; requires re-pointing every bind group that names A
  (inplace, resolve, color-raw, aa_target/aa_reseed, merge scratch).
- **Follow-up (not built): derS_lo 10th layer** — if the user field round
  (5.2) still shows boundary residue, the dropped two-sum `lo` term can get
  its own layer (~20 lines: RAW_LAYERS 10, one extra store/load pair in
  mandelbrot_brush.wgsl). The residual is ≤ ½ ULP per boundary today.

## Open Questions

- Integer-vs-fractional pan shift (spike 1.1) — RESOLVED: integer always (above).
- Whether the aa_target DE-derived sample-count bake reads layer 4/5 semantics
  anywhere that assumes polar in-progress values (inventory in 1.2; expected
  no — it runs post-resolve).
