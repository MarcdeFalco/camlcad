(** Réécritures du source d'un modèle demandées par l'éditeur (frise des
    features, panneau « Modifier »).

    Le code reste la seule source de vérité : chaque action de l'interface
    devient un patch de texte, ancré par la position [Loc.t] qu'une feature
    porte dans le journal (la liaison [let%feat x = e], attributs compris,
    sans le [in] ; voir [Ppx_cad]). L'analyse est lexicale (commentaires
    imbriqués, chaînes, caractères, nombres, identifiants), sans arbre de
    syntaxe : ce qui ne peut pas se réécrire sûrement est refusé, avec un
    message en français qui dit quoi faire à la main.

    Les positions sont des offsets en octets dans le source. Pur, sans
    exception : chaque réécriture rend le nouveau source ou un message. *)

type range = { start : int; stop : int }
(** [[start, stop)]. *)

val range_of_loc : string -> Loc.t -> range option
(** Plage d'une position du journal dans [src] ; [None] pour [Loc.none] ou une
    position qui ne tombe pas dans le texte (source modifié depuis). *)

type literal = {
  range : range;  (** signe moins compris : [-90.] dans [(-90.)] *)
  value : float;
  int : bool;  (** littéral entier ([~dents:20]) *)
  label : string option;  (** ["~r"] pour [~r:2.] ou [~deg:(-90.)] *)
  before : string;  (** contexte sur la même ligne, au plus ~24 octets, *)
  after : string;  (** coupé sur une frontière UTF-8 *)
}

val literals : string -> Loc.t -> literal list
(** Littéraux numériques de la liaison, dans l'ordre du texte (hors
    commentaires, chaînes et attributs). Vide si la position est invalide. *)

val float_literal : float -> string
(** Écriture OCaml la plus courte qui relit exactement [x] :
    [12.], [0.5], [1e-07], [-3.]. *)

val set_literal : string -> Loc.t -> int -> float -> (string, string) result
(** [set_literal src loc i v] remplace le [i]-ième littéral de la liaison par
    [v] (arrondi s'il est entier ; parenthésé s'il est négatif et ne l'était
    pas). *)

val promote : string -> Loc.t -> int -> name:string -> (string, string) result
(** Transforme le [i]-ième littéral en paramètre : insère
    [let%param name = v [@range lo, hi] [@unit "mm"] in] juste avant la
    liaison (même indentation) et remplace le littéral par [name]
    ([(Float.to_int name)] pour un entier). Bornes : [[0, 2v]] (ou [[2v, 0]],
    [[-10, 10]] pour zéro) ; unité ["°"] après [~deg], ["mm"] sinon, aucune
    pour un entier. Refusé si [name] n'est pas un identifiant libre du source
    ou si la liaison est un [and]. *)

val use_param : string -> Loc.t -> int -> name:string -> (string, string) result
(** Lie le [i]-ième littéral à un paramètre existant : le remplace par [name]
    ([(Float.to_int name)] pour un entier). Refusé si aucun
    [let%param name] ne précède la liaison. *)

val set_suppressed : string -> Loc.t -> bool -> (string, string) result
(** Ajoute [ [@@suppress]] à la fin de la liaison, ou l'en retire.
    Idempotent. *)

val rename : string -> Loc.t -> string -> (string, string) result
(** Renomme la variable liée et ses usages qui suivent (jusqu'à ce qu'elle
    soit masquée par une nouvelle liaison de même nom, ou jusqu'au prochain
    [let] en colonne 0). [~x] devient [~x:nouveau]. Refusé si le nouveau nom
    n'est pas un identifiant en minuscule, est un mot-clé, ou apparaît déjà
    dans le source (pas de capture possible). *)

val delete : string -> Loc.t -> (string, string) result
(** Supprime la liaison [let%feat x = e in] (lignes entières quand elle est
    seule sur ses lignes) et retire [x] des combinaisons qui l'utilisent :
    [a + x] et [a - x] deviennent [a], [x + b] devient [b]. Tout autre usage
    (base d'une différence [x - b], intersection, argument de fonction,
    [Doc.return x]…) est refusé avec sa ligne : il faut alors modifier le
    code, ou supprimer temporairement. Refusé aussi pour une liaison [and]. *)
