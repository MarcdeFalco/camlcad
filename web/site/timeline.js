// Frise (bas de l'écran, avec lecteur et marqueur de retour arrière), navigateur
// (arbre à gauche) et menu contextuel. Toute action devient une réécriture du
// code par le worker (Cad.Source_edit) : le code reste la seule source de vérité.

export const ICONS = {
  cube: '▣', cylinder: '◎', sphere: '●', extrude: '⬆', revolve: '↻', union: '∪',
  difference: '∖', intersection: '∩', mirror: '⇋', empty: '∅',
};
export const KIND = {
  cube: 'boîte', cylinder: 'cylindre', sphere: 'sphère', extrude: 'extrusion', revolve: 'révolution',
  union: 'union', difference: 'enlèvement', intersection: 'intersection', mirror: 'symétrie', empty: 'vide',
};
export const fmt = (x) => (Math.abs(x) >= 100 ? x.toFixed(0) : Number(x.toPrecision(4)).toString());
export const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

export class Timeline {
  // ctx : edit(msg) -> Promise ; apply(code) ; select(fid, moveCursor) ; notify(texte, erreur?) ;
  // openEdit(fid) ; openParams() ; sketchOn(plan) ; gotoLine(n) ; rollback(k|null) ; toggleOrigin() -> bool
  constructor(ctx) {
    this.ctx = ctx;
    this.bar = document.getElementById('timeline'); this.tree = document.getElementById('tree');
    this.menu = document.getElementById('ctxmenu');
    this.journal = null; this.selected = null; this.marker = null; this.doc = ''; this.sketches = []; this.mech = null;
    this.open = new Set(['doc', 'params', 'origin', 'planes', 'bodies', 'sketches', 'mech']);
    document.addEventListener('pointerdown', (e) => { if (!this.menu.contains(e.target)) this.hideMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hideMenu(); });
    for (const b of document.querySelectorAll('[data-tl]')) b.onclick = () => this.player(b.dataset.tl);
  }

  // Appelé à chaque résultat : journal, sélection, nom du document, esquisses du code, mécanisme.
  update(journal, selected, info = {}) {
    this.journal = journal; this.selected = selected;
    Object.assign(this, info);
    const n = journal ? journal.features.length : 0;
    if (this.marker != null && this.marker >= n) this.setMarker(null);
    this.renderBar(); this.renderTree();
  }
  get count() { return this.journal ? this.journal.features.length : 0; }

  // ---------- Frise ----------
  // Combinaisons écrites par l'éditeur (« let%feat resultatN = Shape.(X - outil) ») : comme dans
  // un modeleur, l'outil et sa combinaison ne font qu'une étape de la frise. Rend outil.id → combinaison.
  merged() {
    const out = new Map(), fs = this.journal?.features ?? [];
    for (const r of fs)
      if (/^resultat\d+$/.test(r.name) && ['union', 'difference', 'intersection'].includes(r.op) && r.id > 0 && r.deps.includes(r.id - 1)) out.set(r.id - 1, r);
    return out;
  }
  // Positions possibles du marqueur : avant chaque étape visible, et la fin.
  boundaries() {
    const hidden = new Set([...this.merged().values()].map((r) => r.id));
    return [...(this.journal?.features ?? []).filter((f) => !hidden.has(f.id)).map((f) => f.id), this.count];
  }

  chip(f, comb) {
    const future = this.marker != null && f.id >= this.marker;
    const e = el('button', { className: 'feat' + (f.suppressed ? ' off' : '') + (f.id === this.selected ? ' sel' : '') + (future ? ' future' : '') });
    const deps = f.deps.map((d) => this.journal.features[d].name).join(', ');
    e.title = `${f.name} · ${KIND[f.op] ?? f.op}${deps ? '\nutilise : ' + deps : ''}${f.suppressed ? '\n(supprimée temporairement)' : ''}\nDouble-clic : modifier · clic droit : actions`;
    e.append(el('span', { className: 'icon', textContent: ICONS[f.op] ?? '◇' }), el('span', { className: 'name', textContent: f.name }));
    if (comb) {
      const op = { union: ['+', 'Joindre'], difference: ['−', 'Couper'], intersection: ['∩', 'Intersection'] }[comb.op];
      e.append(el('span', { className: 'op ' + comb.op, textContent: op[0] }));
      e.title += `\nOpération : ${op[1]} (${comb.name})`;
      e.classList.add('comb');
    }
    e.dataset.id = f.id;
    this.bindFeature(e, f);
    return e;
  }
  bindFeature(e, f) {
    e.onclick = () => this.ctx.select(f.id === this.selected ? null : f.id, true);
    e.ondblclick = (ev) => { ev.preventDefault(); this.ctx.select(f.id, true); this.ctx.openEdit(f.id); };
    e.oncontextmenu = (ev) => { ev.preventDefault(); this.ctx.select(f.id, true); this.showMenu(f, ev.clientX, ev.clientY); };
  }

