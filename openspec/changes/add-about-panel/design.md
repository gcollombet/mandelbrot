## Context

`MandelbrotViewer.vue` currently owns three pieces of always-on chrome that this change touches:

- `.footer-love` (lines ~2000-2048): a bottom-center footer with a "Made with WebGPU" badge/link, a GitHub link, a "Présentation" link (`./presentation/`, built by vitepress), and a Login-only button (`.footer-auth-button`, `v-if="authConfigured && !authUserEmail"`).
- `.shortcut-hint` (lines ~1953-1996): a left-side vertical list of keyboard-shortcut groups (Move/Rotate/Zoom/Settings/Snapshot), the Settings group driven dynamically off `settingsTabs`.
- `.top-tab-btn.auth-btn` (lines ~1553-1562) inside `top-settings-bar`: a Login/Logout toggle that swaps label/icon based on `authUserEmail`.

Both `.footer-love` and `.shortcut-hint` share a single auto-hide mechanism, `bottomBarVisible` (comment: "Auto-hide bottom bar (shortcuts + made with) after 10s"), which fades them out after 10 seconds of inactivity. Removing both elements makes this timer dead code.

`settingsTabs` (a computed array of `{ key, label, icon, shortcut }`) drives the five existing tabs (Presets, Navigation, Palettes, Animation, Performance). Every one of them is already in `densePortedTabs`, meaning they all render through the "dense" popup chrome: a `DenseTopbar` header (title, close button, drag handle, optional `#lead`/`#actions` slots) wrapping a `.body` that hosts `<Settings :active-tab="tab.key" />`. There is no "legacy" (`.settings-popup`) tab left active, so a new tab can be added purely through the dense path without needing to replicate old chrome.

`SplashScreen.vue` is a small, self-contained overlay: `visible = ref(true)`, dismissed by `dismiss()` on click/touchend, with no persistence — it renders on every mount of the app (mounted unconditionally from `App.vue`). It currently shows only a logo, title, and "Toucher pour explorer"/"Tap to explore" text (language-detected from `navigator.language`).

Auth state (`authConfigured`, `authUserEmail`, `loginWithGoogle()`, `logoutUser()`) lives in `MandelbrotViewer.vue`'s `<script setup>`, sourced from `src/authService.ts`. Both existing Login buttons already call these same functions.

## Goals / Non-Goals

**Goals:**
- Remove the three permanent-chrome elements listed above without losing any of the information/functionality they carry.
- Give that information a single, deliberate home: a new About tab using the existing dense-panel infrastructure.
- Teach keyboard shortcuts at the moment they're most useful (app start) via the splash screen, without introducing any persisted state.
- Collapse two divergent Login implementations into one, expressed once in the shared panel header component so it appears consistently everywhere a panel is open.

**Non-Goals:**
- No first-visit/onboarding detection or `localStorage` flag — explicitly ruled out in favor of the splash-screen approach, which already fires on every load.
- No redesign of the auth flow itself (`authService.ts` is untouched).
- No change to `settingsTabs`' single-panel-open behavior (`toggleTab` still closes other tabs before opening a new one) — About behaves like any other tab.
- No attempt to keep the removed footer/shortcut-hint DOM around behind a feature flag; this is a clean removal (marked **BREAKING** in the proposal).

## Decisions

**1. About as a 6th `settingsTabs` entry, not a bespoke modal.**
Reuses `toggleTab`/`closeTab`/`popupStyle`/`bringToFront`/`startDrag` and the dense chrome verbatim — no new panel-management code. Alternative considered: a standalone `showAbout` ref with its own ad-hoc overlay, rejected because it would duplicate dragging/z-order/sizing logic that `settingsTabs` already generalizes over any `tabKey` string.

**2. About content lives inside `Settings.vue`'s tab-switch, like the other five tabs.**
`Settings.vue` already renders different content per `active-tab` prop; adding an `about` branch keeps the single-component-per-popup-body pattern intact. Alternative: a separate `AboutPanel.vue` component (closer to `AnimationPanel.vue`/`PerformancePanel.vue`, which are self-contained). Given `about` content (static help text + credits + a link) has no engine bindings or complex reactive state, and the proposal explicitly wants it "extensible plus tard" (extendable later) with more help content, a dedicated `AboutPanel.vue` component is preferred instead over cramming into the already-4700-line `Settings.vue` — keeps the new, likely-to-grow content isolated. `Settings.vue` is left untouched; the dense-popup body renders `<AboutPanel v-if="tab.key === 'about'" />` alongside the existing `<Settings>` usage for other tabs.

