// Black Book, chapitre 6 (Move/Copy, « Create Copy ») : un pavé copié à 30 mm, puis la paire
// copiée tournée de 90° autour de z : quatre pavés, volume × 4.
import { test, expect } from './fixtures.js';
import { open, shot, triangles, code, cmd } from './lib.js';

test('déplacer avec copie', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  const volume = async () => {
    await cmd(page, 'Propriétés');
    const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
    await page.getByRole('button', { name: 'Fermer' }).click();
    return v;
  };
  const v0 = await volume();
  await cmd(page, 'Déplacer');
  await page.locator('#dialog .drow', { hasText: 'Translation x' }).locator('input').fill('30');
  await page.locator('#move-copy').check();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(24);
  expect(await code(page)).toMatch(/let%feat copie\d+ = Shape\.\(boite1 \+ \(boite1 \|> translate/);
  await cmd(page, 'Déplacer');
  await page.locator('#dialog .drow', { hasText: 'Angle' }).locator('input').fill('90');
  await page.locator('#move-copy').check();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(24); // les copies tournées touchent les premières
  expect(await volume()).toBeCloseTo(4 * v0, 1);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '186-copier');
});
