// Black Book, chapitre 4 (Advanced 3D Modeling) : perçage sur une face, réseau
// rectangulaire de ce perçage, symétrie d'une feature.
import { test, expect } from './fixtures.js';
import { open, shot, worldPoint, clickAt, code, triangles } from './lib.js';

const bbox = (page) => page.evaluate(() => {
  const g = window.camlcadView.part.geometry; g.computeBoundingBox();
  const r = (v) => v.toArray().map((c) => Math.round(c * 10) / 10 + 0);
  return [r(g.boundingBox.min), r(g.boundingBox.max)];
});
const field = (page, label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();

test('perçage, réseau, symétrie', async ({ page }) => {
  await open(page, 'nouveau');
  // Boîte 60 × 40 × 10.
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('60'); await field(page, 'Largeur').fill('40'); await field(page, 'Hauteur').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();

  // Perçage traversant Ø6 avec lamage, sur la face du dessus en (10, 10).
  await page.getByRole('button', { name: 'Perçage' }).click();
  await expect(page.locator('#hint')).toBeVisible();
  await clickAt(page, await worldPoint(page, [10, 10, 10]));
  await expect(page.locator('#dialog')).toContainText('PERÇAGE');
  await field(page, 'Type').selectOption('cb');
  await field(page, 'Diamètre').fill('6');
  await shot(page, '60-percage-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(2); // boîte, perçage (Couper)
  expect(await code(page)).toContain('~h:11.01'); // traversant : épaisseur 10 + 1 mm (+ 0,01 au-dessus)
  const t1 = await triangles(page);
  expect(t1).toBeGreaterThan(12);

  // Réseau 4 × 2 du perçage (pas 13 et 20), opération Couper proposée.
  await page.locator('#timeline .feat', { hasText: 'percage' }).click();
  await expect(page.locator('#timeline .feat', { hasText: 'percage' })).toHaveClass(/sel/);
  await page.getByRole('button', { name: 'Réseau' }).click();
  await expect(page.locator('#dialog')).toContainText('RÉSEAU');
  await expect(field(page, 'Opération')).toHaveValue('cut');
  await field(page, 'Nombre 1').fill('4'); await field(page, 'Pas 1').fill('13');
  await field(page, 'Nombre 2').fill('2'); await field(page, 'Pas 2').fill('20');
  await shot(page, '61-reseau-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(3);
  await expect.poll(() => triangles(page)).toBeGreaterThan(4 * t1);
  expect(await code(page)).toContain('List.init 4');
  await shot(page, '62-reseau');

  // Symétrie de la boîte par rapport au plan YZ, jointe : la pièce va de -60 à 60 en x.
  await page.locator('#timeline .feat', { hasText: 'boite' }).click();
  await expect(page.locator('#timeline .feat', { hasText: 'boite' })).toHaveClass(/sel/);
  await page.getByRole('button', { name: 'Symétrie' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([[-60, 0, 0], [60, 40, 10]]);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '63-symetrie');
});
