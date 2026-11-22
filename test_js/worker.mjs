// Le worker de l'éditeur web sous Node : compilation par le toplevel (avec le ppx),
// curseurs sans recompilation, erreurs localisées. Sortie déterministe (sans durées).
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
const m = await readyP;
console.log('ready', m.kind);
const show = (label, m) => {
  if (m.ok) {
    const j = JSON.parse(m.journal);
    console.log(`${label} : ${m.triangles.length / 3 > 0} ; params ${j.params.map((p) => `${p.name}=${p.value}`).join(' ')} ; features ${j.features.map((f) => `${f.name}@${f.loc.line}`).join(' ')}`);
  } else console.log(`${label} : erreur ${JSON.stringify({ ...m.error, message: m.error.message.trim().split('\n').at(-1).replace(/\s+/g, ' ').trim() })}`);
};
for (const ex of ['support', 'charniere', 'engrenage']) {
  const code = fs.readFileSync(path.join(dir, ex + '.ml'), 'utf8');
  show(ex, await ask({ kind: 'eval', id: 1, code }));
}
show('curseur dents=30', await ask({ kind: 'params', id: 2, overrides: [['dents', 30]] }));
show('hors bornes', await ask({ kind: 'params', id: 3, overrides: [['dents', 300]] }));
show('inconnu', await ask({ kind: 'params', id: 3, overrides: [['dent', 3]] }));
const f = await ask({ kind: 'feature', id: 4, fid: 0 });
console.log('feature 0 :', f.kind, f.fid, f.triangles.length > 0);
show('model mal typé', await ask({ kind: 'eval', id: 5, code: 'open Cad\nlet model = Doc.return 3\n' }));
show('erreur de typage', await ask({ kind: 'eval', id: 5, code: 'open Cad\nlet model =\n  Doc.return (Shape.sphere ~r:"5")\n' }));
show('exception', await ask({ kind: 'eval', id: 5, code: 'let model = failwith "boum"\n' }));
show('sans model', await ask({ kind: 'eval', id: 6, code: 'let x = 1\n' }));
show('ppx', await ask({ kind: 'eval', id: 7, code: 'open Cad\nlet model =\n  let%param r = 5. in\n  let%feat boule = Shape.sphere ~r in\n  Doc.return boule\n' }));

{
  const code = fs.readFileSync(path.join(dir, 'bielle.ml'), 'utf8');
  const m = await ask({ kind: 'eval', id: 8, code });
  console.log('bielle :', m.ok, m.mode, m.parts.map((p) => p.name).join(','), m.coords.map((c) => `${c.name}[${c.lo},${c.hi}]${c.unit}`).join(' '), m.matrices.length, m.interferences.length);
  for (const q of [0, 90, 180]) {
    const p = await ask({ kind: 'pose', id: 9, overrides: [['manivelle', q]] });
    const x = p.pose.find(([n]) => n === 'coulisseau')[1];
    console.log(`pose manivelle=${q} : coulisseau=${x.toFixed(3)} interférences=${p.interferences.length}`);
  }
  const bad = await ask({ kind: 'params', id: 10, overrides: [['jeu', -0.5]] });
  console.log('jeu négatif :', bad.ok, bad.interferences.join(' | '));
}
{
  const code = fs.readFileSync(path.join(dir, 'support.ml'), 'utf8');
  await ask({ kind: 'eval', id: 11, code });
  const pick = async (label, point) => {
    const m = await ask({ kind: 'pick', id: 12, point });
    console.log(`clic ${label} : feature ${m.fid}`);
  };
  await pick('dessus de la semelle', [30, 20, 4]);
  await pick('paroi d\'un trou', [12.5, 12.5, 2]);
  await pick('face de l\'aile', [30, 0, 25]);
  await pick('dans le vide', [500, 500, 500]);
}
{
  const code = fs.readFileSync(path.join(dir, 'engrenages.ml'), 'utf8');
  await ask({ kind: 'eval', id: 13, code });
  await ask({ kind: 'pose', id: 14, overrides: [['roue1', 10]] });
  const m = await ask({ kind: 'export3mf', id: 15 });
  const txt = Buffer.from(m.data).toString('latin1');
  console.log('3MF engrenages :', txt.startsWith('PK'), (txt.match(/<object /g) || []).length, 'objets,', (txt.match(/<item /g) || []).length, 'items');
}
