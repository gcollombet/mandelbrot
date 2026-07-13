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
- `padeSeed_strictly_dominates_affine_on_half_disk` donne la version uniforme
  utilisable par le builder : si `2R<|a|`, Padé est strictement meilleur que
  le jet affine en tout point non central de `|z|<=R`, et la même inégalité
  exclut automatiquement le pôle.
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
- Une version plus fine supprime ce facteur de Lipschitz uniforme.
  `parabolicFlow_sub_discrete_eq_sum_transport` donne l'identité télescopique
  exacte, terme par terme, avec le temps restant dans chaque dénominateur.
  `parabolic_discrete_shadowing_variable` la majore avec des rayons distincts
  `r_j`. Enfin `parabolic_discrete_shadowing_envelope` prouve que la simple
  récurrence builder `r_(j+1)=r_j+r_j²` suffit à enclore l'orbite et à produire
  le certificat variable complet, sous les deux marges de pôle explicites.
- La généralisation non autonome est formalisée. Le Padé du pas
  `a_j(a_j z+c)/(a_j-z)` possède la matrice homogène
  `[[a_j²,a_j c],[-1,a_j]]`. Les produits arrière canoniques représentent les
  queues du bloc et transportent exactement le défaut local
  `z_j(z_j²+c)/(a_j-z_j)` par leur déterminant et leurs deux dénominateurs.
- `nonautonomous_pade_telescope` somme ces défauts exactement pour une suite
  arbitraire `a_j` et pour `c≠0`. `nonautonomous_pade_shadowing_bound` fournit
  ensuite un majorant calculable : l'enveloppe suit
  `r_(j+1)=|a_j|r_j+r_j²+y`, les sorties exacte et Padé ont des rayons séparés,
  et les marges des queues sont calculées depuis les quatre entrées de chaque
  matrice.
- La compression `matrix-c1` de ce produit est maintenant formalisée.
  `MatrixC1.comp` donne la récurrence exacte des parties constante et linéaire
  des quatre entrées. Le terme perdu lors d'une composition est exactement
  `c² M₁N₁`.
- `padeMatrixC1TailBound` transporte récursivement l'erreur déjà omise et
  ajoute ce nouveau terme quadratique. `padeMatrixC1_tail_le` prouve que cette
  quantité majore toute la queue polynomiale `c²+...` sur `|c|≤y`.
- `matrixC1_comp_tail_le` traite maintenant le merge équilibré de deux blocs
  portant chacun une queue. Le majorant contient les transports des deux
  erreurs, leur produit `E_outer*E_inner`, et le défaut neuf `c² M₁N₁`. Cette
  règle est calculable en temps constant par nœud du merge-tree.
- Une erreur matricielle `E` perturbe numérateur et dénominateur d'au plus
  `E(R+1)` sur `|z|≤R`. `exact_den_margin_of_matrixC1` prouve donc que la
  matrice exacte conserve la marge affichée par la matrice tronquée, diminuée
  de `E(R+1)`. `MatrixC1.uniformDenMargin` minore en plus cette marge
  simultanément pour tout `|c|≤y`, à partir des seuls huit coefficients.
- `matrixC1_nonautonomous_total_error` additionne enfin, sans identifier leurs
  dénominateurs, le majorant Padé–Mandelbrot non autonome et l'erreur complète
  de troncature matricielle. Il constitue le certificat exact-arithmétique du
  tier runtime proposé à huit coefficients complexes.
- La route de dérivée directe est également fermée. La dérivée d'une
  homographie est `det/den²`; `Homography.det_sub_det_le` et
  `Homography.deriv_eval_sub_le` bornent respectivement la perturbation du
  déterminant et celle des deux dénominateurs carrés.
- `nonautonomous_pade_derivative_shadowing_bound` différentie le télescopage
  non autonome. Chaque défaut local reçoit bien le facteur de chaîne
  `prod_(k<j)(|a_k|+2r_k)`, puis les deux transports de suffixe utilisent leurs
  marges Padé et exacte séparées.
- `matrixC1_nonautonomous_total_derivative_error` additionne ce shadowing
  dérivé à l'erreur de troncature du jet matriciel affine en `c`. C'est le
  certificat complet de la route Rust directe, sans disque élargi de Cauchy.
- `norm_iteratedDeriv_le_on_inner_disk` transforme une borne uniforme de valeur
  sur un disque extérieur en borne de toute dérivée sur un disque intérieur.
  Les corollaires donnent `M/gap` au premier ordre et `2M/gap²` au second.
  `cauchy_runtime_partial_bounds` couvre `z`, `c`, `zz` et `cc` sur un bidisque,
  tandis que `norm_mixedDeriv_le_on_inner_polydisc` donne
  `(M/gapZ)/gapC` pour la dérivée mixte.

