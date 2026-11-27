// Features tirées d'une esquisse par ses lignes ouvertes (Black Book ch. 4) : nervure, tuyau.
import * as THREE from 'three';
import { el } from './timeline.js';
import { num, choice, row, OPS } from './dialogs.js';

const lit = (x) => { const s = Number(Number(x).toPrecision(10)).toString(); return /[.e]/.test(s) ? s : s + '.'; };
const litp = (x) => (Number(x) < 0 ? `(${lit(x)})` : lit(x));

// Nervure (ch. 4, Rib) : chaque ligne ouverte de l'esquisse, épaissie de t (centrée sur la
// ligne) et extrudée de h le long de la normale du plan ; Joindre par défaut.
export function rib(d, sk, back) {
  const P = { t: 2, h: 5, flip: false, op: 'join' };
  const f = sk.frame;
  const preview = () => {
    const g = new THREE.Group();
    for (const [a, b] of sk.ribs) {
      const L = Math.hypot(b.x - a.x, b.y - a.y), m = new THREE.Mesh(new THREE.BoxGeometry(L, P.t, P.h));
      m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, P.flip ? -P.h / 2 : P.h / 2); m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x); g.add(m);
    }
    g.matrixAutoUpdate = false; g.matrix.makeBasis(f.x, f.y, f.z).setPosition(f.origin);
    d.setPreview(g, P.op === 'cut' ? 0xe74c3c : 0x2ecc71);
  };
  d.open('NERVURE', [
    row('Chemins', el('span', { className: 'hint', textContent: `${sk.ribs.length} ligne(s) ouverte(s)` })),
    row('Épaisseur', num(P.t, (v) => { P.t = v; preview(); }, { min: 0 }), el('span', { className: 'unit', textContent: 'mm' })),
    row('Hauteur', num(P.h, (v) => { P.h = v; preview(); }, { min: 0 }), el('span', { className: 'unit', textContent: 'mm' })),
    row('Côté opposé', Object.assign(el('input', { type: 'checkbox' }), { onchange: (e) => { P.flip = e.target.checked; preview(); } })),
    row('Opération', d.ctx.isEmpty() ? el('span', { className: 'hint', textContent: 'Nouveau corps' }) : choice(OPS, P.op, (v) => { P.op = v; preview(); })),
  ], {
    key: 'rib', cancel: back,
    ok: () => {
      if (!(P.t > 0 && P.h > 0)) return false;
      const n = d.ctx.nextIndex(), name = `nervure${n}`, r = (x) => litp(Math.round(x * 100) / 100 + 0);
      const segs = sk.ribs.map(([a, b]) => {
        const L = Math.hypot(b.x - a.x, b.y - a.y), deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        return `cube (Geom.V3.v ${r(L)} ${r(P.t)} ${r(P.h)}) |> translate (Geom.V3.v 0. ${r(-P.t / 2)} ${r(P.flip ? -P.h : 0)}) |> rotate ~axis:Geom.V3.ez ~deg:${r(deg)} |> translate (Geom.V3.v ${r(a.x)} ${r(a.y)} 0.)`;
      });
      const pl = /^[a-z_][\w']*$/.test(sk.planeCode) ? sk.planeCode : `(${sk.planeCode})`;
      d.ctx.insert(`  let%feat ${name} =\n    Shape.(union [ ${segs.join(';\n      ')} ] |> place ${pl})\n  in\n`, name, P.op, n);
    },
  });
  preview();
}

