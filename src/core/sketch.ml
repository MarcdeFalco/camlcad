type coord = Var of int | Const of float
type point = { id : int; x : coord; y : coord }
type line = { a : point; b : point }
type circle = { c : point; r : coord }

(* Une contrainte : liste de résidus évalués sur le vecteur des inconnues. *)
type constr = float array -> float list

type state = {
  vars_rev : float list;
  nvars : int;
  points_rev : point list;
  circles_rev : circle list;
  constrs_rev : constr list;
}
type 'a t = state -> 'a * state

let return x s = (x, s)
let bind m f s = let x, s = m s in f x s
let map f m = bind m (fun x -> return (f x))

module Syntax = struct
  let ( let* ) = bind
  let ( let+ ) m f = map f m
  let ( and* ) a b = bind a (fun x -> bind b (fun y -> return (x, y)))
  let ( and+ ) = ( and* )
end

let new_var v s = (Var s.nvars, { s with vars_rev = v :: s.vars_rev; nvars = s.nvars + 1 })

let point ?(fixed = false) x y s =
  let x, s = if fixed then (Const x, s) else new_var x s in
  let y, s = if fixed then (Const y, s) else new_var y s in
  let p = { id = List.length s.points_rev; x; y } in
  (p, { s with points_rev = p :: s.points_rev })

let line a b s = ({ a; b }, s)

let circle ?(fixed_radius = false) c r s =
  let r, s = if fixed_radius then (Const r, s) else new_var r s in
  let k = { c; r } in
  (k, { s with circles_rev = k :: s.circles_rev })

type arc = { ac : point; as_ : point; ae : point }

let start_ l = l.a
let end_ l = l.b
let center c = c.c
let constrain cs s = ((), { s with constrs_rev = List.rev_append cs s.constrs_rev })

(* Évaluation *)
let get v = function Var i -> v.(i) | Const x -> x
let px v p = get v p.x
let py v p = get v p.y
let dx v l = px v l.b -. px v l.a
let dy v l = py v l.b -. py v l.a
let len v l = Float.hypot (dx v l) (dy v l)
let safe x = if x < 1e-12 then 1e-12 else x
let rad d = d *. Float.pi /. 180.

let fix p x y v = [ px v p -. x; py v p -. y ]
let coincident p q v = [ px v p -. px v q; py v p -. py v q ]
let horizontal l v = [ dy v l ]
let vertical l v = [ dx v l ]
let distance p q d v = [ Float.hypot (px v q -. px v p) (py v q -. py v p) -. d ]
let length l d v = [ len v l -. d ]
let equal_length l m v = [ len v l -. len v m ]
let cross v l m = (dx v l *. dy v m) -. (dy v l *. dx v m)
let dot v l m = (dx v l *. dx v m) +. (dy v l *. dy v m)
let parallel l m v = [ cross v l m /. safe (len v l *. len v m) ]
let perpendicular l m v = [ dot v l m /. safe (len v l *. len v m) ]

let angle l m deg v =
  let d = Float.atan2 (cross v l m) (dot v l m) -. rad deg in
  [ Float.atan2 (sin d) (cos d) ]

let on_line p l v =
  [ ((dx v l *. (py v p -. py v l.a)) -. (dy v l *. (px v p -. px v l.a))) /. safe (len v l) ]

let midpoint p l v =
  [ px v p -. ((px v l.a +. px v l.b) /. 2.); py v p -. ((py v l.a +. py v l.b) /. 2.) ]

let radius c r v = [ get v c.r -. r ]
let equal_radius c d v = [ get v c.r -. get v d.r ]
let on_circle p c v = [ Float.hypot (px v p -. px v c.c) (py v p -. py v c.c) -. get v c.r ]

let tangent l c v =
  match on_line c.c l v with [ d ] -> [ Float.abs d -. get v c.r ] | _ -> assert false

let concentric c d = coincident c.c d.c
let arc_r v a = Float.hypot (px v a.as_ -. px v a.ac) (py v a.as_ -. py v a.ac)

let arc c a b s =
  let same_r v = [ Float.hypot (px v b -. px v c) (py v b -. py v c) -. Float.hypot (px v a -. px v c) (py v a -. py v c) ] in
  ({ ac = c; as_ = a; ae = b }, { s with constrs_rev = same_r :: s.constrs_rev })

let arc_center a = a.ac
let arc_start a = a.as_
let arc_end a = a.ae
let arc_radius a r v = [ arc_r v a -. r ]

(* Si la ligne s'arrête à une extrémité de l'arc, la tangence s'écrit en ce point (rayon
   perpendiculaire à la ligne) : la forme « distance = rayon » y a un gradient nul. *)
