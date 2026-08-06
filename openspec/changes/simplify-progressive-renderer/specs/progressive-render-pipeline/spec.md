## ADDED Requirements

### Requirement: Grille exacte au pas 1
Le moteur SHALL initialiser chaque texel visible ou nouvellement exposé comme une requête de calcul exacte au pas 1. Il SHALL NOT créer de sentinelle de raffinement spatial à pas supérieur à 1.

#### Scenario: Réinitialisation complète
- **WHEN** l'historique de rendu est effacé
- **THEN** tous les texels de la zone active sont marqués comme requêtes exactes et aucune grille grossière n'est amorcée

#### Scenario: Zone exposée après navigation
- **WHEN** une translation ou une reprojection expose des texels sans historique valide
- **THEN** ces texels sont marqués comme requêtes exactes au pas 1

### Requirement: Resolve bilinéaire temporaire des orbites incomplètes
Le resolve SHALL transmettre les texels terminés comme données exactes de pas 1 et SHALL utiliser des voisins terminés à des distances dyadiques pour afficher temporairement un texel dont l'orbite reste incomplète. Cette interpolation SHALL NOT terminer ni remplacer l'état d'orbite brut.

#### Scenario: Orbite épuisant son batch
- **WHEN** un texel reste en continuation après le batch d'itérations courant et que des voisins terminés sont disponibles
- **THEN** le resolve produit une valeur bilinéaire temporaire avec la provenance de son support tandis que le texel brut reste à calculer

#### Scenario: Aucun support terminé
- **WHEN** un texel est incomplet et qu'aucun voisin terminé exploitable n'est trouvé
- **THEN** le resolve marque l'absence de donnée affichable sans fabriquer de valeur terminale

### Requirement: Absence de couverture terminale Super Pixel
Le moteur SHALL NOT déclarer un texel terminé, couvert, ou inactif à partir d'une approximation Taylor spatiale. Les marqueurs fractionnaires de pas et les tags de rejet Super Pixel SHALL NOT être produits ni consommés.

#### Scenario: Texel non calculé
- **WHEN** un texel n'a pas de résultat d'orbite terminal exact
- **THEN** il reste compté comme travail restant même si une interpolation bilinéaire est affichable

### Requirement: AA adaptatif séparé du rendu ordinaire
Le système SHALL conserver l'AA adaptatif comme une boucle déclenchée à la demande ou à l'idle après convergence du champ exact au pas 1. Le rendu progressif ordinaire SHALL NOT activer l'AA pour remplacer le raffinement spatial supprimé.

#### Scenario: Convergence sans demande AA
- **WHEN** le champ exact converge et qu'aucun déclenchement AA manuel ou automatique n'est actif
- **THEN** le moteur s'arrête après le rendu simple sans lancer d'accumulation AA

#### Scenario: Déclenchement AA
- **WHEN** l'AA est déclenché sur un champ convergé
- **THEN** ses reseeds sélectifs utilisent directement des requêtes exactes au pas 1

### Requirement: Chemin arithmétique shader unique
Les shaders de colorisation SHALL utiliser un seul chemin arithmétique f32 et SHALL NOT dépendre de la fonctionnalité optionnelle `shader-f16`. Les formats de texture 16 bits explicitement choisis SHALL rester autorisés.

#### Scenario: Adaptateur avec shader-f16
- **WHEN** l'adaptateur annonce la fonctionnalité `shader-f16`
- **THEN** le moteur crée le même pipeline arithmétique f32 que sur un adaptateur qui ne l'annonce pas

## MODIFIED Requirements

### Requirement: Sélection du chemin de rendu par frame
Le moteur SHALL sélectionner, à chaque frame, entre le chemin compute in-place et le chemin render ping-pong : le chemin compute in-place SHALL être utilisé quand la frame n'a ni translation (`shiftTexX == 0 && shiftTexY == 0`), ni `clearHistory`, et que le flag `useInplaceCompute` est actif ; le chemin render ping-pong SHALL être utilisé dans tous les autres cas. Les deux chemins SHALL amorcer les texels sans historique comme des requêtes exactes au pas 1.

