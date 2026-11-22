(** Position d'un fragment dans le source utilisateur. Sert d'ancre entre
    l'arbre de features et le code (voir le ppx [let%feat], phase 2). *)

type t = { file : string; line : int; start_col : int; end_col : int }

val none : t
(** Position inconnue (feature créée sans ppx). *)

val of_pos : string * int * int * int -> t
(** Depuis [__POS__] : [(fichier, ligne, colonne début, colonne fin)]. *)

val pp : Format.formatter -> t -> unit
