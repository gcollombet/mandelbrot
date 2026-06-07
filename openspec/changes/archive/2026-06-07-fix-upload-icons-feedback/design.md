## Context

Upload and favorite actions are rendered in `src/components/Settings.vue` across navigation presets, saved presets, material textures, environment textures, palette presets, and saved palettes. The current styling positions `.favorite-button` absolutely at the right edge of `.favorite-row`, with `.favorite-button.upload-button` offset to the left only when that specific class combination is used; some upload buttons do not use the upload-specific class, and some rows render the upload button after the favorite button.

The upload handlers already update local remote metadata after successful remote catalog writes, but the UI does not expose a transient success state to confirm the upload.

## Goals / Non-Goals

**Goals:**

- Ensure upload controls are consistently displayed to the left of favorite/heart controls in every affected dropdown row.
- Ensure upload and favorite controls never overlap each other or row content.
- Add a lightweight visual success indication after successful uploads.
- Keep existing upload permissions, click behavior, and persistence behavior intact.

**Non-Goals:**

- Changing remote catalog APIs or storage behavior.
- Adding a new notification dependency.
- Changing favorite semantics or favorite persistence.
- Redesigning the full settings panel layout.

## Decisions

- Use explicit action positioning/classes for upload and favorite buttons rather than relying on DOM order alone.
  - Rationale: absolute positioning currently controls these actions, so each action needs a stable, semantic offset regardless of template order.
  - Alternative considered: convert every row to a fully flex-based action group. This is cleaner but touches more inline layout code and increases regression risk for a small UI fix.
- Track upload completion with small transient component state keyed by uploaded item identity.
  - Rationale: the existing upload handlers are the source of truth for success, so they can set the visual state only after the remote write and local metadata update succeed.
  - Alternative considered: infer success from `remote` metadata. That would show a persistent published state rather than clearly confirming the latest upload action.
- Present success as an inline state on the upload button, such as a check icon, success color, or short accessible label/title update.
  - Rationale: inline feedback keeps confirmation near the action that triggered it and avoids global alerts/toasts for routine success.
  - Alternative considered: `window.alert` on success. This would be disruptive and inconsistent with the existing error-only alert behavior.

## Risks / Trade-offs

- Upload feedback could disappear too quickly or linger too long -> Use a short timeout that is long enough to notice and clears automatically.
- Different item categories may share ids or names -> Include item type/category in the success-state key.
- Absolute-positioned controls can still collide with row content on narrow widths -> Reserve enough right-side padding on rows that contain action buttons and keep offsets consistent.
- Disabled uploads for textures without GUIDs should not appear successful -> Set success state only after the existing upload function completes successfully.
