(* Lance une propriété QCheck dans un test d'expectation : n'imprime rien si elle tient. *)
let check ?(count = 200) name gen prop =
  let t = QCheck2.Test.make ~count ~name gen prop in
  match QCheck2.Test.check_exn t with
  | () -> ()
  | exception e -> Printf.printf "ÉCHEC %s : %s\n" name (Printexc.to_string e)

let float_mm = QCheck2.Gen.float_range (-1000.) 1000.
let angle = QCheck2.Gen.float_range (-720.) 720.
let v3 = QCheck2.Gen.map3 Geom.V3.v float_mm float_mm float_mm
