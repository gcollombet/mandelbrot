# Tables d’approximation : BLA

Les tables ne remplacent pas la perturbation : elles en regroupent plusieurs pas consécutifs. Pour un pixel donné, le shader tente le plus grand bloc compatible avec son indice de référence et son état local. Si toutes les gardes passent, il saute plusieurs itérations ; sinon il descend vers un bloc plus court, puis exécute finalement la récurrence exacte d’un pas.

Cette page décrit l’implémentation actuelle du moteur, depuis la construction Rust jusqu’à l’application WGSL. Le moteur n’implémente plus que les blocs affines (BLA) ; les formes rationnelles (Padé, Möbius), les jets et le mode Auto ont été retirés.

## Point de départ commun

Pour une référence de paramètre $C_r$, Rust calcule l’orbite

$$
Z_{n+1}=Z_n^2+C_r.
$$

Un pixel du viewport s’écrit $C=C_r+\delta c$ et son état $z_n=Z_n+\delta z_n$. La récurrence de perturbation est alors

$$
\delta z_{n+1}=2Z_n\delta z_n+\delta z_n^2+\delta c.
$$

L’orbite de référence est la partie construite en précision arbitraire (`DBig`). Les échantillons mis à disposition de la suite du pipeline sont stockés comme couples `f32`. La table n’est donc pas composée directement en `DBig` : son constructeur travaille à partir de cette orbite échantillonnée, en `f64`, puis sérialise chaque bloc en nombres complexes à exposant étendu (floatexp) pour que le chemin profond du shader reste correct.

Une entrée de table approxime la composition de la récurrence sur un segment de longueur `skip`. Les segments sont rangés par niveaux dyadiques : 4, 8, 16, 32… itérations. Le slot `s` du niveau `skip` part de l’indice de référence

$$
n=1+s\,\text{skip}.
$$

Les niveaux 1 et 2 ne sont pas émis : un bloc linéaire court ne représente pas correctement certains passages dominés par $\delta z^2$.

## Le bloc affine

Un bloc conserve deux coefficients complexes : $A$ pour la dépendance en $\delta z$, $B$ pour celle en $\delta c$ :

$$
\delta z' \approx A\,\delta z + B\,\delta c.
$$

La graine d’un pas au point $Z$ est $A = 2Z$, $B = 1$, avec un rayon de validité $\alpha = \varepsilon\,|Z|$ et une pente $\beta = 0$. Deux blocs consécutifs $x$ puis $y$ fusionnent en

$$
A = A_y A_x,\qquad B = A_y B_x + B_y,\qquad
\alpha = \min\!\left(\alpha_x,\ \frac{\alpha_y}{|A_x|}\right),\qquad
\beta = \max\!\left(\beta_x,\ \frac{\beta_y + |B_x|}{|A_x|}\right).
$$

Les coefficients $A$ et $B$ partagent un exposant binaire ; le rayon $\alpha$ possède son propre exposant, ce qui évite les dépassements et sous-flux aux zooms profonds. Chaque enregistrement GPU compte 8 mots de 4 octets : `ax, ay, bx, by, ab_exp, radius_alpha, alpha_exp, radius_beta`. Le rayon est arrondi vers le bas et la pente vers le haut à la sérialisation, de sorte que le domaine accepté par le GPU est toujours inclus dans le domaine certifié en `f64`.

Le répertoire de niveaux indique pour chaque niveau l’offset du premier bloc, le nombre de blocs, le saut et le plus grand rayon du niveau. Ce dernier permet au shader de rejeter un niveau entier à partir de $|\delta z|$ seul, avant de charger le moindre bloc.

## Application dans le shader

À chaque tour de la boucle WGSL :

1. le shader cherche le plus grand niveau aligné dont la fin ne dépasse pas `globalMaxIter` ;
2. il compare $\log_2|\delta z|$ au rayon du niveau, puis au rayon certifié du bloc $\log_2\big(\alpha - \beta\,|\delta c|\big)$, calculé avec des arrondis dirigés vers le refus ;
3. si le bloc passe et que le point d’arrivée $Z_{n+\text{skip}} + \delta z'$ n’a pas échappé, il met à jour $\delta z$, la dérivée $z'$ et la dérivée seconde $z''$ en un saut ;
4. sinon il descend de niveau ; si aucun bloc ne passe, il exécute exactement

$$
\delta z\leftarrow2Z\delta z+\delta z^2+\delta c.
$$

Le rebase de Zhuoran reste actif après les sauts comme après les pas exacts : lorsque $\lvert Z+\delta z\rvert<\lvert\delta z\rvert$, l’état complet devient le nouveau $\delta z$ et l’indice de référence revient à zéro. La table est donc une accélération locale et opportuniste, jamais une obligation pour terminer un pixel.

## Quand la table est-elle reconstruite ?

| Changement | Effet |
|---|---|
| Nouvelle orbite de référence | nouvelle table |
| Hausse de `maxIterations` | extension pour couvrir le budget |
| Changement de $\varepsilon$ ou du saut maximal | nouvelle table |
| Mouvement de la vue | aucun : les gardes utilisent le $|\delta c|$ réel du pixel |
| Passage en perturbation exacte | aucune table n’est demandée |

La table est indexée par l’orbite, sa longueur et $\varepsilon$. Elle n’est pas indexée par une borne globale sur $|\delta c|$ : c’est la valeur du pixel qui intervient dans ses gardes.