let tangent_arc l a v =
  match List.find_opt (fun p -> p.id = l.a.id || p.id = l.b.id) [ a.as_; a.ae ] with
  | Some p -> [ (((px v a.ac -. px v p) *. dx v l) +. ((py v a.ac -. py v p) *. dy v l)) /. safe (len v l) ]
  | None -> ( match on_line a.ac l v with [ d ] -> [ Float.abs d -. arc_r v a ] | _ -> assert false)
let symmetric p q l v =
  let mx = (px v p +. px v q) /. 2. and my = (py v p +. py v q) /. 2. in
  [ ((dx v l *. (my -. py v l.a)) -. (dy v l *. (mx -. px v l.a))) /. safe (len v l);
    (((px v q -. px v p) *. dx v l) +. ((py v q -. py v p) *. dy v l)) /. safe (len v l) ]

let hdistance p q d v = [ px v q -. px v p -. d ]
let vdistance p q d v = [ py v q -. py v p -. d ]

(* Régions *)
type edge = Pt of point | Along of arc | Back of arc
type region = Path of edge list | Disk of circle | Union of region * region | Diff of region * region

let pt p = Pt p
let along a = Along a
let back a = Back a
let path es = Path es
let loop ps = Path (List.map pt ps)

(* Sommets d'un contour : un arc devient des points de son début à sa fin (sens trigonométrique). *)
let vertices v es =
  let p2 p = Geom.V2.v (px v p) (py v p) in
  let rec expand = function
    | Pt p -> [ p2 p ]
    | Back a -> List.rev (expand (Along a))
    | Along a ->
        let cx = px v a.ac and cy = py v a.ac and r = arc_r v a in
        let t0 = Float.atan2 (py v a.as_ -. cy) (px v a.as_ -. cx) in
        let t1 = Float.atan2 (py v a.ae -. cy) (px v a.ae -. cx) in
        let sweep = let d = t1 -. t0 in if d <= 1e-9 then d +. (2. *. Float.pi) else d in
        let n = max 2 (int_of_float (Float.ceil (sweep /. rad 5.))) in
        List.init (n + 1) (fun k ->
            let t = t0 +. (sweep *. float_of_int k /. float_of_int n) in
            Geom.V2.v (cx +. (r *. cos t)) (cy +. (r *. sin t)))
  in
  let close (a : Geom.V2.t) (b : Geom.V2.t) = Float.abs (a.x -. b.x) < 1e-9 && Float.abs (a.y -. b.y) < 1e-9 in
  let rec dedup = function a :: (b :: _ as r) when close a b -> dedup r | a :: r -> a :: dedup r | [] -> [] in
  match dedup (List.concat_map expand es) with
  | first :: _ as l when List.length l > 1 && close first (List.nth l (List.length l - 1)) -> List.rev (List.tl (List.rev l))
  | l -> l
let disk c = Disk c
let ( + ) a b = Union (a, b)
let ( - ) a b = Diff (a, b)

let rec profile v = function
  | Path es ->
      let pts = vertices v es in
      let area =
        match pts with
        | [] -> 0.
        | p0 :: _ ->
            let rec go acc = function
              | a :: (b :: _ as rest) -> go (acc +. Geom.V2.cross a b) rest
              | [ a ] -> acc +. Geom.V2.cross a p0
              | [] -> acc
            in
            go 0. pts
      in
      Profile.polygon (if area < 0. then List.rev pts else pts)
  | Disk c -> Profile.translate (Geom.V2.v (px v c.c) (py v c.c)) (Profile.circle ~r:(get v c.r))
  | Union (a, b) -> Profile.union (profile v a) (profile v b)
  | Diff (a, b) -> Profile.difference (profile v a) (profile v b)

type solved = {
  profile : Profile.t;
  dof : int;
  redundant : int;
  points : Geom.V2.t array;
  radii : float array;
}

let pos s p = s.points.(p.id)

let solve (m : region t) =
  let region, st = m { vars_rev = []; nvars = 0; points_rev = []; circles_rev = []; constrs_rev = [] } in
  let x0 = Array.of_list (List.rev st.vars_rev) in
  let cs = List.rev st.constrs_rev in
  let f v = Array.of_list (List.concat_map (fun c -> c v) cs) in
  let neq = Array.length (f x0) in
  let x, rep = Nlsolve.solve ~n:st.nvars ~m:neq f x0 in
  if not rep.converged then
    Error
      (Printf.sprintf "esquisse : contraintes incompatibles (résidu %.3g après %d itérations)" rep.residual
         rep.iterations)
  else
    let points = Array.of_list (List.rev_map (fun p -> Geom.V2.v (px x p) (py x p)) st.points_rev) in
    let radii = Array.of_list (List.rev_map (fun c -> get x c.r) st.circles_rev) in
    Ok { profile = profile x region; dof = Int.sub st.nvars rep.rank; redundant = Int.sub neq rep.rank; points; radii }

let to_doc ?loc m = match solve m with Ok s -> Doc.return s.profile | Error e -> Doc.fail ?loc e
