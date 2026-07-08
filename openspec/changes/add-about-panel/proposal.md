## Why

The main viewer currently scatters onboarding and credit information across an always-on footer bar (WebGPU credit, GitHub link, Présentation link, a Login button) and an always-on left-side shortcuts list, both fighting for screen space with the actual render. Login is also duplicated in two places (top bar and footer) with inconsistent behavior (the footer one only shows when logged out). Consolidating this into a dedicated About panel — reachable like any other settings tab — declutters the permanent UI, and moving the keyboard-shortcuts teaching moment into the existing splash screen means new users see it once per load without adding any new state to track.

## What Changes

- **BREAKING**: Remove the `.footer-love` footer bar from `MandelbrotViewer.vue` entirely — the "Made with WebGPU" badge, the GitHub link, the "Présentation" link, and the footer's Login button (`.footer-auth-button`) no longer appear as standalone always-on UI.
- **BREAKING**: Remove the always-on `.shortcut-hint` keyboard-shortcuts sidebar from the main viewer.
- **BREAKING**: Remove the Login/Logout button from the `top-settings-bar` (`.top-tab-btn.auth-btn`).
- Add a new **About** tab (6th entry) to `top-settings-bar`, using the same dense-popup chrome (`DenseTopbar` + `.dense-popup`) as the existing five tabs. Its content has three sections: Aide (keyboard shortcuts, structured to be extended with more help content later), Crédits (WebGPU credit, GitHub link, short creator/tech-stack blurb), and a call-to-action linking to the full Présentation site.
- Enrich `SplashScreen.vue` (the "Toucher pour explorer" screen shown on every load) to display the keyboard-shortcuts list directly on the splash content, and add an automatic dismiss after 10 seconds in addition to the existing tap/click-to-dismiss. No first-visit detection and no `localStorage` flag are introduced — the splash keeps appearing on every load as it does today.
- Relocate the Login/Logout control into `DenseTopbar.vue`'s `#actions` slot (right-aligned), which is the shared header already used by every panel (Presets, Navigation, Palettes, Animation, Performance, and the new About) — implemented once, visually present in every panel header.
- Remove the now-dead 10-second auto-hide bookkeeping (`bottomBarVisible` and related timers) that only existed to hide the footer/shortcuts bar being deleted here.

## Capabilities

### New Capabilities
- `about-panel`: A dense-chrome settings tab presenting keyboard-shortcut help, project/tech credits, and a link to the full presentation — replaces the removed footer and shortcuts sidebar as the permanent home for this information.
- `intro-splash-shortcuts`: The startup splash screen shown on every page load displays the keyboard-shortcut reference directly and auto-dismisses after a fixed delay, independent of user interaction.
- `panel-header-auth`: Every settings panel header exposes the Login/Logout control in a consistent, single location instead of duplicated top-bar/footer buttons.

### Modified Capabilities
(none — the removed footer, shortcuts sidebar, and top-bar auth button were undocumented UI chrome, not covered by an existing spec)

## Impact

- `src/components/MandelbrotViewer.vue`: remove `.footer-love` block and styles, remove `.shortcut-hint` block and styles, remove `.top-tab-btn.auth-btn` markup, add `about` entry to `settingsTabs`/`densePortedTabs`, add About panel content (or a new child component), remove now-dead `bottomBarVisible`/auto-hide timer wiring.
- `src/components/SplashScreen.vue`: add shortcuts content and a 10-second auto-dismiss timer alongside the existing click/tap dismiss.
- `src/components/dense/DenseTopbar.vue`: add the Login/Logout control to the `#actions` slot usage (or as a default rendered action), wired to the existing `loginWithGoogle()`/`logoutUser()` from `src/authService.ts` (no changes to `authService.ts` logic itself).
- No backend, build, or dependency changes.
