// Ajuster (Black Book ch. 2, Trim) : un clic sur une ligne retire le morceau compris entre les
// intersections voisines du clic (ou toute la ligne s'il n'y en a pas). Les lignes coupées
// sont scindées au point d'intersection, qui devient un sommet commun : deux rectangles qui se
// chevauchent donnent, après ajustement des morceaux intérieurs, un seul contour.
// Prolonger (Extend) : l'extrémité libre la plus proche du clic va jusqu'à la première ligne
// rencontrée. Couper (Break) : la ligne cliquée et celle qui la croise sont scindées au point
// d'intersection le plus proche du clic. Ajuster coupe aussi contre les cercles, et un cercle
// cliqué devient un arc (trou de serrure), un arc cliqué se raccourcit ou se scinde ; seules
// les lignes de profil coupent un élément de profil (pas la diagonale d'un rectangle par le
// centre). Prolonger et Couper : lignes seulement.
import { deleteSelection } from './sketch_delete.js';
import { SketchMarks } from './sketch_marks.js';
import { loopPoints } from './sketch_arcs.js';

const EPS = 1e-6;
const KEEP_DUP = new Set(['horizontal', 'vertical']); // recopiées sur le nouveau morceau
const DROP = new Set(['length', 'equal_length', 'midpoint']); // n'ont plus de sens sur un morceau
const key = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
// La contrainte c porte-t-elle sur la ligne j ?
const onLine = (c, j) => c.refs.some((r, k) => r === j && SketchMarks.REFS[c.kind]?.[k] === 'l');

// Intersection des segments [P,Q] et [A,B] : paramètres t (sur PQ) et s (sur AB), ou null.
function cross(P, Q, A, B) {
  const r = { x: Q.x - P.x, y: Q.y - P.y }, u = { x: B.x - A.x, y: B.y - A.y };
  const den = r.x * u.y - r.y * u.x;
  if (Math.abs(den) < 1e-12) return null;
  const w = { x: A.x - P.x, y: A.y - P.y };
  const t = (w.x * u.y - w.y * u.x) / den, s = (w.x * r.y - w.y * r.x) / den;
  return t > EPS && t < 1 - EPS && s > -EPS && s < 1 + EPS ? { t, s } : null;
}

// La ligne j devient [a, n] et une nouvelle ligne [n, b] ; contraintes réparties.
function split(ed, j, n) {
  const [a, b] = ed.lines[j], j2 = ed.lines.length;
  ed.lines[j] = [a, n]; ed.lines.push([n, b]);
  let oriented = false;
  ed.cons = ed.cons.filter((c) => !(DROP.has(c.kind) && onLine(c, j)));
  for (const c of [...ed.cons]) if (KEEP_DUP.has(c.kind) && c.refs[0] === j) { ed.cons.push({ kind: c.kind, refs: [j2] }); oriented = true; }
  if (!oriented) ed.cons.push({ kind: 'parallel', refs: [j, j2] }); // sommet commun + parallèles : alignées
  return j2;
}

