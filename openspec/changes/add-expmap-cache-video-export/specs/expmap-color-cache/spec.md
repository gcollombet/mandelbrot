## ADDED Requirements

### Requirement: Static color eligibility
Le créateur SHALL analyser tous les stops et les effets actifs. En mode normal, il SHALL refuser les effets dépendants de la vue ou du temps sans les désactiver silencieusement. L'apparence et le domaine profond SHALL être figés dans le manifeste.

#### Scenario: Compatible static palette
- **WHEN** les couleurs sont indépendantes de la vue et du temps
- **THEN** la production calcule directement les échantillons ExpMap sur le GPU

#### Scenario: Reflective material
- **WHEN** un shading dépendant de la vue est actif
- **THEN** une explication indique pourquoi la cuisson RGB est inéligible

### Requirement: Single tiled TIFF format
Le document SHALL utiliser uniquement le manifeste v4 et des TIFF RGBA8 opaques sRGB à tuiles Deflate indépendantes. Une tuile SHALL couvrir un doublement. Le regroupement SHALL être calculé selon les limites d’offset et de dimensions du TIFF classique, sans limite fixe de doublements. Le codec SHALL utiliser les flux Deflate natifs ; le lecteur SHALL charger une plage de fichier par tuile sans décompresser le TIFF entier. Les anciens formats SHALL être refusés sans conversion ni lecteur historique.

#### Scenario: Individual tile read
- **WHEN** le lecteur a besoin d'un doublement absent de son tampon
- **THEN** il lit et vérifie seulement le payload indexé de cette tuile, le décompresse et le transfère en RGBA au GPU

#### Scenario: Interrupted production
- **WHEN** l'écriture ou la publication est interrompue
- **THEN** la reprise conserve les tuiles publiées et recalcule uniquement la tuile inachevée et la suite

#### Scenario: Old cache selected
- **WHEN** un manifeste d'un ancien format est attaché
- **THEN** il est refusé et ses fichiers ne sont pas modifiés

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
