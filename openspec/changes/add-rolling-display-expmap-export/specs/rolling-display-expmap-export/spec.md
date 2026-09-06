## ADDED Requirements

### Requirement: Explicit temporary geometry export source
Le système SHALL proposer une source d'export temporaire distincte des documents RGB persistants. Il SHALL accepter en première version un centre fixe et un zoom entrant monotone avec pauses et rotations, et SHALL refuser les parcours incompatibles avant calcul.

#### Scenario: Save a recipe
- **WHEN** une configuration est enregistrée
- **THEN** elle est identifiée comme recette nécessitant du calcul, sans garantie de cache persistant rejouable

#### Scenario: Reverse the zoom
- **WHEN** le parcours inverse son sens
- **THEN** ce mode refuse le parcours avec une raison explicite

### Requirement: Complete raw display set and validated shading adapter
Le cache SHALL conserver les plans complets à 48 octets par texel hors overhead et versionner leurs conventions. L'adaptateur SHALL démontrer sa validité face aux unités, normalisations, clamps et quantifications avant intégration du pipeline complet. Il SHALL conserver color.wgsl inchangé et SHALL NOT promettre les chemins analytiques nécessitant des données absentes.

#### Scenario: Lost information prevents adaptation
- **WHEN** une comparaison révèle qu'une donnée clampée ne permet pas la transformation requise
- **THEN** la validation échoue et la conception est réexaminée avant de déclarer le mode compatible

### Requirement: Resolution dependent complete coverage
Le planificateur SHALL calculer la fenêtre depuis la résolution et le filtre, inclure une réserve de production et une fermeture centrale finie. Les 15–16 doublements SHALL rester une estimation 4K. Toute frame SHALL attendre sa couverture complète.

#### Scenario: Producer is late
- **WHEN** une couronne ou le centre manque
- **THEN** l'export attend sans émettre de frame incomplète et sans croissance non bornée des files

### Requirement: Safe bounded disk recycling
Le stockage SHALL borner RAM, GPU et disque en incluant les écritures temporaires et transferts. Il SHALL distinguer index logique et emplacement physique, publier les générations complètes et épingler les blocs jusqu'à la fin de tous leurs lecteurs. Il SHALL recycler seulement les blocs sans lecteur et sans utilisation future dans le parcours.

#### Scenario: Delayed GPU consumer
- **WHEN** un bloc sorti de la fenêtre logique reste utilisé par le GPU
- **THEN** son emplacement ne peut pas être écrasé avant la fin du travail associé

#### Scenario: Insufficient capacity
- **WHEN** le budget ne permet pas couverture et buffers de travail
- **THEN** le préflight refuse le lancement avec l'estimation nécessaire

### Requirement: Deterministic lifecycle and honest resume
Le runner SHALL conserver ordre, timestamps et nombre de frames malgré les attentes. Les checkpoints SHALL décrire seulement les blocs encore disponibles. L'annulation SHALL respecter la propriété des fichiers et les contrats du sink vidéo. Les mesures SHALL distinguer calcul, écriture, lecture, adaptation, shading, encodage et pics mémoire/disque.

#### Scenario: Resume with expired blocks
- **WHEN** une reprise nécessite des blocs recyclés
- **THEN** elle annonce le recalcul nécessaire ou refuse cette reprise sans prétendre disposer du parcours complet

#### Scenario: Static validation only
- **WHEN** seules les vérifications statiques ont été exécutées
- **THEN** aucune performance ni fidélité visuelle matérielle n'est annoncée comme mesurée
