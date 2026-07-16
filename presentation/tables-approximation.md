<script setup>
import TableMechanismDemo from '../src/components/TableMechanismDemo.vue'
</script>

# Tables d’approximation : BLA, Padé, Jet, Möbius et Auto

Les tables ne remplacent pas la perturbation : elles en regroupent plusieurs pas consécutifs. Pour un pixel donné, le shader tente le plus grand bloc compatible avec son indice de référence et son état local. Si toutes les gardes passent, il saute plusieurs itérations ; sinon il descend vers un bloc plus court, puis exécute finalement la récurrence exacte d’un pas.

Cette page décrit l’implémentation actuelle du moteur, depuis la construction Rust jusqu’à l’application WGSL.

<TableMechanismDemo />

## Point de départ commun

Pour une référence de paramètre $C_r$, Rust calcule l’orbite

$$
Z_{n+1}=Z_n^2+C_r.
$$

Un pixel du viewport s’écrit $C=C_r+\delta c$ et son état $z_n=Z_n+\delta z_n$. La récurrence de perturbation est alors

$$
\delta z_{n+1}=2Z_n\delta z_n+\delta z_n^2+\delta c.
$$

L’orbite de référence est la partie construite en précision arbitraire (`DBig`). Les échantillons mis à disposition de la suite du pipeline sont stockés comme couples `f32`. Les tables ne sont donc pas composées directement en `DBig` : leurs constructeurs travaillent à partir de cette orbite échantillonnée, en `f64` et en nombres complexes à exposant étendu (`CFe`/floatexp) lorsque la dynamique dépasse l’intervalle du `f32`.

Une entrée de table approxime la composition de la récurrence sur un segment de longueur `skip`. Les segments sont rangés par niveaux dyadiques : 4, 8, 16, 32… itérations. Le slot `s` du niveau `skip` part de l’indice de référence

$$
n=1+s\,\text{skip}.
$$

BLA et Padé éliminent directement les niveaux 1 et 2, car un bloc linéaire ou rationnel court ne représente pas correctement certains passages dominés par $\delta z^2$. Jet, Möbius et Auto construisent la chaîne de fusion complète, mais ne sérialisent eux aussi que les niveaux `skip ≥ 4` pour le GPU.

## Ce que contient chaque mode

| Mode | Transformation d’un bloc | Buffers GPU | Domaine de validité |
|---|---|---|---|
| **BLA** | $\delta z' \approx A\delta z+B\delta c$ | enregistrement classique de 12 `f32`, répertoire des niveaux | rayon affine $\alpha-\beta\lvert\delta c\rvert$, plus les gardes shader |
| **Padé** | vue rationnelle `[1/1]` avec dénominateur $1+D\delta z$ | même format BLA, avec $D\neq0$ | rayon propre au bloc et garde de distance au pôle |
| **Jet** | polynôme bivarié tronqué, ordre adaptatif jusqu’au degré 3 au runtime | 27 `f32` de coefficients + sidecar de rayons de 16 octets | rayons certifiés par majorants de la queue omise |
| **Möbius c+** | rationnelle augmentée en $\delta c$, issue du jet | 21 `f32` de coefficients + sidecar de rayons de 16 octets | rayon certifié et marge sur le dénominateur |
| **Auto** | un enregistrement commun, tagué bloc par bloc | 9 coefficients `CFe` = 27 `f32` + sidecar de 16 octets | quatre rayons indépendants, un tier principal et un secours |

## Exemple concret de structure d’une table

Prenons une petite table **Auto** couvrant 32 itérations. Les valeurs ci-dessous sont volontairement fictives et arrondies : elles servent à montrer l’organisation en mémoire, pas à reproduire une orbite particulière. La table possède d’abord un répertoire de niveaux. Chaque niveau indique où commencent ses blocs dans le buffer, combien il en contient et combien d’itérations chaque bloc permet de sauter.

