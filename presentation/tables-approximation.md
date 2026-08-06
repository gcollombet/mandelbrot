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
| **Auto legacy / shadow** | un enregistrement commun, tagué bloc par bloc | 9 coefficients `CFe` = 27 `f32` + sidecar principal/secours de 16 octets | quatre rayons résolus pour le `cmax` courant |
| **Auto dynamique** | le même enregistrement commun, tier choisi par pixel | coefficients + enveloppe certifiée de 24 mots `f32` (96 octets) + provenance de 8 octets | fonction certifiée de `|δc|` et `|δz|`, valide dans un domaine de référence statique |

## Exemple concret de structure d’une table legacy

Prenons une petite table **Auto legacy**, qui sert aussi de référence au mode `shadow`, couvrant 32 itérations. Les valeurs ci-dessous sont volontairement fictives et arrondies : elles montrent l’organisation en mémoire, pas une orbite particulière. La table possède d’abord un répertoire de niveaux. Chaque niveau indique où commencent ses blocs dans le buffer, combien il en contient et combien d’itérations chaque bloc permet de sauter.

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

### Auto : un enregistrement unifié, trois politiques de décision

Auto correspond au mode Rust `Unified`. Chaque bloc possède un seul enregistrement préfixé :

```text
[A, B, D, N₂, A′, D′, F, a₁₂, a₀₃]
 └ BLA ┘
 └── Padé ──┘
 └────── Möbius c+ ──────┘
 └────────── Jet ordre 3 ──────────┘
```

Les tiers lisent seulement le préfixe nécessaire : 24 octets pour l’affine, 48 pour Padé, 84 pour Möbius c+ et 108 pour le Jet. Les coefficients de Jet absents du buffer sont reconstruits dans les registres à partir d’identités algébriques. Ce buffer dépend de l’orbite, jamais de la position instantanée de la caméra.

Trois politiques utilisent aujourd’hui cet enregistrement :

1. **legacy** résout quatre rayons pour $(\varepsilon,c_{max})$, rejoue des pixels échantillons, puis stocke un couple principal/secours dans le sidecar de 16 octets décrit plus haut ;
2. **dynamique** charge une enveloppe de preuve et choisit, pour le pixel courant, le premier tier certifié dans l’ordre affine, Padé, Möbius c+, Jet ;
3. **shadow** évalue exactement les mêmes enveloppes et incrémente leurs compteurs, mais ignore leur choix et applique les tags legacy. Il sert de référence A/B.

Le mode dynamique compile chaque inégalité de reste comportant une puissance $i>0$ de $\delta z$ sous la forme

$$
\log_2 |\delta z|\le A_{ij}-\frac{j}{i}\log_2|\delta c|.
$$

Les pentes possibles sont partagées globalement (`0`, `-1/2`, `-1`, `-2`). Chaque tier stocke quatre intercepts arrondis dans le sens conservateur, un plafond de domaine pur en $\delta c$ et un rayon de candidat de Cauchy. Les quatre tiers occupent exactement **24 mots `f32`, soit 96 octets par bloc**. Un flux de provenance séparé de 8 octets explique les refus mais ne participe jamais à l’acceptation.

À un niveau donné, le shader calcule `log2|δc|` et `log2|δz|`, teste les tiers du moins cher au plus cher et charge seulement le préfixe de coefficients du premier tier accepté. Il cherche toujours le plus grand saut aligné avant d’optimiser le coût du tier : un Jet valide pour 1024 itérations est donc préféré à une affine valide pour 4.

Les accélérateurs optionnels — préfixe SA, certificat périodique et gates paraboliques lorsqu’elles sont disponibles — vivent après les blocs dans un header versionné séparément. Leur domaine `|δc|` est explicite. Un header périmé est désactivé ou rafraîchi sans invalider les coefficients ni les enveloppes.

## Où `cmax` intervient encore

`cmax` est une borne supérieure de $\lvert\delta c\rvert$ sur tout le viewport par rapport à la référence courante. Le pipeline legacy l’injecte dans une certification uniforme :

$$
|q_{ij}|\,R_z^i\,c_{max}^j.
$$

Augmenter `cmax` augmente les restes, rapproche potentiellement les formes rationnelles de leurs pôles et réduit les rayons legacy. Jet, Möbius et Auto legacy séparent donc trois couches de cache :

1. **niveaux et coefficients**, indexés par l’orbite et sa longueur ;
2. **bornes/majorants**, indexés par la réserve de $c_{\max}$ ;
3. **rayons, tags et sidecar**, indexés par $(\varepsilon,c_{\max})$.

Un changement de zoom ne force pas la recomposition des coefficients. En legacy, si la réserve de majorants couvre encore la vue, seuls les rayons et tags sont résolus ; Auto peut envoyer un `radiiReady` sans renvoyer les coefficients.

En **Auto dynamique**, `cmax` ne choisit plus le rayon d’un bloc. Les majorants sont construits une fois pour un plafond de domaine rattaché à la référence courante — actuellement quatre octaves de réserve — puis le GPU substitue le `|δc|` réel de chaque pixel dans l’enveloppe. Un mouvement interne à ce domaine ne reconstruit ni coefficients, ni bornes, ni enveloppes. Si un pixel sort du domaine, ses blocs sont simplement refusés et la perturbation exacte continue jusqu’à la prochaine référence.

BLA et Padé restent un cas distinct : leurs gardes utilisent déjà directement le `|δc|` du pixel et leur table n’a pas de clé globale `cmax` comparable au sidecar Jet/Möbius.

