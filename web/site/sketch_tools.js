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

// Polygone circonscrit : q est le milieu d'un côté ; la cote est l'apothème (distance du
// centre au côté), côtés et rayons égaux.
function cpolygon(ed, o, q, n) {
  const O = ed.pts[o], r = Math.hypot(q.x - O.x, q.y - O.y), a0 = Math.atan2(q.y - O.y, q.x - O.x), R = r / Math.cos(Math.PI / n);
  if (r < 1e-6) return false;
  const vs = Array.from({ length: n }, (_, k) => { const a = a0 - Math.PI / n + (2 * Math.PI * k) / n; return add(ed, O.x + R * Math.cos(a), O.y + R * Math.sin(a)); });
  const l = ed.lines.length;
  vs.forEach((v, k) => ed.lines.push([v, vs[(k + 1) % n]]));
  vs.forEach((v) => ed.lines.push([o, v]));
  ed.loops.push(vs);
  for (let k = 1; k < n; k++) { cons(ed, 'equal_length', [l, l + k]); cons(ed, 'equal_length', [l + n, l + n + k]); }
  cons(ed, 'point_line_distance', [o, l], r);
  return true;
}

function circle(ed, c, q) {
  const C = ed.pts[c];
  ed.circles.push({ c, r: Math.max(0.5, Math.hypot(q.x - C.x, q.y - C.y)) });
  return true;
}

import { slot } from './sketch_arcs.js';

// Inférence (comme un modeleur) : un point posé sur une ligne y est contraint (au milieu s'il
// en est proche), posé sur un cercle aussi ; n : élément le plus proche (SketchEditor.nearest).
export function inferPoint(ed, q, n) {
  // Grille d'accroche (option de la palette) : au millimètre, hors accroche sur un élément.
  const grid = !n && document.getElementById('snap-grid')?.checked;
  const at = grid ? { x: Math.round(q.x), y: Math.round(q.y) } : { x: q.x, y: q.y }, t = ed.tol();
  let c = null;
  if (n?.kind === 'l') {
    const [a, b] = ed.lines[n.i], A = ed.pts[a], B = ed.pts[b], dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy || 1;
    const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    if (Math.hypot(q.x - M.x, q.y - M.y) < t) { Object.assign(at, M); c = ['midpoint', n.i]; }
    else { const u = ((q.x - A.x) * dx + (q.y - A.y) * dy) / L2; at.x = A.x + u * dx; at.y = A.y + u * dy; c = ['on_line', n.i]; }
  } else if (n?.kind === 'c') {
    const C = ed.pts[ed.circles[n.i].c], r = ed.circles[n.i].r, d = Math.hypot(q.x - C.x, q.y - C.y) || 1;
    at.x = C.x + ((q.x - C.x) * r) / d; at.y = C.y + ((q.y - C.y) * r) / d; c = ['on_circle', n.i];
  }
  ed.pts.push({ ...at, fixed: ed.pts.length === 0 });
  const p = ed.pts.length - 1;
  if (c) ed.cons.push({ kind: c[0], refs: [p, c[1]] });
  return p;
}

// Outils à deux clics : nom → [création, texte de la mesure pendant le tracé].
const fmt = (x) => Number((Math.round(x * 100) / 100).toFixed(2)).toString();
// Cercle par deux points (diamètre) : centre au milieu d'une ligne de construction.
function circle2(ed, a, q) {
  const A = ed.pts[a];
  if (Math.hypot(q.x - A.x, q.y - A.y) < 1e-3) return false;
  const b = ed.pointAt(q), B = ed.pts[b], c = add(ed, (A.x + B.x) / 2, (A.y + B.y) / 2), l = ed.lines.length, ci = ed.circles.length;
  ed.lines.push([a, b]);
  ed.circles.push({ c, r: Math.hypot(B.x - A.x, B.y - A.y) / 2 });
  cons(ed, 'midpoint', [c, l]); cons(ed, 'on_circle', [a, ci]);
  return true;
}

// Centre du cercle passant par trois points (null s'ils sont alignés).
function circumcenter(A, B, Q) {
  const d = 2 * (A.x * (B.y - Q.y) + B.x * (Q.y - A.y) + Q.x * (A.y - B.y));
  if (Math.abs(d) < 1e-9) return null;
  const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, q2 = Q.x * Q.x + Q.y * Q.y;
  return { x: (a2 * (B.y - Q.y) + b2 * (Q.y - A.y) + q2 * (A.y - B.y)) / d, y: (a2 * (Q.x - B.x) + b2 * (A.x - Q.x) + q2 * (B.x - A.x)) / d };
}

