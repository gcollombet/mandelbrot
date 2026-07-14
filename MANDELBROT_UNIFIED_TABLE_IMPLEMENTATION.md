# Unified block table + per-block tier dispatch — implementation notes

Companion to `MANDELBROT_PADE_IMPLEMENTATION.md`, `MANDELBROT_JET_IMPLEMENTATION.md`
and `MANDELBROT_MOBIUS_CPLUS_IMPLEMENTATION.md`. Source math: `JET_BLA_FINDINGS.md`
§8–17; planning artifacts in `openspec/changes/unify-jet-table-dispatch/` (the
design.md status sections carry the per-phase measured numbers this doc summarizes).

## 1. What it is

The mode war's resolution: the user-facing "approximation mode" picker was the
experiment, the bivariate jet table is the product. ONE build per reference
orbit; per block, affine / Padé / Möbius-c+ / jet become **dispatch tiers** of a
single prefix-ordered coefficient record, each with its own certified value AND
derivative radius. The runtime probes a 16 B tagged sidecar, reads the tag-directed
prefix (24/36/60/108 B) and evaluates that tier. Shipping mode: `auto` (shader
flag 5); legacy modes remain debug overrides.

```
record  = [A, B, D, N₂, A′, D′, F, a12, a03]    (9 × 12 B JetCoeffFe = 108 B)
tiers   =  affine 24 B | Padé 48 B | c+ 84 B | jet 108 B
sidecar =  16 B vec4: r_log2 (tagged, min(r, r′)), tag, f32safe, spare
identities (jet tier reconstructs): a20 = N₂ − D·A, a11 = A′ − B·D − F·A,
                a21 = −D′·A − D·a11 − F·a20, a02 = −F·B, a30 = −D·a20
```

The record shares the standalone mode's 7-coefficient [2/1] F-form extraction
(`mobius_from_jet_k2`, mobius rounds 5 + 7): D = −c₃₀/c₂₀ resums the z-channel
pole, N₂ = c₂₀ + D·c₁₀ annihilates z² exactly (q₃₀ joins the constructed
zeros), F = −c₀₂/c₀₁ resums the pure-c channel (den = 1 + De·z + F·c). Two raw
slots (a₀₂, a₃₀) are displaced by F/N₂ size-neutrally — both reconstruct in
registers via the identities above (a₃₀ exactly iff c₂₀ ≠ 0; the [1/1]
fallback keeps q₃₀ a live REST term for every tier, same discipline as a₀₂
under F = 0). Because the record ships ONE D, the Padé tier is the PLAIN VIEW
of the same extraction (A′ = D′ = F = 0, D/N₂ kept — a plain [2/1], 48 B):
shipping the [1/1] D instead would leave q₂₀ = N₂ live for it, which is why N₂
sits inside the Padé prefix. Rational applies gain one cmul (numerator Horner),
∂m/∂z = (2N₂z + Ae − m·De)/den, and the AA kernel's m_zz = 2(N₂ − De·m_z)/den.
The periodic header STAYS on the [1/1] extraction (6 coefficients, entries
hdrBase+4..9, fixed points from the quadratic De·δ² + (1+Fc−Ae)·δ − Bc = 0 — a
[2/1] numerator would make it a cubic). The F adoption closed the shallow
`cmax_c2` bind for the `auto` dispatch (census: 77 → 6 bound blocks); the
[2/1] adoption (2026-07-10) hands both rational tiers the round-7 radii
(median +1.5 to 2 decades, standalone turns c+ 0.54–0.80× Padé) — the census
replay confirms auto ≤ every single mode with the c+ tier now equal to the
standalone [2/1] mode.

## 2. Shipped phases and their gate numbers

- **A — table + dispatch (2.x).** Census: auto never loses (equals jet's steps
  everywhere while moving 71–100 % of applications to ≤80 B paths at deep c_max).
  Field gate PASSED 2026-07-06: "auto toujours mieux". Live tier mix in
  RenderStats from production WorkStats counters; the affine tier is ALIVE at
  shallow c_max (intro: ~70 % affine) — the census's "affine dead" verdict was
  deep-band-specific.
- **B — derivative-certified radii (V′) (3.x).** Sidecar radius is ALWAYS
  min(r, r′) (no DE key). Soundness referee: 1 682 samples, per-tier exact-∂z
  ≤ 5ε·(|A| + |A′|y). Structural finding: Padé's q₁₁·y floor kills 8–14
  blocks/view at 1e-14 (der-DEAD); c+ ~1 bit; jet 0–7 blocks; free at 1e-9.
  Field half (3.4: DE stability at depth, honest-DE cost) OPEN.
