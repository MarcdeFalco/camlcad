// Cotes en expression (Black Book ch. 6, Parameters) : « largeur/2 + 1 » saisi dans une cote
// devient le code OCaml « largeur /. 2. +. 1. », évalué ici avec les valeurs des paramètres.
const TOKEN = /\s*(\d+(?:\.\d*)?(?:e[-+]?\d+)?|[a-z_][\w']*|[-+*/()])/gy;

function tokens(text) {
  const out = []; TOKEN.lastIndex = 0; let m;
  while (TOKEN.lastIndex < text.length && (m = TOKEN.exec(text))) out.push(m[1]);
  return TOKEN.lastIndex >= text.trimEnd().length ? out : null;
}

// Saisie → { value, expr } (expr : code OCaml, absent pour un simple nombre) ou null.
// params : [{ name, value }] (journal).
export function parseDim(text, params) {
  const t = String(text).trim();
  if (t === '') return null;
  if (/^-?\d+(\.\d*)?(e[-+]?\d+)?$/i.test(t)) return { value: Number(t) };
  const toks = tokens(t), vals = new Map(params.map((p) => [p.name, p.value]));
  if (!toks || !toks.some((k) => vals.has(k))) return null;
  let js = '', ml = [], prev = null;
  for (const k of toks) {
    if (/^\d/.test(k)) { js += k; ml.push(/[.e]/.test(k) ? k : k + '.'); }
    else if (/^[a-z_]/.test(k)) { if (!vals.has(k)) return null; js += `(${vals.get(k)})`; ml.push(k); }
    else if (k === '-' && (prev == null || /^[-+*/(]$/.test(prev))) { js += '-'; ml.push('-.'); }
    else if ('+-*/'.includes(k)) { js += k; ml.push(k + '.'); }
    else { js += k; ml.push(k); }
    prev = k;
  }
  let value;
  try { value = Function(`"use strict"; return (${js});`)(); } catch { return null; }
  if (!Number.isFinite(value)) return null;
  return { value, expr: ml.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')') };
}

// Expression OCaml (écrite par parseDim) → valeur, avec les paramètres ; NaN si illisible.
export function evalExpr(expr, params) {
  const vals = new Map(params.map((p) => [p.name, p.value]));
  const js = expr.replace(/([+*/-])\./g, '$1').replace(/[a-z_][\w']*/g, (n) => (vals.has(n) ? `(${vals.get(n)})` : 'NaN'));
  if (!/^[\d\s.()+*/eE-]+$|NaN/.test(js)) return NaN;
  try { return Function(`"use strict"; return (${js});`)(); } catch { return NaN; }
}
