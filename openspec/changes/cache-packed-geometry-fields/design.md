## Context

The resolved and frozen display state currently uses eight `r32float` attachments:

```text
0 iter          4 distance height
1 step          5 derivative angle
2 z.x           6 ref_i + stripe phase
3 z.y           7 encoded average orbit direction (coherence = length)
```

This consumes eight color attachments and 32 bytes per sample, exactly the portable WebGPU MRT limits. The color pass then rereads neighboring distance-height values to reconstruct the base normal and curvature on every shading frame, even when only palette or material parameters changed. The integer part of layer 6 is not consumed by color, while `z.xy` remains valuable for smooth escape, orbit traps, and escape-coordinate texture mappings.

The orbit pipeline can produce `z`, `z′`, and, on compatible paths, `z″`. For distance height

```text
H = -log(Dscreen)
Dscreen = |z| log|z| / (2 |z′| scale)
```

the fixed-escape-branch analytic derivative is

```text
A = z″/z′ - (1 + 1/log|z|) z′/z
∇c H = (Re(A), -Im(A)).
```

The gradient must then be transformed into the source neutral-texel axes. A higher bailout improves the distance-estimator regime but does not remove discontinuities where the discrete escape iteration changes.

This change is intended to follow `simplify-progressive-renderer`. Super Pixel's half-step and rejection encodings are therefore not carried into the new metadata format.

## Goals / Non-Goals

**Goals:**

- Cache field-invariant analytic distance gradient and analytic scalar Laplacian before colorization.
- Keep `z.xy` available to existing orbit and texture effects.
- Replace derivative-angle orientation with distance-geometry orientation.
- Reduce the logical resolved/frozen display state to five attachments and 24 bytes per texel.
- Preserve live/frozen min-step quality selection with compact provenance.
- Keep stripe phase and direction coherence with bounded quantization.
- Never expose `z″` or a geometry-validity channel to `color`.
- Normalize height, gradient, and curvature coherently across zoom reprojection and merge.

**Non-Goals:**

- Ray marching, a 3D camera, or height-field intersection.
- Caching palette-, light-, material-, texture-, stripe-, or coherence-derived final normals.
- Removing orbit traps or escape-coordinate texture mapping.
- Treating the analytic formula as a certificate across escape-branch transitions.
- Using f16 arithmetic; `rgba16float` is storage with f32 shader calculations.
- Preserving Super Pixel terminal-fill provenance.

## Decisions

### Five-attachment logical display contract

Resolved and frozen display state is split by format:

```text
attachment  format        content
0           r32float      iteration / terminal state
1           r32float      z.x
2           r32float      z.y
3           rgba16float   gradient.x, gradient.y, curvature, distanceHeight
4           r32uint       packed provenance, stripe phase, coherence
```

The three scalar float attachments may be views into a three-layer `r32float` array. Geometry and metadata are separate textures because their formats and sampling types differ. The logical footprint is `3*4 + 8 + 4 = 24` bytes per texel.

All arithmetic producing or consuming geometry remains f32. Conversion to/from `rgba16float` occurs at the texture boundary.

**Alternatives considered:**

- Replace `z.xy` with fractional smooth iteration. This saves one attachment but removes orbit traps and Cartesian escape mappings; rejected.
- Add geometry beside the eight current MRTs. This exceeds portable attachment limits; rejected.
- Store geometry as `rgba32float`. It preserves precision but yields no bandwidth reduction and exceeds the current bytes-per-sample limit when combined with retained fields; rejected as the default, retained only as a validation oracle.

### Analytic geometry is produced once at terminal escape

The iteration kernel keeps `z″` valid from the first exact step onward. Exact perturbation and the BLA, Padé, Jet, Möbius and Unified block maps propagate it with the second-order chain rule

```text
z″new = m_z z″ + m_zz (z′)² + 2 m_zc z′ + m_cc.
```

Renormalized moves propagate the corresponding `H′` and `H″` terms. A move whose model omits the parameter derivative needed by this rule is not accepted; the pixel continues with exact iteration. In particular, the current parabolic gate is disabled until its complete `c` derivatives exist. There is no spatial-gradient fallback and no geometry-validity channel.

At escape, the kernel evaluates the fixed-branch gradient, transforms it into source neutral-texel units and stores it in otherwise dead terminal raw slots. `z″` remains available in raw layers 8..12 for analytic AA, but resolve no longer reads it to build display geometry.

### Curvature is the analytic scalar Laplacian

Although a full Hessian would require higher derivatives, the trace needed by the current AO simplifies because `log|z′|` and `log|z|` are harmonic away from zeros. For one fixed escape branch,

```text
H = log|z′| - log|z| - log(log|z|) + constant
Delta_c H = |z′/z|² / (log|z|)²
kappa_texel = delta² |z′/z|² / (log|z|)²
```

where `delta` is the complex-plane span of one source neutral texel. The kernel evaluates this non-negative scalar in f32 at escape and stores it with the gradient. This needs `z` and `z′`, not `z‴`, and removes the full-screen geometry-finalization pass and all resolved-height neighbour reads.

The analytic Laplacian is the branch-local differential quantity, not the signed five-point response at escape-iteration discontinuities. AO scaling/sign is therefore a visual compatibility concern to validate, not a reason to reintroduce a spatial fallback.

### Terminal raw layout

The 13-layer continuation layout is unchanged, but terminal texels reuse dead or superseded slots:

```text
0 iter        1 gradient.x     2 z.x          3 z.y
4 height      5 gradient.y     6 stripe/coherence bits
7 laplacian   8..12 z′/z″ analytic-AA payload
```

