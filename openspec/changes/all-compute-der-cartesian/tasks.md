# Tasks — all-compute-der-cartesian

## 1. Spikes / inventory (before any deletion)

- [x] 1.1 Verify the pan shift is always integer-texel (Engine "Option B"
      alignment; `shiftTexX/Y` producers). If a fractional case exists, note the
      bilinear-gather fallback in design.md.
- [x] 1.2 Inventory every consumer keyed on the path split: `useInplacePath`
      gates, `pipelineMandelbrot`/`pipelineBrush`/bind groups, AA reseed
      staging, resolve gating, `needsMoreFrames`, `lastRawMutationFrame`,
      counter/workStats semantics on fragment frames. Record the routing table
      in design.md.

## 2. Phase 1a — compute utility pass

- [x] 2.1 `reproject_cs.wgsl`: ping-pong A→B compute port of reproject.wgsl
      (pan gather, sentinel stamp/refinement, budget-exhausted conversion,
      clears), 9-layer-ready via a layer-count override constant; naga green.
- [x] 2.2 Engine: pipeline + bind groups (A-read / B-write storage array),
      dispatch wiring behind the existing `hasTranslationShift` /
      `clearHistoryNextFrame` gates, followed by the existing B→A copy and the
      same-frame in-place dispatch.

## 3. Phase 1b — routing + deletion

- [x] 3.1 Route pan and clear frames through the utility pass;
      `useInplacePath` unconditional; counters/mutation bookkeeping per the
      1.2 table.
- [x] 3.2 Playwright: pan preserves history (shift gather), clear restarts
      clean, zoom reprojection unaffected; mode specs (mobius/jet) green.
      → visual (zoom/pan flows) + jet/mobius mode & deep specs green on the
      compute-only routing; only the 8 pre-existing failures (7 navigation UI
      + palette preview, identical without this change) remain.
- [x] 3.3 Delete `mandelbrot.wgsl`, `reproject.wgsl`, `pipelineMandelbrot`,
      `pipelineBrush`, their bind groups and raw MRT target list;
      `vue-tsc` + `vite build` green.
      → also deleted with the fragment path: `count_unfinished.wgsl` +
      `pipelineCount` (fragment-only counter), the `useInplaceCompute` runtime
      toggle, `shaderPassCompute`, and the unused raw per-layer MRT views.
      Bundle −85 kB. Note: the long-running dev server needed a restart after
      the on-disk shader deletions (stale vite module graph broke the
      reference worker); fresh server + full spec set green.
- [x] 3.4 Retire `tests/inplace-compute.spec.ts` (parity spec is moot — single
      path); land the determinism spec skeleton (same view twice → identical
      iteration output); close/dismiss the open bisect task on the old spec's
      pre-existing failure.
      → `tests/determinism.spec.ts` landed at full strength (twice-from-scratch
      bit-identity + batch-size variant via targetFps); validated at 5.1 after
      phase 2. The bisect task on the parity spec's failure is moot — no repo
      artifact tracked it; recorded here as closed.

## 4. Phase 2 — 9 layers + Cartesian der

- [x] 4.1 Engine: `LAYER_COUNT` → `RAW_LAYERS = 9` / `DISPLAY_LAYERS = 8`;
      raw A/B creation, per-layer/array views, B→A copy extent, aa_reseed
      binding; display pipelines untouched.
- [x] 4.2 `mandelbrot_brush.wgsl` + `reproject_cs.wgsl`: in-progress store/load
      of raw `(derM.x, derM.y, derS)` in layers 4/5/8 (iter-layer discriminant
      replaces the LOG_DER_ZERO sentinel); escape-time polar conversion is the
      single remaining `der_to_polar` site; escaped format in 4/5 unchanged.
- [x] 4.3 naga + `vue-tsc` + `vite build`; mode specs green.
      → jet/mobius mode+deep+debug and visual zoom/pan specs all green on the
      9-layer Cartesian format (only pre-existing palette-preview failure).

## 5. Validation + close-out

- [x] 5.1 Determinism spec full strength: same deep view twice → bit-identical
      DE layers; batch-size perturbation variant (small vs large batches).
      → both green: FNV-1a hashes of all raw layers (GPU readback through the
      engine device) are IDENTICAL across from-scratch reruns and across
      small-vs-large batch runs at 1e-32. The spec compares raw layers, not
      canvas pixels — the canvas also bakes animated display parameters
      (palette drift), which produced a harmless ~0.3 %/max-5 u8 residual in
      the screenshot-based draft.
- [ ] 5.2 Field round (user GPU): DE stability at 1e-50..1e-70 across repeated
      renders; pan feel; hot-path timing unchanged; record in design.md.
- [x] 5.3 Docs: update the der-state comment blocks; record the A/B-swap and
      derS_lo-layer follow-ups; note the retired parity spec in the change
      history.
      → layer tables updated in mandelbrot_brush.wgsl (9-layer raw format +
      Cartesian carry), reproject_cs.wgsl, resolve.wgsl (finished-only input
      semantics), Engine.ts (RAW_LAYERS/DISPLAY_LAYERS); follow-ups recorded
      in design.md “Close-out”.
