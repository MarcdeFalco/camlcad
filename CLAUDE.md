# camlcad — consignes pour les agents

CAO paramétrique fonctionnelle en OCaml, orientée impression 3D et mécanismes.
Note de conception : https://claude.ai/artifact/AQf6M5uPjzioQJFNUBBSK5

## Commandes
- `dune build @check 2>&1 | head -50` : typage rapide (toujours filtrer la sortie).
- `dune test` : tests d'expectation (ppx_expect) et propriétés (QCheck).
- `npm ci --prefix test_js && dune build @test_js/runtest-js` : lois du noyau manifold-3d et worker web sous Node.
- `scripts/build-manifold.sh` puis `dune build @test_native/runtest-native` : noyau natif, mêmes `.expected` que `test_js/`.
- `dune exec cad -- PIÈCE [-D nom=valeur] [--stl F] [--3mf F] [--json]` : CLI natif.
- `dune build --profile release @web/site` : site statique de l'éditeur dans `_build/default/web/site`.
- `cd test_ui && npx playwright test` : scénarios d'interface sur le vrai site (souris, clavier, captures dans `test_ui/shots/`) ; voir `test_ui/README.md`. Toute évolution de l'UI se vérifie par un scénario.
- `dune promote` : uniquement si la nouvelle sortie est *voulue* ; le dire dans la PR.

## Règles
- **Contrat d'abord.** Un `.mli` se pense avant l'implémentation et se justifie dans la PR.
- Code compatible OCaml 4.14 et 5.x (pas d'effets tant que la décision n'est pas prise).
- Géométrie pure (`Shape`, `Profile`) ; seul `Doc` porte des effets. Pas d'exception hors `Doc.fail`,
  sauf `Invalid_argument` documentée dans le `.mli`.
- Unités : mm et degrés partout.
- Modules < 400 lignes ; lire les `.mli` avant les `.ml`.
- Ne jamais désactiver, sauter ou affaiblir un test pour obtenir du vert. Un test faux se corrige
  dans une PR qui le dit.
- Prototype : l'agent fusionne lui-même ses PR quand la CI est verte (accord de Marc, 22/11/2026).

## Structure
- `src/geom` (`Geom`) : V2, V3, Frame, Plane, Axis, Bbox.
- `src/core` (`Cad`) : Loc, Mesh, Kernel (signature), Profile, Shape, Eval, Doc.
- `src/export` (`Cad_export`) : Stl, Threemf.
- `test/` : contrats exécutables ; `Fake_kernel` sert à tester `Eval` sans noyau réel.
- `src/kernel_manifold_native` : Manifold v3.2.1 (même version que le JS) par sa C API, stubs maison ; sans `_manifold/` la bibliothèque compile mais `available () = false`.
- `test/suites` (`Kernel_suites`) : lois, géométrie des exemples, mécanismes, en foncteurs sur le noyau.
- `src/kernel_manifold_js` : noyau manifold-3d (WASM) via js_of_ocaml ; `test_js/` : lois du noyau + géométrie des exemples.
- `src/core/sketch`, `nlsolve` : esquisses contraintes (monade, poignées typées), Gauss-Newton à pas de norme minimale.
- `src/core/sketch_desc` : esquisse décrite par l'éditeur (indices, contraintes nommées) → résolution et code `let%sketch`.
- `src/core/loft` : lissage et balayage (contours → maillage fermé), passé au noyau par `of_mesh`.
- `src/core/journal_json` : arbre de features en JSON (format dans le `.mli`).
- `src/core/source_edit` : réécritures du source depuis la frise (cotes, → paramètre, `[@@suppress]`, renommer, supprimer), lexicales.
- `src/parts` (`Cad_parts`) : pièces paramétriques réutilisables (`Gear` : développante ; `Thread` : filetages ISO).
- `src/mech` (`Cad_mech`) : `Part` (solide + ports), `Joint` (encastrement, pivot, glissière), `Assembly` (arbre + boucles + couplages résolus par `Nlsolve`, balayage, interférences).
- `ppx/` (`ppx_cad`) : `let%feat`, `let%param`, `let%sketch` ; positions au format `__POS__` (voir `Loc`).
- `examples/` (`Cad_examples`) : pièces de référence (support, engrenage, charnière, patte esquissée, bielle-manivelle), `all`.
- `bin/cad` : CLI natif (résumé, export STL/3MF, mécanismes à la pose de repos).
- `bin/cad_tree` : `dune exec cad-tree -- PIÈCE -D nom=valeur` → JSON.
- `web/` : éditeur web (toplevel OCaml + ppx dans un worker, three.js, CodeMirror), voir `web/README.md`.
- `web/site/` : `main.js` (worker, code, commandes), `viewport.js` (vue, cube de vue), `timeline.js` (frise, navigateur, menu), `dialogs.js` (dialogues de commande), `dialogs_features.js` (perçage, réseau, symétrie, combiner, déplacer), `dialogs_paths.js` (nervure, tuyau), `sketch.js` (éditeur d'esquisse), `sketch_marks.js` (cotes, symboles, élastique), `sketch_tools.js` (outils à deux clics), `sketch_arcs.js` (arcs, oblong, congé), `sketch_copy.js` (symétrie, réseau d'esquisse), `sketch_trim.js` (ajuster, prolonger, couper), `sketch_parse.js` (relire une esquisse pour la modifier), `planes.js` (plans d'origine, faces planes), `code_edit.js` (insertions dans le code), `bodies.js` (corps au retour arrière), `inspect.js` (mesurer, coupe, propriétés), `print.js` (impression 3D : orientation, surplombs ; dialogue de mise en plan), `drawing.js` (mise en plan SVG), `face_commands.js` (commandes sur une face cliquée), `toolbar.js` (menus ▾), `marking.js` (menu du clic droit), `gizmo.js` (flèche de distance), `files.js` (ouvrir, enregistrer, reprise), `expr.js` (cotes en expression de paramètres), `mech.js`, `mech_joint.js` (liaisons au dialogue).
- `test_ui/` : scénarios Playwright sur la vraie UI (souris, clavier), captures dans `test_ui/shots/`.
- À venir : plan de face paramétrique. Suivi du sprint : `SPRINT.md`.

## Environnement local (Mac de Marc)
OCaml 5.4 (opam `default`), Node 22. Manifold compilé dans `_manifold/` par `scripts/build-manifold.sh`
(cmake, ~5 min ; OManifold n'est pas utilisé : vieux Manifold vendu, incompatible cmake 4).
Le sandbox interdit d'écrire dans `.git` : les commandes git qui écrivent passent hors sandbox.

## Environnement cloud
Pas d'accès à opam.ocaml.org : OCaml 4.14 + dune depuis apt (`ocaml-nox ocaml-dune
libppx-expect-ocaml-dev libqcheck-ocaml-dev js-of-ocaml libjs-of-ocaml-dev`), Node 22 et npm disponibles. La CI GitHub utilise opam (4.14 et 5.2).
Paquets apt en plus pour `dune test` : `libppx-hash-ocaml-dev libppx-enumerate-ocaml-dev libjane-street-headers-ocaml-dev`.
Le js_of_ocaml d'apt (5.6) ne compile pas `web/toplevel.ml` (API 6.x) et les CDN sont bloqués : le worker
se vérifie par la CI ; l'interface aussi (job `ui` : scénarios `test_ui/` sur le vrai site), à défaut dans Chromium avec un worker simulé.
