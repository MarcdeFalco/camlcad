// Charge manifold-3d, l'expose à OCaml, puis exécute le programme js_of_ocaml.
import Module from 'manifold-3d';
import { createRequire } from 'node:module';
import path from 'node:path';

const wasm = await Module();
wasm.setup();
globalThis.__manifold = wasm;
createRequire(import.meta.url)(path.resolve(process.argv[2]));
