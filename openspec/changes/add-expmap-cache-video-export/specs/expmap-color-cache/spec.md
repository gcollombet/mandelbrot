## ADDED Requirements

### Requirement: Static color eligibility
Le créateur SHALL analyser tous les stops et les effets actifs. Il SHALL refuser les effets dépendants de la vue ou du temps sans les désactiver silencieusement. L'apparence et le domaine profond SHALL être figés dans le manifeste.

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