Conséquence : une tolérance relative à la vraie carte doit employer le
second rayon, plus petit. Substituer le premier change effectivement le
théorème annoncé. Padé n'est pas universellement meilleur qu'un jet de même
information, mais le sélecteur certifié est universellement sans régression,
et Padé est supérieur lorsque les défauts quasi géométriques sont assez petits.
Sur le flot parabolique cette supériorité est désormais stricte et exacte ; le
théorème de shadowing explique quantitativement ce qui subsiste pour la
dynamique discrète, sous une hypothèse explicite de confinement du domaine.
La version non autonome montre que ni la variation de `2Z_j` ni le canal `c`
ne sont des obstacles analytiques. La compression affine en `c` et sa perte de
marge sont désormais certifiées ; restent son implémentation concrète dans le
builder et la mesure de son intérêt face à `[2/1]-c⁺`.

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

### Image exacte d'un disque par Möbius

- `mobius_disk_pole_margin` prouve, pour `R≥0`, l'équivalence exacte entre
  `Delta = |Cc+D|²-|C|²R² > 0` et l'absence de zéro de `Cz+D` sur tout le
  disque fermé `D(c,R)`. La réciproque construit explicitement le pôle lorsque
  la marge est non positive, y compris le cas dégénéré `C=0`.
- `mobius_image_disk_exact` prouve les formules
  `centre=(p conj(q)-A conj(C)R²)/Delta` et
  `rayon=|AD-BC|R/Delta` via une identité hermitienne signée exacte.
- Sous `Delta>0` et `det≠0`, l'appartenance au disque source est équivalente
  à l'appartenance de l'image au disque calculé pour tout point fini hors du
  pôle ; le disque fermé est transporté vers ce disque et le cercle frontière
  vers son cercle frontière.

Conséquence : le prototype Schwarz--Pick peut employer un transport de disque
exact pour chaque bloc Möbius au lieu d'un majorant euclidien par normes.

### Matrice affine en `c`, repères mobiles et métrique hyperbolique

- `MatrixC1Disk.lean` généralise la queue ponctuelle à tout disque
  `D(z₀,R)` par `E(|z₀|+R+1)` et prouve que
  `queue < diskPoleMargin` implique `Delta_exact>0` pour toute matrice exacte
  dans cette queue.
- `MatrixC1.mapsTo_closedBall_uniform_all` quantifie le résultat sur tout
  `|c|≤y` à partir de la marge uniforme des huit coefficients. Pour chaque
  `c`, la carte exacte est incluse dans le disque image exact de
  `M₀+cM₁`, gonflé du majorant de valeur déjà prouvé.
- `MatrixC1.norm_deriv_exact_le_uniform` fournit simultanément la borne de
  dérivée directe, avec le déterminant et la marge de pôle uniformes du
  builder. Aucun disque de Cauchy élargi n'est requis.
- `MovingDisks.lean` formalise les frames `(centre,rayon)`. La composition de
  deux blocs transporte exactement la frame intermédiaire, les deux facteurs
  hermitiens se multiplient, et leurs certificats locaux d'absence de pôle
  impliquent celui de la matrice composée.
- La positivité de `Delta` et la marge de pôle sont invariantes par
  normalisation projective non nulle.
- `HyperbolicTelescope.lean` prouve le lemme de Schwarz centré entre deux
  disques, le télescopage additif de défauts dans une suite arbitraire de
  métriques mobiles et les conversions
  `eps/(R(1-q²))` puis `R(1+q²)delta` entre erreurs euclidienne et
  pseudohyperbolique sur l'intérieur `qR`.
- `SchwarzPick.lean` construit l'automorphisme explicite envoyant un point
  arbitraire sur zéro, son adjugée inverse, leurs exclusions de pôle et
  l'identité de birapport. `DiskFrame.schwarzPick` prouve alors, pour toute
  application holomorphe `f : D₁ → D₂` et tous `z,w∈D₁`,

  ```text
  pseudoDist_D2(f(z),f(w)) <= pseudoDist_D1(z,w).
  ```

- `Homography.schwarzPick_imageFrame` spécialise ce résultat : tout bloc
  Möbius non dégénéré est non expansif entre un disque et sa frame image
  exacte. `mapsTo_ball_imageFrame` ferme le passage des disques fermés aux
  intérieurs ouverts requis par le théorème analytique.

Conséquence : l'obligation analytique Schwarz--Pick à deux points est fermée.
Le prochain travail est désormais une intégration build-only : choisir les
frames et marges intérieures, calculer les défauts locaux, puis comparer le
rayon issu du télescope au certificat euclidien existant.

