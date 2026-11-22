(* Noyau factice : un solide est une chaîne décrivant l'opération.
   Compte les appels pour vérifier la mémoïsation de [Eval]. *)
let calls = ref 0
let tick s = incr calls; s

type solid = string
type section = string

let name = "fake"
let section_of_contours cs = tick (Printf.sprintf "contours(%d)" (List.length cs))
let section_union a b = tick ("U(" ^ a ^ "," ^ b ^ ")")
let section_difference a b = tick ("D(" ^ a ^ "," ^ b ^ ")")
let section_intersection a b = tick ("I(" ^ a ^ "," ^ b ^ ")")
let section_offset ~delta s = tick (Printf.sprintf "off(%g,%s)" delta s)
let section_area _ = 0.
let empty = "empty"
let cube ~size:_ = tick "cube"
let cylinder ~r:_ ~h:_ ~segments:_ = tick "cyl"
let sphere ~r:_ ~segments:_ = tick "sphere"
let extrude s ~h:_ ~twist:_ ~scale_top:_ = tick ("ext(" ^ s ^ ")")
let revolve s ~deg:_ ~segments:_ = tick ("rev(" ^ s ^ ")")
let union a b = tick ("U(" ^ a ^ "," ^ b ^ ")")
let difference a b = tick ("D(" ^ a ^ "," ^ b ^ ")")
let intersection a b = tick ("I(" ^ a ^ "," ^ b ^ ")")
let transform _ s = tick ("T(" ^ s ^ ")")
let mirror ~normal:_ s = tick ("M(" ^ s ^ ")")
let is_empty s = s = "empty"
let volume _ = 0.
let bbox _ = Geom.Bbox.empty
let genus _ = 0
let to_mesh _ = Cad.Mesh.empty
