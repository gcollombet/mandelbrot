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
Le moteur SHALL exécuter directement le compute in-place quand la frame n'a ni translation (`shiftTexX == 0 && shiftTexY == 0`) ni `clearHistory`. Dans les autres cas, une passe utility compute SHALL préparer B depuis A — copie décalée ou clear exact — puis les rôles A/B SHALL être échangés avant le même compute in-place d'itération. Les deux topologies SHALL amorcer les texels sans historique comme des requêtes exactes au pas 1.

#### Scenario: Frame de convergence sans interaction
- **WHEN** une frame est rendue avec shift nul et sans clearHistory
- **THEN** le moteur exécute un unique dispatch compute in-place sur `rawTexture` et n'exécute ni passe brush render, ni copie B→A, ni passe mandelbrot render, ni passe count séparée

#### Scenario: Frame de pan
- **WHEN** une frame est rendue avec `shiftTexX` ou `shiftTexY` non nul
- **THEN** la passe utility compute rassemble A→B, marque chaque texel nouvellement exposé comme requête exacte au pas 1, échange A/B, puis l'itération continue in-place

#### Scenario: Frame de reset
- **WHEN** une frame est rendue avec `clearHistory` actif
- **THEN** la passe utility compute initialise B avec des requêtes exactes au pas 1, échange A/B, puis l'itération continue in-place

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

### Requirement: Équivalence des deux topologies
Le chemin compute in-place direct SHALL produire un contenu brut cohérent avec la topologie utility A→B + swap + compute in-place : mêmes requêtes exactes au pas 1, mêmes continuations, mêmes états terminaux et même payload brut pour un historique équivalent.

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

### Requirement: Contrôleur temporel prédictif
Le moteur SHALL associer le timestamp de la passe d'itération au compteur de travail réel de la même frame. Lorsque plus de 10% des pixels visibles restent actifs, il SHALL mettre à jour une EMA d'applications pondérées par milliseconde et prédire le batch suivant depuis ce débit et la population active. Il SHALL demander au moins 10 ms de budget d'itération lorsque du travail reste, sans interpréter ce budget comme une durée GPU garantie, et SHALL borner le batch au domaine valide du shader.

#### Scenario: Correction après une mesure GPU
- **WHEN** une passe d'itération valide est mesurée hors de la zone morte autour de son budget demandé
- **THEN** le batch suivant est obtenu depuis le débit pondéré appris et la population restante; sans débit représentatif disponible, la correction proportionnelle sert de repli

#### Scenario: Budget FPS sans place pour l'itération
- **WHEN** les passes fixes et la marge consomment la durée de frame sélectionnée
- **THEN** le contrôleur demande encore 10 ms d'itération au lieu de converger artificiellement vers le batch 1

#### Scenario: Budget sous-rempli
- **WHEN** la population restante ou le batch maximal ne fournit pas assez de travail pour consommer les 10 ms demandées
- **THEN** la passe peut finir plus vite sans que ce sous-remplissage soit classé comme une erreur de budget

#### Scenario: Nouvelle vague dense
- **WHEN** un clear ou un full-frame remplace une population clairsemée par une vague dense
- **THEN** les anciens readbacks de l'époque brute précédente sont invalidés et le batch est amorcé depuis l'EMA persistante, s'il en existe une, sans reset inconditionnel à 1

#### Scenario: Apprentissage représentatif
- **WHEN** le timestamp et le compteur appariés rapportent du travail pondéré réel et plus de 10% des pixels visibles encore actifs
- **THEN** le moteur met à jour l'EMA `travail pondéré réel / temps d'itération`

#### Scenario: Queue clairsemée
- **WHEN** 10% ou moins des pixels visibles restent actifs
- **THEN** la mesure peut ajuster le batch courant mais SHALL NOT polluer l'EMA persistante

#### Scenario: Passe de translation
- **WHEN** une translation expose une nouvelle bande de texels
- **THEN** la frame reprend immédiatement un batch prédit depuis l'EMA et sa mesure appariée peut actualiser ce débit si la population reste représentative

#### Scenario: Zoom continu
- **WHEN** seule l’échelle d’affichage change entre deux frontières de clear/swap du champ brut
- **THEN** le moteur conserve la génération des compteurs afin que la mesure asynchrone de la frame précédente puisse être appariée et appliquée

#### Scenario: Readback timestamp différé
- **WHEN** le transfert `mapAsync` des timestamps vers le CPU reste en attente alors qu’une durée GPU valide est déjà connue
- **THEN** le moteur cadence les nouvelles frames depuis la durée GPU lissée sans attendre le retour CPU et sans attribuer sa latence aux passes GPU

#### Scenario: Adaptateur sans timestamps
- **WHEN** les timestamp queries ne sont pas disponibles
- **THEN** le moteur conserve `onSubmittedWorkDone()` comme barrière de fin conservative et comme source de durée globale

#### Scenario: Temps de frame hors passes GPU
- **WHEN** l’intervalle réel de frame dépasse nettement la somme et le span des passes GPU
- **THEN** la télémétrie distingue navigation, propagation des modèles Vue, `Engine.update()` et encodage `Engine.render()` sans journalisation synchrone à chaque pas de zoom

### Requirement: Cinématique de zoom indépendante de la profondeur
Le navigateur SHALL calculer le facteur cinématique sans évaluer de fonction transcendante à la précision arbitraire de la vue. Il SHALL conserver la précision profonde de l'échelle lors de l'application de ce facteur.

#### Scenario: Pas de zoom manuel
- **WHEN** une impulsion de zoom est intégrée pendant une frame
- **THEN** son exponentiation est calculée en f64 puis le facteur obtenu est multiplié dans l'échelle `DBig` sans réduire la précision de cette dernière

#### Scenario: Vue profonde
- **WHEN** `ensure_precision()` augmente la précision des coordonnées et de l'échelle
- **THEN** la vitesse de zoom sans dimension n'est pas promue au budget profond