// Ligne la plus proche du clic (sous la tolérance) et paramètre du clic sur elle.
function nearestLine(ed, q) {
  let li = -1, best = ed.tol(), tc = 0, dd = Infinity;
  ed.lines.forEach(([a, b], i) => {
    const A = ed.pts[a], B = ed.pts[b], dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((q.x - A.x) * dx + (q.y - A.y) * dy) / L2));
    const d = Math.hypot(A.x + t * dx - q.x, A.y + t * dy - q.y);
    if (d < best) { best = d; li = i; tc = t; dd = d; }
  });
  return { li, tc, d: dd };
}
// Arcs (CCW de a à b) : centre, rayon, angle de départ, ouverture.
const TAU = 2 * Math.PI, ccwd = (x) => ((x % TAU) + TAU) % TAU;
function arcGeo(ed, k) {
  const { c, a, b } = ed.arcs[k], C = ed.pts[c], A = ed.pts[a], B = ed.pts[b], ta = Math.atan2(A.y - C.y, A.x - C.x);
  return { C, r: Math.hypot(A.x - C.x, A.y - C.y), ta, span: ccwd(Math.atan2(B.y - C.y, B.x - C.x) - ta) || TAU };
}
// Paramètres t ∈ [lo, hi] où le segment [P, Q] coupe le cercle (C, r).
function circleTs(P, Q, C, r, lo = EPS, hi = 1 - EPS) {
  const dx = Q.x - P.x, dy = Q.y - P.y, fx = P.x - C.x, fy = P.y - C.y, qa = dx * dx + dy * dy, qb = 2 * (fx * dx + fy * dy), disc = qb * qb - 4 * qa * (fx * fx + fy * fy - r * r);
  if (qa < 1e-12 || disc <= 0) return [];
  return [(-qb - Math.sqrt(disc)) / (2 * qa), (-qb + Math.sqrt(disc)) / (2 * qa)].filter((t) => t > lo && t < hi);
}
// Lignes qui coupent : celles du profil quand on ajuste un élément de profil (une ligne de
// construction, comme la diagonale d'un rectangle par le centre, ne coupe pas) ; toutes sinon.
function cutters(ed, profile, all) {
  const prof = ed.lines.map(([a, b]) => profile.has(key(a, b)));
  return all || !prof.some(Boolean) ? ed.lines.map(() => true) : prof;
}
// Boucles qui passent par l'arc k : défaites, leurs lignes et arcs redeviennent du profil ouvert.
function dissolve(ed, k, profile) {
  ed.loops = ed.loops.filter((l) => {
    if (!l.some((it) => typeof it !== 'number' && (it.a ?? it.r) === k)) return true;
    const arcsIn = l.filter((it) => typeof it !== 'number' && !it.s).map((it) => it.a ?? it.r), pairs = new Set(arcsIn.map((j) => key(ed.arcs[j].a, ed.arcs[j].b)));
    const s = loopPoints(ed, l);
    s.forEach((p, i) => { const q = s[(i + 1) % s.length]; if (p !== q && !pairs.has(key(p, q))) profile.add(key(p, q)); });
    ed.openArcs = new Set([...(ed.openArcs ?? []), ...arcsIn]);
    return false;
  });
}
// L'arc k est scindé au point n (sur l'arc) : [a, n] et [n, b], rayon recopié.
function splitArc(ed, k, n, profile) {
  dissolve(ed, k, profile);
  const { c, b } = ed.arcs[k], k2 = ed.arcs.push({ c, a: n, b }) - 1;
  ed.arcs[k] = { ...ed.arcs[k], b: n };
  for (const x of [...ed.cons]) if (x.kind === 'arc_radius' && x.refs[0] === k) ed.cons.push({ ...x, refs: [k2] });
  ed.openArcs = new Set([...(ed.openArcs ?? []), k, k2]);
  return k2;
}
const degree = (ed, p) => ed.lines.filter((l) => l.includes(p)).length;

// Prolonger : l'extrémité (libre) du côté du clic glisse jusqu'à la première ligne sur son
// chemin, et y reste (contrainte « sur la ligne »).
export function extendAt(ed, q) {
  const { li, tc } = nearestLine(ed, q);
  if (li < 0) return false;
  const [a, b] = ed.lines[li], [e, o] = tc > 0.5 ? [b, a] : [a, b];
  if (degree(ed, e) > 1 || ed.pts[e].fixed) return false;
  const O = ed.pts[o], E = ed.pts[e], far = { x: O.x + (E.x - O.x) * 1e4, y: O.y + (E.y - O.y) * 1e4 };
  let hit = null;
  ed.lines.forEach(([c, d], j) => {
    if (j === li) return;
    const x = cross(O, far, ed.pts[c], ed.pts[d]);
    if (x && x.t > 1e-4 * (1 + 1e-6) && (!hit || x.t < hit.t)) hit = { ...x, j };
  });
  if (!hit) return false;
  E.x = O.x + hit.t * (far.x - O.x); E.y = O.y + hit.t * (far.y - O.y);
  ed.cons = ed.cons.filter((c) => !(DROP.has(c.kind) && onLine(c, li)));
  ed.cons.push({ kind: 'on_line', refs: [e, hit.j] });
  return true;
}

