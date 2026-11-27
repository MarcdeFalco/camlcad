(** Lissage (loft, Black Book ch. 3) : solide réglé entre des contours plans successifs.
    Géométrie pure, sans noyau : le maillage produit passe au noyau par [Kernel.S.of_mesh]. *)

val outline : segments:int -> Profile.t -> Geom.V2.t list option
(** Contour d'un profil simple (polygone ou cercle à [segments] côtés, éventuellement
    déplacé ou tourné), dans le sens direct. [None] pour un profil booléen (union, trou,
    décalage) : le lissage ne porte que sur des contours simples. *)

val mesh : (Geom.Frame.t * Geom.V2.t list) list -> Mesh.t
(** Maillage fermé, orienté (normales sortantes) du solide réglé passant par les contours,
    chacun dans le plan xy de son repère, dans l'ordre de la liste. Les contours sont
    rééchantillonnés au même nombre de sommets (leurs sommets sont gardés, les points
    ajoutés répartis selon la longueur des côtés) puis alignés : chacun commence au sommet
    le plus proche de l'axe x local vu de son centre. Les deux extrémités sont fermées par
    triangulation (oreilles). [Mesh.empty] s'il y a moins de deux contours ou un contour de
    moins de trois sommets. *)
