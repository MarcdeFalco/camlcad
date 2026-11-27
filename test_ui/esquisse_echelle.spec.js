// Black Book, chapitre 2 (Chamfer, Sketch Scale) : chanfrein d'esquisse sur un coin, puis
// toute l'esquisse mise à l'échelle 1,5 (cotes comprises).
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, triangles, cmd } from './lib.js';

test('chanfrein et échelle d’esquisse', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -20, -10); await clickSketch(page, 0, 10);
  await page.locator('[data-tool=dim]').click();
  await clickSketch(page, -10, -10);
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('20'); await page.keyboard.press('Enter');
  // Chanfrein de 4 au coin (0, 10).
  await page.locator('[data-tool=chamfer]').click();
  await clickSketch(page, 0, 10);
  await expect(page.locator('#sketch-ask input')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('4'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-status')).not.toContainText('⚠');
  // Échelle 1,5 : la cote 20 devient 30.
  await page.locator('#sketch-scale').click();
  await expect(page.locator('#sketch-ask input')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('1.5'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim', { hasText: /^30$/ })).toBeVisible();
  await shot(page, '126-chanfrein-echelle');
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('2');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(12);
  // Aire : (30 × 30 − 6 × 6 / 2) × 2 = 1764 mm³
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(1.764, 2);
  expect(await code(page)).toContain('length');
});
