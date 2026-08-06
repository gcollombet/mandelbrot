## ADDED Requirements

### Requirement: Production du gradient de hauteur
Le moteur SHALL produire à l'échappement un gradient analytique du champ `distanceHeight` exprimé dans les axes du texel neutre source. Tout chemin sélectionnable SHALL maintenir `z″` ou refuser le saut concerné au profit d'itérations exactes. `color` SHALL NOT recevoir `z″`.

#### Scenario: Payload analytique disponible
- **WHEN** un pixel échappé possède des valeurs finies `z`, `z′` et `z″`
- **THEN** le gradient stocké est calculé analytiquement puis transformé dans les axes du texel source

#### Scenario: Saut sans règle de chaîne complète
- **WHEN** un saut candidat ne fournit pas les dérivées nécessaires à la propagation de `z″`
- **THEN** ce saut n'est pas appliqué et le pixel poursuit l'itération exacte sans repli spatial

#### Scenario: Valeur non finie
- **WHEN** le calcul analytique produit une division ou une composante non finie
- **THEN** le producteur publie une valeur analytique neutralisée et finie sans lire de voisin spatial

### Requirement: Laplacien analytique mis en cache
Le moteur SHALL calculer à l'échappement le Laplacien scalaire analytique du champ `distanceHeight`, `delta² |z′/z|² / log²|z|`, et SHALL le stocker avec le gradient avant la colorisation.

#### Scenario: Branche d'échappement régulière
- **WHEN** `z`, `z′`, `log|z|` et l'échelle du texel sont finis sur la branche terminale
- **THEN** la courbure stockée correspond au Laplacien analytique dans les unités du texel source

#### Scenario: Resolve temporaire
- **WHEN** un pixel affiché est interpolé depuis plusieurs supports terminaux
- **THEN** resolve interpole leurs gradients, Laplaciens et hauteurs sans recalcul différentiel ni lecture de voisinage

### Requirement: Contrat géométrique compact
Chaque display set live ou frozen SHALL exposer cinq attachements logiques totalisant 24 octets par texel : `iter:r32float`, `z.x:r32float`, `z.y:r32float`, `geometry:rgba16float` et `metadata:r32uint`. `geometry` SHALL contenir `(gradient.x, gradient.y, curvature, distanceHeight)`.

#### Scenario: Création des ressources
- **WHEN** le moteur alloue un display set
- **THEN** il crée les cinq attachements avec les formats et contenus définis sans dépasser cinq MRT ni 24 octets par échantillon logique

#### Scenario: Lecture shader
- **WHEN** un shader consomme la géométrie
- **THEN** les valeurs chargées depuis `rgba16float` sont manipulées en arithmétique f32

### Requirement: Conservation de z complexe
Le display set SHALL conserver `z.x` et `z.y` en précision `r32float` pour les consommateurs de coordonnées d'échappement et de métriques d'orbite.

#### Scenario: Orbit trap actif
- **WHEN** un matériau active un orbit trap fondé sur `z`
- **THEN** `color` utilise les deux composantes conservées du point d'échappement

#### Scenario: Mapping cartésien actif
- **WHEN** le mode de texture Cartesian Escape Z est sélectionné
- **THEN** ses coordonnées restent dérivées de `z.x` et `z.y`

### Requirement: Métadonnées packées
Le moteur SHALL encoder dans un `r32uint` l'exposant dyadique de provenance sur 4 bits, la phase stripe sur 14 bits et la cohérence directionnelle sur 14 bits. L'indice entier de référence SHALL rester dans l'état brut si nécessaire mais SHALL NOT être transmis au display set.

#### Scenario: Pixel exact
- **WHEN** un pixel provient d'un calcul exact au pas 1
- **THEN** son exposant de provenance vaut 0

#### Scenario: Remplissage bilinéaire
- **WHEN** un pixel affiché provient d'un support temporaire au pas `2^e`
- **THEN** son exposant de provenance vaut `e` et reste comparable après correction d'échelle live/frozen

#### Scenario: Décodage stripe et cohérence
- **WHEN** `color` décode les deux champs quantifiés
- **THEN** chacun appartient à `[0,1]`, la phase est interpolée circulairement et l'erreur scalaire est bornée par un quantum sur 16383

#### Scenario: Absence de donnée
- **WHEN** `iter < 0` dans le display set
- **THEN** les métadonnées ne sont pas considérées valides sans nécessiter de bit supplémentaire