### Perturbation exacte et rebasing Zhuoran

- `mandelbrot_perturbation_identity` raccorde explicitement les orbites
  complètes à `exactStep` :
  `(Z+dz)²+(C+dc)-(Z²+C)=2Z*dz+dz²+dc`.
- `PerturbationState` sépare le compteur d'itération physique, l'index de
  référence, `dz` et ses deux premières dérivées en `dc`.
- Le pas exact préserve simultanément la valeur physique et les récurrences
  des dérivées première et seconde.
- Le rebase `dz <- Z_m+dz, m <- 0` conserve valeur, compteur et dérivées ; la
  garde Zhuoran prouve en plus la diminution stricte de `|dz|`.
- `PerturbationAction.run_initial_correct` prouve par induction la correction
  de toute suite finie de pas exacts et de rebases depuis l'état initial.
- `ValueWithin` et `DifferentialWithin` étendent l'invariant à des sauts
  approchés possédant un budget non nul. Le rebase conserve exactement ces
  trois budgets.
- `CertifiedTransition.comp` compose les certificats de tiers successifs et
  `then_rebase` prouve qu'un rebase après affine, Padé ou jet ne consomme aucun
  budget supplémentaire.
- Bailout, lissage, distance estimation et observables d'AA qui ne dépendent
  que de la valeur physique et de ses dérivées sont invariants par rebase.

Conséquence : la sémantique employée par `unified_replay_band`, les boucles de
perturbation/rebasing et le portefeuille `auto` est maintenant formalisée au
niveau exact et au niveau « saut approché certifié ». Les sauts approximatifs
gardent leurs certificats propres ; le rebase ne les transforme pas en
égalités exactes, mais prouve qu'il n'ajoute aucune erreur.

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
- Les récurrences de troisième et quatrième sensibilité sont maintenant
  prouvées pour le pas non autonome `a*z+z²+c`.
- `quadraticStep_taylor2_remainder` donne l'identité exacte du reste d'un
  modèle local `z+u*h+q*h²`, avec `q=z''/2` :
  `(a+2T)R+R²+2uqh³+q²h⁴`.
- `norm_quadraticStep_taylor2_remainder_le` transforme cette identité en la
  récurrence scalaire calculable
  `(abs(a)+2S)E+E²+2 abs(u) abs(q) r³+abs(q)²r⁴`.
- `taylor2_orbit_remainder_bound` propage ce certificat par induction sur une
  orbite non autonome entière, pour tous les offsets `|h|<=r`.
- La queue géométrique après l'ordre `K` possède la forme fermée
  `M*theta^(K+1)/(1-theta)`, et les corollaires de Cauchy donnent les erreurs de
  première et seconde dérivée du reste sur un disque intérieur.
- `rectangular_tile_mem_closedBall` ramène un tile quelconque à un disque
  certifié. `tile_same_first_escape` prouve les tests supérieur avant `n` et
  inférieur à `n` qui imposent un premier escape commun à tout le tile.
- `checkpoint_error_step` additionne enfin l'erreur injectée par la graine et
  l'erreur locale du mouvement suivant selon
  `eta+e*(abs(a)+2*rho+e)`.

Conséquence : le jet et la série pure-`c` sont des références algébriques
fiables pour construire les tables et l'anti-aliasing analytique. Le noyau
exact-arithmétique d'une SA locale par tile est désormais certifié : une graine
peut diffuser un checkpoint sur tout rectangle inclus dans son disque, et les
pixels refusés conservent le fallback ordinaire. Restent le raccord au payload
GPU concret, le budget de couleur/DE et les mesures d'acceptation des tiles.

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
- `ValidEmittedRadius` formalise le vrai contrat du shader : tous les rayons
  inférieurs à celui émis doivent être valides. Ce prédicat est prouvé
  descendant. `ConvexRadiusCertificate` (centre, bord, convexité) implique ce
  contrat et forme lui-même un prédicat préfixe.
- `radiusBisectStep_preserves_bracket` et `radiusBisectStep_width` prouvent
  l'invariant accepté/rejeté de la bissection et la division exacte de sa
  largeur par deux. La bissection est donc justifiée lorsqu'elle sonde le
  certificat complet, et non la seule valeur du gap au bord.
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
- Les hypothèses abstraites sont désormais déchargées par trois tests scalaires
  directement calculables pour
  `g(z)=(Ae*z+Bc)/(De*z+K0)` sur `|z|≤r`. La marge est
  `mu=|K0|-|De|r`, la borne d'image est
  `I=(|Ae|r+|Bc|)/mu`, et la constante uniforme est
  `gamma=|Ae*K0-Bc*De|/mu²`.