  renderBar() {
    this.bar.replaceChildren();
    if (!this.journal) return;
    const n = this.count, m = this.marker ?? n, comb = this.merged(), hidden = new Set([...comb.values()].map((r) => r.id));
    for (const f of this.journal.features) {
      if (hidden.has(f.id)) continue;
      if (f.id === m) this.bar.append(this.markerEl());
      this.bar.append(this.chip(f, comb.get(f.id)));
    }
    if (m === n) this.bar.append(this.markerEl());
  }

  // Marqueur de retour arrière : à glisser entre deux features.
  markerEl() {
    const mk = el('span', { className: 'marker', title: 'Marqueur : glissez pour revoir la pièce à une étape' });
    mk.onpointerdown = (e) => {
      e.preventDefault();
      const move = (ev) => {
        const chips = [...this.bar.querySelectorAll('.feat')];
        let k = this.count;
        for (const c of chips) {
          const r = c.getBoundingClientRect();
          if (ev.clientX < r.left + r.width / 2) { k = Number(c.dataset.id); break; }
        }
        if (k !== (this.marker ?? this.count)) this.setMarker(k);
      };
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    };
    return mk;
  }
  setMarker(k) {
    const n = this.count;
    this.marker = k == null || k >= n ? null : Math.max(0, k);
    this.renderBar();
    this.ctx.rollback(this.marker);
  }
  player(cmd) {
    const n = this.count, m = this.marker ?? n, b = this.boundaries();
    if (cmd === 'first') this.setMarker(b[0]);
    else if (cmd === 'last') this.setMarker(null);
    else if (cmd === 'prev') this.setMarker([...b].reverse().find((k) => k < m) ?? b[0]);
    else if (cmd === 'next') this.setMarker(b.find((k) => k > m) ?? n);
    else if (cmd === 'play') {
      clearInterval(this.playing);
      let i = 0; this.setMarker(b[0]);
      this.playing = setInterval(() => { i++; this.setMarker(b[i]); if (i >= b.length - 1) clearInterval(this.playing); }, 600);
    }
  }

  // ---------- Navigateur ----------
  folder(id, label, kids, extra) {
    const li = el('li', { className: 'folder' + (this.open.has(id) ? ' open' : '') });
    const head = el('div', { className: 'row' });
    const tw = el('span', { className: 'twisty', textContent: this.open.has(id) ? '▾' : '▸' });
    head.append(tw, el('span', { className: 'icon', textContent: '▤' }), el('span', { className: 'name', textContent: label }));
    if (extra) head.append(extra);
    head.onclick = (e) => { if (e.target.closest('.eye')) return; this.open.has(id) ? this.open.delete(id) : this.open.add(id); this.renderTree(); };
    li.append(head);
    if (this.open.has(id)) li.append(el('ul', {}, ...kids));
    return li;
  }
  leaf(icon, label, { cls = '', title = '', onclick, ondblclick, eye, sub } = {}) {
    const row = el('div', { className: 'row ' + cls, title });
    if (eye) row.append(eye); else row.append(el('span', { className: 'eye-space' }));
    row.append(el('span', { className: 'icon', textContent: icon }), el('span', { className: 'name', textContent: label }));
    if (sub) row.append(el('span', { className: 'sub', textContent: sub }));
    if (onclick) row.onclick = onclick;
    if (ondblclick) row.ondblclick = ondblclick;
    return el('li', {}, row);
  }
  eye(on, title, act) {
    const b = el('button', { className: 'eye', textContent: on ? '◉' : '○', title });
    b.onclick = (e) => { e.stopPropagation(); act(); };
    return b;
  }

