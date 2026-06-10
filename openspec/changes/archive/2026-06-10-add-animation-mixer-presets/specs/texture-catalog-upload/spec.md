## ADDED Requirements

### Requirement: Upload animation presets to shared catalog
The system SHALL allow admin users to upload animation presets to the shared Firebase catalog as first-class `animationPreset` entries.

#### Scenario: Successful animation preset upload
- **WHEN** an admin user uploads an animation preset
- **THEN** the system writes a Firestore catalog entry under the animation preset catalog type and records remote catalog status in local IndexedDB

#### Scenario: Animation preset name conflict
- **WHEN** an admin user uploads an animation preset whose name conflicts with an existing remote animation preset owned by another GUID
- **THEN** the system blocks overwrite and presents the existing catalog conflict behavior

### Requirement: Sync remote animation presets
The system SHALL sync remote animation preset metadata and payloads into the local animation preset store.

#### Scenario: Remote animation preset is newer
- **WHEN** the shared catalog contains an animation preset with a newer `lastUpdated` value than the local preset with the same GUID
- **THEN** the system fetches the remote entry and updates the local animation preset record

#### Scenario: Local animation preset is current
- **WHEN** the local animation preset has the same or newer `lastUpdated` value than the remote metadata
- **THEN** the system does not overwrite the local preset during sync
