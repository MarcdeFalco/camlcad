// Dialogues des features du chapitre 4 du Black Book (Advanced 3D Modeling) : perçage sur
// une face, réseaux rectangulaire et circulaire, symétrie. Chacun écrit une feature dans le
// code (insert du contexte des dialogues) et la combine au résultat (Joindre, Couper…).
import * as THREE from 'three';
import { el, fmt } from './timeline.js';
import { num, choice, row, OPS } from './dialogs.js';

const lit = (x) => { const s = Number(Number(x).toPrecision(10)).toString(); return /[.e]/.test(s) ? s : s + '.'; };
const litp = (x) => (Number(x) < 0 ? `(${lit(x)})` : lit(x));
const v3 = (v) => `(Geom.V3.v ${litp(Math.round(v.x * 100) / 100 + 0)} ${litp(Math.round(v.y * 100) / 100 + 0)} ${litp(Math.round(v.z * 100) / 100 + 0)})`;
const v3n = (v) => `(Geom.V3.v ${litp(Math.round(v.x * 1e6) / 1e6 + 0)} ${litp(Math.round(v.y * 1e6) / 1e6 + 0)} ${litp(Math.round(v.z * 1e6) / 1e6 + 0)})`;
const AXES = { X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] };
// Filetages métriques ISO, pas gros (Cad_parts.Thread.pitch).
export const METRIC = { M2: [2, 0.4], M2_5: [2.5, 0.45], M3: [3, 0.5], M4: [4, 0.7], M5: [5, 0.8], M6: [6, 1], M8: [8, 1.25], M10: [10, 1.5], M12: [12, 1.75] };
const METRIC_LABELS = Object.fromEntries(Object.keys(METRIC).map((k) => [k, k.replace('_', '.')]));
const AXIS_CODE = { X: 'Geom.V3.ex', Y: 'Geom.V3.ey', Z: 'Geom.V3.ez' };

