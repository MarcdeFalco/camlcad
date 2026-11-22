type t = { id : int; v : view }

and view =
  | Empty
  | Cube of { size : Geom.V3.t; center : bool }
  | Cylinder of { r : float; h : float; center : bool }
  | Sphere of float
  | Extrude of { profile : Profile.t; h : float; twist : float; scale_top : float }
  | Revolve of { profile : Profile.t; deg : float }
  | Union of t * t
  | Difference of t * t
  | Intersection of t * t
  | Place of Geom.Frame.t * t
  | Mirror of Geom.V3.t * t

type key =
  | KEmpty
  | KCube of Geom.V3.t * bool
  | KCylinder of float * float * bool
  | KSphere of float
  | KExtrude of int * float * float * float
  | KRevolve of int * float
  | KUnion of int * int
  | KDifference of int * int
  | KIntersection of int * int
  | KPlace of Geom.Frame.t * int
  | KMirror of Geom.V3.t * int

let key = function
  | Empty -> KEmpty
  | Cube { size; center } -> KCube (size, center)
  | Cylinder { r; h; center } -> KCylinder (r, h, center)
  | Sphere r -> KSphere r
  | Extrude { profile; h; twist; scale_top } -> KExtrude (Profile.id profile, h, twist, scale_top)
  | Revolve { profile; deg } -> KRevolve (Profile.id profile, deg)
  | Union (a, b) -> KUnion (a.id, b.id)
  | Difference (a, b) -> KDifference (a.id, b.id)
  | Intersection (a, b) -> KIntersection (a.id, b.id)
  | Place (f, a) -> KPlace (f, a.id)
  | Mirror (n, a) -> KMirror (n, a.id)

let empty = { id = 0; v = Empty }
let table : (key, t) Hashtbl.t = Hashtbl.create 256
let () = Hashtbl.add table KEmpty empty
let counter = ref 0

let mk v =
  let k = key v in
  match Hashtbl.find_opt table k with
  | Some s -> s
  | None ->
      incr counter;
      let s = { id = !counter; v } in
      Hashtbl.add table k s;
      s

let cube ?(center = false) size = mk (Cube { size; center })
let cylinder ?(center = false) ~r ~h () = mk (Cylinder { r; h; center })
let sphere ~r = mk (Sphere r)

let extrude ?(twist = 0.) ?(scale_top = 1.) ~h profile =
  mk (Extrude { profile; h; twist; scale_top })

let revolve ?(deg = 360.) profile = mk (Revolve { profile; deg })
let ( + ) a b = mk (Union (a, b))
let ( - ) a b = mk (Difference (a, b))
let ( * ) a b = mk (Intersection (a, b))

let union = function
  | [] -> empty
  | s :: rest -> List.fold_left ( + ) s rest

let place f s = mk (Place (f, s))
let on = place
let translate d s = place (Geom.Frame.translate d Geom.Frame.world) s
let rotate ~axis ~deg s = place (Geom.Frame.rotate ~axis ~deg Geom.Frame.world) s
let mirror ~normal s = mk (Mirror (Geom.V3.normalize normal, s))
let id s = s.id
let equal a b = a.id = b.id

let subterms s =
  let seen = Hashtbl.create 16 in
  let rec go s =
    if not (Hashtbl.mem seen s.id) then begin
      Hashtbl.add seen s.id ();
      match s.v with
      | Union (a, b) | Difference (a, b) | Intersection (a, b) -> go a; go b
      | Place (_, a) | Mirror (_, a) -> go a
      | Empty | Cube _ | Cylinder _ | Sphere _ | Extrude _ | Revolve _ -> ()
    end
  in
  go s;
  Hashtbl.fold (fun id () acc -> id :: acc) seen [] |> List.sort compare

let view s = s.v
