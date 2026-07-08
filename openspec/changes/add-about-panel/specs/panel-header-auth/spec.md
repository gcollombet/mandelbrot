## ADDED Requirements

### Requirement: Login/Logout control in every panel header
Every settings panel header (Presets, Navigation, Palettes, Animation, Performance, About) SHALL expose a single, consistently-placed Login/Logout control, replacing the previously duplicated top-bar and footer Login buttons.

#### Scenario: Logged-out state shows Login in every panel
- **WHEN** no user is authenticated and the user opens any settings panel
- **THEN** the panel's header displays a "Login" control in the same position across all panels

#### Scenario: Logged-in state shows Logout in every panel
- **WHEN** a user is authenticated and the user opens any settings panel
- **THEN** the panel's header displays a "Logout" control (identifying the logged-in user) in the same position across all panels

#### Scenario: Auth action from a panel header
- **WHEN** the user clicks the Login control in a panel header while logged out, or the Logout control while logged in
- **THEN** the corresponding authentication action (sign-in or sign-out) is triggered, matching the previous top-bar/footer button behavior

### Requirement: No standalone Login buttons outside panel headers
The system SHALL NOT render a Login/Logout control in the top settings bar or in a standalone footer; the panel-header control is the only place this action is available.

#### Scenario: Top bar has no auth control
- **WHEN** the user views the top settings bar with no panel open
- **THEN** no Login or Logout button is present in the top settings bar
