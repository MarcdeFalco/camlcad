(** Point de rendez-vous entre le code utilisateur (évalué par le toplevel)
    et le worker : le worker ajoute [let () = Cad_web_hook.set model] après
    le source de l'utilisateur, ce qui vérifie aussi le type de [model]. *)

val set : Cad.Shape.t Cad.Doc.t -> unit
val get : unit -> Cad.Shape.t Cad.Doc.t option
val clear : unit -> unit
