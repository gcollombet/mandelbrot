## ADDED Requirements

### Requirement: Continuation analytique de la valeur

Le remplissage d'un texel non-ancre SHALL évaluer la continuation de Taylor du payload de son ancre, `ẑ(δc) = z + z′·δc + ½·z″·δc²`, où `δc` est l'offset en espace paramètre entre le texel et son ancre, plutôt que d'interpoler bilinéairement les quatre ancres du coin de cellule.

#### Scenario: Ancre échappée avec payload exploitable

- **WHEN** un texel sentinelle est rempli, que son ancre est un pixel échappé
  dont le payload quadratique est explicitement valide, et que la prédiction
  reste échappée à l'itération de l'ancre (`|ẑ|² ≥ μ`)
- **THEN** la valeur `z` écrite dans le texel SHALL être `ẑ(δc)` et l'itération lisse SHALL être dérivée de `ẑ(δc)` par la même formule que le chemin d'antialiasing analytique

#### Scenario: Ancre sans payload exploitable

- **WHEN** l'ancre est intérieure, en budget épuisé, porte un payload non fini,
  ou indique que `z″` n'a pas été suivi
- **THEN** le remplissage SHALL retomber spatialement pour la frame courante et
  la sentinelle SHALL rester éligible au raffinement dyadique ordinaire

#### Scenario: Mantisse quadratique profonde non nulle

- **WHEN** au moins une composante finie de la mantisse normalisée de `z″` est
  non nulle mais que sa norme au carré sous-déborde en `f32`
- **THEN** le payload SHALL rester éligible au gate Taylor et SHALL NOT être
  confondu avec une mantisse réellement nulle

#### Scenario: Exposant de `z″` hors de l'échelle de `z′²`

- **WHEN** `z″` reste fini mais que sa représentation normalisée relativement à
  `2·log|z′|` sortirait de la plage utile `f32`
- **THEN** le calcul SHALL conserver `z″` avec une échelle indépendante et le
  payload échappé SHALL encoder sa magnitude en espace logarithmique, sans
  saturer ni invalider la continuation Taylor

#### Scenario: Reprise d'un pixel non terminé

- **WHEN** un pixel Auto épuise son budget de frame avant son verdict
- **THEN** sa mantisse complexe `z″` et son échelle indépendante SHALL être
  stockées dans les couches brutes de continuation puis relues sans les
  rattacher à l'échelle de `z′`

#### Scenario: Saut sans dérivée seconde disponible

- **WHEN** un accélérateur propage `z′` mais n'expose pas la dérivée seconde
  de son application de saut
- **THEN** le pixel SHALL conserver son calcul principal mais son état Taylor
  SHALL être marqué invalide à travers les reprises et SHALL NOT produire de
  certificat à l'échappement

#### Scenario: Prédiction changeant de branche d'itération

- **WHEN** la continuation à l'itération d'échappement de l'ancre produit
  `|ẑ|² < μ`
- **THEN** le texel SHALL conserver le resolve spatial complet, SHALL NOT
  extrapoler la formule log-log sous le bailout et SHALL rester éligible au
  raffinement dyadique ordinaire

### Requirement: Sélection opportuniste sans mélange

Le resolve SHALL évaluer les ancres échappées candidates de la cellule et SHALL
retenir la continuation valide de plus faible distance normalisée au gate. Il
SHALL NOT mélanger plusieurs prédictions Taylor.

#### Scenario: Plusieurs ancres valides

- **WHEN** plusieurs coins échappés couvrent la même sentinelle
- **THEN** le candidat de score normalisé minimal SHALL fournir la valeur finale

### Requirement: Repli spatial de la dérivée

Le canal de dérivée SHALL conserver la hauteur de distance et l'angle issus du
resolve spatial. Le prototype SHALL NOT utiliser la continuation de premier
ordre `ẑ′(δc) = z′ + z″·δc`, dont Gate A a rejeté la portée.

#### Scenario: Ombrage d'un texel rempli

- **WHEN** la valeur d'un texel est remplie analytiquement
- **THEN** sa hauteur de distance et son angle de dérivée SHALL rester ceux du
  resolve spatial existant

### Requirement: Repli par canal pour les métriques non analytiques

Les canaux de phase de stripe et de direction moyenne d'orbite sont des
moyennes le long de l'orbite et non des fonctions analytiques de `c`. Ils SHALL
rester issus du resolve spatial, indépendamment du contenu de la palette.

#### Scenario: Métriques d'orbite présentes

- **WHEN** un texel est rempli analytiquement
- **THEN** les canaux de stripe et de direction moyenne SHALL conserver le
  traitement spatial existant sans empêcher la continuation des canaux valeur
  et dérivée

#### Scenario: Palette changeant l'usage des métriques

- **WHEN** la palette change
- **THEN** aucune décision de gel SHALL dépendre de son contenu

### Requirement: Aucun seuil perceptuel implicite

Le resolve analytique SHALL produire les valeurs approximatives sans convertir
leur erreur en seuil dépendant de la palette. La résolution de 4096 texels de la
texture de palette SHALL NOT être utilisée comme seuil visuel.

#### Scenario: Transition `square`

- **WHEN** une palette contient une transition dure
- **THEN** le resolve SHALL afficher la conséquence de l'approximation sans
  prétendre qu'elle est invisible

### Requirement: Unité cohérente de la portée diagnostique

La vue Portée SHALL convertir le rayon complexe avec le même pas par texel que
le resolve Taylor, soit `2·neutralExtent/neutralSize` fois l'échelle de vue.
Elle SHALL NOT omettre `neutralExtent` lorsque la texture brute est la texture
neutre carrée.

#### Scenario: Canevas non carré

- **WHEN** le rapport largeur/hauteur diffère de 1
- **THEN** une portée affichée de `r` pixels SHALL correspondre au même offset
  complexe de `r` texels que celui testé par `try_taylor_candidate`
