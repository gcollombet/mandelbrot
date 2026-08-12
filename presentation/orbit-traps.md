<link rel="stylesheet" href="https://use.typekit.net/fnz7ojs.css">

# Orbit traps paramétriques

Un **orbit trap** ne demande pas seulement si l’orbite de

$$
z_0=0,\qquad z_{n+1}=z_n^2+c
$$

finit par s’échapper. Il mesure à quel point les points $z_n$ s’approchent
d’une forme choisie. Ici, cette forme est une rosace logarithmique continue,
plutôt qu’une réunion fixe de deux axes et d’un cercle.

## La rosace

Après translation, rotation, changement d’échelle et anisotropie, on obtient
un point $q$. Avec $r=|q|$ et $\theta=\arg q$, la fonction de forme est

$$
F(q)=\log(\max(r,\varepsilon))
-a\cos\!\left(k\theta+\tau\log(\max(r,\varepsilon))+\varphi\right).
$$

La distance utilisée par le trap est $d(q)=|F(q)|$.

- $k$ est le nombre de pétales ;
- $a$ règle leur profondeur ;
- $\tau$ tord la fleur en spirale logarithmique ;
- $\varphi$ fait tourner la forme à l’intérieur de son propre motif ;
- centre, rotation, échelle et anisotropie déplacent ou déforment le trap.

Pour $a=0$, l’équation $F=0$ redonne un cercle. Pour $\tau=0$, les pétales
sont fermés ; un $\tau$ non nul leur donne une chiralité.

## Trois politiques d’évaluation

| Mode | Points mesurés | Coût et interprétation |
|---|---|---|
| Terminal | Le seul point d’échappement, normalisé par le rayon de bailout | Instantané ; effet de surface, pas un minimum d’orbite |
| Orbite échantillonnée | Chaque pas explicitement calculé et le point d’arrivée de chaque saut | Rapide, mais le minimum peut varier avec le mode d’approximation |
| Orbite exacte | Tous les pas, sans saut BLA, Padé, Jet, Möbius, renormalisation ni préfixe de série non certifié | Minimum fidèle au chemin d’itération ; peut perdre une grande partie de l’accélération |

Dans les deux modes d’orbite, le shader transporte le triplet

$$
(d_\min,n_\text{contact},\theta_\text{contact}).
$$

Lorsqu’un point plus proche est rencontré, les trois valeurs sont remplacées
ensemble. Une distance ne peut donc jamais être associée à l’itération ou à
l’angle d’un autre point. `Début orbite` vaut 2 par défaut pour éviter que
$z_0=0$ et le premier pas ne dominent trivialement tous les pixels.
Une fin égale à zéro signifie « jusqu’au budget courant ».

## Masque et couleur

La largeur, la dureté et l’intensité sont indépendantes. Le masque est

$$
M(d)=\exp\!\left[-\left(\frac d w\right)^h\right],
$$

où $w$ est la largeur et $h$ la dureté. L’intensité intervient seulement lors
du mélange final : elle ne grossit plus implicitement le motif.

La phase de palette combine trois informations réglables : bandes
logarithmiques de distance, itération du contact et angle du contact. Mettre
deux poids à zéro permet d’isoler exactement la troisième composante.

## Rendu progressif et limites

Le triplet occupe trois couches brutes `r32float`. Le resolve le copie comme
une unité dans une texture dédiée `rgba32float`, puis le même payload suit la
source choisie lors des copies live/frozen et de leur fusion. Il n’est pas
rangé dans le point terminal, la géométrie ou les métriques d’orbite.

L’AA analytique reconstruit le point terminal d’un sous-échantillon, mais ne
peut pas reconstruire rétrospectivement son ancien minimum d’orbite. Les modes
d’orbite utilisent donc le payload du pixel central ; les échantillons
réellement réitérés accumulent leurs propres minima. L’option « colorer
l’intérieur » ne concerne que les points évalués jusqu’au budget fini : elle
ne prétend pas minimiser une orbite infinie.