#### Scenario: Frame de convergence sans interaction
- **WHEN** une frame est rendue avec shift nul, sans clearHistory et flag actif
- **THEN** le moteur exécute un unique dispatch compute in-place sur `rawTexture` et n'exécute ni passe brush render, ni copie B→A, ni passe mandelbrot render, ni passe count séparée

#### Scenario: Frame de pan
- **WHEN** une frame est rendue avec `shiftTexX` ou `shiftTexY` non nul
- **THEN** le moteur exécute le chemin render ping-pong et marque chaque texel nouvellement exposé comme requête exacte au pas 1

#### Scenario: Frame de reset
- **WHEN** une frame est rendue avec `clearHistory` actif
- **THEN** le moteur exécute le chemin render ping-pong et initialise toute la zone active avec des requêtes exactes au pas 1

#### Scenario: Flag désactivé
- **WHEN** le flag `useInplaceCompute` est désactivé
- **THEN** toutes les frames utilisent le chemin render ping-pong avec la même topologie de requêtes exactes que le chemin compute

### Requirement: Écritures proportionnelles aux pixels actifs
Sur le chemin compute in-place, le shader SHALL n'écrire (`textureStore`) que les texels actifs — requête exacte ou continuation (`iter > 0` et `|z|² < mu`) — et SHALL ne produire aucune écriture pour les texels finis ou hors ROI. Aucun cas de sentinelle de raffinement spatial SHALL subsister.

#### Scenario: Texel fini
- **WHEN** le compute traite un texel dont l'itération est terminée, échappé ou confirmé intérieur
- **THEN** aucun `textureStore` n'est émis et son état brut reste inchangé

#### Scenario: Requête exacte
- **WHEN** le compute traite un texel marqué `iter == -1`
- **THEN** il initialise et avance l'orbite exacte dans le batch courant puis écrit son nouvel état

#### Scenario: Texel hors ROI
- **WHEN** le compute traite un texel hors de l'écran tourné (`is_inside_rotated_screen` faux)
- **THEN** aucune écriture n'est émise pour ce texel

### Requirement: Équivalence des deux chemins
Le chemin compute in-place SHALL produire un contenu de `rawTexture` équivalent à celui du chemin render ping-pong pour toute frame éligible : mêmes requêtes exactes au pas 1, mêmes continuations, mêmes états terminaux et même payload brut, au bruit de contraction FMA près entre les compilations fragment et compute du même code WGSL.

#### Scenario: Comparaison visuelle à convergence
- **WHEN** une même scène converge entièrement avec le flag actif puis avec le flag inactif
- **THEN** l'image finale colorisée est visuellement identique, sans motif structuré de grille ou de blocs

#### Scenario: Comparaison de l'état progressif
- **WHEN** les deux chemins ont consommé le même nombre d'itérations par texel depuis un reset
- **THEN** ils classent les mêmes texels comme requêtes, continuations ou résultats terminaux

### Requirement: Compteur unfinished fusionné
Sur le chemin compute in-place, un unique compteur post-itération SHALL comptabiliser les requêtes exactes et continuations restantes. Il SHALL piloter à la fois `needsMoreFrames()` et le contrôleur de batch adaptatif, en préservant la sémantique du readback asynchrone existant.

#### Scenario: Convergence atteinte
- **WHEN** la dernière passe ne laisse aucune requête ni continuation
- **THEN** le readback rapporte zéro travail restant et `needsMoreFrames()` passe à faux

#### Scenario: Pixels restants
- **WHEN** des texels restent en continuation après épuisement du budget d'itérations
- **THEN** le compteur les inclut et le moteur programme une frame de convergence supplémentaire

#### Scenario: Reset au pas 1
- **WHEN** un reset marque toute la zone active comme requêtes exactes
- **THEN** le compteur et le batch adaptatif traitent cette vague complète sans réintroduire de compteur de raffinement spatial
