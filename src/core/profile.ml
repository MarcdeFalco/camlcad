type t = { id : int; v : view }

and view =
  | Polygon of Geom.V2.t list
  | Circle of float
  | Union of t * t
  | Difference of t * t
  | Intersection of t * t
  | Offset of float * t
  | Translate of Geom.V2.t * t
  | Rotate of float * t

(* Clé de hash-consing : les fils sont remplacés par leurs identifiants. *)
type key =
  | KPolygon of Geom.V2.t list
  | KCircle of float
  | KUnion of int * int
  | KDifference of int * int
  | KIntersection of int * int
  | KOffset of float * int
  | KTranslate of Geom.V2.t * int
  | KRotate of float * int

let table : (key, t) Hashtbl.t = Hashtbl.create 256
let counter = ref 0

let key = function
  | Polygon ps -> KPolygon ps
  | Circle r -> KCircle r
  | Union (a, b) -> KUnion (a.id, b.id)
  | Difference (a, b) -> KDifference (a.id, b.id)
  | Intersection (a, b) -> KIntersection (a.id, b.id)
  | Offset (d, a) -> KOffset (d, a.id)
  | Translate (v, a) -> KTranslate (v, a.id)
  | Rotate (d, a) -> KRotate (d, a.id)

let mk v =
  let k = key v in
  match Hashtbl.find_opt table k with
  | Some p -> p
  | None ->
      incr counter;
      let p = { id = !counter; v } in
      Hashtbl.add table k p;
      p

let polygon ps = mk (Polygon ps)

let rect ?(center = false) ~w ~h () =
  let x0, y0 = if center then (-.w /. 2., -.h /. 2.) else (0., 0.) in
  Geom.V2.(polygon [ v x0 y0; v (x0 +. w) y0; v (x0 +. w) (y0 +. h); v x0 (y0 +. h) ])

let circle ~r = mk (Circle r)
let union a b = mk (Union (a, b))
let difference a b = mk (Difference (a, b))
let intersection a b = mk (Intersection (a, b))
let offset d a = mk (Offset (d, a))
let translate v a = mk (Translate (v, a))
let rotate ~deg a = mk (Rotate (deg, a))
let id p = p.id
let equal a b = a.id = b.id
let view p = p.v
