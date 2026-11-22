(** Réécritures du lien code ↔ éditeur (enregistrées auprès de ppxlib).

    {[
      let%param l = 60. [@range 20., 120.] [@unit "mm"] in
      let%feat base = Shape.cube (V3.v l 20. 4.) in
      k
    ]}
    devient
    {[
      Cad.Doc.bind (Cad.Doc.param ~loc:<littéral 60.> ~range:(20., 120.) ~unit_:"mm" "l" 60.)
        (fun l ->
          Cad.Doc.bind (Cad.Doc.feature ~loc:<liaison base = …> ~name:"base" (…))
            (fun base -> k))
    ]}

    - [let%feat] : le motif doit être une variable ; son nom devient celui de la
      feature. [~loc] couvre la liaison entière (motif et expression), pour
      sauter au code et surligner la feature. Un attribut [[@name "…"]] sur
      l'expression (ou [[@@name "…"]] sur la liaison) remplace le nom.
    - [let%param] : [~loc] couvre l'expression de la valeur par défaut, pour que
      l'éditeur puisse la remplacer en validant un curseur. Attributs
      facultatifs sur cette expression : [[@range lo, hi]] et [[@unit "…"]].
    - [let%sketch p = e in k] : [e : Sketch.region Sketch.t] est résolue par
      [Sketch.to_doc ~loc] ; un échec du solveur est localisé sur la liaison.
    - Plusieurs liaisons reliées par [and] sont séquencées dans l'ordre.

    Les positions suivent la convention de [__POS__] (voir [Cad.Loc]). *)

val loc_expr : Ppxlib.location -> Ppxlib.expression
(** L'expression [Cad.Loc.of_pos (file, line, start_col, end_col)] pour [loc].
    Exposé pour les tests. *)
