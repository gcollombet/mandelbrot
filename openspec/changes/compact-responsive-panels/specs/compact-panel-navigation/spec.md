## ADDED Requirements
### Requirement: Automatic compact panels
The viewer SHALL choose layout by panel content and available space, retain visible titles and close controls, and provide expandable bottom sheets on narrow portrait screens.
#### Scenario: Mobile palette
- **WHEN** the palette opens at 390px width
- **THEN** the title, close control, gradient and contextual controls fit without horizontal clipping and the sheet can expand.
### Requirement: Contextual content
Palette, animation, navigation, presets, video and help SHALL expose primary content first and move secondary libraries, inactive effects and transfers behind explicit labeled controls.
#### Scenario: Palette library
- **WHEN** the palette library is selected
- **THEN** editing toolbars do not precede the gallery and a compact gradient remains available.
### Requirement: Numeric input
Numeric fields SHALL support direct value editing, keyboard operation and vertical touch scrolling without accidental value changes.
#### Scenario: Touch input
- **WHEN** the user taps a value
- **THEN** its labeled numeric editor opens without requiring double click.
