## 1. Token scale foundation

- [x] 1.1 Add the density token scale to `:root` in `src/style.css` (`--space-1..5`,
      `--font-xs..lg`, `--ctrl-h`, `--thumb`, `--label-w`, `--radius-sm/md/lg`) with a
      comment noting legacy `--radius:18px` is kept intentionally
- [x] 1.2 Migrate the shared checkbox/control styles in `src/style.css` to consume the
      tokens — n/a: the only shared control there is the pill toggle (radius `999px`,
      deliberate); no value maps to the scale. Slider-thumb migration is task 2.3.

## 2. Slider rows & labels (biggest win)

- [x] 2.1 Replace `--palette-label-width: 208px` usage with `--label-w` (150px) in the
      `.palette-control-row` / `.gfx-slider-row` / `.palette-compact-control` grids
- [x] 2.2 Reduce slider label font to `--font-md` (13px) and the value column to
      `--value-w` (72px); switch row `gap`/`padding`/radius to tokens — applied to both
      the `palette-*`/`gfx-*` family and the `.cv-body` `.frow`/`.coords`/`.crow` rows
- [x] 2.3 Tokenize the slider thumb size (`--thumb`, 16px) in both the
      `:deep(input[type=range])` and `.cv-body input[type=range]` rules
- [ ] 2.4 Verify the slider track is visibly wider on a 640px popup (manual/visual —
      requires WebGPU)

## 3. Spacing, padding & radii migration

- [x] 3.1 Migrate row/section paddings, margins and gaps to `--space-*` (slider rows,
      `.cv-body` rows, `.section-label`/`.section-help`, popup header/body in
      `MandelbrotViewer.vue`)
- [x] 3.2 Migrate font sizes (15px → `--font-lg/md`) for labels, values, primary
      buttons (`play-btn`, `load-btn`, `save-btn`), inputs (`txt-in`), select triggers
      and subtab pills
- [x] 3.3 Migrate control heights/padding (subtab pill 42→36px, select-box padding) to
      tokens
- [x] 3.4 Migrate corner radii to `--radius-md`, keeping blur/gradients/large popup
      `--radius` intact

## 4. Galleries → one responsive rule

- [x] 4.1 Replace the base gallery grid (`.cv-body .grid` `repeat(3,1fr)`) with
      `repeat(auto-fill, minmax(var(--gallery-min),1fr))`; texture grid inherits it
- [x] 4.2 Replace `.full-preset-grid` (`repeat(4)`) with auto-fill `minmax(130px,1fr)`
      and delete the now-redundant 520/720px column overrides for these grids (kept the
      row-collapse and `saved-palette-card` rules)
- [ ] 4.3 Verify all three galleries reflow without sub-minimum cards at narrow widths
      (manual/visual — requires WebGPU)

## 5. Small-viewport fit

- [x] 5.1 Change `popupStyle()` widths in `MandelbrotViewer.vue` to `min(<target>, 96vw)`
      for the 1080/720/640 cases
- [ ] 5.2 Confirm no horizontal overflow and that multi-column rows collapse (label above
      control) on a narrow panel (manual/visual — requires WebGPU)

## 6. Verification & tuning

- [ ] 6.1 Visually spot-check each panel at desktop width and a narrow width; check that
      blur, radial gradients, rounded corners and gradient buttons are preserved
      (manual/visual — requires WebGPU)
- [ ] 6.2 Spot-check shared-control consumers (`AnimationPanel.vue`, others) for cramped
      or clipped layouts from the denser global tokens (manual/visual — requires WebGPU)
- [ ] 6.3 Tune `--label-w`, `--gallery-min` and spacing token values once based on the
      visual review — starting values set (label 150, value 72, gallery-min 140/130)
