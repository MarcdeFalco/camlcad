(** Axes orientés : un point et une direction unitaire. *)

type t = private { point : V3.t; dir : V3.t }

val make : point:V3.t -> dir:V3.t -> t
(** Normalise [dir] ; lève [Invalid_argument] si [dir] est nul. *)

val x : t
val y : t
val z : t
