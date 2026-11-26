// Commandes qui commencent par un clic sur une face plane de la pièce (Black Book ch. 4 et 6) :
// perçage, pousser/tirer, congé et chanfrein d'arête (deux faces).
import * as feats from './dialogs_features.js';
import { faceLoops } from './planes.js';

export class FaceCommands {
  // ctx : mesh() (maillage évalué), hint(texte|null), notify(texte, erreur?), dialogs
  constructor(ctx) {
    this.ctx = ctx; this.act = null;
    const { dialogs } = ctx, mesh = () => ctx.mesh();
    // « Traversant » : jusqu'au point de la pièce le plus loin sous la face, plus 1 mm.
    const through = (p, n) => { const V = mesh().vertices; let d = 0; for (let i = 0; i < V.length; i += 3) d = Math.max(d, (p.x - V[i]) * n.x + (p.y - V[i + 1]) * n.y + (p.z - V[i + 2]) * n.z); return Math.ceil(d + 1); };
    const edge = (kind) => this.start('Cliquez la première face de l’arête', (h1, f1) =>
      setTimeout(() => this.start('Cliquez la seconde face de l’arête', (h2, f2) => feats.edgeFinish(dialogs, kind, f1, faceLoops(mesh(), f1), f2, faceLoops(mesh(), f2), mesh()))));
    this.commands = {
      hole: () => this.start('Cliquez sur une face plane, à l’endroit du perçage', (hit, f) => feats.hole(dialogs, hit.point.clone(), f.frame, through(hit.point, f.frame.z))),
      presspull: () => this.start('Cliquez la face plane à pousser ou tirer', (hit, f) => feats.pressPull(dialogs, f, faceLoops(mesh(), f))),
      fillet: () => edge('fillet'), chamfer: () => edge('chamfer'),
      thread: () => feats.threadRod(dialogs),
    };
  }
  get active() { return this.act != null; }
  start(text, act) {
    const m = this.ctx.mesh();
    if (!m || !m.triangles.length) { this.ctx.notify('Pas de pièce.', true); return; }
    this.act = act; this.ctx.hint(`${text} (Échap pour annuler).`);
  }
  cancel() { this.act = null; this.ctx.hint(null); }
  onFace(hit, f) { const a = this.act; this.cancel(); a(hit, f); }
}
