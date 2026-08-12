<link rel="stylesheet" href="https://use.typekit.net/fnz7ojs.css">

# Cache géométrique compact

Le calcul fractal conserve treize couches brutes de base : état de continuation
et payload interne de dérivées. Cinq couches de métriques d’orbite et trois
couches d’orbit trap sont ajoutées seulement quand leurs effets sont actifs.
La couleur ne lit pas cette
représentation comme image. Elle consomme un **display set** plus petit et
cohérent, produit directement par le resolve.

## ABI d’affichage

| Attachement | Format | Contenu | Octets par texel |
|---|---|---|---:|
| 0 | `r32float` | itération / état terminal | 4 |
| 1 | `r32float` | `z.x` | 4 |
| 2 | `r32float` | `z.y` | 4 |
| 3 | `rgba16float` | gradient x, gradient y, courbure, hauteur | 8 |
| 4 | `r32uint` | provenance, phase stripe, cohérence | 4 |

Le total est de **24 octets par texel** et cinq sorties MRT, contre huit
sorties flottantes et 32 octets auparavant. Les trois premières sorties sont
des vues d’une même texture tableau. Le live et le frozen possèdent chacun le
même ensemble typé afin qu’une sélection ne mélange jamais valeur, géométrie
et provenance de versions différentes.

Quand un orbit trap d’orbite est actif, une texture `rgba32float` séparée
transporte `(distance, itération, angle, validité)`. Elle est écrite comme
storage texture par le resolve : elle n’ajoute donc pas de septième sortie MRT
et ne dépasse pas la limite de 32 octets d’attachements couleur par échantillon.

`z.xy` est volontairement conservé : il sert encore à l’itération lissée, aux
orbit traps et aux mappings cartésiens fondés sur le point d’échappement.

## Réaffectation brute au point terminal

Les treize couches brutes gardent leur sens historique tant que le texel est en
continuation. Une fois l’orbite échappée, les emplacements devenus morts sont
réaffectés sans ajouter de couche :

```text
0 itération       1 gradient.x      2 z.x           3 z.y
4 hauteur         5 gradient.y      6 stripe/cohérence compactées
7 Laplacien       8..12 payload z′/z″ de l’AA analytique
```

La couche 6 terminale réserve 14 bits à la phase stripe et 14 bits à la
cohérence, transportés par bitcast dans un flottant normal fini. Le resolve les
décodera puis ajoutera les 4 bits de provenance propres au display set. Pour un
texel en continuation, les couches 1, 4, 5, 6 et 7 conservent respectivement le
marqueur de calcul, `derM.x`, `derM.y`, l’indice de référence et l’état de
direction/exposant ; il n’y a donc aucune augmentation de l’ABI brut.

## Géométrie

La quatrième sortie contient :

```text
(dH/dx, dH/dy, Laplacien(H), H)
```

où `H = -log(Dscreen)` et les dérivées sont exprimées par texel neutre de la
source. Les shaders calculent toujours en f32 ; `rgba16float` n’est que le
format de stockage.

À l’échappement, le noyau d’itération utilise, sur une branche d’échappement
fixée :

```text
A = z″/z′ - (1 + 1/log|z|) z′/z
```

puis transforme `A` dans les axes du texel source. `z″` reste dans les couches
brutes et n’est jamais transmis à la couleur. Les pas exacts et tous les sauts
sélectionnables propagent `z″` par la règle de chaîne du second ordre. Un saut
qui ne sait pas le faire est refusé au profit de l’itération exacte : il
n’existe aucun repli par différences spatiales.

Le troisième canal est le Laplacien analytique de `H` :

```text
ΔH = |z′/z|² / log²|z|
```

Il est multiplié par le carré de la taille complexe d’un texel source. Les
termes qui exigeraient `z‴` s’annulent parce que `log|z′|` et `log|z|` sont
harmoniques sur une branche régulière. Gradient et hauteur sont saturés dans
`[-64, 64]`, le Laplacien dans `[0, 64]`, avant leur conversion en
demi-précision. Une production non finie est neutralisée à zéro dès
l’échappement, sans lecture de voisin.

Une transition du nombre entier d’itérations d’échappement n’est pas une erreur
de la formule : c’est une discontinuité entre branches. Les tests numériques
mesurent donc la formule sur branche fixe et classent ces transitions à part.

## Métadonnées

Le mot de 32 bits est partagé ainsi :

```text
bits  0..3   exposant e du support dyadique, pas = 2^e
bits  4..17  phase stripe, 14 bits non signés
bits 18..31  cohérence directionnelle, 14 bits non signés
```

L’exposant zéro signifie un pixel exact de pas 1. Les valeurs positives
décrivent seulement le support provisoire du resolve. `iter < 0` signale
l’absence de donnée, donc aucun bit de validité supplémentaire n’est requis.
La phase stripe est interpolée sur le cercle ; la cohérence est interpolée
linéairement. Leur erreur de quantification est bornée par `1/16383`.

L’indice entier de référence et l’ancien angle de dérivée ne font plus partie
de l’ABI d’affichage. L’état de reprise de référence demeure dans la texture
brute.

## Changement d’échelle et cache

Pour un ratio spatial source vers affichage `r` :

```text
Haffichage        = Hsource + log(r)
gradientAffichage = rotation(gradientSource) * r
courbureAffichage = courbureSource * r²
```

Le merge live/frozen applique ces conversions avant d’écrire sa destination,
puis choisit ensemble les cinq champs de la source dont le support effectif est
le plus fin.

Une mutation du champ brut invalide la version résolue. Le resolve est omis
uniquement lorsque la version typée correspond exactement à la version du
champ. Un changement limité à la palette, à la lumière ou au matériau réutilise
donc la géométrie ; une progression d’itération, une réinitialisation, un
snapshot ou un merge produit une nouvelle version cohérente.

La couleur utilise directement le gradient pour les normales, les reflets,
l’anisotropie et les ombres locales, ainsi que la courbure pour l’AO. Seuls les
reliefs optionnels de stripe et de cohérence lisent encore des métadonnées
voisines. La cible AA lit la hauteur dans `geometry.w` et l’AA analytique garde
un accès séparé au payload brut uniquement pour son développement de Taylor.
