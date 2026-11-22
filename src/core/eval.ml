type quality = { chord_tol : float; min_segments : int; max_segments : int }

let default_quality = { chord_tol = 0.01; min_segments = 12; max_segments = 360 }
let segments _ ~r:_ ~deg:_ = Todo.todo "Eval.segments"

module Make (K : Kernel.S) = struct
  type t = { quality : quality; solids : (int, K.solid) Hashtbl.t }

  let create ?(quality = default_quality) () = { quality; solids = Hashtbl.create 64 }
  let solid _ _ : K.solid = Todo.todo "Eval.solid"
  let section _ _ : K.section = Todo.todo "Eval.section"
  let mesh _ _ = Todo.todo "Eval.mesh"
  let stats _ = Todo.todo "Eval.stats"
  let clear c = ignore c.quality; Hashtbl.reset c.solids
end
