## REMOVED Requirements

### Requirement: Configure zoom brush step
**Reason**: Le raffinement spatial et son pas minimum sont supprimés; conserver le contrôle n'aurait plus d'effet défini.

**Migration**: Retirer le contrôle de l'interface et ignorer toute valeur `zoom brush step` déjà persistée.

#### Scenario: Ancienne valeur persistée
- **WHEN** une session contient encore une valeur de zoom brush step
- **THEN** l'application l'ignore et initialise les texels exposés comme requêtes exactes au pas 1

### Requirement: Configure sentinel seed step
**Reason**: Le moteur n'amorce plus de grille de sentinelles et utilise exclusivement des requêtes exactes au pas 1.

**Migration**: Retirer le contrôle de l'interface et ignorer toute valeur `sentinel seed step` déjà persistée.

#### Scenario: Ancienne valeur persistée
- **WHEN** une session contient encore une valeur de sentinel seed step
- **THEN** l'application l'ignore et amorce le rendu au pas 1

### Requirement: Persist performance step settings
**Reason**: Les deux réglages concernés sont supprimés et ne doivent plus être restaurés.

**Migration**: Cesser de lire et d'écrire leurs clés; les clés historiques peuvent être supprimées sans migration utilisateur.

#### Scenario: Rechargement après mise à niveau
- **WHEN** un utilisateur recharge l'application avec les anciennes clés présentes
- **THEN** le chargement réussit sans réintroduire les contrôles ni modifier le rendu au pas 1
