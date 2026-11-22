# camlcad

CAO paramétrique où le modèle **est** un programme OCaml, et où l'éditeur graphique
réécrit ce programme. Pensé pour l'impression 3D et la conception de mécanismes
(engrenages, charnières print-in-place, bielle-manivelle, encliquetages).

```ocaml
open Cad
open Doc.Syntax

let support =
  let* l = Doc.param "longueur" ~range:(10., 100.) 40. in
  let* base = Doc.feature ~name:"base" (Shape.cube (Geom.V3.v l 20. 5.)) in
  let* trou = Doc.feature ~name:"trou" (Shape.cylinder ~r:2.5 ~h:5. ()) in
  Doc.feature ~name:"piece" Shape.(base - trou)
```

État : **phase 1 en cours**. Géométrie, termes hash-consés, interprète mémoïsé, monade `Doc`,
export STL/3MF implémentés ; le noyau Manifold natif reste à brancher.
Feuille de route : voir la note de conception liée dans `CLAUDE.md`.