// Couper : la ligne cliquée et la ligne qui la croise au plus près du clic sont scindées au
// point d'intersection, sommet commun.
export function breakAt(ed, q) {
  const { li, tc } = nearestLine(ed, q);
  if (li < 0) return false;
  const [p, r] = ed.lines[li], P = ed.pts[p], R = ed.pts[r];
  let hit = null;
  ed.lines.forEach(([a, b], j) => {
    if (j === li) return;
    const x = cross(P, R, ed.pts[a], ed.pts[b]);
    if (x && x.s > EPS && x.s < 1 - EPS && (!hit || Math.abs(x.t - tc) < Math.abs(hit.t - tc))) hit = { ...x, j };
  });
  if (!hit) return false;
  const n = ed.pts.push({ x: P.x + hit.t * (R.x - P.x), y: P.y + hit.t * (R.y - P.y), fixed: false }) - 1;
  const inLoop = (u, v) => ed.loops.some((l) => l.every((x) => typeof x === 'number') && l.some((x, k) => (x === u && l[(k + 1) % l.length] === v) || (x === v && l[(k + 1) % l.length] === u)));
  for (const j of [li, hit.j]) {
    const [u, v] = ed.lines[j], loopy = inLoop(u, v);
    split(ed, j, n);
    // Une boucle qui passait par [u, v] passe désormais par n.
    if (loopy) ed.loops = ed.loops.map((l) => { const k = l.findIndex((x, i) => (x === u && l[(i + 1) % l.length] === v) || (x === v && l[(i + 1) % l.length] === u)); return k < 0 ? l : [...l.slice(0, k + 1), n, ...l.slice(k + 1)]; });
  }
  return true;
}

