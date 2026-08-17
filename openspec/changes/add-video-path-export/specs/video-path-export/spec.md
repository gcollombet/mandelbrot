## ADDED Requirements

### Requirement: Définition et validation d'un parcours
Un parcours SHALL être défini par deux positions caméra — départ et arrivée — et une durée en secondes. Chaque position SHALL être capturable depuis la vue courante par une action explicite, et SHALL suivre la vue courante tant qu'elle n'a pas été capturée. Le système SHALL rendre le film avec l'apparence courante du début à la fin ; aucun paramètre de rendu n'est porté par les extrémités du parcours.

#### Scenario: Parcours valide
- **WHEN** l'utilisateur capture un départ, navigue, puis capture une arrivée
- **THEN** le parcours est accepté et le nombre de frames à produire est `ceil(durée × fps)`

#### Scenario: Position non capturée
- **WHEN** une extrémité n'a pas été capturée
- **THEN** elle vaut la vue courante au moment du lancement, et l'interface l'indique

#### Scenario: Position capturée conservée pendant la navigation
- **WHEN** l'utilisateur capture une position puis déplace la vue
- **THEN** la position capturée reste inchangée, et l'interface la distingue d'une position suivant la vue

#### Scenario: Apparence constante
- **WHEN** un export est en cours
- **THEN** tous les paramètres de rendu — palette comprise — restent ceux de la vue courante sur toute la durée, et aucune boucle d'interpolation cadencée par l'horloge murale ne les mute

#### Scenario: Animation de palette par piste cosmétique
- **WHEN** la piste `paletteOffset` de l'animation-mixer est active pendant un export
- **THEN** le décalage de palette est animé depuis `frameIndex / fps` sur une palette par ailleurs figée

#### Scenario: Extrémités confondues
- **WHEN** le départ et l'arrivée désignent la même position
- **THEN** l'export reste possible mais un avertissement annonce un film composé d'une image fixe répétée

#### Scenario: Coordonnée inexploitable
- **WHEN** une extrémité porte un `cx`, `cy` ou `scale` absent ou non numérique
- **THEN** l'export est refusé en nommant le champ et l'extrémité fautive

#### Scenario: Profondeur hors portée du f64
- **WHEN** une extrémité porte une échelle décimale sous le plus petit `f64` normalisé
- **THEN** elle est acceptée telle quelle, sans passer par un nombre

#### Scenario: Durée nulle ou négative
- **WHEN** la durée demandée est nulle ou négative
- **THEN** l'export est refusé et aucune session n'est ouverte

### Requirement: Horloge déterministe par index de frame
En mode export, le système SHALL placer la caméra à un temps de parcours **absolu** dérivé de l'index de frame, et SHALL dériver tout temps d'animation de la même valeur. Les `N` frames d'un parcours de durée `d` SHALL être réparties sur `[0, d]` bornes incluses — `d × n / (N − 1)` — de sorte que la première frame soit exactement sur A et la dernière exactement sur B. Le temps de parcours NE SHALL PAS être accumulé d'une frame à l'autre. Aucune lecture d'horloge murale (`Date.now`, `performance.now`, cadence `requestAnimationFrame`) SHALL influencer l'état rendu.

#### Scenario: Atterrissage exact sur l'arrivée
- **WHEN** un parcours de durée `d` est exporté à `fps` images par seconde
- **THEN** la dernière frame place la caméra exactement sur les paramètres de B, pour toute combinaison de `d` et `fps`

#### Scenario: Frame indépendante de son ordre de production
- **WHEN** la frame `n` d'un parcours est produite isolément
- **THEN** ses paramètres caméra sont identiques à ceux de la frame `n` produite au sein de la séquence complète

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

### Requirement: Seuil de bascule indépendant du suréchantillonnage
Le seuil de bascule frozen/live SHALL être réglable entre 2 et 32, indépendamment du facteur de suréchantillonnage. Un seuil supérieur au suréchantillonnage NE SHALL PAS être refusé : il SHALL produire un avertissement expliquant l'arbitrage — périphérie plus douce entre deux bascules contre un export nettement plus rapide, une reconvergence complète par facteur de zoom égal au seuil.

