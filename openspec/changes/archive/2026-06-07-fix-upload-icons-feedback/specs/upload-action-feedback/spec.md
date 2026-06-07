## ADDED Requirements

### Requirement: Upload action appears left of favorite action
The system SHALL display upload action controls to the left of heart/favorite controls anywhere both actions are shown for the same catalog item.

#### Scenario: Preset row with upload and favorite actions
- **WHEN** an admin views a preset row that includes both upload and favorite actions
- **THEN** the upload icon is displayed to the left of the heart icon without overlap

#### Scenario: Texture row with upload and favorite actions
- **WHEN** an admin views a texture row that includes both upload and favorite actions
- **THEN** the upload icon is displayed to the left of the heart icon without overlap

#### Scenario: Palette row with upload and favorite actions
- **WHEN** an admin views a palette row that includes both upload and favorite actions
- **THEN** the upload icon is displayed to the left of the heart icon without overlap

### Requirement: Upload actions do not obscure row content
The system SHALL keep upload and favorite action controls visually separate from thumbnails, names, and other selectable row content.

#### Scenario: Dropdown row content remains readable
- **WHEN** a dropdown row renders upload and favorite controls alongside a thumbnail and label
- **THEN** the action controls do not overlap the thumbnail, label, or each other

### Requirement: Successful upload feedback
The system SHALL provide visible feedback after an upload completes successfully.

#### Scenario: Upload completes successfully
- **WHEN** an admin triggers an upload and the upload operation completes successfully
- **THEN** the UI shows a visible success indication for the uploaded item

#### Scenario: Upload fails
- **WHEN** an admin triggers an upload and the upload operation fails
- **THEN** the UI does not show success feedback for that item

#### Scenario: Success feedback clears automatically
- **WHEN** success feedback is shown after a completed upload
- **THEN** the feedback clears automatically without requiring another user action
