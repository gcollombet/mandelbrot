## ADDED Requirements

### Requirement: Couverture Taylor terminale et opportuniste

Lorsque le mode expérimental est actif, un texel sentinelle SHALL devenir
terminal pour le rendu courant dès que le resolve trouve une ancre échappée
dont la continuation Taylor satisfait le gate numérique. Le texel brut SHALL
rester une sentinelle : seule sa couverture dans l'image résolue est terminale.

#### Scenario: Sentinelle couverte

- **WHEN** le resolve produit une continuation Taylor exploitable pour une
  sentinelle
- **THEN** l'image résolue SHALL marquer cette couverture et, à la frame
  suivante, le kernel principal SHALL conserver la sentinelle sans créer
  d'ancre exacte et sans la compter comme travail inachevé

#### Scenario: Sentinelle non couverte

- **WHEN** aucune ancre candidate ne satisfait le gate Taylor
- **THEN** le bilinéaire SHALL rester l'aperçu temporaire et la sentinelle SHALL
  continuer à se raffiner par le chemin dyadique ordinaire

### Requirement: Priorité des sources

La priorité d'affichage et de calcul SHALL être :
pixel brut calculé, puis approximation Taylor couverte, puis repli bilinéaire.

#### Scenario: Une ancre exacte remplace une ancienne couverture

- **WHEN** un texel brut est devenu calculé alors que l'image résolue précédente
  portait encore un marqueur Taylor à cette coordonnée
- **THEN** le pixel brut SHALL être conservé et SHALL ignorer ce marqueur

### Requirement: Absence de boucle de feedback Taylor

La couverture Taylor SHALL être évaluée dans le resolve ordinaire. Elle SHALL
NOT déclencher de gel global, de masque d'échec, de passe de raffinement local,
de lecture CPU dédiée ni de vague Auto supplémentaire sérialisée.

#### Scenario: Taylor impossible

- **WHEN** une sentinelle ne peut pas être couverte
- **THEN** seul le raffinement progressif ordinaire SHALL poursuivre le calcul

### Requirement: Aucune estimation de visibilité par la palette

Le mode expérimental SHALL NOT analyser la taille, la période, les stops, les
courbes de transfert, les textures, les matériaux ou l'éclairage de la palette.
Il SHALL NOT présenter le gate numérique comme une garantie
d'indistinguabilité.

#### Scenario: Palette à transition dure

- **WHEN** une palette contient des stops arbitrairement proches ou une
  transition `square`
- **THEN** aucun seuil dérivé de la palette SHALL être calculé

### Requirement: Invalidation spatiale sûre

La couverture lue par le kernel SHALL appartenir aux mêmes coordonnées que
l'état brut. Une frame qui efface l'historique SHALL ignorer les marqueurs de
la frame précédente. Une frame de translation entière SHALL relire le marqueur
à la même coordonnée source que celle utilisée pour reprojeter l'état brut,
`coord_out - round(shiftTex)`. Si cette coordonnée sort de la texture, aucune
couverture précédente SHALL être retenue et le raffinement ordinaire SHALL
s'appliquer. Le resolve recalculé SHALL produire les marqueurs alignés aux
coordonnées de sortie pour la frame suivante.

#### Scenario: Translation entière d'une sentinelle couverte

- **WHEN** l'état brut d'un texel est reprojeté depuis une coordonnée source
  valide lors d'une translation entière
- **THEN** le kernel SHALL tester le marqueur Taylor de cette même coordonnée
  source et SHALL conserver la sentinelle si elle était couverte

#### Scenario: Bande nouvellement exposée

- **WHEN** la coordonnée source reprojetée sort de la texture
- **THEN** aucun marqueur Taylor SHALL être lu et le texel SHALL suivre le
  chemin de calcul ou de raffinement ordinaire

### Requirement: Anti-aliasing non assimilé à une complétion exacte

La présence de sentinelles terminales Taylor SHALL NOT déclencher
l'accumulation AA comme si chaque pixel avait été calculé exactement.
