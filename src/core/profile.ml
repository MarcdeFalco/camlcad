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

(* ---------- Régions ---------- *)

exception Not_simple

let regions p =
  let rec leaves q =
    match q.v with
    | Union (a, b) | Difference (a, b) -> leaves a @ leaves b
    | Polygon (_ :: _) -> [ q ]
    | Circle _ -> [ q ]
    | Translate (_, { v = Circle _; _ }) -> [ q ]
    | _ -> raise Not_simple
  in
  match leaves p with
  | exception Not_simple -> [ p ]
  | ls ->
      let ls = List.fold_left (fun acc q -> if List.exists (equal q) acc then acc else acc @ [ q ]) [] ls in
      let disk q = match q.v with Circle r -> Some (0., 0., r) | Translate (c, { v = Circle r; _ }) -> Some (c.Geom.V2.x, c.Geom.V2.y, r) | _ -> None in
      let probe q =
        match (q.v, disk q) with
        | Polygon (a :: _), _ -> (a.Geom.V2.x, a.Geom.V2.y)
        | _, Some (x, y, r) -> (x +. r, y)
        | _ -> (0., 0.)
      in
      let contains q (x, y) =
        match (q.v, disk q) with
        | Polygon ps, _ ->
            let a = Array.of_list ps and c = ref false in
            let n = Array.length a in
            for i = 0 to n - 1 do
              let pi = a.(i) and pj = a.((i + n - 1) mod n) in
              if pi.Geom.V2.y > y <> (pj.Geom.V2.y > y)
                 && x < ((pj.x -. pi.x) *. (y -. pi.y) /. (pj.y -. pi.y)) +. pi.x
              then c := not !c
            done;
            !c
        | _, Some (cx, cy, r) -> Float.hypot (x -. cx) (y -. cy) < r -. 1e-6
        | _ -> false
      in
      let depth q = List.length (List.filter (fun m -> not (equal m q) && contains m (probe q)) ls) in
      let ds = List.map (fun q -> (depth q, q)) ls |> List.stable_sort (fun (a, _) (b, _) -> compare a b) in
      List.map
        (fun (d, q) ->
          List.fold_left
            (fun acc (d', h) -> if d' = d + 1 && contains q (probe h) then difference acc h else acc)
            q ds)
        ds

let region k p =
  match if k < 0 then None else List.nth_opt (regions p) k with
  | Some r -> r
  | None -> invalid_arg (Printf.sprintf "Profile.region %d : le profil a %d région(s)" k (List.length (regions p)))
