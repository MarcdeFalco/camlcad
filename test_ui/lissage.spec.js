// Black Book, chapitre 3 (Loft) : un carré sur XY gardé seul, un plan décalé de 20 mm, un
// cercle dessus, puis Lissage entre les deux contours : Shape.loft, volume entre les deux
// prismes (carré × 20 et disque × 20).
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, code, cmd } from './lib.js';

test('lissage entre un carré et un cercle', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -20, -10); await clickSketch(page, 0, 10);
  await page.getByRole('button', { name: 'Lissage' }).click();
  await expect(page.locator('#dialog')).toContainText('LISSAGE');
  await page.getByRole('button', { name: 'Garder l’esquisse' }).click();
  await expect.poll(() => code(page)).toContain('let%sketch esquisse1 =');

  await page.getByRole('button', { name: 'Plan décalé' }).click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('20');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toContain('Geom.Plane.offset 20. Geom.Plane.xy');
  const plane = (await code(page)).match(/let (plan\d+) = Geom\.Plane\.offset 20\./)[1];
  await page.locator('#tree .row', { hasText: plane }).click();
  await expect(page.locator('#palette')).toBeVisible();
  await page.locator('[data-tool=circle]').click();
  await clickSketch(page, -10, 0); await clickSketch(page, -2, 0);
  await page.getByRole('button', { name: 'Lissage' }).click();
  await expect(page.locator('#dialog .drow', { hasText: 'Vers l’esquisse' }).locator('select')).toHaveValue('esquisse1');
  await shot(page, '169-lissage');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(12);
  expect(await code(page)).toMatch(/Shape\.loft \[ \(plan1, esquisse1\); \(plan\d+, esquisse\d+\) \]/);
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeGreaterThan(4.02); // disque r 8 × 20
  expect(vol).toBeLessThan(8); // carré 20 × 20 × 20
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '170-lissage-solide');
});
