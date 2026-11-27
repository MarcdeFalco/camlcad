# Sprint « Black Book » (26/11 → 27/11 6 h, heure de Paris)

Suivre *Autodesk Fusion 360 Black Book* (fichiers du projet) chapitre par chapitre :
chaque commande retenue doit marcher pour de vrai dans l'éditeur web et être vérifiée
par un scénario Playwright réel (`test_ui/`, souris et clavier, voir `test_ui/README.md`).
Une PR par lot, fusionnée quand la CI est verte. Ce fichier sert à reprendre après une coupure.

Reprise : `git pull`, lire « En cours », `dune build --profile release @web/site`,
`cd test_ui && npx playwright test` (hors bac à sable sur le Mac, `CAMLCAD_CHROMIUM` = Chromium
du cache Playwright).

## Fait
- PR 14 : scénarios UI réels (esquisse → Joindre/Couper, frise, cube de vue, STL, mécanisme),
  job CI `ui`, 9 corrections (plan XZ, rectangle, élastique, cotes sur le dessin, retour arrière…).
- Lot 1, chapitre 2 : rectangle par le centre (diagonale de construction + milieu), polygone
  régulier inscrit (n côtés, rayon coté), point, outil Cote (D : ligne, cercle, deux points,
  deux lignes), lignes de construction en pointillés orange. Scénario `esquisse_outils.spec.js`. PR 15.
- Lot 2, chapitre 2 : arcs dans `Sketch` (`arc`, `path`/`pt`/`along`/`back`, `arc_radius`,
  `tangent_arc` écrite au point de contact quand la ligne y aboutit), `Sketch_desc` (arcs,
  éléments de boucle) ; outils Arc par le centre, Oblong, Congé d'esquisse (sommet virtuel
  conservé), Cote sur un arc. Scénario `esquisse_arcs.spec.js`. PR 16.
- Lot 3, chapitre 3 : révolution (axe y/x de l'esquisse ou une de ses lignes, angle, opération ;
  profil ramené sur l'axe puis replacé), plan décalé (CONSTRUIRE, dossier « Construction » du
  navigateur, esquisse dessus), vue de trois quarts après une esquisse corrigée (plus par-dessous).
  `code_edit.js` sorti de `main.js`. Scénario `construction.spec.js`.
- Lot 4, chapitre 4 : perçage sur une face cliquée (simple, lamage, fraisure ; traversant =
  jusqu'au fond de la pièce sous la face), réseau rectangulaire (deux directions) ou circulaire
  de la feature sélectionnée, symétrie par rapport à un plan d'origine. `dialogs_features.js`.
  Scénario `features.spec.js`.
- Lot 5, chapitre 6 : frise d'opérations (l'outil et sa combinaison `resultatN` = une étape,
  badge + / − / ∩ ; marqueur et lecteur sur les étapes visibles), Combiner (résultat et un autre
  corps), Déplacer (rotation puis translation du résultat). `bodies.js` sorti de `main.js`.
  Scénario `edition.spec.js`.
- Lot 6, chapitre 8 : Mesurer (deux points, aire d'une face plane, écart de faces parallèles),
  Coupe (plan d'origine décalé, matière coupée en rouge), Propriétés (volume, centre de gravité,
  masse PLA/PETG/ABS/TPU). `inspect.js`. Scénario `inspecter.spec.js`.
- Lot 7, chapitre 1 (« 3D Print ») : bouton Impression 3D : face cliquée posée sur le plateau,
  volume de l'imprimante (MK4, Bambu, Ender 3, Mini), appui, surplombs > 45° en rouge, STL exporté
  dans l'orientation d'impression. `print.js`. Scénario `impression.spec.js`.
- Lot 8, chapitre 2 : symétrie d'esquisse (contrainte `Sketch.symmetric`, copie associative ;
  boucles entièrement choisies recopiées) et réseau rectangulaire d'esquisse (écarts cotés),
  depuis la sélection (Maj). Les symboles de contraintes ne captent plus les clics.
  `sketch_copy.js`. Scénario `esquisse_copies.spec.js`.
