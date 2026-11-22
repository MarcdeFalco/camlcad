let model = ref None
let set m = model := Some m
let get () = !model
let clear () = model := None
