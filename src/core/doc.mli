(** La monade de construction d'un document.

    ['a t] ≈ [env -> journal -> ('a * journal, error) result] :
    - Reader : valeurs de paramètres imposées par l'éditeur ([overrides]) ;
    - Writer : journal ordonné des paramètres et features ;
    - State : identifiants de features ;
    - Error : échec localisé.

    La géométrie reste pure ([Shape.t]) ; seule la structure du document
    (noms, positions, paramètres) passe par la monade. *)

type 'a t

val return : 'a -> 'a t
val bind : 'a t -> ('a -> 'b t) -> 'b t
val map : ('a -> 'b) -> 'a t -> 'b t
val both : 'a t -> 'b t -> ('a * 'b) t

module Syntax : sig
  val ( let* ) : 'a t -> ('a -> 'b t) -> 'b t
  val ( let+ ) : 'a t -> ('a -> 'b) -> 'b t
  val ( and+ ) : 'a t -> 'b t -> ('a * 'b) t
  val ( and* ) : 'a t -> 'b t -> ('a * 'b) t
end

val param :
  ?loc:Loc.t -> ?range:float * float -> ?unit_:string -> string -> float -> float t
(** [param name default] : valeur de l'override s'il existe, sinon [default].
    Un override hors de [range] est une erreur. Déclarer deux fois le même nom
    est une erreur. *)

val feature : ?loc:Loc.t -> name:string -> Shape.t -> Shape.t t
(** Enregistre une feature nommée et rend la forme inchangée. Ses dépendances
    sont les features antérieures dont la forme est un sous-terme de celle-ci.
    Deux features de même nom : erreur. *)

val fail : ?loc:Loc.t -> string -> 'a t

(** {2 Journal} *)

type param_info = {
  p_name : string;
  p_default : float;
  p_value : float;
  p_range : (float * float) option;
  p_unit : string option;
  p_loc : Loc.t;
}

type feature_info = {
  f_id : int;  (** 0, 1, 2… dans l'ordre de création *)
  f_name : string;
  f_loc : Loc.t;
  f_deps : int list;  (** [f_id] des features dont elle dépend, croissants *)
  f_shape : Shape.t;
}

type journal = { params : param_info list; features : feature_info list }
(** Listes dans l'ordre de déclaration. *)

type error = { message : string; loc : Loc.t; journal : journal }
(** [journal] : ce qui a été construit avant l'échec (l'arbre partiel). *)

val run : ?overrides:(string * float) list -> 'a t -> ('a * journal, error) result
(** Un override qui ne correspond à aucun paramètre déclaré est une erreur,
    détectée après l'exécution complète : son [journal] est alors complet. *)
