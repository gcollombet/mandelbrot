## Why

The renderer already accelerates perturbation iteration with **BLA** (bivariate linear
approximation): a hierarchical power-of-two merge table built in Rust
(`reference_calculus/src/lib.rs`) and consumed by two shader loops — a shallow `f32`
path (`try_apply_bla`) and a deep floatexp path (`try_apply_bla_deep`). Each block
replaces `l` exact steps with an affine map `z ← A·z + B·c`, valid while `|z| < ε·|A|`.

`MANDELBROT_PADE_IMPLEMENTATION.md` proposes a **rational [1/1] (Padé)** block,
`z ← (A·z + B·c)/(1 + D·z)`, that reproduces the dropped `z²` term exactly and so stays
valid to a larger radius `√ε·|A|` — letting blocks keep skipping closer to escape, where
affine falls back to single steps. That source document derives the seed and the `D`
composition, and lists three "non-negotiable" prototyping bugs. But it leaves **three
things underspecified that decide whether the feature works**, and its §6 reference loop
assumes an on-the-fly accumulator that does **not** match this codebase's precomputed
merge-table architecture.

This change **captures the derivations** for those three gaps (it is design-capture; no
code lands here):

1. **Radius composition** — how the `√ε` validity radius propagates through the merge
   tree. The source doc derives only the single-step radius, never the composed one.
2. **Block derivative** — the `der = dz/dc` recurrence for a rational block (needed for
   distance estimation and AA). The source doc gives the derivative only for the exact
   step, never for a block.
3. **Rebasing interaction** — whether a block can jump past a Zhuoran rebasing point, and
   how `der`/`D` behave across a rebase.

A secondary outcome, recorded here because it reframes the risk: the source doc's three
"non-negotiable" invariants (§4: never start a block on `Z ≈ 0`; minimum skip; reference
more precise than the delta) are **already satisfied** by the shipped BLA architecture
(degenerate-radius gating, table starting at skip 2, floatexp + arbitrary-precision
reference). The novel risk surface is therefore §3 (the Padé coefficient, its radius, its
derivative, its pole) — not the invariants.

Padé higher-order block-jumping is **unvalidated** (the only prior art, NanoMB2 chained
biseries, failed by catastrophic absorption). This change does not commit to shipping it;
it makes the math solid enough to prototype and to decide empirically.

## What Changes

- Add `design.md` capturing the three derivations (radius composition, block derivative,
  rebasing interaction), each with its quantitative error bound, plus the integration-point
  map and the "§4 invariants already met" finding.
- Specify the Padé block form, seed (`A=2Z`, `B=1`, `D=−1/A`, radius `√ε·|A|`), and the
  merge-tree composition (`D_z = D_x + A_x·D_y`; radius by `min`-with-`√ε`-seed, with
  quadrature as a documented stricter alternative).
- Define the mode surface: an `'pade'` value alongside `'perturbation' | 'bla'`, a `D`
  coefficient added to `BlaStep`/`BlaF64`, and the rational application + corrected
  derivative in both shader consumption paths.

This change does **not** modify shader, Rust, or Engine code. It is the design layer that a
follow-up implementation change consumes.

## Capabilities

### New Capabilities
- `pade-approximation` (design-stage): a rational [1/1] block-jump mode as an alternative
  to BLA, with a derived radius-composition law, a corrected block derivative, and a
  rebasing-interaction analysis. `specs/` captures the **correctness invariants** the three
  derivations establish — what any implementation MUST satisfy if built (block form, radius
  composition, mandatory derivative, rebasing compatibility, pole telemetry). The
  **user-facing behaviour and the ship decision** (hybrid vs abandon,
  `MANDELBROT_PADE_IMPLEMENTATION.md` §8) are intentionally deferred to the empirical pass
  (difference mode + pole-rejection telemetry).

## Impact

- `openspec/changes/add-pade-approximation/design.md` — the three derivations (primary
  artifact of this change).
- Future implementation (out of scope here, but mapped in the design):
  - `reference_calculus/src/lib.rs` — seed (`L758`), merge composition (`L782-798`),
    `BlaStep`/`BlaF64` structs (`L88`/`L1062`), `bla_f64_to_fe` (`L1089`), a `use_pade()`
    mode.
  - `src/assets/mandelbrot.wgsl` — `BlaStep` struct (`L60`), `try_apply_bla` (`L256`),
    `try_apply_bla_deep` (`L665`): rational application, corrected derivative, pole guard.
  - `src/Engine.ts` — `ApproximationMode` enum (`L263`) gains `'pade'`; uniform packing.
  - `src/referenceWorker.ts` — mode plumbing.

## Non-Goals

- Implementing Padé in shader/Rust/Engine. This is design capture only.
- The hybrid (affine-default, Padé-on-marked-segments) vs abandon decision — that is
  empirical (§8) and depends on the difference-mode harness.
- The difference-mode validation harness itself (`|z_padé − z_affine|` coloring) — a
  separate, smaller change that is the recommended first implementation step.
- The hierarchical-table perf path is already in place; no perf work here.
- Production validation / benchmarking on the three locality classes (smooth spiral /
  minibrot / near-escape).
