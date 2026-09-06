## Why

Les matériaux dépendant de la vue nécessitent de conserver le champ géométrique et de refaire le shading. Un cache temporaire roulant sur disque borne le volume de cet export sans imposer de sauvegarder un parcours complet de centaines de Go.

## What Changes

- Change ultérieure, dépendante des interfaces de projection, lecture et export de `add-expmap-cache-video-export`, livrée en premier pour RGB/WebM.
- Ajouter un producteur de display sets complets bruts (48 octets/échantillon) et un cache temporaire disque circulaire.
- Couvrir environ 13 doublements visibles en 4K, plus 2–3 d'avance ; dimensionner précisément selon résolution, filtre et budget. Inclure fermeture centrale finie.
- Recalculer couleurs/reflets via color.wgsl inchangé avec adaptateur validé ; attendre le producteur s'il ne suit pas, sans frame incomplète.
- Recycler seulement les blocs sans lecteur ni frame future qui les requiert ; limiter v1 aux parcours de zoom monotone, pauses et rotations.
- Conserver checkpoints et recettes de session, sans présenter la fenêtre temporaire comme une image persistante entièrement rejouable.

## Capabilities

### New Capabilities

- `rolling-display-expmap-export`: planification, production, stockage temporaire borné, relecture/shading et cycle de vie d'export.

### Modified Capabilities

Aucune. Ce mode ne remplace pas la source RGB persistante et ne change pas ses garanties.

## Impact

Producteur/adapter GPU dédiés, store circulaire versionné, extension opt-in du runner/panneau vidéo ; interfaces du premier change réutilisées. Audit préalable des normalisations et clamps ; color.wgsl inchangé. Pas de compression, simplification des matériaux ou rétention permanente du champ dans cette change.