| Niveau | `offset` dans le buffer | `count` | `skip` | Indices de départ représentés |
|---:|---:|---:|---:|---|
| 0 | 0 | 8 | 4 | 1, 5, 9, 13, 17, 21, 25, 29 |
| 1 | 8 | 4 | 8 | 1, 9, 17, 25 |
| 2 | 12 | 2 | 16 | 1, 17 |
| 3 | 14 | 1 | 32 | 1 |

Le buffer contient donc ici **15 enregistrements contigus**. Une ligne associe la position du bloc, ses coefficients et son sidecar de décision. Pour garder le tableau lisible, les nombres complexes sont écrits directement sous la forme `x + yi` ; dans le buffer réel, chaque coefficient `CFe` occupe trois `f32` `(mx, my, e)` et représente `(mx + i·my) × 2^e`.

| Entrée | Départ `n` | Saut | `A` | `B` | `D` | Autres coefficients | Principal | `log₂ R` | Secours | `log₂ R` secours |
|---:|---:|---:|---|---|---|---|---|---:|---|---:|
| 0 | 1 | 4 | `-1.20+0.35i` | `0.82-0.14i` | `0.07+0.02i` | `N₂, A′, D′, F, a₁₂, a₀₃` | Padé | -18.4 | Jet | -16.9 |
| 1 | 5 | 4 | `0.41-1.08i` | `1.36+0.22i` | `-0.03+0.09i` | idem, propres au bloc | affine | -20.1 | Möbius | -17.5 |
| 8 | 1 | 8 | `-0.91-0.44i` | `2.18+0.61i` | `0.11-0.05i` | idem, après fusion de 2 blocs | Möbius | -19.2 | Jet | -18.0 |
| 12 | 1 | 16 | `0.28+0.73i` | `-3.42+1.17i` | `0.16+0.04i` | idem, après fusion de 4 blocs | Jet | -21.7 | aucun | `-∞` |
| 14 | 1 | 32 | `-0.06+0.12i` | `5.80-2.44i` | `0.22-0.08i` | idem, après fusion de 8 blocs | Jet | -24.6 | aucun | `-∞` |

La ligne `entrée 8`, par exemple, signifie : « à l’indice de référence `n = 1`, tenter de remplacer les huit prochaines itérations par un seul bloc ». Son enregistrement complet est conceptuellement le suivant :

| Zone | Champ | Exemple stocké | Interprétation |
|---|---|---|---|
| Coefficients | `A` | `(-0.91, -0.44, 0)` | coefficient de `δz` dans le numérateur |
| Coefficients | `B` | `(1.09, 0.305, 1)` | coefficient de `δc`, soit `(1.09+0.305i)×2¹` |
| Coefficients | `D` | `(0.88, -0.40, -3)` | terme de dénominateur en `δz` |
| Coefficients | `N₂` | `(0.52, 0.11, -2)` | terme quadratique du numérateur Möbius `[2/1]` |
| Coefficients | `A′`, `D′`, `F` | 3 triplets `CFe` | correction de la dépendance en `δc` pour Möbius |
| Coefficients | `a₁₂`, `a₀₃` | 2 triplets `CFe` | complément nécessaire au Jet d’ordre 3 |
| Sidecar | `x` | `-19.2` | `log₂` du rayon du tier principal |
| Sidecar | `y` | `2` | tag principal : Möbius c+ |
| Sidecar | `z` | drapeaux empaquetés | sécurité `f32` et tag du secours Jet |
| Sidecar | `w` | `-18.0` | `log₂` du rayon du secours |

Pour un pixel avec `log₂|δz| = -18.7`, le rayon principal `-19.2` est trop petit : `-18.7 > -19.2`. Le shader peut néanmoins essayer le secours Jet, car `-18.7 < -18.0`. Si sa garde passe, il avance directement de 8 itérations. Si elle échoue, il descend au niveau `skip = 4` et cherche l’entrée correspondant au même indice. C’est cette combinaison **répertoire de niveaux + enregistrements de coefficients + sidecars de rayons** qui constitue concrètement une table de saut.

