## Why

Pendant le raffinement progressif de la grille de sentinelles, on observe parfois des **carrés entièrement plats, sans interpolation, sur tout l'image** : l'aperçu retombe sur la résolution grossière précédente au lieu d'afficher un dégradé lisse.

La cause est dans la passe `resolve.wgsl` (et son miroir `color.wgsl::sample_escaped_bilinear`). L'interpolation bilinéaire d'une cellule masque les coins non finis (sentinelles `-1`, ou budget épuisé `iter>0 ∧ |z|²<mu`) puis **renormalise** les poids restants (`invW = 1/wEscaped`). Cette renormalisation a une conséquence géométrique :

- **1 coin fini** ⇒ la position s'annule ⇒ valeur **constante** sur toute la cellule = carré plat.
- **2 coins finis sur une même arête** ⇒ dégradé 1-D, constant dans l'autre axe (bandes).
- **2 coins finis en diagonale** ⇒ champ rationnel singulier (poids → 0) aux deux coins vides.
- **3 ou 4 coins finis** ⇒ vrai dégradé 2-D lisse.

Or, juste après une étape de raffinement (passage du pas `2S` au pas `S`), **chaque** cellule fine ne possède qu'**un seul** ancien ancre `2S` déjà calculé ; les 3 nouveaux ancres restent non finis pendant plusieurs frames (calcul limité par budget). Toutes les cellules tombent donc simultanément dans le cas « 1 coin fini » → blocs plats sur tout l'image, jusqu'à ce que les nouveaux ancres s'échappent.

Le code actuel ne remonte au niveau grossier (`step_u *= 2`) **que si les 4 coins sont non finis**. Avec 1 ou 2 coins finis, il interpole quand même et retourne le résultat dégénéré (`resolve.wgsl:345-403`). C'est exactement le défaut.

## What Changes

- Introduction d'un **critère de rang spatial** dans la décision de la passe resolve : une cellule n'est rendue à son niveau courant que si elle possède **au moins 3 coins résolus** (échappés **ou** intérieurs) ; sinon le resolve **remonte au niveau grossier suivant** (`step_u *= 2`) et réessaie, dans la limite de remontée existante.
- Le comptage porte sur les coins **résolus** (échappés ou intérieurs), pas seulement échappés : une cellule dont les 4 coins sont résolus est toujours rendue à son niveau le plus fin. Comme à convergence tous les coins finissent résolus, **le changement n'a aucun effet sur l'image finale** ; il ne remplace que les aperçus transitoires (carrés plats → dégradé grossier mais lisse).
- Aucun changement du chemin d'affichage magnifié (`color.wgsl::sample_escaped_bilinear`) : il échantillonne la `resolvedTexture` (et la `frozenTexture`, snapshot d'une resolved antérieure), déjà corrigées par le critère de rang ci-dessus. La correction est héritée à la source ; ses gardes existantes (`wInside > wEscaped`, remplissage des trous pendant les swaps frozen) sont conservées telles quelles.
- La priorité à l'intérieur (`wInside > wEscaped`) et le repli copie sur coin (`firstFinishedCoord`) sont conservés ; seul l'ordre « interpoler vs remonter » change.

## Capabilities

### New Capabilities
- `sentinel-interpolation`: Définit la qualité de résolution des sentinelles — interpolation bilinéaire des cellules de grille avec remontée au niveau grossier quand la cellule courante n'a pas assez de coins résolus pour un dégradé 2-D honnête, garantissant un aperçu progressif lisse sans carrés plats et sans dégradation de l'image convergée.

### Modified Capabilities

## Impact

- **WGSL / shaders** : modification de la logique de décision dans `src/assets/resolve.wgsl` (boucle de remontée, comptage des coins résolus). `color.wgsl` est inchangé : son chemin magnifié échantillonne la texture déjà corrigée par le rang.
- **Aucun changement de signature CPU** : `Engine.ts`, uniformes brush/resolve (`gridOffsetX/Y`, `mu`) et la passe brush (`reproject.wgsl`) restent inchangés.
- **Convergence** : aucun impact sur l'image finale (tous les coins résolus ⇒ rendu au niveau le plus fin, comme aujourd'hui). N'affecte que les frames transitoires pendant le raffinement et le zoom.
- **Performance** : remontées supplémentaires bornées par le plafond de boucle existant (`level < 10`) et la garde `step_u >= dims` ; coût négligeable, sur des frames transitoires uniquement.
