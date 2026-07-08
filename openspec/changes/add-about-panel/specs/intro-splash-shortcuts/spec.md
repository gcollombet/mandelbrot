## ADDED Requirements

### Requirement: Splash screen displays keyboard shortcuts
The startup splash screen (shown on every page load) SHALL display the keyboard-shortcut reference (the same groups previously shown in the standalone shortcuts sidebar) as part of its content, without requiring any prior visit or persisted state to decide whether to show it.

#### Scenario: Shortcuts visible on load
- **WHEN** the application loads and the splash screen is shown
- **THEN** the splash screen content includes the keyboard-shortcut groups and key labels alongside the existing logo, title, and "Toucher pour explorer" / "Tap to explore" prompt

### Requirement: Splash screen auto-dismiss
The splash screen SHALL automatically dismiss after 10 seconds if the user has not already dismissed it manually, in addition to the existing dismiss-on-click/tap behavior.

#### Scenario: User dismisses manually before timeout
- **WHEN** the user clicks or taps the splash screen before 10 seconds have elapsed
- **THEN** the splash screen dismisses immediately and the automatic timer no longer fires

#### Scenario: User does not interact within 10 seconds
- **WHEN** 10 seconds elapse without the user clicking or tapping the splash screen
- **THEN** the splash screen dismisses automatically, revealing the canvas underneath
