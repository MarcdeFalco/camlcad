// Paramètres utilisateur (Black Book ch. 6, Change Parameters) : dialogue des paramètres,
// valeurs essayées en direct puis écrites dans le code ; ajout d'un paramètre dont le nom
// est ramené à un identifiant OCaml sûr (« Épaisseur totale » → epaisseur_totale) et refusé
// s'il est réservé ou déjà pris. Chaque paramètre dit s'il est utilisé ; sinon, comment le lier.
import { el, fmt } from './timeline.js';
import { num, choice } from './dialogs.js';

const KEYWORDS = new Set(('and as assert begin class constraint do done downto else end exception external false for fun function functor if in include inherit initializer lazy let match method module mutable new nonrec object of open or private rec sig struct then to true try type val virtual when while with'
  + ' lor lxor mod land lsl lsr asr model').split(' '));

// Nom saisi → { name } (identifiant OCaml en minuscules) ou { error }.
export function paramName(raw, code) {
  const name = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
    .replace(/[\s-]+/g, '_').replace(/[^a-z0-9_']/g, '').replace(/^[0-9']+/, '');
  if (!name || name === '_') return { error: 'Donnez un nom au paramètre (lettres, chiffres, _).' };
  if (KEYWORDS.has(name)) return { error: `« ${name} » est un mot réservé d'OCaml : choisissez un autre nom.` };
  if (new RegExp(`\\blet(%\\w+)?\\s+${name}\\b`).test(code)) return { error: `« ${name} » est déjà le nom d'un paramètre ou d'une étape.` };
  return { name };
}
// Utilisations d'un paramètre dans le code, hors sa définition.
export const uses = (name, code) => (code.match(new RegExp(`(?<![\\w'%.])${name}(?![\\w'])`, 'g')) ?? []).length - 1;

// ctx : dialogs, journal(), overrides() / setOverrides(m), evalParams(), code(), write(changes),
//       locRange(loc), addParam(nom, valeur, unité), afterEval(f) (une fois le code réévalué)
export function openParams(ctx) {
  const d = ctx.dialogs, j = ctx.journal() ?? { params: [] }, overrides = ctx.overrides(), saved = new Map(overrides), code = ctx.code();
  const preview = (name, v) => { overrides.set(name, v); ctx.evalParams(); };
  const head = el('div', { className: 'prow phead' }, ...['Nom', 'Valeur', '', 'Plage'].map((t) => el('span', { textContent: t })));
  const rows = j.params.map((p) => {
    const [lo, hi] = p.range ?? [p.default / 4, p.default * 4 || 10];
    const v = overrides.get(p.name) ?? p.value, n = uses(p.name, code);
    const slider = el('input', { type: 'range', min: lo, max: hi, step: 10 ** Math.floor(Math.log10((hi - lo) / 100)), value: v });
    const box = num(v, (x) => { slider.value = x; preview(p.name, x); });
    slider.oninput = () => { box.value = fmt(Number(slider.value)); preview(p.name, Number(slider.value)); };
    return el('div', { className: 'prow' + (n ? '' : ' unused') },
      el('span', { className: 'pname', textContent: p.name, title: n ? `utilisé ${n} fois dans le code` : 'pas encore utilisé' }), box,
      el('span', { className: 'unit', textContent: p.unit ?? '' }), el('span', { className: 'range' }, slider));
  });
  const unused = j.params.filter((p) => !uses(p.name, code)).map((p) => p.name);
  // Nouveau paramètre (« + ») : écrit en tête du modèle ; le dialogue se rouvre avec lui.
  const nName = el('input', { placeholder: 'nom', spellcheck: false, className: 'noenter', id: 'param-new-name' });
  const nVal = el('input', { type: 'number', step: 'any', value: '10', className: 'noenter', id: 'param-new-value' });
  const nUnit = choice({ mm: 'mm', deg: '°', '': '—' }, 'mm', () => {});
  const err = el('div', { className: 'perr', id: 'param-error', hidden: true });
  const add = el('button', { textContent: '+ Ajouter' });
  add.onclick = () => {
    const r = paramName(nName.value, ctx.code()), v = Number(nVal.value);
    const e = r.error ?? (nVal.value === '' || !Number.isFinite(v) ? 'La valeur doit être un nombre.' : null);
    if (e) { err.textContent = e; err.hidden = false; return; }
    commit(); d.close(true);
    ctx.afterEval(() => openParams(ctx));
    ctx.addParam(r.name, v, nUnit.value);
  };
  const commit = () => {
    const changes = [];
    for (const p of j.params) {
      const v = overrides.get(p.name);
      if (v == null || !p.loc) continue;
      let lit = fmt(v); if (!/[.e]/.test(lit)) lit += '.';
      changes.push({ ...ctx.locRange(p.loc), insert: lit });
    }
    overrides.clear();
    if (changes.length) ctx.write(changes); else ctx.evalParams();
  };
  d.open('PARAMÈTRES', [head, ...rows,
    ...(unused.length ? [el('div', { className: 'hint punused', textContent: `Pas encore utilisé${unused.length > 1 ? 's' : ''} : ${unused.join(', ')}. Pour lier une cote, cliquez ƒx dans le dialogue de la feature, ou tapez le nom dans une cote d'esquisse.` })] : []),
    el('div', { className: 'hint', textContent: 'Nouveau paramètre :' }), el('div', { className: 'prow padd' }, nName, nVal, nUnit, add), err],
  { key: 'params', ok: commit, cancel: () => { ctx.setOverrides(saved); ctx.evalParams(); } });
}
