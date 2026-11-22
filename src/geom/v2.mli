(** Vecteurs et points du plan. Unité : millimètre. *)

type t = { x : float; y : float }

val v : float -> float -> t
val zero : t
val add : t -> t -> t
val sub : t -> t -> t
val neg : t -> t
val scale : float -> t -> t
val dot : t -> t -> float
val cross : t -> t -> float
(** Composante z du produit vectoriel ; > 0 si le second est à gauche du premier. *)

val norm : t -> float
val normalize : t -> t
(** [normalize zero] lève [Invalid_argument]. *)

val rotate : deg:float -> t -> t
(** Rotation autour de l'origine, sens direct, angle en degrés. *)

val dist : t -> t -> float
val equal : ?eps:float -> t -> t -> bool
(** Égalité à [eps] près (défaut [1e-9]) sur chaque composante. *)

val pp : Format.formatter -> t -> unit
