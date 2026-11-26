// Black Book, chapitre 6 (Fillet, Chamfer) : congé et chanfrein sur des arêtes d'une boîte,
// choisies par leurs deux faces ; volume vérifié.
import { test, expect } from './fixtures.js';
import { open, shot, worldPoint, clickAt, triangles, cmd } from './lib.js';

const field = (page, label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();
const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};

test('congé et chanfrein d’arêtes', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('30'); await field(page, 'Largeur').fill('20'); await field(page, 'Hauteur').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();

  // Congé R3 sur l'arête dessus / avant.
  await page.getByRole('button', { name: 'Congé' }).click();
  await clickAt(page, await worldPoint(page, [15, 10, 10]));
  await expect(page.locator('#hint')).toContainText('seconde face');
  await clickAt(page, await worldPoint(page, [15, 0, 5]));
  await expect(page.locator('#dialog')).toContainText('30 mm, 90°, vive');
  await field(page, 'Rayon').fill('3');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(20);
  // 6000 − 30 × (9 − 9π/4) = 5942,1 mm³
  expect(await volume(page)).toBeCloseTo(5.94, 2);
  await shot(page, '111-conge');

  // Chanfrein de 2 sur l'arête dessus / droite.
  await cmd(page, 'Chanfrein');
  await clickAt(page, await worldPoint(page, [15, 12, 10]));
  await clickAt(page, await worldPoint(page, [30, 12, 5]));
  await field(page, 'Distance').fill('2');
  await page.getByRole('button', { name: 'OK' }).click();
  // Le chanfrein traverse la zone du congé : 5942,1 − 17 × 2 − (≈ 3 × 2 au bout arrondi) ≈ 5,90 cm³
  await expect.poll(() => volume(page)).toBeCloseTo(5.90, 1);
  await shot(page, '112-chanfrein');
});
