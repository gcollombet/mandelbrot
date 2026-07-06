# all-compute-render-path — delta spec

## ADDED Requirements

### Requirement: Single production iteration path
The engine SHALL iterate pixels through exactly one production shader — the
in-place compute pass — for every frame type (static, zoom, pan, clear). The
fragment iteration shader and its ping-pong brush pass SHALL be removed, and
no production pipeline SHALL write the raw state textures through MRT color
attachments.

#### Scenario: Pan frame routes through the compute utility pass
- **WHEN** a frame carries a translation shift
- **THEN** a ping-pong compute pass (read A, write B) applies the texel-shift
  gather + sentinel restamp, B is copied back to A, and the same frame's
  in-place dispatch continues iteration — with no fragment pass involved

#### Scenario: Clear frame stamps sentinels in compute
- **WHEN** history must be cleared (mode/budget/reference change)
- **THEN** the utility compute pass stamps the sentinel grid and the in-place
  path resumes from scratch, without the fragment path

#### Scenario: Hot path untouched
- **WHEN** a frame is static or zooming (no shift, no clear)
- **THEN** the frame executes exactly today's single in-place dispatch — no
  added passes, and finished texels still generate zero texture writes

### Requirement: Utility pass preserves brush semantics
The compute utility pass SHALL reproduce the fragment brush behavior: integer
pan gather, sentinel levels and resolution refinement (`minBrushStep`,
`allowRefinement`), budget-exhausted conversion, and out-of-shift clears —
verified by pan/clear/zoom Playwright coverage before the fragment path is
deleted.

#### Scenario: Pan preserves computed history
- **WHEN** the view translates by N texels
- **THEN** previously computed pixels reappear shifted by exactly N texels and
  only the exposed sliver is re-computed

### Requirement: Determinism spec supersedes the parity spec
The fragment-vs-compute parity spec SHALL be retired with the fragment path,
replaced by a determinism spec: rendering the same view twice from scratch
SHALL produce identical iteration output, and (once the Cartesian state lands)
bit-identical DE-relevant layers.

#### Scenario: Two renders agree
- **WHEN** the same deep view is rendered to convergence twice from a cleared
  state
- **THEN** the resulting outputs are identical within the spec's tolerance
  (bit-exact for iteration counts; DE layers bit-exact after the Cartesian
  state change)
