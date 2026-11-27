// Black Book, chapitres 2 (Text) et 3 (Emboss) : un pavé, du texte en relief sur le dessus,
// puis un texte gravé ; Cad_parts.Text dans le code, volume qui monte puis descend.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, code, cmd } from './lib.js';

const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};

test('texte en relief et gravé', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -30, -10); await clickSketch(page, 10, 10);
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();

  await cmd(page, 'Texte');
  await clickAt(page, await worldPoint(page, [-10, 3, 5]));
  await expect(page.locator('#dialog')).toContainText('TEXTE');
  await page.locator('#text-value').fill('AB1');
  await page.locator('#dialog .drow', { hasText: 'Hauteur' }).locator('input').fill('8');
  await shot(page, '177-texte');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(12);
  expect(await code(page)).toContain('Cad_parts.Text.profile ~center:true ~size:8. "AB1"');
  const v1 = await volume(page);
  expect(v1).toBeGreaterThan(4.0);

  await cmd(page, 'Texte');
  await clickAt(page, await worldPoint(page, [-10, -6, 5]));
  await page.locator('#text-value').fill('X');
  await page.locator('#dialog .drow', { hasText: 'Opération' }).locator('select').selectOption('cut');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => volume(page)).toBeLessThan(v1);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '178-texte-solide');
});
