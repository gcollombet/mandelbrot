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

### Requirement: Visible playback transport
Le lecteur SHALL afficher une identité « LECTEUR EXPMAP », le nom du document, un bouton Quitter permanent et une timeline. Il SHALL proposer lecture/pause, sauts de cinq secondes, retour au début, vitesses 0,25× à 4×, zoom/dézoom, boucle, rotation et plein écran lorsque disponible. La vitesse 1× SHALL correspondre à deux doublements par seconde. Échap SHALL fermer le lecteur et restaurer la session ; Espace SHALL contrôler la lecture hors champs et boutons. La lecture SHALL être mise en pause lorsque la page est masquée.

#### Scenario: Slow frame during playback
- **WHEN** une image est encore en cours de rendu
- **THEN** le transport attend sa publication avant d’en demander une nouvelle, sans annulations répétées susceptibles de bloquer l’affichage

#### Scenario: End of playback
- **WHEN** la lecture atteint une borne
- **THEN** elle s’arrête exactement à cette borne ou repart en boucle selon l’option choisie

#### Scenario: Exit the player
- **WHEN** l’utilisateur clique Quitter ou appuie sur Échap
- **THEN** la lecture s’arrête, les ressources sont libérées et la session Mandelbrot est restaurée
