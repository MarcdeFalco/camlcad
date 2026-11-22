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

- **Curseurs** : un `let%param` avec `[@range lo, hi]` devient un curseur ; le
  déplacer réévalue sans recompiler (overrides du Reader, cache `Eval` conservé).
  « écrire dans le code » remplace le littéral par défaut à sa position.
- **Arbre** : cliquer une feature (dans l'arbre ou sur la pièce en 3D) surligne sa ligne et la montre en orange ;
  déplacer le curseur du code sélectionne la feature correspondante.
- **Erreurs** de syntaxe/typage soulignées dans le code ; erreurs de `Doc`
  (paramètre hors bornes…) localisées aussi.
- **Mécanismes** : une pièce par couleur ; un curseur par coordonnée (celui
  qu'on bouge devient le pilote, les autres sont résolus, boucles fermées
  comprises) ; ▶ anime la première ; interférences listées à chaque pose.
- **Export** STL (solide) et 3MF (solide, ou pièces d'un mécanisme placées à la pose
  courante avec leurs couleurs, pour l'impression en place).

Fichiers : `toplevel.ml` (worker, protocole en tête), `hook/` (rendez-vous
`model`), `site/` (HTML, `main.js` avec three.js et CodeMirror par CDN,
`worker.js` qui charge manifold-3d puis le toplevel).

Test : `test_js/worker.mjs` pilote le worker sous Node (dans `@test_js/runtest-js`).

Mesures (Mac M-series) : toplevel prêt en ~0,3 s sous Node ; compilation d'une
pièce 60-130 ms, réévaluation après curseur 1-15 ms. Chromium headless
(rendu logiciel) : premier rendu 1,3 s, compilation 0,4-0,8 s ; à mesurer
dans un vrai navigateur.