**3. Login/Logout moves into `DenseTopbar.vue` itself, not into each panel's usage site.**
Adding the button once inside `DenseTopbar.vue`'s own template (right-aligned, reusing its existing `#actions` slot area or added as a default trailing element before/after the slot content) means every current and future dense tab gets it automatically — no per-tab wiring. Alternative: pass a `showAuth` prop and duplicate the button markup at each of the 6 call sites in `MandelbrotViewer.vue`, rejected as exactly the duplication this change is trying to eliminate. `DenseTopbar` needs read access to `authConfigured`/`authUserEmail` and the two handler functions; since `MandelbrotViewer.vue` already owns this state, it's passed down as props (`authConfigured`, `authUserEmail`) plus emitted events (`login`, `logout`) — keeping `DenseTopbar` free of a direct dependency on `authService.ts`.

**4. Splash shortcuts reuse the existing shortcut-hint content/structure, auto-hide reuses the existing 10s pattern.**
The Move/Rotate/Zoom/Settings/Snapshot groups currently in `.shortcut-hint` move into `SplashScreen.vue` as-is (same grouping, same tag-styled key labels), rather than inventing a new layout — keeps the teaching content consistent between "first thing you see" (splash) and "look it up later" (About → Aide). The 10-second auto-dismiss timer in `SplashScreen.vue` is a fresh, local `setTimeout` calling the existing `dismiss()` — deliberately not a resurrection of `bottomBarVisible`, since that timer's fade-based hide behavior and multi-element scope don't apply to a single full-screen overlay with a hard dismiss.
`SplashScreen.vue` needs the `settingsTabs`-driven shortcut list (Settings group) to stay in sync with actual tab shortcuts (now including `about`'s own shortcut letter) — simplest path is passing the resolved shortcut labels down as a prop from `MandelbrotViewer.vue` (which already computes `shortcutLabels`) rather than duplicating tab/shortcut knowledge inside `SplashScreen.vue`.

**5. About's keyboard shortcut.**
The tab needs a `shortcut` key like the other five. Existing tab shortcuts are keyboard-layout-aware (`x`, `w`/`z`, `n`, `c`, `v`); pick a free, mnemonic letter (e.g. `a` for "About") — to be confirmed as unused by any movement/rotation/zoom binding during implementation (`shortcutLabels`/global keydown handler starting ~line 702 needs checking before finalizing).

## Risks / Trade-offs

- **[Risk]** Removing `.footer-love`/`.shortcut-hint` also removes the `bottomBarVisible` auto-hide timer's only consumers, leaving dead reactive state if not cleaned up. → **Mitigation**: tasks.md includes an explicit step to delete `bottomBarVisible` and its wiring, not just the template blocks.
- **[Risk]** Splash screen becomes visually heavier (logo + title + full shortcut list + tap prompt) on every load, which could feel like friction for returning users. → **Mitigation**: the 10-second auto-dismiss (this change's own request) bounds how long it lingers even for users who ignore it; layout can keep the shortcut block visually secondary (smaller type) to the primary "Toucher pour explorer" prompt.
- **[Risk]** `DenseTopbar` gaining direct knowledge of auth state/actions increases its prop surface and couples a previously presentation-only component to app-level concerns. → **Mitigation**: keep the coupling at the props/emits boundary only (no import of `authService.ts` inside `DenseTopbar.vue`), matching how the component already receives `title`/`primary`/`isAdmin` from callers.
- **[Trade-off]** Choosing a new `AboutPanel.vue` over extending `Settings.vue` adds one more file, but avoids growing an already very large (4700+ line) component and matches the proposal's intent for the Aide section to grow over time.

## Migration Plan

1. Add `AboutPanel.vue`, wire it into the dense-popup body for `tab.key === 'about'`, add `about` to `settingsTabs`/`densePortedTabs`.
2. Add the Login/Logout props+emits+markup to `DenseTopbar.vue`; wire `MandelbrotViewer.vue`'s existing `authConfigured`/`authUserEmail`/`loginWithGoogle`/`logoutUser` through to every `DenseTopbar` usage.
3. Remove `.top-tab-btn.auth-btn` markup/styles from `top-settings-bar`.
4. Move shortcut content and add the 10s auto-dismiss timer into `SplashScreen.vue`.
5. Remove `.footer-love` and `.shortcut-hint` blocks, their styles, and the `bottomBarVisible` timer/state.
6. Manual verification pass (dev server): open every panel and confirm the Login control appears/behaves identically in each header; confirm splash shows shortcuts and auto-dismisses at 10s; confirm About opens/closes/drags like other tabs.

No data migration, no rollback complexity beyond a standard revert (no persisted state is introduced or removed).

## Open Questions

- Exact keyboard-shortcut letter for the About tab (see Decision 5) — to be finalized against the current keymap during implementation.
- Exact wording/content for the "creator and underlying technologies" blurb in the Crédits section — placeholder copy to be drafted during implementation, final wording likely supplied by the user.
