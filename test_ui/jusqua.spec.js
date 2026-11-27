// Black Book, chapitre 3 (Extrude, Extent « To ») : un cylindre esquissé à côté d'une boîte,
// extrudé « jusqu'à » la face du dessus de la boîte (cliquée) : même hauteur, 10 mm.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, code, cmd } from './lib.js';

test('extrusion jusqu’à une face', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=circle]').click();
  await clickSketch(page, -10, -10); await clickSketch(page, -7, -10);
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await page.locator('#extrude-to').click();
  await clickAt(page, await worldPoint(page, [10, 10, 10]));
  await expect(page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input')).toHaveValue('10');
  await shot(page, '192-jusqua');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toMatch(/extrude ~h:10\. esquisse\d/);
  await expect.poll(() => triangles(page)).toBeGreaterThan(12);
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(4 + (Math.PI * 9 * 10) / 1000, 1);
  await page.getByRole('button', { name: 'Fermer' }).click();
});