// ed : SketchEditor ; q : clic (coordonnées du plan). true si l'esquisse a changé.
export function trimAt(ed, q) {
  const { li, tc, d } = nearestLine(ed, q);
  let ci = -1, dc = ed.tol();
  ed.circles.forEach((c, i) => { const C = ed.pts[c.c], e = Math.abs(Math.hypot(q.x - C.x, q.y - C.y) - c.r); if (e < dc && e < d) { dc = e; ci = i; } });
  let ai = -1;
  ed.arcs.forEach((_, k) => { const g = arcGeo(ed, k), e = Math.abs(Math.hypot(q.x - g.C.x, q.y - g.C.y) - g.r); if (e < dc && e < d && ccwd(Math.atan2(q.y - g.C.y, q.x - g.C.x) - g.ta) < g.span) { dc = e; ai = k; ci = -1; } });
  if (li < 0 && ci < 0 && ai < 0) return false;
  // Arêtes de profil (dans une boucle de lignes) avant l'opération.
  const profile = new Set();
  for (const l of ed.loops) if (l.every((x) => typeof x === 'number')) l.forEach((p, k) => profile.add(key(p, l[(k + 1) % l.length])));
  // Arêtes de profil d'un contour ouvert par un ajustement précédent (pas encore refermé).
  for (const k of ed.openProfile ?? []) if (ed.lines.some(([a, b]) => key(a, b) === k)) profile.add(k);
  if (ci >= 0) return trimCircle(ed, ci, q, profile);
  if (ai >= 0) return trimArc(ed, ai, q, profile);
  const [p, q2] = ed.lines[li], P = ed.pts[p], Q = ed.pts[q2], cut = cutters(ed, profile, !profile.has(key(p, q2)));
  const hits = [];
  ed.lines.forEach(([a, b], j) => { if (j !== li && cut[j]) { const x = cross(P, Q, ed.pts[a], ed.pts[b]); if (x) hits.push({ ...x, j }); } });
  // Arcs qui coupent la ligne (dans leur ouverture) : sommet commun, l'arc est scindé.
  ed.arcs.forEach((_, k) => { const g = arcGeo(ed, k); for (const t of circleTs(P, Q, g.C, g.r)) { const th = ccwd(Math.atan2(P.y + t * (Q.y - P.y) - g.C.y, P.x + t * (Q.x - P.x) - g.C.x) - g.ta); if (th > 1e-6 && th < g.span - 1e-6) hits.push({ t, arc: k }); } });
  // Cercles qui coupent la ligne : sommet nouveau, « sur le cercle ».
  ed.circles.forEach(({ c, r }, k) => {
    const C = ed.pts[c], dx = Q.x - P.x, dy = Q.y - P.y, fx = P.x - C.x, fy = P.y - C.y, qa = dx * dx + dy * dy, qb = 2 * (fx * dx + fy * dy), disc = qb * qb - 4 * qa * (fx * fx + fy * fy - r * r);
    if (disc > 0) for (const t of [(-qb - Math.sqrt(disc)) / (2 * qa), (-qb + Math.sqrt(disc)) / (2 * qa)]) if (t > EPS && t < 1 - EPS) hits.push({ t, circle: k });
  });
  const lo = hits.filter((h) => h.t < tc).sort((x, y) => y.t - x.t)[0], hi = hits.filter((h) => h.t > tc).sort((x, y) => x.t - y.t)[0];
  const wasProfile = profile.has(key(p, q2));
  // Sommet à l'intersection : extrémité de l'autre ligne si elle y aboutit, sinon nouveau point qui la scinde.
  const vertex = (h) => {
    if (h.circle != null) { const n = ed.pts.push({ x: P.x + h.t * (Q.x - P.x), y: P.y + h.t * (Q.y - P.y), fixed: false }) - 1; ed.cons.push({ kind: 'on_circle', refs: [n, h.circle] }); return n; }
    if (h.arc != null) { const n = ed.pts.push({ x: P.x + h.t * (Q.x - P.x), y: P.y + h.t * (Q.y - P.y), fixed: false }) - 1; splitArc(ed, h.arc, n, profile); return n; }
    const [a, b] = ed.lines[h.j];
    if (h.s < EPS) return a;
    if (h.s > 1 - EPS) return b;
    const n = ed.pts.push({ x: P.x + h.t * (Q.x - P.x), y: P.y + h.t * (Q.y - P.y), fixed: false }) - 1;
    const prof = profile.has(key(a, b));
    split(ed, h.j, n);
    if (prof) { profile.add(key(a, n)); profile.add(key(n, b)); }
    return n;
  };
  const n1 = lo ? vertex(lo) : null, n2 = hi ? vertex(hi) : null;
  const pieces = [];
  if (n1 != null) pieces.push([p, n1]);
  if (n2 != null) pieces.push([n2, q2]);
  ed.cons = ed.cons.filter((c) => !(DROP.has(c.kind) && onLine(c, li)));
  if (!pieces.length) {
    ed.sel = [{ kind: 'l', i: li }];
  } else {
    ed.lines[li] = pieces[0];
    if (pieces.length === 2) {
      const l2 = ed.lines.push(pieces[1]) - 1;
      let oriented = false;
      for (const c of [...ed.cons]) if (KEEP_DUP.has(c.kind) && c.refs[0] === li) { ed.cons.push({ kind: c.kind, refs: [l2] }); oriented = true; }
      if (!oriented) ed.cons.push({ kind: 'parallel', refs: [li, l2] });
      ed.cons.push({ kind: 'on_line', refs: [n2, li] }); // les deux morceaux restent alignés
    }
    if (wasProfile) pieces.forEach(([a, b]) => profile.add(key(a, b)));
    // Extrémité retirée : supprimée si plus rien ne s'y appuie.
    const used = (x) => ed.lines.some((l) => l.includes(x)) || ed.circles.some((c) => c.c === x) || ed.arcs.some((a) => [a.c, a.a, a.b].includes(x)) || (ed.ellipses ?? []).some((e) => e.c === x || e.a === x);
    ed.sel = [p, q2].filter((x) => !used(x)).map((i) => ({ kind: 'p', i }));
  }
  return relink(ed, profile, li);
}

