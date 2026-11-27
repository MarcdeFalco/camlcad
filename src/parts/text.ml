open Geom

let p x y = V2.v x y

(* Glyphes sur une grille 4 × 6 (y vers le haut) : listes de lignes brisées. *)
let o = [ p 1. 0.; p 0. 1.; p 0. 5.; p 1. 6.; p 3. 6.; p 4. 5.; p 4. 1.; p 3. 0.; p 1. 0. ]
let pb = [ p 0. 0.; p 0. 6.; p 3. 6.; p 4. 5.; p 4. 4.; p 3. 3.; p 0. 3. ]
let qmark = [ [ p 0. 5.; p 1. 6.; p 3. 6.; p 4. 5.; p 4. 4.; p 2. 2.5; p 2. 1.5 ]; [ p 2. 0. ] ]

let glyph = function
  | 'A' -> [ [ p 0. 0.; p 0. 4.; p 2. 6.; p 4. 4.; p 4. 0. ]; [ p 0. 3.; p 4. 3. ] ]
  | 'B' -> [ pb; [ p 3. 3.; p 4. 2.; p 4. 1.; p 3. 0.; p 0. 0. ] ]
  | 'C' -> [ [ p 4. 5.; p 3. 6.; p 1. 6.; p 0. 5.; p 0. 1.; p 1. 0.; p 3. 0.; p 4. 1. ] ]
  | 'D' -> [ [ p 0. 0.; p 0. 6.; p 2. 6.; p 4. 4.; p 4. 2.; p 2. 0.; p 0. 0. ] ]
  | 'E' -> [ [ p 4. 6.; p 0. 6.; p 0. 0.; p 4. 0. ]; [ p 0. 3.; p 3. 3. ] ]
  | 'F' -> [ [ p 4. 6.; p 0. 6.; p 0. 0. ]; [ p 0. 3.; p 3. 3. ] ]
  | 'G' -> [ [ p 4. 5.; p 3. 6.; p 1. 6.; p 0. 5.; p 0. 1.; p 1. 0.; p 3. 0.; p 4. 1.; p 4. 3.; p 2. 3. ] ]
  | 'H' -> [ [ p 0. 0.; p 0. 6. ]; [ p 4. 0.; p 4. 6. ]; [ p 0. 3.; p 4. 3. ] ]
  | 'I' -> [ [ p 1. 6.; p 3. 6. ]; [ p 2. 6.; p 2. 0. ]; [ p 1. 0.; p 3. 0. ] ]
  | 'J' -> [ [ p 4. 6.; p 4. 1.; p 3. 0.; p 1. 0.; p 0. 1. ] ]
  | 'K' -> [ [ p 0. 0.; p 0. 6. ]; [ p 4. 6.; p 0. 2. ]; [ p 1. 3.; p 4. 0. ] ]
  | 'L' -> [ [ p 0. 6.; p 0. 0.; p 4. 0. ] ]
  | 'M' -> [ [ p 0. 0.; p 0. 6.; p 2. 3.; p 4. 6.; p 4. 0. ] ]
  | 'N' -> [ [ p 0. 0.; p 0. 6.; p 4. 0.; p 4. 6. ] ]
  | 'O' -> [ o ]
  | 'P' -> [ pb ]
  | 'Q' -> [ o; [ p 2. 2.; p 4. 0. ] ]
  | 'R' -> [ pb; [ p 2. 3.; p 4. 0. ] ]
  | 'S' -> [ [ p 4. 5.; p 3. 6.; p 1. 6.; p 0. 5.; p 0. 4.; p 1. 3.; p 3. 3.; p 4. 2.; p 4. 1.; p 3. 0.; p 1. 0.; p 0. 1. ] ]
  | 'T' -> [ [ p 0. 6.; p 4. 6. ]; [ p 2. 6.; p 2. 0. ] ]
  | 'U' -> [ [ p 0. 6.; p 0. 1.; p 1. 0.; p 3. 0.; p 4. 1.; p 4. 6. ] ]
  | 'V' -> [ [ p 0. 6.; p 2. 0.; p 4. 6. ] ]
  | 'W' -> [ [ p 0. 6.; p 1. 0.; p 2. 3.; p 3. 0.; p 4. 6. ] ]
  | 'X' -> [ [ p 0. 0.; p 4. 6. ]; [ p 0. 6.; p 4. 0. ] ]
  | 'Y' -> [ [ p 0. 6.; p 2. 3.; p 4. 6. ]; [ p 2. 3.; p 2. 0. ] ]
  | 'Z' -> [ [ p 0. 6.; p 4. 6.; p 0. 0.; p 4. 0. ] ]
  | '0' -> [ o; [ p 0. 1.; p 4. 5. ] ]
  | '1' -> [ [ p 1. 5.; p 2. 6.; p 2. 0. ]; [ p 1. 0.; p 3. 0. ] ]
  | '2' -> [ [ p 0. 5.; p 1. 6.; p 3. 6.; p 4. 5.; p 4. 4.; p 0. 0.; p 4. 0. ] ]
  | '3' -> [ [ p 0. 5.; p 1. 6.; p 3. 6.; p 4. 5.; p 4. 4.; p 3. 3.; p 4. 2.; p 4. 1.; p 3. 0.; p 1. 0.; p 0. 1. ]; [ p 1. 3.; p 3. 3. ] ]
  | '4' -> [ [ p 3. 0.; p 3. 6.; p 0. 2.; p 4. 2. ] ]
  | '5' -> [ [ p 4. 6.; p 0. 6.; p 0. 3.; p 3. 3.; p 4. 2.; p 4. 1.; p 3. 0.; p 0. 0. ] ]
  | '6' -> [ [ p 3. 6.; p 1. 6.; p 0. 5.; p 0. 1.; p 1. 0.; p 3. 0.; p 4. 1.; p 4. 2.; p 3. 3.; p 0. 3. ] ]
  | '7' -> [ [ p 0. 6.; p 4. 6.; p 1. 0. ] ]
  | '8' -> [ [ p 1. 3.; p 0. 4.; p 0. 5.; p 1. 6.; p 3. 6.; p 4. 5.; p 4. 4.; p 3. 3.; p 1. 3.; p 0. 2.; p 0. 1.; p 1. 0.; p 3. 0.; p 4. 1.; p 4. 2.; p 3. 3. ] ]
  | '9' -> [ [ p 4. 3.; p 1. 3.; p 0. 4.; p 0. 5.; p 1. 6.; p 3. 6.; p 4. 5.; p 4. 1.; p 3. 0.; p 1. 0. ] ]
  | ' ' -> []
  | '-' -> [ [ p 1. 3.; p 3. 3. ] ]
  | '+' -> [ [ p 0.5 3.; p 3.5 3. ]; [ p 2. 1.5; p 2. 4.5 ] ]
  | '=' -> [ [ p 0.5 2.; p 3.5 2. ]; [ p 0.5 4.; p 3.5 4. ] ]
  | '.' -> [ [ p 2. 0. ] ]
  | ':' -> [ [ p 2. 1. ]; [ p 2. 5. ] ]
  | '/' -> [ [ p 0. 0.; p 4. 6. ] ]
  | _ -> qmark

