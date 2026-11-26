// Boîtes de dialogue de commande (à droite de la vue, comme dans un modeleur
// paramétrique) : extrusion, boîte, cylindre, sphère, modification d'une feature,
// paramètres. Un OK écrit le code ; l'aperçu est dessiné par three.js en attendant.
import * as THREE from 'three';
import { el, fmt, KIND } from './timeline.js';

const lit = (x) => { const s = Number(Number(x).toPrecision(12)).toString(); return /[.e]/.test(s) ? s : s + '.'; };
const litp = (x) => (Number(x) < 0 ? `(${lit(x)})` : lit(x));
const v3 = (x, y, z) => `(Geom.V3.v ${litp(x)} ${litp(y)} ${litp(z)})`;

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
const row = (label, ...ctrl) => el('div', { className: 'drow' }, el('label', { textContent: label }), el('div', { className: 'dctrl' }, ...ctrl));
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
    if (!this.box.hidden) { this.box.hidden = true; this.box.replaceChildren(); this.current = null; if (!silent) this.ctx.onClose?.(); }
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
    const P = { op: 'join', pos: { x: 0, y: 0, z: 0 }, l: 20, w: 20, h: 10, r: 10 };
    const preview = () => {
      let g;
      if (kind === 'box') { g = new THREE.BoxGeometry(P.l, P.w, P.h); g.translate(P.l / 2, P.w / 2, P.h / 2); }
      else if (kind === 'cylinder') { g = new THREE.CylinderGeometry(P.r, P.r, P.h, 48); g.rotateX(Math.PI / 2); g.translate(0, 0, P.h / 2); }
      else g = new THREE.SphereGeometry(P.r, 32, 16);
      g.translate(P.pos.x, P.pos.y, P.pos.z);
      this.setPreview(new THREE.Mesh(g), OP_COLOR[P.op]);
    };
    const dims = {
      box: [row('Longueur (x)', num(P.l, (v) => { P.l = v; preview(); }, { min: 0 })), row('Largeur (y)', num(P.w, (v) => { P.w = v; preview(); }, { min: 0 })), row('Hauteur (z)', num(P.h, (v) => { P.h = v; preview(); }, { min: 0 }))],
      cylinder: [row('Rayon', num(P.r, (v) => { P.r = v; preview(); }, { min: 0 })), row('Hauteur', num(P.h, (v) => { P.h = v; preview(); }, { min: 0 }))],
      sphere: [row('Rayon', num(P.r, (v) => { P.r = v; preview(); }, { min: 0 }))],
    }[kind];
    const title = { box: 'BOÎTE', cylinder: 'CYLINDRE', sphere: 'SPHÈRE' }[kind];
    const empty = this.ctx.isEmpty();
    this.open(title, [
      ...dims,
      row(kind === 'sphere' ? 'Centre' : 'Position', xyz(P.pos, preview)),
      row('Opération', empty ? el('span', { className: 'hint', textContent: 'Nouveau corps' }) : choice(OPS, P.op, (v) => { P.op = v; preview(); })),
    ], {
      key: kind,
      ok: () => {
        const n = this.ctx.nextIndex(), name = { box: 'boite', cylinder: 'cylindre', sphere: 'sphere' }[kind] + n;
        const at = P.pos.x || P.pos.y || P.pos.z ? ` |> translate ${v3(P.pos.x, P.pos.y, P.pos.z)}` : '';
        const shape = {
          box: `cube ${v3(P.l, P.w, P.h)}`, cylinder: `cylinder ~r:${lit(P.r)} ~h:${lit(P.h)} ()`, sphere: `sphere ~r:${lit(P.r)}`,
        }[kind];
        this.ctx.insert(`  let%feat ${name} = Shape.(${shape}${at}) in\n`, name, P.op, n);
      },
    });
    preview();
  }

  // ---------- Extrusion d'une esquisse ----------
  // sk : { frame, planeCode, code, loops: [[{x,y}]], circles: [{x,y,r}] } ; cancel() rouvre l'esquisse.
  extrude(sk, back) {
    const empty = this.ctx.isEmpty();
    const P = { h: 10, dir: 'one', op: empty ? 'join' : 'join' };
    const shapes = () => {
      const out = [], holes = sk.circles.map((c) => { const p = new THREE.Path(); p.absarc(c.x, c.y, c.r, 0, 2 * Math.PI, true); return p; });
      for (const l of sk.loops) { const s = new THREE.Shape(l.map((p) => new THREE.Vector2(p.x, p.y))); s.holes.push(...holes); out.push(s); }
      if (!sk.loops.length) for (const c of sk.circles) { const s = new THREE.Shape(); s.absarc(c.x, c.y, c.r, 0, 2 * Math.PI, false); out.push(s); }
      return out;
    };
    const preview = () => {
      const h = Math.max(0.01, P.h), g = new THREE.ExtrudeGeometry(shapes(), { depth: h, bevelEnabled: false, curveSegments: 32 });
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
    this.open('EXTRUSION', [
      row('Profil', el('span', { className: 'hint', textContent: `esquisse (${sk.loops.length} contour${sk.loops.length > 1 ? 's' : ''}, ${sk.circles.length} cercle${sk.circles.length > 1 ? 's' : ''})` })),
      row('Direction', dirSel),
      row('Distance', num(P.h, (v) => { P.h = v; preview(); }, { min: 0 }), el('span', { className: 'unit', textContent: 'mm' })),
      row('Opération', empty ? el('span', { className: 'hint', textContent: 'Nouveau corps' }) : opSel),
    ], {
      key: 'extrude',
      cancel: back,
      ok: () => {
        if (!(P.h > 0)) return false;
        const n = this.ctx.nextIndex(), plan = `plan${n}`, esq = `esquisse${n}`;
        const name = (P.op === 'cut' ? 'poche' : 'extrusion') + n;
        const eps = P.op === 'cut' && P.dir !== 'sym';
        let shape;
        if (P.dir === 'one' && !eps) shape = `Shape.(extrude ~h:${lit(P.h)} ${esq} |> place ${plan})`;
        else {
          const off = P.dir === 'sym' ? '(-. h /. 2.)' : P.dir === 'flip' ? '(-. h)' : '(-0.01)';
          shape = `let h = ${lit(P.h)} in\n    Shape.(extrude ~h:${eps ? '(h +. 0.01)' : 'h'} ${esq} |> translate (Geom.V3.v 0. 0. ${off}) |> place ${plan})`;
        }
        const code = `  let ${plan} = ${sk.planeCode} in\n  let%sketch ${esq} =\n${sk.code}  in\n  let%feat ${name} =\n    ${shape}\n  in\n`;
        this.ctx.insert(code, name, P.op, n);
      },
    });
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
        const pn = el('input', { value: `${f.name}_${(l.label ?? '').replace(/[~?]/g, '') || 'cote' + (i + 1)}`, spellcheck: false, className: 'noenter' });
        const go = () => this.ctx.run({ op: 'promote', fid, index: i, name: pn.value }, `paramètre « ${pn.value} » créé`);
        pn.onkeydown = (e) => { if (e.key === 'Enter') go(); };
        const ok = el('button', { textContent: 'créer' }); ok.onclick = go;
        promote.replaceWith(el('span', { className: 'promote' }, pn, ok)); pn.select();
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
  params({ overrides, preview, commit, revert }) {
    const j = this.ctx.journal();
    if (!j || !j.params.length) { this.ctx.notify('Aucun paramètre : créez-en avec ƒx dans « Modifier la feature ».', true); return; }
    const head = el('div', { className: 'prow phead' }, ...['Nom', 'Valeur', '', 'Plage'].map((t) => el('span', { textContent: t })));
    const rows = j.params.map((p) => {
      const [lo, hi] = p.range ?? [p.default / 4, p.default * 4 || 10];
      const v = overrides.get(p.name) ?? p.value;
      const slider = el('input', { type: 'range', min: lo, max: hi, step: 10 ** Math.floor(Math.log10((hi - lo) / 100)), value: v });
      const box = num(v, (x) => { slider.value = x; preview(p.name, x); });
      slider.oninput = () => { box.value = fmt(Number(slider.value)); preview(p.name, Number(slider.value)); };
      return el('div', { className: 'prow' }, el('span', { className: 'pname', textContent: p.name }), box,
        el('span', { className: 'unit', textContent: p.unit ?? '' }), el('span', { className: 'range' }, slider));
    });
    this.open('PARAMÈTRES', [head, ...rows], { key: 'params', ok: commit, cancel: revert });
  }

  // Panneau libre (mouvement d'un mécanisme…).
  panel(title, rows, key) { this.open(title, rows, { key, okLabel: 'Fermer', cancel: false }); }
}
