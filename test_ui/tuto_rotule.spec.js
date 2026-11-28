// Exercice Black Book ch. 5, Practice 4 (rotule) : tige Ø20 × 60, six pans de 25,4 sur plats
// tapé au tracé (polygone circonscrit) sur le dessus, col Ø17 × 3, boule R18,75 (sphère jointe).
import { test, expect } from './fixtures.js';
import { cmd, open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, triangles } from './lib.js';
const step = async (name, f) => f();
const row = (page, l) => page.locator('#dialog .drow', { hasText: l });
test('Practice 4 : rotule', async ({ page }) => {
  await open(page, 'nouveau');
  const typed = async (tool, v, more) => { if (more) await cmd(page, tool); else await page.locator(`[data-tool=${tool}]`).click(); await clickSketch(page, 0, 0); await page.mouse.move(...await sketchPoint(page, 4, 1), { steps: 2 }); await page.keyboard.type(String(v)); await page.keyboard.press('Enter'); };
  const extrude = async (h) => { await page.locator('#sketch-extrude').click(); await row(page, 'Distance').locator('input').fill(String(h)); await page.getByRole('button', { name: 'OK' }).click(); };
  await step('tige Ø20 × 60', async () => { await page.locator('#tree .row', { hasText: 'Plan XY' }).click(); await typed('circle', 20); await extrude(60); await expect(page.locator('#timeline .feat')).toHaveCount(1); });
  await step('six pans 25,4 × 15 sur le dessus', async () => {
    await page.getByRole('button', { name: 'Ajuster' }).click();
    await clickAt(page, await worldPoint(page, [3, 3, 60])); await page.keyboard.press('s');
    await typed('Polygone circonscrit', 25.4, true);
    await expect(page.locator('#sketch-dims .dim', { hasText: '12.7' })).toBeVisible(); // apothème : la moitié de 25,4
    await extrude(15); await expect(page.locator('#timeline .feat')).toHaveCount(2);
  });
  await step('col Ø17 × 3', async () => {
    await page.getByRole('button', { name: 'Ajuster' }).click();
    await clickAt(page, await worldPoint(page, [3, 3, 75])); await page.keyboard.press('s');
    await typed('circle', 17); await extrude(3); await expect(page.locator('#timeline .feat')).toHaveCount(3);
  });
  await step('boule R18,75', async () => {
    await cmd(page, 'Sphère'); await row(page, 'Rayon').locator('input').fill('18.75'); await row(page, 'Centre').locator('input').nth(2).fill('94.7');
    await page.getByRole('button', { name: 'OK' }).click(); await expect(page.locator('#timeline .feat')).toHaveCount(4);
  });
  await page.locator('#home').click();
  await shot(page, '350-rotule');
  // Tige 18,85 + six pans 8,38 + col 0,68 + boule 27,61 (moins le recouvrement) ≈ 55,2 cm³.
  await cmd(page, 'Propriétés');
  expect(Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1])).toBeCloseTo(55.2, 0);
  await page.getByRole('button', { name: 'Fermer' }).click();
  expect(await code(page)).toContain('point_line_distance p0 l0 12.7');
});
