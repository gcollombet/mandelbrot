## ADDED Requirements

### Requirement: Injectable animation time source
The system SHALL evaluate animation tracks against an injectable time source rather than reading wall-clock time directly. In real-time rendering the source SHALL remain the engine's accumulated wall-clock time; during a video export session the source SHALL be `frameIndex / fps`.

#### Scenario: Real-time playback unchanged
- **WHEN** animation tracks play during normal interactive rendering
- **THEN** their phase advances from the engine's accumulated wall-clock time exactly as before

#### Scenario: Export drives tracks from the frame index
- **WHEN** a video export session renders frame `n` at `fps` frames per second
- **THEN** every enabled track is evaluated at time `n / fps`, independently of how long that frame took to converge

#### Scenario: Track phase is reproducible across exports
- **WHEN** the same parcours with the same enabled tracks is exported twice
- **THEN** each track holds the same phase on the same frame index in both outputs

#### Scenario: Time source restored after export
- **WHEN** an export session ends or is cancelled
- **THEN** animation tracks resume reading the wall-clock source without a visible phase jump in the recipe values
