type t = { vertices : float array; triangles : int array }

let empty = { vertices = [||]; triangles = [||] }
let n_vertices m = Array.length m.vertices / 3
let n_triangles m = Array.length m.triangles / 3
let vertex _ _ = Todo.todo "Mesh.vertex"
let triangle _ _ = Todo.todo "Mesh.triangle"
let volume _ = Todo.todo "Mesh.volume"
let bbox _ = Todo.todo "Mesh.bbox"
let is_closed _ = Todo.todo "Mesh.is_closed"
let euler_characteristic _ = Todo.todo "Mesh.euler_characteristic"
