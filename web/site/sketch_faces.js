// Profils comme les régions d'un modeleur : au moment d'extruder, les courbes de profil
// (lignes, arcs, cercles) sont coupées à leurs intersections, et les contours deviennent les
// faces du dessin ainsi découpé. Un cercle qui ferme le contour d'une bride en est un bord
// et reste aussi une région à part ; deux rectangles qui se croisent donnent trois régions.
// Les courbes coupées le sont dans l'esquisse (points d'intersection contraints sur leurs
// courbes), si bien que le code reste paramétrique.
import { key, split, splitArc, arcGeo, circleTs, TAU, ccwd } from './sketch_trim.js';
import { loopPoints } from './sketch_arcs.js';
import { deleteSelection } from './sketch_delete.js';

const E = 1e-6;
const near = (P, Q) => Math.hypot(P.x - Q.x, P.y - Q.y) < 0.05; // contacts presque tangents : le point calculé retombe sur le sommet tracé

// Arêtes de profil actuelles : lignes (clés) et arcs.
function profileSets(ed) {
  const lines = new Set(ed.openProfile ?? []), arcs = new Set(ed.openArcs ?? []);
  for (const l of ed.loops) {
    const arcIn = l.filter((it) => typeof it !== 'number' && !it.s).map((it) => it.a ?? it.r);
    arcIn.forEach((k) => arcs.add(k));
    const pairs = new Set(arcIn.map((k) => key(ed.arcs[k].a, ed.arcs[k].b))), s = loopPoints(ed, l);
    s.forEach((p, i) => { const q = s[(i + 1) % s.length]; if (p !== q && !pairs.has(key(p, q))) lines.add(key(p, q)); });
  }
  return { lines, arcs };
}
// Point d'intersection : un point existant s'il est là, sinon un nouveau.
function pointAtXY(ed, P) {
  const i = ed.pts.findIndex((o) => near(o, P));
  return i >= 0 ? i : ed.pts.push({ x: P.x, y: P.y, fixed: false }) - 1;
}
// La ligne j est coupée en n (si n n'en est pas une extrémité) ; une cote de longueur devient
// la distance de ses extrémités d'origine.
function cutLine(ed, j, n, prof) {
  const [a, b] = ed.lines[j];
  if (n === a || n === b) return false;
  for (const c of ed.cons) if (c.kind === 'length' && c.refs[0] === j) { c.kind = 'distance'; c.refs = [a, b]; }
  const lineProf = prof.lines.has(key(a, b));
  split(ed, j, n);
  if (lineProf) { prof.lines.add(key(a, n)); prof.lines.add(key(n, b)); }
  return true;
}
function cutArc(ed, k, n, prof) {
  const { a, b } = ed.arcs[k];
  if (n === a || n === b) return false;
  const k2 = splitArc(ed, k, n, new Set());
  prof.arcs.add(k); prof.arcs.add(k2);
  return true;
}
const onArc = (ed, k, P) => { const g = arcGeo(ed, k), t = ccwd(Math.atan2(P.y - g.C.y, P.x - g.C.x) - g.ta); return t < g.span + E || t > TAU - E; };
// Intersections de deux cercles (centres C, D ; rayons r, s).
function circles2(C, r, D, s) {
  const dx = D.x - C.x, dy = D.y - C.y, d = Math.hypot(dx, dy);
  if (d < 1e-9 || d > r + s + 1e-6 || d < Math.abs(r - s) - 1e-6) return [];
  const a = (r * r - s * s + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r * r - a * a)), mx = C.x + (a * dx) / d, my = C.y + (a * dy) / d;
  return (h < 1e-7 ? [0] : [-1, 1]).map((g) => ({ x: mx - (g * h * dy) / d, y: my + (g * h * dx) / d }));
}

