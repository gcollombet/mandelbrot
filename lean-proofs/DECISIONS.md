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
