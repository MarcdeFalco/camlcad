// Black Book, chapitre 4 (Pipe) : un tube creux le long d'un chemin en L tracé dans une
// esquisse (lignes ouvertes), coude arrondi.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, cmd } from './lib.js';

const field = (page, label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();

test('tuyau', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=poly]').click();
  await clickSketch(page, -25, -10); await clickSketch(page, 0, -10); await clickSketch(page, 0, 15); await page.keyboard.press('Escape');
  await page.locator('#sketch-pipe').click();
  await expect(page.locator('#dialog')).toContainText('2 segment(s), 1 coude(s)');
  await field(page, 'Rayon').fill('4'); await field(page, 'Paroi').fill('1');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(200);
  const bb = await page.evaluate(() => { const g = window.camlcadView.part.geometry; g.computeBoundingBox(); const r = (v) => v.toArray().map((c) => Math.round(c) + 0); return [r(g.boundingBox.min), r(g.boundingBox.max)]; });
  expect(bb).toEqual([[-25, -14, -4], [4, 15, 4]]); // extrémités ouvertes, coude arrondi
  // Tube creux ouvert : volume ≈ π (4² − 3²) × (25 + 25) + coude, bien moins que plein.
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeGreaterThan(1.0); expect(vol).toBeLessThan(1.3);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '123-tuyau');
});