// Perçage au point `p` d'une face plane de repère `frame` (z = normale sortante).
// through : profondeur pour « traversant » (diagonale de la pièce).
export function hole(d, p, frame, through) {
  const P = { type: 'simple', dia: 5, depth: 10, thru: true, cbDia: 9, cbDepth: 3, csDia: 10, size: 'M5' };
  const depth = () => (P.thru ? through : P.depth);
  const preview = () => {
    const g = new THREE.Group(), h = depth();
    const cyl = (r, hh) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hh, 32)); c.rotation.x = Math.PI / 2; c.position.z = -hh / 2; g.add(c); };
    cyl(P.dia / 2, h);
    if (P.type === 'cb') cyl(P.cbDia / 2, P.cbDepth);
    if (P.type === 'cs') { const hc = (P.csDia - P.dia) / 2; const c = new THREE.Mesh(new THREE.CylinderGeometry(P.csDia / 2, P.dia / 2, hc, 32)); c.rotation.x = Math.PI / 2; c.position.z = -hc / 2; g.add(c); }
    g.matrixAutoUpdate = false; g.matrix.makeBasis(frame.x, frame.y, frame.z).setPosition(p);
    d.setPreview(g, 0xe74c3c);
  };
  const extra = el('div');
  const showExtra = () => {
    extra.replaceChildren(...(P.type === 'tap' ? [row('Taraudage', choice(METRIC_LABELS, P.size, (v) => { P.size = v; P.dia = METRIC[v][0]; preview(); }))] : P.type === 'cb' ? [row('Ø lamage', num(P.cbDia, (v) => { P.cbDia = v; preview(); }, { min: 0 })), row('Prof. lamage', num(P.cbDepth, (v) => { P.cbDepth = v; preview(); }, { min: 0 }))]
      : P.type === 'cs' ? [row('Ø fraisure (90°)', num(P.csDia, (v) => { P.csDia = v; preview(); }, { min: 0 }))] : []));
  };
  const depthIn = num(P.depth, (v) => { P.depth = v; preview(); }, { min: 0 });
  depthIn.disabled = P.thru;
  const thru = el('input', { type: 'checkbox', checked: P.thru });
  thru.onchange = () => { P.thru = thru.checked; depthIn.disabled = P.thru; preview(); };
  d.open('PERÇAGE', [
    row('Position', el('span', { className: 'hint', textContent: `(${[p.x, p.y, p.z].map((c) => Math.round(c * 100) / 100).join(', ')})` })),
    row('Type', choice({ simple: 'Simple', cb: 'Lamage', cs: 'Fraisure', tap: 'Taraudé (filetage)' }, P.type, (v) => { P.type = v; if (v === 'tap') P.dia = METRIC[P.size][0]; showExtra(); preview(); })),
    row('Diamètre', num(P.dia, (v) => { P.dia = v; preview(); }, { min: 0 }), el('span', { className: 'unit', textContent: 'mm' })),
    row('Traversant', thru), row('Profondeur', depthIn, el('span', { className: 'unit', textContent: 'mm' })),
    extra,
  ], {
    key: 'hole',
    ok: () => {
      if (!(P.dia > 0 && depth() > 0)) return false;
      const n = d.ctx.nextIndex(), name = `percage${n}`, h = depth(), e = 0.01; // dépasse un peu de la face
      const cyl = (r, hh) => `cylinder ~r:${lit(r)} ~h:${lit(hh + e)} () |> translate (Geom.V3.v 0. 0. ${litp(-hh)})`;
      let tool = cyl(P.dia / 2, h);
      if (P.type === 'tap') { const [dm, pas] = METRIC[P.size]; tool = `Cad_parts.Thread.tap ~d:${lit(dm)} ~pitch:${lit(pas)} ~h:${lit(h)} () |> translate (Geom.V3.v 0. 0. ${litp(-h)})`; }
      if (P.type === 'cb') tool = `(${tool}) + (${cyl(P.cbDia / 2, P.cbDepth)})`;
      if (P.type === 'cs') { const hc = (P.csDia - P.dia) / 2; tool = `(${tool}) + (extrude ~h:${lit(hc + e)} ~scale_top:${lit((P.csDia / 2 + e) / (P.dia / 2))} (Profile.circle ~r:${lit(P.dia / 2)}) |> translate (Geom.V3.v 0. 0. ${litp(-hc)}))`; }
      const code = `  let%feat ${name} =\n    let repere = Geom.Frame.make ~origin:${v3(p)} ~x:${v3n(frame.x)} ~z:${v3n(frame.z)} in\n    Shape.((${tool}) |> place repere)\n  in\n`;
      d.ctx.insert(code, name, 'cut', n);
    },
  });
  showExtra(); preview();
}

