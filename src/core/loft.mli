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

val sweep_sections : Geom.V2.t list -> Geom.V3.t list -> (Geom.Frame.t * Geom.V2.t list) list
(** Balayage (Black Book ch. 3, Sweep) d'un contour le long d'une ligne brisée, le centre de
    sa boîte englobante posé sur le chemin (où qu'il ait été dessiné) : un repère
    par sommet du chemin, d'axe z la tangente (bissectrice aux coudes), d'axe x transporté
    parallèlement depuis le départ (x initial horizontal : [z × ez], ou [ex] si le chemin part
    à la verticale). Aux coudes, le contour est étiré dans le plan du coude de [1 / cos(φ/2)]
    (coupe d'onglet) : le volume vaut l'aire du contour fois la longueur du chemin. Liste vide
    si le chemin a moins de deux points distincts. À passer à {!mesh}. *)
