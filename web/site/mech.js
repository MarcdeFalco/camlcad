// Mécanismes : une pièce par maillage, placée par sa matrice ; panneau
// « Mouvement » (un curseur par articulation, animation, interférences).
import * as THREE from 'three';
import { Viewport } from './viewport.js';
import { el, fmt } from './timeline.js';

export class Mech {
  // ctx : viewport, pose(drivers Map) (envoie au worker), dialogs
  constructor(ctx) {
    this.ctx = ctx; this.state = null; this.drivers = new Map(); this.anim = null;
    this.inflight = false; this.next = null;
  }
  get active() { return this.state != null; }

  clear() {
    if (!this.state) return;
    for (const o of this.state.meshes) { this.ctx.viewport.scene.remove(o); o.geometry.dispose(); o.material.dispose(); }
    this.state = null; this.stop();
  }

  show(m) {
    this.clear();
    const vp = this.ctx.viewport;
    vp.clearPart();
    const meshes = m.parts.map((p) => {
      const c = p.color ? new THREE.Color(p.color[0] / 255, p.color[1] / 255, p.color[2] / 255) : new THREE.Color(0x8c9aa8);
      const o = new THREE.Mesh(Viewport.geometry(p), new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, flatShading: true }));
      o.matrixAutoUpdate = false; vp.scene.add(o); return o;
    });
    this.state = { meshes, coords: m.coords, parts: m.parts.map((p) => ({ name: p.name })), pose: new Map(), inter: [] };
    const known = new Set(m.coords.map((c) => c.name));
    for (const k of [...this.drivers.keys()]) if (!known.has(k)) this.drivers.delete(k);
    this.onPose(m);
    if (!vp.fitted) { meshes.forEach((o) => o.updateMatrixWorld(true)); vp.fit(meshes); vp.fitted = true; }
  }

  onPose(m) {
    this.inflight = false;
    if (this.next) { const d = this.next; this.next = null; this.send(d); }
    const s = this.state;
    if (!s) return;
    if (!m.ok) { s.inter = [m.error]; this.refresh(); return; }
    s.meshes.forEach((o, i) => { o.matrix.fromArray(m.matrices.slice(16 * i, 16 * i + 16)); o.matrixWorldNeedsUpdate = true; });
    s.pose = new Map(m.pose);
    s.inter = m.interferences;
    this.refresh();
  }

  send(d) {
    if (this.inflight) { this.next = d; return; }
    this.inflight = true;
    this.ctx.pose(d);
  }

  // Panneau « Mouvement » (dialogue de droite).
  panel() {
    const s = this.state;
    if (!s) return;
    const rows = s.coords.map((c) => {
      const v = s.pose.get(c.name) ?? 0;
      const out = el('span', { className: 'unit', textContent: `${fmt(v)} ${c.unit}` });
      const input = el('input', { type: 'range', min: c.lo, max: c.hi, step: (c.hi - c.lo) / 360, value: v });
      input.dataset.name = c.name;
      input.oninput = () => {
        this.stop();
        // un seul pilote à la fois : les autres coordonnées sont résolues
        this.drivers = new Map([[c.name, Number(input.value)]]);
        out.textContent = `${fmt(Number(input.value))} ${c.unit}`;
        this.send(this.drivers);
      };
      return el('div', { className: 'drow' }, el('label', { textContent: c.name }), el('div', { className: 'dctrl' }, input, out));
    });
    this.ctx.dialogs.panel('MOUVEMENT', [...rows, el('div', { id: 'inter', className: 'hint' })], 'motion');
    this.refresh();
  }
  refresh() {
    const s = this.state;
    const inter = document.getElementById('inter');
    if (inter) inter.textContent = s.inter.length ? 'Interférences : ' + s.inter.join(', ') : 'Aucune interférence.';
    for (const i of document.querySelectorAll('#dialog input[type=range][data-name]')) {
      const v = s.pose.get(i.dataset.name);
      if (v != null && !this.drivers.has(i.dataset.name)) { i.value = v; i.nextSibling.textContent = `${fmt(v)} ${s.coords.find((c) => c.name === i.dataset.name).unit}`; }
    }
  }

  stop() { if (this.anim) { cancelAnimationFrame(this.anim); this.anim = null; document.querySelector('#animate i').textContent = '▶'; } }
  toggle() {
    if (this.anim) { this.stop(); return; }
    const s = this.state;
    if (!s || !s.coords.length) return;
    const c = s.coords[0], t0 = performance.now();
    document.querySelector('#animate i').textContent = '⏸';
    const step = (t) => {
      const q = c.lo + ((((t - t0) / 4000) % 1) * (c.hi - c.lo));
      this.drivers = new Map([[c.name, q]]);
      if (!this.inflight) this.send(this.drivers);
      this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  }
}
