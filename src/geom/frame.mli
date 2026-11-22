(** Repères orthonormés directs (isométries directes de l'espace).

    Un repère est à la fois une position (origine + axes) et la transformation
    qui envoie les coordonnées locales vers les coordonnées du monde. Les angles
    sont en degrés. *)

type t

val world : t
(** Le repère du monde : origine 0, axes canoniques. *)

val make : origin:V3.t -> x:V3.t -> z:V3.t -> t
(** [x] et [z] sont orthonormalisés (Gram-Schmidt, [z] prioritaire), [y = z × x].
    Lève [Invalid_argument] si [x] et [z] sont colinéaires. *)

val origin : t -> V3.t
val x_axis : t -> V3.t
val y_axis : t -> V3.t
val z_axis : t -> V3.t

val at : float -> float -> float -> t
(** [at x y z] : translation pure. *)

val translate : V3.t -> t -> t
(** Translation exprimée dans le repère du monde. *)

val rotate : axis:V3.t -> deg:float -> t -> t
(** Rotation autour d'un axe passant par l'origine du monde. *)

val compose : t -> t -> t
(** [compose a b] applique [b] puis [a] : coordonnées de [b] exprimées dans [a]. *)

val inverse : t -> t

val apply : t -> V3.t -> V3.t
(** Point local vers point monde. *)

val apply_dir : t -> V3.t -> V3.t
(** Direction locale vers direction monde (sans translation). *)

val to_matrix : t -> float array
(** Matrice 4x4 homogène, ordre colonne majeur (convention three.js / Manifold). *)

val equal : ?eps:float -> t -> t -> bool
val pp : Format.formatter -> t -> unit
