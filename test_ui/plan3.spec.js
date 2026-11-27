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
  // Dépouille : faces verticales en jaune (un pixel du milieu de la face avant de la boîte).
  await cmd(page, 'Dépouille');
  await expect(page.locator('#notice')).toContainText('contre-dépouille');
  const [px, py] = await worldPoint(page, [15, 0, 5]);
  const rgb = await page.evaluate(([x, y]) => new Promise((ok) => { const vp = window.camlcadView, c = vp.renderer.domElement, r = c.getBoundingClientRect(); const img = new Image(); img.onload = () => { const k = document.createElement('canvas'); k.width = c.width; k.height = c.height; const g = k.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(Math.round((x - r.left) * c.width / r.width), Math.round((y - r.top) * c.height / r.height), 1, 1).data; ok([d[0], d[1], d[2]]); }; img.src = vp.capture(); }), [px, py]);
  expect(rgb[0]).toBeGreaterThan(200); expect(rgb[1]).toBeGreaterThan(170); expect(rgb[2]).toBeLessThan(90); // jaune
  await shot(page, '130-depouille');
});
