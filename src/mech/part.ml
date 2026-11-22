type t = { name : string; shape : Cad.Shape.t; ports : (string * Geom.Frame.t) list; color : (int * int * int) option }

let make ?color ?(ports = []) name shape =
  let rec dup = function
    | [] -> ()
    | (n, _) :: rest -> if List.mem_assoc n rest then invalid_arg ("Part.make : port en double " ^ n) else dup rest
  in
  dup ports;
  { name; shape; ports; color }

let port p n =
  match List.assoc_opt n p.ports with
  | Some f -> f
  | None -> invalid_arg (Printf.sprintf "Part.port : %s n'a pas de port %s" p.name n)

let ( @: ) p n = ignore (port p n); (p, n)
