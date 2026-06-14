# Idle-time anti-aliasing (R2 + tent jitter, gamma-correct accumulation)

## Context

Inspired by the "Anti-Aliasing a fractal" notebook (R2 low-discrepancy sequence,
tent-filter importance sampling, gamma-correct linear-space averaging), we want
the Mandelbrot renderer to progressively sharpen once it's fully converged and
the user stops interacting: accumulate `antialiasLevel` extra full renders, each
sampled at a tiny sub-pixel jitter offset, average them in linear RGB, and
display the gamma-corrected result. Any navigation/parameter change must
instantly drop back to a plain single-sample render.

The `antialiasLevel` field already exists end-to-end (TS types, both WGSL
`Mandelbrot` uniform structs) but is currently unused — this plan wires it up.

Key existing facts that shape the design:
- `mandelbrot.cx/cy` in WGSL == TS `mandelbrot.dx/dy`: the float32 pan offset
  relative to the arbitrary-precision center. Used in `x0 = local_rot.x*scale + cx`
  (mandelbrot.wgsl:612-613, mandelbrot_brush.wgsl:646-647). **Must not be mutated**
  for jitter — they feed reprojection delta-tracking (Engine.ts:1756-1757, 2046-2047).
- The reference orbit / BLA table is anchored at the high-precision center and is
  unaffected by sub-pixel jitter — no recompute needed per AA sample.
- `clearHistoryNextFrame = true` is the existing "start a fresh convergence cycle"
  mechanism (full sentinel reset + cumulative-shift zeroing, Engine.ts:2036-2070).
- `update()` already detects navigation/param changes via `mandelbrotChanged` /
  `renderOptionsChanged` (Engine.ts:1660-1667) — this is the abort hook.
- Color pass currently renders `color.wgsl` directly to the swapchain
  (`this.format`, Engine.ts:1116-1122, 2379-2393), no intermediate texture.

## Design

### 0. Activation : explicite uniquement

L'accumulation AA ne démarre **jamais automatiquement**. Elle est déclenchée par :
- une méthode publique `Engine.triggerAaAccumulation()` (appelée par un bouton UI ou
  un raccourci clavier), qui pose `this.aaActive = true` et réinitialise les compteurs.

En navigation ou changement de paramètre (`mandelbrotChanged || renderOptionsChanged`),
`aaActive` est remis à `false` et les compteurs à zéro : l'utilisateur doit re-déclencher.

`antialiasLevel` reste le nombre maximum d'échantillons à accumuler (exposé via UI slider).

### 1. Jitter uniform fields (both WGSL shaders + TS)

In `src/assets/mandelbrot.wgsl` and `src/assets/mandelbrot_brush.wgsl`, replace
`_padding1`/`_padding2` in `struct Mandelbrot` with:
```wgsl
aaOffsetX: f32,   // sub-pixel AA jitter, neutral-space units (0 = off)
aaOffsetY: f32,
```
Update `x0`/`y0` in both files:
```wgsl
let x0 = (local_rot.x + mandelbrot.aaOffsetX) * mandelbrot.scale + mandelbrot.cx;
let y0 = (local_rot.y + mandelbrot.aaOffsetY) * mandelbrot.scale + mandelbrot.cy;
```
In `Engine.ts` (~1955-1976), set indices 17-18 (currently `0, 0`) to
`this.aaOffsetX, this.aaOffsetY`.

### 2. R2 + tent jitter helper (`src/Mandelbrot.ts`)

New pure export:
```ts
export function computeAaJitterOffset(sampleIndex: number): { x: number, y: number }
```
- `phi = 1.22074408460575947536` (real root of x³ = x+1), `phi1 = 1/phi`, `phi2 = 1/phi²`.
- `r2x = (sampleIndex * phi1) % 1`, `r2y = (sampleIndex * phi2) % 1`.
- `tent(u)`: `x2 = 2u-1; return x2 == 0 ? 0 : x2/sqrt(abs(x2)) - sign(x2)` → range ~[-1,1].
- Return `{ x: tent(r2x), y: tent(r2y) }`.

In `Engine.render()`, when advancing to sample `n` (n >= 1):
```ts
const j = computeAaJitterOffset(n)
const neutralExtent = Math.sqrt(aspect*aspect + 1.0)
this.aaOffsetX = j.x * neutralExtent / this.neutralSize
this.aaOffsetY = j.y * neutralExtent / this.neutralSize
```
(±1 texel max jitter, consistent with the existing `local_rot = xy_neutral * neutralExtent` mapping over `neutralSize` texels). Sample 0 always uses `aaOffsetX = aaOffsetY = 0`.