## Construction incrémentale et publication partielle

Le builder incrémental conserve un bloc en attente par niveau, comme les retenues d’une addition binaire. Chaque nouveau pas d’orbite crée une graine `skip=1`. Deux voisins complets fusionnent une seule fois en `skip=2`, puis deux `skip=2` en `skip=4`, etc. Les niveaux 1 et 2 restent internes ; seuls les blocs `skip≥4` sont publiés.

Après $N$ pas disponibles, le niveau de saut $S$ contient exactement

$$
\left\lfloor\frac{N}{S}\right\rfloor
$$

blocs alignés commençant en $1+sS$. Il n’existe aucune fenêtre glissante et aucun bloc terminé n’est recalculé.

Le worker répète des unités bornées — actuellement 128 pas d’orbite et 32 enveloppes au maximum — et rend la main à sa file d’événements après chacune. Sa priorité est :

1. orbite nécessaire au viewport visible ;
2. coefficients et enveloppes du préfixe visible ;
3. réserve d’orbite pour le prochain zoom ;
4. headers optionnels et diagnostics.

Chaque message `tableRange` transporte `jobId`, `refId`, génération, niveau, premier slot, nombre de slots, couverture d’orbite et les payloads correspondants. Ces trois identités sont vérifiées avant le calcul, après le calcul et avant le transfert. Une unité devenue périmée est comptée puis jetée.

Côté GPU, la capacité d’orbite est une puissance de deux. Chaque niveau possède une plage réservée et un compteur `committed`. Le moteur écrit d’abord coefficients, sidecar et enveloppes, puis publie le nouveau compteur dans le répertoire : l’ordre de la queue GPU constitue la barrière de commit. Lors d’un doublement de capacité, seules les plages déjà validées sont copiées GPU→GPU vers de nouveaux buffers ; le bind group est remplacé dans l’ordre de queue, sans effacer l’historique de rendu.

Auto peut donc s’activer dès le premier préfixe certifié, avant la fin de l’orbite et des niveaux supérieurs. Le shader reçoit à la fois la longueur d’orbite réellement disponible et les comptes de slots publiés. Au-delà, il exécute la perturbation exacte. Le premier préfixe relance une fois la convergence ; les extensions suivantes ne vident ni la texture progressive ni les compteurs déjà valides.

## Application dans le shader

À chaque tour de la boucle WGSL :

1. le shader cherche le plus grand niveau aligné dont le slot est `committed` et dont la fin ne dépasse ni le préfixe publié ni `globalMaxIter` ;
2. en BLA, Padé, Jet, Möbius ou Auto legacy, il applique le test de rayon correspondant au mode ;
3. en Auto dynamique, il évalue l’enveloppe avec les `log2|δc|` et `log2|δz|` du pixel, puis choisit le premier tier certifié ;
4. il teste les gardes critiques communes et, pour les formes rationnelles, la marge au pôle ;
5. si un tier passe, il met à jour $\delta z$, la dérivée, la dérivée seconde utile à Auto et l’indice de référence en un saut ;
6. sinon il descend de niveau ; si aucun bloc publié ne passe, il exécute exactement

$$
\delta z\leftarrow2Z\delta z+\delta z^2+\delta c.
$$

Le rebase de Zhuoran reste actif après les sauts comme après les pas exacts : lorsque $\lvert Z+\delta z\rvert<\lvert\delta z\rvert$, l’état complet devient le nouveau $\delta z$ et l’indice de référence revient à zéro. La table est donc une accélération locale et opportuniste, jamais une obligation pour terminer un pixel.

## Quand une table est-elle réellement reconstruite ?

| Changement | BLA / Padé | Jet / Möbius legacy | Auto dynamique + incrémental |
|---|---|---|---|
| Nouvelle orbite de référence | nouvelle table | nouveaux coefficients et rayons | nouveau builder ; ancien `refId` rejeté |
| Hausse de `maxIterations` | extension/rebuild pour couvrir le budget | ancien préfixe utilisable, extension one-shot différée | append de l’orbite et des seuls nouveaux blocs |
| Changement de $\varepsilon$ | nouvelle table | nouveaux rayons, coefficients réutilisés | nouvelles enveloppes ; coefficients conservables conceptuellement, génération séparée par sécurité |
| Mouvement `cmax` dans le domaine | gardes par pixel | nouveaux rayons/tags si le bucket change | aucun rebuild de bloc ; header optionnel seulement si nécessaire |
| Sortie du domaine de référence | pas de domaine global comparable | nouvelles bornes/rayons | blocs hors domaine refusés, puis nouvelle référence/enveloppe |
| Changement de mode | table BLA/Padé distincte | stockage propre à Jet/Möbius | génération changée ; aucune plage d’un mode précédent n’est mélangée |

Le panneau de performance expose séparément la couverture d’orbite construite par Rust, la couverture de table publiée, les blocs `committed` par niveau, les octets transférés, les yields, annulations, croissances de capacité et le pic mémoire du builder. `validation`, à côté du nombre de références, désigne la vérification/recentrage de l’orbite ; ce n’est pas une seconde passe de preuve des enveloppes.

Ainsi, Auto n’est ni une table Jet choisie automatiquement, ni cinq tables complètes en parallèle. C’est une géométrie dyadique, un enregistrement de coefficients partagé par quatre évaluateurs et, selon le drapeau de rollout, soit un sidecar principal/secours legacy, soit une enveloppe de preuve évaluée pour chaque pixel. La perturbation exacte reste le dernier maillon dans tous les cas.
