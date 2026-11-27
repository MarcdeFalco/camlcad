// Impression 3D (Black Book ch. 1, « 3D Print ») : orienter la pièce sur le plateau en
// cliquant la face à poser, vérifier qu'elle tient dans le volume de l'imprimante, voir les
// surplombs à supporter (> 45°), exporter le STL dans cette orientation.
import * as THREE from 'three';
import { el, fmt, stlBlob } from './timeline.js';
import { choice, row } from './dialogs.js';

export const PRINTERS = { mk4: ['Prusa MK4', 250, 210, 220], bambu: ['Bambu Lab X1/P1', 256, 256, 256], ender: ['Creality Ender 3', 220, 220, 250], mini: ['Prusa Mini', 180, 180, 180] };
const COS45 = Math.SQRT1_2;

export class Print3D {
  // ctx : viewport, dialogs, notify, mesh() (maillage évalué), download(blob, ext, nom), name()
  constructor(ctx) { this.ctx = ctx; this.preview = null; this.plate = null; this.q = new THREE.Quaternion(); this.printer = 'mk4'; }
  get active() { return this.preview != null; }

  open() {
    const m = this.ctx.mesh();
    if (!m || !m.triangles.length) { this.ctx.notify('Pas de pièce à imprimer.', true); return; }
    this.q.identity();
    const info = el('div', { id: 'print-info', className: 'hint' });
    this.ctx.dialogs.open('IMPRESSION 3D', [
      row('Imprimante', choice(Object.fromEntries(Object.entries(PRINTERS).map(([k, p]) => [k, `${p[0]} (${p[1]} × ${p[2]} × ${p[3]})`])), this.printer, (v) => { this.printer = v; this.update(); })),
      el('div', { className: 'hint', textContent: 'Cliquez la face à poser sur le plateau. Rouge : surplombs de plus de 45° (supports).' }),
      info,
      Object.assign(el('button', { textContent: 'Exporter le STL orienté' }), { onclick: () => this.export() }),
    ], { key: 'print', okLabel: 'Fermer', cancel: false });
    this.ctx.dialogs.ctx.onCloseExtra = () => this.close();
    this.update();
  }

