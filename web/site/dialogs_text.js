// Texte sur une face (Black Book ch. 2, Text ; ch. 3, Emboss) : police à traits de
// Cad_parts.Text, en relief (Joindre) ou gravé (Couper), centré au point cliqué.
import * as THREE from 'three';
import { el } from './timeline.js';
import { num, choice, row } from './dialogs.js';
import { frameCode } from './planes.js';

const lit = (x) => { const s = Number(Number(x).toPrecision(10)).toString(); return /[.e]/.test(s) ? s : s + '.'; };
const litp = (x) => (Number(x) < 0 ? `(${lit(x)})` : lit(x));
// Chaîne OCaml : guillemets et barres échappés, caractères de contrôle retirés.
const ocamlString = (s) => `"${s.replace(/[\u0000-\u001f]/g, '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export function textDialog(d, p, face) {
  // Texte lisible : axe x du texte = X du monde projeté sur la face (Y si la face lui est normale).
  const z = face.z.clone().normalize(), ref = Math.abs(z.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const x = ref.clone().addScaledVector(z, -ref.dot(z)).normalize(), frame = { origin: p, x, y: z.clone().cross(x), z };
  const P = { text: 'CAMLCAD', size: 6, depth: 1, angle: 0, op: 'join' };
  const preview = () => {
    const n = [...P.text].length, w = Math.max(0, (5 * n - 1) * P.size / 6) + P.size / 7, h = P.size + P.size / 7;
    const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, P.depth));
    g.geometry.rotateZ((P.angle * Math.PI) / 180);
    g.geometry.translate(0, 0, P.op === 'cut' ? -P.depth / 2 : P.depth / 2);
    g.matrixAutoUpdate = false; g.matrix.makeBasis(frame.x, frame.y, frame.z).setPosition(p);
    d.setPreview(g, P.op === 'cut' ? 0xe74c3c : 0x2ecc71);
  };
  const input = el('input', { value: P.text, id: 'text-value' });
  input.oninput = () => { P.text = input.value; preview(); };
  d.open('TEXTE', [
    row('Texte', input),
    row('Hauteur', num(P.size, (v) => { P.size = v; preview(); }, { min: 0 }), el('span', { className: 'unit', textContent: 'mm' })),
    row('Épaisseur', num(P.depth, (v) => { P.depth = v; preview(); }, { min: 0 }), el('span', { className: 'unit', textContent: 'mm' })),
    row('Rotation', num(P.angle, (v) => { P.angle = v; preview(); }), el('span', { className: 'unit', textContent: '°' })),
    row('Opération', choice({ join: 'Relief (joindre)', cut: 'Gravure (couper)' }, P.op, (v) => { P.op = v; preview(); })),
  ], {
    key: 'text',
    ok: () => {
      if (!P.text.trim() || !(P.size > 0 && P.depth > 0)) return false;
      const n = d.ctx.nextIndex(), name = `texte${n}`, plan = `plan${n}`;
      const prof = `Cad_parts.Text.profile ~center:true ~size:${lit(P.size)} ${ocamlString(P.text)}`;
      const rot = P.angle ? ` |> rotate ~axis:Geom.V3.ez ~deg:${litp(P.angle)}` : '';
      const body = P.op === 'cut'
        ? `extrude ~h:${lit(P.depth + 0.01)} (${prof}) |> translate (Geom.V3.v 0. 0. ${litp(-P.depth)})`
        : `extrude ~h:${lit(P.depth)} (${prof})`;
      d.ctx.insert(`  let ${plan} = ${frameCode({ ...frame, origin: p })} in\n  let%feat ${name} =\n    Shape.(${body}${rot} |> place ${plan})\n  in\n`, name, P.op, n);
    },
  });
  preview();
}
