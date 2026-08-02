## ADDED Requirements

### Requirement: Raffinement dyadique opportuniste

Le raffinement SHALL conserver sa grille dyadique et ses ancres aux coordonnées
entières. Avant de diviser le pas d'une sentinelle, le kernel SHALL lire le
marqueur de couverture Taylor produit par le resolve précédent.

#### Scenario: Couverture précédente valide

- **WHEN** le mode opportuniste est actif, que l'historique n'est pas effacé et
  que le texel résolu précédent porte le marqueur Taylor à la coordonnée source
  de l'état brut courant, y compris après une translation entière
- **THEN** `refine_sentinel` SHALL conserver le pas brut actuel

#### Scenario: Pas de couverture

- **WHEN** le marqueur Taylor est absent
- **THEN** `refine_sentinel` SHALL conserver son comportement dyadique normal

#### Scenario: Pixel à calculer

- **WHEN** le texel brut vaut `-1`
- **THEN** le calcul exact SHALL démarrer même si un marqueur résolu périmé
  existe à cette coordonnée

### Requirement: Marqueur sans allocation supplémentaire

Le resolve SHALL encoder la couverture Taylor par une demi-unité dans le canal
de pas résolu : les pas bilinéaires restent entiers et un pas Taylor vaut
`step + 0.5`. Ce marqueur SHALL rester positif afin que les chemins couleur,
zoom et fusion le traitent comme une donnée affichable.

### Requirement: Compteurs cohérents

Une sentinelle couverte SHALL être exclue du compteur inachevé et du compteur
actif. Une sentinelle bilinéaire non couverte SHALL rester inachevée.

#### Scenario: Fin du rendu opportuniste

- **WHEN** toutes les sentinelles restantes sont couvertes et toutes les ancres
  calculées sont terminées
- **THEN** les compteurs SHALL atteindre le régime d'inactivité ordinaire sans
  traitement spécial de fin Taylor

### Requirement: Resolve maintenu

Tant que le mode Taylor opportuniste est actif, le moteur SHALL conserver le
resolve comme source d'affichage, même lorsque les compteurs ne voient plus de
travail, car l'état brut contient encore les sentinelles couvertes.

### Requirement: Diagnostic de couverture affichée

Le moteur SHALL proposer une vue de debug qui lit le canal de pas de la source
résolue effectivement affichée, sans relancer le calcul Mandelbrot. La vue SHALL
classifier les texels calculés exactement en vert, les approximations Taylor
terminales en magenta, les remplissages bilinéaires temporaires en orange et
l'absence de donnée en noir.

#### Scenario: Diagnostic pendant le raffinement progressif

- **WHEN** la vue de couverture est active et que le raffinement progresse
- **THEN** le moteur SHALL continuer la boucle progressive ordinaire et
  rafraîchir la classification après chaque resolve

#### Scenario: Rendu normal

- **WHEN** la vue de couverture est désactivée
- **THEN** la classification SHALL n'avoir aucun effet sur la couleur normale
  ni sur la sélection des ancres

### Requirement: Diagnostic structurel des rejets Taylor

Le moteur SHALL proposer une vue de debug distincte qui explique pourquoi une
sentinelle affichée par le resolve spatial n'a pas reçu de marqueur Taylor. La
classification SHALL distinguer au minimum : payload inutilisable, gate de
rayon dépassé, changement de branche d'échappement, cellule fine insuffisamment
résolue, intérieur dominant et absence d'ancre échappée exploitable.

La raison MAY être encodée dans un canal résolu existant si cet encodage laisse
la couleur normale et la priorité des pas inchangées. Elle SHALL NOT ajouter de
seuil dépendant de la palette ni être présentée comme une mesure perceptuelle.

#### Scenario: Lecture après convergence

- **WHEN** la vue des rejets est sélectionnée après un rendu Taylor
- **THEN** elle SHALL relire la source résolue live/frozen effectivement
  affichée sans relancer un pipeline Mandelbrot de debug

#### Scenario: Rendu normal

- **WHEN** la vue des rejets est désactivée
- **THEN** les tags de diagnostic SHALL être neutres pour les calculs de
  palette, d'ombrage et de priorité live/frozen
