(** Assemblages : un arbre de liaisons enraciné sur une pièce fixe, plus
    d'éventuelles liaisons de fermeture de boucle et des couplages.

    Coordonnées : une par liaison non encastrée de l'arbre. Une pose impose
    certaines coordonnées (les « pilotes ») ; les autres sont résolues par
    [Cad.Nlsolve] pour satisfaire les boucles et les couplages, en partant de
    la pose précédente (continuité du mouvement). Sans boucle ni couplage, les
    coordonnées libres restent à leur valeur [init]. *)

type t

type coupling = { driver : string; driven : string; ratio : float }
(** [q driven = ratio × q driver] (engrenages : [ratio = - z1 / z2]). *)

val make : ?loops:Joint.t list -> ?couplings:coupling list -> ground:Part.t -> Joint.t list -> t
(** [joints] doit former un arbre couvrant enraciné en [ground] (chaque autre
    pièce est l'enfant d'exactement une liaison, sans cycle). Les [loops] ne
    peuvent être que [Revolute] ou [Fixed]. Lève [Invalid_argument] sinon. *)

val parts : t -> Part.t list
(** [ground] d'abord, puis dans l'ordre de l'arbre. *)

val joints : t -> Joint.t list
(** Liaisons de l'arbre, dans l'ordre de parcours depuis la pièce fixe. *)

val coordinates : t -> string list
(** Noms des liaisons non encastrées de l'arbre. *)

type pose = (string * float) list
(** Valeur de chaque coordonnée. *)

val solve : ?from:pose -> t -> (string * float) list -> (pose, string) result
(** [solve asm pilotes] : complète les pilotes en une pose qui ferme les
    boucles et respecte les couplages. [Error] si le solveur ne converge pas
    (position inaccessible) ; les butées ([limits]) ne sont pas imposées par le
    solveur mais une pose hors butée est une erreur. *)

val placements : t -> pose -> (Part.t * Geom.Frame.t) list
(** Repère monde de chaque pièce pour une pose (coordonnées absentes : [init]). *)

val shapes : t -> pose -> (Part.t * Cad.Shape.t) list
(** Solides placés. *)

val sweep :
  ?steps:int -> t -> driver:string -> float * float -> ((float * pose), string) result list
(** Parcours de la course d'un pilote ([steps] intervalles, défaut 36),
    chaque pose partant de la précédente. *)

val interferences :
  volume:(Cad.Shape.t -> float) -> ?tol:float -> t -> pose -> (string * string * float) list
(** Paires de pièces dont l'intersection a un volume > [tol] mm³ (défaut 1e-3),
    pour une pose. [volume] vient d'un noyau ([K.volume ∘ E.solid]). *)