// Réseau (rectangulaire ou circulaire) de la feature `f` ; `geo` : son maillage (aperçu).
export function pattern(d, f, geo) {
  const P = { type: 'rect', dir1: 'X', n1: 3, s1: 10, dir2: 'Y', n2: 1, s2: 10, axis: 'Z', n: 6, angle: 360, op: /^(poche|percage)/.test(f.name) ? 'cut' : 'join' };
  const copies = () => {
    const out = [];
    if (P.type === 'rect') {
      for (let i = 0; i < P.n1; i++) for (let j = 0; j < P.n2; j++) {
        const t = new THREE.Vector3(...AXES[P.dir1]).multiplyScalar(i * P.s1).addScaledVector(new THREE.Vector3(...AXES[P.dir2]), j * P.s2);
        out.push(new THREE.Matrix4().makeTranslation(t.x, t.y, t.z));
      }
    } else for (let i = 0; i < P.n; i++) out.push(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...AXES[P.axis]), ((i * stepDeg()) * Math.PI) / 180));
    return out;
  };
  const stepDeg = () => (P.angle >= 360 ? 360 / P.n : P.angle / Math.max(1, P.n - 1));
  const preview = () => {
    const g = new THREE.Group();
    if (geo) for (const m of copies()) { const o = new THREE.Mesh(geo.clone()); o.applyMatrix4(m); g.add(o); }
    d.setPreview(g, P.op === 'cut' ? 0xe74c3c : 0x2ecc71);
  };
  const body = el('div');
  const rows = () => body.replaceChildren(...(P.type === 'rect' ? [
    row('Direction 1', choice({ X: 'X', Y: 'Y', Z: 'Z' }, P.dir1, (v) => { P.dir1 = v; preview(); })),
    row('Nombre 1', num(P.n1, (v) => { P.n1 = Math.max(1, Math.round(v)); preview(); }, { step: 1, min: 1 })),
    row('Pas 1', num(P.s1, (v) => { P.s1 = v; preview(); }), el('span', { className: 'unit', textContent: 'mm' })),
    row('Direction 2', choice({ X: 'X', Y: 'Y', Z: 'Z' }, P.dir2, (v) => { P.dir2 = v; preview(); })),
    row('Nombre 2', num(P.n2, (v) => { P.n2 = Math.max(1, Math.round(v)); preview(); }, { step: 1, min: 1 })),
    row('Pas 2', num(P.s2, (v) => { P.s2 = v; preview(); }), el('span', { className: 'unit', textContent: 'mm' })),
  ] : [
    row('Axe (origine)', choice({ X: 'X', Y: 'Y', Z: 'Z' }, P.axis, (v) => { P.axis = v; preview(); })),
    row('Nombre', num(P.n, (v) => { P.n = Math.max(1, Math.round(v)); preview(); }, { step: 1, min: 1 })),
    row('Angle total', num(P.angle, (v) => { P.angle = v; preview(); }), el('span', { className: 'unit', textContent: '°' })),
  ]));
  d.open(`RÉSEAU · ${f.name}`, [
    row('Type', choice({ rect: 'Rectangulaire', circ: 'Circulaire' }, P.type, (v) => { P.type = v; rows(); preview(); })),
    body,
    row('Opération', choice(OPS, P.op, (v) => { P.op = v; preview(); })),
  ], {
    key: 'pattern',
    ok: () => {
      const n = d.ctx.nextIndex(), name = `reseau${n}`, V = (k) => AXES[k];
      let expr;
      if (P.type === 'rect') {
        const [a, b] = [V(P.dir1).map((c) => c * P.s1), V(P.dir2).map((c) => c * P.s2)];
        const comp = (k) => [a[k] ? `float i *. ${litp(a[k])}` : '', b[k] ? `float j *. ${litp(b[k])}` : ''].filter(Boolean).join(' +. ') || '0.';
        expr = `union (List.concat (List.init ${P.n1} (fun i -> List.init ${P.n2} (fun j ->\n      ${f.name} |> translate (Geom.V3.v (${comp(0)}) (${comp(1)}) (${comp(2)}))))))`;
      } else expr = `union (List.init ${P.n} (fun i -> ${f.name} |> rotate ~axis:${AXIS_CODE[P.axis]} ~deg:(float i *. ${lit(stepDeg())})))`;
      d.ctx.insert(`  let%feat ${name} =\n    Shape.(${expr})\n  in\n`, name, P.op, n);
    },
  });
  rows(); preview();
}

// Symétrie de la feature `f` par rapport à un plan d'origine.
export function mirror(d, f, geo) {
  const P = { plane: 'YZ', op: 'join' };
  const N = { XY: 'Z', XZ: 'Y', YZ: 'X' };
  const preview = () => {
    const g = new THREE.Group();
    if (geo) { const s = new THREE.Vector3(1, 1, 1).setComponent('XYZ'.indexOf(N[P.plane]), -1); const o = new THREE.Mesh(geo.clone()); o.scale.copy(s); g.add(o); }
    d.setPreview(g, P.op === 'cut' ? 0xe74c3c : 0x2ecc71);
  };
  d.open(`SYMÉTRIE · ${f.name}`, [
    row('Plan', choice({ XY: 'Plan XY', XZ: 'Plan XZ', YZ: 'Plan YZ' }, P.plane, (v) => { P.plane = v; preview(); })),
    row('Opération', choice(OPS, P.op, (v) => { P.op = v; preview(); })),
  ], {
    key: 'mirror',
    ok: () => {
      const n = d.ctx.nextIndex(), name = `symetrie${n}`;
      d.ctx.insert(`  let%feat ${name} = Shape.(mirror ~normal:${AXIS_CODE[N[P.plane]]} ${f.name}) in\n`, name, P.op, n);
    },
  });
  preview();
}

