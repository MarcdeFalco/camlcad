// Black Book, chapitre 4 (Rib) : deux lignes ouvertes d'une esquisse deviennent des nervures
// (épaisseur, hauteur) sur une plaque.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, cmd } from './lib.js';

const field = (page, label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();

test('nervures', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('40'); await field(page, 'Largeur').fill('30'); await field(page, 'Hauteur').fill('3');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  // Esquisse sur le dessus de la plaque : deux lignes ouvertes en croix.
  await clickAt(page, await worldPoint(page, [20, 15, 3]));
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await page.locator('[data-tool=poly]').click();
  await clickSketch(page, 5, 15); await clickSketch(page, 35, 15); await page.keyboard.press('Escape');
  await clickSketch(page, 20, 5); await clickSketch(page, 20, 25); await page.keyboard.press('Escape');
  await expect(page.locator('#sketch-rib')).toBeEnabled();
  await page.locator('#sketch-rib').click();
  await expect(page.locator('#dialog')).toContainText('2 ligne(s) ouverte(s)');
  await field(page, 'Épaisseur').fill('2'); await field(page, 'Hauteur').fill('6');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => page.evaluate(() => { const g = window.camlcadView.part?.geometry; if (!g) return null; g.computeBoundingBox(); return Math.round(g.boundingBox.max.z); })).toBe(9);
  // Volume : 40 × 30 × 3 + (30 + 20) × 2 × 6 − 2 × 2 × 6 (croisement) = 3600 + 600 − 24 = 4176 mm³
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(4.18, 1);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await shot(page, '122-nervures');
});
