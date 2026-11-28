// Retour de Marc : comme dans Fusion, le curseur s'accroche aux points d'intérêt de l'esquisse.
// Rectangle commencé près de l'origine (son coin y est, fixe), deux lignes qui se croisent,
// cercle centré sur leur croisement (sur les deux lignes), ligne qui s'arrête sur
// l'intersection d'une ligne et du cercle (sur le cercle).
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, sketchPoint } from './lib.js';

const pts = (page) => page.evaluate(() => window.camlcadSketch.pts.map((p) => [Math.round(p.x * 1000) / 1000, Math.round(p.y * 1000) / 1000, p.fixed]));
const cons = (page) => page.evaluate(() => window.camlcadSketch.cons.map((c) => c.kind));

test('accroches : origine et intersections', async ({ page }) => {
  await open(page, 'nouveau');
  await page.locator('#tree .row', { hasText: 'Plan XY' }).click();
  // Rectangle depuis l'origine (clic à 0,6 mm d'elle) : coin exactement en (0, 0), fixe.
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, 0.5, 0.35); await clickSketch(page, 30, 20);
  expect((await pts(page))[0]).toEqual([0, 0, true]);
  // Deux lignes en croix au-dessus.
  await page.locator('[data-tool=poly]').click();
  await clickSketch(page, -30, 5); await clickSketch(page, -10, 25); await page.keyboard.press('Escape');
  await clickSketch(page, -30, 25); await clickSketch(page, -10, 5); await page.keyboard.press('Escape');
  // Cercle centré au croisement (clic à 0,7 mm) : centre en (-20, 15), sur les deux lignes.
  await page.locator('[data-tool=circle]').click();
  await page.mouse.move(...await sketchPoint(page, -19.5, 15.5), { steps: 3 });
  await shot(page, '380-accroche-croisement');
  await clickSketch(page, -19.5, 15.5); await clickSketch(page, -14, 15);
  const centre = (await pts(page)).at(-1);
  expect(centre.slice(0, 2)).toEqual([-20, 15]);
  expect((await cons(page)).filter((k) => k === 'on_line')).toHaveLength(2);
  // Ligne qui finit à l'intersection de la diagonale et du cercle (près de (-16.1, 18.9)).
  const r = await page.evaluate(() => window.camlcadSketch.circles[0].r), k = r / Math.SQRT2;
  await page.locator('[data-tool=poly]').click();
  await clickSketch(page, -40, 40); await clickSketch(page, -20 + k + 0.4, 15 + k - 0.3); await page.keyboard.press('Escape');
  const end = (await pts(page)).at(-1);
  expect(end[0]).toBeCloseTo(-20 + k, 2); expect(end[1]).toBeCloseTo(15 + k, 2);
  expect((await cons(page)).filter((c) => c === 'on_circle')).toHaveLength(1);
  await expect(page.locator('#sketch-status')).not.toContainText('⚠');
  await shot(page, '381-accroches');
});
