// Black Book, chapitres 4 et 6 : pousser / tirer une face (Press Pull), tore, ressort (Coil).
import { test, expect } from './fixtures.js';
import { open, shot, worldPoint, clickAt, triangles } from './lib.js';

const field = (page, label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();
const bbox = (page) => page.evaluate(() => {
  const g = window.camlcadView.part.geometry; g.computeBoundingBox();
  const r = (v) => v.toArray().map((c) => Math.round(c * 10) / 10 + 0);
  return [r(g.boundingBox.min), r(g.boundingBox.max)];
});

test('pousser / tirer une face', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('30'); await field(page, 'Largeur').fill('20'); await field(page, 'Hauteur').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  // Tirer la face du dessus de 5 mm.
  await page.getByRole('button', { name: 'Pousser/tirer' }).click();
  await clickAt(page, await worldPoint(page, [15, 10, 10]));
  await expect(page.locator('#dialog')).toContainText('POUSSER / TIRER');
  await field(page, 'Distance').fill('5');
  await shot(page, '104-tirer-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([[0, 0, 0], [30, 20, 15]]);
  // La pousser de 3 mm.
  await page.getByRole('button', { name: 'Pousser/tirer' }).click();
  await clickAt(page, await worldPoint(page, [15, 10, 15]));
  await field(page, 'Distance').fill('-3');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([[0, 0, 0], [30, 20, 12]]);
  await expect(page.locator('#timeline .feat')).toHaveCount(3);
});

test('tore et ressort', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Ressort' }).click();
  await field(page, 'Rayon (axe)').fill('10'); await field(page, 'Rayon du fil').fill('1.5');
  await field(page, 'Pas').fill('5'); await field(page, 'Tours').fill('4');
  await shot(page, '105-ressort-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([[-11.5, -11.5, 0], [11.5, 11.5, 20]]);
  await page.getByRole('button', { name: 'Tore' }).click();
  await field(page, 'Rayon (axe)').fill('15'); await field(page, 'Rayon du tube').fill('2');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([[-17, -17, -2], [17, 17, 20]]);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '106-tore-ressort');
});
