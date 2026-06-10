## ADDED Requirements

### Requirement: Save texture mapping presets locally
The system SHALL allow users to save the active texture mapping as a named texture mapping preset in local IndexedDB storage.

#### Scenario: User saves active texture mapping
- **WHEN** the user saves the active texture mapping with a name
- **THEN** the system stores a texture mapping preset containing a GUID, name, mapping configuration, date, lastUpdated timestamp, favorite state, and optional remote metadata

### Requirement: Apply saved texture mapping presets
The system SHALL allow users to apply a saved texture mapping preset to the active renderer state.

#### Scenario: User applies a texture mapping preset
- **WHEN** the user selects a saved texture mapping preset
- **THEN** the system copies that preset's mapping configuration into the active texture mapping and updates the renderer

### Requirement: Favorite texture mapping presets
The system SHALL allow users to mark texture mapping presets as favorites while keeping favorite state local to the browser.

#### Scenario: User toggles texture mapping preset favorite
- **WHEN** the user toggles the favorite button for a texture mapping preset
- **THEN** the system persists the favorite state locally without requiring remote upload

### Requirement: Sync texture mapping presets from remote catalog
The system SHALL sync shared texture mapping presets through the remote catalog using GUID and lastUpdated metadata while preserving local-only fields.

#### Scenario: Remote texture mapping preset is newer
- **WHEN** remote metadata contains a texture mapping preset GUID that is missing locally or newer than the local record
- **THEN** the system fetches the remote preset payload and saves it into local IndexedDB while preserving local favorite state when updating an existing GUID

### Requirement: Upload texture mapping presets
The system SHALL allow admin users to upload texture mapping presets to the shared remote catalog.

#### Scenario: Admin uploads texture mapping preset
- **WHEN** an admin user clicks upload for a texture mapping preset
- **THEN** the system writes the preset to the remote catalog by GUID and updates the local remote metadata after the upload succeeds

#### Scenario: Non-admin views texture mapping preset list
- **WHEN** a non-admin user views texture mapping presets
- **THEN** upload controls for texture mapping presets are not shown

### Requirement: Preserve local-first behavior
The system SHALL apply and render texture mapping presets from local IndexedDB records after any best-effort remote synchronization.

#### Scenario: Remote sync fails
- **WHEN** remote texture mapping preset synchronization fails
- **THEN** the system continues to list and apply locally stored texture mapping presets
