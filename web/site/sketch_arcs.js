// Arcs d'esquisse (Black Book ch. 2 : arc par le centre, oblong, congé d'esquisse).
// Un arc est { c, a, b } (indices de points) parcouru de a vers b dans le sens
// trigonométrique ; dans une boucle, {a:k} le suit de son début à sa fin, {r:k} à l'envers
// (format de Cad.Sketch_desc, voir web/toplevel.ml).

const add = (ed, x, y) => (ed.pts.push({ x, y, fixed: false }), ed.pts.length - 1);
const cons = (ed, kind, refs, value) => ed.cons.push(value === undefined ? { kind, refs } : { kind, refs, value });

// Points d'un arc (de a vers b, sens trigonométrique), pour le dessin et l'aperçu.
export function arcPoints(ed, k, rev = false) {
  const { c, a, b } = ed.arcs[k], C = ed.pts[c], A = ed.pts[a], B = ed.pts[b];
  const r = Math.hypot(A.x - C.x, A.y - C.y), t0 = Math.atan2(A.y - C.y, A.x - C.x);
  let sw = Math.atan2(B.y - C.y, B.x - C.x) - t0; if (sw <= 1e-9) sw += 2 * Math.PI;
  const n = Math.max(2, Math.ceil(sw / (Math.PI / 36)));
  const ps = Array.from({ length: n + 1 }, (_, i) => ({ x: C.x + r * Math.cos(t0 + (sw * i) / n), y: C.y + r * Math.sin(t0 + (sw * i) / n) }));
  return rev ? ps.reverse() : ps;
}
export const arcRadius = (ed, k) => { const { c, a } = ed.arcs[k]; return Math.hypot(ed.pts[a].x - ed.pts[c].x, ed.pts[a].y - ed.pts[c].y); };

// Courbe lisse (Catmull-Rom uniforme, 8 facettes par intervalle, comme Cad.Sketch.spline).
export function splinePoints(ed, ids) {
  const a = ids.map((i) => ed.pts[i]), n = a.length, closed = n > 2 && ids[0] === ids[n - 1];
  const at = (i) => (closed ? a[(((i % (n - 1)) + (n - 1)) % (n - 1))] : a[Math.max(0, Math.min(n - 1, i))]);
  const f = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
  const out = [{ x: a[0].x, y: a[0].y }];
  for (let i = 0; i < n - 1; i++) for (let k = 1; k <= 8; k++) {
    const t = k / 8, q = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    out.push({ x: f(q[0].x, q[1].x, q[2].x, q[3].x, t), y: f(q[0].y, q[1].y, q[2].y, q[3].y, t) });
  }
  return out;
}

// Suite des indices de points d'une boucle (un arc compte pour son début et sa fin).
export function loopPoints(ed, l) {
  return l.flatMap((it) => {
    if (typeof it === 'number') return [it];
    if (it.s) return it.s;
    const k = it.a ?? it.r, { a, b } = ed.arcs[k];
    return it.a != null ? [a, b] : [b, a];
  });
}
// Contour d'une boucle en coordonnées (arcs échantillonnés), pour l'aperçu d'extrusion.
export function loopOutline(ed, l) {
  return l.flatMap((it) => (typeof it === 'number' ? [{ x: ed.pts[it].x, y: ed.pts[it].y }] : it.s ? splinePoints(ed, it.s) : arcPoints(ed, it.a ?? it.r, it.r != null)));
}

// Oblong centre à centre : deux demi-cercles reliés par deux segments tangents et
// parallèles ; largeur initiale : un tiers de l'entraxe (cote modifiable).
export function slot(ed, c1, q, avoid = []) {
  const A = ed.pts[c1], L = Math.hypot(q.x - A.x, q.y - A.y);
  if (L < 1e-6) return false;
  // Second centre accroché au premier (ou au centre d'un oblong par le centre) : point neuf, sinon l'oblong est nul.
  let c2 = ed.pointAt(q); if (c2 === c1 || avoid.includes(c2)) c2 = add(ed, q.x, q.y);
  const ux = (q.x - A.x) / L, uy = (q.y - A.y) / L, r = L / 6, nx = -uy * r, ny = ux * r;
  const B = ed.pts[c2];
  const p1 = add(ed, A.x + nx, A.y + ny), p2 = add(ed, A.x - nx, A.y - ny), p3 = add(ed, B.x - nx, B.y - ny), p4 = add(ed, B.x + nx, B.y + ny);
  const k = ed.arcs.length, l = ed.lines.length;
  ed.arcs.push({ c: c1, a: p1, b: p2 }, { c: c2, a: p3, b: p4 });
  ed.lines.push([p2, p3], [p4, p1]);
  ed.loops.push([{ a: k }, { a: k + 1 }]);
  for (const [li, ak] of [[l, k], [l, k + 1], [l + 1, k], [l + 1, k + 1]]) cons(ed, 'tangent_arc', [li, ak]);
  cons(ed, 'parallel', [l, l + 1]);
  cons(ed, 'arc_radius', [k], r);
  return true;
}