  renderTree() {
    const j = this.journal, kids = [];
    if (j && j.params.length)
      kids.push(this.folder('params', `Paramètres (${j.params.length})`, j.params.map((p) =>
        this.leaf('ƒ', p.name, { sub: `${fmt(p.value)}${p.unit ? ' ' + p.unit : ''}`, title: 'Ouvrir les paramètres', onclick: () => this.ctx.openParams() }))));
    const originOn = this.ctx.originVisible();
    kids.push(this.folder('origin', 'Origine', [['XY', 'Plan XY'], ['XZ', 'Plan XZ'], ['YZ', 'Plan YZ']].map(([k, label]) =>
      this.leaf('▱', label, { title: 'Nouvelle esquisse sur ce plan', onclick: () => this.ctx.sketchOn(k) })),
      this.eye(originOn, 'Afficher la grille et les axes', () => { this.ctx.toggleOrigin(); this.renderTree(); })));
    if (this.planes?.length)
      kids.push(this.folder('planes', `Construction (${this.planes.length})`, this.planes.map((k) =>
        this.leaf('▱', k, { title: 'Nouvelle esquisse sur ce plan', onclick: () => this.ctx.sketchOn(k) }))));
    if (this.sketches.length)
      kids.push(this.folder('sketches', `Esquisses (${this.sketches.length})`, this.sketches.map((s) =>
        this.leaf('✎', s.name, { title: 'Clic : aller au code · double-clic : modifier l’esquisse', onclick: () => this.ctx.gotoLine(s.line), ondblclick: () => this.ctx.editSketch(s.name) }))));
    // Corps : les solides que rien n'utilise plus (le résultat). L'historique, lui, est la frise.
    if (j) {
      const used = new Set(j.features.flatMap((f) => f.deps)), bodies = j.features.filter((f) => !used.has(f.id));
      const shown = this.ctx.partVisible();
      kids.push(this.folder('bodies', `Corps (${bodies.length})`, bodies.map((f, i) => {
        const li = this.leaf('⬢', /^resultat\d+$/.test(f.name) ? `Corps ${i + 1}` : f.name, {
          cls: (f.id === this.selected ? 'sel' : '') + (shown ? '' : ' off'),
          eye: this.eye(shown, shown ? 'Masquer le corps' : 'Afficher le corps', () => { this.ctx.togglePart(); this.renderTree(); }),
          title: `Solide « ${f.name} » · clic : sélectionner · double-clic : modifier la dernière étape · historique : la frise en bas`,
        });
        this.bindFeature(li.firstChild, f);
        return li;
      })));
    }
    if (this.mech)
      kids.push(this.folder('mech', `Pièces (${this.mech.length})`, this.mech.map((p) => this.leaf('⬢', p.name, {}))));
    const doc = this.folder('doc', this.doc || 'Document', kids);
    this.tree.replaceChildren(doc);
  }

  // ---------- Menu contextuel ----------
  showMenu(f, x, y) {
    const items = [
      ['Modifier la feature…', () => this.ctx.openEdit(f.id)],
      ['Renommer…', () => this.ctx.openEdit(f.id, true)],
      [f.suppressed ? 'Réactiver' : 'Supprimer temporairement', () => this.run({ op: 'suppress', fid: f.id, on: !f.suppressed })],
      ['Revenir avant cette étape', () => this.setMarker(f.id)],
      ...(this.ctx.sketchOf(f) ? [[`Modifier l’esquisse (${this.ctx.sketchOf(f)})`, () => this.ctx.editSketch(this.ctx.sketchOf(f))]] : []),
      ['Aller au code', () => this.ctx.select(f.id, true)],
      ['Supprimer', () => this.remove(f.id)],
    ];
    this.menu.replaceChildren(...items.map(([label, act]) => {
      const b = el('button', { textContent: label, className: label === 'Supprimer' ? 'danger' : '' });
      b.onclick = () => { this.hideMenu(); act(); };
      return b;
    }));
    this.menu.hidden = false;
    const r = this.menu.getBoundingClientRect();
    this.menu.style.left = Math.min(x, innerWidth - r.width - 4) + 'px';
    this.menu.style.top = Math.min(y, innerHeight - r.height - 4) + 'px';
  }
  hideMenu() { this.menu.hidden = true; }

  remove(fid) {
    const f = this.journal?.features[fid];
    if (f) this.run({ op: 'delete', fid }, `« ${f.name} » supprimée (Ctrl+Z dans le code pour annuler)`);
  }

  // Envoie une réécriture ; applique le code rendu, ou affiche le refus.
  async run(msg, done) {
    let r;
    try { r = await this.ctx.edit(msg); } catch (e) { this.ctx.notify(e.message, true); return null; }
    if (!r.ok) { this.ctx.notify(r.error, true); return null; }
    if (r.code != null) { this.ctx.apply(r.code); if (done) this.ctx.notify(done, false); }
    return r;
  }
}

// ---------- Utilitaires de l'éditeur ----------

// Remplace le code en ne touchant que la partie modifiée (curseur et historique préservés).
export function replaceCode(view, code) {
  const old = view.state.doc.toString();
  let a = 0; while (a < old.length && a < code.length && old[a] === code[a]) a++;
  let z = 0; while (z < old.length - a && z < code.length - a && old[old.length - 1 - z] === code[code.length - 1 - z]) z++;
  view.dispatch({ changes: { from: a, to: old.length - z, insert: code.slice(a, code.length - z) } });
}

let noticeTimer = null;
export function notify(text, isError) {
  const n = document.getElementById('notice');
  n.textContent = text; n.className = isError ? 'err' : ''; n.hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { n.hidden = true; }, isError ? 7000 : 3500);
}

// STL binaire d'un maillage {vertices, triangles}.
export function stlBlob({ vertices: v, triangles: t }) {
  const n = t.length / 3, buf = new ArrayBuffer(84 + 50 * n), dv = new DataView(buf);
  dv.setUint32(80, n, true);
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i;
    for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) dv.setFloat32(o + 12 + 12 * k + 4 * c, v[3 * t[3 * i + k] + c], true);
  }
  return new Blob([buf], { type: 'model/stl' });
}
