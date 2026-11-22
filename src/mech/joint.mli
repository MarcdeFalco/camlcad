(** Liaisons entre deux ports. La position relative est
    [repère(port enfant) = repère(port parent) ∘ mouvement(q)], où
    [mouvement] est une rotation de [q] degrés autour de z (pivot), une
    translation de [q] mm le long de z (glissière), ou l'identité (encastrement). *)

type kind = Fixed | Revolute | Prismatic

type t = private {
  name : string;
  kind : kind;
  parent : Part.t * string;
  child : Part.t * string;
  limits : (float * float) option;
  init : float;  (** valeur initiale (et de repos) de la coordonnée *)
}

val fixed : ?name:string -> Part.t * string -> Part.t * string -> t
val revolute : ?name:string -> ?limits:float * float -> ?init:float -> Part.t * string -> Part.t * string -> t
val prismatic : ?name:string -> ?limits:float * float -> ?init:float -> Part.t * string -> Part.t * string -> t
(** Nom par défaut : ["parent.port-enfant.port"]. *)

val motion : kind -> float -> Geom.Frame.t
