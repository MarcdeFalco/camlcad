(** Filetages métriques ISO (profil triangulaire à 60°), pour visser des pièces imprimées.

    Le filet est obtenu en extrudant avec torsion une section perpendiculaire à l'axe : un
    contour dont le rayon varie de façon triangulaire avec l'angle, entre le rayon du noyau
    et le rayon extérieur. Une torsion d'un tour par pas en fait une hélice (filet à droite,
    un seul filet). Axe : z, de 0 à [h]. Unités : mm. *)

val pitch : float -> float
(** Pas gros ISO pour un diamètre nominal (M2 … M24), par exemple [pitch 6. = 1.] ;
    lève [Invalid_argument] pour un diamètre hors de la table. *)

val section : ?segments:int -> d:float -> pitch:float -> unit -> Cad.Profile.t
(** Section à z = 0 : diamètre extérieur [d], profondeur du filet [0.6134 pitch]
    (filetage extérieur ISO). [segments] : points sur le tour (défaut 36 ; la torsion ajoute
    une tranche tous les 5°, soit environ 5 000 triangles par tour). *)

val rod : ?segments:int -> d:float -> pitch:float -> h:float -> unit -> Cad.Shape.t
(** Tige filetée (vis) de hauteur [h]. Lève [Invalid_argument] si [d], [pitch] ou [h] <= 0. *)

val tap : ?clearance:float -> ?segments:int -> d:float -> pitch:float -> h:float -> unit -> Cad.Shape.t
(** Outil de taraudage à retirer d'une pièce (filetage intérieur) : la tige agrandie de
    [clearance] au rayon (défaut 0.15, jeu d'impression), un peu plus haute ([h] + 0.02,
    décalée de 0.01 vers le bas) pour ne pas laisser de peau aux faces d'entrée et de sortie. *)
