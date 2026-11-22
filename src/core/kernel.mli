(** Signature d'un noyau géométrique.

    Implémentations prévues : [Kernel_manifold_native] (OManifold, phase 1),
    [Kernel_manifold_js] (manifold-3d via js_of_ocaml, phase 3), plus tard
    [Kernel_occt]. Le reste de la bibliothèque ne connaît que cette signature.

    Toutes les longueurs sont en mm, les angles en degrés. Un noyau ne lève
    pas d'exception pour une géométrie dégénérée : il rend un solide vide. *)

module type S = sig
  type solid
  type section
  (** Région plane (plan xy local), éventuellement multiplement connexe. *)

  val name : string

  (** {2 Sections 2D} *)

  val section_of_contours : Geom.V2.t list list -> section
  (** Contours fermés ; règle de remplissage « positive » : un contour direct
      ajoute de la matière, un contour indirect en retire. *)

  val section_union : section -> section -> section
  val section_difference : section -> section -> section
  val section_intersection : section -> section -> section

  val section_offset : delta:float -> section -> section
  (** Décalage (Minkowski avec un disque), coins arrondis. *)

  val section_area : section -> float

  (** {2 Solides} *)

  val empty : solid
  val cube : size:Geom.V3.t -> solid
  (** Coin en l'origine, dans l'octant positif. *)

  val cylinder : r:float -> h:float -> segments:int -> solid
  (** Axe z, base dans le plan z = 0. *)

  val sphere : r:float -> segments:int -> solid

  val extrude : section -> h:float -> twist:float -> scale_top:float -> solid
  (** Le long de z local, de 0 à [h]. *)

  val revolve : section -> deg:float -> segments:int -> solid
  (** Révolution autour de l'axe y local de la section, ramené sur z. *)

  val union : solid -> solid -> solid
  val difference : solid -> solid -> solid
  val intersection : solid -> solid -> solid
  val transform : Geom.Frame.t -> solid -> solid
  val mirror : normal:Geom.V3.t -> solid -> solid

  (** {2 Requêtes} *)

  val is_empty : solid -> bool
  val volume : solid -> float
  val bbox : solid -> Geom.Bbox.t
  val genus : solid -> int
  val to_mesh : solid -> Mesh.t
end
