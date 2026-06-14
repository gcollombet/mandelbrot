## Why

Lors des translations (panning), des artefacts visuels (déchirures, flou, lignes de raccord) apparaissent car les déplacements continus du navigateur ne correspondent pas à un nombre entier de pixels physiques sur la texture de rendu. Le moteur de rendu réutilise les pixels déjà calculés en les décalant d'un nombre entier de pixels, alors que la formule de perturbation du shader utilise le centre précis calculé avec la physique continue. Restreindre les déplacements du navigateur (lorsqu'on ne zoome pas) à des pas entiers de pixels élimine cette disparité de grille et supprime complètement les artefacts visuels.

## What Changes

- Introduction d'une notion de position continue interne dans le navigateur Rust (`cx_continuous`, `cy_continuous`) pour accumuler de manière fluide les micro-déplacements physiques (y compris les vitesses très faibles) sans perte de précision.
- Snapping de la position de rendu (`cx`, `cy`) sur la grille de pixels physiques du canvas lors des étapes de translation (quand le zoom n'est pas actif).
- Mise à jour de la signature de `MandelbrotNavigator::step` et `MandelbrotNavigator::translate_direct` dans Rust pour recevoir les dimensions physiques du canvas.
- Passage des dimensions physiques du canvas depuis le composant Vue (`Mandelbrot.vue`) vers le navigator lors des appels de translation et d'animation.

## Capabilities

### New Capabilities
- `pixel-aligned-translation`: Fournit un mécanisme d'alignement au pixel près pour toutes les translations (panning direct et décélération physique) lorsque le zoom n'est pas actif, garantissant une cohérence parfaite de la grille de pixels entre frames consécutives.

### Modified Capabilities

## Impact

- **Rust WASM / reference_calculus** : Modifications de `MandelbrotNavigator` dans `lib.rs` (champs internes, signatures de `step` et `translate_direct`, tests unitaires).
- **TypeScript / Vue** : Mise à jour de `Engine.ts` et `Mandelbrot.vue` pour obtenir et propager la taille physique du canvas au navigateur.
