## 1. Gate A — census du canal dérivée (bloquant)

- [x] 1.1 Ajouter à `reference_calculus/src/reach.rs` le rayon du canal dérivée `ρ_der` résolvant `½·|z‴|·ρ² = tol·|z′|`, en réutilisant le `z‴` déjà porté par `reach_at_pixel`
- [x] 1.2 Ajouter un test unitaire de pente : resserrer `tol` d'un facteur 2^k doit déplacer `ρ_der` de `k/2` en log2 (le modèle dérivée est d'ordre 1, donc pente 1/2 et non 1/3)
- [x] 1.3 Étendre `reach_census` avec la portée utilisable `min(ρ_value, ρ_der)`, la part de pixels où la dérivée est limitante, et les parts `≥ 1 / 4 / 16 px` recalculées dessus
- [x] 1.4 Exécuter le census sur les quatre vues de bord et consigner le résultat dans `benchmark-results.md`
- [x] 1.5 **Porte de décision** : si la part utilisable `≥ 4 px` tombe sous environ la moitié du chiffre valeur-seule, consigner le verdict et arrêter — les étapes 3 à 6 ne sont pas justifiées en l'état

### 1 bis. Gate A2 — dérivée quadratique (suivi CPU approuvé)

- [x] 1.6 Étendre `reach_at_pixel` avec `z⁗` et le rayon `ρ_der2` résolvant `⅙·|z⁗|·ρ³ = tol·|z′|` pour `ẑ′ = z′ + z″·δc + ½·z‴·δc²`
- [x] 1.7 Ajouter les tests de la récurrence de `z⁗` et de pente : resserrer `tol` d'un facteur `2^k` doit déplacer `ρ_der2` de `k/3` en log2
- [x] 1.8 Étendre puis exécuter le census sur les quatre vues avec la portée utilisable A2 `min(ρ_value, ρ_der2)` et consigner les résultats
- [x] 1.9 **Porte de décision A2** : ne rouvrir la conception GPU que si la part utilisable A2 `≥ 4 px` atteint environ la moitié du chiffre valeur-seule ; sinon consigner l'arrêt

## 2. Gate B — census de la branche ν (bloquant)

- [x] 2.1 Ajouter à `reach.rs` la reconstruction de ν depuis `ẑ` à l'itération de l'ancre, avec la même formule log-log que le chemin AA analytique
- [x] 2.2 Mesurer, pour une cible à distance `d` pixels d'une ancre, l'écart `|ν_pred − ν_true|` en itérations, `ν_true` venant d'une marche complète au paramètre cible
- [x] 2.3 Rapporter l'erreur ν médiane et de queue, la distance que prédit le critère relatif en `|z|`, et les changements de branche d'itération
- [x] 2.4 Vérifier que la mesure reste valide quand la cible s'échappe à une itération différente de l'ancre (cas où la formule extrapole sous le bailout)
- [x] 2.5 **Porte de décision** : si l'écart ν diverge du proxy `|z|`, reformuler le critère en ν dans `design.md` et dans les specs avant toute écriture de shader
- [x] 2.6 Consigner qu'aucun seuil ν universel ne garantit l'indistinguabilité d'une palette à stops arbitraires ; ne pas utiliser `palettePeriod/8192` comme seuil visuel

## 3. Étape 1 — resolve analytique

- [x] 3.1 Dans `src/assets/resolve.wgsl`, ajouter le chemin de continuation `ẑ(δc) = z + z′·δc + ½·z″·δc²` pour les texels sentinelles, avec repli bilinéaire quand l'ancre n'a pas de payload exploitable
- [x] 3.2 Continuer expérimentalement le canal dérivée par `ẑ′(δc) = z′ + z″·δc` et en dériver hauteur de distance et angle, sans revendiquer de rayon de validité
- [x] 3.3 Conserver le traitement spatial existant pour les métriques d'orbite non analytiques, sans gate ni seuil dépendant de la palette
- [x] 3.4 Valider le shader et vérifier le repli bilinéaire sur les ancres intérieures, en budget épuisé ou sans payload fini

## 4. Étape 2 — gel global de diagnostic

- [x] 4.1 Ajouter aux paramètres de performance un interrupteur `taylorFreezeEnabled` désactivé par défaut et un pas dyadique `taylorFreezeStep` choisi par l'utilisateur
- [x] 4.2 Exposer les deux réglages dans l'interface, sans les sauvegarder dans les presets de rendu
- [x] 4.3 Réutiliser `minBrushStep` pour arrêter globalement le raffinement au pas demandé, sans nouvel état terminal par cellule
- [x] 4.4 Quand le gel est actif et que le compteur actif atteint zéro, permettre à la boucle de rendu de devenir inactive malgré les sentinelles volontairement restantes
- [x] 4.5 Garder le resolve actif pour l'affichage et empêcher le déclenchement de l'accumulation AA comme si l'image était exactement convergée
- [x] 4.6 Invalider et relancer le rendu lorsque le mode ou le pas de gel change ; la désactivation doit retrouver le chemin exact au pas 1

