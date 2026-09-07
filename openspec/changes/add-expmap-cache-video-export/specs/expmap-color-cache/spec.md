## ADDED Requirements

### Requirement: Static color eligibility
Le créateur SHALL analyser tous les stops et les effets actifs. En mode normal, il SHALL refuser les effets dépendants de la vue ou du temps sans les désactiver silencieusement. L'apparence et le domaine profond SHALL être figés dans le manifeste.

#### Scenario: Compatible static palette
- **WHEN** les couleurs sont indépendantes de la vue et du temps
- **THEN** la production calcule directement les échantillons ExpMap sur le GPU

#### Scenario: Reflective material
- **WHEN** un shading dépendant de la vue est actif
- **THEN** une explication indique pourquoi la cuisson RGB est inéligible

### Requirement: Single portable image container
Le document SHALL utiliser uniquement le manifeste v5 dans un fichier ZIP64 STORE .expmap, choisi via Enregistrer sous, avec métadonnées, miniature et une image WebP native par doublement. La qualité SHALL être réglable et enregistrée pour la reprise. Les images SHALL être indexées et vérifiées individuellement, sans chargement du document entier. Les anciens formats SHALL être refusés sans migration.

#### Scenario: Individual image read
- **WHEN** le lecteur a besoin d'un doublement absent
- **THEN** il lit cette entrée, vérifie son hash, la décode nativement et importe son bitmap au GPU

#### Scenario: Interrupted production
- **WHEN** le calcul est interrompu
- **THEN** les images complètes sont conservées et le fichier est finalisé sans recommencer leurs calculs

#### Scenario: Finalization failure
- **WHEN** la copie finale échoue ou l'onglet se ferme
- **THEN** les checkpoints internes déjà publiés restent récupérables depuis la bibliothèque, sous réserve de disponibilité du stockage du navigateur

### Requirement: Bounded asynchronous encoding
Le producteur SHALL transférer les pixels à un worker utilisant le codec WebP natif, puis calculer le doublement suivant pendant l'encodage et l'écriture du précédent. Il SHALL conserver au plus une sauvegarde en cours et une tuile d'assemblage, hors surfaces internes du codec. Les écritures/checkpoints SHALL rester ordonnés et les erreurs SHALL remonter avant publication complète.

#### Scenario: Slow storage
- **WHEN** le doublement suivant est rempli avant la sauvegarde précédente
- **THEN** la production attend sans allonger la file ni perdre les données

#### Scenario: Encoding failure
- **WHEN** l'encodeur échoue
- **THEN** le producteur interrompt la suite, conserve le dernier checkpoint et libère le worker

### Requirement: Regular twelve doubling coverage
Toutes les tuiles SHALL partager une grille angle × profondeur logarithmique et des halos filtrables. Le document SHALL couvrir douze doublements internes après chaque position utilisateur, sans étendre le domaine navigable. Le reste central SHALL utiliser une couleur du centre précalculée, sans disque ou logo. Le rayon de fermeture SHALL rester inférieur ou égal à un pixel de référence.

#### Scenario: Maximum user zoom
- **WHEN** la vue atteint l'échelle d'arrivée
- **THEN** les tuiles internes et le centre précalculé couvrent toute la sortie

### Requirement: Explicit resource estimates
Le créateur SHALL afficher le coût des quatorze tuiles GPU, d'une tuile décodée et du document brut. Il SHALL refuser un dépassement de capacité sans réduction silencieuse de qualité. Il SHALL NOT garantir un ratio de compression ou un débit non mesuré.

#### Scenario: 4K density one
- **WHEN** la sortie est 3840×2160 avec une densité de un
- **THEN** le budget des quatorze tuiles est affiché à environ 1,11 GiB, hors moteur et encodeur

### Requirement: Eligibility follows active consumers
La phase couleur statique, la moyenne des rayures et la cohérence de direction SHALL être autorisées. Les paramètres et pistes de matériau sans shading actif SHALL NOT bloquer la cuisson. Les pistes de texture sans source texture active SHALL NOT bloquer la cuisson. Une contribution de couleur fixe lorsque l’horloge ou la vitesse est nulle SHALL pouvoir être cuite. La hauteur dépendante de l’échelle, le shading actif et les sources image non figées SHALL rester refusés.

#### Scenario: Phase coloring without shading
- **WHEN** une phase couleur fixe et des paramètres de relief ou reflet sont présents sans shading actif
- **THEN** le document peut être produit sans changer la recette ou le shader

#### Scenario: Active effect on another stop
- **WHEN** un autre stop active le consommateur d’une piste animée
- **THEN** cette piste est examinée comme active sur l’ensemble de la palette

### Requirement: Experimental forced rendering
Une option « Forcer le rendu — expérimental », désactivée par défaut, SHALL permettre de contourner toutes les restrictions d’apparence, y compris shading, hauteur, animations, images externes et diagnostics. Les erreurs de données, capacités matérielles, codec, disque et convergence SHALL rester bloquantes. Le manifeste SHALL enregistrer un booléen forceRender explicite, restauré automatiquement à la reprise ; la bibliothèque SHALL identifier ces documents comme expérimentaux. Aucune migration des manifestes sans ce champ n’est prévue.

#### Scenario: Force incompatible appearance
- **WHEN** le mode expérimental est activé avec une apparence valide mais non compatible
- **THEN** les restrictions deviennent des indications non bloquantes et le producteur utilise la recette intacte, avec l’horloge de cuisson existante fixée à zéro

#### Scenario: Resume experimental cache
- **WHEN** un document expérimental interrompu est repris alors que la case est décochée
- **THEN** le mode forcé du manifeste est utilisé jusqu’au producteur

#### Scenario: Invalid data in experimental mode
- **WHEN** une palette invalide ou une valeur non finie est fournie
- **THEN** la cuisson reste refusée

### Requirement: Continuous baked material scale
Le producteur SHALL dissocier l’ancre de calcul numérique de l’échelle d’apparence. Pour un même point, la hauteur, les gradients et la courbure utilisés pour les matériaux SHALL employer une convention radiale continue indépendante du bloc ou doublement propriétaire. La correction SHALL précéder l’écrêtage et SHALL inclure les gradients orbitaux et les chemins shallow/deep.

#### Scenario: Shared halo sample
- **WHEN** deux blocs ou deux tuiles calculent un même échantillon dans leurs halos
- **THEN** leurs échelles d’apparence concordent à la précision numérique près

#### Scenario: Old interrupted material cache
- **WHEN** un document incomplet produit sans la convention continue est repris
- **THEN** la reprise est refusée avec une demande de nouveau calcul ; les documents d’anciennes versions sont refusés
