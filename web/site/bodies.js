// Retour arrière : comme dans un modeleur, on voit tous les corps présents à l'étape k,
// c'est-à-dire les features d'avant le marqueur qu'aucune autre d'avant n'a consommées.
// ctx : viewport (setPart, clearPart), featureMesh(fid, id) (demande au worker, réponse id -1).
export class Bodies {
  constructor(ctx) { this.ctx = ctx; this.pending = null; }
  cancel() { this.pending = null; }
  request(journal, k) {
    const fs = journal.features.filter((f) => f.id < k);
    const used = new Set(fs.flatMap((f) => f.deps));
    const want = new Set(fs.filter((f) => !used.has(f.id) && !f.suppressed).map((f) => f.id));
    this.pending = { want, got: new Map() };
    if (!want.size) { this.ctx.viewport.clearPart(); return; }
    for (const id of want) this.ctx.featureMesh(id, -1);
  }
  // Maillage d'une feature reçu du worker (id -1) : affiché quand tous sont là, fusionnés.
  onMesh(m) {
    const p = this.pending;
    if (!p || !p.want.has(m.fid)) return;
    p.got.set(m.fid, m);
    if (p.got.size < p.want.size) return;
    const ms = [...p.got.values()];
    const nv = ms.reduce((n, x) => n + x.vertices.length, 0), nt = ms.reduce((n, x) => n + x.triangles.length, 0);
    const vertices = new Float32Array(nv), triangles = new Uint32Array(nt);
    let ov = 0, ot = 0;
    for (const x of ms) {
      vertices.set(x.vertices, ov);
      for (let i = 0; i < x.triangles.length; i++) triangles[ot + i] = x.triangles[i] + ov / 3;
      ov += x.vertices.length; ot += x.triangles.length;
    }
    this.ctx.viewport.setPart({ vertices, triangles });
  }
}
