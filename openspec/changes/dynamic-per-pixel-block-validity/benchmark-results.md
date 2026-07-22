# Rollout benchmark and decisions

Latest dynamic-hot-path run: 2026-07-21 at 22:31 UTC, one Chromium
process/adapter class, fresh `GPUDevice` per variant, 1280×720, identical
preset, and at least 30 timestamped iteration-pass samples per static variant.
Raw output: `test-results/benchmarks/dynamic-validity-matrix.json`.

This run includes the reference-owned incremental cache and three GPU changes:
`log2|dc|` is cached once per pixel, conservative `log2|dz|` is computed once
per block-probe turn, and every level publishes the maximum candidate radius
of its committed dynamic certificates. Since every effective tier radius is
intersected with that candidate, the level bound can reject impossible probes
without reading the 96-byte envelopes. The existing two-level-up hint is also
used by dynamic dispatch.

## Expanded performance matrix

| Variant | Activation wall | Static iteration p50 / p95 | Navigation iteration p50 / p95 | Navigation frame p95 | Realized skip |
|---|---:|---:|---:|---:|---:|
| Exact perturbation | 1,853 ms | 2.91 / 5.11 ms | 0.84 / 4.83 ms | 61.2 ms | 1.00 |
| Legacy BLA | 1,850 ms | 6.09 / 10.16 ms | 0.85 / 4.73 ms | 53.5 ms | 2.90 |
| Legacy Padé | 2,055 ms | 5.55 / 10.51 ms | 0.85 / 4.49 ms | 52.4 ms | 2.29 |
| Legacy Jet | 1,915 ms | 6.52 / 12.58 ms | 1.00 / 13.83 ms | 57.5 ms | 2.84 |
| Legacy Möbius | 2,098 ms | 6.58 / 12.05 ms | 1.64 / 11.85 ms | 52.7 ms | 1.00 |
| Legacy Auto | 2,097 ms | 7.43 / 14.66 ms | 1.92 / 12.05 ms | 51.9 ms | 1.00 |
| Dynamic Auto, one-shot | 1,894 ms | 5.97 / 10.79 ms | 1.59 / 9.93 ms | 47.9 ms | 1.00 |
| Dynamic + incremental Auto | 1,700 ms | 0.93 / 5.90 ms | 0.98 / 9.59 ms | 45.4 ms | 1.00 |

The sampled default view reports no dynamic tier applications: its candidate
level bounds reject the block table before the packed proofs, so this run
primarily measures the now-cheap rejection-plus-exact path rather than a
best-case block speedup. This is intentional evidence for the navigation tail
gate, but accepted-tier throughput should continue to be measured on dedicated
deep fixtures.

Dynamic+incremental reports zero cmax-only block rebuilds, 1,670,272 bytes of
peak builder memory, 222,732 transferred bytes, and one capacity growth. The
seven shallow/deep/quasi-critical/parabolic/continuation/rebase/out-of-domain
GPU parity fixtures produced zero classification divergence from exact
perturbation in the same implementation session.

## Rollout gate after the hot-path correction

| Gate | Result |
|---|---:|
| cmax-only rebuilds | 0 — pass |
| Incremental builder peak | 1.59 MiB — pass |
| Static iteration p95 vs legacy Auto | 0.403× — pass |
| Static frame p95 vs legacy Auto | 0.661× — pass |
| Navigation iteration p95 vs legacy Auto | 0.796× — pass |
| Navigation frame p95 vs legacy Auto | 0.875× — pass |

All rollout gates pass. Dynamic per-pixel validity and incremental reference
tables are therefore enabled together as the WebGPU Engine defaults. The
legacy one-shot/tag path remains available through the performance panel for
rollback and A/B diagnosis, while expensive dynamic proof counters stay off in
ordinary rendering.
