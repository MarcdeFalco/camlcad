// Black Book, chapitre 4 (Rectangular Pattern, Direction Type « Symmetric ») : trois boîtes au
// pas de 30 mm centrées sur l'original : la pièce va de −30 à 50 en x, volume × 3.
import { test, expect } from './fixtures.js';
import { open, shot, triangles, code, cmd } from './lib.js';

const bbox = (page) => page.evaluate(() => {
  const g = window.camlcadView.part.geometry; g.computeBoundingBox();
  return [g.boundingBox.min.x, g.boundingBox.max.x].map((c) => Math.round(c));
});

test('réseau rectangulaire symétrique', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await page.getByRole('button', { name: 'OK' }).click(); // 20 × 20 × 10
  await expect.poll(() => triangles(page)).toBe(12);
  await page.locator('#timeline .feat', { hasText: 'boite1' }).click();
  await page.getByRole('button', { name: 'Réseau' }).click();
  const field = (label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();
  await field('Nombre 1').fill('3'); await field('Pas 1').fill('30');
  await page.locator('#pattern-sym').check();
  await shot(page, '194-reseau-sym');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([-30, 50]);
  expect(await code(page)).toContain('(float i -. 1.) *. 30.');
  await cmd(page, 'Propriétés');
  await expect(page.locator('#props-volume')).toHaveText('12 cm³');
});
