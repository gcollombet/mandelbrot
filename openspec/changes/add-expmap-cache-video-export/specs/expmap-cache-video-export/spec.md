## ADDED Requirements

### Requirement: Export consumes an existing ExpMap image
L’export SHALL prendre en entrée une image ExpMap complète et compatible, une animation de caméra et les paramètres de sortie. Il SHALL utiliser le lecteur/compositeur partagé et SHALL NOT préparer ou étendre implicitement le document. Les modes existants SHALL conserver leur comportement.

#### Scenario: Export from a loaded image
- **WHEN** l’utilisateur choisit une image ExpMap valide et une animation dans son domaine
- **THEN** le runner reconstruit et encode les frames sans session de production du cache

#### Scenario: Incomplete document or out-of-range animation
- **WHEN** le document est incomplet ou le parcours dépasse son domaine
- **THEN** l’export est refusé avec une explication et la création/extension reste une opération distincte

### Requirement: Bounded color reader without field computation
Le lecteur SHALL charger et décoder avec budgets RAM/GPU, files bornées et backpressure, en respectant les limites format de cache et matérielles. Il SHALL NOT calculer d'orbites, construire des références ni réévaluer palette ou matériaux pendant la lecture.

#### Scenario: Frame working set exceeds budget
- **WHEN** les contributions d'une frame dépassent la mémoire disponible
- **THEN** la reconstruction est partitionnée sans changer son filtre ni charger le cache entier

#### Scenario: Cache-only export
- **WHEN** un cache complet est exporté
- **THEN** l'instrumentation compte zéro itération, zéro construction de référence et zéro passe de shading

#### Scenario: Slow decoding
- **WHEN** une couleur nécessaire n'est pas encore décodée
- **THEN** la frame attend sans trou ni croissance non bornée des files

### Requirement: Linear-light reconstruction and continuous seams
Le compositeur SHALL convertir les couleurs décodées dans l'espace linéaire avant leur moyenne. Il SHALL tenir compte du mapping régulier par doublement, des halos angulaires et radiaux et du centre précalculé. Le profil SHALL distinguer densité stockée, budget de taps et précision de stockage.

#### Scenario: Crossing the band-tail junction
- **WHEN** une empreinte traverse la jonction pendant un zoom
- **THEN** sa couverture et son filtrage suivent le profil sans trou ni marche due à une erreur d'indexation

#### Scenario: Rotation across the seam
- **WHEN** la vue traverse la couture angulaire
- **THEN** les contributions sont périodiques et ne lisent pas le padding comme donnée utile

#### Scenario: Different partitioning
- **WHEN** la même frame utilise un budget résident différent
- **THEN** les contributions reconstruites sont identiques dans les tolérances du profil et du décodeur définies

### Requirement: Preserve encoding lifecycle and stored cache
Le runner SHALL réutiliser le sink vidéo final, ses timestamps, backpressure, finalisation et annulation. La session SHALL être restaurée après terminaison ou erreur ; le cache SHALL rester disponible après annulation de l'export.

#### Scenario: Cancel export
- **WHEN** l'utilisateur annule pendant la lecture/reconstruction ou l'encodage final
- **THEN** les ressources sont libérées selon leurs contrats et les tuiles validées sont conservés

### Requirement: Compressed resource and quality reporting
Le système SHALL distinguer octets RGB bruts, taille compressée, overhead, mémoire et coûts de production, écriture, lecture, décodage, reconstruction et encodage final.

#### Scenario: Static checks only
- **WHEN** seuls les tests statiques ont été exécutés
- **THEN** aucune fidélité GPU ou vitesse matérielle n'est déclarée mesurée

### Requirement: Shared renderer with deterministic frame scheduling
L’export SHALL utiliser le même mapping, lecture/reconstruction et filtrage que le lecteur interactif. Il SHALL attendre chaque frame requise dans l’ordre, sans appliquer la suppression des requêtes périmées propre à l’interaction.

#### Scenario: Interactive and exported view comparison
- **WHEN** une vue interactive complète et une frame exportée utilisent la même caméra, résolution et qualité
- **THEN** leurs pixels avant encodage concordent dans les tolérances numériques définies

#### Scenario: Slow frame in export
- **WHEN** la lecture/reconstruction d’une frame prend plus longtemps que sa durée de présentation
- **THEN** le runner attend et conserve le nombre et l’ordre des frames de l’animation

### Requirement: Select a saved render and its zoom window
La section Source SHALL permettre de choisir une image ExpMap enregistrée et prête. La section Parcours SHALL initialiser Départ et Arrivée à son domaine utilisateur et permettre une sous-fenêtre précise, y compris en dézoom. Les réglages d'export SHALL être distincts des métadonnées du document.

#### Scenario: Trim the rendered interval
- **WHEN** l'utilisateur choisit deux bornes internes au domaine
- **THEN** seule cette fenêtre est animée sans modifier le document ni recalculer ses couleurs

#### Scenario: Select unavailable or incomplete render
- **WHEN** une entrée n'est pas prête ou accessible
- **THEN** l'export reste désactivé avec une raison explicite

### Requirement: Linked logarithmic zoom speed and duration
Le panneau SHALL exprimer la vitesse en doublements par seconde et synchroniser Durée selon la distance logarithmique entre bornes. La vitesse SHALL être indépendante du fps. Les calculs SHALL préserver les échelles profondes et leurs différences.

#### Scenario: Constant zoom speed
- **WHEN** une fenêtre de 20 doublements est choisie à 2 doublements par seconde
- **THEN** la durée vaut 10 secondes et le zoom progresse uniformément en profondeur logarithmique

#### Scenario: Edit range at chosen speed
- **WHEN** l'utilisateur modifie la fenêtre
- **THEN** la vitesse choisie est conservée et la durée est recalculée

#### Scenario: Stationary depth
- **WHEN** Départ et Arrivée ont la même échelle
- **THEN** une durée positive permet pause ou rotation, la vitesse de zoom affichée vaut zéro et aucune division par zéro n'a lieu

#### Scenario: Restore per-document preferences
- **WHEN** une image enregistrée est resélectionnée
- **THEN** sa dernière fenêtre compatible est restaurée ou le domaine complet est utilisé, sans reprendre une fenêtre hors limites d'un autre document

### Requirement: GPU view reconstruction
Projection, interpolation en lumière linéaire et composition SHALL utiliser le même shader WebGPU dans le lecteur et la vidéo. Le CPU SHALL gérer les fichiers, codecs et transferts de pages, sans reconstruire les pixels de sortie. Le chemin de production SHALL NOT utiliser le renderer CPU de référence en repli implicite.

#### Scenario: GPU page residency exceeded
- **WHEN** une vue requiert plus de pages que le budget VRAM
- **THEN** elle est partitionnée et reconstruite sur GPU, sans readback des pixels de sortie

#### Scenario: Video frame submission
- **WHEN** une frame GPU est complète
- **THEN** le sink vidéo reçoit un VideoFrame du canvas et demande l'accélération matérielle sans prétendre garantir le choix du navigateur

### Requirement: Single renderer allocation during export
L'export SHALL utiliser le même renderer à quatorze tuiles que le lecteur et SHALL libérer le lecteur interactif avant son allocation. Les frames SHALL être transmises du canvas GPU au sink vidéo sans reconstruction CPU.

#### Scenario: Export from an open player
- **WHEN** une vidéo démarre alors que le lecteur est ouvert
- **THEN** son tampon est libéré avant l'allocation du tampon vidéo