// Coupe une intersection (la première trouvée) ; rend vrai si l'esquisse a changé.
function cutOne(ed, prof, onCircle) {
  const L = ed.lines.map((l, j) => [l, j]).filter(([[a, b]]) => prof.lines.has(key(a, b))), A = [...prof.arcs].filter((k) => ed.arcs[k]);
  const P = (i) => ed.pts[i];
  for (const [[a, b], i] of L) for (const [[c, d], j] of L) {
    if (j <= i) continue;
    const r = { x: P(b).x - P(a).x, y: P(b).y - P(a).y }, u = { x: P(d).x - P(c).x, y: P(d).y - P(c).y }, den = r.x * u.y - r.y * u.x;
    if (Math.abs(den) < 1e-12) continue;
    const w = { x: P(c).x - P(a).x, y: P(c).y - P(a).y }, t = (w.x * u.y - w.y * u.x) / den, s = (w.x * r.y - w.y * r.x) / den;
    if (t < -E || t > 1 + E || s < -E || s > 1 + E) continue;
    const n = pointAtXY(ed, { x: P(a).x + t * r.x, y: P(a).y + t * r.y });
    if (cutLine(ed, i, n, prof) | cutLine(ed, j, n, prof)) return true;
  }
  for (const [[a, b], i] of L) for (const k of A) {
    const g = arcGeo(ed, k);
    for (const t of circleTs(P(a), P(b), g.C, g.r, -E, 1 + E)) {
      const X = { x: P(a).x + t * (P(b).x - P(a).x), y: P(a).y + t * (P(b).y - P(a).y) };
      if (!onArc(ed, k, X)) continue;
      const n = pointAtXY(ed, X);
      if (cutLine(ed, i, n, prof) | cutArc(ed, k, n, prof)) return true;
    }
  }
  for (const k of A) for (const m of A) {
    if (m <= k) continue;
    const g = arcGeo(ed, k), h = arcGeo(ed, m);
    for (const X of circles2(g.C, g.r, h.C, h.r)) {
      if (!onArc(ed, k, X) || !onArc(ed, m, X)) continue;
      const n = pointAtXY(ed, X);
      if (cutArc(ed, k, n, prof) | cutArc(ed, m, n, prof)) return true;
    }
  }
  // Extrémité d'une courbe posée sur l'intérieur d'un arc (contact tangent) : l'arc est coupé là.
  const ends = new Set([...L.flatMap(([[a, b]]) => [a, b]), ...A.flatMap((k) => [ed.arcs[k].a, ed.arcs[k].b])]);
  for (const k of A) {
    const g = arcGeo(ed, k);
    for (const e of ends) if (e !== ed.arcs[k].a && e !== ed.arcs[k].b && e !== ed.arcs[k].c && Math.abs(Math.hypot(P(e).x - g.C.x, P(e).y - g.C.y) - g.r) < 1e-3 && onArc(ed, k, P(e)) && cutArc(ed, k, e, prof)) return true;
  }
  // Cercles : points d'appui notés, le cercle devient des arcs ensuite.
  ed.circles.forEach((ci, i) => {
    const C = P(ci.c), pts = [];
    for (const [[a, b]] of L) for (const t of circleTs(P(a), P(b), C, ci.r, -E, 1 + E)) pts.push({ x: P(a).x + t * (P(b).x - P(a).x), y: P(a).y + t * (P(b).y - P(a).y) });
    for (const k of A) { const g = arcGeo(ed, k); for (const X of circles2(C, ci.r, g.C, g.r)) if (onArc(ed, k, X)) pts.push(X); }
    ed.circles.forEach((cj, j) => { if (j !== i) pts.push(...circles2(C, ci.r, P(cj.c), cj.r)); });
    // Extrémités de courbes posées sur le cercle (congé tangent : le calcul d'intersection
    // rate le contact à 1e-4 près) : points de coupe aussi.
    const ends = new Set([...L.flatMap(([[a, b]]) => [a, b]), ...A.flatMap((k) => [ed.arcs[k].a, ed.arcs[k].b])]);
    for (const e of ends) if (Math.abs(Math.hypot(P(e).x - C.x, P(e).y - C.y) - ci.r) < 1e-3) pts.push({ ...P(e) });
    if (pts.length) onCircle.set(i, pts);
  });
  return false;
}

// Un cercle coupé en au moins deux points devient des arcs (même centre) ; ses contraintes
// passent aux arcs (rayon, tangence) ou à son centre (concentrique).
function circleToArcs(ed, i, pts, prof) {
  const ci = ed.circles[i], C = ed.pts[ci.c];
  const ns = [...new Set(pts.map((X) => pointAtXY(ed, X)))].filter((n) => n !== ci.c)
    .sort((m, n) => Math.atan2(ed.pts[m].y - C.y, ed.pts[m].x - C.x) - Math.atan2(ed.pts[n].y - C.y, ed.pts[n].x - C.x));
  if (ns.length < 2) return false;
  const ks = ns.map((n, j) => ed.arcs.push({ c: ci.c, a: n, b: ns[(j + 1) % ns.length] }) - 1);
  ks.forEach((k) => prof.arcs.add(k));
  for (const c of ed.cons) {
    const at = c.refs.indexOf(i);
    if (c.kind === 'radius' && c.refs[0] === i) { c.kind = 'arc_radius'; c.refs = [ks[0]]; }
    else if (c.kind === 'concentric' && at >= 0) { const o = ed.circles[c.refs[1 - at]]; c.kind = 'coincident'; c.refs = [ci.c, o ? o.c : ci.c]; }
    else if (c.kind === 'tangent' && c.refs[1] === i) { c.kind = 'tangent_arc'; c.refs = [c.refs[0], ks[0]]; }
  }
  ed.sel = [{ kind: 'c', i }];
  deleteSelection(ed); // contraintes restées sur le cercle (même rayon, sur le cercle) : retirées
  return true;
}

