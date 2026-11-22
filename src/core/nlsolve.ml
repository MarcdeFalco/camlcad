type report = { converged : bool; iterations : int; residual : float; rank : int }

let norm_inf a = Array.fold_left (fun m x -> Float.max m (Float.abs x)) 0. a
let norm2 a = Array.fold_left (fun s x -> s +. (x *. x)) 0. a

let jacobian ~n ~m f x =
  let j = Array.make_matrix m n 0. in
  let x = Array.copy x in
  for k = 0 to n - 1 do
    let xk = x.(k) in
    let h = 1e-7 *. Float.max 1. (Float.abs xk) in
    x.(k) <- xk +. h;
    let fp = f x in
    x.(k) <- xk -. h;
    let fm = f x in
    x.(k) <- xk;
    for i = 0 to m - 1 do
      j.(i).(k) <- (fp.(i) -. fm.(i)) /. (2. *. h)
    done
  done;
  j

let rank ?(eps = 1e-8) a =
  let m = Array.length a in
  if m = 0 then 0
  else
    let n = Array.length a.(0) in
    let a = Array.map Array.copy a in
    let scale = Array.fold_left (fun s row -> Float.max s (norm_inf row)) 0. a in
    if scale = 0. then 0
    else
      let r = ref 0 in
      let rows = Array.init m Fun.id and cols = Array.init n Fun.id in
      (try
         while !r < min m n do
           (* pivot total parmi les lignes/colonnes restantes *)
           let best = ref 0. and bi = ref 0 and bj = ref 0 in
           for i = !r to m - 1 do
             for j = !r to n - 1 do
               let v = Float.abs a.(rows.(i)).(cols.(j)) in
               if v > !best then (best := v; bi := i; bj := j)
             done
           done;
           if !best <= eps *. scale then raise Exit;
           let swap t i j = let x = t.(i) in t.(i) <- t.(j); t.(j) <- x in
           swap rows !r !bi;
           swap cols !r !bj;
           let p = a.(rows.(!r)).(cols.(!r)) in
           for i = !r + 1 to m - 1 do
             let f = a.(rows.(i)).(cols.(!r)) /. p in
             if f <> 0. then
               for j = !r to n - 1 do
                 a.(rows.(i)).(cols.(j)) <- a.(rows.(i)).(cols.(j)) -. (f *. a.(rows.(!r)).(cols.(j)))
               done
           done;
           incr r
         done
       with Exit -> ());
      !r

(* Résout A y = b (A carrée m×m) par Gauss à pivot partiel ; A et b détruits. *)
let lin_solve a b =
  let m = Array.length b in
  for k = 0 to m - 1 do
    let p = ref k in
    for i = k + 1 to m - 1 do
      if Float.abs a.(i).(k) > Float.abs a.(!p).(k) then p := i
    done;
    let t = a.(k) in a.(k) <- a.(!p); a.(!p) <- t;
    let t = b.(k) in b.(k) <- b.(!p); b.(!p) <- t;
    let piv = a.(k).(k) in
    if piv <> 0. then
      for i = k + 1 to m - 1 do
        let f = a.(i).(k) /. piv in
        if f <> 0. then begin
          for j = k to m - 1 do a.(i).(j) <- a.(i).(j) -. (f *. a.(k).(j)) done;
          b.(i) <- b.(i) -. (f *. b.(k))
        end
      done
  done;
  let y = Array.make m 0. in
  for k = m - 1 downto 0 do
    let s = ref b.(k) in
    for j = k + 1 to m - 1 do s := !s -. (a.(k).(j) *. y.(j)) done;
    y.(k) <- (if a.(k).(k) = 0. then 0. else !s /. a.(k).(k))
  done;
  y

let solve ?(tol = 1e-9) ?(max_iter = 100) ~n ~m f x0 =
  if Array.length x0 <> n then invalid_arg "Nlsolve.solve : taille de x0";
  let x = ref (Array.copy x0) in
  let r = ref (f !x) in
  let lambda = ref 1e-10 in
  let it = ref 0 in
  let stuck = ref false in
  while norm_inf !r > tol && !it < max_iter && not !stuck do
    incr it;
    let j = jacobian ~n ~m f !x in
    (* J J^T *)
    let jjt = Array.init m (fun i -> Array.init m (fun k ->
      let s = ref 0. in
      for c = 0 to n - 1 do s := !s +. (j.(i).(c) *. j.(k).(c)) done;
      !s)) in
    let scale = Array.fold_left (fun s row -> Float.max s (norm_inf row)) 1e-30 jjt in
    let accepted = ref false and tries = ref 0 in
    while (not !accepted) && !tries < 30 do
      incr tries;
      let a = Array.mapi (fun i row -> Array.mapi (fun k v -> if i = k then v +. (!lambda *. scale) else v) row) jjt in
      let y = lin_solve a (Array.copy !r) in
      let x' = Array.init n (fun c ->
        let s = ref 0. in
        for i = 0 to m - 1 do s := !s +. (j.(i).(c) *. y.(i)) done;
        !x.(c) -. !s) in
      let r' = f x' in
      if norm2 r' < norm2 !r then begin
        x := x'; r := r'; accepted := true;
        lambda := Float.max 1e-12 (!lambda /. 10.)
      end
      else lambda := !lambda *. 10.
    done;
    if not !accepted then stuck := true
  done;
  let res = norm_inf !r in
  let rk = if m = 0 then 0 else rank (jacobian ~n ~m f !x) in
  (!x, { converged = res <= tol; iterations = !it; residual = res; rank = rk })
