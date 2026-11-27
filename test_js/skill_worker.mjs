// Exemples de la skill (skills/camlcad/examples) ouverts comme dans l'éditeur : chaque
// fichier, tel quel, est compilé par le toplevel du worker (ppx compris) puis évalué.
import Module from 'manifold-3d';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const [top, dir] = process.argv.slice(2);
const wasm = await Module(); wasm.setup(); globalThis.__manifold = wasm;
let resolve;
globalThis.postMessage = (m) => resolve(m);
const ask = (msg) => new Promise((r) => { resolve = r; if (msg) globalThis.onmessage({ data: { overrides: [], ...msg } }); });
const readyP = ask(null);
createRequire(import.meta.url)(path.resolve(top));
await readyP;
for (const ex of ['boite', 'equerre', 'molette', 'cremaillere']) {
  const code = fs.readFileSync(path.join(dir, ex + '.ml'), 'utf8');
  const m = await ask({ kind: 'eval', id: 1, code });
  if (!m.ok) { console.log(`${ex} : erreur l.${m.error.line} ${m.error.message.trim().split('\n').at(-1)}`); continue; }
  const j = JSON.parse(m.journal);
  const params = j.params.map((p) => `${p.name}=${p.value}`).join(' ');
  if (m.mode === 'mech')
    console.log(`${ex} : mécanisme ; params ${params} ; pièces ${m.parts.map((p) => p.name).join(',')} ; coordonnées ${m.coords.map((c) => c.name).join(',')} ; interférences ${m.interferences.length}`);
  else
    console.log(`${ex} : ${m.triangles.length > 0} ; params ${params} ; features ${j.features.map((f) => `${f.name}@${f.loc.line}`).join(' ')}`);
}
