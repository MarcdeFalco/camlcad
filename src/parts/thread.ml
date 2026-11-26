open Cad

let table =
  [ (2., 0.4); (2.5, 0.45); (3., 0.5); (4., 0.7); (5., 0.8); (6., 1.); (8., 1.25); (10., 1.5);
    (12., 1.75); (14., 2.); (16., 2.); (20., 2.5); (24., 3.) ]

let pitch d =
  match List.find_opt (fun (k, _) -> Float.abs (k -. d) < 1e-9) table with
  | Some (_, p) -> p
  | None -> invalid_arg (Printf.sprintf "Thread.pitch : pas de pas ISO pour M%g" d)

let section ?(segments = 36) ~d ~pitch () =
  let r_out = d /. 2. and depth = 0.6134 *. pitch in
  let r_in = r_out -. depth in
  (* Rayon triangulaire en fonction de l'angle : un sommet (r_out) et un creux (r_in) par tour. *)
  Profile.polygon
    (List.init segments (fun k ->
         let u = float_of_int k /. float_of_int segments in
         let tri = 1. -. Float.abs ((2. *. u) -. 1.) in
         let r = r_in +. ((r_out -. r_in) *. tri) and t = 2. *. Float.pi *. u in
         Geom.V2.v (r *. cos t) (r *. sin t)))

let check ~d ~pitch ~h = if d <= 0. || pitch <= 0. || h <= 0. then invalid_arg "Thread : dimension négative ou nulle"

let rod ?segments ~d ~pitch ~h () =
  check ~d ~pitch ~h;
  Shape.extrude ~twist:(360. *. h /. pitch) ~h (section ?segments ~d ~pitch ())

let tap ?(clearance = 0.15) ?segments ~d ~pitch ~h () =
  check ~d ~pitch ~h;
  let h' = h +. 0.02 in
  Shape.(extrude ~twist:(360. *. h' /. pitch) ~h:h' (section ?segments ~d:(d +. (2. *. clearance)) ~pitch ())
         |> translate (Geom.V3.v 0. 0. (-0.01)))
