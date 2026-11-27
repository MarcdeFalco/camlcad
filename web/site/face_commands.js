// Commandes qui commencent par un clic sur une face plane de la pièce (Black Book ch. 4 et 6) :
// perçage, pousser/tirer, congé et chanfrein d'arête (deux faces).
import * as THREE from 'three';
import * as feats from './dialogs_features.js';
import { faceLoops, frameCode } from './planes.js';
import { textDialog } from './dialogs_text.js';

export class FaceCommands {
  // ctx : mesh() (maillage évalué), hint(texte|null), notify(texte, erreur?), dialogs
  constructor(ctx) {
    this.ctx = ctx; this.act = null;
    const { dialogs } = ctx, mesh = () => ctx.mesh();
    // « Traversant » : jusqu'au point de la pièce le plus loin sous la face, plus 1 mm.
    const through = (p, n) => { const V = mesh().vertices; let d = 0; for (let i = 0; i < V.length; i += 3) d = Math.max(d, (p.x - V[i]) * n.x + (p.y - V[i + 1]) * n.y + (p.z - V[i + 2]) * n.z); return Math.ceil(Math.round((d + 1) * 1e3) / 1e3); }; // arrondi : le point cliqué est à 1e-6 près sur la face
    const edge = (kind) => this.start('Cliquez la première face de l’arête', (h1, f1) =>
      setTimeout(() => this.start('Cliquez la seconde face de l’arête', (h2, f2) => feats.edgeFinish(dialogs, kind, f1, faceLoops(mesh(), f1), f2, faceLoops(mesh(), f2), mesh()))));
    this.commands = {
      hole: () => this.start('Cliquez sur une face plane, à l’endroit du perçage', (hit, f) => feats.hole(dialogs, hit.point.clone(), f.frame, through(hit.point, f.frame.z))),
      presspull: () => this.start('Cliquez la face plane à pousser ou tirer', (hit, f) => feats.pressPull(dialogs, f, faceLoops(mesh(), f))),
      fillet: () => edge('fillet'), chamfer: () => edge('chamfer'),
      thread: () => feats.threadRod(dialogs),
      text: () => this.start('Cliquez la face plane où écrire (centre du texte)', (hit, f) => textDialog(dialogs, hit.point.clone(), f.frame)),
      // Plan milieu (ch. 3, Midplane) : entre deux faces planes parallèles.
      midplane: () => this.start('Cliquez la première face', (h1, f1) => setTimeout(() => this.start('Cliquez la seconde face (parallèle)', (h2, f2) => {
        const n = f1.frame.z;
        if (Math.abs(Math.abs(n.dot(f2.frame.z)) - 1) > 1e-6) { ctx.notify('Plan milieu : les faces ne sont pas parallèles.', true); return; }
        const d = f2.frame.origin.clone().sub(f1.frame.origin).dot(n);
        ctx.insertPlane(`(* construction *) ${frameCode({ ...f1.frame, origin: f1.frame.origin.clone().addScaledVector(n, d / 2) })}`);
      }))),
      // Plan par trois points (ch. 3) : trois clics sur la pièce, accrochés aux sommets proches.
      plane3: () => {
        const pts = [];
        const snap = (hit) => {
          const V = mesh().vertices, T = mesh().triangles, t = hit.faceIndex;
          let best = hit.point.clone(), d0 = 2;
          for (let k = 0; k < 3; k++) { const i = T[3 * t + k], v = new THREE.Vector3(V[3 * i], V[3 * i + 1], V[3 * i + 2]); const d = v.distanceTo(hit.point); if (d < d0) { d0 = d; best = v; } }
          return best;
        };
        const ask = () => this.start(`Point ${pts.length + 1} sur 3 du plan`, (hit) => {
          pts.push(snap(hit));
          if (pts.length < 3) { setTimeout(ask); return; }
          const [a, b, c] = pts, x = b.clone().sub(a), z = x.clone().cross(c.clone().sub(a));
          if (x.length() < 1e-6 || z.length() < 1e-6) { ctx.notify('Plan : trois points alignés ou confondus.', true); return; }
          x.normalize(); z.normalize();
          ctx.insertPlane(`(* construction *) ${frameCode({ origin: a, x, y: z.clone().cross(x), z })}`);
        });
        ask();
      },
    };
  }
  // Extrusion d'une face plane (sans esquisse), même dialogue que Pousser/tirer.
  extrude(f) { this.ctx.clearFace?.(); feats.pressPull(this.ctx.dialogs, f, faceLoops(this.ctx.mesh(), f), true); }
  get active() { return this.act != null; }
  start(text, act) {
    const m = this.ctx.mesh();
    if (!m || !m.triangles.length) { this.ctx.notify('Pas de pièce.', true); return; }
    this.act = act; this.ctx.hint(`${text} (Échap pour annuler).`);
  }
  cancel() { this.act = null; this.ctx.hint(null); }
  onFace(hit, f) { const a = this.act; this.cancel(); a(hit, f); }
}
