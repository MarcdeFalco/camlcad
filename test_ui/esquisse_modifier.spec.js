// Black Book, chapitre 2 : « Edit Sketch ». Une esquisse déjà extrudée se rouvre à la souris
// (double-clic dans le navigateur, ou menu de la frise), sa cote change, l'extrusion suit.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code } from './lib.js';

const bbox = (page) => page.evaluate(() => {
  const g = window.camlcadView.part.geometry; g.computeBoundingBox();
  const r = (v) => v.toArray().map((c) => Math.round(c) + 0);
  return [r(g.boundingBox.min), r(g.boundingBox.max)];
});

test('modifier une esquisse existante', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -20, -10); await clickSketch(page, 10, 10);
  await page.locator('[data-tool=dim]').click();
  await clickSketch(page, -5, -10);
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('30'); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([[-20, -10, 0], [10, 10, 5]]);

  // Double-clic sur l'esquisse dans le navigateur : elle se rouvre avec sa cote.
  await page.locator('#tree .row', { hasText: 'esquisse1' }).dblclick();
  await expect(page.locator('#palette')).toBeVisible();
  await expect(page.locator('#sketch-dims .dim', { hasText: /^30$/ })).toBeVisible();
  await shot(page, '98-esquisse-rouverte');
  await page.locator('#sketch-dims .dim', { hasText: /^30$/ }).dblclick();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('40'); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  // Pas de nouvelle extrusion : la même feature suit la nouvelle cote.
  await expect(page.locator('#dialog')).toBeHidden();
  await expect.poll(() => bbox(page)).toEqual([[-20, -10, 0], [20, 10, 5]]);
  await expect(page.locator('#timeline .feat')).toHaveCount(1);
  expect(await code(page)).toMatch(/length l\d+ 40\./);
  await shot(page, '99-esquisse-modifiee');

  // Par la frise : clic droit sur l'extrusion, « Modifier l'esquisse ».
  await page.locator('#timeline .feat', { hasText: 'extrusion1' }).click({ button: 'right' });
  await page.getByRole('button', { name: /Modifier l’esquisse \(esquisse1\)/ }).click();
  await expect(page.locator('#palette')).toBeVisible();
  await page.getByRole('button', { name: 'Abandonner' }).click();
  await expect(page.locator('#palette')).toBeHidden();
});