- `periodic_runtime_certificate` prouve que `mu>0`, `I+eps≤r` et `gamma<1`
  impliquent simultanément l'invariance des orbites Möbius et exacte, puis
  l'erreur uniforme `eps/(1-gamma)` à tout horizon.
- `periodic_cross_ratio_orbit_enclosed` prouve le vrai test du chemin fermé :
  si `|w_0|≤q<1` et `|kappa|≤1`, toute l'orbite reconstruite reste sous
  `|alpha|+|alpha-beta|q/(1-q)`. Ce majorant remplace le test heuristique
  `2 max(|alpha|,|z-alpha|)` du shader.
- L'échec de `period2` pour le Padé pas-à-pas est maintenant un théorème :
  lorsque `a=0`, aucune marge locale positive n'existe sur un disque centré et
  le dénominateur de la matrice élémentaire s'annule exactement au centre.
- Cet échec n'est pas dynamique. `periodTwoReturnFromMinusOne` regroupe les
  pas `a=-2` puis `a=0` en le polynôme
  `(-2z+z²+c)²+c`. Sa dérivée centrale est nulle à `c=0`,
  `periodTwoGroupedRadius=(2r+r²+y)²+y` borne son image, et l'inégalité
  `periodTwoGroupedRadius<=r` certifie un disque invariant. Le corollaire
  simple `r<=1/9` est prouvé pour `c=0`.

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
- Les flots modèles `u'=a u²` et `u'=a u³` possèdent les coordonnées exactes
  `-1/(a u)` et `-1/(2a u²)` ; la seconde est indépendante du choix de la
  racine carrée, qui ne sert qu'à sélectionner le pétale de sortie.
- Pour la coordonnée à fractions partielles réellement utilisée par le
  prototype, un hop vérifiant `|v-u|<|u-r_i|` place chaque quotient
  `(v-r_i)/(u-r_i)` dans le plan fendu de la branche principale. La constante
  runtime `0.2` laisse donc une marge stricte d'un facteur cinq.
- Sur tout domaine de temps ouvert et connexe où ces gardes tiennent, la somme
  de logarithmes a pour dérivée `1` le long du flot et son incrément vaut
  exactement le temps écoulé.
- Pour le vrai retour discret, la somme convergente des résidus futurs corrige
  le modèle en une coordonnée satisfaisant exactement l'équation d'Abel. Une
  décroissance géométrique `M theta^n`, `0≤theta<1`, suffit et donne la borne
  de correction `M/(1-theta)`.
- Sur un secteur ouvert préconnexe, la convergence en un point et un majorant
  sommable uniforme des dérivées des résidus itérés propagent la convergence,
  rendent cette coordonnée analytique et donnent l'équation d'Abel en tout
  point du secteur.
- La prémisse Lipschitz abstraite de la sortie est déchargée par une borne du
  champ de vecteurs sur un domaine convexe. Les changements de branches du
  modèle logarithmique ajoutent la constante explicite
  `sum rho_i n_i 2πi`, laquelle commute avec les translations de Fatou.

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
3. le raccord ligne à ligne du solveur Rust concret au prédicat préfixe
   formalisé (notamment une preuve de convexité ou une enclosure par intervalles
   de chacun de ses gaps composés), et le théorème global au-delà du bloc
   `matrix-c1` maintenant certifié en valeur et en dérivée ;
4. l'implémentation dans le builder/shader des tests périodiques maintenant
   prouvés (`mu>0`, `I+eps≤r`, `gamma<1`) et le remplacement de l'ancien test
   de chemin en birapport, qui n'impliquait pas l'enclosure annoncée ;
5. pour Fatou, le noyau utile au runtime est maintenant prouvé : modèles à un
   et deux pétales, branches principales sous la garde de hop, translation du
   flot, correction d'Abel sous décroissance géométrique et sortie Lipschitz.
   Restent la production des majorants uniformes en `(u,c)` pour le retour
   concret, leur raccord ligne à ligne aux bornes numériques du builder, et les
   invariants de corne non linéaires d'Écalle--Voronin du vrai germe (une
   donnée analytique qui n'est pas déterminée par un jet fini) ;
6. l'arithmétique flottante : arrondis dirigés, erreurs `f64`/WGSL, stabilité
   des divisions et conformité exacte entre Rust, TypeScript et shaders ;
7. les mesures de vitesse, nombres de tours, gains de rayon et qualité
   d'image, qui sont des résultats expérimentaux et non des théorèmes Lean.

Ces obligations sont les prochaines candidates pertinentes. Les points 1 à 5
demandent désormais surtout de relier les structures analytiques abstraites aux
données concrètes du builder et du runtime ; le point 6 demande un modèle
d'arithmétique flottante et un audit du code concret.
