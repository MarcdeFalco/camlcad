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
| `prolonger.spec.js` | Black Book ch. 2 : ligne prolongée jusqu'au bord d'un rectangle, ligne coupée au croisement puis bout ajusté |
| `lissage.spec.js` | Black Book ch. 3 : carré gardé seul sur XY, cercle sur un plan décalé, lissage (Shape.loft, volume) |
| `balayage.spec.js` | Black Book ch. 3 : cercle gardé seul, chemin en L, balayage (Shape.sweep, coude en onglet, volume) |
| `depouille.spec.js` | Black Book ch. 3 : carré de 20 extrudé de 10 avec dépouille atan(0,5) : tronc de pyramide (volume) |
| `etude.spec.js` | Black Book ch. 7 : bielle-manivelle, étude de mouvement à trois étapes lue dans la vue |
| `texte.spec.js` | Black Book ch. 2 et 3 : texte en relief puis gravé sur le dessus d'un pavé (Cad_parts.Text, volumes) |
| `esquisse_points.spec.js` | Black Book ch. 2 : rectangle par trois points (aire), cercles par deux et trois points, arc par trois points |
| `couches.spec.js` | Impression 3D : 150 couches de 0,2 mm sur l'équerre, première couche (contour), couche du milieu au clavier, couches de 0,3 mm |
| `esquisse_construction.spec.js` | Black Book ch. 2 : hexagone circonscrit (apothème), rectangle passé en construction (X) puis rétabli, seul l'hexagone extrudé |
| `importer.spec.js` | Black Book ch. 1 : STL binaire choisi au sélecteur de fichiers, corps importé (volume), revenu après rechargement |
| `exemplaires.spec.js` | Impression 3D : 4 puis 16 équerres en grille, encombrement, écart, STL à 4 × les triangles |
| `copier.spec.js` | Black Book ch. 6 : pavé copié à 30 mm, puis la paire copiée tournée de 90° (volume × 4) |
| `trou_serrure.spec.js` | Black Book ch. 2 : cercle et rectangle ajustés en trou de serrure (un contour lignes + arc, aire) |
| `liaison_limites.spec.js` | Black Book ch. 7 : pivot créé avec limites 0°–90° et position initiale 30°, curseur borné |
| `apparence.spec.js` | Black Book ch. 6 et 10 : équerre en PLA rouge puis en aluminium, apparence revenue après rechargement |
| `jusqua.spec.js` | Black Book ch. 3 : cylindre extrudé « jusqu'à » la face du dessus d'une boîte (h = 10, volume) |
| `revolution_sym.spec.js` | Black Book ch. 3 : demi-tour symétrique autour de l'axe de l'esquisse (boîte englobante) |
| `reseau_sym.spec.js` | Black Book ch. 4 : trois boîtes au pas de 30 centrées sur l'original (−30 à 50 en x, volume × 3) |
| `epaisseur.spec.js` | Black Book ch. 8 : bac à parois de 1 mm (coque), épaisseur minimale 1 mm, parois sous le seuil colorées |
| `oblong_centre.spec.js` | Black Book ch. 2 : oblong par le centre, extrudé (centré, volume) |
| `reseau_circ_sym.spec.js` | Black Book ch. 4 : deux boîtes à ±45° autour de z (réseau circulaire symétrique) |
| `frise.spec.js` | Double-clic sur une feature, cote modifiée ; marqueur glissé (corps présents à l'étape), menu contextuel « Revenir avant cette étape », lecteur |
| `vue.spec.js` | Cube de vue : face Dessus, flèches vers les faces voisines, orbite à la souris, vue de départ, face Avant |
| `export.spec.js` | Bouton STL : fichier téléchargé, STL binaire cohérent avec la pièce |
| `mecanisme.spec.js` | Bielle-manivelle : onglet MÉCANISME, animation (l'image change), curseur de mouvement, interférences |
| `tuto_demarrage.spec.js` | Audit UX : ouverture sur un document vide (carte de départ, Esquisse qui pulse), plaque extrudée, nom du document, exemple puis ↶, Nouveau |
| `tuto_extrusion_face.spec.js` | Audit UX (ch. 3, Extrude d'une face) : face cliquée puis E (Joindre), Extrusion puis face, Couper dans la matière (volume) |
| `tuto_parametres.spec.js` | Audit UX (ch. 6) : noms « Largeur », « Épaisseur totale » ramenés à des identifiants, « type » et doublon refusés dans le dialogue, paramètres non liés signalés, cote d'esquisse et hauteur liées (ƒx), aperçu direct |
| `tuto_navigateur.spec.js` | Audit UX (ch. 1, Browser / Timeline) : esquisse, face extrudée, perçage ; navigateur Esquisses + Corps (œil), trois étapes dans la frise seulement |
| `tuto_practical1.spec.js` | Black Book ch. 5, Practical 1 : cercles Ø50 et Ø20, rectangle par le centre 5 × 25, quatre ajustements (arcs coupés, diagonale de construction ignorée), extrusion de 25 : bague à alésage rainuré (volume) |
| `tuto_cotes_trace.spec.js` | Black Book ch. 5 (Practical 2, début) : rectangle par le centre 60 Tab 50 Entrée et cercle 20 Entrée tapés pendant le tracé, cotés d'office ; palette sous le navigateur ; plaque percée (volume) |
| `tuto_practical2.spec.js` | Black Book ch. 5, Practical 2 (plaque) : rectangle 50 × 60 tapé, axe en construction (X), ligne inclinée 70 / 80° (angle orienté), symétrique raccordée au coin, fermeture (contour reconnu), oblong par le centre 16 × 15 tapé, ajustement, extrusion (volume) |
| `tuto_flasque.spec.js` | Black Book ch. 5 (Practical 2, flasque) : esquisse sur la face avant, rectangle accroché au sommet de la face (point fixe), 50 × 35 et deux Ø10 tapés, extrusion jointe (volume) |
| `tuto_practical3.spec.js` | Black Book ch. 5, Practical 3 (sans les dents) : Ø100, Ø20, Ø8 tapés ; anneau Ø20/Ø8 extrudé seul (régions, symétrique 15), puis l'esquisse reprise du navigateur pendant Extrusion : couronne Ø100/Ø20 (symétrique 13, jointe) ; esquisse écrite une fois (volume) |
| `tuto_nervure_milieu.spec.js` | Black Book ch. 5 (Practical 2, fin) : plaque et flasque, plan milieu entre les faces latérales (seconde face vue au cube, pièce recadrée), esquisse dessus, triangle accroché aux sommets de la pièce projetés, extrusion symétrique : nervure (volume) |
| `tuto_rochet.spec.js` | Black Book ch. 5, Practical 3 (roue à rochet) : Ø100, Ø20, Ø8 ; dent (ligne + arc 3 points), réseau circulaire ×10, dix ajustements du Ø100 coupé par les lignes et les arcs, contour denté reconnu, extrusion |
