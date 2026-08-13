## ADDED Requirements

### Requirement: Définition et validation d'un parcours
Un parcours SHALL être défini par un état de départ A, un preset d'arrivée B et une durée en secondes. Le système SHALL interpoler `cx`, `cy`, `scale` et `angle` via la transition du navigateur, et NE SHALL interpoler aucun autre paramètre. Tout paramètre de rendu divergeant entre A et B SHALL faire refuser l'export, en énumérant les paramètres divergents.

#### Scenario: Parcours valide
- **WHEN** l'utilisateur définit un parcours dont A et B ne diffèrent que par le centre, l'échelle et l'angle
- **THEN** le parcours est accepté et le nombre de frames à produire est `ceil(durée × fps)`

#### Scenario: Palette divergente
- **WHEN** A et B portent des `colorStops` différents, quelle que soit la nature de la différence (nombre de stops, positions ou couleurs)
- **THEN** l'export est refusé avant tout rendu, la palette étant citée parmi les divergences

#### Scenario: Autre paramètre divergent
- **WHEN** A et B diffèrent sur un paramètre non interpolé (par exemple `approximationMode`, `orbitTrap`, `mu` ou `textureName`)
- **THEN** l'export est refusé avant tout rendu et la liste des paramètres divergents est présentée à l'utilisateur

#### Scenario: Palette figée pendant le rendu
- **WHEN** un export est en cours
- **THEN** les `colorStops` restent ceux de A sur toute la durée du parcours, et aucune boucle d'interpolation de palette cadencée par l'horloge murale ne s'exécute

#### Scenario: Animation de palette par piste cosmétique
- **WHEN** la piste `paletteOffset` de l'animation-mixer est active pendant un export
- **THEN** le décalage de palette est animé depuis `frameIndex / fps` sur les `colorStops` figés de A

#### Scenario: Durée nulle ou négative
- **WHEN** la durée demandée est nulle ou négative
- **THEN** l'export est refusé et aucune session n'est ouverte

### Requirement: Horloge déterministe par index de frame
En mode export, le système SHALL faire avancer la caméra par pas exacts de `1 / fps` via `step_with_delta_time`, et SHALL dériver tout temps d'animation de `frameIndex / fps`. Aucune lecture d'horloge murale (`Date.now`, `performance.now`, cadence `requestAnimationFrame`) SHALL influencer l'état rendu.

#### Scenario: Reproductibilité image par image
- **WHEN** un même parcours est exporté deux fois sur la même machine
- **THEN** les deux sorties sont identiques image par image

#### Scenario: Indépendance au temps de calcul
- **WHEN** une frame met beaucoup plus longtemps à converger que les autres
- **THEN** la position caméra de la frame suivante est inchangée, et la durée du fichier produit reste `nombre de frames / fps`

#### Scenario: Pistes cosmétiques sur l'horloge de frame
- **WHEN** une piste d'animation cosmétique est active pendant un export
- **THEN** sa phase est calculée depuis `frameIndex / fps` et non depuis le temps mural accumulé par le moteur

### Requirement: Émission de frames convergées uniquement
Le système SHALL n'émettre une frame qu'après satisfaction du prédicat de convergence d'export. Il SHALL appliquer un plafond de pompes de rendu par frame ; au dépassement, l'export SHALL échouer en indiquant l'index de la frame fautive, et NE SHALL PAS émettre d'image partiellement convergée.

#### Scenario: Frame convergée
- **WHEN** le prédicat de convergence d'export est satisfait pour la frame courante
- **THEN** la frame est capturée et transmise à l'encodeur

#### Scenario: Frame déjà convergée depuis la précédente
- **WHEN** aucun swap frozen/live n'est survenu depuis la frame précédente et le champ est resté convergé
- **THEN** la frame est émise sans dispatch de calcul supplémentaire, une fois le compteur `unfinished` confirmé pour la génération courante

#### Scenario: Plafond de pompes atteint
- **WHEN** une frame n'a pas convergé après le nombre maximal de pompes autorisé
- **THEN** l'export s'arrête en erreur avec l'index de la frame, et aucune image non convergée n'est écrite

