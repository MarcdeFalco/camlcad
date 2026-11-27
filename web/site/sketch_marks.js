// Esquisse : ce qui est posé sur le dessin sans être de la géométrie. Cotes (double-clic
// pour modifier), symboles de contraintes, élastique du tracé en cours, noms affichés.
// Classe de base de SketchEditor (sketch.js), qui fournit plane, pts, lines, circles, cons…
import * as THREE from 'three';
import { TWO_CLICK, rubberShape } from './sketch_tools.js';
import { arcPoints } from './sketch_arcs.js';

const fmt = (x) => Number((Math.round(x * 100) / 100).toFixed(2)).toString();

export class SketchMarks {
  // Nom affiché d'un élément et d'une contrainte (palette, étiquettes).
  static NAMES = {
    horizontal: 'Horizontale', vertical: 'Verticale', length: 'Longueur', parallel: 'Parallèles', perpendicular: 'Perpendiculaires',
    equal_length: 'Même longueur', angle: 'Angle', coincident: 'Confondus', distance: 'Distance', hdistance: 'Écart x', vdistance: 'Écart y',
    radius: 'Rayon', equal_radius: 'Même rayon', concentric: 'Concentriques', tangent: 'Tangente', on_line: 'Sur la droite',
    midpoint: 'Milieu', on_circle: 'Sur le cercle', arc_radius: 'Rayon', tangent_arc: 'Tangente', symmetric: 'Symétrie', point_line_distance: 'Distance au côté',
  };
  static GLYPH = { horizontal: 'H', vertical: 'V', parallel: '∥', perpendicular: '⊥', equal_length: '=', equal_radius: '=', concentric: '◎', tangent: 'T', coincident: '•', on_line: '⋯', midpoint: 'M', on_circle: '○', tangent_arc: 'T', symmetric: '⇋' };
  // Types des références de chaque contrainte : p point, l ligne, c cercle.
  static REFS = {
    horizontal: 'l', vertical: 'l', length: 'l', parallel: 'll', perpendicular: 'll', equal_length: 'll', angle: 'll',
    coincident: 'pp', distance: 'pp', hdistance: 'pp', vdistance: 'pp', radius: 'c', equal_radius: 'cc', concentric: 'cc',
    tangent: 'lc', on_line: 'pl', midpoint: 'pl', on_circle: 'pc', arc_radius: 'a', tangent_arc: 'la', symmetric: 'ppl', point_line_distance: 'pl',
  };
  refName(kind, k, i) { return ({ p: 'P', l: 'L', c: 'C', a: 'A' }[SketchMarks.REFS[kind]?.[k]] ?? '#') + (i + 1); }
  consText(c) {
    const v = c.value == null ? '' : c.kind === 'radius' ? ` = Ø${fmt(2 * c.value)} mm` : ` = ${fmt(c.value)}${c.kind === 'angle' ? '°' : ' mm'}`;
    return `${SketchMarks.NAMES[c.kind] ?? c.kind} · ${c.refs.map((i, k) => this.refName(c.kind, k, i)).join(', ')}${v}`;
  }

