## 1. Implémentation Rust (reference_calculus)

- [ ] 1.1 Ajouter les champs `cx_continuous` et `cy_continuous` de type `DBig` à `MandelbrotNavigator` dans `lib.rs`
- [ ] 1.2 Initialiser ces champs dans `MandelbrotNavigator::new` et les inclure dans la mise à l'échelle de précision de `ensure_precision`
- [ ] 1.3 Mettre à jour `origin` et `reset_reference_to` pour synchroniser les variables continues avec la position d'origine/référence
- [ ] 1.4 Modifier la signature de `translate_direct` pour accepter `canvas_width: Option<f64>` et `canvas_height: Option<f64>`
- [ ] 1.5 Implémenter la logique d'alignement sub-pixel dans `translate_direct` : accumuler dans `cx_continuous`/`cy_continuous`, puis projeter et snapper sur la grille de pixels si non-zoom
- [ ] 1.6 Modifier la signature de `step` pour accepter `canvas_width: Option<f64>` et `canvas_height: Option<f64>`
- [ ] 1.7 Mettre à jour la logique de transition et d'animation physique dans `step` pour mettre à jour `cx_continuous`/`cy_continuous` et appliquer le snapping
- [ ] 1.8 Adapter les tests unitaires Rust existants dans `lib.rs` pour passer `None` aux appels de `translate_direct` et `step`

## 2. Intégration Frontend (Vue/TypeScript)

- [ ] 2.1 Recompiler le package Rust WASM avec `wasm-pack build reference_calculus`
- [ ] 2.2 Mettre à jour la méthode `translateDirect` dans `Mandelbrot.vue` pour passer `canvas.width` et `canvas.height` du composant au navigateur WASM
- [ ] 2.3 Mettre à jour l'appel `navigator.step` dans le render loop `draw()` de `Mandelbrot.vue` pour passer `canvas.width` et `canvas.height`
- [ ] 2.4 Mettre à jour l'exposition de `step` dans l'interface de `Mandelbrot.vue`

## 3. Validation et Tests

- [ ] 3.1 Exécuter les tests unitaires Rust : `cargo test --manifest-path reference_calculus/Cargo.toml`
- [ ] 3.2 Lancer la vérification des types TypeScript : `npx vue-tsc -b`
- [ ] 3.3 Vérifier le build complet de production : `npm run build`