#### Scenario: Seuil élevé sur un suréchantillonnage faible
- **WHEN** l'utilisateur choisit un seuil de 16 avec un suréchantillonnage de ×2
- **THEN** la session est acceptée et un avertissement énonce l'arbitrage qualité/vitesse

#### Scenario: Bornes du seuil
- **WHEN** l'utilisateur tente un seuil hors de l'intervalle 2–32, ou non fini
- **THEN** l'export est refusé en rappelant les bornes

#### Scenario: Le suréchantillonnage ne contraint plus le seuil
- **WHEN** l'utilisateur abaisse le suréchantillonnage à ×1
- **THEN** le seuil conserve sa valeur et toute valeur de l'intervalle reste sélectionnable

### Requirement: Validation de la combinaison résolution et suréchantillonnage
Le système SHALL rejeter, avant ouverture d'une session, toute combinaison résolution × suréchantillonnage dont `ceil(sqrt(w² + h²))` dépasse `maxTextureDimension2D` de l'adaptateur.

#### Scenario: 1080p en ×2
- **WHEN** l'utilisateur demande une sortie 1080p en ×2 sur un adaptateur limité à 8192
- **THEN** la session est acceptée

#### Scenario: 4K en ×2
- **WHEN** l'utilisateur demande une sortie 4K en ×2 sur un adaptateur limité à 8192
- **THEN** la session est refusée avec un message indiquant la limite atteinte, et aucune allocation de texture n'est tentée

### Requirement: Persistance des réglages du panneau
Le panneau d'export SHALL conserver ses points de départ et d'arrivée épinglés, ainsi que ses réglages de sortie, à la fermeture de son onglet comme au rechargement de l'application. Les coordonnées SHALL être conservées sous forme de chaînes décimales ; une position dont une coordonnée n'est pas une chaîne SHALL être écartée plutôt que convertie.

#### Scenario: Réouverture après fermeture de l'onglet
- **WHEN** l'utilisateur épingle deux points, ferme l'onglet Vidéo puis le rouvre
- **THEN** les deux points épinglés et les réglages de sortie sont restitués

#### Scenario: Rechargement de l'application
- **WHEN** l'utilisateur recharge la page
- **THEN** les points épinglés sont restitués avec leurs coordonnées intactes, y compris au-delà de la portée du `f64`

#### Scenario: Stockage corrompu ou indisponible
- **WHEN** le stockage contient une valeur illisible, ou lève à la lecture comme à l'écriture
- **THEN** le panneau s'ouvre sur ses valeurs par défaut sans erreur

### Requirement: Réduction en lumière linéaire avant encodage sRGB
Le système SHALL réduire l'image suréchantillonnée à la résolution de sortie **avant** la conversion linéaire→sRGB, au moyen d'un filtre de moyenne explicite. La réduction NE SHALL PAS être appliquée après l'encodage sRGB.

#### Scenario: Ordre des opérations
- **WHEN** une frame rendue en DPR ×2 est capturée
- **THEN** la moyenne des sous-échantillons est calculée en lumière linéaire, puis le résultat est converti en sRGB, puis transmis à l'encodeur

#### Scenario: Dégradé sans assombrissement de bord
- **WHEN** une frame contenant un dégradé à fort contraste est exportée
- **THEN** le résultat ne présente pas l'assombrissement de bord caractéristique d'une moyenne effectuée en espace sRGB

### Requirement: Encodage vidéo hors temps réel
Le système SHALL encoder via WebCodecs en fournissant les timestamps dérivés de l'index de frame, et SHALL déclarer explicitement l'espace colorimétrique. Le système NE SHALL PAS utiliser `MediaRecorder` ni `captureStream`, dont la base de temps est l'horloge murale.

Le conteneur SHALL toujours être **MP4**. Le **codec** SHALL être choisi par l'utilisateur parmi AV1, H.264/AVC, HEVC et VP9, avec **AV1** par défaut. Le système SHALL sonder ce que le navigateur sait réellement encoder à la résolution demandée, SHALL signaler les codecs indisponibles, et SHALL refuser de démarrer sur un codec indisponible plutôt que de basculer silencieusement sur un autre.

