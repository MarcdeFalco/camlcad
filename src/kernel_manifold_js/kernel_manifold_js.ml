open Js_of_ocaml

type any = Js.Unsafe.any

(* Le solide vide est représenté côté OCaml : aucun appel WASM au chargement. *)
type solid = Empty | M of any
type section = any

let name = "manifold-3d"
let ready () = Js.Optdef.test (Js.Unsafe.get Js.Unsafe.global "__manifold")

let wasm () =
  if not (ready ()) then failwith "Kernel_manifold_js : globalThis.__manifold absent";
  Js.Unsafe.get Js.Unsafe.global "__manifold"

let manifold () = Js.Unsafe.get (wasm ()) "Manifold"
let cross_section () = Js.Unsafe.get (wasm ()) "CrossSection"
let num x = Js.Unsafe.inject (Js.number_of_float x)
let int n = Js.Unsafe.inject (Js.number_of_float (float n))
let str s = Js.Unsafe.inject (Js.string s)
let bool b = Js.Unsafe.inject (Js.bool b)
let arr l = Js.Unsafe.inject (Js.array (Array.of_list l))
let vec3 (v : Geom.V3.t) = arr [ num v.x; num v.y; num v.z ]
let call o m args = Js.Unsafe.meth_call o m (Array.of_list args)
let to_float x = Js.float_of_number (Js.Unsafe.coerce x)

(* Sections 2D *)
let section_of_contours cs =
  let contour ps = arr (List.map (fun (p : Geom.V2.t) -> arr [ num p.x; num p.y ]) ps) in
  call (cross_section ()) "ofPolygons" [ arr (List.map contour cs); str "Positive" ]

let section_union a b = call a "add" [ Js.Unsafe.inject b ]
let section_difference a b = call a "subtract" [ Js.Unsafe.inject b ]
let section_intersection a b = call a "intersect" [ Js.Unsafe.inject b ]
let section_offset ~delta s = call s "offset" [ num delta; str "Round" ]
let section_area s = to_float (call s "area" [])

(* Solides *)
let empty = Empty
let m x = M x
let cube ~size = m (call (manifold ()) "cube" [ vec3 size; bool false ])

let cylinder ~r ~h ~segments =
  m (call (manifold ()) "cylinder" [ num h; num r; num r; int segments; bool false ])

let sphere ~r ~segments = m (call (manifold ()) "sphere" [ num r; int segments ])

let extrude s ~h ~twist ~scale_top =
  let divisions = if twist = 0. then 0 else int_of_float (Float.ceil (Float.abs twist /. 5.)) in
  (* scaleTop en nombre est mal interprété par manifold-3d 3.2.1 (volume divisé par 2) :
     on passe toujours le couple [s, s]. *)
  m
    (call (manifold ())
       "extrude" [ Js.Unsafe.inject s; num h; int divisions; num twist; arr [ num scale_top; num scale_top ] ])

let revolve s ~deg ~segments =
  (* manifold-3d compte les segments sur 360° ; [Eval] les donne au prorata de [deg]. *)
  let per_turn = max 3 (int_of_float (Float.ceil (float segments *. 360. /. Float.abs deg))) in
  m (call (manifold ()) "revolve" [ Js.Unsafe.inject s; int per_turn; num deg ])

let binop name a b =
  match (a, b) with M x, M y -> M (call x name [ Js.Unsafe.inject y ]) | _ -> assert false

let union a b = match (a, b) with Empty, s | s, Empty -> s | _ -> binop "add" a b
let difference a b = match (a, b) with Empty, _ -> Empty | s, Empty -> s | _ -> binop "subtract" a b

let intersection a b =
  match (a, b) with Empty, _ | _, Empty -> Empty | _ -> binop "intersect" a b

let transform f = function
  | Empty -> Empty
  | M x ->
      let mat = Geom.Frame.to_matrix f |> Array.to_list |> List.map num in
      M (call x "transform" [ arr mat ])

let mirror ~normal = function Empty -> Empty | M x -> M (call x "mirror" [ vec3 normal ])
let scale f = function Empty -> Empty | M x -> M (call x "scale" [ vec3 f ])
let is_empty = function Empty -> true | M x -> Js.to_bool (call x "isEmpty" [])
let volume = function Empty -> 0. | M x -> to_float (call x "volume" [])

let bbox = function
  | Empty -> Geom.Bbox.empty
  | M x ->
      let b = call x "boundingBox" [] in
      let v k =
        let a = Js.Unsafe.get b k in
        Geom.V3.v (to_float (Js.Unsafe.get a 0)) (to_float (Js.Unsafe.get a 1)) (to_float (Js.Unsafe.get a 2))
      in
      if is_empty (M x) then Geom.Bbox.empty else { Geom.Bbox.min = v "min"; max = v "max" }

let genus = function Empty -> 0 | M x -> int_of_float (to_float (call x "genus" []))

let to_mesh = function
  | Empty -> Cad.Mesh.empty
  | M x ->
      let g = call x "getMesh" [] in
      let np = int_of_float (to_float (Js.Unsafe.get g "numProp")) in
      let vp = Js.Unsafe.get g "vertProperties" and tv = Js.Unsafe.get g "triVerts" in
      let len a = int_of_float (to_float (Js.Unsafe.get a "length")) in
      let nv = len vp / np in
      let vertices = Array.init (3 * nv) (fun i -> to_float (Js.Unsafe.get vp ((i / 3 * np) + (i mod 3)))) in
      let triangles = Array.init (len tv) (fun i -> int_of_float (to_float (Js.Unsafe.get tv i))) in
      { Cad.Mesh.vertices; triangles }
