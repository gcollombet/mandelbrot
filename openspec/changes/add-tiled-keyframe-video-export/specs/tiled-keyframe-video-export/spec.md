## ADDED Requirements

### Requirement: Éligibilité du mode keyframe tuilée
Le système SHALL proposer un mode d'export « keyframe tuilée » uniquement lorsque le parcours a un centre fixe (mêmes `cx` et `cy` en A et en B) et que `aaSamplesPerFrame` vaut 1. Un parcours avec travelling SHALL rester sur le chemin monolithique. Une demande d'AA jitteré par image en mode tuilé SHALL être refusée avant ouverture de la session, avec un message expliquant que les frames intermédiaires du mode sont de pures lectures.

#### Scenario: Zoom à centre fixe avec rotation
- **WHEN** le parcours conserve `cx` et `cy` et fait varier l'échelle et l'angle
- **THEN** le mode keyframe tuilée est sélectionnable

#### Scenario: Travelling
- **WHEN** le parcours change `cx` ou `cy` entre A et B
- **THEN** le mode keyframe tuilée n'est pas proposé et l'export utilise le chemin monolithique

#### Scenario: AA jitteré demandé
- **WHEN** l'utilisateur choisit le mode tuilé avec `aaSamplesPerFrame` supérieur à 1
- **THEN** l'export est refusé avant toute allocation, en indiquant que seul le suréchantillonnage anticrénèle ce mode

### Requirement: Champ brut borné à une tuile
En mode keyframe tuilée, les textures brutes A et B, le display set resolved, les compteurs de convergence, la cible et le reseed d'AA analytique et les scratch de merge SHALL être alloués à la taille de la tuile choisie par le planificateur, et non à celle du carré de travail. Seuls les deux display sets de keyframe SHALL être alloués à la taille du carré de travail.

