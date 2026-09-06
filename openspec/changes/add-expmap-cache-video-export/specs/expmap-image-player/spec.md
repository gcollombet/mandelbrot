## ADDED Requirements

### Requirement: Standalone RGB image player
Le lecteur SHALL ouvrir un document RGB complet et proposer zoom, dézoom et rotation dans son domaine, sans itérations ni shading. L'apparence SHALL rester cuite.

#### Scenario: Reopen and navigate
- **WHEN** un document compatible est ouvert
- **THEN** l'utilisateur navigue à son rythme sans précalcul

### Requirement: Bounded shared reconstruction
Source, décodage, filtrage linéaire et composition SHALL être partagés avec l'export. Les budgets SHALL être bornés et les requêtes interactives périmées écartées.

#### Scenario: Data not ready
- **WHEN** des blocs manquent en mémoire
- **THEN** les contrôles restent disponibles et la dernière vue complète est conservée pendant chargement

#### Scenario: Document switch
- **WHEN** un ancien travail finit après changement de document
- **THEN** sa sortie n'est pas publiée dans la nouvelle vue

### Requirement: Safe domain and lifecycle
Le lecteur SHALL respecter les limites utilisateur, vérifier l'accès et libérer ses ressources sans modifier les données persistantes.

#### Scenario: Zoom exceeds limit
- **WHEN** une vue sort du domaine validé
- **THEN** elle est bornée/refusée sans recalcul ni extension implicite

### Requirement: GPU view reconstruction
Projection, interpolation en lumière linéaire et composition SHALL utiliser le même shader WebGPU dans le lecteur et la vidéo. Le CPU SHALL gérer les fichiers, codecs et transferts de pages, sans reconstruire les pixels de sortie. Le chemin de production SHALL NOT utiliser le renderer CPU de référence en repli implicite.

#### Scenario: GPU page residency exceeded
- **WHEN** une vue requiert plus de pages que le budget VRAM
- **THEN** elle est partitionnée et reconstruite sur GPU, sans readback des pixels de sortie

#### Scenario: Video frame submission
- **WHEN** une frame GPU est complète
- **THEN** le sink vidéo reçoit un VideoFrame du canvas et demande l'accélération matérielle sans prétendre garantir le choix du navigateur

### Requirement: Fourteen tile circular streaming
Le lecteur SHALL conserver quatorze tuiles GPU : jusqu'à treize pour la vue et une pour anticipation. Il SHALL réaliser au plus un décodage natif simultané. Une frame résidente SHALL NOT déclencher une nouvelle lecture, décompression ou import de tuile. Une prélecture obsolète SHALL NOT écraser la fenêtre courante.

#### Scenario: Move within resident doublings
- **WHEN** la fenêtre requise est déjà résidente
- **THEN** le lecteur dessine directement avec les textures conservées, sans attendre une prélecture indépendante

#### Scenario: Seek during prefetch
- **WHEN** la caméra saute vers un autre domaine pendant une prélecture
- **THEN** la tuile obsolète est abandonnée avant upload si son emplacement est nécessaire à la nouvelle fenêtre
