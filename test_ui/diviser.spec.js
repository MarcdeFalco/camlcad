// Black Book, chapitre 6 (Split Body) : couper une boîte en deux par un plan décalé et
// écarter les deux moitiés (impression en deux parties) ; volume conservé.
import { test, expect } from './fixtures.js';
import { open, shot, code, triangles, cmd } from './lib.js';

const field = (page, label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();
const bbox = (page) => page.evaluate(() => {
  const g = window.camlcadView.part.geometry; g.computeBoundingBox();
  const r = (v) => v.toArray().map((c) => Math.round(c * 10) / 10 + 0);
  return [r(g.boundingBox.min), r(g.boundingBox.max)];
});

test('diviser le corps', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('30'); await field(page, 'Largeur').fill('20'); await field(page, 'Hauteur').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Plan décalé' }).click();
  await field(page, 'Distance').fill('4');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toContain('Geom.Plane.offset 4. Geom.Plane.xy');
  await cmd(page, 'Diviser');
  await field(page, 'Plan').selectOption({ label: 'plan2' });
  await field(page, 'Écart').fill('6');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([[0, 0, 0], [30, 20, 16]]);
  await cmd(page, 'Propriétés');
  await expect(page.locator('#props-volume')).toHaveText('6 cm³');
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '119-diviser');
});
