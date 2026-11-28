(** Description de données d'une esquisse, telle que l'éditeur graphique la
    manipule : entités indexées et contraintes nommées. Elle se résout
    directement ([solve]) et se traduit en code OCaml ([to_code]) que
    l'éditeur insère dans le source sous un [let%sketch].

    Région produite : les boucles et les cercles, dans l'ordre de leur profondeur
    d'imbrication (nombre d'autres boucles ou cercles qui contiennent un point témoin : juste
    à l'intérieur, au milieu du premier côté d'une boucle, ce qui départage deux faces voisines ;
    le point d'angle 0 d'un cercle ; d'après les positions initiales, arcs compris) ;
    profondeur paire ajoutée, impaire retirée, comme les régions d'un modeleur : un cercle
    dans un contour est un perçage, deux cercles concentriques une bague, un contour dans un
    cercle un trou. Puis les ellipses retirées s'il y a une boucle ou un cercle, sinon
    réunies. *)

type constr = {
  kind : string;
  (** ["horizontal" | "vertical" | "length" | "parallel" | "perpendicular"
      | "equal_length" | "angle"] : sur des lignes ;
      ["coincident" | "distance" | "hdistance" | "vdistance"] : sur des points ;
      ["radius" | "equal_radius" | "concentric"] : sur des cercles ;
      ["tangent"] : ligne, cercle ; ["on_line" | "midpoint"] : point, ligne ;
      ["on_circle"] : point, cercle ; ["symmetric"] : point, point, ligne ; ["point_line_distance"] : point, ligne (valeur) ; ["arc_radius"] : arc ; ["tangent_arc"] : ligne, arc. *)
  refs : int list;  (** indices dans [lines], [points], [circles] ou [arcs] selon [kind] *)
  value : float option;  (** longueur, distance, angle (degrés) ou rayon *)
  expr : string option;
  (** expression OCaml de la valeur (paramètres : [largeur /. 2.]), écrite telle quelle dans le
      code par [to_code] à la place de [value] ; [value] en est la valeur, pour résoudre. *)
}

type item = P of int | A of int | Rev of int | S of int list
(** Élément d'une boucle : point, arc parcouru de son début à sa fin, ou à l'envers, ou
    courbe lisse par des points ([Sketch.spline]). *)

type t = {
  points : (float * float * bool) array;  (** x, y (valeurs initiales), fixe *)
  lines : (int * int) array;  (** indices de points *)
  circles : (int * float) array;  (** centre (indice de point), rayon initial *)
  arcs : (int * int * int) array;
  (** centre, début, fin (indices de points) ; sens trigonométrique du début à la fin *)
  ellipses : (int * int * float) array;
  (** centre, extrémité du grand axe (indices de points), demi-petit axe ; régions comme
      les cercles d'avant (retirées des boucles et des cercles, sinon réunies) *)
  constraints : constr list;
  loops : item list list;  (** boucles fermées, éléments dans l'ordre (voir [Sketch.path]) *)
}

val build : t -> (Sketch.region Sketch.t, string) result
(** [Error] si un indice ou une arité est invalide, ou un [kind] inconnu. *)

val solve : t -> (Sketch.solved, string) result

val to_code : ?indent:int -> t -> string
(** Expression OCaml de type [Sketch.region Sketch.t] (sans [let%sketch]),
    lignes indentées de [indent] espaces (défaut 4) ; valeurs initiales
    arrondies au centième. Suppose [open Cad]. Lève [Invalid_argument] si
    [build] échoue. *)
