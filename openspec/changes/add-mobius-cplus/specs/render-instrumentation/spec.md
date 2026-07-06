# render-instrumentation — delta spec

## ADDED Requirements

### Requirement: Total applications counter per render
The system SHALL count, on the production iteration path, the total number of
iteration-loop applications — one per loop turn, whether the turn applies a block
(bla/pade/mobius+/jet) or an exact perturbation step — across all texels of a render
generation. The counter SHALL accumulate on the GPU across the whole render SESSION
and reset only when pixel work actually restarts (mode/ε/reference/resize) —
mid-render block-table posts SHALL NOT reset it (they continue the same session).
The RenderStats panel SHALL display this total as an absolute count ("Total apps"),
frozen at render completion alongside the completion timings, so that A/B comparisons
between approximation modes on the same view use a deterministic cost metric instead
of wall-clock. The completion figure SHALL come from a dedicated final readback of
the GPU totals (exact, independent of sampled-readback alignment). Interpretation
note: the session total includes the pre-table exact-stepping phase of slow-building
modes — steady-state mode comparison needs views where iteration dominates build, or
a warm-table re-render.

#### Scenario: Total frozen at completion
- **WHEN** a render session completes (no unfinished pixels remain)
- **THEN** the panel shows the session's exact total application count (final
  readback), and the value does not change until a new render session begins

#### Scenario: Table post mid-render does not reset the total
- **WHEN** a slow-building mode's block table posts while the render is converging
- **THEN** the accumulated application count continues across the post, and the
  completion figure covers the whole session including the pre-table exact phase

#### Scenario: Reproducible mode comparison
- **WHEN** the same view is rendered to completion twice under the same approximation
  mode and table
- **THEN** the two totals agree within the workgroup-downscale quantization envelope
  (±half a downscale unit per workgroup per dispatch — ~1 % at 1080p), making
  mode-vs-mode comparisons reproducible across runs and machines

### Requirement: CPU skip benchmark retired
The system SHALL remove the CPU-side sampled Padé benchmark (`benchmarkPade` and its
RenderStats skip-benchmark section) once the Total-apps indicator lands: it re-emulates
the iteration loop on a 16×-subsampled grid and must be manually resynced on every mode
change, whereas the GPU counter measures the real kernel on every pixel, rebasing
included.

#### Scenario: Panel after retirement
- **WHEN** the RenderStats panel is expanded after the indicator ships
- **THEN** no CPU benchmark button or sampled-skip rows are present; the Total apps
  indicator and the existing realized-skip ratio cover the same need from real GPU
  counters
