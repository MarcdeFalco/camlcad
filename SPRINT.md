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
  deux lignes), lignes de construction en pointillés orange. Scénario `esquisse_outils.spec.js`. PR 15.
- Lot 2, chapitre 2 : arcs dans `Sketch` (`arc`, `path`/`pt`/`along`/`back`, `arc_radius`,
  `tangent_arc` écrite au point de contact quand la ligne y aboutit), `Sketch_desc` (arcs,
  éléments de boucle) ; outils Arc par le centre, Oblong, Congé d'esquisse (sommet virtuel
  conservé), Cote sur un arc. Scénario `esquisse_arcs.spec.js`. PR 16.
- Lot 3, chapitre 3 : révolution (axe y/x de l'esquisse ou une de ses lignes, angle, opération ;
  profil ramené sur l'axe puis replacé), plan décalé (CONSTRUIRE, dossier « Construction » du
  navigateur, esquisse dessus), vue de trois quarts après une esquisse corrigée (plus par-dessous).
  `code_edit.js` sorti de `main.js`. Scénario `construction.spec.js`.
- Lot 4, chapitre 4 : perçage sur une face cliquée (simple, lamage, fraisure ; traversant =
  jusqu'au fond de la pièce sous la face), réseau rectangulaire (deux directions) ou circulaire
  de la feature sélectionnée, symétrie par rapport à un plan d'origine. `dialogs_features.js`.
  Scénario `features.spec.js`.
- Lot 5, chapitre 6 : frise d'opérations (l'outil et sa combinaison `resultatN` = une étape,
  badge + / − / ∩ ; marqueur et lecteur sur les étapes visibles), Combiner (résultat et un autre
  corps), Déplacer (rotation puis translation du résultat). `bodies.js` sorti de `main.js`.
  Scénario `edition.spec.js`.
- Lot 6, chapitre 8 : Mesurer (deux points, aire d'une face plane, écart de faces parallèles),
  Coupe (plan d'origine décalé, matière coupée en rouge), Propriétés (volume, centre de gravité,
  masse PLA/PETG/ABS/TPU). `inspect.js`. Scénario `inspecter.spec.js`.

## En cours
- Fusion des PR des lots 3 à 6 (une par lot), puis : chapitre 7 (assemblage : liaisons à la
  souris, étude de mouvement), chapitre 2 (miroir et réseaux d'esquisse, ajuster/prolonger).

## Suivant

## Écarts connus avec Fusion (pas encore traités)
- Supprimer l'outil d'une étape combinée laisse `resultatN` (devenu une simple copie) dans la frise.
- Pas d'échelle (`Shape.scale` absent du noyau).
- Pas de flèche de distance dans la vue pour l'extrusion, pas de choix de régions de profil.
- Esquisse non rééditable à la souris après insertion.
