// Exercice Black Book ch. 5, Practice 2 (coude) : sur le plan XZ, chemin ligne de 30, arc R20
// par le centre, ligne de 30 ; Tuyau Ø40 paroi 2 le long de ce chemin : le coude suit l'arc
// (balayage lisse ; avant, l'arc n'était pas un chemin de tuyau).
import { test, expect } from './fixtures.js';
import { cmd, open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, triangles } from './lib.js';
const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};
const step = async (name, f) => f();
const row = (page, l) => page.locator('#dialog .drow', { hasText: l });
test('Practice 2 : coude', async ({ page }) => {
  await open(page, 'nouveau');
  await page.locator('#tree .row', { hasText: 'Plan XZ' }).click();
  await page.mouse.move(...await sketchPoint(page, 20, 20)); for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
  await step('chemin', async () => {
    await page.getByRole('button', { name: 'Contour' }).click(); await clickSketch(page, 0, 0); await clickSketch(page, 0, 30); await page.keyboard.press('Escape');
    await page.locator('[data-tool=arc]').click(); await clickSketch(page, 20, 30); await clickSketch(page, 20, 50); await clickSketch(page, 0, 30);
    await page.getByRole('button', { name: 'Contour' }).click(); await clickSketch(page, 20, 50); await clickSketch(page, 50, 50); await page.keyboard.press('Escape');
    await shot(page, '330-coude-chemin');
  });
  await step('tuyau', async () => {
    await page.locator('#sketch-pipe').click();
    await expect(page.locator('#dialog')).toContainText('TUYAU');
    await row(page, 'Rayon').locator('input').fill('20'); await row(page, 'Paroi').locator('input').fill('2');
    await shot(page, '331-coude-apercu');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect.poll(() => triangles(page), { timeout: 60000 }).toBeGreaterThan(0);
  });
  await page.locator('#home').click();
  await shot(page, '332-coude');
  expect(await code(page)).toContain('sweep (Profile.circle ~r:20.)');
  // Couronne π (20² − 18²) le long de 30 + π × 20 / 2 + 30 ≈ 91,4 : ≈ 21,8 cm³.
  await expect.poll(() => volume(page)).toBeCloseTo(21.8, 0);
});
