## 1. Passe resolve (`src/assets/resolve.wgsl`)

- [x] 1.1 Dans la boucle 4 coins de `fs_main`, ajouter deux compteurs entiers `nEscaped` et `nInside` incrémentés respectivement dans la branche échappée (`z_sq >= mu`) et la branche intérieure (`citer == 0.0`)
- [x] 1.2 Après la boucle, calculer `nResolved = nEscaped + nInside` et remplacer la garde `if (wTotal > 1e-6)` par une garde `if (nResolved >= 3u)` qui englobe : copie intérieure dominante (`wInside > wEscaped`), interpolation échappée (`wEscaped > 1e-6`), puis repli `firstFinishedCoord`
- [x] 1.3 Quand `nResolved < 3u`, ne pas retourner : laisser la boucle remonter (`step_u *= 2u`) — conserver les gardes existantes `level < 10u` et `step_u >= dims.x|y → discard`
- [x] 1.4 Vérifier que le repli poids-nul (`hasFinished` → `firstFinishedCoord`) reste accessible à l'intérieur de la garde `nResolved >= 3u` pour les pixels assis exactement sur un coin résolu de poids nul

## 2. Chemin d'affichage magnifié (`src/assets/color.wgsl`) — aucun changement

- [x] 2.1 Constat : `color.wgsl` échantillonne `resolvedTexture` (chemin live, `Engine.ts` bind `tex` → `resolvedArrayView`) et `frozenTexture` (snapshot d'une resolved antérieure, `color.wgsl:1370`), toutes deux déjà corrigées par le rang. Pas de grille de sentinelles brute à ce niveau.
- [x] 2.2 Décision : ne pas modifier `sample_escaped_bilinear`. La remontée d'empreinte envisagée était fondée sur l'hypothèse (fausse) d'un échantillonnage de la texture brute ; elle est sans objet sur une texture déjà résolue et lisse par texel.
- [x] 2.3 Conserver les gardes existantes (`wInside > wEscaped`, remplissage des trous pendant les swaps frozen) ; un seuil `nEscaped >= 3` strict les casserait (réapparition du flashing). Voir design.md.

## 3. Validation

- [x] 3.1 `npx vue-tsc -b` (types) et `npm run build` (build de production) — OK (build complet réussi ; équilibre accolades/parenthèses de `resolve.wgsl` vérifié, le WGSL étant embarqué en chaîne non validée au build)
- [ ] 3.2 (vérif utilisateur, WebGPU requis) Vérification visuelle : déclencher un raffinement (zoom puis arrêt) dans une région « dure » (bord du set / deep zoom) et confirmer que les transitions montrent un dégradé grossier lisse au lieu de carrés plats
- [ ] 3.3 (vérif utilisateur, WebGPU requis) Non-régression à convergence : capturer une frame entièrement convergée avant/après le changement et confirmer une image identique (aucune remontée induite)
- [ ] 3.4 (vérif utilisateur, WebGPU requis) Vérifier l'absence de bandes/diagonales fragiles résiduelles sur les filaments extérieurs pendant le zoom (chemin `color.wgsl`)
