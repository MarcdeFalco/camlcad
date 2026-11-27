(* Lois que tout noyau doit vérifier, exécutées ici contre un noyau. *)
module Make (K : Cad.Kernel.S) = struct
  module E = Cad.Eval.Make (K)
  open Cad

  let c = E.create ()
  let solid s = E.solid c s
  let vol s = K.volume (solid s)
  let close ?(rel = 1e-9) a b = Float.abs (a -. b) <= rel *. Float.max 1. (Float.abs b)
  let check name ok = Printf.printf "%-48s %s\n" name (if ok then "ok" else "ÉCHEC")
  let v = Geom.V3.v

  let () =
    let cube = Shape.cube (v 10. 10. 10.) in
    check "cube 10 : volume 1000" (close (vol cube) 1000.);
    check "cube centré : bbox symétrique"
      (Geom.Bbox.equal ~eps:1e-9 (K.bbox (solid (Shape.cube ~center:true (v 2. 2. 2.))))
         { Geom.Bbox.min = v (-1.) (-1.) (-1.); max = v 1. 1. 1. });
    let r = 5. and h = 10. in
    check "cylindre : volume à 1 % de pi r^2 h"
      (close ~rel:0.01 (vol (Shape.cylinder ~r ~h ())) (Float.pi *. r *. r *. h));
    let a = cube and b = Shape.translate (v 5. 5. 5.) cube in
    check "union : inclusion-exclusion"
      (close ~rel:1e-6 (vol Shape.(a + b)) (vol a +. vol b -. vol Shape.(a * b)));
    check "a - a : vide" (K.is_empty (solid Shape.(a - a)));
    check "a - b + a * b = a" (close ~rel:1e-6 (vol Shape.((a - b) + (a * b))) (vol a));
    let tore = Shape.revolve (Profile.translate (Geom.V2.v 10. 0.) (Profile.circle ~r:3.)) in
    check "tore : genre 1" (K.genus (solid tore) = 1);
    check "tore : volume à 1 % de 2 pi^2 R r^2"
      (close ~rel:0.01 (vol tore) (2. *. Float.pi *. Float.pi *. 10. *. 9.));
    let cadre =
      Profile.(difference (rect ~center:true ~w:20. ~h:20. ()) (rect ~center:true ~w:10. ~h:10. ()))
    in
    check "extrusion d'un cadre : genre 1, volume 1500"
      (let s = Shape.extrude ~h:5. cadre in
       K.genus (solid s) = 1 && close ~rel:1e-6 (vol s) 1500.);
    check "rotation : volume conservé"
      (close ~rel:1e-6 (vol (Shape.rotate ~axis:(v 1. 1. 0.) ~deg:33. cube)) 1000.);
    check "miroir : bbox réfléchie"
      (let bb = K.bbox (solid (Shape.mirror ~normal:Geom.V3.ex cube)) in
       close bb.min.x (-10.) && close bb.max.x 0.);
    check "échelle : volume et bbox autour du centre"
      (let s = Shape.scale ~about:(v 5. 5. 5.) (v 2. 1. 0.5) cube in
       let bb = K.bbox (solid s) in
       close ~rel:1e-6 (vol s) 1000. && close bb.min.x (-5.) && close bb.max.x 15. && close bb.max.z 7.5);
    check "lissage : tronc de pyramide 20 → 10, h 10"
      (let sq c = Profile.rect ~center:true ~w:c ~h:c () in
       close ~rel:1e-6 (vol (Shape.loft [ (Geom.Plane.xy, sq 20.); (Geom.Plane.offset 10. Geom.Plane.xy, sq 10.) ])) (7000. /. 3.));
    check "balayage : carré 2 le long d'un L 10 + 10"
      (close ~rel:1e-5 (vol (Shape.sweep (Profile.rect ~center:true ~w:2. ~h:2. ()) [ v 0. 0. 0.; v 0. 0. 10.; v 10. 0. 10. ])) 80.);
    check "dépouille : tronc de pyramide 20 → 10"
      (close ~rel:1e-5 (vol (Shape.extrude ~taper:(Float.atan 0.5 *. 180. /. Float.pi) ~h:10. (Profile.rect ~center:true ~w:20. ~h:20. ()))) (7000. /. 3.));
    check "texte : « I » de 6, trait 1, extrudé de 1 = 11"
      (close ~rel:1e-6 (vol (Shape.extrude ~h:1. (Cad_parts.Text.profile ~stroke:1. ~size:6. "I"))) 11.);
    let mesh = E.mesh c Shape.(a - b) in
    check "maillage : fermé, Euler = 2" (Mesh.is_closed mesh && Mesh.euler_characteristic mesh = 2);
    check "maillage : volume = volume noyau" (close ~rel:1e-5 (Mesh.volume mesh) (vol Shape.(a - b)));
    let back = Cad_export.Stl.of_string (Cad_export.Stl.to_string mesh) in
    check "STL : aller-retour fermé" (Mesh.is_closed back && Mesh.n_triangles back = Mesh.n_triangles mesh)

end
