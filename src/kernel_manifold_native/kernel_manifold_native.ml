type raw
type section

(* Le solide vide est représenté côté OCaml (comme Kernel_manifold_js) : le
   module se charge sans appel à Manifold, même s'il est absent. *)
type solid = Empty | M of raw

external available : unit -> bool = "cc_available"
external cs_of_contours : float array array -> section = "cc_cs_of_contours"
external section_union : section -> section -> section = "cc_cs_union"
external section_difference : section -> section -> section = "cc_cs_difference"
external section_intersection : section -> section -> section = "cc_cs_intersection"
external cs_offset : section -> float -> section = "cc_cs_offset"
external section_area : section -> float = "cc_cs_area"
external cube_ : float -> float -> float -> raw = "cc_cube"
external cylinder_ : float -> float -> int -> raw = "cc_cylinder"
external sphere_ : float -> int -> raw = "cc_sphere"
external extrude_ : section -> float -> int -> float -> float -> raw = "cc_extrude"
external revolve_ : section -> int -> float -> raw = "cc_revolve"
external union_ : raw -> raw -> raw = "cc_union"
external difference_ : raw -> raw -> raw = "cc_difference"
external intersection_ : raw -> raw -> raw = "cc_intersection"
external transform_ : raw -> float array -> raw = "cc_transform"
external mirror_ : raw -> float -> float -> float -> raw = "cc_mirror"
external is_empty_ : raw -> bool = "cc_is_empty"
external volume_ : raw -> float = "cc_volume"
external genus_ : raw -> int = "cc_genus"
external bbox_ : raw -> float array = "cc_bbox"
external mesh_ : raw -> float array * int array = "cc_mesh"

let name = "manifold-native"

let section_of_contours cs =
  cs_of_contours
    (Array.of_list
       (List.map (fun ps -> Array.of_list (List.concat_map (fun (p : Geom.V2.t) -> [ p.x; p.y ]) ps)) cs))

let section_offset ~delta s = cs_offset s delta
let empty = Empty
let cube ~(size : Geom.V3.t) = M (cube_ size.x size.y size.z)
let cylinder ~r ~h ~segments = M (cylinder_ h r segments)
let sphere ~r ~segments = M (sphere_ r segments)

(* Mêmes choix que Kernel_manifold_js, pour des résultats identiques. *)
let extrude s ~h ~twist ~scale_top =
  let divisions = if twist = 0. then 0 else int_of_float (Float.ceil (Float.abs twist /. 5.)) in
  M (extrude_ s h divisions twist scale_top)

let revolve s ~deg ~segments =
  let per_turn = max 3 (int_of_float (Float.ceil (float segments *. 360. /. Float.abs deg))) in
  M (revolve_ s per_turn deg)

let union a b = match (a, b) with Empty, s | s, Empty -> s | M x, M y -> M (union_ x y)
let difference a b = match (a, b) with Empty, _ -> Empty | s, Empty -> s | M x, M y -> M (difference_ x y)

let intersection a b =
  match (a, b) with Empty, _ | _, Empty -> Empty | M x, M y -> M (intersection_ x y)

let transform f = function Empty -> Empty | M x -> M (transform_ x (Geom.Frame.to_matrix f))

let mirror ~(normal : Geom.V3.t) = function
  | Empty -> Empty
  | M x -> M (mirror_ x normal.x normal.y normal.z)

let is_empty = function Empty -> true | M x -> is_empty_ x
let volume = function Empty -> 0. | M x -> volume_ x
let genus = function Empty -> 0 | M x -> genus_ x

let bbox = function
  | Empty -> Geom.Bbox.empty
  | M x when is_empty_ x -> Geom.Bbox.empty
  | M x ->
      let b = bbox_ x in
      { Geom.Bbox.min = Geom.V3.v b.(0) b.(1) b.(2); max = Geom.V3.v b.(3) b.(4) b.(5) }

let to_mesh = function
  | Empty -> Cad.Mesh.empty
  | M x ->
      let vertices, triangles = mesh_ x in
      { Cad.Mesh.vertices; triangles }
