# Manual visual validation — global Taylor freeze

## Purpose

Compare the experimental Taylor resolve directly with the exact step-1 render.
This is an observational A/B check. It does not use a palette-derived error
threshold and does not produce an automatic “indistinguishable” verdict.

## Controls

In **Performance**:

- `Gel Taylor (exp.)` enables the diagnostic;
- `Pas de gel` selects 2, 4, 8, 16, 32 or 64 pixels;
- disabling `Gel Taylor (exp.)` invalidates the preview and recomputes the exact
  step-1 result.

## Reference views

Use half-height `scale = 1e-3` for the first pass:

| view | cx | cy |
|---|---:|---:|
| seahorse | -0.743643887037151 | 0.131825904205330 |
| elephant | 0.2925755 | 0.0149977 |
| triple-spiral | -0.7269 | 0.1889 |
| misiurewicz | -0.10109636384562 | 0.95628651080914 |

## A/B sequence

For each view:

1. Disable the gel and wait for the exact render.
2. Capture or observe the exact reference.
3. Enable the gel at step 2.
4. Repeat at steps 4, 8 and 16.
5. Disable the gel again and verify that exact refinement restarts.

Keep the same palette, viewport size, DPR, iteration budget and approximation
mode throughout one sequence.

## What to inspect

- displacement or duplication of iteration bands;
- discontinuities near escape-iteration branch changes;
- seams aligned with the dyadic grid;
- distance-height or derivative-angle shading errors;
- boundary halos where escaped and interior anchors meet;
- behaviour of hard `square` palette transitions;
- stripe and average-direction channels, which intentionally retain spatial
  interpolation;
- whether disabling the mode reliably returns to the exact image.

Record screenshots and concise observations per view and step. Do not convert
the observations into a universal ν or palette tolerance.

## Browser execution

No browser or Playwright run is part of the static implementation. Start the
manual comparison only after explicit user confirmation.