### Requirement: Suréchantillonnage lié au seuil de magnification
Le système SHALL imposer `zoomMagnificationThreshold ≤ DPR` pour toute session d'export, afin que la texture gelée ne soit jamais sous-échantillonnée par rapport à la résolution de sortie. L'interface SHALL empêcher la saisie d'une combinaison violant cette contrainte plutôt que de la documenter.

#### Scenario: Combinaison conforme
- **WHEN** l'utilisateur choisit un seuil de 2 et un DPR de 2
- **THEN** la session est acceptée et le grossissement maximal de la texture gelée reste borné par le DPR

#### Scenario: Combinaison non conforme
- **WHEN** l'utilisateur abaisse le DPR sous le seuil de magnification courant
- **THEN** l'interface refuse la combinaison ou ajuste le seuil en conséquence, et l'export ne peut pas démarrer en violation de la contrainte

### Requirement: Validation de la combinaison résolution et DPR
Le système SHALL rejeter, avant ouverture d'une session, toute combinaison résolution × DPR dont `ceil(sqrt(w² + h²))` dépasse `maxTextureDimension2D` de l'adaptateur.

#### Scenario: 1080p en DPR ×2
- **WHEN** l'utilisateur demande une sortie 1080p avec un DPR de 2 sur un adaptateur limité à 8192
- **THEN** la session est acceptée

#### Scenario: 4K en DPR ×2
- **WHEN** l'utilisateur demande une sortie 4K avec un DPR de 2 sur un adaptateur limité à 8192
- **THEN** la session est refusée avec un message indiquant la limite atteinte, et aucune allocation de texture n'est tentée

### Requirement: Réduction en lumière linéaire avant encodage sRGB
Le système SHALL réduire l'image suréchantillonnée à la résolution de sortie **avant** la conversion linéaire→sRGB, au moyen d'un filtre de moyenne explicite. La réduction NE SHALL PAS être appliquée après l'encodage sRGB.

#### Scenario: Ordre des opérations
- **WHEN** une frame rendue en DPR ×2 est capturée
- **THEN** la moyenne des sous-échantillons est calculée en lumière linéaire, puis le résultat est converti en sRGB, puis transmis à l'encodeur

#### Scenario: Dégradé sans assombrissement de bord
- **WHEN** une frame contenant un dégradé à fort contraste est exportée
- **THEN** le résultat ne présente pas l'assombrissement de bord caractéristique d'une moyenne effectuée en espace sRGB

### Requirement: Encodage vidéo hors temps réel
Le système SHALL encoder via `VideoEncoder` (WebCodecs) en fournissant les timestamps dérivés de l'index de frame, et SHALL déclarer explicitement l'espace colorimétrique dans la configuration de l'encodeur. Le système NE SHALL PAS utiliser `MediaRecorder` ni `captureStream`, dont la base de temps est l'horloge murale.

#### Scenario: Frame lente à converger
- **WHEN** une frame met plusieurs secondes à converger
- **THEN** elle occupe exactement `1 / fps` dans le fichier produit

#### Scenario: Espace colorimétrique déclaré
- **WHEN** une session d'export est configurée
- **THEN** la configuration de l'encodeur porte un espace colorimétrique explicite, et le fichier produit est lu sans dérive de contraste ni délavage

### Requirement: Cycle de vie d'une session d'export
Le système SHALL exposer l'état d'une session d'export : progression exprimée en frames émises sur frames totales, annulation, et restitution de l'état de rendu temps réel à la fin ou à l'annulation.

#### Scenario: Progression
- **WHEN** un export est en cours
- **THEN** la progression affichée est le rapport des frames émises au total, et non une estimation fondée sur le temps écoulé

#### Scenario: Annulation
- **WHEN** l'utilisateur annule un export en cours
- **THEN** le rendu s'arrête, les ressources d'encodage sont libérées, et le moteur revient à son mode temps réel avec ses réglages antérieurs

#### Scenario: Restitution après export
- **WHEN** un export se termine normalement
- **THEN** `zoomMagnificationThreshold`, `targetFps`, `aaAuto`, le DPR et la source de temps des animations retrouvent leurs valeurs d'avant la session
