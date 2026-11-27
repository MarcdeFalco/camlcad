// Insérer un maillage STL (Black Book ch. 1, Insert Mesh) : le fichier est confié au worker
// (système de fichiers du toplevel), gardé dans le navigateur pour les sessions suivantes, et
// le code le lit : « Shape.of_mesh (Cad_export.Stl.of_file "nom.stl") », joint à la pièce.
const PREFIX = 'camlcad-stl:';
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Au démarrage du worker : tous les STL gardés lui sont redonnés (avant la première évaluation).
export function sendImports(worker) {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX)) worker.postMessage({ kind: 'file', name: k.slice(PREFIX.length), data: unb64(localStorage.getItem(k)) });
  }
}

export function importStl(d, worker) {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.stl', hidden: true, id: 'import-stl' });
  document.body.append(input);
  input.onchange = async () => {
    const f = input.files[0]; input.remove();
    if (!f) return;
    const data = new Uint8Array(await f.arrayBuffer());
    if (data.length < 84 || new TextDecoder().decode(data.subarray(0, 5)) === 'solid' && data.length !== 84 + 50 * new DataView(data.buffer).getUint32(80, true)) {
      d.ctx.notify('Insérer : seul le STL binaire est lu.', true); return;
    }
    const name = f.name.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
    try { localStorage.setItem(PREFIX + name, b64(data)); } catch { d.ctx.notify('Fichier trop gros pour être gardé : il sera perdu au rechargement.'); }
    worker.postMessage({ kind: 'file', name, data });
    const n = d.ctx.nextIndex(), feat = `import${n}`;
    d.ctx.insert(`  let%feat ${feat} = Shape.of_mesh (Cad_export.Stl.of_file "${name}") in\n`, feat, 'join', n);
  };
  input.click();
}
