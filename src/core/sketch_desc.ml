type constr = { kind : string; refs : int list; value : float option }
type item = P of int | A of int | Rev of int

type t = {
  points : (float * float * bool) array;
  lines : (int * int) array;
  circles : (int * float) array;
  arcs : (int * int * int) array;
  constraints : constr list;
  loops : item list list;
}

(* Signature d'une contrainte : sortes des références et présence d'une valeur. *)
type sort = Sp | Sl | Sc | Sa

let signature = function
  | "horizontal" | "vertical" -> Some ([ Sl ], false)
  | "length" -> Some ([ Sl ], true)
  | "parallel" | "perpendicular" | "equal_length" -> Some ([ Sl; Sl ], false)
  | "angle" -> Some ([ Sl; Sl ], true)
  | "coincident" -> Some ([ Sp; Sp ], false)
  | "distance" | "hdistance" | "vdistance" -> Some ([ Sp; Sp ], true)
  | "radius" -> Some ([ Sc ], true)
  | "equal_radius" | "concentric" -> Some ([ Sc; Sc ], false)
  | "tangent" -> Some ([ Sl; Sc ], false)
  | "on_line" | "midpoint" -> Some ([ Sp; Sl ], false)
  | "on_circle" -> Some ([ Sp; Sc ], false)
  | "arc_radius" -> Some ([ Sa ], true)
  | "symmetric" -> Some ([ Sp; Sp; Sl ], false)
  | "point_line_distance" -> Some ([ Sp; Sl ], true)
  | "tangent_arc" -> Some ([ Sl; Sa ], false)
  | _ -> None

let check d =
  let n = function
    | Sp -> Array.length d.points | Sl -> Array.length d.lines | Sc -> Array.length d.circles | Sa -> Array.length d.arcs
  in
  let ok s i = i >= 0 && i < n s in
  let err = ref None in
  let fail m = if !err = None then err := Some m in
  Array.iter (fun (a, b) -> if not (ok Sp a && ok Sp b) then fail "ligne : point inconnu") d.lines;
  Array.iter (fun (c, _) -> if not (ok Sp c) then fail "cercle : centre inconnu") d.circles;
  Array.iter (fun (c, a, b) -> if not (ok Sp c && ok Sp a && ok Sp b) then fail "arc : point inconnu") d.arcs;
  let item = function P i -> ok Sp i | A k | Rev k -> ok Sa k in
  let size l = List.fold_left (fun n i -> n + match i with P _ -> 1 | _ -> 2) 0 l in
  List.iter (fun l -> if size l < 3 || not (List.for_all item l) then fail "boucle invalide") d.loops;
  List.iter
    (fun c ->
      match signature c.kind with
      | None -> fail ("contrainte inconnue : " ^ c.kind)
      | Some (sorts, v) ->
          if List.length sorts <> List.length c.refs || not (List.for_all2 ok sorts c.refs) then
            fail ("contrainte " ^ c.kind ^ " : références invalides")
          else if v && c.value = None then fail ("contrainte " ^ c.kind ^ " : valeur manquante"))
    d.constraints;
  match !err with Some m -> Error m | None -> Ok ()

