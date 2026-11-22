# camlcad — consignes pour les agents

CAO paramétrique fonctionnelle en OCaml, orientée impression 3D et mécanismes.
Note de conception : https://claude.ai/artifact/AQf6M5uPjzioQJFNUBBSK5

## Commandes
- `dune build @check 2>&1 | head -50` : typage rapide (toujours filtrer la sortie).
- `dune test` : tests d'expectation (ppx_expect) et propriétés (QCheck).
- `npm ci --prefix test_js && dune build @test_js/runtest-js` : lois du noyau manifold-3d sous Node.
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
- `src/kernel_manifold_js` : noyau manifold-3d (WASM) via js_of_ocaml ; `test_js/` : lois du noyau + géométrie des exemples.
- `src/core/journal_json` : arbre de features en JSON (format dans le `.mli`).
- `src/parts` (`Cad_parts`) : pièces paramétriques réutilisables (`Gear` : développante).
- `ppx/` (`ppx_cad`) : `let%feat` et `let%param` ; positions au format `__POS__` (voir `Loc`).
- `examples/` (`Cad_examples`) : pièces de référence (support, engrenage, charnière), `all`.
- `bin/cad_tree` : `dune exec cad-tree -- PIÈCE -D nom=valeur` → JSON.
- À venir : `web/` (phase 3), noyau natif.

## Environnement local (Mac de Marc)
OCaml 5.4 (opam `default`), Node 22. OManifold n'est pas sur opam : il faut le compiler depuis
GitHub (sous-module manifold, cmake, `brew install assimp libomp`), pas encore fait.
Le sandbox interdit d'écrire dans `.git` : les commandes git qui écrivent passent hors sandbox.

## Environnement cloud
Pas d'accès à opam.ocaml.org : OCaml 4.14 + dune depuis apt (`ocaml-nox ocaml-dune
libppx-expect-ocaml-dev libqcheck-ocaml-dev js-of-ocaml libjs-of-ocaml-dev`), Node 22 et npm disponibles. La CI GitHub utilise opam (4.14 et 5.2).