#### Scenario: Empreinte par texel du carré
- **WHEN** une session tuilée est ouverte en configuration de base (sans gradient d'orbite ni orbit trap)
- **THEN** les ressources résidentes à l'échelle du carré de travail se limitent aux deux display sets de keyframe et à la cible couleur, soit au plus 56 octets par texel du carré, contre 176 pour le chemin monolithique

#### Scenario: Aucune texture brute à la taille du carré
- **WHEN** une session tuilée est active
- **THEN** aucune texture `r32float` en couches n'est allouée à la taille du carré de travail

### Requirement: Planificateur de tuiles déterministe
Le planificateur SHALL choisir la plus grande tuile carrée dont le côté est un multiple de l'alignement de workgroup et dont l'empreinte estimée respecte le budget mémoire GPU sélectionné, puis partitionner le carré de travail en tuiles entières sans trou ni chevauchement, les tuiles de droite et du bas pouvant être plus petites. À paramètres identiques, le plan SHALL être identique. Une tuile SHALL toujours couvrir au moins un workgroup.

#### Scenario: Budget serré
- **WHEN** le budget mémoire ne permet qu'un quart du carré de travail
- **THEN** le plan compte au moins quatre tuiles et chaque tuile respecte le budget

#### Scenario: Budget large
- **WHEN** le budget mémoire permet le carré entier
- **THEN** le plan compte une seule tuile égale au carré et le résultat est identique au chemin monolithique

#### Scenario: Reproductibilité
- **WHEN** le même export est planifié deux fois avec les mêmes paramètres et la même limite d'adaptateur
- **THEN** les deux plans sont identiques tuile par tuile

### Requirement: Projection exacte d'une tuile dans le carré global
Les passes qui parcourent le champ brut (brush, reprojection, effacement, comptage, cible et reseed d'AA, resolve) SHALL calculer les coordonnées neutres d'un texel à partir de sa position dans le carré global, soit `origine de tuile + position locale`, avant l'application de l'aspect, de l'angle et de l'échelle. Le test d'appartenance au viewport tourné, le domaine de référence et `viewportAspect` SHALL utiliser le carré complet.

#### Scenario: Centre de pixel identique
- **WHEN** un texel est rendu dans une tuile puis dans un rendu monolithique
- **THEN** la coordonnée complexe évaluée par le brush est identique bit à bit dans les deux cas

#### Scenario: Frontière entre tuiles
- **WHEN** deux tuiles voisines sont converties puis copiées dans la keyframe
- **THEN** les texels de part et d'autre de la frontière sont identiques à ceux du rendu monolithique, sans texel manquant ni dupliqué

### Requirement: Construction tuile par tuile d'une keyframe
Lorsque le cycle frozen/live demande un nouveau champ live, le système SHALL construire la keyframe suivante tuile par tuile : pour chaque tuile, positionner l'origine, effacer le champ brut, converger avec le prédicat de convergence existant, exécuter le resolve, copier le rectangle dans le display set de keyframe en construction, puis passer à la tuile suivante. Le champ brut NE SHALL PAS conserver d'état d'une tuile à l'autre ni d'une frame à l'autre. La référence orbitale, l'orbite et les tables SHALL rester chaudes pendant toute la construction.

#### Scenario: Ordre des opérations
- **WHEN** une keyframe est construite
- **THEN** chaque tuile est effacée avant sa convergence, et le rectangle copié dans la keyframe correspond exactement à son origine et sa taille

#### Scenario: Référence conservée
- **WHEN** la construction passe d'une tuile à la suivante à centre fixe
- **THEN** aucun `resetReference` n'est émis, le worker n'est pas recréé et l'orbite disponible n'est pas raccourcie

### Requirement: Émission uniquement sur keyframe complète
En mode keyframe tuilée, `videoFrameReady` SHALL être vrai uniquement lorsque la keyframe en construction du cycle courant est complète, toutes tuiles copiées. Les frames émises pendant un cycle SHALL être des lectures des deux keyframes, sans convergence ni dispatch d'itération.

#### Scenario: Keyframe incomplète
- **WHEN** une tuile au moins n'a pas été copiée
- **THEN** aucune frame n'est capturée

#### Scenario: Frames libres du cycle
- **WHEN** la keyframe est complète et l'échelle courante reste sous le seuil de bascule
- **THEN** chaque frame est émise sans dispatch d'itération, et le compteur de frames libres l'enregistre

### Requirement: Échange de rôles des keyframes à la bascule
À chaque bascule du cycle frozen/live, le display set de la keyframe complète SHALL devenir la source frozen et l'ancien display set frozen SHALL devenir la cible de construction, par échange de liaisons et sans copie de texture. La passe couleur SHALL continuer de lire la source frozen magnifiée et la source live minifiée avec le compositing min-step existant.

#### Scenario: Aucune copie complète
- **WHEN** une bascule a lieu
- **THEN** aucune commande de copie couvrant le carré complet n'est enregistrée

#### Scenario: Composition inchangée
- **WHEN** une frame est rendue entre deux bascules
- **THEN** son image avant réduction est identique à celle du chemin monolithique pour le même parcours, le même seuil et le même suréchantillonnage

### Requirement: Emprise de construction couvrant la rotation du cycle
Lorsque le parcours fait varier l'angle, la keyframe SHALL être construite sur l'union des viewports tournés du cycle qu'elle sert, de sorte qu'aucune frame du cycle ne lise un texel non calculé. Lorsque l'angle est constant, l'emprise SHALL rester le viewport tourné courant.

#### Scenario: Angle constant
- **WHEN** le parcours ne tourne pas
- **THEN** la construction ne calcule que les texels du viewport tourné, comme aujourd'hui

#### Scenario: Rotation pendant le cycle
- **WHEN** l'angle varie de A à B
- **THEN** chaque frame du cycle trouve un texel calculé pour tout pixel de sortie

### Requirement: Invariance du résultat au découpage
Avant encodage, une frame produite en mode keyframe tuilée SHALL être identique à la frame du chemin monolithique pour les mêmes paramètres, à la précision près des opérations flottantes qui ne dépendent pas de la position de la tuile. La comparaison SHALL porter sur l'image linéaire réduite et sur des bandes autour de chaque frontière de tuile.

#### Scenario: Égalité globale
- **WHEN** un même parcours court est exporté en monolithique puis en tuilé avec quatre tuiles
- **THEN** l'image linéaire de chaque frame est identique aux deux chemins

#### Scenario: Bandes de frontière
- **WHEN** les bandes de 8 pixels autour des frontières de tuile sont comparées séparément
- **THEN** elles ne présentent pas d'écart supérieur à celui du reste de l'image

### Requirement: Estimation mémoire en deux parts
Le panneau d'export SHALL afficher, pour le mode tuilé, l'empreinte estimée des ressources à l'échelle du carré de travail et celle des ressources à l'échelle de la tuile, ainsi que le nombre de tuiles du plan. L'estimation SHALL provenir du moteur ou d'une constante partagée avec lui, sans duplication dans l'interface.

#### Scenario: Affichage
- **WHEN** l'utilisateur sélectionne le mode tuilé et un budget
- **THEN** le panneau montre les deux parts, leur somme et le nombre de tuiles

#### Scenario: Budget insuffisant pour les keyframes
- **WHEN** les deux display sets de keyframe dépassent à eux seuls le budget sélectionné
- **THEN** le panneau signale que le budget ne peut pas être tenu et indique la valeur minimale

### Requirement: Diagnostics de construction
La session SHALL exposer le nombre de keyframes construites, de tuiles converties, de pumps par tuile et de frames libres émises, afin de distinguer le coût de construction du coût d'émission.

#### Scenario: Statistiques de fin d'export
- **WHEN** un export tuilé se termine
- **THEN** le résultat rapporte keyframes, tuiles, pumps et frames libres
