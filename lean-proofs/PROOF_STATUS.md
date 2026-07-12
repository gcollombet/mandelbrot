# État des preuves de la note Padé → Möbius-c⁺

## Portée

Ce dossier couvre les énoncés algébriques et les bornes scalaires de difficulté
facile à modérée. Le build complet passe avec Lean 4.31.0 / Mathlib 4.31.0 et
les sources ne contiennent aucun `sorry`, `axiom` ou `admit`.

Une preuve ci-dessous certifie la formule mathématique sur les types indiqués
par le lemme. Elle ne certifie pas automatiquement son implémentation `f64`,
les arrondis WebGPU, ni les hypothèses dynamiques qui doivent être contrôlées
au runtime.

## Résultats entièrement formalisés

### Padé et pas exact

- Le reste augmenté
  `m-f = z(z²+c)/(a-z)` et sa spécialisation Julia sont prouvés par
  `padeSeed_sub_exactStep` et `padeSeed_sub_exactStep_julia`.
- Les deux normalisations relatives distinctes sont prouvées sous forme
  multiplicative par `pade_error_as_fraction_of_pade` et
  `pade_error_as_fraction_of_exact`.
- Les rayons correspondants
  `q ≤ √ε` et `q ≤ √(ε/(1+ε))` sont prouvés par
  `julia_pade_relative_radius` et `julia_exact_relative_radius`.
- L'identité de transport
  `f(y)-f(x)=(y-x)(a+x+y)` et sa version en norme sont prouvées.
- Dans le canal Julia, le Padé `[1/1]` a une erreur inférieure ou égale à
  celle du jet affine sur la région exacte `|z| <= |a-z|`, et strictement
  inférieure pour `z != 0` à l'intérieur. Le disque simple
  `2|z| <= |a|` est prouvé inclus dans cette région de dominance.
- `choosePadeOrJet_error_le_min` prouve qu'un sélecteur piloté par deux
  certificats possède la borne `min(E_Pade,E_jet)`. Sa spécialisation
  `cplus_or_jet_error_le_min` utilise directement le certificat résiduel
  rationnel : le portefeuille Padé/jet ne peut donc jamais dégrader la borne
  certifiée du jet seul.
- Pour un dénominateur `[L/1]` `1-lambda X`, le coefficient de degré `n+1`
  du produit croisé est exactement `a_(n+1)-lambda a_n`. Le résidu Padé est
  donc constitué des défauts de cette récurrence. Une queue exactement
  géométrique donne un Padé exact ; une borne sur le résidu des défauts donne
  quantitativement `|erreur| <= REST/lower`.
- La carte de temps `t` du flot parabolique `ż=z²` est formalisée comme
  `Phi_t(z)=z/(1-tz)`, avec loi de semi-groupe additive. Le reste exact de son
  jet polynomial d'ordre `K` est
  `t^K z^(K+1)/(1-tz)`.
- `padeL1_X_eq_parabolicFlow` prouve que le `[1/1]` de numérateur `X` est
  exactement cette carte de flot. Hors `t=0`, `z=0` et du pôle, son erreur est
  nulle tandis que celle de tout jet fixé est strictement positive.
- Les premiers résidus non compensés sont identifiés aux mineurs de Hankel :
  `q30=(a10*a30-a20²)/a10` pour `[1/1]` et
  `q40=(a20*a40-a30²)/a20` pour `[2/1]`. Sous non-annulation des coefficients,
  l'annulation de tous les mineurs consécutifs est équivalente à une unique
  récurrence géométrique.
- Une borne quantitative sur les défauts géométriques donne un majorant Padé
  égal au majorant de queue du jet multiplié par `delta/(1-mu)`. Il est
  strictement meilleur lorsque `delta < 1-mu`, où `1-mu` est la marge de pôle.
