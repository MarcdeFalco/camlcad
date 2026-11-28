// Tutoriel Black Book ch. 5 (Practical 2, flasque) : esquisse sur la face avant d'une plaque,
// rectangle partant du coin de la face (le sommet accroche le curseur), 50 × 35 tapé, deux
// trous Ø10 tapés, extrusion de 5 jointe vers l'extérieur.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, sketchPoint, worldPoint, clickAt, cmd, triangles } from './lib.js';

const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};
const field = (page, l) => page.locator('#dialog .drow', { hasText: l }).locator('input').first();

test('flasque sur la face avant', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('50'); await field(page, 'Largeur').fill('60'); await field(page, 'Hauteur').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  // Face avant (y = 0) cliquée, S : esquisse dessus.
  await clickAt(page, await worldPoint(page, [25, 0, 5]));
  await page.keyboard.press('s');
  await expect(page.locator('#palette')).toBeVisible();
  // Rectangle depuis le coin de la face : clic un peu à côté, le sommet accroche (point fixe).
  await page.getByRole('button', { name: 'Rectangle' }).click();
  await clickSketch(page, 0.4, 0.3);
  await page.mouse.move(...await sketchPoint(page, 10, 10), { steps: 3 });
  await page.keyboard.type('50'); await page.keyboard.press('Tab'); await page.keyboard.type('35'); await page.keyboard.press('Enter');
  const corner = await page.evaluate(() => window.camlcadSketch.pts[0]);
  expect([corner.x, corner.y, corner.fixed]).toEqual([0, 0, true]);
  await page.keyboard.press('f');
  for (const x of [12.5, 37.5]) {
    await page.getByRole('button', { name: 'Cercle' }).click();
    await clickSketch(page, x, 22.5);
    await page.mouse.move(...await sketchPoint(page, x + 3, 22.5));
    await page.keyboard.type('10'); await page.keyboard.press('Enter');
  }
  await expect(page.locator('#sketch-dims .dim', { hasText: 'Ø10' })).toHaveCount(2);
  await shot(page, '270-flasque-esquisse');
  await page.locator('#sketch-extrude').click();
  await expect(page.locator('#dialog')).toContainText('1 contour, 2 cercles');
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(2);
  await shot(page, '271-flasque');
  // Plaque 50 × 60 × 10 + flasque (50 × 35 − 2 trous Ø10) × 5 : ≈ 37,96 cm³.
  await expect.poll(() => volume(page)).toBeCloseTo(37.96, 1);
});
