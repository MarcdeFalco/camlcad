(** Engrenages droits à développante de cercle (profils 2D purs).

    Notations ISO : module [m] (mm), nombre de dents [z], angle de pression
    [alpha] (degrés, défaut 20). Rayon primitif [m z / 2], tête [+ m],
    pied [- 1.25 m]. Pas de correction de denture ni de détourage : en
    dessous d'environ 17 dents (pour 20°), le pied réel est légèrement
    creusé par la crémaillère et ce profil est un peu trop gras. *)

val pitch_radius : module_:float -> teeth:int -> float
val tip_radius : module_:float -> teeth:int -> float
val root_radius : module_:float -> teeth:int -> float

val center_distance : module_:float -> int -> int -> float
(** Entraxe de deux roues qui engrènent : [m (z1 + z2) / 2]. *)

val spur :
  ?pressure_angle:float -> ?backlash:float -> ?flank_points:int -> module_:float -> teeth:int -> unit ->
  Cad.Profile.t
(** Contour direct centré à l'origine, une dent centrée sur l'axe x.
    [backlash] (mm, défaut 0) est retiré de l'épaisseur au primitif, pour le
    jeu d'impression. [flank_points] : points par flanc (défaut 8).
    Lève [Invalid_argument] si [teeth < 4] ou [module_ <= 0]. *)

val tooth_half_angle : ?pressure_angle:float -> ?backlash:float -> module_:float -> teeth:int -> float -> float
(** Demi-épaisseur angulaire (radians) d'une dent au rayon donné, entre le
    rayon de base et le rayon de tête. Exposé pour les tests. *)