// Tuyau (ch. 4, Pipe) le long des lignes ouvertes de l'esquisse (chemin plan) : cylindres sur
// les segments, sphères aux sommets (coudes arrondis) ; creux si une paroi est donnée.
export function pipe(d, sk, back) {
  const P = { r: 3, wall: 0, op: 'join' };
  const f = sk.frame, key = (p) => `${p.x},${p.y}`, deg = new Map();
  for (const p of sk.ribs.flat()) deg.set(key(p), [p, (deg.get(key(p))?.[1] ?? 0) + 1]);
  // Coudes : sommets partagés par deux segments (les extrémités restent ouvertes).
  const ends = [...deg.values()].filter(([, k]) => k > 1).map(([p]) => p);
  const preview = () => {
    const g = new THREE.Group();
    for (const [a, b] of sk.ribs) {
      const L = Math.hypot(b.x - a.x, b.y - a.y), m = new THREE.Mesh(new THREE.CylinderGeometry(P.r, P.r, L, 24));
      m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0); m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2; g.add(m);
    }
    for (const p of ends) { const m = new THREE.Mesh(new THREE.SphereGeometry(P.r, 24, 12)); m.position.set(p.x, p.y, 0); g.add(m); }
    g.matrixAutoUpdate = false; g.matrix.makeBasis(f.x, f.y, f.z).setPosition(f.origin);
    d.setPreview(g, P.op === 'cut' ? 0xe74c3c : 0x2ecc71);
  };
  d.open('TUYAU', [
    row('Chemin', el('span', { className: 'hint', textContent: `${sk.ribs.length} segment(s), ${ends.length} coude(s)` })),
    row('Rayon', num(P.r, (v) => { P.r = v; preview(); }, { min: 0 }), el('span', { className: 'unit', textContent: 'mm' })),
    row('Paroi (0 : plein)', num(P.wall, (v) => { P.wall = v; }, { min: 0 }), el('span', { className: 'unit', textContent: 'mm' })),
    row('Opération', d.ctx.isEmpty() ? el('span', { className: 'hint', textContent: 'Nouveau corps' }) : choice(OPS, P.op, (v) => { P.op = v; preview(); })),
  ], {
    key: 'pipe', cancel: back,
    ok: () => {
      if (!(P.r > 0) || P.wall >= P.r) return false;
      const n = d.ctx.nextIndex(), name = `tuyau${n}`, r = (x) => litp(Math.round(x * 100) / 100 + 0);
      const tube = (rad, ext) => [
        ...sk.ribs.map(([a, b]) => {
          const L = Math.hypot(b.x - a.x, b.y - a.y), deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          return `cylinder ~r:${r(rad)} ~h:${r(L + 2 * ext)} () |> rotate ~axis:Geom.V3.ey ~deg:90. |> translate (Geom.V3.v ${r(-ext)} 0. 0.) |> rotate ~axis:Geom.V3.ez ~deg:${r(deg)} |> translate (Geom.V3.v ${r(a.x)} ${r(a.y)} 0.)`;
        }),
        ...ends.map((p) => `sphere ~r:${r(rad)} |> translate (Geom.V3.v ${r(p.x)} ${r(p.y)} 0.)`),
      ].join(';\n        ');
      const pl = /^[a-z_][\w']*$/.test(sk.planeCode) ? sk.planeCode : `(${sk.planeCode})`;
      const body = P.wall > 0 ? `union [ ${tube(P.r, 0)} ] - union [ ${tube(P.r - P.wall, 0.01)} ]` : `union [ ${tube(P.r, 0)} ]`;
      d.ctx.insert(`  let%feat ${name} =\n    Shape.((${body}) |> place ${pl})\n  in\n`, name, P.op, n);
    },
  });
  preview();
}

// Coque (ch. 6, Shell) d'une extrusion écrite par l'éditeur : on retire le même profil décalé
// vers l'intérieur de t, extrudé de h − t au-dessus d'un fond d'épaisseur t (dessus ouvert).
// def : texte de la liaison de la feature ; rend un message si elle n'est pas une extrusion simple.
export function shell(d, f, def) {
  const m = /extrude ~h:([\d.]+) ([a-z_][\w']*) \|> place ([a-z_][\w']*)/.exec(def ?? '');
  if (!m) { d.ctx.notify('Coque : choisissez une extrusion « un côté » faite par l’éditeur.', true); return; }
  const [, h, esq, plan] = m, P = { t: 2 };
  d.open(`COQUE · ${f.name}`, [
    row('Épaisseur', num(P.t, (v) => { P.t = v; }, { min: 0 }), el('span', { className: 'unit', textContent: 'mm' })),
    el('div', { className: 'hint', textContent: `Parois et fond de cette épaisseur, dessus ouvert (hauteur ${h} mm).` }),
  ], {
    key: 'shell',
    ok: () => {
      if (!(P.t > 0 && P.t < Number(h))) return false;
      const n = d.ctx.nextIndex(), name = `coque${n}`, t = lit(P.t);
      d.ctx.insert(`  let%feat ${name} =\n    Shape.(extrude ~h:(${h} -. ${t} +. 0.01) (Profile.offset (-. ${t}) ${esq}) |> translate (Geom.V3.v 0. 0. ${t}) |> place ${plan})\n  in\n`, name, 'cut', n);
    },
  });
}
