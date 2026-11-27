(* Pignon et crémaillère : mécanisme à deux coordonnées liées par un couplage
   (translation = rayon primitif × angle). Le bâti porte l'axe du pignon et deux rails. *)
open Cad
open Geom
open Cad_mech

(* Crémaillère droite de module m, [n] dents, ligne primitive en y = 0, dents vers +y,
   creux centré en x = 0. [jeu] est retiré de l'épaisseur de dent au primitif. *)
let profil_cremaillere ~module_:m ~n ~jeu ~semelle =
  let p = Float.pi *. m and t = tan (20. *. Float.pi /. 180.) in
  let demi y = (p /. 4.) -. (jeu /. 2.) -. (y *. t) in
  let dent k =
    let x = (p /. 2.) +. (float k *. p) in
    let y0 = -1.25 *. m and y1 = m in
    let w0 = demi y0 and w1 = demi y1 in
    Profile.polygon [ V2.v (x -. w0) y0; V2.v (x +. w0) y0; V2.v (x +. w1) y1; V2.v (x -. w1) y1 ]
  in
  let x0 = -.(float n *. p) /. 2. in
  let base = Profile.rect ~w:(float n *. p) ~h:(semelle +. 0.01) () in
  let base = Profile.translate (V2.v x0 (-1.25 *. m -. semelle)) base in
  List.fold_left
    (fun acc k -> Profile.union acc (dent k))
    base
    (List.init n (fun i -> i - (n / 2)))

(* Port de glissière : son axe z est l'axe X du monde (même repère des deux côtés). *)
let glissiere = Frame.make ~origin:V3.zero ~x:V3.ey ~z:V3.ex

(* Une fonction par pièce : le toplevel de l'éditeur (OCaml 5) refuse les fonctions dont
   la pile dépasse un seuil (« caml_ensure_stack_capacity is not available »). *)
let pignon ~module_ ~dents ~jeu ~e =
  let roue = Shape.extrude ~h:e (Cad_parts.Gear.spur ~backlash:jeu ~module_ ~teeth:dents ()) in
  let alesage = Shape.cylinder ~r:2.6 ~h:e () in
  Part.make "pignon" ~color:(220, 120, 40) Shape.(roue - alesage) ~ports:[ ("axe", Frame.world) ]

(* Ligne primitive tangente au cercle primitif du pignon, en y = -rp. Le pignon a une dent
   en x (angle 0) ; sous lui, en -90°, il faut un creux de crémaillère : décalage d'un
   quart de pas par dent quand [dents] n'est pas multiple de 4. *)
let cremaillere ~module_ ~dents ~n ~jeu ~e ~semelle =
  let rp = Cad_parts.Gear.pitch_radius ~module_ ~teeth:dents in
  let decalage = float (dents mod 4) /. 4. *. Float.pi *. module_ in
  let profil = profil_cremaillere ~module_ ~n ~jeu ~semelle in
  let rack = Shape.(extrude ~h:e profil |> translate (V3.v decalage (-.rp) 0.)) in
  Part.make "cremaillere" ~color:(60, 130, 210) rack ~ports:[ ("rail", glissiere) ]

(* Plaque, axe du pignon, rail sous la crémaillère (à [jeu] de sa semelle). *)
let bati ~module_ ~dents ~n ~jeu ~e ~semelle =
  let rp = Cad_parts.Gear.pitch_radius ~module_ ~teeth:dents in
  let longueur = (float n *. Float.pi *. module_) +. 60. in
  let y_bas = -.rp -. (1.25 *. module_) -. semelle in
  let plaque = Shape.cube (V3.v longueur (rp +. 30.) 3.) in
  let plaque = Shape.translate (V3.v (-.longueur /. 2.) (y_bas -. 6.) (-3.)) plaque in
  let rail = Shape.cube (V3.v longueur 3. e) in
  let rail = Shape.translate (V3.v (-.longueur /. 2.) (y_bas -. 3. -. jeu) 0.) rail in
  let axe = Shape.cylinder ~r:2.4 ~h:e () in
  Part.make "bati" ~color:(90, 90, 90) Shape.(plaque + axe + rail) ~ports:[ ("axe", Frame.world); ("rail", glissiere) ]

let make ?(module_ = 2.) ?(dents = 20) ?(n = 14) ?(jeu = 0.15) ?(e = 6.) () =
  let semelle = 5. in
  let b = bati ~module_ ~dents ~n ~jeu ~e ~semelle in
  let p = pignon ~module_ ~dents ~jeu ~e in
  let c = cremaillere ~module_ ~dents ~n ~jeu ~e ~semelle in
  let course = (float n *. Float.pi *. module_ /. 2.) -. 10. in
  let ratio = Cad_parts.Gear.pitch_radius ~module_ ~teeth:dents *. Float.pi /. 180. in
  let pivot = Joint.revolute ~name:"pignon" Part.(b @: "axe") Part.(p @: "axe") in
  let glisse = Joint.prismatic ~name:"cremaillere" ~limits:(-.course, course) Part.(b @: "rail") Part.(c @: "rail") in
  Assembly.make ~ground:b [ pivot; glisse ] ~couplings:[ { driver = "pignon"; driven = "cremaillere"; ratio } ]

let model : Assembly.t Doc.t =
  let%param module_ = 2. [@range 1., 3.] [@unit "mm"] in
  let%param dents = 20. [@range 12., 40.] in
  let%param jeu = 0.15 [@range 0., 0.5] [@unit "mm"] in
  Doc.return (make ~module_ ~dents:(int_of_float (Float.round dents)) ~jeu ())