- Enfin, `parabolic_discrete_shadowing` compare rigoureusement l'itération
  discrète `z↦z+z²` à `z/(1-nz)`. Si les deux chemins restent dans `|z|≤r<1`,
  l'erreur après `n` pas est bornée par
  `(r³/(1-r)) * sum_(k<n) (1/(1-r)²)^k`.

Conséquence : une tolérance relative à la vraie carte doit employer le
second rayon, plus petit. Substituer le premier change effectivement le
théorème annoncé. Padé n'est pas universellement meilleur qu'un jet de même
information, mais le sélecteur certifié est universellement sans régression,
et Padé est supérieur lorsque les défauts quasi géométriques sont assez petits.
Sur le flot parabolique cette supériorité est désormais stricte et exacte ; le
théorème de shadowing explique quantitativement ce qui subsiste pour la
dynamique discrète, sous une hypothèse explicite de confinement du domaine.

### Composition de Möbius

- Le produit homogène exact de deux matrices est prouvé.
- La clôture exacte pour `c=0` est prouvée par
  `mobius_composition_julia`.
- Pour `c≠0` fixé, la normalisation exacte par
  `1+D_y B_x c` est prouvée par `mobius_composition_normalized`.
- Les quatre entrées de la composition au premier ordre en `c` sont
  développées exactement. En particulier le coefficient bas-gauche contient
  bien `H_x + H_y A_x`.
- Le certificat algébrique du rayon intermédiaire
  `r_y/(|A_x|+r_y|D_x|)` est prouvé par `mobius_intermediate_radius`.

Conséquence : la table `(A,B,D)` indépendante du pixel est fermée exactement
en Julia, mais pas en Mandelbrot sans faire dépendre ses coefficients de `c`.
Les anciennes récurrences sans normalisation ne peuvent donc être annoncées
comme une composition exacte pour `c≠0`.

### Formes c⁺

- L'extraction `[1/1]-c⁺` annule exactement
  `q20`, `q11`, `q02`, `q21` sous les seules hypothèses de dénominateur
  nécessaires.
- L'extraction `[2/1]-c⁺` annule en plus `q30`.
- `[2/1]-c⁺` reproduit exactement un seed quadratique.
- Sur le flot modèle `a_n=L^(n-1)`, `q40` s'annule aussi.
- Les différences finies exactes du numérateur, du dénominateur et du quotient
  prouvent les coefficients utilisés par les formules `m_z` et `m_c`, avec
  `F` et `N2` inclus.

Conséquence : `[2/1]-c⁺` reproduit strictement plus de coefficients locaux
que `[1/1]-c⁺`. Cela ne prouve toujours pas un rayon global plus grand : son
pôle et son majorant sont différents.

### Jets, série pure-c et sensibilités

- Le merge exact de deux pas est décomposé en son jet de degré 2 et son reste.
  Les termes `2 a1 zc` et `c²` apparaissent effectivement au premier merge.
- La relation `JetEq K` est stable par addition, multiplication, puissance et
  substitution dans un polynôme extérieur fixé. C'est le noyau algébrique de
  la propriété « tronquer l'entrée ne change pas les coefficients bas de la
  composée ».
- La version réellement bivariée `TotalJetEq K`, indexée par les exposants de
  `(z,c)` et filtrée par degré total, est stable par addition, produit,
  puissance et pas quadratique.
- `totalTrunc_step_commutes` prouve la commutation de la troncature avec un
  pas ; `iterateTruncated_eq_totalTrunc_iterate` prouve par induction que
  tronquer après chaque merge produit exactement le même jet final que
  composer les polynômes finis complets puis tronquer une seule fois.
- La récurrence de la série pure-`c` est prouvée coefficient par coefficient,
  notamment `b1' = a b1 + 1` et la convolution quadratique aux ordres suivants.
- Les récurrences exactes de première et seconde sensibilité, ainsi que le
  reste d'un transport quadratique d'ordre 2, sont prouvées.

Conséquence : le jet et la série pure-`c` sont des références algébriques
fiables pour construire les tables et l'anti-aliasing analytique. Leur erreur
analytique exige encore un domaine et un reste certifiés.

