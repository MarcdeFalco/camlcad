(** Interprète mémoïsé des termes [Shape.t] / [Profile.t] vers un noyau. *)

type quality = {
  chord_tol : float;  (** erreur de corde maximale en mm, défaut 0.01 *)
  min_segments : int; (** défaut 12 *)
  max_segments : int; (** défaut 360 *)
}

val default_quality : quality

val segments : quality -> r:float -> deg:float -> int
(** Nombre de segments pour un arc de rayon [r] et d'angle [deg] :
    [ceil (rad deg / (2 acos (1 - chord_tol / r)))], borné par [min_segments]
    et [max_segments] pris au prorata de [deg / 360] (au moins 1). *)

module Make (K : Kernel.S) : sig
  type t
  (** Un cache : table [id de terme -> résultat du noyau]. *)

  val create : ?quality:quality -> unit -> t
  val solid : t -> Shape.t -> K.solid
  (** Chaque sous-terme distinct est évalué au plus une fois par cache. *)

  val section : t -> Profile.t -> K.section
  val mesh : t -> Shape.t -> Mesh.t

  val stats : t -> int * int
  (** [(nœuds calculés, hits du cache)]. Un sous-terme partagé compte un hit à
      chaque réutilisation, y compris pendant la première évaluation. *)

  val clear : t -> unit
end
