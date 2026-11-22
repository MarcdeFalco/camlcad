(** Plans d'esquisse : un repère dont le plan (x, y) local porte l'esquisse
    et dont l'axe z local est la direction d'extrusion. *)

type t = Frame.t

val xy : t
val yz : t
val zx : t

val offset : float -> t -> t
(** Décale le plan le long de sa normale. *)

val normal : t -> V3.t
