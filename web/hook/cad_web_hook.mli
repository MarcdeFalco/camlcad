(** Point de rendez-vous entre le code utilisateur (évalué par le toplevel)
    et le worker : le worker ajoute [let () = Cad_web_hook.set model] après
    le source de l'utilisateur (ou [set_mech model] si le premier ne type
    pas), ce qui vérifie aussi le type de [model]. *)

type model = Solid of Cad.Shape.t Cad.Doc.t | Mech of Cad_mech.Assembly.t Cad.Doc.t

val set : Cad.Shape.t Cad.Doc.t -> unit
val set_mech : Cad_mech.Assembly.t Cad.Doc.t -> unit
val get : unit -> model option
val clear : unit -> unit
