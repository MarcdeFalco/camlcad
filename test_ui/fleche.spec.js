// Black Book, chapitre 3 (Extrude) : la distance se règle en tirant la flèche dans la vue,
// comme le manipulateur d'un modeleur ; le champ du dialogue et l'aperçu suivent.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles } from './lib.js';

test('flèche de distance de l’extrusion', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -20, -10); await clickSketch(page, 10, 10);
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await expect(page.locator('#dialog')).toContainText('EXTRUSION');
  await page.waitForTimeout(400); // vue de trois quarts
  const tip = await page.evaluate(() => window.camlcadGizmo.tip().toArray());
  const [x, y] = await worldPoint(page, tip);
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x, y - 90, { steps: 10 }); await page.mouse.up();
  const field = page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input');
  await expect.poll(async () => Number(await field.inputValue())).toBeGreaterThan(14);
  const h = Number(await field.inputValue());
  await shot(page, '121-fleche-distance');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  const zmax = await page.evaluate(() => { const g = window.camlcadView.part.geometry; g.computeBoundingBox(); return g.boundingBox.max.z; });
  expect(zmax).toBeCloseTo(h, 2);
});