### Majorants, condition radiale et erreurs

- `rho' = |a| rho + rho² + Rc` est prouvé comme majorant d'un pas, puis par
  induction pour une orbite entière.
- Le passage d'un rayon intermédiaire à un rayon de sortie est prouvé.
- Pour une fonction convexe sur `[0,r]`, la validité aux deux extrémités
  implique la validité sur tout l'intervalle.
- La queue
  `Σ(k≥0) (D+k+1)θ^(D+k)` possède exactement la forme fermée annoncée.
- Pour une fonction complexe différentiable sur un disque fermé, la série de
  Cauchy représente la fonction sur le disque ouvert et son coefficient
  d'ordre `n` est borné par `M/R^n` lorsque `M` borne la frontière.
- Le regroupement bivarié par degré total est borné par
  `(d+1) M theta^d`, et toute queue non négative dominée terme à terme est
  bornée par la forme de Cauchy fermée.
- L'estimation de Cauchy est itérée sur les deux cercles du bidisque et donne
  `|a_ij| <= M Rz^-i Rc^-j` sous les hypothèses d'intégrabilité explicites.
- La queue anisotrope exacte est prouvée :
  `[u^(D+1)/(1-u)-v^(D+1)/(1-v)]/(u-v)` pour `u!=v`, avec la formule
  historique en `theta` comme valeur diagonale amovible.
- `anisotropicTailClosed` fournit une branche totale et numériquement sûre ;
  sa positivité, sa monotonie séparée en `u,v` et sa domination par le cas
  diagonal `theta >= max(u,v)` sont prouvées.
- `iteratedCauchy_polydisc_tail_closed_le` relie bout en bout la borne sur la
  frontière distinguée, les coefficients itérés, les tranches de degré total
  et la queue infinie évaluée en `(x,y)`.
- L'évaluation des applications multilinéaires sur les directions unité est
  bornée par leur norme d'opérateur ;
  `iteratedCauchyValue_polydisc_tail_closed_le` donne donc le même certificat
  directement pour les coefficients de Taylor à valeurs complexes/vectorielles.
- Pour `N2` arbitraire, le résidu croisé
  `Q = den * Phi - num` vérifie exactement
  `cplusEval - Phi = -Q/den` dès que le dénominateur est non nul. La minoration
  `DEN = 1-|F|y-(|D|+|D'|y)x` est prouvée sur tout le bidisque.
- Une borne `|Q| <= REST` donne formellement
  `|cplusEval-Phi| <= REST/DEN`. La règle `(V)` implique donc l'erreur absolue
  annoncée `<= eps*S`. Une vraie erreur relative à `Phi` est également prouvée,
  mais requiert explicitement une minoration positive `L <= |Phi|`.
- `cplusResidual_polydisc_tail_closed_le` spécialise la queue de Cauchy au
  résidu rationnel lui-même. `cplus_polydisc_model_scaled_error_le` compose
  cette queue, l'identification au morceau de série omis et `(V)` en un
  certificat de bout en bout. Le résultat couvre `[2/1]-c⁺` et donc
  `[1/1]-c⁺` par `N2=0` ; les deux extractions possèdent aussi des corollaires
  dédiés.
- `cplus_radial_rule` prouve abstraitement que la convexité du gap et sa
  validité aux deux extrémités certifient tout `[0,r]`; le théorème combiné
  applique ensuite ce rayon à l'erreur rationnelle.
- Une erreur récurrente constante est bornée par une somme géométrique, puis
  par `eps/(1-gamma)` sous contraction.
- Une translation accumule au plus linéairement en `k`; la distorsion de la
  carte de sortie multiplie ensuite ce terme par sa constante de Lipschitz.

Conséquence : le test de validité à `x=0` est indispensable avant d'émettre
un rayon utilisé par une unique comparaison `|z|<r`. Une simple validation au
bord ne suffit pas si l'intervalle admissible ne contient pas l'origine.

