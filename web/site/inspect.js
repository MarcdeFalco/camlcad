// Inspection (Black Book ch. 8) : mesurer (points, faces), coupe (section analysis),
// propriétés physiques (volume, centre de gravité, masse pour l'impression).
import * as THREE from 'three';
import { el, fmt } from './timeline.js';
import { num, choice, row } from './dialogs.js';
import { planarFace } from './planes.js';

const DENSITY = { PLA: 1.24, PETG: 1.27, ABS: 1.04, TPU: 1.21 }; // g/cm³

// Volume (mm³) et centre de gravité d'un maillage fermé (tétraèdres depuis l'origine).
export function massProps({ vertices: V, triangles: T }) {
  let vol = 0; const c = [0, 0, 0];
  for (let t = 0; t < T.length; t += 3) {
    const [a, b, d] = [T[t], T[t + 1], T[t + 2]].map((i) => [V[3 * i], V[3 * i + 1], V[3 * i + 2]]);
    const det = a[0] * (b[1] * d[2] - b[2] * d[1]) - a[1] * (b[0] * d[2] - b[2] * d[0]) + a[2] * (b[0] * d[1] - b[1] * d[0]);
    vol += det / 6;
    for (let k = 0; k < 3; k++) c[k] += ((a[k] + b[k] + d[k]) * det) / 24;
  }
  return { volume: vol, center: c.map((x) => (vol ? x / vol : 0)) };
}

export class Inspect {
  // ctx : viewport, dialogs, notify(texte, erreur?), mesh() (maillage affiché), hint(texte|null)
  constructor(ctx) { this.ctx = ctx; this.measuring = false; this.picks = []; this.marks = null; this.plane = null; }

  // ---------- Mesurer ----------
  startMeasure() {
    const { dialogs } = this.ctx;
    if (!this.ctx.mesh()) { this.ctx.notify('Pas de pièce à mesurer.', true); return; }
    this.measuring = true; this.picks = [];
    dialogs.open('MESURER', [el('div', { id: 'measure-out', className: 'hint', textContent: 'Cliquez un point ou une face de la pièce, puis un second.' })],
      { key: 'measure', okLabel: 'Fermer', cancel: false });
    dialogs.ctx.onCloseExtra = () => this.stopMeasure();
  }
  stopMeasure() { this.measuring = false; this.picks = []; this.clearMarks(); }
  clearMarks() { if (this.marks) { this.ctx.viewport.scene.remove(this.marks); this.marks.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); this.marks = null; } }
  // Clic sur la pièce : point touché, face plane éventuelle.
  pick(hit) {
    const face = planarFace(this.ctx.mesh(), hit.faceIndex);
    if (this.picks.length >= 2) this.picks = [];
    this.picks.push({ p: hit.point.clone(), face });
    this.clearMarks();
    const g = (this.marks = new THREE.Group());
    for (const k of this.picks) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff8a3d, depthTest: false })); s.position.copy(k.p); s.renderOrder = 5; g.add(s); }
    const out = document.getElementById('measure-out'), r = (v) => [v.x, v.y, v.z].map((c) => fmt(Math.round(c * 100) / 100)).join(', ');
    const lines = [];
    const [a, b] = this.picks;
    lines.push(`Point 1 : (${r(a.p)})${a.face ? ` · face plane ${fmt(a.face.area)} mm²` : ''}`);
    if (b) {
      lines.push(`Point 2 : (${r(b.p)})${b.face ? ` · face plane ${fmt(b.face.area)} mm²` : ''}`);
      const d = b.p.clone().sub(a.p);
      lines.push(`Distance : ${fmt(d.length())} mm`, `Δx ${fmt(d.x)} · Δy ${fmt(d.y)} · Δz ${fmt(d.z)} mm`);
      if (a.face && b.face && Math.abs(Math.abs(a.face.frame.z.dot(b.face.frame.z)) - 1) < 1e-6)
        lines.push(`Faces parallèles, écart ${fmt(Math.abs(d.dot(a.face.frame.z)))} mm`);
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.p, b.p]), new THREE.LineBasicMaterial({ color: 0xff8a3d, depthTest: false }));
      l.renderOrder = 5; g.add(l);
    }
    this.ctx.viewport.scene.add(g);
    if (out) out.replaceChildren(...lines.map((t) => el('div', { textContent: t })));
  }

  // ---------- Coupe ----------
  section() {
    const vp = this.ctx.viewport, P = { plane: 'XZ', d: 0, flip: false };
    const N = { XY: [0, 0, 1], XZ: [0, 1, 0], YZ: [1, 0, 0] };
    vp.renderer.localClippingEnabled = true;
    const apply = () => {
      const n = new THREE.Vector3(...N[P.plane]).multiplyScalar(P.flip ? 1 : -1);
      this.plane = new THREE.Plane(n, P.flip ? -P.d : P.d);
      vp.setClip(this.plane);
    };
    this.ctx.dialogs.open('COUPE', [
      row('Plan', choice({ XY: 'Plan XY', XZ: 'Plan XZ', YZ: 'Plan YZ' }, P.plane, (v) => { P.plane = v; apply(); })),
      row('Décalage', num(P.d, (v) => { P.d = v; apply(); }), el('span', { className: 'unit', textContent: 'mm' })),
      row('Inverser', Object.assign(el('input', { type: 'checkbox' }), { onchange: (e) => { P.flip = e.target.checked; apply(); } })),
      el('div', { className: 'hint', textContent: 'La matière coupée apparaît en rouge. Fermer retire la coupe.' }),
    ], { key: 'section', okLabel: 'Fermer', cancel: false });
    this.ctx.dialogs.ctx.onCloseExtra = () => { this.plane = null; vp.setClip(null); };
    apply();
  }

  // ---------- Propriétés physiques ----------
  properties() {
    const m = this.ctx.mesh();
    if (!m || !m.triangles.length) { this.ctx.notify('Pas de pièce.', true); return; }
    const { volume, center } = massProps(m), P = { mat: 'PLA' };
    const mass = el('span');
    const upd = () => { mass.textContent = `${fmt((volume / 1000) * DENSITY[P.mat])} g (plein, ${DENSITY[P.mat]} g/cm³)`; };
    this.clearMarks();
    const g = (this.marks = new THREE.Group());
    const s = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 10), new THREE.MeshBasicMaterial({ color: 0x9b59b6, depthTest: false }));
    s.position.set(...center); s.renderOrder = 5; g.add(s); this.ctx.viewport.scene.add(g);
    this.ctx.dialogs.open('PROPRIÉTÉS', [
      row('Volume', el('span', { id: 'props-volume', textContent: `${fmt(volume / 1000)} cm³` })),
      row('Centre de gravité', el('span', { id: 'props-center', textContent: `(${center.map((c) => fmt(Math.round(c * 100) / 100)).join(', ')})` })),
      row('Matière', choice(Object.fromEntries(Object.keys(DENSITY).map((k) => [k, k])), P.mat, (v) => { P.mat = v; upd(); })),
      row('Masse', mass),
    ], { key: 'props', okLabel: 'Fermer', cancel: false });
    this.ctx.dialogs.ctx.onCloseExtra = () => this.clearMarks();
    upd();
  }
}
