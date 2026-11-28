// Black Book, chapitre 6 (Scale) : une extrusion 30 × 20 × 10 mise à l'échelle ×2 autour de
// son centre (volume × 8), puis par axe (z × 0,5) ; Shape.scale dans le code.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, cmd, code } from './lib.js';

const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};

test('échelle d’une pièce', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -25, -10); await clickSketch(page, 5, 10);
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  expect(await volume(page)).toBeCloseTo(6, 2);

  await cmd(page, 'Échelle');
  await expect(page.locator('#dialog')).toContainText('ÉCHELLE');
  await page.locator('#dialog .drow', { hasText: 'Facteur' }).first().locator('input').fill('2');
  await shot(page, '162-echelle');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toMatch(/scale ~about:\(Geom\.V3\.v \(-10\.\) 0\. 5\.\) \(Geom\.V3\.v 2\. 2\. 2\.\)/);
  await expect.poll(() => volume(page)).toBeCloseTo(48, 1);

  await cmd(page, 'Échelle');
  await page.locator('#dialog .drow', { hasText: 'Type' }).locator('select').selectOption('axes');
  const per = page.locator('#dialog .drow', { hasText: 'Facteurs x y z' }).locator('input');
  await per.nth(0).fill('1'); await per.nth(1).fill('1'); await per.nth(2).fill('0.5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => volume(page)).toBeCloseTo(24, 1);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '163-echelle-axes');
});
