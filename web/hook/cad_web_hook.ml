type model = Solid of Cad.Shape.t Cad.Doc.t | Mech of Cad_mech.Assembly.t Cad.Doc.t

let model = ref None
let set m = model := Some (Solid m)
let set_mech m = model := Some (Mech m)
let get () = !model
let clear () = model := None
