(** Sérialisation JSON du journal d'un document : c'est l'arbre de features
    que l'éditeur affiche. Sans dépendance externe.

    Format (clés dans cet ordre, sortie déterministe) :
    {v
    { "ok": true,
      "params":   [ {"name","default","value","range":[lo,hi]|null,"unit":s|null,"loc"} ],
      "features": [ {"id","name","loc","deps":[ids],"shape":id,"op","suppressed":bool} ] }
    { "ok": false, "error": {"message","loc"}, "params": [...], "features": [...] }
    v}
    où ["loc"] vaut [{"file","line","start_col","end_col"}] ou [null] pour
    [Loc.none]. ["shape"] est l'identifiant hash-consé du terme : deux
    features de même forme ont le même. ["op"] est l'opération au sommet de la
    forme, placements ([Shape.place], [translate], [rotate]) traversés :
    ["empty"], ["cube"], ["cylinder"], ["sphere"], ["extrude"], ["revolve"],
    ["union"], ["difference"], ["intersection"] ou ["mirror"] ; l'éditeur en
    tire l'icône de la frise. Les flottants s'écrivent avec [%.17g]
    (aller-retour exact), sans [nan] ni [inf] (écrits [null]). *)

val of_journal : Doc.journal -> string
(** Objet ["ok": true]. *)

val of_result : ('a * Doc.journal, Doc.error) result -> string

val escape : string -> string
(** Chaîne JSON entre guillemets, échappée (UTF-8 laissé tel quel). *)
