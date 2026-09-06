## ADDED Requirements

### Requirement: Saved ExpMap render catalogue
Le système SHALL proposer une bibliothèque locale de rendus ExpMap avec id stable, nom, vignette, plage de zoom, qualité, taille et état. Bibliothèque, lecteur et export SHALL utiliser le même catalogue et SHALL distinguer document rendu et preset de paramètres.

#### Scenario: Reopen a completed render
- **WHEN** l'utilisateur sélectionne un rendu prêt après une nouvelle session
- **THEN** son document peut être rouvert après vérification d'accès sans nouveau précalcul

#### Scenario: Interrupted preparation
- **WHEN** la préparation est interrompue
- **THEN** son entrée reste identifiable et reprenable mais non sélectionnable comme source d'export complet

### Requirement: Canonical start and end zoom metadata
Le manifeste SHALL conserver les échelles canoniques de début et de fin, centre, convention d'échelle et domaine utilisateur, sans conversion destructive en nombre machine. Le domaine lisible SHALL exclure les douze doublements de couverture interne et les halos.

#### Scenario: Extreme deep zoom round trip
- **WHEN** un document de profondeur dépassant la plage de Number est enregistré puis rouvert
- **THEN** ses bornes et leur ordre sont conservés exactement dans la représentation canonique

### Requirement: Shared selection and file recovery
Le catalogue SHALL conserver un localisateur de données et vérifier identité, version et accès à l'ouverture. Il SHALL permettre rattachement d'un document déplacé. Les gros blocs SHALL rester hors du catalogue de métadonnées.

#### Scenario: Missing or inaccessible folder
- **WHEN** le dossier ne peut plus être lu
- **THEN** l'entrée reste visible avec son état et permet de renouveler l'accès ou rattacher le bon document, sans recalcul implicite

#### Scenario: Use in video
- **WHEN** l'utilisateur choisit Utiliser en vidéo sur un rendu prêt
- **THEN** le panneau vidéo sélectionne le même document sans lancer immédiatement l'encodage

#### Scenario: Remove catalogue entry
- **WHEN** l'utilisateur retire une entrée de la bibliothèque
- **THEN** les fichiers du rendu ne sont pas supprimés implicitement
