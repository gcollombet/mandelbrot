<script setup>
import Mandelbrot from '../src/components/Mandelbrot.vue'
import ClassicMandelbrot from '../src/components/ClassicMandelbrot.vue'
import MandelbrotOrbits from '../src/components/MandelbrotOrbits.vue'
import ComplexDemo from '../src/components/ComplexDemo.vue'
</script>

# WebAssembly, WebGPU, Rust, fractales et autres trucs cools.


## Qu'est-ce que le fractal de Mandelbrot

En mathématiques, l'ensemble de Mandelbrot est une fractale définie comme l'ensemble des points $c$ 
du plan complexe pour lesquels la suite de nombres complexes définie par récurrence par la formule qui suit est bornée :

$$
\begin{cases}
z_0=0\\
z_{n+1}=z_n^2+c
\end{cases}
$$



Nous pouvons visualiser ce qu'il se passe avec cette suite sur un diagramme.
Le diagramme représente le plan complexe en 2D, l'axe horizontal représentant la partie réelle et l'axe vertical la partie imaginaire.
Le point $c$ est représenté en rouge et il prend la valeur pointé par le curseur sur le diagramme.

Voici ce que ça donne pour trois itérations. Vous observerez que :

Le premier point est $z_0=0+0i$, c'est défini dans la formule

Le second est $z_1$ est égal à $c$ (le point rouge).
En effet $z_1=z_0^2+c$ or comme $z_0=0$, $z_0^2=0$ donc $z_1=c$.

Le troisième est $z_2=z_1^2+c$.

<MandelbrotOrbits
  :cx="'-0.5'"
  :cy="'0.0'"
  :scale="'1'"
  :angle="'0.0'"
    :showOrbitLabels="true"
    :orbitIterations="3"
/>

Pour rappel, quand on élève un nombre complexe au carré, on élève sa norme au carré et on double son argument.

Plus généralement, la multiplication de deux nombres complexes revient à multiplier leurs normes et additionner leurs arguments.

Tandis que l'addition de deux nombres complexes revient à additionner leurs parties réelles et leurs parties imaginaires.

<ComplexDemo />

On peut continuer à itérer la suite et observer ce qu'il se passe. Voici ce que ça donne pour 10 itérations.

<MandelbrotOrbits
:cx="'-0.5'"
:cy="'0.0'"
:scale="'1'"
:angle="'0.0'"
:showOrbitLabels="false"
:orbitIterations="10"
/>

On commence à observer que la suite semble converger vers un point fixe ou bien diverger vers l'infini.

Quand la suite converge, on dit que le point $c$ appartient à l'ensemble de Mandelbrot. La suite reste bornée. Les lignes sont colorées en vert.

Quand la suite diverge, on dit que le point $c$ n'appartient pas à l'ensemble de Mandelbrot. La suite n'est pas bornée. Les lignes sont colorées en bleu.

Voici maintenant ce que ça donne si on colorie en noir les points qui appartiennent à l'ensemble de Mandelbrot et en gris ceux qui n'y appartiennent pas.

<MandelbrotOrbits
:cx="'-0.5'"
:cy="'0.0'"
:scale="'1'"
:angle="'0.0'"
:showMandelbrot="true"
:showOrbitLabels="false"
:orbitIterations="20"
/>

En noir, vous visualisez donc l'ensemble de Mandelbrot.

Vous avez surement observé que plus l'on s'éloigne du centre de l'ensemble de Mandelbrot, plus la suite diverge rapidement.

Le corrolaire est que plus on se rapproche du bord de l'ensemble de Mandelbrot, plus la suite converge lentement.

Vous vous demander peut-être comment on peut savoir si un point appartient ou non à l'ensemble de Mandelbrot ?

Il existe un critère simple : si la norme de $z_n$ dépasse 2, alors la suite diverge vers l'infini. C'est prouvé.

On peut donc définir pour chaque point combien d'itérations sont nécessaires pour que la norme de $z_n$ dépasse 2.

Pour éviter de calculer indéfiniment pour les points qui sont dans l'ensemble ou bien très proche du bord, on fixe un nombre maximum d'itérations.


## Visualiser les itérations

[//]: # ()
[//]: # (Avec Shading)

[//]: # ()
[//]: # (<Mandelbrot)

[//]: # (:scale="'1.1'")

[//]: # (:angle="'0.0'")

[//]: # (:cx="'-0.75'")

[//]: # (:cy="'0.0'")

[//]: # (:activatePalette="false")

[//]: # (:activateSkybox="false")

[//]: # (:activateTessellation="false")

[//]: # (:activateWebcam="false")

[//]: # (:activateShading="true")

[//]: # (/>)

[//]: # ()
[//]: # (Avec Shading et Palette)

[//]: # ()
[//]: # (<Mandelbrot)

[//]: # (:scale="'1.1'")

[//]: # (:angle="'0.0'")

[//]: # (:cx="'-0.75'")

[//]: # (:cy="'0.0'")

[//]: # (:activatePalette="true")

[//]: # (:activateSkybox="false")

[//]: # (:activateTessellation="false")

[//]: # (:activateWebcam="false")

[//]: # (:activateShading="true")

[//]: # (/>)

[//]: # ()
[//]: # (Avec Tesselation)

[//]: # ()
[//]: # (<Mandelbrot)

[//]: # (:scale="'1.1'")

[//]: # (:angle="'0.0'")

[//]: # (:cx="'-0.75'")

[//]: # (:cy="'0.0'")

[//]: # (:activatePalette="false")

[//]: # (:activateSkybox="false")

[//]: # (:activateTessellation="true")

[//]: # (:activateWebcam="false")

[//]: # (:activateShading="false")

[//]: # (/>)

[//]: # ()
[//]: # (Avec Tesselation et Palette)

[//]: # ()
[//]: # (<Mandelbrot)

[//]: # (:scale="'1.1'")

[//]: # (:angle="'0.0'")

[//]: # (:cx="'-0.75'")

[//]: # (:cy="'0.0'")

[//]: # (:activatePalette="true")

[//]: # (:activateSkybox="false")

[//]: # (:activateTessellation="true")

[//]: # (:activateWebcam="false")

[//]: # (:activateShading="false")

[//]: # (/>)

[//]: # ()
[//]: # (Avec Skybox)

[//]: # ()
[//]: # (<Mandelbrot)

[//]: # (:scale="'1.1'")

[//]: # (:angle="'0.0'")

[//]: # (:cx="'-0.75'")

[//]: # (:cy="'0.0'")

[//]: # (:activatePalette="false")

[//]: # (:activateSkybox="true")

[//]: # (:activateTessellation="false")

[//]: # (:activateWebcam="false")

[//]: # (:activateShading="true")

[//]: # (/>)




## Quelques points classiques interactifs

<ClassicMandelbrot />


## TODO 

Expliquer ce que sont les fractales.

Présentation de la formule

Démonstration intéractive.

Expliquer que c'est facile à coder.

Montrer les limitations : calcul intensif et limite de précision.

Objectif : faire tourner en temps réél et pourquoi pas sur un navigateur

JS lent. Faire du natif ? Multithread, c'est lent aussi. Calcul sur GPU, limite de précision.

Expliquer le modèle de parallélisation des GPU. Pourquoi c'est plus rapide, quels sont les compromis (modèle de mémoire, etc.)

Comment obtenir le meilleur des deux mondes ?

Expliquer d'où vient le problème de précision.

Expliquer comment fonctionne les flottant et ce qui permettrait de conserver de la précision.
C'est-à-dire faire des calculs avec des nombres de même ordre de grandeur.
