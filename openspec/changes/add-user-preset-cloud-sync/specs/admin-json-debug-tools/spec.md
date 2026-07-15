## ADDED Requirements

### Requirement: JSON file tools are admin-only
The system SHALL render file-based JSON import and export controls only for authenticated admins and SHALL treat them as debug and maintenance tools.

#### Scenario: Admin views JSON tools
- **WHEN** an authenticated admin views controls for navigation presets, complete presets, palettes, stop presets, or performance diagnostics
- **THEN** the applicable JSON import and export controls are available

#### Scenario: Authenticated user views library controls
- **WHEN** an authenticated non-admin user views any library or diagnostics panel
- **THEN** file-based JSON import and export controls are absent from the rendered UI

#### Scenario: Guest views library controls
- **WHEN** an unsigned guest views any library or diagnostics panel
- **THEN** file-based JSON import and export controls are absent from the rendered UI

### Requirement: Admin JSON imports respect personal quotas
The system SHALL apply the same personal-library validation, GUID identity, and account quotas to records imported from JSON by an admin.

#### Scenario: Admin imports JSON within quota
- **WHEN** an admin imports valid JSON records that fit within the admin account's remaining personal quota
- **THEN** the records enter the admin's personal library and synchronize through the normal personal persistence path

#### Scenario: Admin JSON import exceeds quota
- **WHEN** an admin JSON import would exceed a personal quota
- **THEN** the system rejects the over-limit import without bypassing the quota because of the admin role

### Requirement: Image import remains a user feature
The system SHALL keep tile and skybox image import controls available to guests and authenticated users independently of admin-only JSON tooling.

#### Scenario: Ordinary user imports an image
- **WHEN** a guest or authenticated non-admin opens the texture or skybox library
- **THEN** the image import control remains available and uses the personal texture normalization and quota rules applicable to that identity

### Requirement: Guest-to-account import is not a JSON tool
The system SHALL keep the internal guest-library import offer available to every authenticated user regardless of admin role.

#### Scenario: Non-admin signs in with guest content present
- **WHEN** an ordinary authenticated user signs in on a browser with eligible guest content
- **THEN** the all-or-nothing guest-library import offer is shown even though JSON file controls remain hidden
