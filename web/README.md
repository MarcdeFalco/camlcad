# Éditeur web (phase 3, spike)

Le code OCaml est la seule source de vérité. Le navigateur charge un toplevel
OCaml complet (compilateur + ppx `camlcad` + bibliothèques camlcad) dans un Web
Worker, avec le noyau manifold-3d (WASM).

```
dune build --profile release @web/site     # toplevel ≈ 10 Mo (5 Mo gzip)
cd _build/default/web/site && python3 -m http.server 8000
# puis http://localhost:8000
```

Le code de l'éditeur doit définir `model : Cad.Shape.t Cad.Doc.t` (ou
`Cad_mech.Assembly.t Cad.Doc.t` pour un mécanisme) ; `let%feat`
et `let%param` sont disponibles.

Disposition d'un modeleur paramétrique (inspirée de Fusion 360, visuels propres) :
barre d'outils à onglets en haut, navigateur à gauche, vue 3D au centre (cube de
vue cliquable, flèches vers la face voisine, ⌂ vue de départ, barre de navigation : orbite, panoramique,
ajuster, regarder une face, style, grille), dialogues de commande à droite,
frise en bas, code repliable à droite (`</> Code`, Ctrl+E).

- **SOLIDE** : Esquisse (S), Extrusion (E), Révolution (axe de l'esquisse ou une de ses lignes), Plan décalé (construction, listé dans le navigateur), Perçage (clic sur une face : simple, lamage, fraisure, traversant), Réseau (rectangulaire, circulaire) et Symétrie de la feature sélectionnée, Combiner (le résultat et un autre corps), Déplacer (le résultat), Boîte, Cylindre, Sphère ; Feature
  (modifier la sélection), Paramètres (tableau, OK écrit les valeurs dans le
  code), Suppr. temp., Supprimer (Suppr) ; Regarder, Ajuster (F), Mesurer (points, faces), Coupe (plan de découpe, matière coupée en rouge), Propriétés (volume, centre de gravité, masse imprimée). Boîte,
  cylindre et sphère ouvrent un dialogue avec aperçu (opération Joindre,
  Couper ou Intersection) ; OK insère la feature avant le `Doc.return` et la
  combine au résultat.
- **Navigateur** : dossiers Paramètres, Origine (œil : grille et axes ; un plan
  cliqué ouvre une esquisse dessus), Esquisses (`let%sketch` du code), Features
  (œil : suppression temporaire), Pièces d'un mécanisme.
- **Frise** : une icône par opération (un outil et sa combinaison au résultat, écrite par l'éditeur, font une seule étape marquée + / − / ∩) ; clic : sélection (ligne du code, pièce
  en surbrillance) ; double-clic : dialogue « Modifier » (nom, cotes littérales,
  ƒx pour en faire un `let%param`) ; clic droit : modifier, renommer, supprimer
  temporairement, revenir avant cette étape, aller au code, supprimer. Le
  marqueur (à glisser, ou ⏮ ◀ ▶ ▶| ⏭) montre la pièce à une étape : les corps
  présents, c'est-à-dire les features d'avant le marqueur qu'aucune autre
  d'avant n'utilise. Chaque action est une réécriture du
  code par `Cad.Source_edit` (dans le worker), puis une recompilation : Ctrl+Z
  dans le code annule. La suppression temporaire écrit `[@@suppress]` (la
  feature rend `Shape.empty`) ; la suppression retire la liaison et ses usages
  dans les unions et différences, et refuse les autres cas en disant pourquoi.
- **Paramètres** : un `let%param` avec `[@range lo, hi]` a un curseur dans le
  dialogue Paramètres ; l'essai réévalue sans recompiler (overrides du Reader),
  OK écrit les valeurs à la place des littéraux, Annuler revient.
- **Erreurs** de syntaxe/typage soulignées dans le code ; erreurs de `Doc`
  (paramètre hors bornes…) localisées aussi.
- **Esquisse** : Esquisse, puis un plan d'origine (plans affichés dans la vue)
  ou une face plane de la pièce (une face déjà sélectionnée est prise
  directement ; origine de l'esquisse : origine du monde projetée sur la face).
  Plans comme dans un modeleur : XY vu de dessus, XZ vu de face (`Geom.Plane.xz`),
  YZ vu de droite. L'onglet ESQUISSE apparaît : rectangle (R, deux coins, lignes
  horizontales et verticales contraintes), contour (L, cliquer le premier point
  pour fermer ; lignes presque horizontales ou verticales contraintes), cercle
  (C, centre puis rayon), arc par le centre (A), oblong, congé d'esquisse (sommet entre deux lignes), rectangle par le centre, polygone régulier (P, nombre
  de côtés dans la barre), point, Cote (D : ligne, cercle, deux points, deux lignes),
  lignes de construction (hors boucle) en pointillés orange, symétrie (dernière ligne choisie = axe) et réseau en x de la sélection, sélection (S, Maj pour plusieurs), avec élastique et
  mesure pendant le tracé ; cotes et symboles de contraintes posés sur le dessin,
  double-clic sur une cote pour la modifier ; les contraintes proposées dépendent de la sélection et sont
  résolues par le solveur OCaml à chaque ajout ; la palette d'esquisse montre
  les degrés de liberté, la cote demandée et la liste des contraintes.
  « Terminer l'esquisse » ouvre le dialogue Extrusion (direction : un côté,
  côté opposé, symétrique ; distance ; opération), avec aperçu ; OK insère le
  plan, le `let%sketch` et la feature ; Annuler revient à l'esquisse.
  Limites : le plan d'une face est écrit en littéral. Une esquisse insérée se rouvre à la
  souris (double-clic dans le navigateur, « Modifier l'esquisse » dans la frise) tant que son
  code est celui que l'éditeur écrit ; modifiée à la main, elle se modifie dans le code.
- **MÉCANISME** (onglet) : une pièce par couleur ; Mouvement : un curseur par coordonnée (celui
  qu'on bouge devient le pilote, les autres sont résolus, boucles fermées
  comprises) ; ▶ anime la première ; interférences listées à chaque pose.
- **Impression 3D** (barre du haut) : cliquer la face à poser sur le plateau, volume de
  l'imprimante, appui, surplombs > 45° en rouge, STL exporté dans cette orientation.
- **Export** STL (solide) et 3MF (solide, ou pièces d'un mécanisme placées à la pose
  courante avec leurs couleurs, pour l'impression en place).

Fichiers : `toplevel.ml` (worker, protocole en tête), `hook/` (rendez-vous
`model`), `site/` (HTML ; `main.js` : worker, code, résultats, commandes ; `viewport.js` : vue three.js, cube de vue ;
`timeline.js` : frise, navigateur, menu ; `dialogs.js` : dialogues de commande ; `sketch.js` ; `mech.js` ;
`worker.js` qui charge manifold-3d puis le toplevel).

Test : `test_js/worker.mjs` pilote le worker sous Node (dans `@test_js/runtest-js`) ;
`test_ui/` pilote l'interface complète à la souris (Playwright, voir `test_ui/README.md`).

Mesures (Mac M-series) : toplevel prêt en ~0,3 s sous Node ; compilation d'une
pièce 60-130 ms, réévaluation après curseur 1-15 ms. Chromium headless
(rendu logiciel) : premier rendu 1,3 s, compilation 0,4-0,8 s ; à mesurer
dans un vrai navigateur.