### BLA : l’affine bivariée

Le bloc conserve deux coefficients complexes : $A$ pour la dépendance en $\delta z$, $B$ pour celle en $\delta c$. Les blocs voisins sont fusionnés pour former les niveaux supérieurs. Les coefficients $A$ et $B$ partagent un exposant binaire ; le rayon $\alpha$ possède son propre exposant, ce qui évite les dépassements et sous-flux aux zooms profonds.

À l’exécution, un bloc n’est pas appliqué sur la seule condition $\lvert\delta z\rvert<\alpha$. Le shader tient compte de $\beta\lvert\delta c\rvert$, rejette les passages trop proches d’un point critique via le minimum de $\lvert2Z_k\rvert$, et impose notamment la garde d’erreur $\lvert B\rvert\,\lvert\delta c\rvert<\varepsilon$. Un échec ne rend pas le pixel invalide : il force simplement la recherche d’un bloc plus court ou un pas exact.

La table classique est indexée par l’orbite, sa longueur, $\varepsilon$ et la saveur BLA/Padé. Elle n’est pas globalement indexée par `cmax` : c’est la valeur réelle de $\lvert\delta c\rvert$ du pixel qui intervient dans ses gardes runtime.

### Padé : la même arborescence, une forme rationnelle

Padé partage le format, les niveaux et le transfert de BLA. Le coefficient $D$, nul en affine, active une approximation rationnelle `[1/1]`. Elle peut rester utile pour des $\lvert\delta z\rvert$ plus grands qu’une affine, mais elle introduit un risque absent de BLA : le dénominateur peut approcher zéro. Le shader vérifie donc explicitement la marge au pôle avant de valider le saut.

Le cache distingue les tables BLA et Padé, même si elles utilisent le même buffer, car la fusion et les rayons ont été construits pour une forme différente.

### Jet : un développement bivarié certifié

Le Jet conserve les coefficients du développement en puissances de $\delta z$ et $\delta c$. Le runtime peut évaluer un ordre adapté au bloc ; le chemin actuel dispose d’un enregistrement de 27 `f32` et d’un sidecar séparé contenant les rayons. Cette séparation est importante : les coefficients dépendent de l’orbite, alors que les rayons dépendent aussi de $\varepsilon$ et de la taille de la vue.

Le constructeur borne les termes omis sur un polydisque

$$
|\delta z|\le R_z,\qquad |\delta c|\le R_c,
$$

avec, pour le Jet, une marche de majorants effectuée avec une réserve $R_c=1024\,c_{\max}$. Le rayon final est résolu de manière à maintenir l’erreur de valeur et l’erreur de dérivée dans le budget. Le shader teste le rayon du niveau avant de charger l’enregistrement, puis le rayon du bloc avant d’évaluer le polynôme.

### Möbius c+ : rationaliser aussi le canal paramètre

Möbius c+ est extrait du jet, mais représente le bloc sous une forme rationnelle enrichie en $\delta c$. L’enregistrement autonome contient les coefficients $A,B,D,N_2,A',D',F$. Par rapport à Padé, les termes $A'$, $D'$ et $F$ permettent au numérateur et au dénominateur de suivre la variation du paramètre dans le viewport.

Les bornes sont obtenues par une marche de majorants sur le segment, puis les rayons sont résolus pour $(\varepsilon,c_{\max})$. Comme pour Padé, l’application vérifie la distance au pôle ; comme pour Jet, le rayon est certifié à partir des restes non représentés.

### Auto : une table unifiée, pas un mode choisi une fois pour toute

Auto correspond au mode Rust `Unified`. Chaque bloc possède un seul enregistrement préfixé :

```text
[A, B, D, N₂, A′, D′, F, a₁₂, a₀₃]
 └ BLA ┘
 └── Padé ──┘
 └────── Möbius c+ ──────┘
 └────────── Jet ordre 3 ──────────┘
```

