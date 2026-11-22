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

(* Point le plus proche sur un triangle (Ericson, Real-Time Collision Detection 5.1.5). *)
let closest_on_triangle p a b c =
  let open Geom.V3 in
  let ab = sub b a and ac = sub c a and ap = sub p a in
  let d1 = dot ab ap and d2 = dot ac ap in
  if d1 <= 0. && d2 <= 0. then a
  else
    let bp = sub p b in
    let d3 = dot ab bp and d4 = dot ac bp in
    if d3 >= 0. && d4 <= d3 then b
    else
      let vc = (d1 *. d4) -. (d3 *. d2) in
      if vc <= 0. && d1 >= 0. && d3 <= 0. then add a (scale (d1 /. (d1 -. d3)) ab)
      else
        let cp = sub p c in
        let d5 = dot ab cp and d6 = dot ac cp in
        if d6 >= 0. && d5 <= d6 then c
        else
          let vb = (d5 *. d2) -. (d1 *. d6) in
          if vb <= 0. && d2 >= 0. && d6 <= 0. then add a (scale (d2 /. (d2 -. d6)) ac)
          else
            let va = (d3 *. d6) -. (d5 *. d4) in
            if va <= 0. && d4 -. d3 >= 0. && d5 -. d6 >= 0. then
              add b (scale ((d4 -. d3) /. (d4 -. d3 +. (d5 -. d6))) (sub c b))
            else
              let denom = 1. /. (va +. vb +. vc) in
              add a (add (scale (vb *. denom) ab) (scale (vc *. denom) ac))

let distance m p =
  let best = ref infinity in
  for t = 0 to n_triangles m - 1 do
    let i, j, k = triangle m t in
    let q = closest_on_triangle p (vertex m i) (vertex m j) (vertex m k) in
    best := Float.min !best (Geom.V3.dist p q)
  done;
  !best