(* Boucles ordonnées par profondeur d'imbrication, avec leur signe (true : ajoutée). *)
let nested d =
  let pt i = let x, y, _ = d.points.(i) in (x, y) in
  let corners l = List.concat_map (function P i -> [ pt i ] | A k | Rev k -> let _, a, b = d.arcs.(k) in [ pt a; pt b ]) l in
  let inside (x, y) poly =
    let n = List.length poly and a = Array.of_list poly in
    let c = ref false in
    for i = 0 to n - 1 do
      let xi, yi = a.(i) and xj, yj = a.((i + n - 1) mod n) in
      if yi > y <> (yj > y) && x < ((xj -. xi) *. (y -. yi) /. (yj -. yi)) +. xi then c := not !c
    done;
    !c
  in
  let depth l = match corners l with [] -> 0 | p :: _ -> List.length (List.filter (fun m -> m != l && inside p (corners m)) d.loops) in
  List.map (fun l -> (depth l, l)) d.loops |> List.stable_sort (fun (a, _) (b, _) -> compare a b) |> List.map (fun (k, l) -> (k mod 2 = 0, l))

let rec mapm f = function
  | [] -> Sketch.return []
  | x :: r -> Sketch.bind (f x) (fun y -> Sketch.map (fun ys -> y :: ys) (mapm f r))

let build d =
  match check d with
  | Error e -> Error e
  | Ok () ->
      let open Sketch.Syntax in
      Ok
        (let* ps = mapm (fun (x, y, fixed) -> Sketch.point ~fixed x y) (Array.to_list d.points) in
         let ps = Array.of_list ps in
         let* ls = mapm (fun (a, b) -> Sketch.line ps.(a) ps.(b)) (Array.to_list d.lines) in
         let ls = Array.of_list ls in
         let* cs = mapm (fun (c, r) -> Sketch.circle ps.(c) r) (Array.to_list d.circles) in
         let cs = Array.of_list cs in
         let* arcs = mapm (fun (c, a, b) -> Sketch.arc ps.(c) ps.(a) ps.(b)) (Array.to_list d.arcs) in
         let arcs = Array.of_list arcs in
         let v c = Option.get c.value in
         let one c =
           match (c.kind, c.refs) with
           | "horizontal", [ a ] -> Sketch.horizontal ls.(a)
           | "vertical", [ a ] -> Sketch.vertical ls.(a)
           | "length", [ a ] -> Sketch.length ls.(a) (v c)
           | "parallel", [ a; b ] -> Sketch.parallel ls.(a) ls.(b)
           | "perpendicular", [ a; b ] -> Sketch.perpendicular ls.(a) ls.(b)
           | "equal_length", [ a; b ] -> Sketch.equal_length ls.(a) ls.(b)
           | "angle", [ a; b ] -> Sketch.angle ls.(a) ls.(b) (v c)
           | "coincident", [ a; b ] -> Sketch.coincident ps.(a) ps.(b)
           | "distance", [ a; b ] -> Sketch.distance ps.(a) ps.(b) (v c)
           | "hdistance", [ a; b ] -> Sketch.hdistance ps.(a) ps.(b) (v c)
           | "vdistance", [ a; b ] -> Sketch.vdistance ps.(a) ps.(b) (v c)
           | "radius", [ a ] -> Sketch.radius cs.(a) (v c)
           | "equal_radius", [ a; b ] -> Sketch.equal_radius cs.(a) cs.(b)
           | "concentric", [ a; b ] -> Sketch.concentric cs.(a) cs.(b)
           | "tangent", [ a; b ] -> Sketch.tangent ls.(a) cs.(b)
           | "on_line", [ a; b ] -> Sketch.on_line ps.(a) ls.(b)
           | "midpoint", [ a; b ] -> Sketch.midpoint ps.(a) ls.(b)
           | "on_circle", [ a; b ] -> Sketch.on_circle ps.(a) cs.(b)
           | "point_line_distance", [ a; l ] -> Sketch.point_line_distance ps.(a) ls.(l) (v c)
           | "symmetric", [ a; b; l ] -> Sketch.symmetric ps.(a) ps.(b) ls.(l)
           | "arc_radius", [ a ] -> Sketch.arc_radius arcs.(a) (v c)
           | "tangent_arc", [ a; b ] -> Sketch.tangent_arc ls.(a) arcs.(b)
           | _ -> assert false (* exclu par [check] *)
         in
         let+ () = Sketch.constrain (List.map one d.constraints) in
         let edge = function P i -> Sketch.pt ps.(i) | A k -> Sketch.along arcs.(k) | Rev k -> Sketch.back arcs.(k) in
         let loops = List.map (fun (plus, l) -> (plus, Sketch.path (List.map edge l))) (nested d) in
         let disks = Array.to_list (Array.map Sketch.disk cs) in
         match (loops, disks) with
         | (_, l) :: rest, _ ->
             let r = List.fold_left (fun r (plus, x) -> if plus then Sketch.( + ) r x else Sketch.( - ) r x) l rest in
             List.fold_left Sketch.( - ) r disks
         | [], d :: rest -> List.fold_left Sketch.( + ) d rest
         | [], [] -> Sketch.loop [])

let solve d = match build d with Error e -> Error e | Ok m -> Sketch.solve m

(* ---- Code ---- *)

let num x =
  let x = Float.round (x *. 100.) /. 100. +. 0. in
  let s = Printf.sprintf "%g" x in
  let s = if String.contains s '.' || String.contains s 'e' then s else s ^ "." in
  if x < 0. then "(" ^ s ^ ")" else s

let to_code ?(indent = 4) d =
  (match check d with Ok () -> () | Error e -> invalid_arg ("Sketch_desc.to_code : " ^ e));
  let pad = String.make indent ' ' in
  let b = Buffer.create 512 in
  let line fmt = Printf.ksprintf (fun s -> Buffer.add_string b (pad ^ s ^ "\n")) fmt in
  let p i = Printf.sprintf "p%d" i and l i = Printf.sprintf "l%d" i and c i = Printf.sprintf "c%d" i in
  let a i = Printf.sprintf "a%d" i in
  line "let open Sketch.Syntax in";
  let group items =
    match items with
    | [] -> ()
    | first :: rest ->
        line "let* %s" first;
        List.iter (fun s -> line "and* %s" s) rest;
        line "in"
  in
  group
    (Array.to_list
       (Array.mapi
          (fun i (x, y, fixed) -> Printf.sprintf "%s = Sketch.point%s %s %s" (p i) (if fixed then " ~fixed:true" else "") (num x) (num y))
          d.points));
  group (Array.to_list (Array.mapi (fun i (a, b') -> Printf.sprintf "%s = Sketch.line %s %s" (l i) (p a) (p b')) d.lines));
  group (Array.to_list (Array.mapi (fun i (k, r) -> Printf.sprintf "%s = Sketch.circle %s %s" (c i) (p k) (num r)) d.circles));
  group (Array.to_list (Array.mapi (fun i (k, s, e) -> Printf.sprintf "%s = Sketch.arc %s %s %s" (a i) (p k) (p s) (p e)) d.arcs));
  let ref_name kind i r =
    match signature kind with
    | Some (sorts, _) -> ( match List.nth sorts i with Sp -> p r | Sl -> l r | Sc -> c r | Sa -> a r)
    | None -> assert false
  in
  let constr k =
    String.concat " "
      ((k.kind :: List.mapi (ref_name k.kind) k.refs) @ match k.value with Some v -> [ num v ] | None -> [])
  in
  (match d.constraints with
  | [] -> line "let+ () = Sketch.constrain [] in"
  | cs ->
      line "let+ () =";
      line "  Sketch.constrain";
      line "    Sketch.[ %s ]" (String.concat (";\n" ^ pad ^ "             ") (List.map constr cs));
      line "in");
  let loop ls =
    let pts = List.filter_map (function P i -> Some i | _ -> None) ls in
    if List.length pts = List.length ls then Printf.sprintf "loop [ %s ]" (String.concat "; " (List.map p pts))
    else
      Printf.sprintf "path [ %s ]"
        (String.concat "; " (List.map (function P i -> "pt " ^ p i | A k -> "along " ^ a k | Rev k -> "back " ^ a k) ls))
  in
  let disks = Array.to_list (Array.mapi (fun i _ -> Printf.sprintf "disk %s" (c i)) d.circles) in
  let region =
    match (nested d, disks) with
    | (_, l) :: rest, ds ->
        String.concat "" (loop l :: List.map (fun (plus, x) -> (if plus then " + " else " - ") ^ loop x) rest)
        ^ String.concat "" (List.map (fun x -> " - " ^ x) ds)
    | [], ds when ds <> [] -> String.concat " + " ds
    | _ -> "loop []"
  in
  line "Sketch.(%s)" region;
  Buffer.contents b