## 5. Validation

- [x] 5.1 Exécuter le formatage, le typecheck et la validation WGSL ciblée
- [x] 5.2 Vérifier statiquement que le mode désactivé conserve le chemin actuel et que les nouveaux champs sont exclus des presets
- [x] 5.3 Préparer la comparaison visuelle manuelle avec/sans gel sur les quatre vues de référence, à plusieurs pas, sans seuil automatique ni verdict d'indistinguabilité

## 6. Correction après inspection visuelle

- [x] 6.1 Marquer explicitement les payloads `z″` échappés qui n'ont pas été suivis par le chemin unifié, sans confondre absence et valeur mathématique nulle
- [x] 6.2 Replier le texel entier sur le resolve spatial lorsque `|ẑ|² < μ`, sans extrapolation log-log sous le bailout
- [x] 6.3 Conserver hauteur de distance et angle du resolve spatial au lieu d'utiliser la continuation de dérivée de premier ordre rejetée par Gate A
- [x] 6.4 Mettre à jour le contrat statique, valider le shader et exécuter le typecheck ciblé

## 7. Raffinement local des cellules incompatibles

- [x] 7.1 Ajouter au resolve un bitset transitoire et marquer atomiquement la cellule de tout texel sentinelle qui retombe sur le chemin spatial
- [x] 7.2 Ajouter une passe compute locale qui, lorsque le compteur actif GPU courant vaut zéro, divise par deux le pas des seules cellules marquées et compte leurs nouvelles ancres
- [x] 7.3 Intégrer le buffer, la passe et son ordonnancement dans `Engine.ts`, avec remise à zéro par frame et lecture du compteur après le raffinement
- [x] 7.4 Mettre à jour les libellés de l'interface pour présenter le pas choisi comme pas maximal adaptatif
- [x] 7.5 Étendre le contrat statique, valider les trois shaders concernés et exécuter le typecheck ciblé

## 8. Correction de performance du feedback Taylor

- [x] 8.1 Armer l'évaluation Taylor adaptative uniquement lorsque le compteur actif CPU est déjà au seuil d'inactivité existant
- [x] 8.2 Conserver le resolve spatial pendant le travail actif et éviter les atomiques du masque lorsque le snapshot GPU reste actif
- [x] 8.3 Ajouter un slot de timestamp GPU dédié à la passe de raffinement Taylor
- [x] 8.4 Étendre le contrat statique, valider les shaders et exécuter le typecheck ciblé

## 9. Correction du réveil one-shot Taylor

- [x] 9.1 Armer une frame de feedback lors du passage au seuil et empêcher l'inactivité jusqu'à sa soumission
- [x] 9.2 Consommer l'état one-shot uniquement lorsque le masque, le resolve Taylor et la passe locale sont effectivement encodés
- [x] 9.3 Étendre le contrat statique, valider les shaders et exécuter le typecheck ciblé

## 10. Réarmement des petits lots locaux

- [x] 10.1 Propager jusqu'à la lecture asynchrone l'identité d'une frame de feedback Taylor
- [x] 10.2 Réarmer le feedback lorsqu'une telle lecture rapporte encore du travail, même sous le seuil d'inactivité ordinaire
- [x] 10.3 Étendre le contrat statique et exécuter les validations ciblées

## 11. Boucle de feedback GPU sans barrière CPU par niveau

- [x] 11.1 Maintenir le cycle Taylor armé jusqu'à ce qu'une lecture de feedback rapporte réellement zéro
- [x] 11.2 Encoder le feedback sur chaque frame locale indépendamment de la disponibilité d'un slot de lecture, avec admission par snapshot GPU
- [x] 11.3 Étendre le contrat statique et exécuter les validations ciblées

## 12. Migration vers la couverture Taylor opportuniste

- [x] 12.1 Remplacer dans les artefacts le gel adaptatif par le contrat `exact > Taylor terminal > bilinéaire temporaire`, sans estimation de palette
- [x] 12.2 Encoder la couverture Taylor dans le pas résolu et sélectionner le meilleur coin valide sans mélanger les prédictions
- [x] 12.3 Faire lire ce marqueur par le kernel fusionné afin de conserver et d'exclure des compteurs les sentinelles couvertes
- [x] 12.4 Supprimer le pas de gel, le masque d'échec, `taylor_refine.wgsl`, le feedback CPU/GPU et leur timing dédié
- [x] 12.5 Remplacer l'interface de gel par un unique interrupteur Taylor opportuniste, exclu des presets
- [x] 12.6 Adapter les contrats statiques et exécuter la validation WGSL, les tests unitaires ciblés, le typecheck et `git diff --check`

## 13. Vue de debug de la couverture effective

- [x] 13.1 Définir dans les specs et le design la classification `exact / Taylor / bilinéaire / absent`
- [x] 13.2 Ajouter la vue de couverture au shader couleur, au routage progressif du moteur et à la légende de l'interface
- [x] 13.3 Étendre le contrat statique puis exécuter la validation WGSL, les tests ciblés, le typecheck et `git diff --check`
