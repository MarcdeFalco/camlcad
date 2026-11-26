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
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto('/');
  await expect(page.locator('#status')).toContainText('triangles', { timeout: 90_000 });
  if (doc) {
    await page.locator('#example').selectOption(doc);
    if (doc === 'nouveau') await expect(page.locator('#timeline .feat')).toHaveCount(0);
    else await expect(page.locator('#status')).toContainText(/triangles|pièces/);
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

export const code = (page) => page.evaluate(() => document.querySelector('.cm-content').cmView?.view?.state.doc.toString()
  ?? [...document.querySelectorAll('.cm-line')].map((l) => l.textContent).join('\n'));
export const triangles = async (page) => Number((await page.locator('#status').textContent()).match(/(\d+) triangles/)?.[1] ?? NaN);
export async function waitEval(page, prev) {
  await expect(page.locator('#status')).toContainText('triangles');
  if (prev != null) await expect.poll(() => triangles(page)).not.toBe(prev);
}
