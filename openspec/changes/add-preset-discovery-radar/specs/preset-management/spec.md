## ADDED Requirements

### Requirement: Complete presets exclude map discovery state
The system SHALL treat map pin visibility, radar discovery activation, radar pulse progress, and selected discovery candidates as exploration UI state rather than complete preset content.

#### Scenario: Save complete preset while discovery is active
- **WHEN** the user saves a complete preset while radar discovery mode or map preset pins are active
- **THEN** the stored preset record does not contain radar discovery state, radar pulse state, selected discovery candidates, or map pin visibility state

#### Scenario: Load complete preset with current discovery state
- **WHEN** the user loads a complete preset while a map pin or radar discovery preference exists in the current session
- **THEN** loading the preset does not change that exploration state except where discovery mode exits because the preset load changes the navigation context

#### Scenario: Load legacy preset containing pin visibility
- **WHEN** the user loads an older complete preset that contains a map pin visibility field
- **THEN** the system ignores that field and does not use it to enable or disable map pins
