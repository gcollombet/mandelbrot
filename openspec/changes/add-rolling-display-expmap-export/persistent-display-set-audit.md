> Audit de référence pour le second change `add-rolling-display-expmap-export`. Les variantes de stockage persistant et de compression discutées ci-dessous sont exploratoires ; le périmètre normatif actuel est le display set complet brut dans un cache temporaire roulant, défini par proposal/design/specs.

# Audit du display set persistant — 5 septembre 2026

## Statut et conclusion

Audit statique du checkout courant, sans modification de shaders, sans capture GPU ni benchmark. Cette étude examine l'alternative géométrique après identification des limites de la couleur cuite. Les spécifications couleur/WebM existantes ne sont pas la cible de cette alternative : le choix de format doit être réconcilié avant toute implémentation. Bibliothèque, lecteur partagé, fenêtre de zoom, horloge vidéo et stockage borné restent réutilisables.

Le DisplaySet actuel représente **192 à 384 bits par échantillon**, soit **24 à 48 octets**. Il contient déjà une géométrie half-float et des métriques quantifiées. Le stocker sans perte conserve ses octets, mais ne récupère pas les informations perdues au resolve ni ne garantit une validité à toutes les échelles. La première cible crédible est un format brut versionné par couches, puis des filtres de compression binaire réversibles, mesurés séparément.

## Inventaire vérifié

Sources : `src/displayGeometry.ts:1`, `src/Engine.ts:5052` et `:5146`, `src/assets/resolve.wgsl:113` et `:156`, `src/assets/color.wgsl:624`, `:1077`, `:1134` et `:1178`.

| Couche | Contenu | Format GPU actuel | Bits/échantillon | Octets |
|---|---|---|---:|---:|
| Valeurs | itération, z.x, z.y | 3 × r32float | 96 | 12 |
| Géométrie | gradient x/y, courbure, hauteur | rgba16float | 64 | 8 |
| Métadonnées | provenance 4 bits, phase stripe 14 bits, cohérence 14 bits | r32uint | 32 | 4 |
| Gradients d'orbite, optionnels | gradient stripe x/y, gradient cohérence x/y | rgba16float | 64 | 8 |
| Piège d'orbite, optionnel | distance, itération, angle, validité | rgba32float | 128 | 16 |

Les trois couches de valeurs sont réellement r32float ; les valeurs `f32` déclarées dans un retour WGSL ne changent pas le format de destination rgba16float. La couche d'orbite dépend de `orbitMetricsEnabled`, celle des pièges de `orbitTrapEnabled` (Engine:5112). Les quatre profils possibles sont 24, 32, 40 et 48 octets, pas seulement 24/32/48.

La direction d'anisotropie est dérivée du gradient macroscopique (color:875–892) ; la normale des reflets d'environnement est reconstruite séparément (color:996). Aucune couche normale, anisotropie, RGB ou matériau supplémentaire n'est nécessaire si leurs ingrédients sont conservés. Palette, paramètres et ressources d'apparence sont des données globales du rendu, pas des données par texel.

L'itération seule ne remplace pas le triplet itération/z : le shader utilise la fraction d'échappement, la parité de l'itération, des mappings et des pièges terminaux dépendant de z. Les pièges d'orbite enregistrent un résultat, pas l'orbite entière : changer leur géométrie de recherche exige de nouveaux calculs. Les modes cosmétiques utilisant les métriques stockées peuvent changer sans recalcul si toutes les couches nécessaires existent.

## Limites d'exactitude à traiter avant de figer l'ABI

1. `resolve.wgsl:156` borne gradient et hauteur à [-64,64], courbure à [0,64], puis écrit en f16 ; les gradients d'orbite sont aussi bornés. Une saturation ou un arrondi avant persistance est irréversible.
2. `normalize_geometry` multiplie la pente par un ratio, la courbure par son carré et ajoute log(ratio) à la hauteur. `normalize_orbit_gradient` adapte aussi l'échelle. Le fichier doit définir base vectorielle, taille de texel et normalisation source par ligne/bloc ; un texel log-polaire n'est pas un texel écran. La queue à pas radial différent doit être décrite séparément.
3. Une donnée saturée à l'échelle de stockage peut redevenir significative à une autre échelle. Conserver des f16 identiques au display set ne garantit donc pas l'équivalence à un calcul frais dans la vue de destination. Produire avant les clamps, ou avec normalisation/précision adaptées au domaine de relecture, est une piste à valider. Passer en f32 après un clamp ne répare rien.
4. Le shader couleur lit encore le brut pour le diagnostic de portée et l'AA analytique (color:1260–1335 : couches 8 à 12, cinq f32 de payload Taylor). Le display set seul ne réplique pas ces chemins. Le cache peut utiliser un filtrage spatial distinct, mais ne doit pas annoncer la conservation de tout l'AA analytique. Ajouter ces cinq valeurs coûterait au moins 20 octets/texel, avant validité et contrat de support, si ce mode était requis.
5. Persister seulement des échantillons directement convergés simplifie la provenance. Le resolve peut aussi fabriquer des interpolations de support : ne pas les appeler points exacts sans tracer leur origine.
6. La lecture ExpMap et cartésienne emploie des positions et filtres différents. Séparer fidélité des effets, précision géométrique et identité des pixels. Même un cache sans perte n'implique pas une égalité bit à bit des frames.

### Variante de précision à chiffrer