// Après une coupe : la sélection (ligne ou cercle ajusté, points orphelins) est supprimée,
// puis les contours sont recalculés sur les lignes de profil et les arcs de profil encore
// ouverts (ed.openArcs) ; les boucles qui ont déjà un arc ou une courbe restent telles quelles.
function relink(ed, profile, li = -1) {
  const isProf = ed.lines.map(([a, b]) => profile.has(key(a, b)));
  ed.loops = ed.loops.filter((l) => !l.every((x) => typeof x === 'number'));
  if (ed.sel.length) {
    if (ed.sel[0].kind === 'l') isProf.splice(li, 1);
    const M = deleteSelection(ed); // renumérote points, lignes, contraintes (ordre des lignes et arcs conservé)
    if (M) ed.openArcs = new Set([...(ed.openArcs ?? [])].filter((k) => M.a.has(k)).map((k) => M.a.get(k)));
  }
  const prof = ed.lines.filter((_, i) => isProf[i]);
  const inLoops = new Set(ed.loops.flatMap((l) => l.filter((x) => typeof x !== 'number' && !x.s).map((x) => x.a ?? x.r)));
  const arcs = [...(ed.openArcs ?? [])].filter((k) => ed.arcs[k] && !inLoops.has(k));
  const found = cycles(prof, arcs.map((k) => ({ k, a: ed.arcs[k].a, b: ed.arcs[k].b })));
  ed.loops.push(...found.loops);
  ed.openProfile = prof.map(([a, b]) => key(a, b)).filter((k) => !found.lines.has(k));
  ed.openArcs = new Set(arcs.filter((k) => !found.arcs.has(k)));
  ed.sel = [];
  return true;
}

// Ajuster un cercle (clic sur le cercle) : le morceau compris entre les intersections voisines
// (avec les lignes) est retiré, le reste devient un arc de même centre, dont les extrémités
// sont des sommets des lignes coupées (scindées si besoin). Sans deux intersections : cercle retiré.
function trimCircle(ed, ci, q, profile) {
  const { c, r } = ed.circles[ci], C = ed.pts[c], ang = (x, y) => Math.atan2(y - C.y, x - C.x);
  const hits = [], cut = cutters(ed, profile, false);
  ed.lines.forEach(([a, b], j) => {
    if (!cut[j]) return;
    const A = ed.pts[a], B = ed.pts[b], dx = B.x - A.x, dy = B.y - A.y, fx = A.x - C.x, fy = A.y - C.y;
    const qa = dx * dx + dy * dy, qb = 2 * (fx * dx + fy * dy), qc = fx * fx + fy * fy - r * r, disc = qb * qb - 4 * qa * qc;
    if (qa < 1e-12 || disc < 0) return;
    for (const t of new Set([(-qb - Math.sqrt(disc)) / (2 * qa), (-qb + Math.sqrt(disc)) / (2 * qa)])) {
      if (t > -1e-6 && t < 1 + 1e-6) hits.push({ j, t, th: ang(A.x + t * dx, A.y + t * dy) });
    }
  });
  if (hits.length < 2) { ed.sel = [{ kind: 'c', i: ci }]; return relink(ed, profile); }
  const tau = 2 * Math.PI, ccw = (x) => (((x - ang(q.x, q.y)) % tau) + tau) % tau;
  hits.sort((u, v) => ccw(u.th) - ccw(v.th));
  const hi = hits[0], lo = hits[hits.length - 1]; // premier après le clic, dernier avant
  const vertex = (h) => {
    const [a, b] = ed.lines[h.j];
    if (h.t < 1e-6) return a;
    if (h.t > 1 - 1e-6) return b;
    const n = ed.pts.push({ x: C.x + r * Math.cos(h.th), y: C.y + r * Math.sin(h.th), fixed: false }) - 1;
    const prof = profile.has(key(a, b));
    split(ed, h.j, n);
    if (prof) { profile.add(key(a, n)); profile.add(key(n, b)); }
    return n;
  };
  const pa = vertex(hi), pb = vertex(lo), k = ed.arcs.push({ c, a: pa, b: pb }) - 1;
  const rad = ed.cons.find((x) => x.kind === 'radius' && x.refs[0] === ci);
  if (rad) ed.cons.push({ ...rad, kind: 'arc_radius', refs: [k], value: rad.value });
  ed.openArcs = new Set([...(ed.openArcs ?? []), k]);
  ed.sel = [{ kind: 'c', i: ci }];
  return relink(ed, profile);
}

