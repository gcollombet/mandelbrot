# cartesian-der-state — delta spec

## ADDED Requirements

### Requirement: Raw state textures carry nine layers
The raw per-pixel state textures (A and B) SHALL have 9 r32float layers; the
display-side textures (resolved, frozen) SHALL stay at 8. The layer split SHALL
be expressed as two distinct constants so display MRT pipelines keep their
8-target layout.

#### Scenario: Only raw textures grow
- **WHEN** textures are (re)created at init or resize
- **THEN** raw A/B are 9-layer arrays, display textures remain 8-layer, and the
  B→A copy covers all 9 layers

### Requirement: In-progress derivative state is carried raw
For in-progress pixels, layers 4/5/8 SHALL store the derivative registers
`derM.x`, `derM.y`, `derS` as plain f32 copies — no polar conversion, no
transcendental, at any pass boundary. The polar conversion (atan2/log →
height/angle) SHALL happen exactly once, at escape. Escaped pixels keep
today's format (DE height, relief angle in 4/5; layer 8 unused), so
resolve/color/merge and the frozen path are unchanged.

#### Scenario: Pass boundary is lossless
- **WHEN** an in-progress pixel's state round-trips a progressive-pass boundary
- **THEN** the reloaded (derM, derS) is bit-identical to what the previous pass
  held in registers

#### Scenario: Escaped pixels are display-compatible
- **WHEN** a pixel escapes
- **THEN** layers 4/5 receive (DE height, relief angle) exactly as today and
  every display-side consumer works unmodified

### Requirement: Distance estimation is run-to-run deterministic
With the Cartesian carry in place, the DE output SHALL NOT depend on the
progressive batch sizing: rendering the same view to convergence twice from
scratch SHALL produce bit-identical derivative-derived layers, regardless of
GPU timing variations between the runs.

#### Scenario: Batch-size independence
- **WHEN** the same view converges once with small batches and once with large
  batches (different pass-boundary placement)
- **THEN** the final DE-relevant output is identical — boundary count no longer
  feeds any rounding into the derivative state
