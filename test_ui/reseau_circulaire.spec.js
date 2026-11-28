// Black Book, chapitre 2 (Circular Pattern) : six trous en couronne dans une plaque ;
// et le menu circulaire du clic droit dans la vue.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, triangles, cmd } from './lib.js';

test('réseau circulaire d’esquisse et menu du clic droit', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -28, -18); await clickSketch(page, 10, 18);
  await page.locator('[data-tool=point]').click();
  await clickSketch(page, -8, 0);
  await page.locator('[data-tool=circle]').click();
  await clickSketch(page, 2, 0); await clickSketch(page, 4.5, 0);
  // Sélection : le cercle, puis (Maj) le centre du réseau.
  await page.locator('[data-tool=select]').click();
  await clickSketch(page, 2, -2.5); // bas du cercle
  await page.keyboard.down('Shift'); await clickSketch(page, -8, 0); await page.keyboard.up('Shift');
  await page.getByRole('button', { name: 'Réseau circulaire' }).click();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('6'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-status')).not.toContainText('⚠');
  await shot(page, '116-reseau-circulaire');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('3');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(100);
  expect((await code(page)).match(/disk c\d/g)).toHaveLength(6);
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(3.75, 1); // 38 × 36 × 3 − 6 trous Ø5
  await page.getByRole('button', { name: 'Fermer' }).click();

  // Clic droit sans glisser dans la vue : menu circulaire, « Mesurer ».
  const v = await page.locator('#view canvas').first().boundingBox();
  await page.mouse.click(v.x + 120, v.y + v.height - 120, { button: 'right' });
  await expect(page.locator('#marking button').first()).toBeVisible();
  await shot(page, '117-menu-circulaire');
  await page.locator('#marking button', { hasText: 'Mesurer' }).click();
  await expect(page.locator('#dialog')).toContainText('MESURER');
});
