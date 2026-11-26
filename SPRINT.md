# Sprint « Black Book » (26/11 → 27/11 6 h, heure de Paris)

Suivre *Autodesk Fusion 360 Black Book* (fichiers du projet) chapitre par chapitre :
chaque commande retenue doit marcher pour de vrai dans l'éditeur web et être vérifiée
par un scénario Playwright réel (`test_ui/`, souris et clavier, voir `test_ui/README.md`).
Une PR par lot, fusionnée quand la CI est verte. Ce fichier sert à reprendre après une coupure.

Reprise : `git pull`, lire « En cours », `dune build --profile release @web/site`,
`cd test_ui && npx playwright test` (hors bac à sable sur le Mac, `CAMLCAD_CHROMIUM` = Chromium
du cache Playwright).

## Fait
- PR 14 : scénarios UI réels (esquisse → Joindre/Couper, frise, cube de vue, STL, mécanisme),
  job CI `ui`, 9 corrections (plan XZ, rectangle, élastique, cotes sur le dessin, retour arrière…).
- Lot 1, chapitre 2 : rectangle par le centre (diagonale de construction + milieu), polygone
  régulier inscrit (n côtés, rayon coté), point, outil Cote (D : ligne, cercle, deux points,
  deux lignes), lignes de construction en pointillés orange. Scénario `esquisse_outils.spec.js`.

## En cours
- Lot 2, chapitre 2 : arcs dans `Sketch` (OCaml), oblong (slot), congé d'esquisse.

## Suivant
- Lot 3, chapitre 3 : révolution, plan décalé (offset plane), extrusion symétrique et « jusqu'à ».
- Lot 4, chapitre 4 : perçage (hole), réseaux rectangulaire et circulaire, symétrie, tore.
- Lot 5, chapitre 6 : combiner, déplacer/copier, échelle, coque (si le noyau le permet).
- Lot 6, chapitre 8 : mesurer, interférences, coupe (section analysis), centre de gravité.

## Écarts connus avec Fusion (pas encore traités)
- Joindre/Couper ajoute une feature `resultatN` dans la frise (Fusion : une seule extrusion).
- Pas de flèche de distance dans la vue pour l'extrusion, pas de choix de régions de profil.
- Esquisse non rééditable à la souris après insertion.
