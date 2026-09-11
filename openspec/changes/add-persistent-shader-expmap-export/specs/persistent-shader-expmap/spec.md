## ADDED Requirements

### Requirement: Persistent data before color
The system SHALL produce a versioned, resumable source before color with separate angular and radial densities, bounded block transfers and explicit orbit-configuration identity. Existing RGB v5 documents SHALL remain readable.

#### Scenario: Radial density increases
- **WHEN** radial density doubles and angular density remains fixed
- **THEN** source sample count approximately doubles, accounting for halos and alignment, and estimated disk usage is updated before production

#### Scenario: Production is interrupted
- **WHEN** writing a block fails or the user cancels
- **THEN** only completely written and verified blocks are published and a subsequent resume uses the last valid checkpoint

### Requirement: Reusable shading information
The stored geometry SHALL retain the information needed for shading throughout the declared scale and transformation domain. The system MUST NOT advertise faithful full shading merely because existing display textures were saved.

#### Scenario: Geometry saturates before storage
- **WHEN** two source geometries collapse to the same stored representation but require different destination shading inputs
- **THEN** the representation fails the fidelity gate and is revised before publication as a complete shader source

### Requirement: Creative playback
The reader SHALL support palette, material, timing, rotation and existing ExpMap transformations within the stored data's declared coverage and calculation contract, applying spatial AA in linear light.

#### Scenario: A new video recipe uses the same source
- **WHEN** palette, zoom speed or rotation changes without changing the orbit calculation contract
- **THEN** the system renders a new video from the source without repeating orbit calculation

#### Scenario: Orbit configuration changes
- **WHEN** a requested setting requires orbit information not stored in the source
- **THEN** the reader identifies the incompatibility and requires a new source instead of silently reusing incompatible data
