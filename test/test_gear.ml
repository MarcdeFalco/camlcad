open Cad_parts

let%expect_test "développante : épaisseur au primitif et rayons" =
  let m = 2. and z = 20 in
  let rp = Gear.pitch_radius ~module_:m ~teeth:z in
  let h = Gear.tooth_half_angle ~module_:m ~teeth:z rp in
  Printf.printf "rp=%g ra=%g rf=%g entraxe(20,30)=%g\n" rp (Gear.tip_radius ~module_:m ~teeth:z)
    (Gear.root_radius ~module_:m ~teeth:z) (Gear.center_distance ~module_:m 20 30);
  Printf.printf "demi-dent au primitif = pi/2z : %b\n" (Float.abs (h -. (Float.pi /. 40.)) < 1e-12);
  Printf.printf "dent plus fine en tête : %b\n"
    (Gear.tooth_half_angle ~module_:m ~teeth:z (Gear.tip_radius ~module_:m ~teeth:z) < h);
  [%expect {|
    rp=20 ra=22 rf=17.5 entraxe(20,30)=50
    demi-dent au primitif = pi/2z : true
    dent plus fine en tête : true
    |}]
