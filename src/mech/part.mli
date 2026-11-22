(** Pièce d'un mécanisme : un solide (dans son repère propre) et des ports,
    repères nommés où se branchent les liaisons. L'axe z d'un port est l'axe
    de la liaison (rotation ou translation). *)

type t = private {
  name : string;
  shape : Cad.Shape.t;
  ports : (string * Geom.Frame.t) list;
  color : (int * int * int) option;
}

val make : ?color:int * int * int -> ?ports:(string * Geom.Frame.t) list -> string -> Cad.Shape.t -> t
(** Lève [Invalid_argument] si deux ports ont le même nom. *)

val port : t -> string -> Geom.Frame.t
(** Lève [Invalid_argument] si le port n'existe pas. *)

val ( @: ) : t -> string -> t * string
(** [piece @: "pivot"] : désigne un port, pour les liaisons. *)
