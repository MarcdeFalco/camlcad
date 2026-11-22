(** Vecteurs et points de l'espace. Unité : millimètre. *)

type t = { x : float; y : float; z : float }

val v : float -> float -> float -> t
val zero : t
val ex : t
val ey : t
val ez : t
val add : t -> t -> t
val sub : t -> t -> t
val neg : t -> t
val scale : float -> t -> t
val dot : t -> t -> float
val cross : t -> t -> t
val norm : t -> float
val normalize : t -> t
(** [normalize zero] lève [Invalid_argument]. *)

val dist : t -> t -> float
val of_v2 : ?z:float -> V2.t -> t
val equal : ?eps:float -> t -> t -> bool
val pp : Format.formatter -> t -> unit