  // Maillage orienté : sommets tournés par q, posés sur z = 0 et centrés sur le plateau.
  oriented() {
    const { vertices: V, triangles: T } = this.ctx.mesh(), n = V.length / 3, out = new Float32Array(V.length), v = new THREE.Vector3();
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
      v.set(V[3 * i], V[3 * i + 1], V[3 * i + 2]).applyQuaternion(this.q);
      for (let k = 0; k < 3; k++) { out[3 * i + k] = v.getComponent(k); lo[k] = Math.min(lo[k], out[3 * i + k]); hi[k] = Math.max(hi[k], out[3 * i + k]); }
    }
    const sh = [-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) out[3 * i + k] += sh[k];
    return { vertices: out, triangles: T, size: hi.map((h, k) => h - lo[k]) };
  }

  update() {
    const o = this.oriented(), vp = this.ctx.viewport, P = PRINTERS[this.printer];
    // Surplombs : triangles tournés vers le bas à moins de 45° de la verticale, hors plateau.
    const { vertices: V, triangles: T } = o, pos = [], col = [];
    let over = 0, bed = 0, total = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < T.length; t += 3) {
      a.fromArray(V, 3 * T[t]); b.fromArray(V, 3 * T[t + 1]); c.fromArray(V, 3 * T[t + 2]);
      const nrm = b.clone().sub(a).cross(c.clone().sub(a)), area = nrm.length() / 2; nrm.normalize();
      const onBed = Math.max(a.z, b.z, c.z) < 1e-3, down = nrm.z < -COS45 && !onBed;
      total += area; if (down) over += area; if (onBed) bed += area;
      for (const p of [a, b, c]) { pos.push(p.x, p.y, p.z); col.push(...(down ? [0.85, 0.25, 0.2] : onBed ? [0.2, 0.55, 0.95] : [0.6, 0.65, 0.7])); }
    }
    this.clear(true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    this.preview = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6 }));
    const box = new THREE.Box3(new THREE.Vector3(-P[1] / 2, -P[2] / 2, 0), new THREE.Vector3(P[1] / 2, P[2] / 2, P[3]));
    this.plate = new THREE.Group();
    this.plate.add(new THREE.Box3Helper(box, 0x7a8594));
    const bedMesh = new THREE.Mesh(new THREE.PlaneGeometry(P[1], P[2]), new THREE.MeshBasicMaterial({ color: 0x2d333b, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
    this.plate.add(bedMesh);
    vp.scene.add(this.preview, this.plate);
    if (vp.part) vp.part.visible = false; if (vp.edges) vp.edges.visible = false;
    if (vp.grid) vp.grid.visible = false;
    const fits = o.size[0] <= P[1] && o.size[1] <= P[2] && o.size[2] <= P[3];
    const info = document.getElementById('print-info');
    if (info) info.replaceChildren(
      el('div', { id: 'print-size', textContent: `Encombrement : ${o.size.map((x) => fmt(Math.round(x * 100) / 100)).join(' × ')} mm ${fits ? '✓ tient dans le volume' : '✗ dépasse le volume'}` }),
      el('div', { id: 'print-bed', textContent: `Appui sur le plateau : ${fmt(Math.round(bed))} mm²` }),
      el('div', { id: 'print-over', textContent: `Surplombs : ${fmt(Math.round(over))} mm² (${fmt(Math.round((100 * over) / total))} % de la surface)` }));
    this.fits = fits; this.overhang = over;
    this.plate.updateMatrixWorld(true); vp.fit([this.plate]);
  }

  // Clic sur la pièce affichée : la face plane touchée va sur le plateau (normale vers −z).
  pickFace(face) {
    if (!face) return;
    const n = face.frame.z.clone().normalize();
    this.q.setFromUnitVectors(n, new THREE.Vector3(0, 0, -1));
    this.update();
  }

  export() {
    const o = this.oriented();
    this.ctx.download(stlBlob(o), 'stl', `${this.ctx.name()}-impression`);
  }

  clear(keepPart) {
    const vp = this.ctx.viewport;
    for (const o of [this.preview, this.plate]) if (o) { vp.scene.remove(o); o.traverse((x) => { x.geometry?.dispose(); x.material?.dispose?.(); }); }
    this.preview = this.plate = null;
    if (!keepPart) { if (vp.part) vp.part.visible = true; if (vp.edges) vp.edges.visible = vp.style === 0; if (vp.grid) vp.grid.visible = true; }
  }
  close() { this.clear(false); this.ctx.viewport.fit(); }
}

// Mise en plan et capture : dialogue avec aperçu, téléchargement.
import { drawingSVG } from './drawing.js';
export function drawingDialog(ctx) {
  const m = ctx.mesh();
  if (!m || !m.triangles.length) { ctx.notify('Pas de pièce.', true); return; }
  const { svg, scale, size } = drawingSVG(m, ctx.name());
  const img = el('img', { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, className: 'drawing-preview', alt: 'mise en plan' });
  ctx.dialogs.open('MISE EN PLAN', [
    img,
    el('div', { id: 'drawing-info', className: 'hint', textContent: `A4 paysage, échelle ${scale >= 1 ? scale + ':1' : '1:' + Math.round(1 / scale)}, encombrement ${size.map((x) => fmt(Math.round(x * 100) / 100)).join(' × ')} mm` }),
    Object.assign(el('button', { textContent: 'Télécharger le SVG' }), { onclick: () => ctx.download(new Blob([svg], { type: 'image/svg+xml' }), 'svg', `${ctx.name()}-plan`) }),
    Object.assign(el('button', { textContent: 'Capture de la vue (PNG)' }), { onclick: async () => ctx.download(await (await fetch(ctx.viewport.capture())).blob(), 'png', `${ctx.name()}-vue`) }),
  ], { key: 'drawing', okLabel: 'Fermer', cancel: false });
}
