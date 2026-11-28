// Tutoriel Black Book ch. 5 (Practical 2, fin) : plaque et flasque, plan milieu entre les
// deux faces latérales (la seconde vue au cube, la pièce recadrée), esquisse sur ce plan, un
// triangle accroché aux sommets de la pièce projetés sur le plan, extrusion symétrique de 5 :
// la nervure.
import { test, expect } from './fixtures.js';
import { cmd, open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, triangles } from './lib.js';
const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};
const step = async (name, f) => f();
const field = (page, l) => page.locator('#dialog .drow', { hasText: l }).locator('input').first();
test('nervure dans un plan milieu', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('50'); await field(page, 'Largeur').fill('60'); await field(page, 'Hauteur').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await clickAt(page, await worldPoint(page, [25, 0, 5])); await page.keyboard.press('s');
  await page.getByRole('button', { name: 'Rectangle' }).click();
  await clickSketch(page, 0.4, 0.3); await page.mouse.move(...await sketchPoint(page, 10, 10), { steps: 3 });
  await page.keyboard.type('50'); await page.keyboard.press('Tab'); await page.keyboard.type('35'); await page.keyboard.press('Enter');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(2);
  await page.locator('#home').click(); await page.waitForTimeout(400);
  await shot(page, '290-nervure-plaque');
  await step('plan milieu', async () => {
    await cmd(page, 'Plan milieu');
    await clickAt(page, await worldPoint(page, [50, 30, 5]));
    await page.locator('.cubeface', { hasText: 'Avant' }).click();
    await page.locator('#viewcube .cubearrow.left').click(); await page.waitForTimeout(400);
    await shot(page, '291-nervure-cube');
    await clickAt(page, await worldPoint(page, [0, 30, 5]));
    await expect(page.locator('#tree .row', { hasText: 'Construction (1)' })).toBeVisible();
  });
  await step('esquisse sur le plan', async () => {
    await page.locator('#home').click(); await page.waitForTimeout(400);
    await page.locator('#tree .row', { hasText: 'plan3' }).click();
    await expect(page.locator('#palette')).toBeVisible();
    await page.waitForTimeout(500);
    await shot(page, '292-nervure-plan');
  });
  await step('triangle', async () => {
    await page.getByRole('button', { name: 'Contour' }).click();
    for (const p of [[25, 0, 35], [25, 60, 10], [25, 0, 10], [25, 0, 35]]) await clickAt(page, await worldPoint(page, p));
    // Les trois sommets sont ceux de la pièce (points fixes) et le triangle est un contour.
    expect(await page.evaluate(() => window.camlcadSketch.pts.map((p) => [p.x, p.y, p.fixed]))).toEqual([[0, 35, true], [60, 10, true], [0, 10, true]]);
    expect(await page.evaluate(() => window.camlcadSketch.loops.length)).toBe(1);
    await shot(page, '293-nervure-triangle');
  });
  await step('extrusion symétrique 5', async () => {
    await page.locator('#sketch-extrude').click();
    await page.locator('#dialog .drow', { hasText: 'Direction' }).locator('select').selectOption({ label: 'Symétrique' });
    await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('#timeline .feat')).toHaveCount(3);
  });
  await page.locator('#home').click(); await page.waitForTimeout(800);
  await shot(page, '294-nervure');
  // Plaque 50 × 60 × 10 + flasque 50 × 35 × 5 + nervure (60 × 25 / 2) × 5 = 42,5 cm³.
  await expect.poll(() => volume(page)).toBeCloseTo(42.5, 1);
});