- Lot 9, chapitre 2 (« Edit Sketch ») : une esquisse insérée se rouvre à la souris (double-clic
  dans le navigateur, menu de la frise « Modifier l'esquisse ») : relue du code
  (`sketch_parse.js`), vérifiée (le solveur doit réécrire exactement le même texte, sinon :
  « modifiée à la main »), sur son plan (origine, décalé, ou repère littéral d'une face) ;
  Terminer réécrit le corps du `let%sketch`, la feature suit. Scénario `esquisse_modifier.spec.js`.
- Lot 10, chapitre 2 (Offset) : décalage d'un contour de lignes (`Sketch.point_line_distance`,
  côtés parallèles) ; régions : une boucle dans une boucle est un trou (profondeur
  d'imbrication, `Sketch_desc`), aperçu d'extrusion compris. Paroi / cadre en une esquisse.
  Scénario `esquisse_decalage.spec.js` (volume vérifié), test d'expectation (aire 204).
- Lot 11, chapitre 4 (Hole « Tapped », Thread) : `Cad_parts.Thread` (pas ISO, section à rayon
  triangulaire extrudée avec torsion = hélice ; `rod`, `tap` avec jeu d'impression) ; perçage
  taraudé M2–M12, commande Filetage (tige filetée). Scénario `filetage.spec.js`.
- Lot 12, chapitres 4 et 6 : Pousser/tirer une face plane (contour de la face relu du maillage,
  trous compris ; tirer = Joindre, pousser = Couper), Tore, Ressort (cercle décalé extrudé avec
  torsion). Scénario `pousser.spec.js`. Barre d'outils compacte (tout tient en 1440 px).
- Lot 13, chapitre 7 (Joint) : onglet MÉCANISME, groupe ASSEMBLER : Liaison (pivot,
  glissière, encastrement) entre deux pièces du code et leurs ports, ajoutée à la liste de
  `Assembly.make` ; pilotable aussitôt (Mouvement). `mech_joint.js`. La page ne défile plus.
  Scénario `liaison.spec.js` (code tapé dans l'éditeur, liaison au dialogue, curseur).
- Lot 14, chapitres 2 et 3 : supprimer des éléments d'esquisse (Suppr ou bouton : un point
  emporte ses éléments, une ligne ouvre sa boucle, contraintes et indices remis à jour),
  Projeter le contour de la face d'appui (points fixes, construction). Corrigés en passant :
  l'esquisse sur une face était cachée par la pièce (matériaux transparents dessinés après),
  la feature cliquée restait surlignée pendant l'esquisse. `sketch_delete.js`.
  Scénario `esquisse_supprimer.spec.js`.
- Lot 15, chapitre 6 (Fillet, Chamfer) : congé et chanfrein d'une arête droite choisie par ses
  deux faces planes (arête commune relue des contours ; vive : Couper, rentrante : Joindre ;
  l'outil traverse la pièce le long de l'arête). Barre d'outils à menus ▾ par groupe (commandes
  secondaires), comme Fusion ; `cmd()` des scénarios ouvre le menu au besoin.
  `face_commands.js`, `toolbar.js`. Scénario `conge.spec.js` (volumes vérifiés).
- Lot 16, chapitres 11 (Drawing) et 1 (Capture Image) : bouton Plan : mise en plan A4 paysage
  en projection européenne (face, dessus, gauche), arêtes vives, cotes d'encombrement,
  cartouche, échelle normalisée ; SVG téléchargé ; capture PNG de la vue. `drawing.js`.
  Scénario `plan.spec.js`.
- Lot 17, chapitre 10 (Auto Explode) : MÉCANISME, Éclater : curseur d'écartement des pièces
  depuis le centre de l'assemblage, rassemblées à la fermeture. Scénario `eclate.spec.js`.
- Lot 18, chapitres 11 et 6 : mise en plan avec arêtes cachées en traits interrompus (rayon
  vers l'observateur) ; paramètres utilisateur créés depuis le dialogue Paramètres (« + Ajouter »,
  écrits en tête de `model`). Scénarios `plan.spec.js`, `parametres.spec.js`.
- Lot 19, chapitres 2 et 1 : réseau circulaire d'esquisse (rayons de construction de même
  longueur, angles orientés ; le dernier élément choisi est le centre) ; menu circulaire du
  clic droit dans la vue (esquisse, extrusion, pousser/tirer, congé, perçage, mesurer,
  ajuster, annuler). `marking.js`. Scénario `reseau_circulaire.spec.js` (volume vérifié).
- Lot 20, chapitres 3 et 1 : plan milieu (deux faces parallèles cliquées) et plan à un angle
  (plan d'origine tourné autour d'un de ses axes), repères littéraux marqués
  `(* construction *)` et listés dans le navigateur ; annuler / rétablir (boutons, Ctrl+Z hors du
  code) sur l'historique du code, chaque commande de l'éditeur étant une étape à part.
  Scénario `construction2.spec.js`.
- Lot 21, chapitre 6 (Split Body) : Diviser le corps par un plan (origine ou construction) :
  garder le dessus, le dessous, ou les deux séparées le long de la normale (impression en
  deux parties). Scénario `diviser.spec.js` (volume conservé).
- Lot 22, chapitre 8 (Interference) : MÉCANISME, Interférences : paires de pièces qui se
  chevauchent à la pose courante (volume), pièces rougies tant que le dialogue est ouvert.
  La page ne défile plus du tout (racine et corps remis à zéro). Scénario `interferences.spec.js`.
- Lot 23, chapitre 3 (Extrude) : flèche de distance dans la vue, à tirer à la souris (pas de
  0,5 mm ; vers l'arrière : côté opposé), le champ et l'aperçu suivent. `gizmo.js`.
  Scénario `fleche.spec.js`.
- Lot 24, chapitre 1 (File) : Ouvrir… (fichier .ml), Enregistrer (le code), reprise
  automatique du dernier document après rechargement (stockage du navigateur). `files.js`.
  Scénario `fichier.spec.js`.
- Lot 25, chapitre 4 (Rib) : Nervure depuis l'esquisse : les lignes ouvertes épaissies et
  extrudées (épaisseur, hauteur, côté), Joindre ; esquisse sur une face : vue cadrée sur la
  face, à gauche de la palette (la palette cachait la zone de dessin). Scénario `nervure.spec.js`.
- Lot 26, chapitres 2 et 8 : cercles cotés au diamètre (Ø, saisie et palette ; la contrainte
  reste un rayon dans le code), Mesurer donne l'angle entre deux faces non parallèles.
  Scénarios `esquisse.spec.js`, `inspecter.spec.js`.
- Lot 27, chapitre 4 (Pipe) : Tuyau le long des lignes ouvertes d'une esquisse (cylindres,
  coudes arrondis aux sommets partagés, extrémités ouvertes ; creux si paroi > 0).
  `dialogs_paths.js` (nervure, tuyau). Scénario `tuyau.spec.js`.
- Lot 28, chapitre 7 (Motion Link) : MÉCANISME, Lien : une liaison en mène une autre avec un
  rapport (engrenages : −z1/z2), écrit dans `~couplings` de `Assembly.make`. Scénario `lien.spec.js`.
- Lot 29, chapitre 10 (Publish Video) : MÉCANISME, Vidéo : un cycle de l'animation (4 s)
  enregistré depuis la vue en WebM. Scénario `video.spec.js` (en-tête WebM vérifié).
- Lot 30, chapitres 3 et 8 : Plan par 3 points (clics accrochés aux sommets proches),
  analyse zébrée (bandes réfléchies, pour juger la continuité). Scénario `plan3.spec.js`.
- Lot 31, chapitre 2 (Chamfer, Sketch Scale) : chanfrein d'esquisse à un sommet (sommet virtuel
  gardé comme pour le congé), mise à l'échelle de toute l'esquisse (points et cotes).
  Scénario `esquisse_echelle.spec.js` (volume vérifié).
