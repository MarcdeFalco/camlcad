(* Réécritures du source depuis l'éditeur, sur les pièces de référence : les
   positions viennent du journal réel (ppx), le texte du fichier. *)
open Cad

let read file =
  let ic = open_in_bin ("../" ^ file) in
  let s = really_input_string ic (in_channel_length ic) in
  close_in ic;
  s

let journal m = match Doc.run m with Ok (_, j) -> j | Error e -> e.journal

let feat (m : 'a Doc.t) name =
  let f = List.find (fun (f : Doc.feature_info) -> f.f_name = name) (journal m).features in
  (read f.f_loc.file, f.f_loc)

let support = Cad_examples.Support.model
let patte = Cad_examples.Patte.model

(* Lignes retirées (-) et ajoutées (+), par plus longue sous-suite commune. *)
let diff a b =
  let a = Array.of_list (String.split_on_char '\n' a) and b = Array.of_list (String.split_on_char '\n' b) in
  let na = Array.length a and nb = Array.length b in
  let l = Array.make_matrix (na + 1) (nb + 1) 0 in
  for i = na - 1 downto 0 do
    for j = nb - 1 downto 0 do
      l.(i).(j) <- (if a.(i) = b.(j) then 1 + l.(i + 1).(j + 1) else max l.(i + 1).(j) l.(i).(j + 1))
    done
  done;
  let rec go i j =
    if i < na && j < nb && a.(i) = b.(j) then go (i + 1) (j + 1)
    else if i < na && (j = nb || l.(i + 1).(j) >= l.(i).(j + 1)) then (Printf.printf "- %s\n" a.(i); go (i + 1) j)
    else if j < nb then (Printf.printf "+ %s\n" b.(j); go i (j + 1))
  in
  go 0 0

let show src = function Ok s -> if s = src then print_endline "(inchangé)" else diff src s | Error e -> print_endline ("refus : " ^ e)

let%expect_test "littéraux d'une feature" =
  let src, loc = feat patte "lamage" in
  List.iteri
    (fun i (l : Source_edit.literal) ->
      Printf.printf "%d %g%s %s  …%s[%s]%s…\n" i l.value (if l.int then " (entier)" else "")
        (Option.value ~default:"-" l.label) l.before
        (String.sub src l.range.start (l.range.stop - l.range.start)) l.after)
    (Source_edit.literals src loc);
  let src, loc = feat support "trou_aile" in
  List.iter
    (fun (l : Source_edit.literal) -> Printf.printf "%g %s\n" l.value (Option.value ~default:"-" l.label))
    (Source_edit.literals src loc);
  [%expect {|
    0 2 ~h  …cylinder ~r:diametre ~h:[2.] () |> translate (V3.v (…
    1 2 -  …slate (V3.v (largeur /. [2.]) (hauteur /. 2.) (epais…
    2 2 -  …geur /. 2.) (hauteur /. [2.]) (epaisseur -. 2.)))…
    3 2 -  …ur /. 2.) (epaisseur -. [2.])))…
    2 -
    -90 ~deg
    2 -
    0 -
    0.6 - |}]

let%expect_test "modifier une cote" =
  let src, loc = feat patte "lamage" in
  show src (Source_edit.set_literal src loc 0 3.5);
  show src (Source_edit.set_literal src loc 1 (-1.));
  let src, loc = feat support "trou_aile" in
  show src (Source_edit.set_literal src loc 0 45.);
  show src (Source_edit.set_literal src loc 9 1.);
  [%expect {|
    -     Shape.(cylinder ~r:diametre ~h:2. () |> translate (V3.v (largeur /. 2.) (hauteur /. 2.) (epaisseur -. 2.)))
    +     Shape.(cylinder ~r:diametre ~h:3.5 () |> translate (V3.v (largeur /. 2.) (hauteur /. 2.) (epaisseur -. 2.)))
    -     Shape.(cylinder ~r:diametre ~h:2. () |> translate (V3.v (largeur /. 2.) (hauteur /. 2.) (epaisseur -. 2.)))
    +     Shape.(cylinder ~r:diametre ~h:2. () |> translate (V3.v (largeur /. (-1.)) (hauteur /. 2.) (epaisseur -. 2.)))
    -       cylinder ~r:(diametre /. 2.) ~h:epaisseur ()
    +       cylinder ~r:(diametre /. 45.) ~h:epaisseur ()
    refus : littéral introuvable (code modifié ?) |}]

