// Black Book, chapitre 4 (Circular Pattern, Symmetric) : deux boîtes sur 90° réparties de part
// et d'autre de l'original (−45° et +45° autour de z) : la pièce descend à y = −14,1.
import { test, expect } from './fixtures.js';
import { open, triangles, code } from './lib.js';

test('réseau circulaire symétrique', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.locator('#timeline .feat', { hasText: 'boite1' }).click();
  await page.getByRole('button', { name: 'Réseau' }).click();
  const field = (label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();
  await field('Type').selectOption('circ');
  await field('Nombre').fill('2'); await field('Angle total').fill('90');
  await page.locator('#pattern-csym').check();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toContain('(float i -. 0.5) *. 90.');
  await expect.poll(() => page.evaluate(() => { const g = window.camlcadView.part.geometry; g.computeBoundingBox(); return Math.round(g.boundingBox.min.y * 10) / 10; })).toBeCloseTo(-14.1, 1);
});
