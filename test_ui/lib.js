// Aides des scénarios : ouvrir un document, captures, coordonnées d'écran.
// Les actions passent par la souris et le clavier (page.mouse, page.keyboard,
// clics sur des éléments visibles) ; page.evaluate ne sert qu'à LIRE l'état
// (projection d'un point en pixels, caméra, code) pour savoir où cliquer et vérifier.
import { expect } from './fixtures.js';
import { mkdirSync } from 'node:fs';

export const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

export async function shot(page, name) {
  await page.waitForTimeout(350); // animations de caméra (250 ms)
  await page.screenshot({ path: `${SHOTS}${name}.png` });
}

// Ouvre l'éditeur, attend le toplevel OCaml, puis choisit le document dans la liste.
export async function open(page, doc) {
  seed = Number(process.env.CAMLCAD_SEED ?? 1); // clics humains : même décalage à chaque scénario, quel que soit l'ordre
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto('/');
  await expect(page.locator('#status')).toContainText('triangles', { timeout: 90_000 });
  // On part d'un document vide ; un exemple se choisit dans le menu « Exemples… ».
  if (doc === 'nouveau') await expect(page.locator('#timeline .feat')).toHaveCount(0);
  else if (doc) {
    await page.locator('#examples').selectOption(doc);
    await expect(page.locator('#docname')).toHaveValue(doc);
    await expect(page.locator('#status')).toContainText(/triangles|pièces/);
  }
}

// Point (mm) du plan d'esquisse courant → pixels de la page.
export function sketchPoint(page, x, y) {
  return page.evaluate(([x, y]) => {
    const s = window.camlcadSketch, f = s.plane, cam = s.ctx.camera, r = s.ctx.renderer.domElement.getBoundingClientRect();
    cam.updateMatrixWorld();
    const v = f.origin.clone().addScaledVector(f.x, x).addScaledVector(f.y, y).project(cam);
    return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
  }, [x, y]);
}
// Point du monde (mm) → pixels.
export function worldPoint(page, p) {
  return page.evaluate((p) => {
    const s = window.camlcadSketch, cam = s.ctx.camera, r = s.ctx.renderer.domElement.getBoundingClientRect();
    cam.updateMatrixWorld();
    const v = cam.position.clone().set(...p).project(cam);
    return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
  }, p);
}
export async function clickAt(page, [x, y], opts = {}) {
  await page.mouse.move(x, y, { steps: 3 });
  await page.mouse.click(x, y, opts);
}
export async function clickSketch(page, x, y, opts) { await clickAt(page, await sketchPoint(page, x, y), opts); }

export const code = (page) => page.evaluate(() => window.camlcadCode?.() ?? document.querySelector('.cm-content').cmView?.view?.state.doc.toString()
  ?? [...document.querySelectorAll('.cm-line')].map((l) => l.textContent).join('\n'));
export const triangles = async (page) => Number((await page.locator('#status').textContent()).match(/(\d+) triangles/)?.[1] ?? NaN);
export async function waitEval(page, prev) {
  await expect(page.locator('#status')).toContainText('triangles');
  if (prev != null) await expect.poll(() => triangles(page)).not.toBe(prev);
}

// Commande de la barre d'outils : visible, ou rangée dans le menu ▾ de son groupe (on l'ouvre).
export async function cmd(page, name) {
  const b = page.locator('#toolbar .tabpanel:not([hidden]) button, .more-menu button').filter({ hasText: name }).first();
  if (!(await b.isVisible())) {
    const menu = await b.evaluate((x) => x.closest('.more-menu')?.id);
    if (menu) await page.locator(`.more-toggle[data-menu="${menu}"]`).click();
  }
  await b.click();
}

// Clic « humain » : à quelques pixels du point visé (décalage pseudo-aléatoire reproductible),
// pour que ce qui ne marche qu'au pixel près échoue comme pour un utilisateur.
let seed = 1;
const jitter = () => { seed = (seed * 16807) % 2147483647; return ((seed / 2147483647) * 2 - 1) * 3; };
export async function humanClick(page, [x, y], opts = {}) {
  const X = x + jitter(), Y = y + jitter();
  await page.mouse.move(X, Y, { steps: 4 });
  await page.mouse.click(X, Y, opts);
}
export async function humanSketch(page, x, y) { await humanClick(page, await sketchPoint(page, x, y)); }

// Double-clic sur une cote d'esquisse, là où on la voit : les cotes laissent passer les clics
// simples vers la vue, qui reçoit aussi le double-clic.
export async function dblclickDim(locator) {
  let b = null; // les cotes sont redessinées à chaque résolution : boîte relue jusqu'à ce qu'elle tienne
  for (let k = 0; k < 50 && !b; k++) { await locator.waitFor(); b = await locator.boundingBox(); }
  await locator.page().mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
}