let%expect_test "littéral → paramètre" =
  let src, loc = feat patte "lamage" in
  show src (Source_edit.promote src loc 0 ~name:"profondeur_lamage");
  show src (Source_edit.promote src loc 0 ~name:"largeur");
  show src (Source_edit.promote src loc 0 ~name:"Mauvais");
  [%expect {|
    +   let%param profondeur_lamage = 2. [@range 0., 4.] [@unit "mm"] in
    -     Shape.(cylinder ~r:diametre ~h:2. () |> translate (V3.v (largeur /. 2.) (hauteur /. 2.) (epaisseur -. 2.)))
    +     Shape.(cylinder ~r:diametre ~h:profondeur_lamage () |> translate (V3.v (largeur /. 2.) (hauteur /. 2.) (epaisseur -. 2.)))
    refus : « largeur » est déjà utilisé dans le code
    refus : « Mauvais » n'est pas un nom de variable OCaml valable |}]

let%expect_test "littéral lié à un paramètre existant" =
  let src, loc = feat patte "lamage" in
  show src (Source_edit.use_param src loc 0 ~name:"epaisseur");
  show src (Source_edit.use_param src loc 0 ~name:"inconnu");
  [%expect {|
    -     Shape.(cylinder ~r:diametre ~h:2. () |> translate (V3.v (largeur /. 2.) (hauteur /. 2.) (epaisseur -. 2.)))
    +     Shape.(cylinder ~r:diametre ~h:epaisseur () |> translate (V3.v (largeur /. 2.) (hauteur /. 2.) (epaisseur -. 2.)))
    refus : « inconnu » n'est pas un paramètre déclaré avant cette étape
    |}]

let%expect_test "suppression temporaire" =
  let src, loc = feat support "trou_aile" in
  let on = Source_edit.set_suppressed src loc true in
  show src on;
  (match on with
  | Ok s -> show s (Source_edit.set_suppressed s loc true); show s (Source_edit.set_suppressed s loc false)
  | Error _ -> ());
  [%expect {|
    -       |> translate (V3.v (longueur /. 2.) 0. (hauteur *. 0.6)))
    +       |> translate (V3.v (longueur /. 2.) 0. (hauteur *. 0.6))) [@@suppress]
    (inchangé)
    -       |> translate (V3.v (longueur /. 2.) 0. (hauteur *. 0.6))) [@@suppress]
    +       |> translate (V3.v (longueur /. 2.) 0. (hauteur *. 0.6))) |}]

