(** Maillage triangulaire indexé, format d'échange entre noyau, export et rendu.

    Invariants d'un maillage produit par un noyau : fermé (chaque arête
    partagée par exactement deux triangles), orienté (normales sortantes,
    sommets dans le sens direct vus de l'extérieur). *)

type t = {
  vertices : float array;  (** [x0; y0; z0; x1; ...], longueur multiple de 3 *)
  triangles : int array;   (** [i0; j0; k0; i1; ...], indices de sommets *)
}

val empty : t
val n_vertices : t -> int
val n_triangles : t -> int
val vertex : t -> int -> Geom.V3.t
val triangle : t -> int -> int * int * int

val volume : t -> float
(** Volume signé par le théorème de la divergence ; > 0 si bien orienté. *)

val bbox : t -> Geom.Bbox.t

val is_closed : t -> bool
(** Chaque arête non orientée apparaît dans exactement deux triangles,
    une fois dans chaque sens. *)

val euler_characteristic : t -> int
(** V - E + F. Pour une surface fermée connexe : 2 - 2 × genre. *)

val distance : t -> Geom.V3.t -> float
(** Distance d'un point à la surface (au triangle le plus proche) ;
    [infinity] pour un maillage vide. Sert à la sélection dans la vue 3D. *)
