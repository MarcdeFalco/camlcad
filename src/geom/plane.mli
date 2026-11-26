(** Plans d'esquisse : un repère dont le plan (x, y) local porte l'esquisse
    et dont l'axe z local est la direction d'extrusion. *)

type t = Frame.t

val xy : t
(** Vu de dessus : x = X, y = Y, normale +Z. *)

val yz : t
(** Vu de droite : x = Y, y = Z, normale +X. *)

val zx : t
(** x = Z, y = X, normale +Y (vu de l'arrière, x vertical à l'écran). *)

val xz : t
(** Vu de face, comme le plan XZ d'un modeleur : x = X, y = Z, normale −Y.
    Même plan que [zx], repère différent : c'est celui que l'éditeur propose. *)

val offset : float -> t -> t
(** Décale le plan le long de sa normale. *)

val normal : t -> V3.t
