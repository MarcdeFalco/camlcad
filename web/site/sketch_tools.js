// Outils de création d'esquisse à deux clics (comme le chapitre « Sketching » d'un
// modeleur) : chacun ajoute points, lignes, boucles et contraintes à l'éditeur `ed`
// (SketchEditor) à partir du premier point (indice `a`) et du second clic `q`.
// Une ligne hors de toute boucle est une ligne de construction (pas de matière).

const add = (ed, x, y) => (ed.pts.push({ x, y, fixed: false }), ed.pts.length - 1);
const cons = (ed, kind, refs, value) => ed.cons.push(value === undefined ? { kind, refs } : { kind, refs, value });

// Rectangle par deux coins : quatre lignes, horizontales et verticales.
function rect2(ed, a, q) {
  const A = ed.pts[a];
  if (Math.abs(q.x - A.x) < 1e-6 || Math.abs(q.y - A.y) < 1e-6) return false;
  const c = ed.pointAt(q), b = add(ed, q.x, A.y), d = add(ed, A.x, q.y), l = ed.lines.length;
  ed.lines.push([a, b], [b, c], [c, d], [d, a]);
  ed.loops.push([a, b, c, d]);
  ['horizontal', 'vertical', 'horizontal', 'vertical'].forEach((k, i) => cons(ed, k, [l + i]));
  return true;
}

// Rectangle par le centre : le centre est le milieu d'une diagonale de construction.
function rectCenter(ed, o, q) {
  const O = ed.pts[o], dx = q.x - O.x, dy = q.y - O.y;
  if (Math.abs(dx) < 1e-6 || Math.abs(dy) < 1e-6) return false;
  const a = add(ed, O.x - dx, O.y - dy), b = add(ed, O.x + dx, O.y - dy), c = add(ed, O.x + dx, O.y + dy), d = add(ed, O.x - dx, O.y + dy);
  const l = ed.lines.length;
  ed.lines.push([a, b], [b, c], [c, d], [d, a], [a, c]);
  ed.loops.push([a, b, c, d]);
  ['horizontal', 'vertical', 'horizontal', 'vertical'].forEach((k, i) => cons(ed, k, [l + i]));
  cons(ed, 'midpoint', [o, l + 4]);
  return true;
}

// Polygone régulier inscrit : sommets à égale distance du centre, côtés égaux.
function polygon(ed, o, q, n) {
  const O = ed.pts[o], r = Math.hypot(q.x - O.x, q.y - O.y), a0 = Math.atan2(q.y - O.y, q.x - O.x);
  if (r < 1e-6) return false;
  const vs = Array.from({ length: n }, (_, k) => add(ed, O.x + r * Math.cos(a0 + (2 * Math.PI * k) / n), O.y + r * Math.sin(a0 + (2 * Math.PI * k) / n)));
  // Côtés, puis rayons de construction du centre à chaque sommet (rayon coté une fois :
  // le changer agrandit tout le polygone).
  const l = ed.lines.length;
  vs.forEach((v, k) => ed.lines.push([v, vs[(k + 1) % n]]));
  vs.forEach((v) => ed.lines.push([o, v]));
  ed.loops.push(vs);
  for (let k = 1; k < n; k++) { cons(ed, 'equal_length', [l, l + k]); cons(ed, 'equal_length', [l + n, l + n + k]); }
  cons(ed, 'length', [l + n], r);
  return true;
}

function circle(ed, c, q) {
  const C = ed.pts[c];
  ed.circles.push({ c, r: Math.max(0.5, Math.hypot(q.x - C.x, q.y - C.y)) });
  return true;
}

import { slot } from './sketch_arcs.js';

// Outils à deux clics : nom → [création, texte de la mesure pendant le tracé].
const fmt = (x) => Number((Math.round(x * 100) / 100).toFixed(2)).toString();
export const TWO_CLICK = {
  rect: [rect2, (A, q) => `${fmt(Math.abs(q.x - A.x))} × ${fmt(Math.abs(q.y - A.y))} mm`],
  crect: [rectCenter, (A, q) => `${fmt(2 * Math.abs(q.x - A.x))} × ${fmt(2 * Math.abs(q.y - A.y))} mm`],
  circle: [circle, (A, q) => `R ${fmt(Math.hypot(q.x - A.x, q.y - A.y))} mm`],
  slot: [slot, (A, q) => `entraxe ${fmt(Math.hypot(q.x - A.x, q.y - A.y))} mm`],
  polygon: [polygon, (A, q) => `R ${fmt(Math.hypot(q.x - A.x, q.y - A.y))} mm`],
};

// Contour élastique (pointillés) de l'outil en cours, en coordonnées du plan.
export function rubberShape(tool, A, q, n) {
  if (tool === 'rect') return [A, { x: q.x, y: A.y }, q, { x: A.x, y: q.y }, A];
  if (tool === 'crect') { const dx = q.x - A.x, dy = q.y - A.y; return [{ x: A.x - dx, y: A.y - dy }, { x: A.x + dx, y: A.y - dy }, { x: A.x + dx, y: A.y + dy }, { x: A.x - dx, y: A.y + dy }, { x: A.x - dx, y: A.y - dy }]; }
  if (tool === 'slot') {
    const L = Math.hypot(q.x - A.x, q.y - A.y) || 1, r = L / 6, t = Math.atan2(q.y - A.y, q.x - A.x), out = [];
    for (let k = 0; k <= 16; k++) { const u = t + Math.PI / 2 + (Math.PI * k) / 16; out.push({ x: A.x + r * Math.cos(u), y: A.y + r * Math.sin(u) }); }
    for (let k = 0; k <= 16; k++) { const u = t - Math.PI / 2 + (Math.PI * k) / 16; out.push({ x: q.x + r * Math.cos(u), y: q.y + r * Math.sin(u) }); }
    return [...out, out[0]];
  }
  const r = Math.hypot(q.x - A.x, q.y - A.y), a0 = Math.atan2(q.y - A.y, q.x - A.x), m = tool === 'polygon' ? n : 64;
  return Array.from({ length: m + 1 }, (_, k) => ({ x: A.x + r * Math.cos(a0 + (2 * Math.PI * k) / m), y: A.y + r * Math.sin(a0 + (2 * Math.PI * k) / m) }));
}