#### Scenario: Frame lente à converger
- **WHEN** une frame met plusieurs secondes à converger
- **THEN** elle occupe exactement `1 / fps` dans le fichier produit

#### Scenario: Espace colorimétrique déclaré
- **WHEN** une session d'export est configurée
- **THEN** la configuration de l'encodeur porte un espace colorimétrique explicite, et le fichier produit est lu sans dérive de contraste ni délavage

#### Scenario: Codec par défaut
- **WHEN** l'utilisateur ouvre le panneau sans réglage enregistré
- **THEN** le codec sélectionné est AV1 et le conteneur est MP4

#### Scenario: Export dans le codec choisi
- **WHEN** l'utilisateur choisit un codec disponible et lance l'export
- **THEN** le fichier produit est un ISO-BMFF valide, rechargeable par le navigateur, encodé dans ce codec exact et nommé `.mp4`

#### Scenario: Codec indisponible à cette résolution
- **WHEN** le codec choisi ne peut pas être encodé par ce navigateur à la résolution demandée — par exemple H.264 sur une dimension impaire
- **THEN** l'interface le signale, l'export ne peut pas démarrer, et aucun autre codec n'est substitué en silence

### Requirement: Anticrénelage par image
Le système SHALL proposer un nombre d'échantillons d'anticrénelage jitterés par image (1 = aucun). Chaque échantillon supplémentaire SHALL réutiliser le reseed sélectif du moteur : seuls les texels de la bande de bord sont recalculés, ceux dont la marge analytique est validée n'étant jamais réitérés. Le système NE SHALL PAS émettre une image dont l'accumulation est incomplète.

#### Scenario: Accumulation avant émission
- **WHEN** un export demande plusieurs échantillons par image
- **THEN** aucune image n'est capturée avant que son accumulation n'ait atteint le nombre demandé

#### Scenario: Accumulation repartant à chaque image
- **WHEN** la caméra avance à l'image suivante
- **THEN** l'accumulation repart de zéro, sans mélanger deux positions de caméra

#### Scenario: Coût borné par la bande de bord
- **WHEN** un échantillon supplémentaire est pris
- **THEN** seule une fraction minoritaire de la surface est réestampillée, et non l'ensemble du champ

#### Scenario: Effet mesurable sur les bords
- **WHEN** une même vue est capturée avec 1 puis 4 échantillons
- **THEN** l'énergie de bord de l'image diminue tandis que sa luminosité moyenne reste stable

### Requirement: Écriture en flux du fichier produit
Quand le navigateur le permet, le système SHALL écrire le fichier au fil de l'encodage vers une destination choisie par l'utilisateur, sans conserver le film complet en mémoire. Le conteneur SHALL alors être un MP4 **fragmenté**, de sorte qu'un fichier interrompu reste lisible jusqu'à son dernier fragment complet. À défaut d'API d'écriture disponible, le système SHALL retomber sur un tampon mémoire et un téléchargement classique.

#### Scenario: Écriture progressive
- **WHEN** un export est en cours vers une destination en flux
- **THEN** des octets sont écrits avant la fin de l'encodage, et aucun tampon contenant le film entier n'est constitué

#### Scenario: Export interrompu
- **WHEN** l'utilisateur annule un export écrit en flux
- **THEN** le fichier déjà écrit est refermé proprement et reste lisible, contenant les images rendues jusque-là

#### Scenario: Fichier tronqué
- **WHEN** un fichier fragmenté est coupé en cours de route
- **THEN** il reste chargeable par le navigateur, jusqu'à son dernier fragment complet

#### Scenario: Sélection de destination refusée
- **WHEN** l'utilisateur ferme le sélecteur de fichier sans choisir
- **THEN** l'export est abandonné sans rien rendre

#### Scenario: Navigateur sans API d'écriture
- **WHEN** l'API de sélection de fichier n'est pas disponible
- **THEN** l'export se déroule en mémoire et le fichier est proposé au téléchargement à la fin

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