let%expect_test "renommer" =
  let src, loc = feat support "trous_semelle" in
  show src (Source_edit.rename src loc "percages");
  show src (Source_edit.rename src loc "aile");
  show src (Source_edit.rename src loc "let");
  [%expect {|
    -   let%feat trous_semelle = Shape.(trou_vertical 10. + trou_vertical (longueur -. 10.)) in
    +   let%feat percages = Shape.(trou_vertical 10. + trou_vertical (longueur -. 10.)) in
    -   let%feat support = Shape.(semelle + aile - trous_semelle - trou_aile) in
    +   let%feat support = Shape.(semelle + aile - percages - trou_aile) in
    refus : « aile » est déjà utilisé dans le code
    refus : « let » n'est pas un nom de variable OCaml valable |}]

let%expect_test "supprimer" =
  let src, loc = feat support "trou_aile" in
  show src (Source_edit.delete src loc);
  let src, loc = feat support "semelle" in
  show src (Source_edit.delete src loc);
  let src, loc = feat support "aile" in
  show src (Source_edit.delete src loc);
  let src, loc = feat support "support" in
  show src (Source_edit.delete src loc);
  let src, loc = feat patte "lamage" in
  show src (Source_edit.delete src loc);
  [%expect {|
    -   let%feat trou_aile =
    -     Shape.(
    -       cylinder ~r:(diametre /. 2.) ~h:epaisseur ()
    -       |> rotate ~axis:V3.ex ~deg:(-90.)
    -       |> translate (V3.v (longueur /. 2.) 0. (hauteur *. 0.6)))
    -   in
    -   let%feat support = Shape.(semelle + aile - trous_semelle - trou_aile) in
    +   let%feat support = Shape.(semelle + aile - trous_semelle) in
    -   let%feat semelle = Shape.cube (V3.v longueur largeur epaisseur) in
    -   let%feat support = Shape.(semelle + aile - trous_semelle - trou_aile) in
    +   let%feat support = Shape.(aile - trous_semelle - trou_aile) in
    -   let%feat aile = Shape.(cube (V3.v longueur epaisseur hauteur)) in
    -   let%feat support = Shape.(semelle + aile - trous_semelle - trou_aile) in
    +   let%feat support = Shape.(semelle - trous_semelle - trou_aile) in
    refus : « support » est le résultat du modèle (ligne 24) : modifiez le code, ou supprimez-la temporairement
    -   let%feat lamage =
    -     Shape.(cylinder ~r:diametre ~h:2. () |> translate (V3.v (largeur /. 2.) (hauteur /. 2.) (epaisseur -. 2.)))
    -   in
    -   let%feat piece = Shape.(patte - lamage) in
    +   let%feat piece = Shape.(patte) in |}]

let%expect_test "cas lexicaux" =
  let src =
    "let model =\n  let%feat a = (* 1. (* 2. *) \"3.\" *) Shape.cube (V3.v 1_000. 2e-3 0x1F) [@name \"4.\"] in\n  let%feat b = Shape.(a + sphere ~r:(-5.)) in\n  Doc.return b\n"
  in
  (* position d'une liaison : de « let%feat » à « in » exclu, comme le ppx *)
  let loc line _ _ =
    let l = List.nth (String.split_on_char '\n' src) (line - 1) in
    let s = String.index l 'l' in
    let rec last_in i = if String.sub l i 3 = " in" then i else last_in (i - 1) in
    Loc.of_pos ("m.ml", line, s, last_in (String.length l - 3))
  in
  List.iter
    (fun (l : Source_edit.literal) -> Printf.printf "%g %b %s\n" l.value l.int (Option.value ~default:"-" l.label))
    (Source_edit.literals src (loc 2 2 82) @ Source_edit.literals src (loc 3 2 42));
  show src (Source_edit.set_literal src (loc 3 2 42) 0 7.);
  show src (Source_edit.set_literal src (loc 2 2 82) 0 (-2.));
  show src (Source_edit.set_literal src (loc 2 2 82) 2 40.);
  show src (Source_edit.delete src (loc 2 2 82));
  print_endline (Source_edit.float_literal 12. ^ " " ^ Source_edit.float_literal 0.1 ^ " " ^ Source_edit.float_literal 1e-7
                 ^ " " ^ Source_edit.float_literal (-3.));
  print_endline
    (match Source_edit.literals src (Loc.of_pos ("m.ml", 9, 0, 3)) with [] -> "position invalide : aucun" | _ -> "?");
  [%expect {|
    1000 false -
    0.002 false -
    31 true -
    -5 false ~r
    -   let%feat b = Shape.(a + sphere ~r:(-5.)) in
    +   let%feat b = Shape.(a + sphere ~r:7.) in
    -   let%feat a = (* 1. (* 2. *) "3." *) Shape.cube (V3.v 1_000. 2e-3 0x1F) [@name "4."] in
    +   let%feat a = (* 1. (* 2. *) "3." *) Shape.cube (V3.v (-2.) 2e-3 0x1F) [@name "4."] in
    -   let%feat a = (* 1. (* 2. *) "3." *) Shape.cube (V3.v 1_000. 2e-3 0x1F) [@name "4."] in
    +   let%feat a = (* 1. (* 2. *) "3." *) Shape.cube (V3.v 1_000. 2e-3 40) [@name "4."] in
    -   let%feat a = (* 1. (* 2. *) "3." *) Shape.cube (V3.v 1_000. 2e-3 0x1F) [@name "4."] in
    -   let%feat b = Shape.(a + sphere ~r:(-5.)) in
    +   let%feat b = Shape.(sphere ~r:(-5.)) in
    12. 0.1 1e-07 -3.
    position invalide : aucun |}]