### Requirement: Propagation live, frozen et merge
Le resolve, la reprojection frozen et le merge SHALL propager ensemble les valeurs, la géométrie et les métadonnées de l'échantillon retenu. La sélection SHALL préserver la règle de la plus petite provenance effective après correction d'échelle.

#### Scenario: Live plus fin
- **WHEN** les sources live et frozen ont des données et que le support live corrigé est plus fin
- **THEN** la valeur, `z`, la géométrie et les métadonnées live sont sélectionnées ensemble

#### Scenario: Frozen plus fin
- **WHEN** le support frozen corrigé est plus fin
- **THEN** tous les champs frozen correspondants sont sélectionnés ensemble

#### Scenario: Interpolation magnifiée
- **WHEN** un échantillon magnifié combine plusieurs texels
- **THEN** la phase stripe suit une interpolation circulaire, la cohérence une interpolation linéaire et la provenance conserve la réduction de pas du chemin existant

### Requirement: Normalisation géométrique par source
La hauteur, le gradient et la courbure SHALL être convertis des unités de leur source vers les unités de l'affichage courant avant leur usage ou leur stockage dans un merge : correction logarithmique pour la hauteur, facteur spatial pour le gradient et carré de ce facteur pour la courbure.

#### Scenario: Source reprojetée par un facteur uniforme
- **WHEN** une source est affichée avec un ratio spatial `r` vers l'écran courant
- **THEN** son gradient est multiplié par `r` et sa courbure par `r²`, avec la correction de hauteur correspondante

#### Scenario: Merge vers une nouvelle unité
- **WHEN** un merge écrit un nouveau snapshot frozen
- **THEN** les quatre composantes de géométrie sont stockées dans l'unité du display set destination

### Requirement: Colorisation fondée sur la géométrie cachée
Le shader `color` SHALL utiliser le gradient et la courbure cachés pour le normal mapping de base, l'éclairage, les reflets, les ombres locales et l'AO. Les effets anciennement orientés par l'angle de dérivée SHALL utiliser la direction du gradient de hauteur.

#### Scenario: Matériau ombré
- **WHEN** un matériau active shading, spéculaire ou skybox
- **THEN** la normale de base est dérivée de `geometry.xy` sans relire les hauteurs voisines

#### Scenario: AO actif
- **WHEN** l'ambient occlusion est active
- **THEN** elle utilise `geometry.z` comme Laplacien analytique caché

#### Scenario: Orientation directionnelle
- **WHEN** un effet demande une orientation anisotrope ou directionnelle
- **THEN** son angle est dérivé de `atan2(gradient.y, gradient.x)` avec une orientation neutre si le gradient est quasi nul

#### Scenario: Consommateur de distance
- **WHEN** la palette, le mapping, le debug ou la cible AA demande `distanceHeight`
- **THEN** il lit `geometry.w`

### Requirement: Invalidation par contenu fractal
Le cache géométrique SHALL être invalidé lorsque le champ Mandelbrot résolu ou sa transformation change et SHALL être réutilisé pour les changements exclusivement colorimétriques ou matériels.

#### Scenario: Progression d'itération
- **WHEN** une frame modifie le contenu résolu live
- **THEN** resolve republie la géométrie terminale correspondante avant colorisation

#### Scenario: Changement de palette
- **WHEN** seule la palette, la lumière ou un paramètre matériel change
- **THEN** le moteur réutilise le display set et la géométrie existants sans recalculer le champ

#### Scenario: Navigation ou merge
- **WHEN** la transformation de vue, la source frozen ou le résultat d'un merge change
- **THEN** la géométrie est reprojetée, normalisée ou reconstruite avant d'être déclarée valide

### Requirement: Précision et finitude du stockage
Le moteur SHALL calculer la géométrie en f32, SHALL empêcher toute valeur non finie dans le display set et SHALL appliquer des bornes de stockage documentées avant conversion en `rgba16float`.

#### Scenario: Grande pente
- **WHEN** une pente ou une courbure dépasse la plage de stockage retenue
- **THEN** elle est saturée à une borne finie et ne produit ni NaN ni infini dans `color`

#### Scenario: Oracle f32 de validation
- **WHEN** le mode interne de validation compare `rgba16float` à `rgba32float`
- **THEN** il mesure l'erreur de quantification sans modifier le contrat de production à 24 octets