Layer 6 stores the 14-bit stripe and 14-bit coherence fields as a `u32` bit pattern below bit 28, bitcast through `r32float`; resolve adds the four provenance bits. In-progress texels retain the existing reference index, derivative and deep-exponent meanings, selected by terminal state.

### Geometry is stored in source texel units

Height is stored in the source display-scale convention. Gradient and curvature are stored per source neutral texel to keep magnitudes usable in `rgba16float` at deep zoom.

For a uniform source-to-current coordinate ratio `r`:

```text
Hcurrent       = Hsource + log-scale correction
gradCurrent    = rotateIfNeeded(gradSource) * r
curvCurrent    = curvSource * r²
```

Merge writes all four channels normalized into the merge destination's units. If reprojection permits a rotation delta, the gradient uses the corresponding inverse-transpose/Jacobian; otherwise a rotation change invalidates the cache.

### Compact metadata word

The final `r32uint` layout is:

```text
bits  0..3   log2(resolution support step)
bits  4..17  stripe phase quantized to 14 unsigned bits
bits 18..31  direction coherence quantized to 14 unsigned bits
```

`iter < 0` denotes no display data, so no metadata-valid bit is required. Provenance exponent 0 means exact step 1; positive values represent temporary dyadic bilinear support. Four bits cover steps through 32768. Live/frozen comparison reconstructs an effective float support step and applies the current source-scale ratio before the existing smallest-step-wins rule.

The integer reference index is not included because downstream display consumers use only the fractional stripe phase. Reference-resume state remains in the raw orbit representation.

Stripe phase is decoded on the circle and circularly interpolated. Coherence is linearly decoded/interpolated. Magnified interpolation preserves the current minimum-contributing-step reduction for provenance. Quantization error is bounded by one part in 16383 for each scalar.

### Color consumes geometry, not derivative state

Base normal, diffuse/specular lighting, skybox reflection, local shadowing, and AO use cached gradient/curvature. Distance-height palette shift, distance/depth texture mapping, debug height, and adaptive-AA target selection read `geometry.w`.

Effects that formerly used derivative angle derive orientation from `atan2(gradient.y, gradient.x)` with a neutral fallback for near-zero gradients. This is an intentional semantic change: orientation now follows the displayed surface geometry.

Stripe and coherence coloring remain available through metadata. Their optional relief gradients may still use neighboring metadata loads because they depend on palette/orbit effect activation, not solely on the base Mandelbrot distance field. `z.xy` continues to feed smooth escape reconstruction, orbit traps, and Cartesian mappings.

### Cache invalidation follows field content

Geometry is written with terminal raw content and resolved when Mandelbrot content or its coordinate transform changes: center/scale/rotation, iteration progress, approximation mode/table readiness, bailout, history reset, live/frozen source selection, or merge. Palette, light, roughness, clearcoat, skybox, material animation, and other color-only changes reuse the cache.

The converged direct-raw color bypass is removed or redirected: color always needs a coherent final geometry texture. Once the field version is unchanged, resolve may be skipped while color continues to reuse the cached display set.

### Precision and sanitization

Producers calculate in f32, reject non-finite divisions, and clamp final gradient/curvature to a documented finite storage range before conversion to `rgba16float`. `distanceHeight` keeps its existing finite clamp. A temporary `rgba32float` validation mode compares quantization error but is not a shipping display layout.

## Risks / Trade-offs

- **Always carrying `z″` adds iteration ALU/register pressure** → measure iteration and resolve separately; do not trade correctness back for an implicit spatial fallback.
- **rgba16float quantization changes fine normals or AO** → compare against `rgba32float`, inspect error maps, and tune finite clamps from observed distributions rather than arbitrary wide ranges.
- **Escape-branch transitions create analytic discontinuities** → validate fixed-branch formula accuracy separately and diagnose transition pixels without claiming certificate-level smoothness.
- **An approximation move lacks complete second-order derivatives** → reject that move and exact-step; never expose stale derivatives or a final validity bit.
- **Packed stripe/coherence alters extreme short-period effects** → quantify phase/coherence error and compare representative orbit/stripe palettes before removing the float layout.
- **Gradient/curvature scale drifts during frozen reprojection** → centralize source-to-display transforms and test live-only, frozen-only, and merged values at known zoom ratios.
- **Mixed-format resources increase binding complexity** → define one typed display-set abstraction and migrate producers/consumers atomically behind an internal flag.
- **The second change is applied before Super Pixel removal** → require `simplify-progressive-renderer` first or explicitly block the packed path while legacy half-step markers exist.

## Migration Plan

1. Complete or disable the Super Pixel/refinement path from `simplify-progressive-renderer`.
2. Introduce a typed display-set abstraction and allocate the five new attachments behind an internal comparison flag.
3. Produce terminal analytic geometry, migrate resolve and frozen snapshot/merge/reprojection, while retaining the legacy eight-layer display set as an oracle.
4. Migrate color, magnified interpolation, debug views, AA target bake, and picking to the new bindings and decoders.
5. Compare f16 geometry against the f32 oracle, validate fixed-branch analytic gradients and transition diagnostics, and verify cache invalidation.
6. Remove the legacy display layout after static checks and user-approved browser/GPU visual and timing comparisons.

Rollback selects the legacy display-set path until its removal; after removal, rollback is a source revert. No user data migration is required.

## Open Questions

- What finite clamp for gradient and curvature preserves all current relief controls while minimizing f16 saturation?
- What is the iteration-time cost of carrying `z″` in every selectable mode compared with the removed resolve/finalization work?
- Should the parabolic gate later gain complete second derivatives, or remain disabled as a simplification?