- **C — certified series approximation (4.x).** Pure-c prefix jet (order 8
  stored / 4 applied), rung-ladder R_c, no-early-escape guard; ships as a
  4-entry sidecar header; deep compute requests enter through continuation
  parameters. Seahorse 1e-10: content identical to jet, best run 1.07 M apps vs
  jet 115 M (×108). Needle verdict: cold-table A/Bs measure BUILD LATENCY, not
  dispatch quality (warm-table referee ×4.2 at the needle, healthy).
- **D — analytic antialiasing (5.x).** Kernel: (z, z′, z″) with sndM tied to
  2·derS; escape payload in raw layers 8–12. Reseed: margin evaluated ONCE on
  the pristine sample-0 payload, decision tagged into the AA target map (+0.5
  fraction) — tagged pixels never re-iterate; the color pass expands
  ẑ(δᵢ) = z + z′δᵢ + ½z″δᵢ² per AA sample with iteration-parity
  renormalization (iter = floor(ν̂) + synthetic |z|, the bilinear-resolve
  recipe). Frontier stats (stamped/eligible) in RenderStats. Automated A/B
  green against a calibrated brute↔brute noise floor (the converged base is
  not bit-deterministic run to run). Intro-view frontier is 99 % — the margin
  threshold (ln 5) makes the whole shallow boundary band re-iterate; the
  1–10 % frontier expectation is deep-escaping-view territory → field half
  (5.5) OPEN, threshold tuning with it.
- **E — interior/periodic (6.x).** `periodic_build` (tol 1e-12, ε_int =
  max(ε, 1e-4) — κ-accuracy against runtime margins, not ε-exact values);
  runtime interior branch in both loops via fe_csqrt only; period-2 disk:
  0.16 apps/px vs jet's u32-wrapping ≥10⁴×. Exterior fast-forward (6.4)
  DEFERRED behind its deep-validation gate (findings caveat d).
- **F — frame-coherent builds (7.x).** Staged cache: coeffs keyed by orbit,
  bounds by R_c headroom, radii/tags/SA/periodic by (ε, c_max). Keyframe
  cadence asserted (coeffs 0×, bounds ~/4 octaves, radii ~/2 octaves).
  Measured blocker fixed: sub-emit levels (skip 1–2 = 75 % of blocks, never
  serialized) no longer walked/scanned — 40k orbit: cold 4.85 → 2.85 s,
  radii-only keyframe 2.38 → 1.19 s. RenderStats "Table build: N ms (radii)"
  row labels the keyframe path. Remaining wall: the radii scan is linear in
  orbit length (~60 µs/block).

## 3. Reserve-gate verdicts (design D11)

- **[K/1] superconvergent rationalized jet (§14):** SHIPPED via the [2/1]
  record adoption (2026-07-10, see §1) — both rational tiers now carry
  D = −c₃₀/c₂₀ + N₂, upgrading exactly the padé-tier radii the gate measured
  (81 % z-channel-bound Padé apps at 1e-14 on spiral-class views). The
  `pade_apps_zbound` census counter is retained as an obsolete-gate
  diagnostic (reads ~0 post-adoption).
- **Tile-coherent block sequences (§15.5):** untriggered — post-dispatch
  WG-waste measurements have not shown the sustained > ×2 loss the gate needs.
- **Certified secondary-reference trigger (§15.6):** scoped out until a
  multi-reference change exists; the dead-block census hook (blocks whose all
  tiers are band-dead) is the entry point recorded for that change.

## 4. Superseded machinery

Once the remaining field rounds hold (3.4 DE, 5.5 deep AA, 6.4 gate):

- The separate `pade` / `jet` / `mobius+` production modes (already demoted to
  debug overrides behind the [Auto, Exact] picker).
- The heuristic Padé guards (H2 / min_a / beta·dcMag) on the dispatched path —
  the tagged radius folds pole and validity into one compare.
- Prefix rebasing logic (Phase C's SA replaces the prefix BLA applications).
- Brute-force AA re-iteration for margin-OK escaped pixels (Phase D; the
  adaptive sample-count logic of add-adaptive-antialiasing remains, its
  per-sample cost model changes).

The follow-up removal change (legacy mode deletion) is deliberately NOT filed
yet — gated on the open field rounds.

## 5. Open field rounds (user GPU)

1. **3.4** — DE stability at depth under auto + DE; apps_total DE-on vs DE-off;
   certified-DE toggle default (design risk 1).
2. **5.5 field half** — 16× analytic AA on deep escaping-dominated views:
   frontier fraction (expected 1–10 %), margin-threshold tuning (ln 5 is
   certified-conservative and freezes nothing on shallow boundary bands).
3. **6.4** — exterior fast-forward behind its debug flag at real deep zoom
   [GATE for default-on].
