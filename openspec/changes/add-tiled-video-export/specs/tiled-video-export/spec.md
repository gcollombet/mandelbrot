## ADDED Requirements

### Requirement: Sélection d'un export vidéo tuilé
Le système SHALL permettre de choisir un export tuilé lorsque la surface supersamplée complète est trop grande ou lorsque l'utilisateur souhaite borner la mémoire GPU. Le système SHALL conserver le chemin d'export monolithique existant lorsque le tuilage n'est ni requis ni sélectionné.

#### Scenario: Surface monolithique impossible
- **WHEN** la sortie supersamplée dépasse `maxTextureDimension2D` mais qu'un plan de tuiles valide existe
- **THEN** le système propose ou sélectionne le rendu tuilé au lieu de refuser la résolution entière

#### Scenario: Export monolithique conservé
- **WHEN** l'utilisateur choisit explicitement le chemin non tuilé et que sa surface est valide
- **THEN** le système utilise le pipeline historique sans vidéos intermédiaires

### Requirement: Plan de tuiles déterministe et borné
Le système SHALL construire avant le rendu une partition déterministe de l'image finale en coeurs de tuiles entiers. Chaque surface étendue et supersamplée SHALL respecter la limite de texture, le budget mémoire choisi et les contraintes d'alignement.

#### Scenario: Partition complète
- **WHEN** un plan est construit pour une sortie `W × H`
- **THEN** chaque pixel de `[0,W) × [0,H)` appartient exactement à un coeur de tuile, sans trou ni chevauchement

#### Scenario: Limite matérielle
- **WHEN** le supersampling et le halo d'une tuile proposée dépassent une limite matérielle ou mémoire
- **THEN** le planificateur réduit la taille de coeur ou refuse le plan avant le premier rendu

#### Scenario: Bords non divisibles
- **WHEN** la largeur ou la hauteur de sortie n'est pas divisible par la taille nominale des tuiles
- **THEN** le système crée des tuiles de bord plus petites dont les coeurs terminent exactement l'image

### Requirement: Projection exacte dans l'image globale
Le système SHALL calculer chaque pixel de tuile à partir de sa position dans l'image complète et de la caméra globale. Il MUST NOT déplacer le navigateur au centre local de la tuile pour simuler cette projection.

#### Scenario: Centre d'un pixel de tuile
- **WHEN** le pixel local `(u,v)` appartient à une tuile dont le coeur commence en `(x,y)`
- **THEN** sa projection utilise le même centre de pixel global que le pixel `(x+u,y+v)` d'un rendu monolithique

#### Scenario: Rotation de caméra
- **WHEN** la caméra possède un angle non nul
- **THEN** le décalage global de la tuile est transformé par la même projection et la même rotation que le reste de l'image

#### Scenario: Domaine de référence
- **WHEN** le moteur valide ou dimensionne la référence orbitale pendant le rendu d'une tuile
- **THEN** il utilise l'aspect et l'étendue de l'image complète, et non uniquement ceux de la tuile locale

### Requirement: Halo de filtrage et de compression
Le système SHALL rendre et encoder une région étendue autour de chaque coeur. Le halo SHALL couvrir le support du filtre de réduction et la marge codec configurée, puis SHALL être rogné uniquement après décodage dans la passe de composition.

#### Scenario: Tuile intérieure
- **WHEN** une tuile ne touche aucun bord de l'image
- **THEN** sa vidéo intermédiaire contient le coeur et le halo complet sur ses quatre côtés

#### Scenario: Tuile au bord de l'image
- **WHEN** le halo théorique dépasse l'image globale
- **THEN** la région étendue est limitée au bord global sans déplacer le coeur

#### Scenario: Composition du coeur
- **WHEN** une frame intermédiaire est composée dans la cible finale
- **THEN** seuls les pixels du coeur décodé sont copiés à leur position globale

### Requirement: Résolution locale du supersampling
Le système SHALL effectuer l'accumulation et le filtrage de réduction sur la tuile supersamplée avant de créer la frame vidéo intermédiaire. La réduction SHALL rester en lumière linéaire avant la conversion sRGB.

#### Scenario: Export 4K ×4
- **WHEN** une tuile de coeur `w × h` est rendue avec un supersampling ×4
- **THEN** son calcul utilise une surface locale ×4 mais sa vidéo intermédiaire contient des pixels à la résolution finale de la région étendue