// Ajuster un arc : le morceau entre les intersections voisines du clic (lignes de profil)
// est retiré ; il reste un ou deux arcs. Sans intersection : l'arc entier part.
function trimArc(ed, k, q, profile) {
  const g = arcGeo(ed, k), tq = ccwd(Math.atan2(q.y - g.C.y, q.x - g.C.x) - g.ta), cut = cutters(ed, profile, false), hits = [];
  ed.lines.forEach(([a, b], j) => {
    if (!cut[j]) return;
    const A = ed.pts[a], B = ed.pts[b];
    for (const t of circleTs(A, B, g.C, g.r, -1e-6, 1 + 1e-6)) {
      const th = ccwd(Math.atan2(A.y + t * (B.y - A.y) - g.C.y, A.x + t * (B.x - A.x) - g.C.x) - g.ta);
      if (th > 1e-6 && th < g.span - 1e-6) hits.push({ j, t, th });
    }
  });
  const lo = hits.filter((h) => h.th < tq).sort((u, v) => v.th - u.th)[0], hi = hits.filter((h) => h.th > tq).sort((u, v) => u.th - v.th)[0];
  dissolve(ed, k, profile);
  const { c, a, b } = ed.arcs[k];
  const vertex = (h) => {
    const [u, v] = ed.lines[h.j];
    if (h.t < 1e-6) return u;
    if (h.t > 1 - 1e-6) return v;
    const n = ed.pts.push({ x: g.C.x + g.r * Math.cos(g.ta + h.th), y: g.C.y + g.r * Math.sin(g.ta + h.th), fixed: false }) - 1;
    const prof = profile.has(key(u, v));
    split(ed, h.j, n);
    if (prof) { profile.add(key(u, n)); profile.add(key(n, v)); }
    return n;
  };
  const pieces = [...(lo ? [{ c, a, b: vertex(lo) }] : []), ...(hi ? [{ c, a: vertex(hi), b }] : [])];
  if (!pieces.length) { ed.sel = [{ kind: 'a', i: k }]; return relink(ed, profile); }
  ed.arcs[k] = pieces[0];
  if (pieces[1]) { const k2 = ed.arcs.push(pieces[1]) - 1; for (const x of [...ed.cons]) if (x.kind === 'arc_radius' && x.refs[0] === k) ed.cons.push({ ...x, refs: [k2] }); ed.openArcs = new Set([...(ed.openArcs ?? []), k2]); }
  ed.openArcs = new Set([...(ed.openArcs ?? []), k]);
  // Extrémités de l'arc d'origine plus utilisées : supprimées.
  const used = (x) => ed.lines.some((l) => l.includes(x)) || ed.circles.some((cc) => cc.c === x) || ed.arcs.some((r) => [r.c, r.a, r.b].includes(x));
  ed.sel = [a, b].filter((x) => !used(x)).map((i) => ({ kind: 'p', i }));
  return relink(ed, profile);
}

