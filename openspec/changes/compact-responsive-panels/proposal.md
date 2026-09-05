## Why
The settings obscure the fractal while truncating controls. Mobile headers lose titles, video fields overlap, and the palette exposes unrelated settings simultaneously.

## What Changes
- Choose compact inspector, gallery, and export layouts automatically; replace mobile centered dialogs with expandable bottom sheets.
- Contextual palette editing and separate libraries; compact animation tracks and navigation.
- Remove the ineffective Epsilon control and static Max skip field; consolidate performance diagnostics.
- Accessible numeric editing, readable labels, touch scrolling, and device-appropriate help.

## Capabilities
### New Capabilities
- `compact-panel-navigation`: Responsive panel chrome, contextual settings and galleries across the viewer.
### Modified Capabilities
- `performance-settings`: Only effective controls in the main panel, contextual advanced and diagnostic controls.

## Impact
Vue components and dense CSS; no rendering algorithm changes. Preserve existing presets and session settings, including legacy epsilon values for compatibility. Existing uncommitted renderer changes remain intact.
