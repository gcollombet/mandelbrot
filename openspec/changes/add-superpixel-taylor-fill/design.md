# Design — opportunistic Taylor superpixels

## Objective

Use the Taylor payload of completed integer-grid anchors wherever the existing
numerical gate accepts it, without freezing the whole grid and without adding a
second refinement machine.

The display priority is:

```text
computed raw pixel > terminal Taylor approximation > temporary bilinear fill
```

Taylor is value-only. Distance height, derivative angle and orbit averages keep
the spatial resolve. No palette-derived visibility estimate is introduced.

## Frame pipeline

The existing resolved step channel is also the coverage handshake:

```text
frame n
  fused brush + iteration
    reads resolved[n-1].step
    exact request (-1)              -> compute
    sentinel with Taylor marker     -> keep, do not count
    other sentinel                  -> ordinary dyadic refinement

  ordinary resolve
    exact/computed raw texel        -> pass through
    sentinel with valid Taylor      -> Taylor value, step + 0.5
    other sentinel                  -> bilinear value, integer step
```

The half-step marker stays positive, so colour, frozen reprojection and
min-step compositing continue to see valid display data. It is not copied into
raw state and cannot overwrite a computed pixel.

The one-frame delay is intentional: anchors completed in frame `n` cover
sentinels in that frame's resolve, and the fused kernel skips those sentinels in
frame `n+1`. No CPU readback participates in this decision.

## Candidate choice and gate

For each resolved cell, all escaped corner candidates are tested. The retained
model is:

```text
ẑ(δc) = z + z′δc + ½z″δc²
```

The current runtime payload has no `z‴` remainder certificate. The implemented
gate therefore remains the conservative value proxy already used by the
prototype:

```text
|½z″δc²| <= tol |z|
```

plus finite-payload and same-escape-branch checks. Among accepted anchors, the
smallest normalized ratio
`|½z″δc²|² / (tol² |z|²)` wins. Predictions are never blended.

This gate is independent of the palette and is not presented as a proof of
visual indistinguishability.

Deep normalized payloads must not be rejected through `dot(m2, m2) > 0`:
squaring a small but representable `m2` can underflow to zero before either
component does. Payload presence is tested component-wise, while magnitude and
log-magnitude diagnostics use a max-component rescaling before the dot product.
A genuinely zero or non-finite `m2` remains unusable.

`z″` is not kept on the derivative's `2·S` scale while a pixel is in flight.
That shared scale can saturate even when both derivatives are finite, causing
the reach view to report an out-of-range payload before the Taylor gate is
evaluated. The in-flight state therefore uses an independently normalized
complex mantissa and logarithmic scale:

```text
z′ = m1·exp(S1)
z″ = m2·exp(S2)
```

At an exact iteration or Unified block jump, the terms contributing to `z″`
are added after shifting them to their largest logarithmic scale. Positive
exponents never materialize; terms that underflow after the shift are already
negligible relative to the retained term.

The raw texture allocation remains 13 layers. Its logical payload depends on
pixel state:

```text
in progress: 8 = S1, 9/10 = m2.x/y, 11 = S2, 12 = z″-valid bit
escaped:     8 = S1, 9/10 = m1.x/y, 11 = ln|z″|, 12 = arg(z″)
```

The escaped polar-log pair is not bit packing. It is the representation the
resolve and AA gates consume directly: `ln|z″·δc²| = ln|z″| + 2ln|δc|` and
`arg(z″·δc²) = arg(z″) + 2arg(δc)`. No extra texture layer or binding is added.
Legacy renormalization and gate jumps currently expose only their first
derivative. If either jump is applied, the in-progress validity bit is cleared
and the escaped anchor publishes the invalid-payload marker instead of a stale
Taylor certificate. Exact steps and Unified blocks preserve the bit.

## Refinement and completion

There is no Taylor-specific refinement pass. An uncovered sentinel continues
through `refine_sentinel`; a covered sentinel stays negative in raw layer 0 but
is excluded from both unfinished and active counters.

Consequently the ordinary inactivity rule works unchanged once all remaining
sentinels are covered. Resolve must nevertheless remain enabled in the
opportunistic mode because raw still contains those sentinels.

AA accumulation remains disabled in this experimental mode: terminal Taylor
coverage is an approximate final value, not an exact per-pixel orbit.

## Invalidation

The fused kernel ignores previous coverage on a history-clear frame. On an
integer translation frame, raw reprojection gathers from
`coord_out - round(shiftTex)`, so the coverage lookup gathers the previous
resolved marker from that exact same source coordinate. An out-of-bounds source
has no previous coverage and follows ordinary computation or dyadic refinement.
The resolve produced later in the frame writes markers aligned with the output
coordinates for the next frame.

Changing the opportunistic toggle invalidates progressive history. The disabled
mode therefore returns to exact step-1 convergence.

## Coverage debug view

Debug view 7 reads the step marker from the live/frozen resolved source selected
by the ordinary color compositor:

```text
step <= 0                    -> black   (no resolved data)
integer step <= 1            -> green   (computed pixel)
fractional half-step marker  -> magenta (terminal Taylor value)
other positive integer step  -> orange  (temporary bilinear fill)
```

This is an origin map, not a quality estimate. It deliberately bypasses palette
shading and does not classify the screen-space bilinear magnification filter as
a new source. Unlike debug views 1–5, it keeps the ordinary progressive loop
running; unlike reach view 6, it always binds the resolved texture because the
half-step marker does not exist in raw state.

## Reach units and rejection debug view

The reach heatmap and production resolve use the same complex distance per raw
texel:

```text
pixelC = scale · 2·neutralExtent/neutralSize
neutralExtent = sqrt(aspect² + 1)
```

The raw texture is the square neutral texture, so dividing only by its height
without `neutralExtent` overstates the displayed reach on non-square canvases.

Debug view 8 reads the same resolved live/frozen source as the coverage view
and classifies failed Taylor attempts as payload, radius, branch, sparse fine
cell, inside-dominant, or no escaped anchor. The resolve stores the reason in
the derivative-angle channel by adding an integer multiple of `16π`. All normal
consumers use that angle periodically (`sin`, `cos`, or `fract(angle/2π)`), so
the tag is display-neutral and does not alter the resolved step or its
live/frozen priority. Successful Taylor coverage keeps the half-step marker and
is shown separately.

## Removed architecture

The following diagnostic-freeze machinery is removed:

- `taylorFreezeStep` and the global `minBrushStep` override;
- failed-cell bitset and active-count snapshot;
- `taylor_refine.wgsl` and its dispatch/timestamp slot;
- `taylorFeedbackPending`, tagged readbacks and tail-frame wakeups.

This eliminates the serialized “Auto × number of Taylor refinements” behaviour.

## Deferred

- randomized or off-grid anchor placement;
- certified `z‴` remainder radius;
- palette/perceptual error estimation;
- analytic continuation of distance and orbit-average channels.
