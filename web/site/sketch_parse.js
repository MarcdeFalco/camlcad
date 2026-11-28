import { frameFromNumbers } from './planes.js';
import { evalExpr } from './expr.js';

// Relecture d'une esquisse écrite par l'éditeur (format de Cad.Sketch_desc.to_code) pour la
// rouvrir à la souris (« Modifier l'esquisse », Black Book ch. 2). Le code reste la source :
// si le texte n'est pas exactement celui que l'éditeur écrirait, on refuse (édition à la main).

const num = (s) => Number(s.replace(/[()]/g, ''));
const idx = (s) => Number(s.slice(1));

// Corps d'un « let%sketch name = … in » : { name, from, to, text } (positions dans le code).
export function findSketch(code, name) {
  const re = new RegExp(`^  let%sketch ${name} =\\n`, 'm'), m = re.exec(code);
  if (!m) return null;
  const from = m.index + m[0].length, end = /^  in$/m;
  end.lastIndex = 0;
  const rest = code.slice(from), e = /^  in$/m.exec(rest);
  if (!e) return null;
  return { name, from, to: from + e.index, text: rest.slice(0, e.index), header: m.index };
}

// Texte → structures de l'éditeur (pts, lines, circles, arcs, cons, loops) ; null si illisible.
export function parseSketch(text, params = []) {
  const pts = [], lines = [], circles = [], arcs = [], ellipses = [], cons = [], loops = [];
  for (const m of text.matchAll(/\b(p\d+) = Sketch\.point( ~fixed:true)? (\(?-?[\d.]+\)?) (\(?-?[\d.]+\)?)/g)) pts[idx(m[1])] = { x: num(m[3]), y: num(m[4]), fixed: !!m[2] };
  for (const m of text.matchAll(/\b(l\d+) = Sketch\.line (p\d+) (p\d+)/g)) lines[idx(m[1])] = [idx(m[2]), idx(m[3])];
  for (const m of text.matchAll(/\b(c\d+) = Sketch\.circle (p\d+) (\(?-?[\d.]+\)?)/g)) circles[idx(m[1])] = { c: idx(m[2]), r: num(m[3]) };
  for (const m of text.matchAll(/\b(e\d+) = Sketch\.ellipse (p\d+) (p\d+) (\(?-?[\d.]+\)?)/g)) ellipses[idx(m[1])] = { c: idx(m[2]), a: idx(m[3]), ry: num(m[4]) };
  for (const m of text.matchAll(/\b(a\d+) = Sketch\.arc (p\d+) (p\d+) (p\d+)/g)) arcs[idx(m[1])] = { c: idx(m[2]), a: idx(m[3]), b: idx(m[4]) };
  const cl = /Sketch\.\[([\s\S]*?)\]/.exec(text);
  if (cl) for (const item of cl[1].split(';').map((s) => s.trim()).filter(Boolean)) {
    const w = item.split(/\s+/), kind = w[0], refs = [];
    let k = 1; while (k < w.length && /^[plca]\d+$/.test(w[k])) refs.push(idx(w[k++]));
    const rest = w.slice(k).join(' ');
    if (!rest) cons.push({ kind, refs });
    else if (/^\(?-?[\d.]+\)?$/.test(rest)) cons.push({ kind, refs, value: num(rest) });
    else { const expr = rest.replace(/^\((.*)\)$/, '$1'), v = evalExpr(expr, params); cons.push({ kind, refs, value: kind === 'radius' ? v : v, expr }); }
  }
  const reg = /Sketch\.\((.*)\)\s*$/.exec(text.trim());
  if (!reg) return null;
  // Listes « loop [ … ] » et « path [ … ] » (une courbe y porte sa propre liste) : crochets appariés.
  const src = reg[1], re = /(loop|path) \[/g; let m;
  while ((m = re.exec(src))) {
    let depth = 1, i = re.lastIndex, start = i;
    for (; i < src.length && depth; i++) { if (src[i] === '[') depth++; if (src[i] === ']') depth--; }
    const body = src.slice(start, i - 1), items = [];
    let d = 0, cur = '';
    for (const ch of body) { if (ch === '[') d++; if (ch === ']') d--; if (ch === ';' && d === 0) { items.push(cur.trim()); cur = ''; } else cur += ch; }
    if (cur.trim()) items.push(cur.trim());
    loops.push(m[1] === 'loop' ? items.map(idx) : items.map((it) => {
      const sp = /^spline \[(.*)\]$/.exec(it);
      if (sp) return { s: sp[1].split(';').map((x) => idx(x.trim())) };
      const [k, r] = it.split(/\s+/);
      return k === 'pt' ? idx(r) : k === 'along' ? { a: idx(r) } : { r: idx(r) };
    }));
    re.lastIndex = i;
  }
  const dense = (a) => a.length === [...a].filter(Boolean).length;
  if (![pts, lines, circles, arcs, ellipses].every(dense)) return null;
  return { pts, lines, circles, arcs, ellipses, cons, loops };
}

// Plan d'une esquisse : le repère placé par la feature qui l'utilise (« place X »), avec X
// défini par « let X = … in » (plan d'origine, plan décalé, ou repère littéral d'une face).
export function sketchPlane(code, name, planes) {
  const use = new RegExp(`\\b${name}\\b[^\\n]*\\|> place ([a-z_][\\w']*)\\)`).exec(code) ?? new RegExp(`\\b${name}\\b[\\s\\S]{0,400}?\\|> place ([a-z_][\\w']*)\\)`).exec(code);
  // Esquisse terminée que rien n'utilise encore : son plan est déclaré juste avant elle.
  const before = !use && new RegExp(`let ([a-z_][\\w']*) = [^\\n]* in\\n\\s*let%sketch ${name} =`).exec(code);
  if (!use && !before) return null;
  const pl = (use ?? before)[1];
  if (planes[pl]) return { frame: planes[pl].frame, code: pl };
  const def = new RegExp(`let ${pl} = (.*) in\\n`).exec(code);
  if (!def) return null;
  const e = def[1].trim();
  const base = /^Geom\.Plane\.(xy|xz|yz)$/.exec(e);
  if (base) return { frame: planes[base[1].toUpperCase()].frame, code: e };
  const fm = /^Geom\.Frame\.make ~origin:\(Geom\.V3\.v (\S+) (\S+) (\S+)\) ~x:\(Geom\.V3\.v (\S+) (\S+) (\S+)\) ~z:\(Geom\.V3\.v (\S+) (\S+) (\S+)\)$/.exec(e.replace(/\(\-/g, '(-').replace(/\((-?[\d.]+)\)/g, '$1'));
  if (fm) return { literal: fm.slice(1).map(num), code: e };
  return null;
}

// Tout ce qu'il faut pour rouvrir l'esquisse `name` : { data, frame, planeCode, text } ou un message.
export function prepareEdit(code, name, planes, params = []) {
  const body = findSketch(code, name), data = body && parseSketch(body.text, params), pl = body && sketchPlane(code, name, planes);
  if (!data || !pl) return `Esquisse « ${name} » : pas au format de l’éditeur, modifiez-la dans le code.`;
  return { data, frame: pl.frame ?? frameFromNumbers(pl.literal), planeCode: pl.code, text: body.text, name };
}
// Même esquisse au sens de la structure : les positions et rayons initiaux (valeurs de départ
// du solveur, qui bougent quand un paramètre change) ne comptent pas.
const shape = (c) => c.replace(/(Sketch\.point(?: ~fixed:true)?) \(?-?[\d.]+\)? \(?-?[\d.]+\)?/g, '$1 _ _')
  .replace(/(Sketch\.circle p\d+) \(?-?[\d.]+\)?/g, '$1 _').replace(/\s+/g, ' ').trim();
export const sameCode = (a, b) => shape(a) === shape(b);
// Esquisse utilisée par une feature (extrusion, révolution…) : le premier nom esquisseN de sa définition.
export function sketchOf(code, feat) {
  const m = new RegExp(`let%feat ${feat} =([\\s\\S]{0,600}?)\\n  in\\n|let%feat ${feat} =([^\\n]*) in\\n`).exec(code);
  const body = m && (m[1] ?? m[2]); const s = body && /\b(esquisse\d+)\b/.exec(body);
  return s ? s[1] : null;
}