// ---------- Chapitre 6 (Solid Editing) ----------

// Combiner : le résultat courant (cible) et un autre corps du document (outil).
export function combine(d, journal) {
  const fs = journal?.features ?? [];
  if (fs.length < 2) { d.ctx.notify('Il faut au moins deux corps à combiner.', true); return; }
  const P = { tool: fs[0].name, op: 'join' };
  const names = Object.fromEntries(fs.slice(0, -1).map((f) => [f.name, f.name]));
  d.open('COMBINER', [
    row('Corps cible', el('span', { className: 'hint', textContent: 'résultat courant' })),
    row('Corps outil', choice(names, P.tool, (v) => { P.tool = v; })),
    row('Opération', choice(OPS, P.op, (v) => { P.op = v; })),
  ], {
    key: 'combine',
    ok: () => { const n = d.ctx.nextIndex(), name = `combinaison${n}`; d.ctx.insertResult(name, (x) => `Shape.(${x} ${{ join: '+', cut: '-', intersect: '*' }[P.op]} ${P.tool})`); },
  });
}

// Déplacer : rotation autour d'un axe d'origine puis translation du résultat courant.
export function move(d) {
  const part = d.ctx.part();
  if (!part) { d.ctx.notify('Pas de pièce à déplacer.', true); return; }
  const P = { dx: 0, dy: 0, dz: 0, axis: 'Z', deg: 0 };
  const preview = () => {
    const o = new THREE.Mesh(part.geometry.clone());
    o.applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...AXES[P.axis]), (P.deg * Math.PI) / 180));
    o.applyMatrix4(new THREE.Matrix4().makeTranslation(P.dx, P.dy, P.dz));
    d.setPreview(o, 0x3d8bff);
  };
  const n3 = (k) => num(P[k], (v) => { P[k] = v; preview(); });
  d.open('DÉPLACER', [
    row('Translation x', n3('dx'), el('span', { className: 'unit', textContent: 'mm' })),
    row('Translation y', n3('dy'), el('span', { className: 'unit', textContent: 'mm' })),
    row('Translation z', n3('dz'), el('span', { className: 'unit', textContent: 'mm' })),
    row('Axe de rotation', choice({ X: 'X', Y: 'Y', Z: 'Z' }, P.axis, (v) => { P.axis = v; preview(); })),
    row('Angle', n3('deg'), el('span', { className: 'unit', textContent: '°' })),
  ], {
    key: 'move',
    ok: () => {
      const n = d.ctx.nextIndex(), name = `deplacement${n}`;
      const rot = P.deg ? ` |> rotate ~axis:${AXIS_CODE[P.axis]} ~deg:${litp(P.deg)}` : '';
      const tr = P.dx || P.dy || P.dz ? ` |> translate ${v3({ x: P.dx, y: P.dy, z: P.dz })}` : '';
      if (!rot && !tr) return false;
      d.ctx.insertResult(name, (x) => `Shape.(${x}${rot}${tr})`);
    },
  });
  preview();
}

