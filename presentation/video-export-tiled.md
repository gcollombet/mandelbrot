# Export vidéo tuilé

Le mode tuilé permet de produire une vidéo 4K suréchantillonnée sans allouer la
surface complète en mémoire GPU. Il rend toutes les images d'une tuile avant de
passer à la suivante, conserve la référence orbitale chaude, puis compose les
MP4 intermédiaires dans une seconde passe qui ne relance aucun calcul fractal.

Le budget de mémoire GPU est réglable de 128 Mio à 16 Gio. Il borne la surface
de travail choisie par le planificateur, mais ne contourne ni la taille maximale
des textures ni un éventuel refus d'allocation du navigateur ou du pilote.

## Volume temporaire

Le débit intermédiaire affiché est un budget **agrégé**, partagé entre les
tuiles selon la surface de leur région étendue. Le volume de base est donc :

```text
volume = débit agrégé × durée / 8
```

À 400 Mbit/s pendant 60 secondes, cela représente 3,0 Go décimaux, auxquels
s'ajoutent la marge des conteneurs. Le facteur de suréchantillonnage ×4 ou ×8
augmente le calcul et la mémoire GPU locale, mais pas ce volume : chaque tuile
est réduite à sa résolution finale avant son encodage intermédiaire. Le fichier
MP4 final est produit séparément et s'ajoute temporairement à ce budget.

## Référence et parcours

Un zoom à centre fixe réutilise normalement la même référence et l'orbite déjà
prolongée entre les tuiles. Un travelling reste correct, mais peut sortir du
domaine certifié et reconstruire une référence pour chaque parcours de tuile.
La progression affiche ces reconstructions afin de distinguer ce coût du rendu
des pixels.

## Reprise et nettoyage

Les intermédiaires sont écrits en flux dans l'OPFS du navigateur. Après chaque
MP4 de tuile finalisé, un manifeste versionné enregistre son achèvement. Une
nouvelle tentative avec exactement le même parcours, le même rendu, le même
plan, le même AA, les mêmes timestamps et le même codec reprend automatiquement
les tuiles manquantes. Une empreinte différente ne mélange jamais deux sessions.

Le quota disponible est vérifié avant le calcul avec une marge de 10 %. Après
succès et finalisation du MP4 de destination, la session temporaire est supprimée.
Après une annulation ou une erreur, elle reste conservée pour permettre la
reprise automatique de la même demande.

## Qualité

Le halo traverse le premier encodage et seul le coeur de chaque tuile est copié
pendant la composition. Le premier MP4 utilise un débit mezzanine élevé, mais la
chaîne comporte tout de même deux générations avec perte. Le débit de 400 Mbit/s
est un point de départ à valider visuellement sur les filaments, reliefs et orbit
traps ; ce n'est pas une garantie mathématique d'identité avec l'encodage direct.
