# camlcad — consignes pour les agents

CAO paramétrique fonctionnelle en OCaml, orientée impression 3D et mécanismes.
Note de conception : https://claude.ai/artifact/AQf6M5uPjzioQJFNUBBSK5

## Commandes
- `dune build @check 2>&1 | head -50` : typage rapide (toujours filtrer la sortie).
- `dune test` : tests d'expectation (ppx_expect) et propriétés (QCheck).
- `dune promote` : uniquement si la nouvelle sortie est *voulue* ; le dire dans la PR.

## Règles
- **Contrat d'abord.** Un `.mli` modifié = PR de contrat validée par Marc avant toute implémentation.
- Code compatible OCaml 4.14 et 5.x (pas d'effets tant que la décision n'est pas prise).
- Géométrie pure (`Shape`, `Profile`) ; seul `Doc` porte des effets. Pas d'exception hors `Doc.fail`,
  sauf `Invalid_argument` documentée dans le `.mli`.
- Unités : mm et degrés partout.
- Modules < 400 lignes ; lire les `.mli` avant les `.ml`.
- Ne jamais désactiver, sauter ou affaiblir un test pour obtenir du vert. Un test faux se corrige
  dans une PR qui le dit.
- Pas de fusion par l'IA : Marc relit et fusionne.

## Structure
- `src/geom` (`Geom`) : V2, V3, Frame, Plane, Axis, Bbox.
- `src/core` (`Cad`) : Loc, Mesh, Kernel (signature), Profile, Shape, Eval, Doc.
- `src/export` (`Cad_export`) : Stl, Threemf.
- `test/` : contrats exécutables ; `Fake_kernel` sert à tester `Eval` sans noyau réel.
- À venir : `src/kernel_manifold_native` (phase 1), `ppx/` (phase 2), `web/` (phase 3).

## Environnement cloud
Pas d'accès à opam.ocaml.org : OCaml 4.14 + dune depuis apt (`ocaml-nox ocaml-dune
libppx-expect-ocaml-dev libqcheck-ocaml-dev`). La CI GitHub utilise opam (4.14 et 5.2).
