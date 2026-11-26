# Scénarios d'interface (Playwright)

La vraie interface (toplevel OCaml compilé dans le worker, manifold-3d WASM, three.js,
CodeMirror) pilotée comme un utilisateur : clics, glisser, double-clic, clic droit et
clavier sur ce qui est affiché. `page.evaluate` ne sert qu'à **lire** (où se trouve un
point d'esquisse à l'écran, orientation de la caméra, code) pour savoir où cliquer et
vérifier le résultat, jamais à agir.

```
dune build --profile release @web/site
cd test_ui && npm ci && npx playwright install chromium   # une fois
npx playwright test                                     # captures dans test_ui/shots/
```

Le site est servi depuis `_build/default/web/site` par interception des requêtes
(`fixtures.js`, hôte `http://camlcad.test`), sans serveur ; three, CodeMirror et
manifold-3d viennent des CDN. `CAMLCAD_CHROMIUM` choisit un autre exécutable Chromium
(sur le Mac : celui du cache Playwright déjà présent). Sous le bac à sable de Claude Code
sur macOS, Chromium ne démarre pas : lancer hors bac à sable.

| Scénario | Parcours |
|---|---|
| `esquisse.spec.js` | Esquisse sur le plan XY, rectangle et cercle (élastique), longueur et rayon, cote modifiée par double-clic sur le dessin, extrusion Joindre ; esquisse sur la face du dessus, cercle, extrusion Couper |
| `esquisse_outils.spec.js` | Black Book ch. 2 : rectangle par le centre, polygone régulier, point, outil Cote (D), cote modifiée, extrusion |
| `esquisse_arcs.spec.js` | Black Book ch. 2 : congé d'esquisse sur un coin, oblong, arc par le centre, cotes d'arcs, extrusion |
| `construction.spec.js` | Black Book ch. 3 : plan décalé, esquisse dessus et extrusion ; révolution d'un profil (boîte englobante vérifiée) |
| `features.spec.js` | Black Book ch. 4 : perçage à lamage sur une face cliquée, réseau 4 × 2 du perçage, symétrie de la boîte |
| `edition.spec.js` | Black Book ch. 6 : étapes combinées dans la frise (badge Joindre), retour arrière, Combiner (couper), Déplacer |
| `inspecter.spec.js` | Black Book ch. 8 : propriétés (volume ≈ 12 cm³ de l'équerre), mesure de 15 mm à la souris, coupe |
| `frise.spec.js` | Double-clic sur une feature, cote modifiée ; marqueur glissé (corps présents à l'étape), menu contextuel « Revenir avant cette étape », lecteur |
| `vue.spec.js` | Cube de vue : face Dessus, flèches vers les faces voisines, orbite à la souris, vue de départ, face Avant |
| `export.spec.js` | Bouton STL : fichier téléchargé, STL binaire cohérent avec la pièce |
| `mecanisme.spec.js` | Bielle-manivelle : onglet MÉCANISME, animation (l'image change), curseur de mouvement, interférences |
