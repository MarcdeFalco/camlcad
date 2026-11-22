(** Position d'un fragment dans le source utilisateur. Sert d'ancre entre
    l'arbre de features et le code (voir le ppx [let%feat], phase 2). *)

type t = { file : string; line : int; start_col : int; end_col : int }
(** Convention de [__POS__] : [line] est la ligne de début (à partir de 1),
    [start_col] et [end_col] sont des décalages en octets depuis le début de
    cette ligne. Pour un fragment sur plusieurs lignes, [end_col] dépasse donc
    la longueur de la ligne : [début de ligne + end_col] reste l'offset exact
    de la fin dans le fichier, ce qui suffit pour réécrire le fragment. *)

val none : t
(** Position inconnue (feature créée sans ppx). *)

val of_pos : string * int * int * int -> t
(** Depuis [__POS__] : [(fichier, ligne, colonne début, colonne fin)]. *)

val pp : Format.formatter -> t -> unit

val equal : t -> t -> bool
