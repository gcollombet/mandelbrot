## ADDED Requirements

### Requirement: About tab in the settings bar
The system SHALL provide an "About" entry in the top settings bar, alongside Presets, Navigation, Palettes, Animation, and Performance, opened and closed the same way as the other tabs (click to open, click again or close button to dismiss, single-panel-open behavior preserved).

#### Scenario: Opening the About tab
- **WHEN** the user clicks the "About" entry in the top settings bar
- **THEN** the About panel opens using the same dense popup chrome (draggable header, close button) as the other settings tabs, closing any other open tab

#### Scenario: Closing the About tab
- **WHEN** the user clicks the close button on the About panel's header
- **THEN** the About panel closes and no other panel is opened in its place

### Requirement: About panel Aide section
The About panel SHALL include an "Aide" section listing the current keyboard shortcuts, grouped the same way as the previously-shown shortcuts sidebar (Move, Rotate, Zoom, Settings, Snapshot), and structured so additional help content can be appended later without restructuring the section.

#### Scenario: Viewing keyboard shortcuts in About
- **WHEN** the user opens the About panel
- **THEN** the Aide section displays the current keyboard-shortcut groups and key labels, including the settings-tab shortcuts (Presets, Navigation, Palettes, Animation, Performance, About)

### Requirement: About panel Crédits section
The About panel SHALL include a "Crédits" section presenting the "Made with WebGPU" credit (with a link to wgpu.rs), a link to the project's GitHub repository, and a short description of the creator and the underlying technologies used.

#### Scenario: Viewing credits in About
- **WHEN** the user opens the About panel
- **THEN** the Crédits section displays the WebGPU credit link, the GitHub repository link, and the creator/technology description

### Requirement: About panel Présentation call-to-action
The About panel SHALL include a call-to-action inviting the user to open the full presentation, linking to the presentation site.

#### Scenario: Opening the presentation from About
- **WHEN** the user activates the presentation call-to-action in the About panel
- **THEN** the presentation site opens (same destination as the previously-removed footer "Présentation" link)
