// Impression 3D (Arrange) : plusieurs exemplaires de l'équerre sur le plateau, en grille,
// avec un écart ; l'encombrement et le STL exporté les contiennent tous.
import { test, expect } from './fixtures.js';
import { open, shot, triangles } from './lib.js';
import { readFile } from 'node:fs/promises';

test('exemplaires sur le plateau', async ({ page }) => {
  await open(page, 'support');
  const tris = await triangles(page);
  await page.getByRole('button', { name: 'Impression 3D' }).click();
  await page.locator('#print-copies').fill('4');
  await expect(page.locator('#print-size')).toHaveText('Encombrement : 125 × 55 × 30 mm ✓ tient dans le volume');
  await shot(page, '185-exemplaires');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exporter le STL orienté' }).click()]);
  expect((await readFile(await dl.path())).readUInt32LE(80)).toBe(4 * tris);
  await page.locator('#print-copies').fill('16');
  await expect(page.locator('#print-size')).toHaveText('Encombrement : 255 × 115 × 30 mm ✗ dépasse le volume');
  await page.locator('#print-gap').fill('2');
  await expect(page.locator('#print-size')).toHaveText('Encombrement : 246 × 106 × 30 mm ✓ tient dans le volume');
});
