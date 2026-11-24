(** Description de données d'une esquisse, telle que l'éditeur graphique la
    manipule : entités indexées et contraintes nommées. Elle se résout
    directement ([solve]) et se traduit en code OCaml ([to_code]) que
    l'éditeur insère dans le source sous un [let%sketch].

    Région produite : l'union des boucles moins les cercles s'il y a au moins
    une boucle (perçages), sinon l'union des disques. *)

type constr = {
  kind : string;
  (** ["horizontal" | "vertical" | "length" | "parallel" | "perpendicular"
      | "equal_length" | "angle"] : sur des lignes ;
      ["coincident" | "distance" | "hdistance" | "vdistance"] : sur des points ;
      ["radius" | "equal_radius" | "concentric"] : sur des cercles ;
      ["tangent"] : ligne, cercle ; ["on_line" | "midpoint"] : point, ligne ;
      ["on_circle"] : point, cercle. *)
  refs : int list;  (** indices dans [lines], [points] ou [circles] selon [kind] *)
  value : float option;  (** longueur, distance, angle (degrés) ou rayon *)
}

type t = {
  points : (float * float * bool) array;  (** x, y (valeurs initiales), fixe *)
  lines : (int * int) array;  (** indices de points *)
  circles : (int * float) array;  (** centre (indice de point), rayon initial *)
  constraints : constr list;
  loops : int list list;  (** boucles fermées, indices de points dans l'ordre *)
}

val build : t -> (Sketch.region Sketch.t, string) result
(** [Error] si un indice ou une arité est invalide, ou un [kind] inconnu. *)

val solve : t -> (Sketch.solved, string) result

val to_code : ?indent:int -> t -> string
(** Expression OCaml de type [Sketch.region Sketch.t] (sans [let%sketch]),
    lignes indentées de [indent] espaces (défaut 4) ; valeurs initiales
    arrondies au centième. Suppose [open Cad]. Lève [Invalid_argument] si
    [build] échoue. *)
