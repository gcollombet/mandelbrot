## État de vérification — 2026-08-23

### Validation statique

- `npx vue-tsc -b` : réussi.
- `npm run test:unit` : 87 fichiers, 566 tests réussis.
- `openspec validate add-tiled-video-export --strict` : réussi.
- `git diff --check` : réussi.

### Mesures CPU pures

Les tests couvrent la partition, la projection avec et sans rotation, les halos,
la répartition exacte du débit, l'estimation 3,0 Go, l'empreinte/reprise et le
compositeur borné. Aucune mesure de débit de composition ou de coût CPU réel
n'a encore été réalisée.

### Navigateur, WebCodecs et GPU

Non exécutés dans cette passe. Le test préalable encode+décodage est implémenté
et s'exécute automatiquement avant la première tuile d'un vrai export, mais son
résultat dépend du navigateur et du codec. Aucun scénario Playwright n'a été
lancé, conformément à la règle du dépôt qui exige une confirmation explicite.

### Inspection visuelle et qualité

Non exécutée. L'égalité non compressée monolithique/tuilée, les bandes de
couture, le coût de la double compression et la réutilisation réelle de la
référence restent à vérifier dans un navigateur WebGPU.
