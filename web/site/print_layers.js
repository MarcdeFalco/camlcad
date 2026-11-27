// Aperçu des couches (impression 3D) : la pièce orientée coupée en haut de la couche k, et le
// contour de cette couche (à mi-hauteur), ce que la buse trace ; sa longueur est affichée.
import * as THREE from 'three';
import { el, fmt } from './timeline.js';
import { choice, row } from './dialogs.js';

// Segments du contour à la hauteur z : pour chaque triangle traversé, les deux points où ses
// arêtes coupent le plan (tableau plat x, y, z de paires de points).
export function sliceSegments({ vertices: V, triangles: T }, z) {
  const out = [];
  for (let t = 0; t < T.length; t += 3) {
    const pts = [];
    for (const [i, j] of [[T[t], T[t + 1]], [T[t + 1], T[t + 2]], [T[t + 2], T[t]]]) {
      const zi = V[3 * i + 2] - z, zj = V[3 * j + 2] - z;
      if ((zi < 0 && zj > 0) || (zi > 0 && zj < 0)) {
        const u = zi / (zi - zj);
        pts.push(V[3 * i] + u * (V[3 * j] - V[3 * i]), V[3 * i + 1] + u * (V[3 * j + 1] - V[3 * i + 1]), z);
      }
    }
    if (pts.length === 6) out.push(...pts);
  }
  return out;
}

export class Layers {
  // print : Print3D (preview, lastO = maillage orienté, ctx.viewport)
  constructor(print) { this.print = print; this.h = 0.2; this.n = 1; this.lines = null; }
  rows() {
    this.slider = el('input', { type: 'range', min: 1, max: 1, step: 1, value: 1, id: 'print-layer' });
    this.out = el('div', { id: 'print-layer-info', className: 'hint' });
    this.slider.oninput = () => this.show(Number(this.slider.value));
    return [row('Couches', choice({ 0.1: '0,1 mm', 0.2: '0,2 mm', 0.3: '0,3 mm' }, '0.2', (v) => { this.h = Number(v); this.reset(); }), this.slider), this.out];
  }
  // Nouvelle orientation ou hauteur de couche : toutes les couches (pièce entière).
  reset() {
    const o = this.print.lastO;
    if (!o || !this.slider) return;
    this.n = Math.max(1, Math.ceil(o.size[2] / this.h - 1e-9));
    this.slider.max = this.n; this.slider.value = this.n;
    this.show(this.n);
  }
  show(k) {
    const p = this.print, o = p.lastO;
    this.clear();
    if (!o || !p.preview) return;
    const top = Math.min(o.size[2], k * this.h), z = top - this.h / 2;
    p.preview.material.clippingPlanes = k >= this.n ? [] : [new THREE.Plane(new THREE.Vector3(0, 0, -1), top)];
    p.preview.material.needsUpdate = true;
    const seg = sliceSegments(o, z);
    let len = 0;
    for (let i = 0; i < seg.length; i += 6) len += Math.hypot(seg[i + 3] - seg[i], seg[i + 4] - seg[i + 1]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xff7a00, depthTest: false }));
    this.lines.renderOrder = 3;
    p.ctx.viewport.scene.add(this.lines);
    this.out.textContent = `Couche ${k} / ${this.n} · z = ${fmt(Math.round(z * 100) / 100)} mm · contour ${fmt(Math.round(len))} mm`;
  }
  clear() {
    if (!this.lines) return;
    this.print.ctx.viewport.scene.remove(this.lines); this.lines.geometry.dispose(); this.lines.material.dispose(); this.lines = null;
  }
}
