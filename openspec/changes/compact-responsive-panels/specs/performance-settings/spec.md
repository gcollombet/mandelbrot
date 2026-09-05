## ADDED Requirements
### Requirement: Effective performance controls
The panel SHALL omit the ineffective Epsilon control and static Max skip field, expose quality controls first, and disclose advanced calculation and diagnostic settings separately.
#### Scenario: Default panel
- **WHEN** Performance opens
- **THEN** resolution, target cadence, AA samples and automatic AA are primary and advanced controls are collapsed.
### Requirement: Unambiguous calculation mode
The panel SHALL display the selected approximation mode honestly and explain when exact orbit traps suppress block skipping or animations suppress automatic AA.
#### Scenario: Forced algorithm
- **WHEN** a legacy algorithm is selected
- **THEN** its name is displayed instead of Auto.
