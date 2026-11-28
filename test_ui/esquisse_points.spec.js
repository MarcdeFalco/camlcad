// Black Book, chapitre 2 (Sketch : 3-Point Rectangle, 2-Point Circle, 3-Point Circle,
// 3-Point Arc) : rectangle incliné par trois points extrudé (aire 210 mm²), puis cercles
// par deux et trois points et un arc par trois points dans une seconde esquisse (plan choisi au clic).
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, code, cmd } from './lib.js';

const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};

test('rectangle, cercles et arc par points', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await cmd(page, 'Rect. 3 points');
  await clickSketch(page, -30, -10); await clickSketch(page, -10, -5); await clickSketch(page, -12, 5);
  await expect(page.locator('#sketch-finish')).toBeEnabled();
  await shot(page, '179-rect3');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  expect(await volume(page)).toBeCloseTo(1.05, 2); // |AB × AQ| = 210 mm², × 5

  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await cmd(page, 'Cercle 2 points');
  await clickSketch(page, -25, -25); await clickSketch(page, -15, -25);
  await cmd(page, 'Cercle 3 points');
  await clickSketch(page, -5, -20); await clickSketch(page, 1, -26); await clickSketch(page, -5, -32);
  await cmd(page, 'Arc 3 points');
  await clickSketch(page, -30, 15); await clickSketch(page, -10, 15); await clickSketch(page, -20, 20);
  await shot(page, '180-cercles-arc');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => volume(page)).toBeCloseTo(1.05 + (Math.PI * (25 + 36) * 5) / 1000, 1);
  const src = await code(page);
  expect(src).toMatch(/on_circle/);
  expect(src).toMatch(/Sketch\.arc/);
});
