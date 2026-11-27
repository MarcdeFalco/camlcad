// Black Book, chapitre 8 (Inspect) : mesurer, coupe (section analysis), propriétés
// physiques (volume, centre de gravité, masse imprimée), sur l'équerre « support ».
import { test, expect } from './fixtures.js';
import { open, shot, worldPoint, clickAt, cmd } from './lib.js';

const numberIn = async (loc, re) => Number((await loc.textContent()).match(re)[1]);

test('mesurer, coupe, propriétés', async ({ page }) => {
  await open(page, 'support');
  // Propriétés : 60×25×4 + 60×4×30 − recouvrement − 3 trous Ø5×4 ≈ 12,0 cm³.
  await cmd(page, 'Propriétés');
  await expect(page.locator('#dialog')).toContainText('PROPRIÉTÉS');
  const vol = await numberIn(page.locator('#props-volume'), /([\d.]+) cm³/);
  expect(vol).toBeGreaterThan(11.95); expect(vol).toBeLessThan(12.05);
  await expect(page.locator('#dialog')).toContainText('g (plein, 1.24 g/cm³)');
  await shot(page, '80-proprietes');
  await page.getByRole('button', { name: 'Fermer' }).click();

  // Mesurer deux points de la face avant de l'aile (y = 0), à 15 mm l'un de l'autre.
  await page.getByRole('button', { name: 'Mesurer' }).click();
  await clickAt(page, await worldPoint(page, [20, 0, 20]));
  await expect(page.locator('#measure-out')).toContainText('face plane');
  await clickAt(page, await worldPoint(page, [35, 0, 20]));
  const d = await numberIn(page.locator('#measure-out'), /Distance : ([\d.]+) mm/);
  expect(Math.abs(d - 15)).toBeLessThan(0.3);
  await expect(page.locator('#measure-out')).toContainText('Faces parallèles, écart 0 mm');
  await shot(page, '81-mesurer');
  // La face avant de l'aile puis le dessus de la semelle : angle de 90°.
  await clickAt(page, await worldPoint(page, [20, 0, 20]));
  await clickAt(page, await worldPoint(page, [55, 20, 4]));
  await expect(page.locator('#measure-out')).toContainText('Angle entre les faces : 90°');
  await page.getByRole('button', { name: 'Fermer' }).click();

  // Coupe par le plan XZ décalé de 12 mm : plan de découpe actif, retiré à la fermeture.
  await page.getByRole('button', { name: 'Coupe' }).click();
  await page.locator('#dialog .drow', { hasText: 'Décalage' }).locator('input').fill('12');
  await expect.poll(() => page.evaluate(() => window.camlcadView.clip?.constant)).toBe(12);
  await shot(page, '82-coupe');
  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => page.evaluate(() => window.camlcadView.clip ?? null)).toBe(null);
});