// Outils à trois clics (deux points, puis q) : rectangle par trois points (incliné), cercle
// par trois points, arc par trois points (début, fin, un point de l'arc).
export const THREE_CLICK = {
  rect3(ed, a, b, q) {
    const A = ed.pts[a], B = ed.pts[b], L = Math.hypot(B.x - A.x, B.y - A.y);
    if (L < 1e-6) return false;
    const n = { x: -(B.y - A.y) / L, y: (B.x - A.x) / L }, w = (q.x - A.x) * n.x + (q.y - A.y) * n.y;
    if (Math.abs(w) < 1e-6) return false;
    const c = add(ed, B.x + w * n.x, B.y + w * n.y), d = add(ed, A.x + w * n.x, A.y + w * n.y), l = ed.lines.length;
    ed.lines.push([a, b], [b, c], [c, d], [d, a]);
    ed.loops.push([a, b, c, d]);
    cons(ed, 'perpendicular', [l, l + 1]); cons(ed, 'parallel', [l, l + 2]); cons(ed, 'parallel', [l + 1, l + 3]);
    return true;
  },
  circle3(ed, a, b, q) {
    const O = circumcenter(ed.pts[a], ed.pts[b], q);
    if (!O) return false;
    const p = ed.pointAt(q), c = add(ed, O.x, O.y), ci = ed.circles.length;
    ed.circles.push({ c, r: Math.hypot(q.x - O.x, q.y - O.y) });
    for (const x of [a, b, p]) cons(ed, 'on_circle', [x, ci]);
    return true;
  },
  arc3(ed, a, b, q) {
    const A = ed.pts[a], B = ed.pts[b], O = circumcenter(A, B, q);
    if (!O) return false;
    const ang = (P) => Math.atan2(P.y - O.y, P.x - O.x), tau = 2 * Math.PI, ccw = (x, y) => (((y - x) % tau) + tau) % tau;
    const c = add(ed, O.x, O.y), through = ccw(ang(A), ang(q)) < ccw(ang(A), ang(B));
    ed.arcs.push(through ? { c, a, b } : { c, a: b, b: a });
    return true;
  },
};

// Oblong par le centre (ch. 2, Center Point Slot) : centre, puis centre d'une extrémité ;
// l'autre centre est symétrique, le centre reste au milieu (ligne de construction).
function cslot(ed, o, q) {
  const O = ed.pts[o];
  if (Math.hypot(q.x - O.x, q.y - O.y) < 1e-6) return false;
  const c1 = add(ed, 2 * O.x - q.x, 2 * O.y - q.y);
  if (!slot(ed, c1, q)) return false;
  const c2 = ed.arcs[ed.arcs.length - 1].c, l = ed.lines.length;
  ed.lines.push([c1, c2]);
  cons(ed, 'midpoint', [o, l]);
  return true;
}

export const TWO_CLICK = {
  cslot: [cslot, (A, q) => `entraxe ${fmt(2 * Math.hypot(q.x - A.x, q.y - A.y))} mm`],
  circle2: [circle2, (A, q) => `Ø ${fmt(Math.hypot(q.x - A.x, q.y - A.y))} mm`],
  rect: [rect2, (A, q) => `${fmt(Math.abs(q.x - A.x))} × ${fmt(Math.abs(q.y - A.y))} mm`],
  crect: [rectCenter, (A, q) => `${fmt(2 * Math.abs(q.x - A.x))} × ${fmt(2 * Math.abs(q.y - A.y))} mm`],
  circle: [circle, (A, q) => `R ${fmt(Math.hypot(q.x - A.x, q.y - A.y))} mm`],
  slot: [slot, (A, q) => `entraxe ${fmt(Math.hypot(q.x - A.x, q.y - A.y))} mm`],
  polygon: [polygon, (A, q) => `R ${fmt(Math.hypot(q.x - A.x, q.y - A.y))} mm`],
  cpolygon: [cpolygon, (A, q) => `apothème ${fmt(Math.hypot(q.x - A.x, q.y - A.y))} mm`],
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

// Outil Courbe (spline, ch. 2) : chaque clic ajoute un point de passage ; cliquer le premier
// ferme la courbe, qui devient un contour. Rend vrai si l'esquisse a changé.
export function splineClick(ed, q) {
  const i = ed.pointAt(q);
  if (!ed.spl) { ed.spl = [i]; return false; }
  if (i === ed.spl[0] && ed.spl.length >= 3) { ed.loops.push([{ s: [...ed.spl, i] }]); ed.spl = null; return true; }
  if (i !== ed.spl[ed.spl.length - 1]) ed.spl.push(i);
  return false;
}

// Ellipse (ch. 2) : centre, extrémité du grand axe, puis un point qui donne le demi-petit axe
// (sa distance au grand axe). Rend vrai à la création.
export function ellipseClick(ed, q) {
  if (ed.pending == null) { ed.pending = ed.pointAt(q); return false; }
  if (ed.pending2 == null) { ed.pending2 = ed.pointAt(q); return false; }
  const C = ed.pts[ed.pending], A = ed.pts[ed.pending2], L = Math.hypot(A.x - C.x, A.y - C.y) || 1;
  const ry = Math.abs(((q.x - C.x) * (A.y - C.y) - (q.y - C.y) * (A.x - C.x)) / L);
  if (ry > 1e-3) ed.ellipses.push({ c: ed.pending, a: ed.pending2, ry: Math.round(ry * 100) / 100 });
  ed.pending = ed.pending2 = null;
  return ry > 1e-3;
}
export function ellipseOutline(ed, e) {
  const C = ed.pts[e.c], A = ed.pts[e.a], rx = Math.hypot(A.x - C.x, A.y - C.y) || 1, ux = (A.x - C.x) / rx, uy = (A.y - C.y) / rx;
  return Array.from({ length: 64 }, (_, k) => { const t = (2 * Math.PI * k) / 64, a = rx * Math.cos(t), b = e.ry * Math.sin(t); return { x: C.x + a * ux - b * uy, y: C.y + a * uy + b * ux }; });
}
