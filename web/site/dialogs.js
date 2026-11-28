// Boîtes de dialogue de commande (à droite de la vue, comme dans un modeleur
// paramétrique) : extrusion, boîte, cylindre, sphère, modification d'une feature,
// paramètres. Un OK écrit le code ; l'aperçu est dessiné par three.js en attendant.
import * as THREE from 'three';
import { el, fmt, KIND } from './timeline.js';
import { basePlanes } from './planes.js';
import { distanceHandle } from './gizmo.js';
import { paramName } from './params.js';

const lit = (x) => { const s = Number(Number(x).toPrecision(12)).toString(); return /[.e]/.test(s) ? s : s + '.'; };
const litp = (x) => (Number(x) < 0 ? `(${lit(x)})` : lit(x));
const v3 = (x, y, z) => `(Geom.V3.v ${litp(x)} ${litp(y)} ${litp(z)})`;

// Plan d'une esquisse : un plan déjà nommé dans le code (plan de construction) est repris tel quel.
const named = (code) => /^[a-z_][\w']*$/.test(code);
const planDecl = (plan, code) => (named(code) ? '' : `  let ${plan} = ${code} in\n`);

export const OPS = { join: 'Joindre', cut: 'Couper', intersect: 'Intersection' };
const OP_COLOR = { join: 0x2ecc71, cut: 0xe74c3c, intersect: 0x3d8bff };

// ---------- Contrôles ----------
export function num(value, onchange, { step = 'any', min } = {}) {
  const i = el('input', { type: 'number', value: fmt(value), step });
  if (min != null) i.min = min;
  i.oninput = () => { const v = Number(i.value); if (i.value !== '' && Number.isFinite(v)) onchange(v); };
  return i;
}
export function choice(options, value, onchange) {
  const s = el('select');
  for (const [k, label] of Object.entries(options)) s.append(new Option(label, k));
  s.value = value; s.onchange = () => onchange(s.value);
  return s;
}
export const row = (label, ...ctrl) => el('div', { className: 'drow' }, el('label', { textContent: label }), el('div', { className: 'dctrl' }, ...ctrl));
const xyz = (p, on) => el('span', { className: 'xyz' }, ...['x', 'y', 'z'].map((k) => num(p[k], (v) => { p[k] = v; on(); })));

// ---------- Cadre de dialogue ----------
export class Dialogs {
  // ctx : scene, insert(code, feat, op), nextIndex(), run(msg, done), edit(msg), journal(), onClose()
  constructor(ctx) {
    this.ctx = ctx; this.box = document.getElementById('dialog'); this.preview = null; this.current = null;
    document.addEventListener('keydown', (e) => {
      if (this.box.hidden || e.target.closest('.cm-editor')) return;
      if (e.key === 'Escape') this.cancel();
      if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && !e.target.closest('.noenter')) { e.preventDefault(); this.ok(); }
    });
  }
  open(title, rows, { ok, cancel, okLabel = 'OK', cancelLabel = 'Annuler', key } = {}) {
    this.close(true);
    this.current = { ok, cancel, key };
    const okB = el('button', { className: 'primary', textContent: okLabel }); okB.onclick = () => this.ok();
    const ca = el('button', { textContent: cancelLabel }); ca.onclick = () => this.cancel();
    const head = el('div', { className: 'dhead' }, el('span', { textContent: title }));
    this.box.replaceChildren(head, el('div', { className: 'dbody' }, ...rows), el('div', { className: 'dfoot' }, ...(cancel === false ? [] : [ca]), okB));
    this.box.hidden = false;
    this.box.querySelector('input,select')?.focus();
  }
  get key() { return this.box.hidden ? null : this.current?.key; }
  ok() { const c = this.current; if (c?.ok && c.ok() === false) return; this.close(); }
  cancel() { const c = this.current; if (typeof c?.cancel === 'function') c.cancel(); this.close(); }
  close(silent) {
    this.setPreview(null);
    if (this.gizmo) { this.gizmo.dispose(); this.gizmo = null; }
    this.canvasClick = null; this.planePick = null;
    if (!this.box.hidden) {
      this.box.hidden = true; this.box.replaceChildren(); this.current = null;
      const x = this.ctx.onCloseExtra; this.ctx.onCloseExtra = null; x?.(); // nettoyage propre au dialogue (mesure, coupe…)
      if (!silent) this.ctx.onClose?.();
    }
  }
  setPreview(obj, color = 0x2ecc71) {
    if (this.preview) { this.ctx.scene.remove(this.preview); this.preview.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); }
    this.preview = obj;
    if (!obj) return;
    obj.traverse((o) => { if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false, flatShading: true }); });
    this.ctx.scene.add(obj);
  }

  // ---------- Primitives ----------
  primitive(kind) {
    const P = { op: 'join', pos: { x: 0, y: 0, z: 0 }, l: 20, w: 20, h: 10, r: 10, R: 15, rt: 3, pitch: 8, turns: 4 };
    const preview = () => {
      let g;
      if (kind === 'box') { g = new THREE.BoxGeometry(P.l, P.w, P.h); g.translate(P.l / 2, P.w / 2, P.h / 2); }
      else if (kind === 'cylinder') { g = new THREE.CylinderGeometry(P.r, P.r, P.h, 48); g.rotateX(Math.PI / 2); g.translate(0, 0, P.h / 2); }
      else if (kind === 'torus') g = new THREE.TorusGeometry(P.R, P.rt, 16, 48);
      else if (kind === 'coil') {
        const pts = Array.from({ length: 24 * P.turns + 1 }, (_, i) => { const t = (i / 24) * 2 * Math.PI; return new THREE.Vector3(P.R * Math.cos(t), P.R * Math.sin(t), (P.pitch * i) / 24); });
        g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24 * P.turns, P.rt, 8);
      }
      else g = new THREE.SphereGeometry(P.r, 32, 16);
      g.translate(P.pos.x, P.pos.y, P.pos.z);
      this.setPreview(new THREE.Mesh(g), OP_COLOR[P.op]);
    };
    const dims = {
      box: [row('Longueur (x)', num(P.l, (v) => { P.l = v; preview(); }, { min: 0 })), row('Largeur (y)', num(P.w, (v) => { P.w = v; preview(); }, { min: 0 })), row('Hauteur (z)', num(P.h, (v) => { P.h = v; preview(); }, { min: 0 }))],
      cylinder: [row('Rayon', num(P.r, (v) => { P.r = v; preview(); }, { min: 0 })), row('Hauteur', num(P.h, (v) => { P.h = v; preview(); }, { min: 0 }))],
      sphere: [row('Rayon', num(P.r, (v) => { P.r = v; preview(); }, { min: 0 }))],
      torus: [row('Rayon (axe)', num(P.R, (v) => { P.R = v; preview(); }, { min: 0 })), row('Rayon du tube', num(P.rt, (v) => { P.rt = v; preview(); }, { min: 0 }))],
      coil: [row('Rayon (axe)', num(P.R, (v) => { P.R = v; preview(); }, { min: 0 })), row('Rayon du fil', num(P.rt, (v) => { P.rt = v; preview(); }, { min: 0 })),
        row('Pas', num(P.pitch, (v) => { P.pitch = v; preview(); }, { min: 0 })), row('Tours', num(P.turns, (v) => { P.turns = Math.max(1, Math.round(v)); preview(); }, { step: 1, min: 1 }))],
    }[kind];
    const title = { box: 'BOÎTE', cylinder: 'CYLINDRE', sphere: 'SPHÈRE', torus: 'TORE', coil: 'RESSORT (HÉLICE)' }[kind];
    const empty = this.ctx.isEmpty();
    this.open(title, [
      ...dims,
      row(kind === 'sphere' || kind === 'torus' ? 'Centre' : 'Position', xyz(P.pos, preview)),
      row('Opération', empty ? el('span', { className: 'hint', textContent: 'Nouveau corps' }) : choice(OPS, P.op, (v) => { P.op = v; preview(); })),
    ], {
      key: kind,
      ok: () => {
        if (kind === 'coil' && !(P.pitch > 2 * P.rt)) { this.ctx.notify('Ressort : le pas doit dépasser le diamètre du fil.', true); return false; }
        const n = this.ctx.nextIndex(), name = { box: 'boite', cylinder: 'cylindre', sphere: 'sphere', torus: 'tore', coil: 'ressort' }[kind] + n;
        const at = P.pos.x || P.pos.y || P.pos.z ? ` |> translate ${v3(P.pos.x, P.pos.y, P.pos.z)}` : '';
        const shape = {
          box: `cube ${v3(P.l, P.w, P.h)}`, cylinder: `cylinder ~r:${lit(P.r)} ~h:${lit(P.h)} ()`, sphere: `sphere ~r:${lit(P.r)}`,
          torus: `revolve (Profile.translate (Geom.V2.v ${lit(P.R)} 0.) (Profile.circle ~r:${lit(P.rt)}))`,
          // Ressort : cercle décalé de l'axe, extrudé en tournant d'un tour par pas (hélice).
          coil: `extrude ~twist:${lit(360 * P.turns)} ~h:${lit(P.pitch * P.turns)} (Profile.translate (Geom.V2.v ${lit(P.R)} 0.) (Profile.circle ~r:${lit(P.rt)}))`,
        }[kind];
        this.ctx.insert(`  let%feat ${name} = Shape.(${shape}${at}) in\n`, name, P.op, n);
      },
    });
    preview();
  }

  // ---------- Extrusion d'une esquisse ----------
  // sk : { frame, planeCode, code, loops: [[{x,y}]], circles: [{x,y,r}] } ; cancel() rouvre l'esquisse.
  extrude(sk0, back) {
    let sk = sk0;
    const empty = this.ctx.isEmpty();
    const P = { h: 10, dir: 'one', op: 'join', taper: 0 };
    // Régions comme Cad.Profile.regions : chaque contour ou cercle moins ceux qu'il contient
    // directement, par profondeur d'imbrication puis ordre (contours, puis cercles). Cochées par
    // défaut : profondeur paire (le profil de l'esquisse) ; on en choisit d'autres comme on
    // clique des régions dans un modeleur (l'anneau entre deux cercles, par exemple).
    const inside = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
    // Point témoin d'un contour : juste à l'intérieur, au milieu de son premier côté (deux faces
    // voisines partagent des sommets ; un sommet ne dirait pas laquelle contient l'autre).
    const probe = (l) => { const a = l[0], b = l.find((p) => Math.hypot(p.x - a.x, p.y - a.y) > 1e-6) ?? a, ar = l.reduce((s, p, i) => { const q = l[(i + 1) % l.length]; return s + p.x * q.y - q.x * p.y; }, 0), d = Math.hypot(b.x - a.x, b.y - a.y) || 1, e = Math.min(1e-3, d * 1e-3) * Math.sign(ar || 1); return { x: (a.x + b.x) / 2 - ((b.y - a.y) / d) * e, y: (a.y + b.y) / 2 + ((b.x - a.x) / d) * e }; };
    const regs = [...sk.loops.map((l) => ({ l, probe: probe(l), has: (p) => inside(p, l) })),
      ...sk.circles.map((c) => ({ c, probe: { x: c.x + c.r, y: c.y }, has: (p) => Math.hypot(p.x - c.x, p.y - c.y) < c.r - 1e-6 }))];
    for (const g of regs) g.depth = regs.filter((m) => m !== g && m.has(g.probe)).length;
    regs.sort((u, v) => u.depth - v.depth); // tri stable, comme Profile.regions
    const sel = regs.map((g) => g.depth % 2 === 0), dflt = sel.slice(), choosable = regs.length > 1 && !(sk.ellipses?.length);
    const boxes = regs.map((g, i) => Object.assign(el('input', { type: 'checkbox', checked: sel[i] }), { onchange: (e) => { sel[i] = e.target.checked; preview(); } }));
    // Comme dans Fusion : un clic dans la vue choisit la région sous le curseur (le premier clic
    // remplace le choix d'office, les suivants ajoutent ou retirent).
    let picked = false;
    const regionClick = choosable && this.ctx.viewport ? (e) => {
      const r = this.ctx.viewport.ray(e).ray, f = sk.frame, den = r.direction.dot(f.z);
      if (Math.abs(den) < 1e-9) return false;
      const P = r.origin.clone().addScaledVector(r.direction, f.origin.clone().sub(r.origin).dot(f.z) / den).sub(f.origin), q = { x: P.dot(f.x), y: P.dot(f.y) };
      let k = -1; regs.forEach((g, i) => { if (g.has(q) && (k < 0 || g.depth > regs[k].depth)) k = i; });
      if (k < 0) return false;
      if (!picked) { sel.fill(false); picked = true; }
      sel[k] = !sel[k]; boxes.forEach((b, i) => { b.checked = sel[i]; }); preview();
      this.gizmo?.focus(); return true;
    } : null;
    const shapes = () => {
      const path = (g, P) => { const s = new P(); if (g.c) s.absarc(g.c.x, g.c.y, g.c.r, 0, 2 * Math.PI, P === THREE.Path); else { s.moveTo(g.l[0].x, g.l[0].y); for (const p of g.l.slice(1)) s.lineTo(p.x, p.y); } return s; };
      const out = [];
      regs.forEach((g, i) => {
        if (!sel[i]) return;
        const s = path(g, THREE.Shape);
        for (const h of regs) if (h.depth === g.depth + 1 && g.has(h.probe)) s.holes.push(path(h, THREE.Path));
        out.push(s);
      });
      for (const e of sk.ellipses ?? []) { const v = e.map((p) => new THREE.Vector2(p.x, p.y)); if (out.length) out.forEach((sh) => sh.holes.push(new THREE.Path(v))); else out.push(new THREE.Shape(v)); }
      return out;
    };
    const preview = () => {
      const h = Math.max(0.01, P.h), g = new THREE.ExtrudeGeometry(shapes(), { depth: h, bevelEnabled: false, curveSegments: 32 });
      // Dépouille (aperçu) : sommets du haut rapprochés du centre de h·tan(α) (le code fait l'onglet exact).
      if (P.taper) {
        g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3()), p = g.attributes.position, t = Math.tan((P.taper * Math.PI) / 180);
        for (let i = 0; i < p.count; i++) { const z = p.getZ(i), dx = p.getX(i) - c.x, dy = p.getY(i) - c.y, r = Math.hypot(dx, dy) || 1, k = Math.max(0, 1 - (z * t) / r); p.setXY(i, c.x + dx * k, c.y + dy * k); }
      }
      g.translate(0, 0, P.dir === 'one' ? 0 : P.dir === 'flip' ? -h : -h / 2);
      const m = new THREE.Mesh(g), f = sk.frame;
      m.matrixAutoUpdate = false; m.matrix.makeBasis(f.x, f.y, f.z).setPosition(f.origin);
      this.setPreview(m, OP_COLOR[P.op]);
    };
    const DIRS = { one: 'Un côté', flip: 'Côté opposé', sym: 'Symétrique' };
    let dirSel;
    const opSel = choice(OPS, P.op, (v) => {
      P.op = v;
      // Couper part en général d'une face, vers l'intérieur de la matière.
      if (v === 'cut' && P.dir === 'one') { P.dir = 'flip'; dirSel.value = 'flip'; }
      preview();
    });
    dirSel = choice(DIRS, P.dir, (v) => { P.dir = v; preview(); });
    const hIn = num(P.h, (v) => { P.h = v; preview(); this.gizmo?.set(P.dir === 'flip' ? -v : v); }, { min: 0 });
    this.open('EXTRUSION', [
      row('Profil', el('span', { className: 'hint', textContent: `esquisse (${sk.loops.length} contour${sk.loops.length > 1 ? 's' : ''}, ${sk.circles.length} cercle${sk.circles.length > 1 ? 's' : ''})` })),
      ...(choosable ? [row('Régions', el('span', { className: 'profiles', title: 'Régions à extruder : cliquez-les dans la vue, ou cochez-les (1 : la plus extérieure)' }, ...boxes.map((b, i) => el('label', {}, b, ` ${i + 1} `))))] : []),
      row('Direction', dirSel),
      row('Distance', hIn, el('span', { className: 'unit', textContent: 'mm' }),
        // Jusqu'à une face (ch. 3, Extent « To ») : la distance au plan d'une face plane parallèle.
        ...(this.ctx.pickFace && !empty ? [Object.assign(el('button', { textContent: 'Jusqu’à…', id: 'extrude-to', title: 'Jusqu’à une face plane parallèle (cliquez-la)' }), { onclick: () => this.ctx.pickFace('Cliquez la face plane où s’arrête l’extrusion', (hit, f) => {
          const n = sk.frame.z, z = f.frame.z.clone().normalize();
          if (Math.abs(Math.abs(z.dot(n)) - 1) > 1e-6) { this.ctx.notify('Jusqu’à : la face doit être parallèle au plan de l’esquisse.', true); return; }
          const dist = f.frame.origin.clone().sub(sk.frame.origin).dot(n);
          if (Math.abs(dist) < 1e-6) return;
          P.dir = dist > 0 ? 'one' : 'flip'; dirSel.value = P.dir; P.h = Math.round(Math.abs(dist) * 1e4) / 1e4; hIn.value = String(P.h);
          this.gizmo?.set(dist); preview();
        }) })] : [])),
      row('Dépouille', num(P.taper, (v) => { P.taper = v; preview(); }), el('span', { className: 'unit', textContent: '°' })),
      row('Opération', empty ? el('span', { className: 'hint', textContent: 'Nouveau corps' }) : opSel),
    ], {
      key: 'extrude',
      cancel: back,
      ok: () => {
        if (!(P.h > 0) || (regs.length && !sel.some(Boolean))) return false; // ellipses seules : pas de région à choisir
        if (P.taper && sk.loops.length + sk.circles.length + (sk.ellipses?.length ?? 0) > 1) { this.ctx.notify('Dépouille : un seul contour simple (sans trou).', true); return false; }
        // Esquisse déjà dans le code (sk.existing) : réutilisée, pas réécrite.
        const n = this.ctx.nextIndex(), plan = `plan${n}`, sname = sk.existing ?? `esquisse${n}`;
        const esq = sel.every((x, i) => x === dflt[i]) ? sname
          : sel.map((x, i) => (x ? `(Profile.region ${i} ${sname})` : null)).filter(Boolean).reduce((u, v) => `(Profile.union ${u} ${v})`);
        const name = (P.op === 'cut' ? 'poche' : 'extrusion') + n;
        const eps = P.op === 'cut' && P.dir !== 'sym';
        let shape;
        const tp = P.taper ? `~taper:${litp(P.taper)} ` : '';
        if (P.dir === 'one' && !eps) shape = `Shape.(extrude ${tp}~h:${lit(P.h)} ${esq} |> place ${named(sk.planeCode) ? sk.planeCode : plan})`;
        else {
          const off = P.dir === 'sym' ? '(-. h /. 2.)' : P.dir === 'flip' ? '(-. h)' : '(-0.01)';
          shape = `let h = ${lit(P.h)} in\n    Shape.(extrude ${tp}~h:${eps ? '(h +. 0.01)' : 'h'} ${esq} |> translate (Geom.V3.v 0. 0. ${off}) |> place ${named(sk.planeCode) ? sk.planeCode : plan})`;
        }
        const code = `${planDecl(plan, sk.planeCode)}${sk.existing ? '' : `  let%sketch ${sname} =\n${sk.code}  in\n`}  let%feat ${name} =\n    ${shape}\n  in\n`;
        this.ctx.insert(code, name, P.op, n);
      },
    });
    preview();
    this.canvasClick = regionClick;
    // Esquisse déjà utilisée (reprise depuis le navigateur) : dessinée pendant le dialogue, pour
    // y voir et cliquer ses régions (Fusion : œil de l'esquisse, puis Répéter l'extrusion).
    if (sk.existing && this.ctx.showSketch) { this.ctx.showSketch(sk.existing, sk); this.ctx.onCloseExtra = () => this.ctx.hideSketch?.(sk.existing); }
    // Flèche de distance au centre du profil, à tirer dans la vue (négatif : côté opposé).
    if (this.ctx.viewport) {
      const pts = sk.loops.length ? sk.loops.flat() : sk.circles, f = sk.frame;
      const c = pts.reduce((a, p) => ({ x: a.x + p.x / pts.length, y: a.y + p.y / pts.length }), { x: 0, y: 0 });
      const origin = f.origin.clone().addScaledVector(f.x, c.x).addScaledVector(f.y, c.y);
      this.gizmo = distanceHandle(this.ctx.viewport, { origin, dir: f.z, value: P.h, onChange: (v) => {
        if (v < 0 && P.dir === 'one') { P.dir = 'flip'; dirSel.value = 'flip'; } else if (v > 0 && P.dir === 'flip') { P.dir = 'one'; dirSel.value = 'one'; }
        P.h = Math.abs(v); hIn.value = String(P.h); preview();
      }, onType: (x) => {
        if (x < 0 && P.dir === 'one') { P.dir = 'flip'; dirSel.value = 'flip'; } else if (x > 0 && P.dir === 'flip') { P.dir = 'one'; dirSel.value = 'one'; } // négatif : de l'autre côté
        P.h = Math.abs(x); hIn.value = String(P.h); this.gizmo?.set(P.dir === 'flip' ? -P.h : P.h); preview(); } });
      window.camlcadGizmo = this.gizmo; // inspection (tests)
    }
  }

  // ---------- Révolution d'une esquisse ----------
  // Axe : y ou x de l'esquisse, ou une de ses lignes. Le noyau tourne autour du y local
  // (rayon = x) et rend l'axe selon z : le profil est d'abord ramené sur l'axe, puis
  // le solide est replacé dans le plan d'esquisse.
  revolve(sk, back) {
    const empty = this.ctx.isEmpty();
    const axes = { Y: { name: 'Axe y de l’esquisse', a: { x: 0, y: 0 }, b: { x: 0, y: 1 } }, X: { name: 'Axe x de l’esquisse', a: { x: 0, y: 0 }, b: { x: 1, y: 0 } } };
    for (const l of sk.lines) axes[l.name] = { name: `Ligne ${l.name}`, a: l.a, b: l.b };
    const P = { axis: 'Y', deg: 360, op: 'join', sym: false };
    const geom = () => {
      const { a, b } = axes[P.axis], t = Math.atan2(b.y - a.y, b.x - a.x);
      // Rotation qui amène l'axe sur +y, le profil du côté x > 0 (le noyau coupe x < 0).
      let rot = 90 - (t * 180) / Math.PI;
      const r = (rot * Math.PI) / 180, pts = [...sk.loops.flat(), ...sk.circles];
      const side = pts.reduce((acc, p) => acc + Math.cos(r) * (p.x - a.x) - Math.sin(r) * (p.y - a.y), 0);
      if (side < 0) rot += 180;
      return { a, rot: ((rot % 360) + 360) % 360 };
    };
    const preview = () => {
      const { a, rot } = geom(), r = (rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
      const to = (p) => new THREE.Vector2(Math.abs(c * (p.x - a.x) - s * (p.y - a.y)), s * (p.x - a.x) + c * (p.y - a.y));
      const g = new THREE.Group();
      const outlines = [...sk.loops, ...sk.circles.map((k) => Array.from({ length: 33 }, (_, i) => ({ x: k.x + k.r * Math.cos((i / 32) * 2 * Math.PI), y: k.y + k.r * Math.sin((i / 32) * 2 * Math.PI) })))];
      for (const l of outlines) {
        const pts = [...l, l[0]].map(to);
        const phi = (Math.max(1, P.deg) * Math.PI) / 180;
        g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48, P.sym ? -phi / 2 : 0, phi)));
      }
      // Lathe : axe y, rayon x ; ramené dans le plan d'esquisse (inverse de la mise sur l'axe).
      const m = new THREE.Matrix4().makeRotationZ(-r).premultiply(new THREE.Matrix4().makeTranslation(a.x, a.y, 0));
      const f = sk.frame, w = new THREE.Matrix4().makeBasis(f.x, f.y, f.z).setPosition(f.origin);
      g.matrixAutoUpdate = false; g.matrix.copy(w.multiply(m));
      this.setPreview(g, OP_COLOR[P.op]);
    };
    this.open('RÉVOLUTION', [
      row('Profil', el('span', { className: 'hint', textContent: `esquisse (${sk.loops.length} contour${sk.loops.length > 1 ? 's' : ''}, ${sk.circles.length} cercle${sk.circles.length > 1 ? 's' : ''})` })),
      row('Axe', choice(Object.fromEntries(Object.entries(axes).map(([k, v]) => [k, v.name])), P.axis, (v) => { P.axis = v; preview(); })),
      row('Angle', num(P.deg, (v) => { P.deg = v; preview(); }, { min: 0 }), el('span', { className: 'unit', textContent: '°' })),
      row('Symétrique', Object.assign(el('input', { type: 'checkbox', id: 'revolve-sym' }), { onchange: (e) => { P.sym = e.target.checked; preview(); } })),
      row('Opération', empty ? el('span', { className: 'hint', textContent: 'Nouveau corps' }) : choice(OPS, P.op, (v) => { P.op = v; preview(); })),
    ], {
      key: 'revolve', cancel: back,
      ok: () => {
        if (!(P.deg > 0 && P.deg <= 360)) return false;
        const { a, rot } = geom(), n = this.ctx.nextIndex(), plan = `plan${n}`, esq = `esquisse${n}`, name = `revolution${n}`;
        const r = Math.round(rot * 1e4) / 1e4;
        const prof = `${esq}${a.x || a.y ? ` |> Profile.translate (Geom.V2.v ${litp(-a.x)} ${litp(-a.y)})` : ''}${r ? ` |> Profile.rotate ~deg:${litp(r)}` : ''}`;
        const back3 = `${r ? ` |> rotate ~axis:Geom.V3.ez ~deg:${litp(-r)}` : ''}${a.x || a.y ? ` |> translate ${v3(a.x, a.y, 0)}` : ''}`;
        const deg = P.deg === 360 ? '' : ` ~deg:${lit(P.deg)}`, half = P.sym && P.deg < 360 ? ` |> rotate ~axis:Geom.V3.ez ~deg:${litp(-P.deg / 2)}` : '';
        const code = `${planDecl(plan, sk.planeCode)}  let%sketch ${esq} =\n${sk.code}  in\n  let%feat ${name} =\n    Shape.(revolve${deg} (${prof})${half} |> rotate ~axis:Geom.V3.ex ~deg:(-90.)${back3} |> place ${named(sk.planeCode) ? sk.planeCode : plan})\n  in\n`;
        this.ctx.insert(code, name, P.op, n);
      },
    });
    preview();
  }

  // ---------- Plan décalé (construction) ----------
  offsetPlane(done) {
    const P = { ref: 'XY', d: 10 };
    const N = { XY: [0, 0, 1], XZ: [0, -1, 0], YZ: [1, 0, 0] };
    const preview = () => {
      const g = new THREE.PlaneGeometry(40, 40); const m = new THREE.Mesh(g), n = new THREE.Vector3(...N[P.ref]);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); m.position.copy(n.multiplyScalar(P.d));
      this.setPreview(m, 0xe0a030);
    };
    const refSel = choice({ XY: 'Plan XY', XZ: 'Plan XZ', YZ: 'Plan YZ' }, P.ref, (v) => { P.ref = v; preview(); });
    this.open('PLAN DÉCALÉ', [
      row('Référence', refSel),
      row('Distance', num(P.d, (v) => { P.d = v; preview(); }), el('span', { className: 'unit', textContent: 'mm' })),
    ], { key: 'offsetplane', ok: () => done(`Geom.Plane.offset ${litp(P.d)} Geom.Plane.${P.ref.toLowerCase()}`) });
    // Plan d'origine cliqué dans le navigateur pendant le dialogue : la référence (comme Fusion).
    this.planePick = (k) => { if (!N[k]) return false; P.ref = k; refSel.value = k; preview(); return true; };
    preview();
  }

  // ---------- Plan à un angle (construction) ----------
  // Plan d'origine tourné autour de son axe x ou y local ; done(repère three.js).
  anglePlane(done) {
    const P = { ref: 'XY', axis: 'x', deg: 45 };
    const frame = () => {
      const b = basePlanes[P.ref].frame, ax = P.axis === 'x' ? b.x : b.y, q = new THREE.Quaternion().setFromAxisAngle(ax, (P.deg * Math.PI) / 180);
      return { origin: b.origin.clone(), x: b.x.clone().applyQuaternion(q), y: b.y.clone().applyQuaternion(q), z: b.z.clone().applyQuaternion(q) };
    };
    const preview = () => { const f = frame(), m = new THREE.Mesh(new THREE.PlaneGeometry(40, 40)); m.matrixAutoUpdate = false; m.matrix.makeBasis(f.x, f.y, f.z); this.setPreview(m, 0xe0a030); };
    this.open('PLAN À UN ANGLE', [
      row('Référence', choice({ XY: 'Plan XY', XZ: 'Plan XZ', YZ: 'Plan YZ' }, P.ref, (v) => { P.ref = v; preview(); })),
      row('Axe', choice({ x: 'x du plan', y: 'y du plan' }, P.axis, (v) => { P.axis = v; preview(); })),
      row('Angle', num(P.deg, (v) => { P.deg = v; preview(); }), el('span', { className: 'unit', textContent: '°' })),
    ], { key: 'angleplane', ok: () => done(frame()) });
    preview();
  }

  // ---------- Modifier une feature (cotes littérales, nom, suppression) ----------
  async feature(fid, focusName) {
    const f = this.ctx.journal()?.features[fid];
    if (!f) return;
    let r;
    try { r = await this.ctx.edit({ op: 'literals', fid }); } catch (e) { this.ctx.notify(e.message, true); return; }
    if (!r.ok) { this.ctx.notify(r.error, true); return; }
    const name = el('input', { value: f.name, spellcheck: false, className: 'noenter' });
    name.onkeydown = (e) => { if (e.key === 'Enter' && name.value !== f.name) this.ctx.run({ op: 'rename', fid, name: name.value }); };
    const sup = el('input', { type: 'checkbox', checked: f.suppressed });
    sup.onchange = () => this.ctx.run({ op: 'suppress', fid, on: sup.checked });
    const rows = r.literals.map((l, i) => {
      const input = num(l.value, () => {}, { step: l.int ? 1 : 'any' });
      input.oninput = null;
      input.onchange = () => { const v = Number(input.value); if (input.value !== '' && Number.isFinite(v) && v !== l.value) this.ctx.run({ op: 'set_literal', fid, index: i, value: v }); };
      const label = l.label ? l.label.slice(1) + (l.label === '~deg' ? ' (°)' : '') : `cote ${i + 1}`;
      const ctx = el('code', { className: 'ctx', title: l.before + l.text + l.after });
      ctx.append('…' + l.before, el('b', { textContent: l.text }), l.after + '…');
      const promote = el('button', { textContent: 'ƒx', title: 'Remplacer cette cote par un paramètre (let%param)' });
      promote.onclick = () => {
        // Nom d'un paramètre existant (proposé) : la cote s'y lie ; sinon, nouveau paramètre.
        const params = (this.ctx.journal()?.params ?? []).map((p) => p.name), list = el('datalist', { id: `params-${i}` }, ...params.map((n) => new Option(n)));
        const pn = el('input', { value: `${f.name}_${(l.label ?? '').replace(/[~?]/g, '') || 'cote' + (i + 1)}`, spellcheck: false, className: 'noenter', title: 'Nom d’un paramètre existant, ou d’un nouveau' });
        pn.setAttribute('list', list.id);
        const go = () => {
          if (params.includes(pn.value.trim())) { this.ctx.run({ op: 'use_param', fid, index: i, name: pn.value.trim() }, `cote liée à « ${pn.value.trim()} »`); return; }
          const r = paramName(pn.value, this.ctx.codeText());
          if (r.error) { this.ctx.notify(r.error, true); return; }
          this.ctx.run({ op: 'promote', fid, index: i, name: r.name }, `paramètre « ${r.name} » créé`);
        };
        pn.onkeydown = (e) => { if (e.key === 'Enter') go(); };
        const ok = el('button', { textContent: 'créer' }); ok.onclick = go;
        promote.replaceWith(el('span', { className: 'promote' }, pn, list, ok)); pn.select();
      };
      return el('div', { className: 'lit' }, row(label, input, promote), ctx);
    });
    this.open(`MODIFIER · ${(KIND[f.op] ?? f.op).toUpperCase()}`, [
      row('Nom', name), row('Supprimée temp.', sup),
      ...(rows.length ? rows : [el('div', { className: 'hint', textContent: 'Aucune cote littérale : cette feature dépend seulement de paramètres et d’autres features.' })]),
    ], { key: 'edit:' + f.name, okLabel: 'Fermer', cancel: false });
    if (focusName) name.select();
  }

  // ---------- Paramètres (tableau) ----------
  // overrides : Map nom → valeur (essais sans recompilation) ; commit() écrit dans le code.
  // Panneau libre (mouvement d'un mécanisme…).
  panel(title, rows, key) { this.open(title, rows, { key, okLabel: 'Fermer', cancel: false }); }
}
