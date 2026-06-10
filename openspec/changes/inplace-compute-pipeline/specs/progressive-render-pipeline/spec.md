# Spec — progressive-render-pipeline

## ADDED Requirements

### Requirement: Sélection du chemin de rendu par frame
Le moteur SHALL sélectionner, à chaque frame, entre le chemin compute in-place et le chemin render ping-pong : le chemin compute in-place SHALL être utilisé quand la frame n'a ni translation (`shiftTexX == 0 && shiftTexY == 0`), ni `clearHistory`, et que le flag `useInplaceCompute` est actif ; le chemin render ping-pong (brush render → copie B→A → mandelbrot render) SHALL être utilisé dans tous les autres cas.

#### Scenario: Frame de convergence sans interaction
- **WHEN** une frame est rendue avec shift nul, sans clearHistory et flag actif
- **THEN** le moteur exécute un unique dispatch compute in-place sur `rawTexture` et n'exécute ni passe brush render, ni copie B→A, ni passe mandelbrot render, ni passe count séparée

#### Scenario: Frame de pan
- **WHEN** une frame est rendue avec `shiftTexX` ou `shiftTexY` non nul
- **THEN** le moteur exécute le chemin render ping-pong existant (brush, copie B→A, mandelbrot, count) à l'identique

#### Scenario: Frame de reset
- **WHEN** une frame est rendue avec `clearHistory` actif
- **THEN** le moteur exécute le chemin render ping-pong existant et la grille de sentinelles est re-seedée à l'identique du comportement actuel

#### Scenario: Flag désactivé
- **WHEN** le flag `useInplaceCompute` est désactivé
- **THEN** toutes les frames utilisent le chemin render ping-pong, sans aucun changement de comportement par rapport au pipeline actuel

### Requirement: Écritures proportionnelles aux pixels actifs
Sur le chemin compute in-place, le shader SHALL n'écrire (`textureStore`) que les texels actifs — sentinelle à raffiner, sentinelle -1 à calculer, ou continuation (`iter > 0` et `|z|² < mu`) — et SHALL ne produire aucune écriture pour les texels finis (échappés, intérieurs, ou hors ROI).

#### Scenario: Texel fini
- **WHEN** le compute traite un texel dont l'itération est terminée (échappé ou confirmé intérieur)
- **THEN** aucun `textureStore` n'est émis pour ce texel et ses 8 layers restent inchangés

#### Scenario: Texel sentinelle
- **WHEN** le compute traite un texel sentinelle (-1) avec données d'orbite disponibles
- **THEN** le résultat de `mandelbrot_compute` est écrit dans les 8 layers du texel

#### Scenario: Texel hors ROI
- **WHEN** le compute traite un texel hors de l'écran tourné (`is_inside_rotated_screen` faux)
- **THEN** aucune écriture n'est émise pour ce texel

### Requirement: Équivalence des deux chemins
Le chemin compute in-place SHALL produire un contenu de `rawTexture` équivalent à celui du chemin render ping-pong pour toute frame éligible (mêmes conventions de sentinelles, raffinement, continuation, 8 layers), au bruit de contraction FMA près entre les compilations fragment et compute du même code WGSL.

#### Scenario: Comparaison visuelle à convergence
- **WHEN** une même scène converge entièrement avec le flag actif puis avec le flag inactif
- **THEN** l'image finale colorisée est visuellement identique : écarts limités à quelques unités RGB sur une frange éparse de pixels (< 2 % du total, < 0,05 % au-delà de 8/255), sans motif structuré (grille, blocs)

#### Scenario: Raffinement des sentinelles
- **WHEN** une frame éligible raffine la grille de sentinelles (étape > 1, `allowRefinement` actif)
- **THEN** les positions d'ancres et les valeurs de sentinelles produites sont identiques à celles du brush render (`refine_sentinel`, `gridOffsetX/Y`, `minBrushStep`)

### Requirement: Compteur unfinished fusionné
Sur le chemin compute in-place, les compteurs unfinished/active SHALL être accumulés dans la même passe compute (atomics workgroup puis globaux) et SHALL refléter l'état **post-itération** des texels, en préservant la sémantique du readback asynchrone existant (`needsMoreFrames()`, contrôleur de batch).

#### Scenario: Convergence atteinte
- **WHEN** la dernière passe compute ne laisse aucune sentinelle ni continuation
- **THEN** le readback du compteur rapporte 0 unfinished et 0 active, et `needsMoreFrames()` passe à faux comme avec la passe count séparée

#### Scenario: Pixels restants
- **WHEN** des texels restent en continuation après épuisement du budget d'itérations
- **THEN** le compteur les comptabilise comme actifs au même titre que la passe count séparée

### Requirement: Gating du resolve hors convergence
Quand le dernier readback compteur indique 0 unfinished et 0 active et qu'aucun snapshot frozen ni merge n'est requis cette frame, le moteur SHALL sauter la copie A→resolved et la passe resolve, et la passe color SHALL lire directement `rawTexture` via un bind group alternatif. Quand un snapshot frozen ou un merge est requis, le moteur SHALL exécuter copie et resolve normalement cette frame-là.

#### Scenario: Image convergée à l'idle
- **WHEN** l'image est entièrement convergée et qu'une frame est rendue (uniforms changés, ex. animation de couleur)
- **THEN** ni copie A→resolved ni passe resolve ne sont exécutées et color lit `rawTexture`, avec un rendu identique

#### Scenario: Snapshot frozen pendant le gating
- **WHEN** un `needFreezeSnapshot` ou un merge survient alors que le gating serait actif
- **THEN** la copie A→resolved et le resolve sont exécutés cette frame pour que `resolvedTexture` soit à jour avant le snapshot/merge

### Requirement: Picking cohérent sous gating
`readIterationDataAt` SHALL retourner les données du dernier état calculé : quand le resolve a été sauté (gating actif), la lecture SHALL se faire depuis `rawTexture` au lieu de `resolvedTexture`.

#### Scenario: Picking après convergence avec gating
- **WHEN** l'utilisateur lit les données d'itération d'un pixel alors que le resolve est gaté depuis plusieurs frames
- **THEN** les valeurs retournées (iter, z, dérivée) correspondent au dernier calcul et non à un état périmé de `resolvedTexture`
