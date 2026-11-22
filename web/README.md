# Éditeur web (phase 3, spike)

Le code OCaml est la seule source de vérité. Le navigateur charge un toplevel
OCaml complet (compilateur + ppx `camlcad` + bibliothèques camlcad) dans un Web
Worker, avec le noyau manifold-3d (WASM).

```
dune build --profile release @web/site     # toplevel ≈ 10 Mo (5 Mo gzip)
cd _build/default/web/site && python3 -m http.server 8000
# puis http://localhost:8000
```

Le code de l'éditeur doit définir `model : Cad.Shape.t Cad.Doc.t` ; `let%feat`
et `let%param` sont disponibles.

- **Curseurs** : un `let%param` avec `[@range lo, hi]` devient un curseur ; le
  déplacer réévalue sans recompiler (overrides du Reader, cache `Eval` conservé).
  « écrire dans le code » remplace le littéral par défaut à sa position.
- **Arbre** : cliquer une feature surligne sa ligne et la montre en orange ;
  déplacer le curseur du code sélectionne la feature correspondante.
- **Erreurs** de syntaxe/typage soulignées dans le code ; erreurs de `Doc`
  (paramètre hors bornes…) localisées aussi.
- **Export STL** du résultat courant.

Fichiers : `toplevel.ml` (worker, protocole en tête), `hook/` (rendez-vous
`model`), `site/` (HTML, `main.js` avec three.js et CodeMirror par CDN,
`worker.js` qui charge manifold-3d puis le toplevel).

Test : `test_js/worker.mjs` pilote le worker sous Node (dans `@test_js/runtest-js`).

Mesures (Mac M-series) : toplevel prêt en ~0,3 s sous Node ; compilation d'une
pièce 60-130 ms, réévaluation après curseur 1-15 ms. Chromium headless
(rendu logiciel) : premier rendu 1,3 s, compilation 0,4-0,8 s ; à mesurer
dans un vrai navigateur.
