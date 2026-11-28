// Black Book, chapitre 2 (Sketching) : arcs. Congé d'esquisse sur un coin de rectangle,
// oblong centre à centre, arc par le centre, cote d'un arc ; extrusion du profil.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, triangles, dblclickDim } from './lib.js';

test('arcs : congé, oblong, arc par le centre', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await expect(page.locator('#palette')).toBeVisible();

  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -30, -15); await clickSketch(page, 0, 10);
  // Congé au coin (0, 10) : rayon demandé dans la palette.
  await page.getByRole('button', { name: 'Congé' }).click();
  await clickSketch(page, 0, 10);
  await expect(page.locator('#sketch-ask input')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('6'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim', { hasText: 'R6' })).toBeVisible();
  await expect(page.locator('#sketch-status')).not.toContainText('⚠');

  // Oblong centre à centre.
  await page.getByRole('button', { name: 'Oblong' }).click();
  await clickSketch(page, -25, -28);
  await page.mouse.move(...await sketchPoint(page, -5, -28), { steps: 5 });
  await expect(page.locator('#sketch-live')).toHaveText('entraxe 20 mm · tapez la cote');
  await shot(page, '43-oblong-elastique');
  await clickSketch(page, -5, -28);

  // Arc par le centre : centre, début, fin.
  await page.locator('[data-tool=arc]').click();
  await clickSketch(page, -15, 22); await clickSketch(page, -9, 22); await clickSketch(page, -21, 22);

  // Cote sur l'arc libre (clic sur son sommet), puis rayon de l'oblong porté à 4 par double-clic.
  await page.getByRole('button', { name: 'Cote' }).click();
  await clickSketch(page, -15, 28);
  await expect(page.locator('#sketch-ask input')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('5'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim', { hasText: 'R5' })).toBeVisible();
  await dblclickDim(page.locator('#sketch-dims .dim', { hasText: 'R3.33' }));
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('4'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim', { hasText: 'R4' })).toBeVisible();
  await expect(page.locator('#sketch-status')).not.toContainText('⚠');
  await expect(page.locator('#sketch-status')).not.toContainText('redondante');
  await shot(page, '44-arcs');

  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('6');
  await shot(page, '45-arcs-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(1);
  await expect.poll(() => triangles(page)).toBeGreaterThan(50);
  const c = await code(page);
  expect(c).toContain('Sketch.arc'); expect(c).toContain('path [');
  await shot(page, '46-arcs-extrusion');
});
