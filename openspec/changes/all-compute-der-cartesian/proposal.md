# Proposal — all-compute-der-cartesian

## Why

Distance estimation is non-deterministic run-to-run at deep zoom: the
derivative direction+scale is re-encoded to polar (atan2/log) at every
progressive-pass boundary and re-decoded (cos/sin) at reload — 3–4
transcendental roundings per pass — while pass boundaries follow the
GPU-timing-adaptive batch size, so the NUMBER and placement of those roundings
varies per run. The fix (store the der state raw in Cartesian, 3 slots instead
of 2) is blocked by the raw state textures' MRT-8 wall
(`maxColorAttachmentBytesPerSample = 32`), which only exists because two
fragment passes (`mandelbrot.wgsl` iteration for pan/clear frames,
`reproject.wgsl` pan-shift/sentinel brush) still write the raw state via MRT.
Porting those two to compute (`textureStore`, no per-sample limit) removes the
wall, deletes ~1400 lines of duplicated iteration math (the fragment/compute
twin that every mode change — most recently mobius — must edit twice), and
makes the failing fragment-vs-compute parity spec moot.

## What Changes

- **Phase 1 — all-compute render path.** New `reproject_cs` compute pass
  (ping-pong A→B) porting `reproject.wgsl`'s pan shift + sentinel
  stamp/refinement + clear + budget-exhausted conversion; pan and clear frames
  route through `[reproject_cs → copy B→A → in-place]`; **BREAKING (internal)**:
  `mandelbrot.wgsl`, `reproject.wgsl`, `pipelineMandelbrot`, `pipelineBrush` and
  their bind groups are deleted — the in-place compute becomes the only
  production iteration path (`mandelbrot_debug.wgsl` stays as a tool).
- **Phase 2 — Cartesian der state, 9th raw layer.** Raw state textures A/B grow
  to 9 layers (display-side textures stay at 8); in-progress pixels store
  `(derM.x, derM.y, derS)` raw in layers 4/5/8 — polar conversion happens
  exactly once, at escape; escaped-pixel format (height, angle in 4/5) and all
  display-side passes (resolve/color/merge) are untouched.
- The Playwright fragment-vs-compute parity spec (`inplace-compute.spec.ts`,
  failing since before the mobius change) is replaced by a determinism spec:
  same view rendered twice → bit-identical DE layers.

## Capabilities

### New Capabilities
- `all-compute-render-path`: the single-path compute rendering architecture —
  the compute utility pass (pan/clear/sentinels), frame routing, and the
  removal of the fragment iteration twin.
- `cartesian-der-state`: the raw 9-layer der continuation format — lossless
  (transcendental-free) pass-boundary carry-over, single polar conversion at
  escape, run-to-run deterministic DE.

### Modified Capabilities
<!-- none at spec level: modes, tables, coloring and display formats keep their
     requirements; this changes where/how state is carried, not what is computed -->

## Impact

- `src/assets/reproject.wgsl` → replaced by a compute port (new file);
  `src/assets/mandelbrot.wgsl` → deleted; `src/assets/mandelbrot_brush.wgsl`
  gains the Cartesian der load/store; display shaders untouched.
- `src/Engine.ts`: frame routing (`useInplacePath` unconditional), pipeline and
  bind-group removal, `LAYER_COUNT` split (RAW=9 / DISPLAY=8) across texture
  creation and views, reproject_cs dispatch.
- Tests: `tests/inplace-compute.spec.ts` retired (moots the open bisect task on
  its pre-existing failure); new determinism spec; pan/clear/zoom Playwright
  coverage.
- Depends on nothing; `compensate-ders` is complementary (intra-pass precision)
  and can land before or after.
