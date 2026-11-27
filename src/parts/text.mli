(** Texte (Black Book ch. 2, Text ; ch. 3, Emboss) en police à traits, pour marquer une
    pièce imprimée : chaque trait est un rectangle d'épaisseur [stroke] à bouts carrés, le
    texte est leur union. Majuscules A-Z, chiffres, espace, [- . : / + = ?] ; minuscules
    et lettres accentuées (é, à, ç…) prises en majuscules sans accent, autres caractères :
    [?]. Une lettre occupe 4 × 6 unités, avance de 5 ; l'unité vaut [size / 6] mm. *)

val strokes : string -> Geom.V2.t list list
(** Traits du texte en unités de la grille (ligne brisée ; un seul point : un point carré),
    lettre i décalée de [5 i] en x, ligne de base en y = 0. *)

val width : size:float -> string -> float
(** Largeur du texte (mm), hors épaisseur de trait : [(5 n - 1) × size / 6] pour n
    caractères (0 si vide). *)

val profile : ?center:bool -> ?stroke:float -> size:float -> string -> Cad.Profile.t
(** Profil du texte de hauteur de capitale [size] (mm), trait [stroke] (défaut [size / 7]).
    Coin bas gauche en l'origine, ou centré si [center]. Lève [Invalid_argument] si
    [size <= 0] ou [stroke <= 0]. Texte vide : profil vide. *)