#### Scenario: Taille disque indépendante du supersampling
- **WHEN** seul le facteur de supersampling change et que durée, débit agrégé, plan final et codec restent identiques
- **THEN** l'estimation de volume des vidéos intermédiaires ne change pas

### Requirement: Parcours complet rendu pour chaque tuile
Le système SHALL rendre toutes les frames temporelles d'une tuile avant de passer à la suivante. Chaque frame SHALL utiliser le temps absolu dérivé de son index et SHALL satisfaire la même convergence et le même nombre d'échantillons AA que l'export monolithique avant son encodage.

#### Scenario: Ordre tuile-majoritaire
- **WHEN** le plan contient plusieurs tuiles et `N` frames
- **THEN** le système produit les frames `0..N-1` d'une tuile avant de commencer la frame 0 de la tuile suivante

#### Scenario: Placement temporel répétable
- **WHEN** deux tuiles rendent la frame d'index `n`
- **THEN** elles utilisent exactement le même temps de parcours et les mêmes paramètres d'animation globaux

#### Scenario: Accumulation AA locale
- **WHEN** plusieurs échantillons AA sont demandés par frame
- **THEN** l'accumulation repart de zéro pour chaque nouvelle frame de chaque tuile et atteint le nombre demandé avant encodage

### Requirement: Réutilisation de la référence orbitale
Le système SHALL conserver la session de référence, l'orbite disponible et les tables compatibles lors du passage d'une tuile à la suivante. Il SHALL réinitialiser l'historique spatial de la tuile sans réinitialiser automatiquement la référence.

#### Scenario: Zoom à centre fixe
- **WHEN** toutes les frames partagent le même centre et que la première tuile a construit l'orbite jusqu'à la profondeur finale
- **THEN** les tuiles suivantes peuvent réutiliser cette référence et son orbite prolongée depuis le début du parcours

#### Scenario: Réinitialisation sélective
- **WHEN** le moteur passe à une nouvelle tuile
- **THEN** les champs progressifs, compteurs, accumulations AA et caches spatiaux sont invalidés tandis que la référence compatible reste disponible

#### Scenario: Travelling avec recentrage
- **WHEN** le parcours déplace le centre au-delà du domaine valide de la référence courante
- **THEN** le moteur reconstruit ou recentre la référence selon ses règles normales, même si cela ralentit l'export

#### Scenario: Référence non certifiée
- **WHEN** une référence conservée n'est pas valide pour la vue globale courante
- **THEN** le système MUST NOT l'utiliser comme chemin rapide et attend une référence valide avant d'émettre la frame

### Requirement: Encodage mezzanine à débit agrégé
Le système SHALL encoder chaque région étendue dans un MP4 intermédiaire en flux. Le débit demandé à chaque vidéo SHALL être proportionnel à sa surface étendue et la somme des débits demandés SHALL respecter le budget agrégé configuré.

#### Scenario: Répartition entre tuiles
- **WHEN** le budget agrégé vaut `B` et les régions étendues ont des surfaces différentes
- **THEN** chaque tuile reçoit `B × surfaceTuile / sommeSurfaces` et la somme des parts vaut `B` à l'arrondi près

#### Scenario: Estimation d'une minute à 400 Mbit/s
- **WHEN** la durée vaut 60 secondes et le débit intermédiaire agrégé vaut 400 Mbit/s
- **THEN** le système affiche une estimation d'environ 3,0 Go décimaux, plus la marge de conteneur et la taille du fichier final

#### Scenario: Nombre de tuiles augmenté
- **WHEN** le même film et le même débit agrégé utilisent davantage de tuiles
- **THEN** le volume estimé n'est pas multiplié par le nombre de tuiles, hors faible surcoût des halos et conteneurs

### Requirement: Qualité mezzanine distincte de la sortie finale
Le système SHALL traiter le premier encodage comme un mezzanine à qualité supérieure à la sortie finale. Il SHALL vérifier que le codec choisi peut être encodé puis décodé avant de lancer un rendu long.

#### Scenario: Codec intermédiaire indisponible
- **WHEN** le navigateur accepte la configuration d'encodage mais ne peut pas décoder le résultat pour la composition
- **THEN** le système choisit un codec intermédiaire compatible ou refuse avant de rendre les tuiles

