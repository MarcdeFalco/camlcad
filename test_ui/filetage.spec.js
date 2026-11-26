// Black Book, chapitre 4 (Hole « Tapped », Thread) : perçage taraudé M6 dans un bloc et tige
// filetée M6 à côté, pour visser deux pièces imprimées.
import { test, expect } from './fixtures.js';
import { open, shot, worldPoint, clickAt, code, triangles, cmd } from './lib.js';

const field = (page, label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();
const bbox = (page) => page.evaluate(() => {
  const g = window.camlcadView.part.geometry; g.computeBoundingBox();
  const r = (v) => v.toArray().map((c) => Math.round(c * 10) / 10 + 0);
  return [r(g.boundingBox.min), r(g.boundingBox.max)];
});

test('taraudage et tige filetée', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('20'); await field(page, 'Largeur').fill('20'); await field(page, 'Hauteur').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();

  await page.getByRole('button', { name: 'Perçage' }).click();
  await clickAt(page, await worldPoint(page, [10, 10, 10]));
  await field(page, 'Type').selectOption('tap');
  await field(page, 'Taraudage').selectOption('M6');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(1000);
  expect(await code(page)).toContain('Cad_parts.Thread.tap ~d:6. ~pitch:1.');

  await cmd(page, 'Filetage');
  await expect(page.locator('#dialog')).toContainText('TIGE FILETÉE');
  await field(page, 'Taille').selectOption('M6');
  await field(page, 'Longueur').fill('20');
  const pos = page.locator('#dialog .drow', { hasText: 'Position' }).locator('input');
  await pos.nth(0).fill('30'); await pos.nth(1).fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([[0, 0, 0], [33, 20, 20]]);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '103-filetage');
});