// Tige filetée (vis) ISO : taille, longueur, position, opération (Black Book ch. 4, Thread).
export function threadRod(d) {
  const P = { size: 'M6', h: 20, pos: { x: 0, y: 0, z: 0 }, op: 'join' };
  const empty = d.ctx.isEmpty();
  const preview = () => {
    const [dm] = METRIC[P.size], c = new THREE.Mesh(new THREE.CylinderGeometry(dm / 2, dm / 2, P.h, 24));
    c.rotation.x = Math.PI / 2; c.position.set(P.pos.x, P.pos.y, P.pos.z + P.h / 2);
    d.setPreview(c, P.op === 'cut' ? 0xe74c3c : 0x2ecc71);
  };
  const xyz = el('span', { className: 'xyz' }, ...['x', 'y', 'z'].map((k) => num(P.pos[k], (v) => { P.pos[k] = v; preview(); })));
  d.open('TIGE FILETÉE', [
    row('Taille', choice(METRIC_LABELS, P.size, (v) => { P.size = v; preview(); })),
    row('Longueur', num(P.h, (v) => { P.h = v; preview(); }, { min: 0 }), el('span', { className: 'unit', textContent: 'mm' })),
    row('Position', xyz),
    row('Opération', empty ? el('span', { className: 'hint', textContent: 'Nouveau corps' }) : choice(OPS, P.op, (v) => { P.op = v; preview(); })),
  ], {
    key: 'thread',
    ok: () => {
      if (!(P.h > 0)) return false;
      const [dm, pas] = METRIC[P.size], n = d.ctx.nextIndex(), name = `filetage${n}`;
      const at = P.pos.x || P.pos.y || P.pos.z ? ` |> translate ${v3(P.pos)}` : '';
      d.ctx.insert(`  let%feat ${name} = Shape.(Cad_parts.Thread.rod ~d:${lit(dm)} ~pitch:${lit(pas)} ~h:${lit(P.h)} ()${at}) in\n`, name, P.op, n);
    },
  });
  preview();
}

// Pousser / tirer (Press Pull, ch. 6) : la face cliquée est extrudée le long de sa normale ;
// distance > 0 : matière ajoutée (Joindre), < 0 : matière retirée (Couper).
export function pressPull(d, face, loops) {
  if (!loops.length) { d.ctx.notify('Face sans contour lisible.', true); return; }
  const P = { dist: 5 };
  const shape = () => { const s = new THREE.Shape(loops[0].map((p) => new THREE.Vector2(p.x, p.y))); for (const h of loops.slice(1)) s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x, p.y)))); return s; };
  const preview = () => {
    const h = Math.abs(P.dist) || 0.01, g = new THREE.ExtrudeGeometry(shape(), { depth: h, bevelEnabled: false });
    if (P.dist < 0) g.translate(0, 0, -h);
    const m = new THREE.Mesh(g), f = face.frame; m.matrixAutoUpdate = false; m.matrix.makeBasis(f.x, f.y, f.z).setPosition(f.origin);
    d.setPreview(m, P.dist < 0 ? 0xe74c3c : 0x2ecc71);
  };
  d.open('POUSSER / TIRER', [
    row('Face', el('span', { className: 'hint', textContent: `${fmt(Math.round(face.area * 100) / 100)} mm², ${loops.length - 1} trou(s)` })),
    row('Distance', num(P.dist, (v) => { P.dist = v; preview(); }), el('span', { className: 'unit', textContent: 'mm' })),
    el('div', { className: 'hint', textContent: 'Positive : tirer (ajouter de la matière) ; négative : pousser (en retirer).' }),
  ], {
    key: 'presspull',
    ok: () => {
      if (!P.dist) return false;
      const n = d.ctx.nextIndex(), name = `poussee${n}`, h = Math.abs(P.dist), e = 0.01, f = face.frame;
      const poly = (l) => `Profile.polygon [ ${l.map((p) => `Geom.V2.v ${litp(Math.round(p.x * 1e4) / 1e4 + 0)} ${litp(Math.round(p.y * 1e4) / 1e4 + 0)}`).join('; ')} ]`;
      const prof = loops.slice(1).reduce((acc, l) => `Profile.difference (${acc}) (${poly(l)})`, poly(loops[0]));
      const z = P.dist > 0 ? -e : -h; // recouvre la face de 0,01 mm (pas de faces confondues)
      const code = `  let%feat ${name} =\n    let repere = Geom.Frame.make ~origin:${v3(f.origin)} ~x:${v3n(f.x)} ~z:${v3n(f.z)} in\n    Shape.(extrude ~h:${lit(h + e)} (${prof}) |> translate (Geom.V3.v 0. 0. ${litp(z)}) |> place repere)\n  in\n`;
      d.ctx.insert(code, name, P.dist > 0 ? 'join' : 'cut', n);
    },
  });
  preview();
}