Promouvoir les quatre composantes géométriques de f16 à f32 ajoute 8 octets. Promouvoir aussi les quatre gradients d'orbite ajoute encore 8 octets. Le profil complet passerait ainsi de **48 à 64 octets (512 bits)**, sans compter un éventuel payload analytique. Ce n'est pas une recommandation d'allouer 64 octets immédiatement : l'audit numérique doit montrer si une meilleure normalisation suffit et où les données amont sont déjà saturées.

## Volume sans compression

Hypothèses géométriques : 3840×2160, R=hypot(1920,1080), k=1, Nθ=ceil(2πR)=13842, environ R ln(2) lignes/doublement. Formule théorique ; ajouter arrondis de lignes, halos, index et alignements réels. Go décimaux. La profondeur ×10^100 ci-dessous ne comprend pas la couverture terminale.

| Profil | Bits | Octets | Go/doublement | Go pour ×10^100 | Go pour fenêtre de 16 doublements |
|---|---:|---:|---:|---:|---:|
| Base | 192 | 24 | 0,507 | 168,5 | 8,12 |
| Base + gradients d'orbite | 256 | 32 | 0,676 | 224,7 | 10,82 |
| Base + piège | 320 | 40 | 0,845 | 280,8 | 13,53 |
| Complet | 384 | 48 | 1,015 | 337,0 | 16,23 |

Le budget de 10–11 Go discuté pour le rolling disque supposait 32 octets. Il devient environ 16,2 Go à 48 octets. Une queue terminale adaptée est une autre politique de couverture ; elle ne doit pas être additionnée à une marge pleine largeur comme si les deux étaient obligatoires.

## Candidats de compression réversible

| Données | Candidat | Limite / preuve à obtenir |
|---|---|---|
| Plans entiers ou constants | Bloc constant, masque + valeurs présentes | N'omettre que les valeurs dont la reconstruction est exactement définie ; pas de suppression générale des intérieurs, que certains pièges utilisent |
| Itération f32 | Plan séparé, byte-shuffle, XOR prédictif des bits + codec lossless | Ne pas caster automatiquement en entier : le contrat doit d'abord prouver l'intégralité et la conservation des sentinelles |
| Z terminal | Plans x/y séparés, shuffle + codec lossless | Les mantisses peuvent peu compresser ; ne pas supposer un gain, garder un bloc brut si nécessaire |
| Géométrie f16 | Plans par composante, byte/bit-shuffle + codec lossless | Régularité locale possible mais discontinuités/fractales ; mesurer avec toutes les configurations |
| Métadonnées | Séparer provenance/phase/cohérence, RLE ou packing exact | Provenance constante seulement si tous les points du bloc ont le même support ; les 28 bits restants ne sont pas supprimables si métriques utilisées |
| Gradients d'orbite f16 | Même traitement que géométrie, zéros fréquents éventuels | Ne pas confondre variations fines avec bruit jetable |
| Payload de piège | Plans distincts, validité compacte et masque, itération exacte | Remplacer f32 par bit/u32 exige de prouver le domaine et les cas invalides/interpolés ; pas de réduction automatique |

Byte-shuffle/bit-shuffle réordonnent les bits de manière réversible pour présenter les parties semblables au compresseur. Préférer un XOR sur représentation entière des flottants à une soustraction flottante non réversible. Candidats d'encodeur : Zstandard, LZ4 ou codec sans perte déjà disponible dans l'environnement cible, avec coût de dépendance/WASM explicite. Aucun codec n'est ajouté par cet audit.

Références techniques : [Blosc et filtres shuffle](https://www.blosc.org/c-blosc2/reference/blosc1.html), [Zstandard](https://facebook.github.io/zstd/). Ces sources décrivent les mécanismes, pas des ratios sur ce renderer.

WebM n'est pas retenu comme format de référence des données : conversion couleur, chroma, profondeur entière limitée et erreur potentiellement amplifiée par les reflets compliquent la preuve. Une voie avec pertes serait une expérimentation distincte après établissement de la référence brute.

## Politique proposée et mesures à préparer

- Démarrer par des blocs bruts par couche, endian et schéma versionnés, index de fichiers regroupés, publication/reprise et files bornées.
- Fixer le profil de couches à la création ; expliquer les réglages qui exigent un autre profil. Ne pas supprimer une couche au motif que la palette courante ne l'affiche pas si le cache promet sa réutilisation ultérieure.
- Tester en priorité bloc constant puis shuffle + codec lossless, avec round-trip bit à bit de tous les patterns stockés, y compris zéros signés et marqueurs.
- Capturer, seulement après confirmation pour les tests GPU/benchmarks, des blocs représentatifs : zones intérieures, filaments, frontières d'itération, relief brillant, métriques et pièges, plusieurs profondeurs. Ne pas mesurer uniquement des tableaux synthétiques lisses.
- Rapporter séparément bits bruts/compressés par couche, overhead, temps CPU compression/décompression, débit disque, readback/upload et mémoire en vol ; comparer premier export et lecture répétée.
- Vérifier normalisation avant/après persistance et rendu frais contre relu, à plusieurs rapports d'échelle et rotations, avec reflets brillants. Le résultat doit fixer l'ABI avant de réécrire la spécification normative.

Aucun ratio mesuré n'est disponible. À titre purement arithmétique, un cache complet de 337 Go deviendrait 168,5 Go à ×2 ou 112,3 Go à ×3 ; ces valeurs ne sont pas une prévision de compressibilité.
