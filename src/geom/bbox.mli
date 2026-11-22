(** Boîtes englobantes alignées sur les axes. *)

type t = { min : V3.t; max : V3.t }

val empty : t
(** Élément neutre de [union] ; [is_empty empty = true]. *)

val is_empty : t -> bool
val of_points : V3.t list -> t
val union : t -> t -> t
val size : t -> V3.t
val center : t -> V3.t
val equal : ?eps:float -> t -> t -> bool
val pp : Format.formatter -> t -> unit