// Faces de l'arrangement des arêtes de profil : à chaque sommet, la face à gauche se poursuit
// par l'arête suivante dans le sens horaire ; on garde les faces d'aire positive.
function faces(ed, prof) {
  const P = (i) => ed.pts[i], edges = [];
  ed.lines.forEach(([a, b]) => { if (prof.lines.has(key(a, b))) edges.push({ u: a, v: b }); });
  for (const k of prof.arcs) if (ed.arcs[k]) edges.push({ u: ed.arcs[k].a, v: ed.arcs[k].b, k });
  // Arêtes pendantes retirées (un sommet de degré 1 ne borde aucune face).
  for (let again = true; again;) {
    const deg = new Map(); for (const e of edges) for (const x of [e.u, e.v]) deg.set(x, (deg.get(x) ?? 0) + 1);
    again = false;
    for (let i = edges.length - 1; i >= 0; i--) if (deg.get(edges[i].u) === 1 || deg.get(edges[i].v) === 1) { edges.splice(i, 1); again = true; }
  }
  // Point d'une arête à 2 % de son départ : départage les courbes tangentes au sommet.
  const sample = (e, rev, f) => {
    if (e.k == null) { const [s, t] = rev ? [P(e.v), P(e.u)] : [P(e.u), P(e.v)]; return { x: s.x + f * (t.x - s.x), y: s.y + f * (t.y - s.y) }; }
    const g = arcGeo(ed, e.k), th = g.ta + (rev ? (1 - f) : f) * g.span; return { x: g.C.x + g.r * Math.cos(th), y: g.C.y + g.r * Math.sin(th) };
  };
  const half = [], out = new Map();
  edges.forEach((e) => [false, true].forEach((rev) => {
    const from = rev ? e.v : e.u, q = sample(e, rev, 0.02), h = { e, rev, from, to: rev ? e.u : e.v, ang: Math.atan2(q.y - P(from).y, q.x - P(from).x) };
    half.push(h); if (!out.has(from)) out.set(from, []); out.get(from).push(h);
  }));
  for (const l of out.values()) l.sort((x, y) => x.ang - y.ang);
  const used = new Set(), loops = [];
  for (const h0 of half) {
    if (used.has(h0)) continue;
    const cyc = []; let h = h0;
    while (h && !used.has(h)) {
      used.add(h); cyc.push(h);
      const l = out.get(h.to), twin = l.find((x) => x.e === h.e && x.rev !== h.rev), i = l.indexOf(twin);
      h = l[(i - 1 + l.length) % l.length]; // le suivant dans le sens horaire
    }
    // Aire (arcs échantillonnés) : positive pour une face bornée.
    const pts = cyc.flatMap((x) => Array.from({ length: x.e.k == null ? 1 : 12 }, (_, j) => sample(x.e, x.rev, j / (x.e.k == null ? 1 : 12))));
    const area = pts.reduce((s, p, j) => { const q = pts[(j + 1) % pts.length]; return s + p.x * q.y - q.x * p.y; }, 0) / 2;
    if (area > 1e-6) loops.push(cyc.map((x) => (x.e.k == null ? x.from : x.rev ? { r: x.e.k } : { a: x.e.k })));
  }
  return { loops, edges };
}

// Avant d'extruder : coupe aux intersections, cercles coupés en arcs, contours = faces.
// Rend vrai si l'esquisse a changé (il faut la résoudre à nouveau).
export function splitIntoFaces(ed) {
  if (ed.loops.some((l) => l.some((it) => typeof it !== 'number' && it.s)) || (ed.ellipses ?? []).length) return false;
  const prof = profileSets(ed), before = JSON.stringify([ed.lines, ed.arcs, ed.circles.length, ed.loops]);
  for (let round = 0, more = true; more && round < 20; round++) {
    const onCircle = new Map();
    for (let guard = 0; guard < 500 && cutOne(ed, prof, onCircle); guard++) onCircle.clear();
    // Cercles coupés : du plus grand indice au plus petit (la suppression renumérote) ; puis
    // un nouveau passage coupe les lignes aux points posés sur ces cercles.
    more = false;
    for (const i of [...onCircle.keys()].sort((x, y) => y - x)) if (circleToArcs(ed, i, onCircle.get(i), prof)) more = true;
  }
  const { loops, edges } = faces(ed, prof);
  ed.loops = loops;
  const inFace = new Set(edges.map((e) => (e.k == null ? key(e.u, e.v) : `a${e.k}`)));
  ed.openProfile = [...prof.lines].filter((k) => !inFace.has(k) && ed.lines.some(([a, b]) => key(a, b) === k));
  ed.openArcs = new Set([...prof.arcs].filter((k) => ed.arcs[k] && !inFace.has(`a${k}`)));
  return JSON.stringify([ed.lines, ed.arcs, ed.circles.length, ed.loops]) !== before;
}
