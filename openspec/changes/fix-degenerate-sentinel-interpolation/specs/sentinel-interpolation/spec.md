## ADDED Requirements

### Requirement: Critère de rang pour l'interpolation d'une cellule
La passe resolve (`resolve.wgsl`) SHALL rendre un pixel sentinelle à partir des 4 coins de sa cellule de grille au niveau courant **uniquement si** cette cellule possède au moins 3 coins **résolus** (échappés `iter>0 ∧ |z|²≥mu`, ou intérieurs `iter==0`). Sinon, le resolve SHALL remonter au niveau de grille suivant (`step_u *= 2`) et réévaluer le même critère, dans la limite de la boucle de remontée existante.

#### Scenario: Cellule à un seul coin résolu (transitoire)
- **WHEN** un pixel sentinelle est résolu et qu'un seul des 4 coins de sa cellule au pas courant est résolu (les 3 autres sont sentinelles ou budget épuisé)
- **THEN** le resolve SHALL NOT produire la valeur dégénérée constante de ce niveau
- **AND** le resolve SHALL remonter au pas `2×` et réévaluer, jusqu'à trouver un niveau à ≥ 3 coins résolus ou atteindre la garde de remontée

#### Scenario: Cellule à deux coins résolus en diagonale (transitoire)
- **WHEN** exactement deux coins résolus subsistent et qu'ils sont en diagonale de la cellule
- **THEN** le resolve SHALL remonter au niveau grossier suivant plutôt que d'interpoler la diagonale (champ singulier aux coins vides)

#### Scenario: Cellule à trois coins résolus
- **WHEN** au moins 3 des 4 coins de la cellule au pas courant sont résolus
- **THEN** le resolve SHALL rendre la cellule à ce niveau (interpolation des coins échappés, ou copie du coin intérieur dominant si `wInside > wEscaped`)

### Requirement: Invariance de l'image convergée
Le critère de rang SHALL compter les coins résolus (échappés ou intérieurs) et non les seuls coins échappés, de sorte qu'une cellule dont les 4 coins sont résolus soit toujours rendue à son niveau le plus fin. La résolution d'une frame entièrement convergée (aucune sentinelle, aucun budget épuisé) SHALL être identique au comportement actuel, sans aucune remontée induite par le critère.

#### Scenario: Frame convergée
- **WHEN** tous les pixels sont finis (chaque coin de chaque cellule est échappé ou intérieur)
- **THEN** chaque cellule a `nResolved == 4` et est rendue à son niveau le plus fin
- **AND** aucune remontée n'est déclenchée par le critère de rang, et l'image produite est identique à celle d'avant ce changement

#### Scenario: Cellule de bord convergée avec coins intérieurs
- **WHEN** une cellule convergée au bord du set possède des coins intérieurs (`iter==0`) et des coins échappés, tous résolus
- **THEN** la cellule est rendue à son niveau le plus fin (sans remontée), puisque les coins intérieurs comptent comme résolus

### Requirement: Préservation de la priorité intérieure et du repli
Quand une cellule est rendue à son niveau courant (≥ 3 coins résolus), le resolve SHALL conserver le comportement actuel de désambiguïsation : la copie du coin intérieur dominant quand `wInside > wEscaped`, et le repli sur le premier coin fini (`firstFinishedCoord`) quand tous les poids bilinéaires des coins résolus sont nuls.

#### Scenario: Intérieur dominant
- **WHEN** une cellule rendue à son niveau a un poids intérieur total supérieur au poids échappé total
- **THEN** le resolve SHALL copier le coin intérieur de plus grand poids (région solide), sans interpolation échappée par-dessus

### Requirement: Héritage de la correction sur le chemin d'affichage magnifié
Le chemin d'affichage magnifié pendant le zoom (`color.wgsl::sample_escaped_bilinear`) SHALL échantillonner la texture résolue (`resolvedTexture`) et la texture gelée (`frozenTexture`, snapshot d'une texture résolue antérieure), toutes deux déjà corrigées par le critère de rang de la passe resolve. Il SHALL donc hériter de la suppression des carrés plats sans logique de remontée propre, et SHALL conserver ses gardes existantes (priorité intérieure `wInside > wEscaped`, remplissage des trous pendant les swaps frozen).

#### Scenario: Zoom magnifié sur données résolues
- **WHEN** la texture résolue est magnifiée à l'écran pendant un zoom et interpolée bilinéairement entre texels adjacents
- **THEN** les texels sources proviennent de la passe resolve corrigée par le rang (lisses par texel), donc l'affichage magnifié ne réintroduit pas de carrés plats issus de la grille de sentinelles brute

#### Scenario: Préservation du remplissage anti-flash
- **WHEN** un swap de reprojection frozen↔live laisse transitoirement des texels sans donnée dans l'empreinte d'échantillonnage
- **THEN** le chemin magnifié SHALL conserver son comportement de remplissage existant (interpolation à partir des coins échappés disponibles) sans seuil de rang strict qui réintroduirait le flashing