  // Point d'ancrage (coordonnées du plan) de l'étiquette d'une contrainte.
  anchor(c) {
    const P = (i) => this.pts[i], mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const lineMid = (l) => { const [a, b] = this.lines[l]; return mid(P(a), P(b)); };
    const kinds = SketchMarks.REFS[c.kind] ?? '';
    const first = kinds[0], r0 = c.refs[0];
    if (first === 'a') { const ps = arcPoints(this, r0); return ps[Math.floor(ps.length / 2)]; }
    if (c.kind === 'radius') { const C = this.circles[r0], O = P(C.c); return { x: O.x + C.r * 0.71, y: O.y + C.r * 0.71 }; }
    if (kinds === 'pp') return mid(P(c.refs[0]), P(c.refs[1]));
    if (first === 'l') return lineMid(r0);
    if (first === 'c') { const C = this.circles[r0], O = P(C.c); return { x: O.x, y: O.y + C.r }; }
    if (first === 'p') return P(r0);
    return null;
  }
  labels() {
    let d = document.getElementById('sketch-dims');
    if (!d) { d = document.createElement('div'); d.id = 'sketch-dims'; this.ctx.renderer.domElement.after(d); }
    return d;
  }
  // Cotes (valeur, double-clic pour modifier) et symboles de contraintes posés sur l'esquisse.
  drawLabels() {
    const box = this.labels(); box.replaceChildren();
    if (!this.group) return;
    const seen = new Map();
    this.cons.forEach((c, i) => {
      const at = this.anchor(c); if (!at) return;
      const key = `${Math.round(at.x * 10)},${Math.round(at.y * 10)}`, n = seen.get(key) ?? 0; seen.set(key, n + 1);
      const el = document.createElement('div');
      if (c.value != null) {
        el.className = 'dim'; el.textContent = c.kind === 'radius' ? `Ø${fmt(2 * c.value)}` : (c.kind === 'arc_radius' ? 'R' : '') + fmt(c.value) + (c.kind === 'angle' ? '°' : '');
        el.title = `${this.consText(c)}\nDouble-clic : modifier la cote`;
        el.ondblclick = (e) => { e.stopPropagation(); this.editDim(i, el); };
      } else { el.className = 'glyph'; el.textContent = SketchMarks.GLYPH[c.kind] ?? '·'; el.title = this.consText(c); }
      el.dataset.x = at.x; el.dataset.y = at.y; el.dataset.n = n;
      box.append(el);
    });
    this.placeLabels();
  }
  placeLabels() {
    const box = document.getElementById('sketch-dims'); if (!box || !this.group) return;
    const { camera, renderer } = this.ctx, r = renderer.domElement.getBoundingClientRect(), f = this.plane;
    camera.updateMatrixWorld();
    for (const el of box.children) {
      const v = f.origin.clone().addScaledVector(f.x, Number(el.dataset.x)).addScaledVector(f.y, Number(el.dataset.y)).project(camera);
      el.style.left = `${((v.x + 1) / 2) * r.width + (el.className === 'glyph' ? 8 + 14 * el.dataset.n : 0)}px`;
      el.style.top = `${((1 - v.y) / 2) * r.height + (el.className === 'glyph' ? 8 : 0)}px`;
    }
  }
  editDim(i, el) {
    const c = this.cons[i], input = document.createElement('input');
    const k = c.kind === 'radius' ? 2 : 1; // cercle : saisi au diamètre
    input.type = 'number'; input.step = 'any'; input.value = fmt(k * c.value); input.className = 'dim-edit';
    input.style.left = el.style.left; input.style.top = el.style.top;
    const done = (ok) => { if (ok && input.value !== '' && Number.isFinite(Number(input.value))) { c.value = Number(input.value) / k; this.changed(); } else this.redraw(); };
    input.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); };
    input.onblur = () => done(true);
    el.replaceWith(input); input.select();
  }

  // Élastique : segment, rectangle ou cercle en cours de tracé, et point d'accroche survolé.
  drawRubber() {
    if (!this.group) return;
    if (this.rubber) { this.group.remove(this.rubber); this.rubber.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); }
    const g = (this.rubber = new THREE.Group()), q = this.hover;
    this.group.add(g);
    if (!q) return;
    const line = (pts) => {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, 0))),
        new THREE.LineDashedMaterial({ color: 0x1f6feb, dashSize: this.tol() * 0.6, gapSize: this.tol() * 0.4, depthTest: false, transparent: true }));
      l.computeLineDistances(); l.renderOrder = 5; g.add(l);
    };
    const snap = this.tool !== 'select' ? this.nearest(q) : null;
    const at = snap && snap.kind === 'p' ? this.pts[snap.i] : q;
    if (this.tool === 'poly' && this.chain) line([this.pts[this.chain[this.chain.length - 1]], at]);
    if (TWO_CLICK[this.tool] && this.pending != null) line(rubberShape(this.tool, this.pts[this.pending], at, this.sides()));
    if (snap && snap.kind === 'p') {
      const m = new THREE.Mesh(new THREE.RingGeometry(this.tol() * 0.45, this.tol() * 0.7, 16), new THREE.MeshBasicMaterial({ color: 0xff8a3d, depthTest: false, transparent: true }));
      m.position.set(at.x, at.y, 0); m.renderOrder = 6; g.add(m);
    }
    // Longueur ou rayon en cours, à côté du curseur.
    const live = document.getElementById('sketch-live') ?? Object.assign(document.createElement('div'), { id: 'sketch-live' });
    if (!live.isConnected) this.labels().after(live);
    let txt = '';
    if (this.tool === 'poly' && this.chain) { const A = this.pts[this.chain[this.chain.length - 1]]; txt = fmt(Math.hypot(at.x - A.x, at.y - A.y)) + ' mm'; }
    if (TWO_CLICK[this.tool] && this.pending != null) txt = TWO_CLICK[this.tool][1](this.pts[this.pending], at);
    live.hidden = !txt; live.textContent = txt;
    if (txt) {
      const { camera, renderer } = this.ctx, r = renderer.domElement.getBoundingClientRect(), f = this.plane;
      const v = f.origin.clone().addScaledVector(f.x, at.x).addScaledVector(f.y, at.y).project(camera);
      live.style.left = `${((v.x + 1) / 2) * r.width + 14}px`; live.style.top = `${((1 - v.y) / 2) * r.height + 14}px`;
    }
  }


  // Outil Cote (D) : ligne → longueur, cercle → rayon, deux points → distance, deux lignes → angle.
  dimClick(q) {
    const n = this.nearest(q);
    if (!n) { this.sel = []; this.redraw(); return; }
    this.sel = [...this.sel.filter((x) => !(x.kind === n.kind && x.i === n.i)), { kind: n.kind, i: n.i }].slice(-2);
    const kinds = this.sel.map((x) => x.kind).join('');
    const want = { l: 'length', c: 'radius', a: 'arc_radius', pp: 'distance', ll: 'angle' }[kinds];
    // Une ligne seule attend un éventuel second élément (angle) : cote proposée tout de suite.
    const c = want && this.candidates().find((x) => x[0] === want);
    if (c) { this.asking = null; this.addConstraint(c); } else this.redraw();
  }
}
