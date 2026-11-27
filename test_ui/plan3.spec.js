// Black Book, chapitres 3 (Plane Through Three Points) et 8 (Zebra Analysis).
import { test, expect } from './fixtures.js';
import { open, shot, worldPoint, clickAt, code, triangles, cmd } from './lib.js';

const field = (page, label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();

test('plan par trois points, analyse zébrée', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('30'); await field(page, 'Largeur').fill('20'); await field(page, 'Hauteur').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  // Trois coins de la boîte (clics à moins de 2 mm : accrochés aux sommets) : plan oblique.
  await cmd(page, 'Plan par 3 points');
  await clickAt(page, await worldPoint(page, [29.5, 0.5, 10]));
  await clickAt(page, await worldPoint(page, [0.5, 0.5, 10]));
  await clickAt(page, await worldPoint(page, [29.5, 0.5, 0.5]));
  await expect.poll(() => code(page)).toContain('(* construction *) Geom.Frame.make ~origin:(Geom.V3.v 30. 0. 10.)');
  await expect(page.locator('#tree .row', { hasText: 'Construction (1)' })).toBeVisible();
  // Zébrures : l'image de la pièce change, puis revient.
  const img = () => page.evaluate(() => window.camlcadView.capture()); // pixels de la vue seule
  const before = await img();
  await cmd(page, 'Zébrures');
  expect(await img()).not.toBe(before);
  await shot(page, '125-zebrures');
  await cmd(page, 'Zébrures');
  expect(await img()).toBe(before);
});