// Arc par le centre : centre, début, puis fin (le rayon est celui du début).
export function centerArc(ed, c, a, q) {
  const C = ed.pts[c], A = ed.pts[a], r = Math.hypot(A.x - C.x, A.y - C.y), t = Math.atan2(q.y - C.y, q.x - C.x);
  const b = add(ed, C.x + r * Math.cos(t), C.y + r * Math.sin(t));
  ed.arcs.push({ c, a, b });
  return true;
}

// Congé d'esquisse au sommet p d'une boucle, entre deux lignes : le sommet devient un arc
// tangent aux deux lignes, de rayon r ; p reste comme point de construction à l'intersection
// des deux lignes (les cotes qui s'y appuient restent valables).
// chamfer : chanfrein de longueur r le long de chaque ligne (segment au lieu de l'arc).
export function fillet(ed, p, r, chamfer = false) {
  for (const l of ed.loops) {
    const n = l.length, j = l.indexOf(p);
    if (j < 0) continue;
    const prev = l[(j - 1 + n) % n], next = l[(j + 1) % n];
    if (typeof prev !== 'number' || typeof next !== 'number') return 'Congé : le sommet doit relier deux lignes.';
    const li = ed.lines.findIndex(([a, b]) => (a === prev && b === p) || (a === p && b === prev));
    const lj = ed.lines.findIndex(([a, b]) => (a === p && b === next) || (a === next && b === p));
    if (li < 0 || lj < 0) return 'Congé : le sommet doit relier deux lignes.';
    const P = ed.pts[p], U = ed.pts[prev], V = ed.pts[next];
    const u = norm(U.x - P.x, U.y - P.y), v = norm(V.x - P.x, V.y - P.y);
    const half = Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y))) / 2;
    if (half < 1e-3 || half > Math.PI / 2 - 1e-3) return 'Congé : sommet plat.';
    const t = chamfer ? r : r / Math.tan(half), bis = norm(u.x + v.x, u.y + v.y), d = r / Math.sin(half);
    const p1 = add(ed, P.x + u.x * t, P.y + u.y * t), p2 = add(ed, P.x + v.x * t, P.y + v.y * t);
    if (chamfer) {
      ed.lines[li] = ed.lines[li].map((x) => (x === p ? p1 : x));
      ed.lines[lj] = ed.lines[lj].map((x) => (x === p ? p2 : x));
      ed.lines.push([p1, p2]);
      l.splice(j, 1, ...(l[(j + 1) % n] === next ? [p1, p2] : [p2, p1]));
      const keep = ed.lines.length;
      ed.lines.push([prev, p], [p, next]);
      for (const c of ed.cons) if (['length', 'equal_length'].includes(c.kind)) c.refs = c.refs.map((x) => (x === li ? keep : x === lj ? keep + 1 : x));
      cons(ed, 'parallel', [keep, li]); cons(ed, 'parallel', [keep + 1, lj]);
      cons(ed, 'distance', [p, p1], r); cons(ed, 'distance', [p, p2], r);
      return null;
    }
    const c = add(ed, P.x + bis.x * d, P.y + bis.y * d);
    // Les lignes s'arrêtent aux points de tangence.
    ed.lines[li] = ed.lines[li].map((x) => (x === p ? p1 : x));
    ed.lines[lj] = ed.lines[lj].map((x) => (x === p ? p2 : x));
    // Sens : p1 → p2 est trigonométrique si le contour tourne à gauche au sommet.
    const left = (P.x - U.x) * (V.y - P.y) - (P.y - U.y) * (V.x - P.x) > 0, k = ed.arcs.length;
    ed.arcs.push(left ? { c, a: p1, b: p2 } : { c, a: p2, b: p1 });
    l.splice(j, 1, left ? { a: k } : { r: k });
    // p : sommet virtuel, intersection des deux lignes prolongées (lignes de construction,
    // parallèles aux lignes raccourcies et de même origine : alignées). Les longueurs cotées
    // passent sur elles, comme les cotes au sommet virtuel d'un modeleur.
    const keep = ed.lines.length;
    ed.lines.push([prev, p], [p, next]);
    for (const c of ed.cons) if (['length', 'equal_length'].includes(c.kind)) c.refs = c.refs.map((x) => (x === li ? keep : x === lj ? keep + 1 : x));
    cons(ed, 'parallel', [keep, li]); cons(ed, 'parallel', [keep + 1, lj]);
    cons(ed, 'tangent_arc', [li, k]); cons(ed, 'tangent_arc', [lj, k]);
    cons(ed, 'arc_radius', [k], r);
    return null;
  }
  return 'Congé : cliquez un sommet d’un contour.';
}
function norm(x, y) { const n = Math.hypot(x, y) || 1; return { x: x / n, y: y / n }; }