### Régime périodique

- L'équation quadratique des points fixes `[1/1]-c⁺` est prouvée.
- La différence finie donne exactement le déterminant
  `Ae*K-Bc*De` et donc le multiplicateur annoncé.
- L'équation de point fixe de `[2/1]-c⁺` reste quadratique, avec coefficient
  `De-N2`.
- La factorisation autour d'un point fixe, la linéarisation par birapport et
  l'itération `w_k=kappa^k w_0` sont prouvées.
- La limite coalescente de Jordan
  `(lambda*(1+N))^k=lambda^k*(1+kN)` est prouvée lorsque `N²=0`.
- Un domaine forward-invariant contient toute l'orbite exacte.
- Si les orbites exacte et approchée restent dans ce domaine, si l'erreur de
  modèle par bloc est `eps` et si le bloc est uniformément `gamma`-Lipschitz,
  l'erreur est bornée par la somme géométrique puis uniformément par
  `eps/(1-gamma)` lorsque `gamma<1`.

Conséquence : le fast-forward par matrice `2x2` est justifié pour la forme
`[1/1]`, y compris à la coalescence via Jordan. La forme `[2/1]`, bien que son
équation de point fixe soit quadratique, n'est pas une transformation de
Möbius et ne bénéficie pas de cette fermeture. La borne amortie demande bien
une contraction uniforme et l'inclusion des deux chemins, pas seulement la
valeur du multiplicateur au point fixe.

### Forme normale de Fatou

- Le changement `u=-1/(a t)` du germe cubique est calculé exactement.
- Le reste rationnel après
  `t+1-(q-1)/t` est donné exactement.
- Avec `rho=b/a²-1`, le terme dynamique est donc `-rho/t`.
- Une translation approchée accumule son résidu linéairement. Sous une borne
  de Lipschitz `L` de la carte de sortie sur le domaine certifié, l'erreur de
  sortie est formellement bornée par `k L epsPsi`.

Conséquence : sous cette convention, le premier terme logarithmique de la
coordonnée de Fatou doit porter le signe `+rho log(t)`. Le signe opposé exige
la convention opposée `rho_alt=1-b/a²`.

## Ce qui reste hors du lot facile à modéré

Les points suivants ne sont pas présentés comme certifiés par ce dossier :

1. le passage de la clôture bivariée maintenant prouvée pour les polynômes
   finis à une formulation générique en séries formelles/analytique infinies ;
2. la preuve que l'holomorphie du résidu concret fournit automatiquement les
   hypothèses d'intégrabilité, puis que les coefficients `REST` du builder
   représentent bien le morceau de série omis (`hseries`) ; la variante
   anisotrope de la queue `dQ/dz` reste aussi à raccorder ;
3. le théorème d'erreur Mandelbrot global signalé comme incomplet dans la note
   source, ainsi que la preuve que le solveur concret implémente exactement le
   certificat radial maintenant formalisé ;
4. la preuve que les tests runtime concrets impliquent les hypothèses
   abstraites maintenant formalisées de contraction uniforme et d'invariance
   du domaine pour chaque bloc périodique ;
5. l'existence analytique des cartes sectorielles de Fatou, les données de
   corne, les branches de logarithme et une borne de Lipschitz de la carte de
   sortie ;
6. l'arithmétique flottante : arrondis dirigés, erreurs `f64`/WGSL, stabilité
   des divisions et conformité exacte entre Rust, TypeScript et shaders ;
7. les mesures de vitesse, nombres de tours, gains de rayon et qualité
   d'image, qui sont des résultats expérimentaux et non des théorèmes Lean.

Ces obligations sont les prochaines candidates pertinentes. Les points 1 à 5
demandent désormais surtout de relier les structures analytiques abstraites aux
données concrètes du builder et du runtime ; le point 6 demande un modèle
d'arithmétique flottante et un audit du code concret.