Les tiers lisent donc seulement le préfixe nécessaire : 24 octets pour l’affine, 48 pour Padé, 84 pour Möbius c+ et 108 pour le Jet. Les coefficients de Jet qui ne sont pas stockés directement sont reconstruits dans les registres à partir d’identités algébriques.

Pour chaque bloc, Rust calcule quatre rayons indépendants, dans l’ordre affine, Padé, Möbius c+, Jet. Le rayon effectif de chaque tier est

$$
R_{eff}=\min(R_{valeur},R_{dérivée}).
$$

Les rayons ne sont jamais échangés entre tiers : une évaluation Padé utilise le rayon Padé, une évaluation Jet le rayon Jet.

Auto rejoue ensuite la récurrence exacte de perturbation sur seize pixels échantillons, aux rayons $c_{\max}$ et $c_{\max}/4$, avec le même rebase que le shader. Il en extrait la médiane de $\log_2\lvert\delta z\rvert$ et une dispersion basée sur `p90 - p50`. Cette bande de travail sert à estimer, pour chaque tier, sa probabilité de couvrir un bloc.

Le couple **principal + secours** est choisi conjointement en maximisant une couverture attendue par coût attendu. Le coût inclut la lecture du préfixe, le poids arithmétique, le surcoût floatexp, la descente vers un niveau inférieur après échec et la divergence éventuelle du secours. Le secours n’est retenu que s’il possède un rayon strictement plus grand.

Le sidecar de 16 octets encode alors :

| Composante | Contenu |
|---|---|
| `x` | $\log_2 R$ du tier principal |
| `y` | tag principal : 0 affine, 1 Padé, 2 Möbius c+, 3 Jet |
| `z` | drapeau `f32-safe` et tag du secours empaquetés |
| `w` | $\log_2 R$ du secours, ou $-\infty$ s’il n’existe pas |

Le shader sonde d’abord le principal. Si $\lvert\delta z\rvert$ dépasse son rayon mais reste sous celui du secours, il lit le même enregistrement avec le second tag. Si les deux échouent, il descend de niveau.

Le sidecar unifié transporte également, après les blocs, les données du préfixe SA, le certificat périodique et le répertoire des gates. Ces accélérations sont propres à Auto et ne changent pas la règle fondamentale : chaque saut doit passer sa garde locale.

## Pourquoi les rayons dépendent de `cmax`

`cmax` est une borne supérieure de $\lvert\delta c\rvert$ sur tout le viewport par rapport à la référence courante. Pour certifier un reste contenant un terme $q_{ij}\delta z^i\delta c^j$, Rust doit le majorer pour tous les pixels :

$$
|q_{ij}|\,R_z^i\,c_{max}^j.
$$

Augmenter `cmax` augmente ces restes, rapproche potentiellement les formes rationnelles de leurs pôles et réduit les rayons valides. C’est pour cela que Jet, Möbius et Auto séparent trois couches de cache :

1. **niveaux et coefficients**, indexés par l’orbite et sa longueur ;
2. **bornes/majorants**, indexés par la réserve de $c_{\max}$ ;
3. **rayons, tags et sidecar**, indexés par $(\varepsilon,c_{\max})$.

Un changement de zoom ne force donc pas systématiquement la recomposition complète. Si l’orbite est identique, les coefficients restent réutilisables. Si la réserve de majorants couvre encore la nouvelle vue, seuls les rayons et tags sont résolus de nouveau. Dans Auto, ce cas produit un message `radiiReady` : le moteur réécrit le petit sidecar sans renvoyer les coefficients.

## Construction et progression affichée

Le worker ne lance la table qu’une fois l’orbite disponible au moins jusqu’au `maxIterations` demandé. L’orbite elle-même est calculée avec une réserve pouvant aller jusqu’à deux fois cette valeur pour absorber une prochaine hausse du budget.

Pour Auto, la construction coopérative est découpée ainsi :

