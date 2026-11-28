// Black Book, chapitre 2 (Sketching) : symétrie d'esquisse par rapport à une ligne de
// construction, réseau rectangulaire d'esquisse ; copies associatives (contraintes).
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, triangles } from './lib.js';

const bbox = (page) => page.evaluate(() => {
  const g = window.camlcadView.part.geometry; g.computeBoundingBox();
  const r = (v) => v.toArray().map((c) => Math.round(c) + 0);
  return [r(g.boundingBox.min), r(g.boundingBox.max)];
});

test('symétrie et réseau d’esquisse', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await expect(page.locator('#palette')).toBeVisible();
  // Axe : ligne ouverte verticale (ligne de construction).
  await page.locator('[data-tool=poly]').click();
  await clickSketch(page, 0, -20); await clickSketch(page, 0, 20); await page.keyboard.press('Escape');
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -30, -8); await clickSketch(page, -10, 8);
  await page.locator('[data-tool=circle]').click();
  await clickSketch(page, -20, 0); await clickSketch(page, -18, 0);

  // Sélection (Maj) des quatre côtés et du cercle, puis de l'axe en dernier.
  await page.locator('[data-tool=select]').click();
  await page.keyboard.down('Shift');
  for (const [x, y] of [[-20, -8], [-10, 0], [-20, 8], [-30, 0], [-18, 0], [0, 15]]) await clickSketch(page, x, y);
  await page.keyboard.up('Shift');
  await page.getByRole('button', { name: /Symétrie \/ L1/ }).click();
  await expect(page.locator('#sketch-status')).not.toContainText('⚠');
  await shot(page, '95-symetrie-esquisse');

  // Réseau du cercle d'origine : 2 exemplaires au pas de 5 mm.
  await clickSketch(page, -18, 0);
  await page.getByRole('button', { name: 'Réseau x' }).click();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('2'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-ask')).toContainText('Pas (2 exemplaires)');
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('5'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-status')).not.toContainText('⚠');
  await shot(page, '96-reseau-esquisse');

  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('4');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([[-30, -8, 0], [30, 8, 4]]);
  const c = await code(page);
  expect(c).toContain('symmetric'); expect(c).toContain('hdistance');
  await expect.poll(() => triangles(page)).toBeGreaterThan(100); // trois trous
  await shot(page, '97-copies-extrusion');
});
