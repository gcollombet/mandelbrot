## 1. Upload Action Layout

- [x] 1.1 Audit every upload/favorite action pair in `src/components/Settings.vue` and ensure upload buttons have an upload-specific class or semantic marker.
- [x] 1.2 Update action button ordering/classes so upload controls render visually to the left of heart/favorite controls for presets, textures, palette presets, and palettes.
- [x] 1.3 Adjust row padding and action offsets so action buttons do not overlap each other, thumbnails, labels, or delete controls.

## 2. Upload Success Feedback

- [x] 2.1 Add transient upload success state keyed by item type and identity.
- [x] 2.2 Set success state only after `uploadCompletePreset`, `uploadPalettePreset`, and `uploadTexture` complete successfully.
- [x] 2.3 Render the upload button success state with a visible inline indicator and accessible title/label.
- [x] 2.4 Clear success feedback automatically after a short timeout and avoid showing it on upload failures.

## 3. Verification

- [x] 3.1 Run `npx vue-tsc -b` to verify TypeScript and Vue template changes.
- [ ] 3.2 Manually inspect affected dropdown rows on desktop and narrow/mobile widths to confirm upload icons sit left of hearts and no content is obscured.
- [ ] 3.3 Manually verify successful uploads show feedback and failed uploads keep existing error handling without success feedback.
