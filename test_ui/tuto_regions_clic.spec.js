// Comme dans Fusion (côte à côte du Practical 1) : pendant l'extrusion, la région à extruder se
// choisit d'un clic dans la vue. Trois cercles concentriques ; un clic dans l'anneau Ø20/Ø8
// remplace le choix d'office par cet anneau seul ; un second clic dans la couronne l'ajoute.
import { test, expect } from './fixtures.js';
import { open, shot, sketchPoint, worldPoint, code, triangles, humanClick, humanSketch } from './lib.js';

const regions = (page) => page.locator('#dialog .profiles input[type=checkbox]');

test('régions cliquées dans la vue', async ({ page }) => {
  await open(page, 'nouveau');
  await page.locator('#tree .row', { hasText: 'Plan XY' }).click();
  for (const [d, r] of [[100, 30], [20, 6], [8, 2]]) {
    await page.locator('[data-tool=circle]').click();
    await humanSketch(page, 0, 0); await page.mouse.move(...await sketchPoint(page, r, 0), { steps: 2 });
    await page.keyboard.type(String(d)); await page.keyboard.press('Enter');
  }
  await page.locator('#sketch-extrude').click();
  await expect(regions(page)).toHaveCount(3);
  await humanClick(page, await worldPoint(page, [0, 7, 0])); // dans l'anneau Ø20/Ø8
  await expect(regions(page).nth(1)).toBeChecked();
  await expect(regions(page).nth(0)).not.toBeChecked(); await expect(regions(page).nth(2)).not.toBeChecked();
  await shot(page, '390-region-cliquee');
  await humanClick(page, await worldPoint(page, [-35, -5, 0])); // dans la couronne Ø100/Ø20
  await expect(regions(page).nth(0)).toBeChecked();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toMatch(/Profile\.union \(Profile\.region 0 esquisse1\) \(Profile\.region 1 esquisse1\)/);
  await expect.poll(() => triangles(page)).toBeGreaterThan(0);
});
