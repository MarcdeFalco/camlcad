// Supprimer des éléments d'esquisse (sélection + Suppr, comme dans un modeleur) : un point
// emporte ce qui s'appuie dessus, une ligne ou un arc ouvre les boucles qui le contiennent
// (leurs autres lignes restent, en construction), les contraintes concernées partent, et
// tout est renuméroté.
import { SketchMarks } from './sketch_marks.js';
import { loopPoints } from './sketch_arcs.js';

export function deleteSelection(ed) {
  const del = { p: new Set(), l: new Set(), c: new Set(), a: new Set() };
  for (const { kind, i } of ed.sel) del[kind].add(i);
  // Un point supprimé emporte les éléments qui l'utilisent.
  ed.lines.forEach(([a, b], i) => { if (del.p.has(a) || del.p.has(b)) del.l.add(i); });
  ed.circles.forEach((c, i) => { if (del.p.has(c.c)) del.c.add(i); });
  ed.arcs.forEach((x, i) => { if ([x.c, x.a, x.b].some((p) => del.p.has(p))) del.a.add(i); });
  if (![...Object.values(del)].some((s) => s.size)) return false;
  // Boucles qui passent par une ligne ou un arc supprimés : retirées.
  const lineGone = (p, q) => ed.lines.some(([a, b], i) => del.l.has(i) && ((a === p && b === q) || (a === q && b === p)));
  const loops = ed.loops.filter((l) => {
    if (l.some((it) => typeof it !== 'number' && del.a.has(it.a ?? it.r))) return false;
    const s = loopPoints(ed, l);
    return !s.some((p, k) => lineGone(p, s[(k + 1) % s.length]) || del.p.has(p));
  });
  // Points devenus orphelins (extrémités ou centres d'éléments supprimés, plus utilisés).
  const used = new Set();
  ed.lines.forEach(([a, b], i) => { if (!del.l.has(i)) { used.add(a); used.add(b); } });
  ed.circles.forEach((c, i) => { if (!del.c.has(i)) used.add(c.c); });
  ed.arcs.forEach((x, i) => { if (!del.a.has(i)) [x.c, x.a, x.b].forEach((p) => used.add(p)); });
  const touched = new Set([...del.p]);
  ed.lines.forEach(([a, b], i) => { if (del.l.has(i)) { touched.add(a); touched.add(b); } });
  ed.circles.forEach((c, i) => { if (del.c.has(i)) touched.add(c.c); });
  ed.arcs.forEach((x, i) => { if (del.a.has(i)) [x.c, x.a, x.b].forEach((p) => touched.add(p)); });
  for (const p of touched) if (!used.has(p)) del.p.add(p);
  // Renumérotation.
  const remap = (n, gone) => { const m = new Map(); let k = 0; for (let i = 0; i < n; i++) if (!gone.has(i)) m.set(i, k++); return m; };
  const M = { p: remap(ed.pts.length, del.p), l: remap(ed.lines.length, del.l), c: remap(ed.circles.length, del.c), a: remap(ed.arcs.length, del.a) };
  ed.cons = ed.cons.filter((c) => {
    const sorts = SketchMarks.REFS[c.kind] ?? '';
    return c.refs.every((r, k) => M[sorts[k]]?.has(r));
  }).map((c) => ({ ...c, refs: c.refs.map((r, k) => M[SketchMarks.REFS[c.kind][k]].get(r)) }));
  ed.loops = loops.map((l) => l.map((it) => (typeof it === 'number' ? M.p.get(it) : it.a != null ? { a: M.a.get(it.a) } : { r: M.a.get(it.r) })));
  ed.lines = ed.lines.filter((_, i) => !del.l.has(i)).map(([a, b]) => [M.p.get(a), M.p.get(b)]);
  ed.circles = ed.circles.filter((_, i) => !del.c.has(i)).map((c) => ({ ...c, c: M.p.get(c.c) }));
  ed.arcs = ed.arcs.filter((_, i) => !del.a.has(i)).map((x) => ({ c: M.p.get(x.c), a: M.p.get(x.a), b: M.p.get(x.b) }));
  ed.pts = ed.pts.filter((_, i) => !del.p.has(i));
  ed.sel = [];
  return M; // renumérotation (vraie) : { p, l, c, a } de Map ancien → nouveau
}
