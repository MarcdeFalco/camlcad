open Geom

type coupling = { driver : string; driven : string; ratio : float }
type pose = (string * float) list

type t = {
  ground : Part.t;
  tree : Joint.t list;  (* ordre BFS depuis ground *)
  loops : Joint.t list;
  couplings : coupling list;
}

let pname ((p : Part.t), _) = p.name

let make ?(loops = []) ?(couplings = []) ~(ground : Part.t) joints =
  List.iter
    (fun (j : Joint.t) ->
      if j.kind = Joint.Prismatic then invalid_arg ("Assembly.make : boucle prismatique non gérée : " ^ j.name))
    loops;
  let children = List.map (fun (j : Joint.t) -> pname j.child) joints in
  let rec dup = function [] -> () | x :: r -> if List.mem x r then invalid_arg ("Assembly.make : " ^ x ^ " a deux parents") else dup r in
  dup children;
  if List.mem ground.name children then invalid_arg "Assembly.make : la pièce fixe ne peut pas être enfant";
  (* BFS *)
  let rec bfs placed acc todo =
    if todo = [] then List.rev acc
    else
      let ready, rest = List.partition (fun (j : Joint.t) -> List.mem (pname j.parent) placed) todo in
      if ready = [] then invalid_arg "Assembly.make : liaisons non reliées à la pièce fixe (ou cycle)";
      bfs (List.map (fun (j : Joint.t) -> pname j.child) ready @ placed) (List.rev_append ready acc) rest
  in
  let tree = bfs [ ground.name ] [] joints in
  let known = ground.name :: children in
  List.iter
    (fun (j : Joint.t) ->
      if not (List.mem (pname j.parent) known && List.mem (pname j.child) known) then
        invalid_arg ("Assembly.make : boucle vers une pièce inconnue : " ^ j.name))
    loops;
  let coords = List.filter_map (fun (j : Joint.t) -> if j.kind = Fixed then None else Some j.name) tree in
  List.iter
    (fun c ->
      if not (List.mem c.driver coords && List.mem c.driven coords) then
        invalid_arg ("Assembly.make : couplage sur une coordonnée inconnue : " ^ c.driver ^ "/" ^ c.driven))
    couplings;
  { ground; tree; loops; couplings }

let parts a = a.ground :: List.map (fun (j : Joint.t) -> fst j.child) a.tree
let joints a = a.tree
let coordinates a = List.filter_map (fun (j : Joint.t) -> if j.kind = Fixed then None else Some j.name) a.tree

let value pose (j : Joint.t) = match List.assoc_opt j.name pose with Some q -> q | None -> j.init

let world_frames a pose =
  List.fold_left
    (fun acc (j : Joint.t) ->
      let (p : Part.t), pp = j.parent and (c : Part.t), cp = j.child in
      let pw = List.assoc p.name acc in
      let cw =
        Frame.compose pw
          (Frame.compose (Part.port p pp) (Frame.compose (Joint.motion j.kind (value pose j)) (Frame.inverse (Part.port c cp))))
      in
      (c.name, cw) :: acc)
    [ (a.ground.name, Frame.world) ]
    a.tree

let placements a pose =
  let w = world_frames a pose in
  List.map (fun (p : Part.t) -> (p, List.assoc p.name w)) (parts a)

let shapes a pose = List.map (fun ((p : Part.t), f) -> (p, Cad.Shape.place f p.shape)) (placements a pose)

let loop_residuals a pose =
  let w = world_frames a pose in
  List.concat_map
    (fun (j : Joint.t) ->
      let port ((p : Part.t), n) = Frame.compose (List.assoc p.name w) (Part.port p n) in
      let fp = port j.parent and fc = port j.child in
      let d = V3.sub (Frame.origin fp) (Frame.origin fc) in
      let v3 (v : V3.t) = [ v.x; v.y; v.z ] in
      match j.kind with
      | Revolute -> v3 d @ v3 (V3.cross (Frame.z_axis fp) (Frame.z_axis fc))
      | Fixed -> v3 d @ v3 (V3.sub (Frame.z_axis fp) (Frame.z_axis fc)) @ v3 (V3.sub (Frame.x_axis fp) (Frame.x_axis fc))
      | Prismatic -> assert false)
    a.loops

let coupling_residuals a pose =
  let get n = List.assoc n pose in
  List.map (fun c -> get c.driven -. (c.ratio *. get c.driver)) a.couplings

let solve ?(from = []) a drivers =
  let coords = coordinates a in
  List.iter (fun (n, _) -> if not (List.mem n coords) then invalid_arg ("Assembly.solve : coordonnée inconnue " ^ n)) drivers;
  let unknowns = List.filter (fun n -> not (List.mem_assoc n drivers)) coords in
  let init n =
    match List.assoc_opt n from with
    | Some q -> q
    | None -> (List.find (fun (j : Joint.t) -> j.name = n) a.tree).init
  in
  let pose_of x = drivers @ List.mapi (fun i n -> (n, x.(i))) unknowns in
  let f x = let p = pose_of x in Array.of_list (loop_residuals a p @ coupling_residuals a p) in
  let x0 = Array.of_list (List.map init unknowns) in
  let m = Array.length (f x0) in
  let x, rep = Cad.Nlsolve.solve ~tol:1e-7 ~n:(List.length unknowns) ~m f x0 in
  if not rep.converged then Error (Printf.sprintf "pose inaccessible (résidu %.3g)" rep.residual)
  else
    let pose = List.map (fun n -> (n, List.assoc n (pose_of x))) coords in
    let out =
      List.find_opt
        (fun (j : Joint.t) ->
          match (j.limits, List.assoc_opt j.name pose) with
          | Some (lo, hi), Some q -> q < lo -. 1e-9 || q > hi +. 1e-9
          | _ -> false)
        a.tree
    in
    match out with
    | Some j -> Error (Printf.sprintf "%s hors butée (%g)" j.name (List.assoc j.name pose))
    | None -> Ok pose

let sweep ?(steps = 36) a ~driver (q0, q1) =
  let rec go i from acc =
    if i > steps then List.rev acc
    else
      let q = q0 +. ((q1 -. q0) *. float i /. float steps) in
      match solve ~from a [ (driver, q) ] with
      | Ok p -> go (i + 1) p (Ok (q, p) :: acc)
      | Error e -> go (i + 1) from (Error (Printf.sprintf "%s = %g : %s" driver q e) :: acc)
  in
  go 0 [] []

let interferences ~volume ?(tol = 1e-3) a pose =
  let rec pairs = function
    | [] -> []
    | ((p : Part.t), s) :: rest ->
        List.filter_map
          (fun ((q : Part.t), t) ->
            let v = volume Cad.Shape.(s * t) in
            if v > tol then Some (p.name, q.name, v) else None)
          rest
        @ pairs rest
  in
  pairs (shapes a pose)
