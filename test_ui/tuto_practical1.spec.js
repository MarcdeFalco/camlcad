// Tutoriel Black Book ch. 5, Practical 1 : deux cercles concentriques Ø50 et Ø20, un
// rectangle par le centre 5 × 25, ajusté avec le cercle Ø20 (rainures de clavette), puis
// extrusion de 25 : une bague percée d'un alésage à deux rainures (volume vérifié).
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, cmd, triangles } from './lib.js';

const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};
async function diameter(page, x, y, d) {
  await page.getByRole('button', { name: 'Sélection' }).click();
  await clickSketch(page, x, y);
  await page.getByRole('button', { name: 'Diamètre' }).click();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type(String(d)); await page.keyboard.press('Enter');
}

test('Practical 1 : bague à alésage rainuré', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.getByRole('button', { name: 'Cercle' }).click();
  await clickSketch(page, 0, 0); await clickSketch(page, 20, 0);
  await diameter(page, 20, 0, 50);
  await page.getByRole('button', { name: 'Cercle' }).click();
  await clickSketch(page, 0, 0); await clickSketch(page, 8, 0);
  await diameter(page, 8, 0, 20);
  await page.getByRole('button', { name: 'Rect. centre' }).click();
  await clickSketch(page, 0, 0); await clickSketch(page, 2.5, 12.5);
  await shot(page, '240-practical1-esquisse');
  // Ajuster : les deux arcs du Ø20 dans le rectangle, puis les côtés du rectangle dans le cercle.
  await page.getByRole('button', { name: 'Ajuster' }).click();
  for (const [x, y] of [[0, 10], [0, -10], [2.5, 0], [-2.5, 0]]) await clickSketch(page, x, y);
  await shot(page, '241-practical1-ajuste');
  await page.locator('#sketch-extrude').click();
  await expect(page.locator('#dialog')).toContainText('1 contour, 1 cercle');
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('25');
  await shot(page, '242-practical1-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toContain('let%feat extrusion1');
  await expect.poll(() => triangles(page)).toBeGreaterThan(0);
  await shot(page, '243-practical1-piece');
  // Bague Ø50 moins (disque Ø20 + deux rainures 5 × 2,82) : ≈ 40,6 cm³.
  await expect.poll(() => volume(page)).toBeCloseTo(40.6, 0);
});
