(** Esquisses 2D contraintes.

    Une esquisse se construit dans une monade : créer une entité rend une
    poignée typée ([point], [line], [circle]) que l'on contraint ensuite. Les
    coordonnées données à la création sont des {e valeurs initiales} ; ce sont
    les contraintes qui fixent la forme, via [Nlsolve].

    {[
      let triangle =
        let open Sketch.Syntax in
        let* a = Sketch.point ~fixed:true 0. 0. in
        let* b = Sketch.point 40. 2. and* c = Sketch.point 5. 30. in
        let* ab = Sketch.line a b and* ac = Sketch.line a c in
        let+ () = Sketch.constrain Sketch.[ horizontal ab; perpendicular ab ac;
                                            length ab 40.; length ac 30. ] in
        Sketch.loop [ a; b; c ]
    ]}

    Unités : mm et degrés. Une contrainte est une équation scalaire ou deux ;
    les distances sont non signées. *)

type 'a t
type point
type line
type circle

val return : 'a -> 'a t
val bind : 'a t -> ('a -> 'b t) -> 'b t
val map : ('a -> 'b) -> 'a t -> 'b t

module Syntax : sig
  val ( let* ) : 'a t -> ('a -> 'b t) -> 'b t
  val ( let+ ) : 'a t -> ('a -> 'b) -> 'b t
  val ( and* ) : 'a t -> 'b t -> ('a * 'b) t
  val ( and+ ) : 'a t -> 'b t -> ('a * 'b) t
end

(** {2 Entités} *)

val point : ?fixed:bool -> float -> float -> point t
(** [~fixed:true] : le point n'est pas une inconnue (ancrage). *)

val line : point -> point -> line t
val circle : ?fixed_radius:bool -> point -> float -> circle t
(** Centre et rayon initial. *)

val start_ : line -> point
val end_ : line -> point
val center : circle -> point

(** {2 Contraintes} *)

type constr

val constrain : constr list -> unit t

val fix : point -> float -> float -> constr
val coincident : point -> point -> constr
val horizontal : line -> constr
val vertical : line -> constr
val distance : point -> point -> float -> constr
val length : line -> float -> constr
val equal_length : line -> line -> constr
val parallel : line -> line -> constr
val perpendicular : line -> line -> constr

val angle : line -> line -> float -> constr
(** Angle orienté de la première vers la seconde, en degrés. *)

val on_line : point -> line -> constr
(** Sur la droite support (pas forcément sur le segment). *)

val midpoint : point -> line -> constr
val radius : circle -> float -> constr
val equal_radius : circle -> circle -> constr
val on_circle : point -> circle -> constr
val tangent : line -> circle -> constr
(** Distance du centre à la droite support = rayon. *)

val concentric : circle -> circle -> constr
val hdistance : point -> point -> float -> constr
(** [x q - x p = d] (signée). *)

val vdistance : point -> point -> float -> constr
(** [y q - y p = d] (signée). *)

(** {2 Régions} : ce que l'esquisse produit, évalué après résolution. *)

type region

val loop : point list -> region
(** Polygone fermé par ses sommets (l'orientation est corrigée au besoin). *)

val disk : circle -> region
val ( + ) : region -> region -> region
val ( - ) : region -> region -> region

(** {2 Résolution} *)

type solved = {
  profile : Profile.t;
  dof : int;  (** degrés de liberté restants : inconnues - rang de la jacobienne *)
  redundant : int;  (** équations redondantes (compatibles) : équations - rang *)
  points : Geom.V2.t array;  (** positions résolues, dans l'ordre de création *)
}

val solve : region t -> (solved, string) result
(** [Error] si le solveur ne converge pas (contraintes incompatibles ou
    position initiale trop lointaine). *)

val pos : solved -> point -> Geom.V2.t

val to_doc : ?loc:Loc.t -> region t -> Profile.t Doc.t
(** Résout ; un échec devient [Doc.fail ~loc]. *)