| Progression | Étape | Travail |
|---|---|---|
| 0 → 1/3 | `coefficients` | jets de fusion, niveaux, extraction des neuf coefficients unifiés |
| 1/3 → 2/3 | `bounds` | marches de majorants Jet et rationnelles |
| 2/3 → 0,9 | `radii` | quatre rayons, rayons de dérivée, tags, SA, périodique et gates |
| 0,9 → 1 | `transfer` puis `ready` | copie WASM, transfert au thread principal et upload GPU |

Le masque de build interne vaut `1` pour coefficients/niveaux, `2` pour bornes et `4` pour rayons/sidecar. Un masque `4` seul signifie que les coefficients et les bornes étaient encore chauds. Si la référence et la génération correspondent déjà à la table GPU, le worker envoie alors uniquement `radiiReady`.

Jet, Möbius et Auto sont beaucoup plus coûteux à reconstruire que BLA/Padé. Le worker conserve donc une table de préfixe tant que le nouveau `maxIterations` ne dépasse pas environ 1,5 fois la couverture construite. Le préfixe reste valide ; sa fin est calculée en perturbation exacte. BLA et Padé exigent en revanche que leur table couvre le budget gardé courant.

Dans tous les modes à blocs, le moteur n’active le flag shader que lorsque l’orbite visible est complète, qu’une table du bon type est présente et qu’au moins un niveau existe. Au premier atterrissage d’une table Auto, le rendu est relancé une fois avec cette table active ; l’image exacte déjà résolue peut rester comme texture gelée pendant la reconvergence.

## Application dans le shader

À chaque tour de la boucle WGSL :

1. le shader cherche le plus grand niveau aligné qui ne dépasse ni la fin de la table ni `globalMaxIter` ;
2. il rejette rapidement un niveau si $\lvert\delta z\rvert$ dépasse son rayon maximal ;
3. il charge le sidecar du bloc et teste le rayon local, $\lvert\delta c\rvert$, les gardes critiques et, pour les formes rationnelles, la marge au pôle ;
4. en Auto, il tente le principal puis éventuellement le secours ;
5. si un tier passe, il met à jour $\delta z$, la dérivée, la dérivée seconde utile à Auto et l’indice de référence en un saut ;
6. sinon il descend de niveau ; si aucun bloc ne passe, il exécute exactement

$$
\delta z\leftarrow2Z\delta z+\delta z^2+\delta c.
$$

Le rebase de Zhuoran reste actif après les sauts comme après les pas exacts : lorsque $\lvert Z+\delta z\rvert<\lvert\delta z\rvert$, l’état complet devient le nouveau $\delta z$ et l’indice de référence revient à zéro. La table est donc une accélération locale et opportuniste, jamais une obligation pour terminer un pixel.

## Quand une table est-elle réellement reconstruite ?

| Changement | BLA / Padé | Jet / Möbius / Auto |
|---|---|---|
| Nouvelle orbite de référence | reconstruction complète | reconstruction complète |
| Hausse importante de `maxIterations` | reconstruction pour couvrir le budget | reconstruction différée ; ancien préfixe utilisable |
| Changement de $\varepsilon$ | reconstruction de la table classique | nouvelle résolution des rayons ; coefficients réutilisables |
| Changement de `cmax` dans la réserve | pas une clé globale ; gardes par pixel | rayons/tags seulement |
| `cmax` sort de la réserve des bornes | pas applicable | nouvelles bornes puis nouveaux rayons |
| Changement de mode | table BLA ou Padé distincte | stockage propre à Jet/Möbius ; Auto réutilise ses quatre tiers unifiés |

Ainsi, la « table Auto » n’est ni une table Jet choisie automatiquement, ni cinq tables complètes en parallèle. C’est une seule géométrie de blocs et un seul enregistrement de coefficients par bloc, accompagnés de rayons propres à quatre évaluateurs et d’une décision principal/secours précalculée.