#### Scenario: Configuration en deux passes
- **WHEN** l'utilisateur sélectionne une qualité finale normale
- **THEN** le système ne réutilise pas silencieusement cette même qualité comme profil mezzanine

### Requirement: Stockage temporaire et manifeste de reprise
Le système SHALL écrire les vidéos intermédiaires dans un stockage temporaire persistant et SHALL maintenir un manifeste versionné liant les fichiers à tous les paramètres qui influencent leurs pixels ou leur décodage.

#### Scenario: Quota insuffisant
- **WHEN** l'estimation majorée dépasse le stockage temporaire disponible
- **THEN** le système refuse avant le rendu et indique l'espace requis et disponible

#### Scenario: Tuile finalisée
- **WHEN** le MP4 fragmenté d'une tuile est fermé avec succès
- **THEN** le manifeste marque cette tuile comme complète de façon durable

#### Scenario: Reprise compatible
- **WHEN** une session interrompue possède une empreinte identique à la nouvelle demande
- **THEN** le système conserve les tuiles complètes et reprend à la première tuile manquante

#### Scenario: Reprise incompatible
- **WHEN** un paramètre influençant le rendu, le plan, le halo, les timestamps ou le codec diffère
- **THEN** le système MUST NOT mélanger les anciens intermédiaires avec le nouvel export

### Requirement: Composition finale à mémoire bornée
Le système SHALL décoder et composer les vidéos intermédiaires par blocs temporels dont la taille respecte un budget mémoire explicite. Il SHALL borner le nombre de décodeurs actifs et SHALL encoder les frames finales dans leur ordre temporel.

#### Scenario: Bloc de composition
- **WHEN** un bloc contient `K` frames
- **THEN** le système compose toutes les tuiles dans au plus `K` cibles finales réutilisables avant d'envoyer ces frames au codeur final

#### Scenario: Beaucoup de tuiles
- **WHEN** le nombre de tuiles dépasse la limite du pool de décodeurs
- **THEN** le système traite les tuiles par groupes sans ouvrir un décodeur simultané par tuile

#### Scenario: Timestamps finals
- **WHEN** la frame finale d'index `n` est encodée
- **THEN** son timestamp et sa durée sont ceux qu'aurait produits l'export monolithique à la même cadence

#### Scenario: Passe sans calcul fractal
- **WHEN** la phase de composition a commencé
- **THEN** elle ne lance ni itération fractale, ni convergence progressive, ni accumulation AA

### Requirement: Absence de coutures spécifiques au tuilage
Le système SHALL vérifier que les raccords du résultat composé ne présentent pas de discontinuité supplémentaire attribuable au découpage spatial. Avant compression, les coeurs tuilés SHALL reproduire le rendu monolithique à une tolérance numérique définie.

#### Scenario: Comparaison avant compression
- **WHEN** une vue de référence est rendue monolithiquement et par tuiles avec les mêmes paramètres
- **THEN** les pixels des coeurs correspondent à la tolérance numérique définie, y compris autour des frontières de tuiles

#### Scenario: Comparaison après deux passes
- **WHEN** une vue à haute fréquence est encodée directement puis via les mezzanines
- **THEN** la mesure et l'inspection des bandes de couture ne révèlent pas de rupture localisée absente du reste des artefacts de compression

### Requirement: Progression, annulation et nettoyage
Le système SHALL distinguer la progression du rendu des tuiles de celle de la composition finale. Il SHALL finaliser proprement les fichiers en cours et SHALL permettre soit de conserver une session reprenable, soit de supprimer ses temporaires.

#### Scenario: Progression du rendu
- **WHEN** des tuiles sont en cours de calcul
- **THEN** l'interface indique la tuile courante, les frames émises pour cette tuile et l'avancement global de la phase de rendu

#### Scenario: Progression de composition
- **WHEN** tous les intermédiaires sont prêts et que la vidéo finale est en cours
- **THEN** l'interface affiche séparément le nombre de frames finales composées et encodées

#### Scenario: Annulation avec reprise
- **WHEN** l'utilisateur annule et choisit de conserver la session
- **THEN** le fichier courant est finalisé si possible et les tuiles complètes ainsi que le manifeste restent disponibles

#### Scenario: Succès complet
- **WHEN** le MP4 final est finalisé avec succès
- **THEN** le système supprime les temporaires de la session, sauf demande explicite de conservation

