// Esquisse : ce qui est posé sur le dessin sans être de la géométrie. Cotes (double-clic
// pour modifier), symboles de contraintes, élastique du tracé en cours, noms affichés.
// Classe de base de SketchEditor (sketch.js), qui fournit plane, pts, lines, circles, cons…
import * as THREE from 'three';
import { TYPED, lineRef } from './sketch_input.js';
import { TWO_CLICK, rubberShape } from './sketch_tools.js';
import { snapPoint } from './sketch_snap.js';
import { arcPoints, loopPoints, loopOutline } from './sketch_arcs.js';
import { parseDim } from './expr.js';

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
    if (first === 'a') { const ps = arcPoints(this, r0); return ps[Math.floor(ps.length * (c.kind === 'arc_radius' ? 0.25 : 0.5))]; } // rayon : au quart de l'arc, le milieu reste libre au clic
    if (c.kind === 'radius') { const C = this.circles[r0], O = P(C.c); return { x: O.x + C.r * 0.71, y: O.y + C.r * 0.71 }; }
    if (kinds === 'pp') return mid(P(c.refs[0]), P(c.refs[1]));
    if (c.kind === 'angle') { const s = this.angleVertex(c); if (s) return s.at; }
    if (first === 'l') return lineMid(r0);
    if (first === 'c') { const C = this.circles[r0], O = P(C.c); return { x: O.x, y: O.y + C.r }; }
    if (first === 'p') return P(r0);
    return null;
  }
  // Angle entre deux lignes d'un sommet commun : le sommet et la bissectrice des deux demi-droites
  // (l'étiquette s'y place, hors des lignes, comme l'arc de cote d'un modeleur).
  angleVertex(c) {
    const [l1, l2] = c.refs.map((l) => this.lines[l]), s = l1.find((p) => l2.includes(p));
    if (s == null) return null;
    const S = this.pts[s], ray = ([a, b]) => { const o = this.pts[a === s ? b : a], L = Math.hypot(o.x - S.x, o.y - S.y) || 1; return { x: (o.x - S.x) / L, y: (o.y - S.y) / L }; };
    const u = ray(l1), v = ray(l2), b = { x: u.x + v.x, y: u.y + v.y }, L = Math.hypot(b.x, b.y);
    return { at: S, n: L > 1e-9 ? { x: b.x / L, y: b.y / L } : { x: -u.y, y: u.x } };
  }
  labels() {
    let d = document.getElementById('sketch-dims');
    if (!d) {
      d = document.createElement('div'); d.id = 'sketch-dims'; this.ctx.renderer.domElement.after(d);
      // Les cotes laissent passer les clics (une cote posée sur une courbe ne la cache pas) ;
      // le double-clic sur une cote, reçu par la vue, la modifie.
      this.ctx.renderer.domElement.addEventListener('dblclick', (e) => {
        const el = [...d.querySelectorAll('.dim')].find((x) => { const r = x.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
        el?.ondblclick?.(e);
      });
    }
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
        el.className = 'dim' + (c.expr ? ' fx' : ''); el.textContent = (c.expr ? 'ƒ ' : '') + (c.kind === 'radius' ? `Ø${fmt(2 * c.value)}` : (c.kind === 'arc_radius' ? 'R' : '') + fmt(c.value) + (c.kind === 'angle' ? '°' : ''));
        el.title = `${this.consText(c)}\nDouble-clic : modifier la cote`;
        el.ondblclick = (e) => { e.stopPropagation(); this.editDim(i, el); };
      } else { el.className = 'glyph'; el.textContent = SketchMarks.GLYPH[c.kind] ?? '·'; el.title = this.consText(c); }
      el.dataset.x = at.x; el.dataset.y = at.y; el.dataset.n = n;
      // Cote de longueur : écartée de la ligne, du côté opposé au centre de l'esquisse (le clic sur la ligne reste libre).
      if (c.value != null && c.kind === 'length') {
        const [a, b] = this.lines[c.refs[0]], A = this.pts[a], B = this.pts[b], L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
        let nx = -(B.y - A.y) / L, ny = (B.x - A.x) / L;
        const g = this.pts.reduce((m, p) => ({ x: m.x + p.x / this.pts.length, y: m.y + p.y / this.pts.length }), { x: 0, y: 0 });
        if (nx * (at.x - g.x) + ny * (at.y - g.y) < 0) { nx = -nx; ny = -ny; }
        el.dataset.nx = nx; el.dataset.ny = ny;
      }
      if (c.value != null && c.kind === 'radius') { el.dataset.nx = Math.SQRT1_2; el.dataset.ny = Math.SQRT1_2; el.dataset.off = 4; } // diamètre : hors du cercle (un petit cercle garde son centre cliquable)
      if (c.value != null && c.kind === 'arc_radius') { // rayon d'arc : hors de l'arc, côté convexe
        const C = this.pts[this.arcs[c.refs[0]].c], L = Math.hypot(at.x - C.x, at.y - C.y) || 1;
        el.dataset.nx = (at.x - C.x) / L; el.dataset.ny = (at.y - C.y) / L;
      }
      if (c.value != null && ['distance', 'hdistance', 'vdistance'].includes(c.kind)) { // entre deux points : à côté du segment
        const A = this.pts[c.refs[0]], B = this.pts[c.refs[1]], L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
        let nx = -(B.y - A.y) / L, ny = (B.x - A.x) / L;
        const g = this.pts.reduce((m, p) => ({ x: m.x + p.x / this.pts.length, y: m.y + p.y / this.pts.length }), { x: 0, y: 0 });
        if (nx * (at.x - g.x) + ny * (at.y - g.y) < 0) { nx = -nx; ny = -ny; }
        el.dataset.nx = nx; el.dataset.ny = ny; el.dataset.off = 22; // comme une ligne de cote, à l'écart de ce qui passe entre les points
      }
      if (c.value != null && c.kind === 'angle') { const s = this.angleVertex(c); if (s) { el.dataset.nx = s.n.x; el.dataset.ny = s.n.y; el.dataset.off = 18; } }
      box.append(el);
    });
    this.placeLabels();
  }
  placeLabels() {
    const box = document.getElementById('sketch-dims'); if (!box || !this.group) return;
    const { camera, renderer } = this.ctx, r = renderer.domElement.getBoundingClientRect(), f = this.plane;
    camera.updateMatrixWorld();
    for (const el of box.children) {
      const w = f.origin.clone().addScaledVector(f.x, Number(el.dataset.x)).addScaledVector(f.y, Number(el.dataset.y)), v = w.clone().project(camera);
      let ox = 0, oy = 0;
      if (el.dataset.nx != null) { // le long de la normale à l'écran, l'étiquette à 6 px de la courbe (angle : 18)
        const u = w.addScaledVector(f.x, Number(el.dataset.nx)).addScaledVector(f.y, Number(el.dataset.ny)).project(camera), dx = (u.x - v.x) * r.width, dy = (v.y - u.y) * r.height, d = Math.hypot(dx, dy) || 1;
        const ux = dx / d, uy = dy / d, k = Number(el.dataset.off ?? 6) + (Math.abs(ux) * el.offsetWidth + Math.abs(uy) * el.offsetHeight) / 2; // l'étiquette entière à l'écart de la courbe
        ox = k * ux; oy = k * uy;
      }
      el.style.left = `${((v.x + 1) / 2) * r.width + (el.className === 'glyph' ? 8 + 14 * el.dataset.n : ox)}px`;
      el.style.top = `${((1 - v.y) / 2) * r.height + (el.className === 'glyph' ? 8 : oy)}px`;
    }
  }
  editDim(i, el) {
    const c = this.cons[i], input = document.createElement('input');
    const k = c.kind === 'radius' ? 2 : 1; // cercle : saisi au diamètre
    input.value = c.expr && k === 1 ? c.expr.replace(/([+*/-])\./g, '$1') : fmt(k * c.value); input.className = 'dim-edit';
    input.style.left = el.style.left; input.style.top = el.style.top;
    const done = (ok) => { if (ok && input.value !== '') { const d = parseDim(input.value, this.ctx.params?.() ?? []); if (!d) { this.redraw(); return; } c.value = d.value / k; if (d.expr) c.expr = k === 2 ? `(${d.expr}) /. 2.` : d.expr; else delete c.expr; this.changed(); } else this.redraw(); };
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
    const fv = !(snap && snap.kind === 'p') && this.tool !== 'select' && snapPoint(this, q), at = snap && snap.kind === 'p' ? this.pts[snap.i] : fv || q;
    if (this.tool === 'poly' && this.chain) line([this.pts[this.chain[this.chain.length - 1]], at]);
    if (TWO_CLICK[this.tool] && this.pending != null) line(rubberShape(this.tool, this.pts[this.pending], at, this.sides()));
    if ((snap && snap.kind === 'p') || fv) {
      const m = new THREE.Mesh(new THREE.RingGeometry(this.tol() * 0.45, this.tol() * 0.7, 16), new THREE.MeshBasicMaterial({ color: 0xff8a3d, depthTest: false, transparent: true }));
      m.position.set(at.x, at.y, 0); m.renderOrder = 6; g.add(m);
    }
    // Longueur ou rayon en cours, à côté du curseur.
    const live = document.getElementById('sketch-live') ?? Object.assign(document.createElement('div'), { id: 'sketch-live' });
    if (!live.isConnected) this.labels().after(live);
    let txt = '';
    if (this.tool === 'poly' && this.chain) {
      const s = this.chain[this.chain.length - 1], A = this.pts[s], phi = (Math.atan2(at.y - A.y, at.x - A.x) * 180) / Math.PI, ref = lineRef(this, s, phi);
      const ang = Math.abs((((phi - (ref ? ref.dir : 0)) % 360) + 540) % 360 - 180); // angle à la ligne de départ, ou à l'horizontale
      txt = `${fmt(Math.hypot(at.x - A.x, at.y - A.y))} mm · ${fmt(ang)}° · tapez la cote`;
    }
    if (TWO_CLICK[this.tool] && this.pending != null) txt = TWO_CLICK[this.tool][1](this.pts[this.pending], at);
    if (txt && TYPED[this.tool] && this.pending != null) txt += ' · tapez la cote';
    live.hidden = !txt; live.textContent = txt;
    if (txt) {
      const { camera, renderer } = this.ctx, r = renderer.domElement.getBoundingClientRect(), f = this.plane;
      const v = f.origin.clone().addScaledVector(f.x, at.x).addScaledVector(f.y, at.y).project(camera);
      live.style.left = `${((v.x + 1) / 2) * r.width + 14}px`; live.style.top = `${((1 - v.y) / 2) * r.height + 14}px`;
    }
  }


  // Outil Cote (D) : ligne → longueur, cercle → rayon, deux points → distance, deux lignes → angle.
  dimClick(q) {
    const n = this.nearest(q, true);
    if (!n) { this.sel = []; this.redraw(); return; }
    this.sel = [...this.sel.filter((x) => !(x.kind === n.kind && x.i === n.i)), { kind: n.kind, i: n.i }].slice(-2);
    const kinds = this.sel.map((x) => x.kind).join('');
    const want = { l: 'length', c: 'radius', a: 'arc_radius', pp: 'distance', ll: 'angle' }[kinds];
    // Une ligne seule attend un éventuel second élément (angle) : cote proposée tout de suite.
    const c = want && this.candidates().find((x) => x[0] === want);
    if (c) { this.asking = null; this.addConstraint(c); } else this.redraw();
  }

  // Points isolés (outil Point) : centres de perçages.
  freePoints() { return this.pts.map((_, i) => i).filter((i) => !this.lines.some((l) => l.includes(i)) && !this.circles.some((c) => c.c === i) && !this.arcs.some((a) => [a.c, a.a, a.b].includes(i))); }
  // Arcs hors de toute boucle, en segments de 5° au plus (bouts exacts) : coude arrondi d'un tuyau.
  openArcSegments() {
    const inLoop = new Set(this.loops.flatMap((l) => l.filter((it) => typeof it !== 'number' && !it.s).map((it) => it.a ?? it.r)));
    return this.arcs.flatMap(({ a, b }, k) => {
      if (inLoop.has(k)) return [];
      const ps = arcPoints(this, k); ps[0] = { ...this.pts[a] }; ps[ps.length - 1] = { ...this.pts[b] };
      return ps.slice(1).map((p, i) => [ps[i], p]);
    });
  }
  // Chemin d'un tuyau : lignes et arcs ouverts ; à défaut, les contours fermés (maillon de chaîne).
  pipeSegments() {
    const open = [...this.openLines().map(([a, b]) => [{ ...this.pts[a] }, { ...this.pts[b] }]), ...this.openArcSegments()];
    if (open.length) return open;
    return this.loops.flatMap((l) => { const ps = loopOutline(this, l).filter((p, i, a) => i === 0 || Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y) > 1e-9); return ps.map((p, i) => [p, ps[(i + 1) % ps.length]]).filter(([a, b]) => Math.hypot(b.x - a.x, b.y - a.y) > 1e-6); });
  }
  // Lignes hors de toute boucle (construction) : chemins d'une nervure.
  openLines() {
    const seqs = this.loops.map((l) => loopPoints(this, l));
    return this.lines.filter(([a, b]) => !seqs.some((q) => q.some((p, k) => { const r = q[(k + 1) % q.length]; return (p === a && r === b) || (p === b && r === a); })));
  }
}
