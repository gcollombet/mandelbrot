## Context

The current global `orbitTrapStrength` is sent only to the color pass. `color.wgsl` normalizes the terminal escape point by the bailout radius, measures it against one hard-coded union of axes, diagonals, and the unit circle, and mixes a nearby palette color. No trap quantity is accumulated while the orbit is evaluated. The renderer also has progressive continuation, BLA/table skips, frozen/live reprojection, analytic AA reconstruction, optional orbit-metric storage, palette previews, and backward-compatible saved presets; a true minimum therefore cannot be added honestly as a color-only expression.

## Goals / Non-Goals

**Goals:**

- Give the fast terminal effect a recognizable, continuously morphable logarithmic-rosette geometry.
- Separate geometry, band encoding, falloff width/hardness, and final opacity instead of coupling them to one strength slider.
- Add a true closest-approach payload containing distance, hit iteration, and hit angle.
- Keep accuracy semantics visible and deterministic across progressive passes.
- Preserve legacy preset loading and keep the feature off by default.
- Reuse the renderer's live/resolved/frozen lifecycle so the trap does not detach during navigation.

**Non-Goals:**

- Certifying a mathematical lower bound for the trap distance through every approximation block.
- Computing orbit traps for interior pixels after an unbounded number of iterations.
- Supporting arbitrary user-authored signed-distance WGSL in the first version.
- Claiming browser/GPU performance or visual quality from static compilation alone.

## Decisions

### 1. Use one normalized configuration object with a legacy adapter

Introduce an `OrbitTrapConfig` model with versioned defaults and a normalization function. Palette records may contain `orbitTrap`; the old `orbitTrapStrength` remains readable and maps to `orbitTrap.strength` when no new object is present. Runtime code consumes only normalized finite/clamped values.

This avoids proliferating many independent optional props and gives future trap families a stable persistence boundary. Keeping only flat fields was considered, but it would repeat the existing texture-mapping migration problem and make partial preset compatibility harder.

### 2. Stage one is a terminal logarithmic rosette

For the terminal escape value, transform

`q = R(-rotation) * ((z / sqrt(mu) - center) / scale)`

with independent X/Y anisotropy. The signed feature is

`F(q) = log(max(|q|, eps)) - petalDepth * cos(petals * angle(q) + twist * log(max(|q|, eps)) + phase)`.

The trap distance is `abs(F)`. This family degenerates to a circle at zero petal depth, produces closed flowers at zero twist, and produces handed logarithmic spirals with nonzero twist. The mask is a generalized Gaussian `exp(-pow(distance / width, hardness))`; strength is used only for final composition.

A catalog of unrelated primitive shapes was considered, but a single morphable family provides a stronger renderer identity with fewer controls and branches.

### 3. Encode color from independent distance, hit-iteration, and hit-angle phases

The trap phase is a weighted sum of logarithmic distance bands, normalized hit iteration, and hit angle, plus a phase offset. Stage one supplies its terminal iteration and terminal angle; stage two replaces those inputs with the closest-hit payload. Weights are normalized only for numerical stability, not forced to sum to one, so zero weights can intentionally select a constant accent.

### 4. Stage two adds a dedicated progressive trap payload

When orbit mode is active, orbit evaluation carries a running best tuple `(distance, hitIteration, hitAngle)`. Continuation texels store this state, terminal texels retain it, resolve transports it into a dedicated display texture, and frozen/live merge transports it alongside the source geometry. A dedicated payload is preferred over overloading terminal `z`, derivative, or orbit-metric carriers, because those have distinct readiness and approximation semantics.

The payload is allocated only when orbit mode is active. A mode flip therefore follows the existing orbit-gradient rule: recreate dependent textures/pipelines and clear history before drawing.

### 5. Accuracy is a named policy, not an implicit approximation

- `terminal`: evaluates only the terminal escape point in the color pass.
- `sampled`: updates the closest approach at every explicitly evaluated step and at a skipped block's landing point. It keeps acceleration but is not invariant under approximation mode.
- `exact`: while trap accumulation is active, approximation skips that do not provide a conservative trap-distance bound are unfolded into exact orbit steps.

The first true-orbit implementation may ship `sampled` before `exact`, but the UI and persisted schema must not label sampled results exact. Exact mode must not silently fall back to sampled mode.

### 6. Orbit start and end gates avoid trivial and unbounded captures

The accumulator ignores iterations before `startIteration` (default 2, avoiding the universal `z0 = 0` hit) and stops updating after `endIteration`; zero end means the current render budget. Escaped pixels keep their best value. Budget-exhausted interior candidates are colored only if an explicit `includeInterior` flag is enabled.

### 7. AA follows the source data's honesty boundary

Terminal mode uses the sample's reconstructed terminal `z` in analytic AA, matching other terminal color effects. Orbit mode uses the center pixel's accumulated closest-hit payload; analytic Taylor data cannot reconstruct an earlier per-subsample minimum without re-iteration. Adaptive AA may still average independently evaluated samples, but the UI and tests must not imply that the accumulated hit is analytically reconstructed.

## Risks / Trade-offs

- **[Exact mode can erase much of BLA/Auto speedup]** → Keep it explicit, measure separately, and retain sampled mode for interactive exploration.
- **[Sampled mode can change when the approximation path changes]** → Name the policy in UI/presets and never present it as exact.
- **[Extra payload increases raw, resolved, and frozen memory/bandwidth]** → Allocate it only for orbit mode and pack the three scalar values into one display texture where feasible.
- **[Strong high-frequency bands can alias]** → Clamp unsafe denominators, feed the existing contrast-driven adaptive AA, and keep band frequency independently controllable.
- **[Legacy strength previously widened the mask]** → Preserve only activation compatibility, document the new fixed default width, and do not pretend old visual output is bit-identical.
- **[A trap center far from the normalized terminal domain can appear blank]** → Supply bounded UI ranges plus import-safe normalization, while retaining a reset preset.

## Migration Plan

1. Add the normalized config and terminal mode with legacy strength migration.
2. Add UI/preset plumbing and verify static shader/TypeScript builds.
3. Add orbit payload allocation and sampled accumulation through progressive, resolve, merge, and frozen paths.
4. Add exact policy by disabling or unfolding uncertified skips while it is active.
5. Keep default mode off; rollback consists of disabling the config or reverting the new conditional paths without migrating stored presets.

## Open Questions

- Real-browser GPU cost and visual defaults require an explicit browser validation pass after static checks.
- A future block certificate could retain more acceleration in exact mode by bounding the rosette distance over a BLA image disk; this is outside the initial implementation.

