(** Description de données d'une esquisse, telle que l'éditeur graphique la
    manipule : entités indexées et contraintes nommées. Elle se résout
    directement ([solve]) et se traduit en code OCaml ([to_code]) que
    l'éditeur insère dans le source sous un [let%sketch].

    Région produite : les boucles, dans l'ordre de leur profondeur d'imbrication (nombre
    d'autres boucles qui contiennent leur premier point, d'après les positions initiales) ;
    profondeur paire ajoutée, impaire retirée (une boucle dans une boucle est un trou, comme
    dans un modeleur) ; puis les cercles retirés s'il y a au moins une boucle (perçages),
    sinon l'union des disques. *)

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
}

type item = P of int | A of int | Rev of int
(** Élément d'une boucle : point, arc parcouru de son début à sa fin, ou à l'envers. *)

type t = {
  points : (float * float * bool) array;  (** x, y (valeurs initiales), fixe *)
  lines : (int * int) array;  (** indices de points *)
  circles : (int * float) array;  (** centre (indice de point), rayon initial *)
  arcs : (int * int * int) array;
  (** centre, début, fin (indices de points) ; sens trigonométrique du début à la fin *)
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
