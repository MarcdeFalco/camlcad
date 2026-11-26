// Scénario 3 : cube de vue (faces cliquables), vue de départ, orbite à la souris.
import { test, expect } from './fixtures.js';
import { open, shot } from './lib.js';

const viewDir = (page) => page.evaluate(() => {
  const { camera, controls } = window.camlcadSketch.ctx;
  return camera.position.clone().sub(controls.target).normalize().toArray().map((c) => Math.round(c * 100) / 100 + 0);
});

test('cube de vue', async ({ page }) => {
  await open(page, 'support');
  await page.locator('.cubeface', { hasText: 'Dessus' }).click();
  await expect.poll(() => viewDir(page)).toEqual([0, 0, 1]);
  await shot(page, '20-cube-dessus');
  // Vue de dessus : les faces latérales sont de profil ; les flèches amènent la voisine.
  await page.locator('#viewcube .cubearrow.down').click();
  await expect.poll(() => viewDir(page)).toEqual([0, -1, 0]);
  await shot(page, '21-cube-avant');
  await page.locator('#viewcube .cubearrow.right').click();
  await expect.poll(() => viewDir(page)).toEqual([1, 0, 0]);
  await page.locator('#home').click();
  await expect.poll(async () => (await viewDir(page))[2]).toBeGreaterThan(0.3);
  await page.locator('.cubeface', { hasText: 'Avant' }).click();
  await expect.poll(() => viewDir(page)).toEqual([0, -1, 0]);
  // Orbite : glisser dans la vue change l'orientation, le cube suit.
  const v = await page.locator('#view canvas').first().boundingBox();
  await page.mouse.move(v.x + v.width / 2, v.y + v.height / 2);
  await page.mouse.down(); await page.mouse.move(v.x + v.width / 2 - 120, v.y + v.height / 2 - 60, { steps: 10 }); await page.mouse.up();
  await expect.poll(() => viewDir(page)).not.toEqual([0, -1, 0]);
  await shot(page, '22-orbite');
  await page.locator('#home').click();
  await expect.poll(async () => (await viewDir(page))[2]).toBeGreaterThan(0.3);
  await shot(page, '23-vue-depart');
});
