## ADDED Requirements

### Requirement: Compact stop preset dropdown
The system SHALL present stop presets in a custom dropdown that can render rich row content, including a visual preview, a label, and inline actions.

#### Scenario: User opens the stop preset chooser
- **WHEN** the user opens the stop preset chooser
- **THEN** the system displays a custom dropdown list rather than a native select element

#### Scenario: Row content is visible
- **WHEN** a stop preset row is rendered
- **THEN** the row can display a preview, the stop preset name, and inline action controls without overlap

### Requirement: Stop preset row preview
The system SHALL render each stop preset row with a compact 32x32 visual preview derived from the preset values.

#### Scenario: Preset with multiple stops
- **WHEN** a stop preset contains color stop data
- **THEN** the row preview shows a compact visual representation of the stop preset in a 32x32 area

#### Scenario: Preset preview is unavailable
- **WHEN** the system cannot generate a row preview
- **THEN** the row still renders the name and action controls without blocking the dropdown

### Requirement: Inline stop preset actions
The system SHALL show favorite and remote upload actions inline on each stop preset row when those actions are available.

#### Scenario: Admin views a stop preset row
- **WHEN** an admin views a stop preset row
- **THEN** the row shows both favorite and remote upload actions

#### Scenario: Guest views a stop preset row
- **WHEN** a guest or unsigned user views a stop preset row
- **THEN** the row shows the favorite action and hides the remote upload action

### Requirement: Compact stop preset layout
The system SHALL keep the stop preset dropdown visually compact while still remaining readable.

#### Scenario: Long stop preset list
- **WHEN** the stop preset list contains many entries
- **THEN** the dropdown remains vertically scrollable and the rows stay compact rather than expanding to card-like height

#### Scenario: Long stop preset name
- **WHEN** a stop preset name exceeds the available row width
- **THEN** the name is truncated with ellipsis instead of forcing the dropdown wider