// Composantes où chaque sommet a exactement deux arêtes (lignes [a, b], arcs { k, a, b }) :
// boucles au format de l'éditeur (points ; un arc {a: k} ou {r: k} tient lieu de ses deux
// extrémités). Rend aussi les clés des lignes et les arcs utilisés.
function cycles(lines, arcs = []) {
  const edges = [...lines.map(([u, v]) => ({ u, v, k: null })), ...arcs.map(({ k, a, b }) => ({ u: a, v: b, k }))];
  const adj = new Map(), add = (x, e) => { if (!adj.has(x)) adj.set(x, []); adj.get(x).push(e); };
  edges.forEach((e, i) => { add(e.u, i); add(e.v, i); });
  const used = new Set(), out = { loops: [], lines: new Set(), arcs: new Set() };
  for (let e0 = 0; e0 < edges.length; e0++) {
    if (used.has(e0)) continue;
    const seq = []; let cur = edges[e0].u, e = e0, ok = true;
    for (;;) {
      if (adj.get(cur).length !== 2) ok = false;
      used.add(e);
      const E = edges[e], to = E.u === cur ? E.v : E.u;
      seq.push({ e: E, from: cur });
      if (to === edges[e0].u) break;
      if (adj.get(to).length !== 2) { ok = false; break; }
      const next = adj.get(to).find((x) => x !== e);
      if (next == null || used.has(next)) { ok = false; break; }
      cur = to; e = next;
    }
    const nArcs = seq.filter((x) => x.e.k != null).length;
    if (!ok || seq.length < (nArcs ? 2 : 3)) continue;
    // Départ juste après un arc : un arc fournit sa propre extrémité d'arrivée.
    const s0 = Math.max(0, seq.findIndex((x) => x.e.k != null) + 1), rot = [...seq.slice(s0), ...seq.slice(0, s0)];
    const items = [];
    rot.forEach((x, i) => {
      if (x.e.k != null) { items.push(x.from === x.e.u ? { a: x.e.k } : { r: x.e.k }); out.arcs.add(x.e.k); }
      else { if (rot[(i - 1 + rot.length) % rot.length].e.k == null) items.push(x.from); out.lines.add(key(x.e.u, x.e.v)); }
    });
    out.loops.push(items);
  }
  return out;
}

// Lignes de profil ouvertes (tracées une à une) qui se referment : contour reconnu, comme
// les régions d'un modeleur, sans avoir à cliquer le premier point.
export function closeOpenProfile(ed) {
  const open = ed.lines.filter(([a, b]) => ed.openProfile?.includes(key(a, b)));
  const found = cycles(open);
  if (!found.loops.length) return false;
  ed.loops.push(...found.loops);
  ed.openProfile = ed.openProfile.filter((k) => !found.lines.has(k));
  return true;
}

// Construction (Black Book ch. 2, touche X) : les lignes sélectionnées passent de profil à
// construction ou l'inverse ; les contours de lignes sont recalculés sur les lignes de profil.
export function toggleConstruction(ed) {
  const lines = ed.sel.filter((s) => s.kind === 'l').map((s) => s.i);
  if (!lines.length) return false;
  const profile = new Set(ed.openProfile ?? []);
  for (const l of ed.loops) if (l.every((x) => typeof x === 'number')) l.forEach((p, k) => profile.add(key(p, l[(k + 1) % l.length])));
  for (const i of lines) { const k = key(...ed.lines[i]); if (profile.has(k)) profile.delete(k); else profile.add(k); }
  ed.sel = [];
  return relink(ed, profile);
}
