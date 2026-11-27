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
| `impression.spec.js` | Black Book ch. 1 (3D Print) : face posée sur le plateau, encombrement, STL orienté (z de 0 à 25) |
| `esquisse_copies.spec.js` | Black Book ch. 2 : symétrie d'un rectangle et d'un cercle par rapport à une ligne de construction, réseau d'un cercle |
| `esquisse_modifier.spec.js` | Black Book ch. 2 (Edit Sketch) : esquisse extrudée rouverte (navigateur, menu de la frise), cote changée, l'extrusion suit |
| `esquisse_decalage.spec.js` | Black Book ch. 2 (Offset) : rectangle décalé de 3 mm vers l'intérieur, cadre extrudé (volume 3,54 cm³) |
| `filetage.spec.js` | Black Book ch. 4 : perçage taraudé M6 dans un bloc, tige filetée M6 (boîte englobante) |
| `pousser.spec.js` | Black Book ch. 4 et 6 : tirer puis pousser la face du dessus d'une boîte ; ressort et tore (boîtes englobantes) |
| `liaison.spec.js` | Black Book ch. 7 : deux pièces tapées dans le code, liaison pivot créée au dialogue, pilotée au curseur |
| `esquisse_supprimer.spec.js` | Black Book ch. 2 et 3 : Suppr d'un cercle et d'un côté (contour ouvert), projection du contour d'une face, cercle accroché à un coin projeté |
| `conge.spec.js` | Black Book ch. 6 : congé R3 puis chanfrein 2 sur deux arêtes d'une boîte (volumes) |
| `plan.spec.js` | Black Book ch. 11 et 1 : mise en plan de l'équerre (3 vues, cotes 60 / 30 / 25, échelle 2:1), capture PNG |
| `eclate.spec.js` | Black Book ch. 10 : vue éclatée de la bielle-manivelle, puis rassemblée (images comparées) |
| `parametres.spec.js` | Black Book ch. 6 : paramètre utilisateur créé au dialogue, cote d'une boîte en paramètre (ƒx), réglée : la pièce suit |
| `reseau_circulaire.spec.js` | Black Book ch. 2 : six trous en couronne (réseau circulaire d'esquisse, volume) ; menu du clic droit → Mesurer |
| `construction2.spec.js` | Black Book ch. 3 : plan milieu (refus si faces non parallèles), plan à un angle ; annuler (Ctrl+Z) et rétablir |
| `diviser.spec.js` | Black Book ch. 6 : boîte divisée par un plan décalé, moitiés écartées de 6 mm, volume conservé |
| `interferences.spec.js` | Black Book ch. 8 : bras qui pénètre le bâti, interférence de 240 mm³ signalée et rougie |
| `fleche.spec.js` | Black Book ch. 3 : distance d'extrusion réglée en tirant la flèche dans la vue |
| `fichier.spec.js` | Black Book ch. 1 : Enregistrer (.ml), rechargement (document repris), Ouvrir… un fichier |
| `nervure.spec.js` | Black Book ch. 4 : deux nervures en croix sur une plaque (hauteur, volume) |
| `tuyau.spec.js` | Black Book ch. 4 : tube creux Ø8 paroi 1 le long d'un chemin en L (boîte, volume) |
| `lien.spec.js` | Black Book ch. 7 : lien de mouvement de rapport −1 entre deux pivots, le second suit en sens inverse |
| `video.spec.js` | Black Book ch. 10 : vidéo WebM d'un cycle de la bielle-manivelle |
| `plan3.spec.js` | Black Book ch. 3 et 8 : plan par trois coins d'une boîte, zébrures activées puis retirées |
| `esquisse_echelle.spec.js` | Black Book ch. 2 : chanfrein d'esquisse 4, échelle 1,5 (cote 20 → 30), volume extrudé |
| `inference.spec.js` | Black Book ch. 2 : ligne accrochée au milieu d'un côté et sur l'autre, la cote change, le milieu suit |
| `coque.spec.js` | Black Book ch. 6 : extrusion transformée en bac ouvert, parois et fond de 2 mm (volume exact) |
| `percages_points.spec.js` | Black Book ch. 4 : quatre trous Ø3,4 posés par des points d'esquisse (volume) |
| `cotes_parametres.spec.js` | Black Book ch. 6 : cotes « largeur » et « largeur/2 », paramètre changé (pièce 50 × 25), esquisse rouverte |
| `raccourcis.spec.js` | Black Book ch. 1 : « ? » liste les raccourcis ; Q, M, H lancent les commandes |
| `rendu.spec.js` | Black Book ch. 10 : style Rendu (ombres activées, image changée), retour au style ombré |
| `courbe.spec.js` | Black Book ch. 2 : courbe lisse fermée par cinq points, extrudée, esquisse rouverte |
| `palette.spec.js` | Black Book ch. 2 : accroche à la grille (1 mm), palette repliée pour dessiner dessous |
| `ellipse.spec.js` | Black Book ch. 2 : ellipse 15 × 6 extrudée (volume), esquisse rouverte |
| `profils.spec.js` | Black Book ch. 3 : deux rectangles, un seul contour coché dans l'extrusion, un seul pavé |
| `echelle.spec.js` | Black Book ch. 6 : pièce ×2 autour de son centre (volume × 8), puis z × 0,5 |
| `ajuster.spec.js` | Black Book ch. 2 : deux rectangles chevauchants, quatre morceaux intérieurs ajustés (T), un contour extrudé (volume de l'union) |
| `frise.spec.js` | Double-clic sur une feature, cote modifiée ; marqueur glissé (corps présents à l'étape), menu contextuel « Revenir avant cette étape », lecteur |
| `vue.spec.js` | Cube de vue : face Dessus, flèches vers les faces voisines, orbite à la souris, vue de départ, face Avant |
| `export.spec.js` | Bouton STL : fichier téléchargé, STL binaire cohérent avec la pièce |
| `mecanisme.spec.js` | Bielle-manivelle : onglet MÉCANISME, animation (l'image change), curseur de mouvement, interférences |
