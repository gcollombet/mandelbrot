## Context

The expensive Mandelbrot pass renders a square neutral field aligned with the
complex plane. Screen rotation is intentionally deferred to the color pass so
the neutral field can be reused while the user rotates the view. The current
settled non-AA path reconstructs that field with discrete texel reads. At an
oblique angle, the neutral lattice is therefore visible as stair-stepped
macroblocks.

Interpolating the raw field is not a general solution: its channels contain a
mixture of continuous quantities, classifications, counters, orbit-trap state,
and optional analytic payloads. A component-wise bilinear interpolation can
create a field state that no Mandelbrot sample ever produced.

The renderer already has two terminal color paths: direct presentation and AA
accumulation followed by presentation. The rotation resolve must remain a
third, exclusive terminal path rather than becoming an input to AA.

## Goals / Non-Goals

**Goals:**

- Hide the neutral-grid stair steps in a settled, rotated, non-AA view.
- Filter only fully evaluated final color, never semantic Mandelbrot fields.
- Preserve the current direct path while the view or field is changing.
- Keep AA sampling mathematically independent from the filtered rotation
  cache.
- Make stale or incomplete cache contents impossible to present.

**Non-Goals:**

- Replace temporal AA or change its sample sequence.
- Define interpolation rules for iteration metadata or analytic payloads.
- Recompute Mandelbrot color four times per screen pixel.
- Filter axis-aligned views, where the neutral and screen lattices already
  coincide.
- Prove browser/GPU visual quality without a manual WebGPU comparison.

## Decisions

### Cache final linear color in neutral space

The existing color shader gains a neutral-cache vertex/fragment entry point.
For every neutral cache texel it derives the corresponding screen coordinate,
then calls the existing color/material function once. The result is converted
from its current sRGB-domain output to linear RGB and stored in an
`rgba16float` render target.

This preserves one authoritative color implementation. It also ensures the
new pass never interpolates raw iteration, distance, orbit-trap, or Taylor
fields.

### Filter only in the terminal presentation pass

A dedicated presentation shader maps each screen pixel back into neutral
coordinates and samples the linear cache with a filtering sampler. It converts
the filtered result to sRGB and applies the same final display dither as the
other terminal paths.

The cache alpha is a validity/coverage weight. Cache pixels whose corresponding
screen coordinate lies outside the canvas are discarded after an alpha-zero
clear. The presenter divides sampled RGB by sampled alpha near that boundary,
preventing the cleared exterior from darkening the canvas edge.

### Resolve only after the field settles

The cache is eligible only when all of the following hold:

- the angle is not aligned to a multiple of 90 degrees;
- no AA accumulation is active and no completed AA result is displayed;
- the renderer is not clearing, merging, zooming, animating, exporting video,
  or showing a diagnostic field;
- the raw field has no unfinished work and the completion counter is newer
  than the last raw-field mutation;
- all cache resources exist.

During interaction or convergence, the existing direct color pass remains on
screen. Once eligible, the renderer bakes the cache and may present it in the
same command encoder. A pending resolve keeps the render loop alive only while
the branch can eventually become eligible.

### Treat the cache as derived, versioned state

Any Mandelbrot, material/color, viewport, rotation, or raw-field mutation
invalidates cache readiness. A cache is marked ready only after its full render
pass has been encoded. Resize recreates the texture and its bind group.

Readiness is deliberately boolean rather than progressively visible: the
cache pass is a single full-screen render and an incomplete or old cache must
never be sampled.

### Keep AA and rotation resolve mutually exclusive

If AA is accumulating, the color shader samples the raw field exactly as it
does today and writes the AA accumulator. If an AA accumulator already has
samples, its presenter remains authoritative. Triggering AA invalidates and
suppresses rotation resolve; the filtered cache is never used as AA sample
zero and never fed back into accumulation.

This avoids double filtering and preserves the intended subpixel AA estimator.

## Risks / Trade-offs

- **Extra memory:** an `rgba16float` square texture at neutral-field size adds
  roughly eight bytes per texel. This is accepted because it is allocated once
  with the viewport and avoids additional Mandelbrot evaluation.
- **One settled-frame cost:** the first eligible frame renders color across the
  neutral square, including some texels outside the screen footprint. The pass
  is deferred until the view settles and reused thereafter.
- **Transient direct-to-filtered change:** the view can become slightly softer
  one frame after settling. Keeping the direct path during motion is preferred
  to repeatedly rebuilding the cache.
- **Edge coverage:** bilinear sampling can mix valid and discarded cache
  texels. Alpha-normalized reconstruction handles this explicitly.
- **Resource support:** `rgba16float` filtering is a WebGPU core capability for
  this use, but final compatibility and appearance still require real-browser
  validation.

## Migration Plan

1. Add the cache and presentation shader entry points and validate them with
   the repository WGSL validator.
2. Add texture, sampler, uniform, bind-group, and pipeline lifecycle code.
3. Add eligibility/invalidation state and integrate the exclusive branch into
   the terminal color selection.
4. Add focused unit/contract tests, then run TypeScript, unit, shader, and
   OpenSpec validation.
5. Leave the existing direct and AA paths intact as fallbacks. Removing the
   new branch restores previous behavior without data migration.

## Open Questions

- A later visual A/B test may justify tuning the alignment epsilon or offering
  a sharper reconstruction filter. This change intentionally starts with
  bilinear filtering because it is cheap, monotone, and free of ringing.
