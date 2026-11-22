type t = { vertices : float array; triangles : int array }

let empty = { vertices = [||]; triangles = [||] }
let n_vertices m = Array.length m.vertices / 3
let n_triangles m = Array.length m.triangles / 3
let vertex m i = Geom.V3.v m.vertices.(3 * i) m.vertices.((3 * i) + 1) m.vertices.((3 * i) + 2)
let triangle m t = (m.triangles.(3 * t), m.triangles.((3 * t) + 1), m.triangles.((3 * t) + 2))

let volume m =
  let acc = ref 0. in
  for t = 0 to n_triangles m - 1 do
    let i, j, k = triangle m t in
    acc := !acc +. Geom.V3.(dot (vertex m i) (cross (vertex m j) (vertex m k)))
  done;
  !acc /. 6.

let bbox m = Geom.Bbox.of_points (List.init (n_vertices m) (vertex m))

let directed_edges m =
  let h = Hashtbl.create (3 * n_triangles m) in
  for t = 0 to n_triangles m - 1 do
    let i, j, k = triangle m t in
    List.iter
      (fun e -> Hashtbl.replace h e (1 + Option.value ~default:0 (Hashtbl.find_opt h e)))
      [ (i, j); (j, k); (k, i) ]
  done;
  h

let is_closed m =
  let h = directed_edges m in
  Hashtbl.fold (fun (i, j) n ok -> ok && n = 1 && Hashtbl.find_opt h (j, i) = Some 1) h true

let euler_characteristic m =
  let h = directed_edges m in
  let undirected = Hashtbl.create (Hashtbl.length h) in
  Hashtbl.iter (fun (i, j) _ -> Hashtbl.replace undirected (min i j, max i j) ()) h;
  n_vertices m - Hashtbl.length undirected + n_triangles m
