(** Profils 2D symboliques et purs. Un profil n'est pas encore évalué :
    c'est un terme, partagé (hash-consé) comme [Shape.t].

    Les esquisses contraintes (phase 5) produiront un [Profile.t]. *)

type t

val polygon : Geom.V2.t list -> t
(** Contour fermé ; le dernier point est relié au premier. *)

val rect : ?center:bool -> w:float -> h:float -> unit -> t
val circle : r:float -> t
val union : t -> t -> t
val difference : t -> t -> t
val intersection : t -> t -> t
val offset : float -> t -> t
val translate : Geom.V2.t -> t -> t
val rotate : deg:float -> t -> t

val regions : t -> t list
(** Régions d'un profil d'esquisse, comme celles qu'on clique dans un modeleur : chaque
    contour (polygone, ou disque placé par [translate]) moins les contours qu'il contient
    directement, rangées par profondeur d'imbrication (nombre de contours qui contiennent
    un point témoin : juste à l'intérieur, au milieu du premier côté d'un polygone, ce qui
    départage deux faces voisines ; le point d'angle 0 d'un disque) puis par ordre d'apparition.
    Pour un profil de {!Sketch} (contours réunis et retranchés) : [Sketch.(a - b)], [b] dans
    [a], donne [[a - b; b]]. Contours égaux comptés une fois. Un profil qui n'est pas fait
    que de polygones et de disques réunis ou retranchés est une seule région : [[p]]. *)

val region : int -> t -> t
(** [region k p] : la [k]-ième (à partir de 0) de [regions p]. Lève [Invalid_argument]
    si [k] est hors bornes. *)

val id : t -> int
(** Identifiant unique du terme ; deux termes structurellement égaux ont
    le même [id] (hash-consing). *)

val equal : t -> t -> bool
(** Égalité structurelle en temps constant (comparaison des [id]). *)

(** {2 Observation} réservée aux interprètes ([Eval]). *)

type view =
  | Polygon of Geom.V2.t list
  | Circle of float
  | Union of t * t
  | Difference of t * t
  | Intersection of t * t
  | Offset of float * t
  | Translate of Geom.V2.t * t
  | Rotate of float * t

val view : t -> view
