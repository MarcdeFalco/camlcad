(** Solides symboliques et purs.

    Un [Shape.t] est un terme d'un DAG hash-consé : construire deux fois la même
    expression rend le même nœud, ce qui permet à [Eval] de mémoïser par [id].
    Aucune géométrie n'est calculée ici. *)

type t

val empty : t
val cube : ?center:bool -> Geom.V3.t -> t
val cylinder : ?center:bool -> r:float -> h:float -> unit -> t
val sphere : r:float -> t

val extrude : ?twist:float -> ?scale_top:float -> h:float -> Profile.t -> t
(** Extrusion le long du z local du plan [Geom.Plane.xy]. *)

val revolve : ?deg:float -> Profile.t -> t
(** Défaut : 360. *)

val union : t list -> t
val ( + ) : t -> t -> t
val ( - ) : t -> t -> t
val ( * ) : t -> t -> t
val place : Geom.Frame.t -> t -> t
val on : Geom.Plane.t -> t -> t
(** Synonyme de [place], lisible pour les extrusions d'esquisse. *)

val translate : Geom.V3.t -> t -> t
val rotate : axis:Geom.V3.t -> deg:float -> t -> t
val mirror : normal:Geom.V3.t -> t -> t

val id : t -> int
val equal : t -> t -> bool

val subterms : t -> int list
(** Identifiants de tous les sous-termes (lui compris), sans doublon.
    Utilisé par [Doc] pour calculer les dépendances entre features. *)

type view =
  | Empty
  | Cube of { size : Geom.V3.t; center : bool }
  | Cylinder of { r : float; h : float; center : bool }
  | Sphere of float
  | Extrude of { profile : Profile.t; h : float; twist : float; scale_top : float }
  | Revolve of { profile : Profile.t; deg : float }
  | Union of t * t
  | Difference of t * t
  | Intersection of t * t
  | Place of Geom.Frame.t * t
  | Mirror of Geom.V3.t * t

val view : t -> view
