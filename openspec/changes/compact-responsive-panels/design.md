## Context
The shared masonry preference creates clipped video forms and narrow galleries. Dense controls also rely on double click and desktop drag. The user approved contextual compact panels after browser inspection.
## Goals / Non-Goals
Goals: automatic content layouts, preserve fractal visibility, readable controls at 390px, eliminate dead UI controls.
Non-goals: change GPU algorithms, remove diagnostic fallback algorithms, alter saved appearance.
## Decisions
Use an inspector shell for settings and a full-width grid inside gallery views. CSS chooses bottom sheet on narrow portrait screens and side panel on landscape. Shared fields support direct keyboard/touch editing; sections expose accessible collapse controls. Palette subnavigation scopes local/global fields without moving data ownership. Keep epsilon data compatibility but remove its ineffective control. Retain experimental diagnostics behind disclosure. Prefer existing components and native details over new dependencies.
## Risks / Trade-offs
More disclosure can hide discoverability: retain labeled sections and active mode summaries. Panel reflow can remount expensive previews: keep the preview mounted while changing palette tabs. Existing engine edits must remain untouched. Mobile viewport emulation does not prove real touch hardware behavior.
## Migration Plan
Ignore saved layout choice while preserving theme/shape/field/chroma. No preset migration. Revert UI changes independently if needed.
