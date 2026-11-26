// Black Book, chapitre 1 (« 3D Print ») : orienter l'équerre en posant une face sur le
// plateau, vérifier le volume et les surplombs, exporter le STL dans cette orientation.
import { test, expect } from './fixtures.js';
import { open, shot, clickAt } from './lib.js';
import { readFile } from 'node:fs/promises';

// Point du monde → pixels, avec la caméra courante.
const toScreen = (page, p) => page.evaluate((p) => {
  const vp = window.camlcadView, cam = vp.camera, r = vp.renderer.domElement.getBoundingClientRect();
  cam.updateMatrixWorld(); const v = cam.position.clone().set(...p).project(cam);
  return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
}, p);

test('impression 3D : face posée, volume, surplombs, STL orienté', async ({ page }) => {
  await open(page, 'support');
  await page.getByRole('button', { name: 'Impression 3D' }).click();
  await expect(page.locator('#dialog')).toContainText('IMPRESSION 3D');
  await expect(page.locator('#print-size')).toHaveText('Encombrement : 60 × 25 × 30 mm ✓ tient dans le volume');
  await shot(page, '90-impression');
  // La face avant de l'aile (y = 0) va sur le plateau. Aperçu centré sur le plateau :
  // le point (30, 0, 15) de la pièce y est en (0, -12.5, 15).
  await page.waitForTimeout(300);
  await clickAt(page, await toScreen(page, [0, -12.5, 15]));
  await expect(page.locator('#print-size')).toHaveText('Encombrement : 60 × 30 × 25 mm ✓ tient dans le volume');
  await expect(page.locator('#print-bed')).toContainText('Appui sur le plateau');
  await shot(page, '91-impression-face-posee');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exporter le STL orienté' }).click()]);
  expect(dl.suggestedFilename()).toBe('support-impression.stl');
  const buf = await readFile(await dl.path()), n = buf.readUInt32LE(80);
  let zmin = Infinity, zmax = -Infinity;
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const z = buf.readFloatLE(84 + 50 * i + 12 + 12 * k + 8); zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
  expect([Math.round(zmin * 100) / 100 + 0, Math.round(zmax * 100) / 100]).toEqual([0, 25]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => page.evaluate(() => window.camlcadView.part.visible)).toBe(true);
});
