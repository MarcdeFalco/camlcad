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
- Lot 7, chapitre 1 (« 3D Print ») : bouton Impression 3D : face cliquée posée sur le plateau,
  volume de l'imprimante (MK4, Bambu, Ender 3, Mini), appui, surplombs > 45° en rouge, STL exporté
  dans l'orientation d'impression. `print.js`. Scénario `impression.spec.js`.
- Lot 8, chapitre 2 : symétrie d'esquisse (contrainte `Sketch.symmetric`, copie associative ;
  boucles entièrement choisies recopiées) et réseau rectangulaire d'esquisse (écarts cotés),
  depuis la sélection (Maj). Les symboles de contraintes ne captent plus les clics.
  `sketch_copy.js`. Scénario `esquisse_copies.spec.js`.
- Lot 9, chapitre 2 (« Edit Sketch ») : une esquisse insérée se rouvre à la souris (double-clic
  dans le navigateur, menu de la frise « Modifier l'esquisse ») : relue du code
  (`sketch_parse.js`), vérifiée (le solveur doit réécrire exactement le même texte, sinon :
  « modifiée à la main »), sur son plan (origine, décalé, ou repère littéral d'une face) ;
  Terminer réécrit le corps du `let%sketch`, la feature suit. Scénario `esquisse_modifier.spec.js`.
- Lot 10, chapitre 2 (Offset) : décalage d'un contour de lignes (`Sketch.point_line_distance`,
  côtés parallèles) ; régions : une boucle dans une boucle est un trou (profondeur
  d'imbrication, `Sketch_desc`), aperçu d'extrusion compris. Paroi / cadre en une esquisse.
  Scénario `esquisse_decalage.spec.js` (volume vérifié), test d'expectation (aire 204).

## En cours
- Fusion des PR des lots 4 à 7 (une par lot ; branches locales lot4…lot7, script de passage :
  remettre la branche sur origin/main, cherry-pick du lot, fusion neutre de l'ancienne branche
  distante, push). Script : `$TMPDIR/pr_lot.sh <commit>` (voir fil). Branches locales lot4…lot9.
- Suivant : chapitre 7 (assemblage : liaisons à la souris), ajuster/prolonger d'esquisse.

## Suivant

## Écarts connus avec Fusion (pas encore traités)
- Supprimer l'outil d'une étape combinée laisse `resultatN` (devenu une simple copie) dans la frise.
- Pas d'échelle (`Shape.scale` absent du noyau).
- Copier un arc (symétrie, réseau) ajoute une équation redondante (cohérente) : la palette l'affiche.
- Pas de flèche de distance dans la vue pour l'extrusion, pas de choix de régions de profil.