- Lot 32, chapitre 11 (Section View) : la mise en plan ajoute la coupe A-A (plan y milieu,
  contours chaînés, matière hachurée, échelle propre si besoin) et son trait de coupe sur la
  vue de dessus. Scénario `plan.spec.js`.
- Lot 33, chapitre 2 (contraintes implicites) : un point posé sur une ligne y est contraint
  (au milieu s'il en est proche), sur un cercle aussi. Scénario `inference.spec.js`.
- Lot 34, chapitre 6 (Shell) : Coque d'une extrusion faite par l'éditeur : même esquisse
  décalée vers l'intérieur (`Profile.offset`), extrudée au-dessus d'un fond de même épaisseur,
  retirée (dessus ouvert) ; reste liée à l'esquisse. Scénario `coque.spec.js` (volume exact).
- Lot 35, chapitre 4 (Hole from sketch points) : Perçages depuis l'esquisse : un trou à chaque
  point isolé (diamètre, traversant ou profondeur), Couper. Scénario `percages_points.spec.js`.
- Lot 36, chapitre 8 (Draft Analysis) : Dépouille selon +z (vert en dépouille, jaune vertical,
  rouge en contre-dépouille). Scénario `plan3.spec.js` (couleur d'un pixel vérifiée).
- Lot 37, chapitre 6 (Parameters) : cotes d'esquisse en expression de paramètres (« largeur »,
  « largeur/2 ») : `Sketch_desc.constr.expr` (contrat, test d'expectation), écrite telle quelle
  dans le code (`length l0 (largeur /. 2.)`), évaluée dans l'éditeur (`expr.js`) ; cote marquée
  ƒ ; l'esquisse suit le paramètre et se rouvre (la vérification ignore désormais les positions
  de départ, qui changent avec les paramètres). Scénario `cotes_parametres.spec.js`.
- Lot 38, chapitre 1 (raccourcis) : Q pousser/tirer, H perçage, M mesurer, J liaison, « ? » (et
  bouton ?) pour la liste des raccourcis. Scénario `raccourcis.spec.js`.
- Lot 39, chapitre 10 (In-canvas Render) : quatrième style de la barre de navigation,
  « Rendu » : éclairage d'ambiance (RoomEnvironment), tons ACES, matière satinée, ombre portée
  sur le plan de travail. Scénario `rendu.spec.js`.
- Lot 40, chapitre 2 (Spline) : `Sketch.spline` (Catmull-Rom uniforme, fermée si le premier et
  le dernier point sont le même ; contrat, test d'expectation), élément `S` des boucles de
  `Sketch_desc` ; outil Courbe (cliquer le premier point ferme), relue à la réouverture.
  Scénario `courbe.spec.js`.
- Lot 41, chapitre 2 (Sketch Palette) : accroche à la grille d'un millimètre (option), palette
  repliable d'un clic sur son titre (elle cachait la zone de dessin). Scénario `palette.spec.js`.
- Lot 42, chapitre 2 (Ellipse) : `Sketch.ellipse c a ry` et `oval` (contrat, test d'expectation :
  aire), champ `ellipses` de `Sketch_desc` ; outil Ellipse (centre, grand axe, petit axe),
  aperçu, relecture. Scénario `ellipse.spec.js` (volume).
- Lot 44, chapitre 3 (Extrude, choix des profils) : cases « Contours » dans le dialogue
  d'extrusion ; un contour décoché sort de l'aperçu, et l'esquisse est réécrite par le solveur
  sans lui avant l'insertion. Le lien `test_ui/node_modules` versionné par erreur au lot 19
  est retiré (`.gitignore` : `node_modules` sans barre). Scénario `profils.spec.js`.
- Lot 45, chapitre 6 (Scale) : `Shape.scale ?about f` jusqu'au noyau (`Kernel.S.scale`,
  manifold natif et JS, loi « échelle » dans les suites), commande Échelle (uniforme ou par axe,
  autour du centre de la pièce ou de l'origine). Numéro libre des noms générés calculé sur tous
  les `let` (le préfixe `echelle` manquait à la liste). Scénario `echelle.spec.js` (volumes).
- Lot 46, chapitre 2 (Trim) : outil Ajuster (touche T) : un clic retire le morceau de ligne
  compris entre les intersections voisines ; les lignes coupées sont scindées au point commun
  (contraintes H/V recopiées, sinon parallèles), les contours de lignes sont recalculés.
  Deux rectangles qui se chevauchent deviennent un seul contour. Scénario `ajuster.spec.js`
  (volume de l'union). Lignes seulement : cercles et arcs ne coupent pas encore.
- Lot 47, chapitre 2 (Extend, Break) : Prolonger (l'extrémité libre la plus proche du clic va
  jusqu'à la première ligne rencontrée et y reste, « sur la droite ») et Couper (la ligne
  cliquée et celle qui la croise sont scindées au point commun, les contours passent par lui).
  Scénario `prolonger.spec.js`.
- Lot 48, chapitre 3 (Loft) : `Kernel.S.of_mesh` (manifold natif par MeshGL, JS par `Mesh`),
  module pur `Loft` (contours rééchantillonnés en gardant leurs sommets, alignés, extrémités
  triangulées par oreilles ; test d'expectation : prisme, tronc de pyramide exact) et
  `Shape.loft [ (plan, profil); … ]`, loi « lissage » dans les suites. Bouton Lissage de la
  palette : garder l'esquisse seule, ou lisser vers une esquisse du code. Scénario
  `lissage.spec.js` (carré sur XY → cercle sur un plan décalé).
- Lot 49, chapitre 3 (Sweep) : `Loft.sweep_sections` (repère par sommet, x transporté
  parallèlement, coudes en onglet : volume = aire × longueur du chemin, testé) et
  `Shape.sweep profil chemin`, loi « balayage » dans les suites. Palette : bouton Garder
  (esquisse seule, sans feature, comme « Terminer l'esquisse » de Fusion) et Balayage (les
  lignes ouvertes forment le chemin, une esquisse gardée le profil). Scénario `balayage.spec.js`.
- Lot 50, chapitre 3 (Extrude, Taper Angle) : `Shape.extrude ?taper` (degrés, contour du haut
  décalé en onglet par `Loft.offset_outline`, solide réglé par `of_mesh` ; tests d'expectation
  et loi « dépouille » : tronc de pyramide exact), champ Dépouille du dialogue d'extrusion
  (aperçu approché). Scénario `depouille.spec.js`.
- Lot 51, chapitre 7 (Motion Study) : commande Étude de l'onglet MÉCANISME : une articulation
  menante, des étapes (temps, valeur ; « + Étape » prend la pose actuelle), lecture interpolée
  qui pilote le mécanisme et s'arrête sur la dernière étape. Scénario `etude.spec.js`.
- Lot 52, chapitres 2 et 3 (Text, Emboss) : `Cad_parts.Text` (police à traits A-Z, 0-9,
  ponctuation ; minuscules et accents ramenés ; contrat, test d'expectation, loi « texte »),
  commande Texte sur une face cliquée : relief (Joindre) ou gravure (Couper), hauteur,
  épaisseur, rotation ; axe du texte = X du monde projeté sur la face. Scénario `texte.spec.js`.
- Lot 53, chapitre 2 (3-Point Rectangle, 2-Point / 3-Point Circle, 3-Point Arc) : outils à
  trois clics de l'esquisse (rectangle incliné : perpendiculaire et parallèles ; cercle par
  trois points : « sur le cercle » ; arc par début, fin et un point) et cercle par deux points
  (centre au milieu du diamètre), dans le menu ▾ de CRÉER. Scénario `esquisse_points.spec.js`.
- Lot 54, chapitre 1 (3D Print, aperçu façon trancheur) : dans le dialogue Impression 3D,
  hauteur de couche (0,1 à 0,3 mm) et curseur de couche : la pièce orientée est coupée en haut
  de la couche, le contour de la couche (intersection du maillage) tracé en orange, sa
  longueur affichée. Scénario `couches.spec.js`.
- Lot 55, chapitre 2 (Polygon circumscribed, Construction) : polygone circonscrit (centre,
  milieu d'un côté ; cote : apothème par « distance point-droite ») et bascule profil ↔
  construction des lignes sélectionnées (touche X ou bouton Construction ; contours
  recalculés). Scénario `esquisse_construction.spec.js` (volume de l'hexagone seul).
- Lot 56, chapitre 1 (Insert Mesh) : `Shape.of_mesh` et `Cad_export.Stl.of_file` (contrats,
  loi « maillage importé »), message `file` du worker (système de fichiers du toplevel),
  commande Insérer STL : le fichier choisi est gardé dans le navigateur et redonné au worker à
  chaque démarrage ; le code le lit par son nom. Scénario `importer.spec.js` (volume, reprise
  après rechargement).
- Lot 57, impression 3D (Arrange) : exemplaires (1 à 64) en grille centrée avec un écart,
  dans l'aperçu, l'encombrement, les couches et le STL exporté. Scénario `exemplaires.spec.js`.
- Lot 58, chapitre 6 (Move/Copy, Create Copy) : case Copie du dialogue Déplacer : l'original
  reste et la copie déplacée y est jointe (`copieN`). Scénario `copier.spec.js` (volume × 4).
- Lot 59, chapitre 2 (Trim contre un cercle) : Ajuster coupe une ligne aux cercles (sommet
  « sur le cercle ») et un cercle cliqué devient l'arc restant entre ses intersections
  voisines, les lignes scindées à ses extrémités ; les contours se recalculent avec les arcs
  (lignes et arcs, format `{a}`/`{r}`). Scénario `trou_serrure.spec.js` (aire de l'union).
- Lot 60, chapitre 7 (Joint Limits, Rest Position) : limites et position initiale dans le
  dialogue Liaison (`~limits`, `~init` de `Joint.revolute` / `prismatic`), vérifiées ; le
  curseur du mouvement les respecte. Scénario `liaison_limites.spec.js`.
- Lot 61, chapitres 6 et 10 (Appearance) : commande Apparence (PLA de couleurs, PETG
  translucide, aluminium, laiton), appliquée dans tous les styles de vue et gardée dans le
  navigateur. Scénario `apparence.spec.js`.
- Lot 62, chapitre 3 (Extrude, Extent « To ») : bouton « Jusqu'à… » du dialogue d'extrusion :
  on clique une face plane parallèle, la distance et le sens en sont tirés (valeur écrite en
  littéral). Scénario `jusqua.spec.js`.
- Lot 63, chapitre 3 (Revolve, Symmetric) : case Symétrique de la révolution (angle réparti
  de part et d'autre du plan d'esquisse). Scénario `revolution_sym.spec.js` (boîte englobante).
- Lot 64, chapitre 4 (Rectangular Pattern, Symmetric) : case Symétrique du réseau
  rectangulaire (copies centrées sur l'original). Scénario `reseau_sym.spec.js`.
- Lot 65, chapitre 8 (Inspect) pour l'impression 3D : analyse d'épaisseur (rayon le long de la
  normale rentrante de chaque triangle) : épaisseur minimale, parois sous le seuil en rouge,
  sous le double en jaune, part de surface trop fine. Scénario `epaisseur.spec.js` (bac à
  parois de 1 mm).
- Lot 67, chapitre 2 (Center Point Slot) : oblong par le centre (centre, centre d'une
  extrémité ; centre tenu au milieu par une ligne de construction). Scénario `oblong_centre.spec.js`.
- Lot 68, chapitre 4 (Circular Pattern, Symmetric) : case Symétrique du réseau circulaire
  (angle réparti de part et d'autre de l'original). Scénario `reseau_circ_sym.spec.js`.
- Correctif (vu en CI, PR 46) : une esquisse terminée avant sa première résolution reprenait le
  code de l'esquisse précédente ; Lissage et Garder attendent la résolution comme Terminer.

## En cours
- Fin du sprint (27/11, 6 h) : les lots 44 à 65 partent en PR groupées de 2 à 6 lots (la CI
  prend ~15 min par PR, le job `ui` grossit avec les scénarios). Une PR rouge se corrige dans
  la PR suivante (ex. PR 44 : scénario des paramètres trop pressé sur une CI lente).
- Méthode : chaque lot est un commit ; la branche `claude/project-thread-tywefr` est remise sur
  `origin/main`, les lots y sont appliqués (cherry-pick), l'ancienne branche distante fusionnée
  sans changement (le mode auto refuse le force-push), puis PR, CI, fusion.

## Suivant (ordre proposé)
- Chapitre 2 : ajuster un arc, prolonger et couper contre cercles et arcs d'esquisse, cote de
  l'ellipse et de la courbe ; profils choisis en cliquant la région dans la vue ;
  texte dans l'esquisse elle-même (police à contours).
- Chapitre 3 : lissage et balayage de profils à trous, chemin courbe (arcs, courbes).
- Chapitre 6 : coque d'un corps quelconque.
- Chapitre 7 : liaisons choisies dans la vue (ports affichés) ; étude de mouvement enregistrée dans le code.
- Frise : réordonner les étapes par glisser (Source_edit « move »).

## Écarts connus avec Fusion (pas encore traités)
- Supprimer l'outil d'une étape combinée laisse `resultatN` (devenu une simple copie) dans la frise.
- Coque seulement pour une extrusion simple ; centre d'échelle écrit en littéral.
- Copier un arc (symétrie, réseau) ajoute une équation redondante (cohérente) : la palette l'affiche.
- Le dialogue Paramètres lit le dernier journal : ouvert pendant une réévaluation, il montre
  l'état précédent (le rouvrir suffit).
- Lissage, balayage, dépouille : profils simples (sans trou) ; « Jusqu'à » et texte écrivent des
  littéraux (pas liés à la face si elle bouge).
- Choix des profils par cases, pas encore par clic sur la région dans la vue.
- Plans de face, nervures, tuyaux et perçages aux points : géométrie écrite en littéral
  (pas liée à la pièce si elle change).
