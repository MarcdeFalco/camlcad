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
    Profile.polygon [ V2.v (x -. demi y0) y0; V2.v (x +. demi y0) y0; V2.v (x +. demi y1) y1; V2.v (x -. demi y1) y1 ]
  in
  let x0 = -.(float n *. p) /. 2. in
  let base = Profile.translate (V2.v x0 (-1.25 *. m -. semelle)) (Profile.rect ~w:(float n *. p) ~h:(semelle +. 0.01) ()) in
  List.fold_left
    (fun acc k -> Profile.union acc (dent k))
    base
    (List.init n (fun i -> i - (n / 2)))

let make ?(module_ = 2.) ?(dents = 20) ?(n = 14) ?(jeu = 0.15) ?(e = 6.) () =
  let rp = Cad_parts.Gear.pitch_radius ~module_ ~teeth:dents in
  let semelle = 5. in
  let pignon =
    Part.make "pignon" ~color:(220, 120, 40)
      Shape.(extrude ~h:e (Cad_parts.Gear.spur ~backlash:jeu ~module_ ~teeth:dents ()) - cylinder ~r:2.6 ~h:e ())
      ~ports:[ ("axe", Frame.world) ]
  in
  (* Crémaillère : ligne primitive tangente au cercle primitif du pignon, en y = -rp. Le
     pignon a une dent en x (angle 0) ; sous lui, en -90°, il faut un creux de crémaillère :
     décalage d'un quart de pas par dent quand [dents] n'est pas multiple de 4. *)
  let decalage = float (dents mod 4) /. 4. *. Float.pi *. module_ in
  let rack =
    Shape.(
      extrude ~h:e (profil_cremaillere ~module_ ~n ~jeu ~semelle) |> translate (V3.v decalage (-.rp) 0.))
  in
  (* Port de glissière : son axe z est l'axe X du monde (même repère des deux côtés). *)
  let glissiere = Frame.make ~origin:V3.zero ~x:V3.ey ~z:V3.ex in
  let cremaillere = Part.make "cremaillere" ~color:(60, 130, 210) rack ~ports:[ ("rail", glissiere) ] in
  let longueur = (float n *. Float.pi *. module_) +. 60. in
  let y_bas = -.rp -. (1.25 *. module_) -. semelle in
  let bati =
    Part.make "bati" ~color:(90, 90, 90)
      Shape.(
        (cube (V3.v longueur (rp +. 30.) 3.) |> translate (V3.v (-.longueur /. 2.) (y_bas -. 6.) (-3.)))
        + cylinder ~r:2.4 ~h:e ()
        + (cube (V3.v longueur 3. e) |> translate (V3.v (-.longueur /. 2.) (y_bas -. 3. -. jeu) 0.)))
      ~ports:[ ("axe", Frame.world); ("rail", glissiere) ]
  in
  let course = (float n *. Float.pi *. module_ /. 2.) -. 10. in
  Assembly.make ~ground:bati
    [ Joint.revolute ~name:"pignon" Part.(bati @: "axe") Part.(pignon @: "axe");
      Joint.prismatic ~name:"cremaillere" ~limits:(-.course, course) Part.(bati @: "rail") Part.(cremaillere @: "rail") ]
    ~couplings:[ { driver = "pignon"; driven = "cremaillere"; ratio = rp *. Float.pi /. 180. } ]

let model : Assembly.t Doc.t =
  let%param module_ = 2. [@range 1., 3.] [@unit "mm"] in
  let%param dents = 20. [@range 12., 40.] in
  let%param jeu = 0.15 [@range 0., 0.5] [@unit "mm"] in
  Doc.return (make ~module_ ~dents:(int_of_float (Float.round dents)) ~jeu ())
