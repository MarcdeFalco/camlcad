(** Solides symboliques et purs.

    Un [Shape.t] est un terme d'un DAG hash-consé : construire deux fois la même
    expression rend le même nœud, ce qui permet à [Eval] de mémoïser par [id].
    Aucune géométrie n'est calculée ici. *)

type t

val empty : t
val cube : ?center:bool -> Geom.V3.t -> t
val cylinder : ?center:bool -> r:float -> h:float -> unit -> t
val sphere : r:float -> t

val extrude : ?twist:float -> ?scale_top:float -> ?taper:float -> h:float -> Profile.t -> t
(** Extrusion le long du z local du plan [Geom.Plane.xy]. [taper] (degrés, Black Book ch. 3,
    « Taper angle ») : dépouille des flancs, positive vers l'intérieur ; le contour du haut
    est le contour du bas décalé de [-h tan taper] en onglet (voir {!Loft.offset_outline}).
    Avec une dépouille, seuls les profils simples (polygone, cercle) sont extrudés, sans
    [twist] ni [scale_top] ; sinon le solide est vide. *)

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

val scale : ?about:Geom.V3.t -> Geom.V3.t -> t -> t
(** [scale ~about f s] : affinité de centre [about] (l'origine par défaut), de facteurs
    [f.x], [f.y], [f.z] ; [V3.v k k k] est l'homothétie de rapport [k]. Un facteur
    négatif retourne aussi la pièce ; un facteur nul donne un solide vide. *)

val loft : (Geom.Plane.t * Profile.t) list -> t
(** Lissage (Black Book ch. 3, Loft) : solide réglé passant par les profils, chacun dans
    son plan, dans l'ordre (voir {!Loft.mesh}). Profils simples seulement (polygone,
    cercle) ; un profil booléen, ou moins de deux profils, donne un solide vide. *)

val sweep : Profile.t -> Geom.V3.t list -> t
(** Balayage (Black Book ch. 3, Sweep) d'un profil simple le long d'une ligne brisée : le
    profil, centré sur le départ du chemin dans son plan normal, suit le chemin, coudes en onglet (voir
    {!Loft.sweep_sections}). Solide vide pour un profil booléen ou un chemin de moins de deux
    points. *)

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
  | Extrude of { profile : Profile.t; h : float; twist : float; scale_top : float; taper : float }
  | Revolve of { profile : Profile.t; deg : float }
  | Union of t * t
  | Difference of t * t
  | Intersection of t * t
  | Place of Geom.Frame.t * t
  | Mirror of Geom.V3.t * t
  | Scale of Geom.V3.t * t
  | Loft of (Geom.Frame.t * Profile.t) list
  | Sweep of Profile.t * Geom.V3.t list

val view : t -> view