### 3. Accumulation texture + present pass

New state in `Engine.ts`: `accumTexture`/`accumTextureView` — `rgba16float`,
`width × height`, single layer, `RENDER_ATTACHMENT | TEXTURE_BINDING`. Allocate/destroy
in `resize()` alongside other textures; reset AA counters there too.

New `src/assets/present.wgsl`:
- Uniform `{ sampleCount: f32, _pad: vec3<f32> }`.
- `vs_main`: copy the standard full-screen-triangle vertex shader.
- `fs_main`: `textureLoad(accumTex, texelCoord, 0)`, divide `.rgb` by `max(sampleCount, 1.0)`,
  apply `linear_to_sRGB`, output `vec4(srgb, 1.0)`.

New pipeline `pipelinePresent` (target format `this.format`) + `bindGroupPresent`
(binds `accumTextureView` + a small uniform buffer `uniformBufferPresent`).

### 4. `color.wgsl` changes

- Add `srgb_to_linear(c: vec3<f32>) -> vec3<f32>` and `linear_to_sRGB` helpers
  (port directly from the notebook's formulas).
- Convert the ~6 `return vec4<f32>(X.rgb, 1.0)` sites (~lines 1412-1482) to
  `return vec4<f32>(srgb_to_linear(X.rgb), 1.0)`.
- Add a second entry point `fs_main_direct` = current unmodified logic (no linear
  conversion), for the snapshot/PNG export path so export quality/format is untouched.

### 5. Pipeline/pass changes in `Engine.ts`

- `pipelineColor` (~1116-1122): target format becomes `'rgba16float'` (renders into
  `accumTexture`, not swapchain), entry point `fs_main`.
- New `pipelineColorAccum`: same module/layout/entry point, target `'rgba16float'`
  with additive blend (`srcFactor: 'one', dstFactor: 'one', operation: 'add'` for
  color and alpha). Shares `bindGroupColor`/`bindGroupColorRaw` (same layout).
- New `pipelineColorSnapshot`: entry point `fs_main_direct`, target `this.format` —
  used only by the existing snapshot/export pass (~2420-2495), replacing
  `pipelineColor` there so export is unaffected by the linear roundtrip.
- Pass 3 (color, ~2379-2393): render target becomes `accumTextureView`.
  - `aaAccumulatedSamples === 0` → `loadOp: 'clear'`, pipeline `pipelineColor`.
  - `aaAccumulatedSamples >= 1` → `loadOp: 'load'`, pipeline `pipelineColorAccum`.
- New Pass 4 (present, every frame): write `uniformBufferPresent.sampleCount =
  max(this.aaAccumulatedSamples, 1)`, render `pipelinePresent`/`bindGroupPresent`
  to `swapView`, `loadOp: 'clear'`.

When `antialiasLevel <= 1`, `aaAccumulatedSamples` stays 0 forever → pass 3 always
clears+replaces, pass 4 always divides by 1 → pixel-identical to today (modulo the
sRGB→linear→sRGB roundtrip through `rgba16float`, which should be visually lossless
but worth checking against Playwright baselines).

### 6. AA state machine (`Engine.ts`)

New fields: `aaActive = false`, `aaSampleIndex = 0`, `aaAccumulatedSamples = 0`,
`aaOffsetX = 0`, `aaOffsetY = 0`.

New public method:
```ts
triggerAaAccumulation() {
    this.aaActive = true
    this.aaSampleIndex = 0
    this.aaAccumulatedSamples = 0
    this.aaOffsetX = 0
    this.aaOffsetY = 0
    this.needRender = true
}
```

In `render()`, define:
```ts
const fullyConverged =
    !this.clearHistoryNextFrame && !this.needFreezeSnapshot && !this.needMergeSnapshot
    && !isZoomActive(this.zoomState) && !this.orbitIncomplete
    && this.unfinishedPixelCount === 0 && this.activePixelCount === 0
    && !this.hasPendingCounterReadbackForCurrentGeneration()
```
After issuing pass 3/4 for this frame:
```ts
if (this.aaActive && fullyConverged
    && this.aaAccumulatedSamples < renderOptions.antialiasLevel) {
    this.aaAccumulatedSamples++
    if (this.aaAccumulatedSamples < renderOptions.antialiasLevel) {
        this.aaSampleIndex++
        const j = computeAaJitterOffset(this.aaSampleIndex)
        this.aaOffsetX = j.x * neutralExtent / this.neutralSize
        this.aaOffsetY = j.y * neutralExtent / this.neutralSize
        this.clearHistoryNextFrame = true
        this.needRender = true
    } else {
        this.aaActive = false  // accumulation complete, go idle
    }
}
// If aaActive but not yet fullyConverged: just keep computing normally (no action needed)
```

`needsMoreFrames()` (~2531-2546): add a trailing condition —
`this.aaActive` → `reason = 'aaAccumulating'`.
This keeps the RAF loop alive while the jitter cycles re-converge.

### 7. Abort on navigation/param change (`update()`)

Right after computing `mandelbrotChanged`/`renderOptionsChanged` (~1667):
```ts
if (mandelbrotChanged || renderOptionsChanged) {
    this.aaActive = false
    this.aaSampleIndex = 0
    this.aaAccumulatedSamples = 0
    this.aaOffsetX = 0
    this.aaOffsetY = 0
}
```
Covers all navigation/palette/material/animation changes. Next `render()` sees
`aaActive === false` → clear+replace + divide-by-1 → instant fallback to single-sample.
User must re-click the AA button to restart accumulation.

### 8. UI exposure (`src/components/Settings.vue`)

`antialiasLevel` currently has no visible control (only a default of `1` threaded
through props). Add:
- A slider/stepper for `antialiasLevel` (range 1–16, default 1) — labels it as
  "samples to accumulate when rendering in high quality".
- A **"Render AA"** button (or keyboard shortcut) that calls `engine.triggerAaAccumulation()`.
  Grey-out the button while `aaActive && aaAccumulatedSamples < antialiasLevel`
  (accumulation in progress); show "AA: N/M" progress text.
- Engine should expose a readable `aaProgress: { active: boolean, done: number, total: number }`
  getter (or reactive ref passed up through `MandelbrotViewer`) for the UI to display progress.

## Files touched

- `src/assets/mandelbrot.wgsl` — uniform fields + x0/y0
- `src/assets/mandelbrot_brush.wgsl` — uniform fields + x0/y0
- `src/assets/color.wgsl` — srgb_to_linear/linear_to_sRGB helpers, convert return sites, `fs_main_direct`
- `src/assets/present.wgsl` — new file
- `src/Mandelbrot.ts` — `computeAaJitterOffset` helper
- `src/Engine.ts` — uniform writes, new texture/pipelines/bind groups, pass 3/4 rewrite, state machine, `needsMoreFrames`, `update()` abort hook, snapshot pipeline swap
- `src/components/Settings.vue` — expose `antialiasLevel` control

## Verification

1. `npm run dev`, open in a WebGPU browser (Chrome/Edge).
2. `antialiasLevel = 1`: confirm output is visually unchanged from current `main`
   (screenshot diff) — validates the new present-pass plumbing is a no-op.
3. `antialiasLevel = 8`: navigate to a detailed view, let it converge, stop
   interacting — image should keep subtly sharpening over ~8 more convergence
   cycles, then settle.
4. While accumulating, pan/zoom — image must **instantly** revert to single-sample
   (no stale blended frame visible) and resume normal progressive convergence.
5. PNG snapshot export still produces correct output (uses `fs_main_direct` path).
6. `npx playwright test` — check whether visual regression baselines need
   regenerating due to the `rgba16float` linear roundtrip at `antialiasLevel = 1`.
7. `cargo test --manifest-path reference_calculus/Cargo.toml` — sanity (no Rust
   changes expected, but confirms nothing else broke).

## Open risks

- `rgba16float` additive blending support — should be universally supported by
  WebGPU but verify on first run.
- Each AA sample triggers `clearHistoryNextFrame`, which also re-triggers the
  freeze/merge-snapshot copy (Engine.ts ~1985-1990, ~2215-2231) — extra GPU copies
  per AA cycle, acceptable since this only happens at idle.
- Playwright visual baselines may need regenerating due to the sRGB↔linear
  roundtrip through an intermediate `rgba16float` texture even at `antialiasLevel = 1`.
