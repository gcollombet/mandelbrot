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

The fused kernel ignores previous coverage on a history-clear or integer
translation frame. The resolve produced later in that same frame is aligned
with the new raw coordinates and becomes readable on the following frame.

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
