// Black Book, chapitre 3 (3D Sketch and Solid Modeling) : plan décalé (construction),
// esquisse sur ce plan ; révolution d'un profil autour d'un axe.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, triangles } from './lib.js';

const bbox = (page) => page.evaluate(() => {
  const g = window.camlcadView.part.geometry; g.computeBoundingBox();
  const r = (v) => v.toArray().map((c) => Math.round(c * 10) / 10 + 0);
  return [r(g.boundingBox.min), r(g.boundingBox.max)];
});

test('plan décalé puis esquisse dessus', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Plan décalé' }).click();
  await expect(page.locator('#dialog')).toContainText('PLAN DÉCALÉ');
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('15');
  await shot(page, '50-plan-decale');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toContain('let plan1 = Geom.Plane.offset 15. Geom.Plane.xy in');
  await page.locator('#tree .row', { hasText: 'plan1' }).click();
  await expect(page.locator('#palette')).toBeVisible();
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -10, -10); await clickSketch(page, 10, 5);
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(1);
  await expect.poll(() => bbox(page)).toEqual([[-10, -10, 15], [10, 5, 20]]);
  expect(await code(page)).toMatch(/place plan1\)/); // le plan de construction est repris, pas recopié
  await shot(page, '51-esquisse-sur-plan-decale');
});

test('révolution autour de l’axe de l’esquisse', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 0, 30])); // plan XZ, vu de face
  await expect(page.locator('#palette')).toBeVisible();
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, 4, 0); await clickSketch(page, 10, 12);
  await page.locator('#sketch-revolve').click();
  await expect(page.locator('#dialog')).toContainText('RÉVOLUTION');
  await expect(page.locator('#dialog .drow', { hasText: 'Axe' }).locator('option')).toContainText(['Axe y de l’esquisse', 'Axe x de l’esquisse', 'Ligne L1']);
  await shot(page, '52-revolution-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(1);
  await expect.poll(() => triangles(page)).toBeGreaterThan(50);
  await expect.poll(() => bbox(page)).toEqual([[-10, -10, 0], [10, 10, 12]]);
  expect(await code(page)).toContain('revolve');
  await shot(page, '53-revolution');
});
