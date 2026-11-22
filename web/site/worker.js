// Worker module : charge manifold-3d, puis le toplevel OCaml (script classique).
import Module from 'https://cdn.jsdelivr.net/npm/manifold-3d@3.2.1/manifold.js';

const wasm = await Module();
wasm.setup();
globalThis.__manifold = wasm;
const src = await (await fetch('toplevel.js')).text();
(0, eval)(src); // définit onmessage puis envoie {kind:"ready"}
