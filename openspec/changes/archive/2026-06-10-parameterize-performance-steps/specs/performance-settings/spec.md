# Purpose
Defines how the application exposes and preserves the two performance step controls used by zoom refinement and sentinel seeding.

# Requirements

## Requirement: Configure zoom brush step
The system SHALL expose a Performance control for the minimum brush refinement step used during zoom. The control SHALL default to `1` and SHALL allow only power-of-two values from `1` through `64`.

#### Scenario: Default zoom brush step
- **WHEN** the page loads with no saved performance settings
- **THEN** the zoom brush step control is set to `1`

#### Scenario: User changes zoom brush step
- **WHEN** a user selects an allowed zoom brush step value
- **THEN** the application uses that value for subsequent zoom refinement

## Requirement: Configure sentinel seed step
The system SHALL expose a Performance control for the sentinel seed step used to initialize progressive refinement. The control SHALL default to `64` and SHALL allow only power-of-two values from `1` through `4096`.

#### Scenario: Default sentinel seed step
- **WHEN** the page loads with no saved performance settings
- **THEN** the sentinel seed step control is set to `64`

#### Scenario: User changes sentinel seed step
- **WHEN** a user selects an allowed sentinel seed step value
- **THEN** the application uses that value for subsequent sentinel seeding

## Requirement: Persist performance step settings
The system SHALL persist the selected zoom brush step and sentinel seed step in browser storage and SHALL restore them on startup.

#### Scenario: Reload restores performance settings
- **WHEN** a user changes both performance step values and reloads the app
- **THEN** the previously selected values are restored

#### Scenario: Existing users keep defaults
- **WHEN** a user upgrades from a version that did not persist these settings
- **THEN** the application falls back to the defined default values without error