(* Caractère (UTF-8) vers la grille : minuscules et accents ramenés aux majuscules. *)
let base u =
  match Uchar.to_int u with
  | c when c < 128 -> Char.uppercase_ascii (Char.chr c)
  | 0xE0 | 0xE1 | 0xE2 | 0xE4 | 0xC0 | 0xC1 | 0xC2 | 0xC4 -> 'A'
  | 0xE7 | 0xC7 -> 'C'
  | 0xE8 | 0xE9 | 0xEA | 0xEB | 0xC8 | 0xC9 | 0xCA | 0xCB -> 'E'
  | 0xEE | 0xEF | 0xCE | 0xCF -> 'I'
  | 0xF4 | 0xF6 | 0xD4 | 0xD6 -> 'O'
  | 0xF9 | 0xFA | 0xFB | 0xFC | 0xD9 | 0xDA | 0xDB | 0xDC -> 'U'
  | _ -> '?'

let chars s =
  let rec go i acc =
    if i >= String.length s then List.rev acc
    else
      let d = String.get_utf_8_uchar s i in
      go (i + Uchar.utf_decode_length d) (base (Uchar.utf_decode_uchar d) :: acc)
  in
  go 0 []

let strokes s =
  List.concat
    (List.mapi (fun i c -> List.map (List.map (fun q -> V2.add q (V2.v (5. *. float i) 0.))) (glyph c)) (chars s))

let width ~size s = match chars s with [] -> 0. | l -> (5. *. float (List.length l) -. 1.) *. size /. 6.

(* Rectangle d'épaisseur w autour du segment [a, b], bouts carrés (sens direct). *)
let bar w a b =
  let d = V2.sub b a in
  let u = if V2.norm d < 1e-12 then V2.v 1. 0. else V2.normalize d in
  let n = V2.v (-.u.y) u.x and h = w /. 2. in
  let a' = V2.sub a (V2.scale h u) and b' = V2.add b (V2.scale h u) in
  Cad.Profile.polygon
    [ V2.sub a' (V2.scale h n); V2.sub b' (V2.scale h n); V2.add b' (V2.scale h n); V2.add a' (V2.scale h n) ]

let profile ?(center = false) ?stroke ~size s =
  if size <= 0. then invalid_arg "Text.profile : size <= 0";
  let w = match stroke with Some w -> w | None -> size /. 7. in
  if w <= 0. then invalid_arg "Text.profile : stroke <= 0";
  let k = size /. 6. in
  let shift = if center then V2.v (-.width ~size s /. 2.) (-.size /. 2.) else V2.zero in
  let pt q = V2.add (V2.scale k q) shift in
  let bars =
    List.concat_map
      (function
        | [ q ] -> [ bar w (pt q) (pt q) ]
        | l -> List.concat (List.mapi (fun i q -> match List.nth_opt l (i + 1) with Some r -> [ bar w (pt q) (pt r) ] | None -> []) l))
      (strokes s)
  in
  match bars with [] -> Cad.Profile.polygon [] | b :: rest -> List.fold_left Cad.Profile.union b rest
