# Décisions — formalisation de l'aire du Mandelbrot

## 2026-07-31 — rester au cas quadratique

Les énoncés portent sur `z ↦ z² + c`. Aucun usage concret d'un degré
`d > 2` n'est requis par le livrable, donc la généralisation aurait augmenté
le coût des estimations sans fermer de cible supplémentaire.

## 2026-07-31 — définition bornée et API rayon 2

`Mandelbrot` est défini par l'existence d'une borne réelle uniforme. Le
critère calculable `∀ n, ‖z_n‖ ≤ 2` est prouvé ensuite comme théorème public,
avant de rendre la définition irréductible.

## 2026-07-31 — critère d'échappement quantitatif

M1 est prouvé par une croissance linéaire explicite après le franchissement
du rayon d'échappement. Cette forme évite une dépendance aux théorèmes de
limite et rend la contradiction avec toute borne immédiate.

## 2026-07-31 — séparer géométrie et dynamique

`CardioidArea.lean` prouve l'injectivité, le Jacobien et l'aire exacte
`3π/8` de l'image du disque unité. Aucun théorème de ce module n'affirme que
cette image est incluse dans le Mandelbrot.

## 2026-07-31 — ne pas axiomatiser Fatou/Montel

L'absence de familles normales, de Montel analytique et du théorème critique
de Fatou est consignée comme blocage. Aucun `axiom`, `sorry` ou hypothèse
opaque équivalente n'est introduit pour fabriquer le minorant `7π/16`.

## 2026-07-31 — fermer le contournement direct `‖λ‖ < 2/3`

Le sous-domaine où `D(λ/2,1/3)` est directement invariant est formalisé. Il
donne l'aire exacte `11π/81`. Ce résultat est conservé comme jalon honnête,
même s'il ne dépasse pas `7π/16`.

## 2026-08-02 — remplacer Montel par le Fatou quadratique minimal

La formalisation ne développe pas une théorie générale des familles normales.
Elle prouve uniquement le fait dynamique nécessaire : un bassin de point fixe
attractif pour `z ↦ z² + c` contient l'orbite critique. Sous l'hypothèse
contraire, des racines carrées continues donnent des branches inverses
holomorphes de tout ordre; l'inégalité de Schwarz les borne uniformément et la
dérivée au point fixe impose une croissance contradictoire. La même mécanique
est spécialisée au retour de période 2.

## 2026-08-02 — un seul témoin rationnel pour rendre la borne stricte

Après l'aire conceptuelle exacte `3π/8 + π/16 = 7π/16`, on n'ajoute ni grille
ni union de cellules certifiées. Un seul disque paramétrique
`D(-351/200,1/100000)` est traité par une estimation uniforme du polynôme de
retour en trois étapes sur `D(0,1/200)`. Son aire positive et sa séparation
radiale des deux premiers domaines suffisent pour conclure strictement
`7π/16 < volume Mandelbrot`.

## 2026-08-02 — utiliser le coefficient multiplicateur sans série formelle

L'apport d'aire `π |c_H'(0)|²` est prouvé par une identité d'intégrale, pas par
une manipulation formelle des coefficients : Jacobien holomorphe, moyenne sur
les cercles, Jensen et intégration radiale. Les calculs Wolfram ne servent qu'à
découvrir les équations polynomiales exactes de basse période; les identités
retenues et le budget `29/20` sont revérifiés par Lean.

## 2026-08-02 — ne pas confondre le budget et l'uniformisation

Le calcul périodes 3+4 franchit numériquement `29/20`, et son budget rationnel
est formalisé sur le disque multiplicateur compact `D(0,99/100)`, sans supposer
de régularité au bord du disque unité. Il ne devient un minorant de
`volume Mandelbrot` qu'après preuve
de l'existence injective des branches inverses du multiplicateur sur le disque
unité et de leur identification aux composantes hyperboliques disjointes.
Aucun axiome ou `sorry` n'est ajouté pour masquer cette entrée de dynamique
complexe.

Cette entrée analytique est prouvée dans `LowPeriodSheetArea.lean` : les
relèvements continus coïncident localement avec les branches implicites
holomorphes, sont injectifs, et leur dérivée centrale est exactement le
coefficient algébrique utilisé dans le budget. `LowPeriodFinalArea.lean`
ferme aussi la comptabilité mesurable. Six feuilles seulement — trois de
période 3 et trois de période 4 — suffisent avec le budget réduit exact
`24815/1000000`; elles sont deux à deux disjointes et séparées des domaines de
périodes 1 et 2. Le théorème inconditionnel
`twenty_nine_div_twenty_lt_volume_Mandelbrot` peut donc être annoncé.

## 2026-08-02 — séparer convergence extérieure et calcul effectif

Les ensembles `K_n = {c | ‖z_{n+1}(c)‖ ≤ 2}` sont formalisés directement,
avec la preuve qu'ils sont décroissants, fermés, bornés et que leur
intersection est exactement `Mandelbrot`. La continuité de la mesure par le
haut donne `volume K_n → volume Mandelbrot` sans supposer que la frontière a
une aire nulle.

Cette convergence n'est pas appelée « calculabilité de l'aire ». Une
structure séparée `EffectiveAreaGapModulus` exige une fonction qui, pour tout
`ε > 0`, produit un indice certifié tel que `U_n - L_n < ε`. Sans cette donnée,
on ne conclut qu'à des encadrements monotones.

## 2026-08-02 — Fatou à période finie et unicité du cycle attractif

L'argument de branches inverses n'est plus spécialisé aux périodes 1 et 2.
`FiniteCycleFatou.lean` construit des branches d'ordre `p*n` pour toute
période finie `p`, force l'entrée de l'orbite critique dans le disque
attractif, puis extrait une contraction quantitative et la convergence de la
sous-suite de retours. Deux cycles attractifs pour le même polynôme capturent
alors une sous-suite arithmétique commune de cette orbite ; l'unicité de la
limite prouve qu'ils sont le même cycle.

Cette avancée ferme l'entrée Fatou et l'unicité dynamique, mais ne remplace
pas la réciproque algébrique encore manquante : une racine de l'équation
résultante en `(c, μ)` doit encore être reliée dans Lean à un point périodique
dont le multiplicateur est exactement `μ`.
