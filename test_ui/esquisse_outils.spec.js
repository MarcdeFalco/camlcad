// Black Book, chapitre 2 (Sketching) : rectangle par le centre, polygone, point,
// outil Cote (D), lignes de construction ; extrusion du résultat.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, triangles } from './lib.js';

test('outils d’esquisse : rectangle par le centre, polygone, point, cote', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await expect(page.locator('#palette')).toBeVisible();

  // Rectangle par le centre : centre puis coin ; diagonale de construction.
  await page.getByRole('button', { name: 'Rect. centre' }).click();
  await clickSketch(page, -20, 0);
  await page.mouse.move(...await sketchPoint(page, -8, 8), { steps: 5 });
  await expect(page.locator('#sketch-live')).toHaveText('24 × 16 mm');
  await clickSketch(page, -8, 8);
  await expect(page.locator('#sketch-list li')).toHaveCount(5); // H, V, H, V, milieu

  // Polygone à 5 côtés : centre puis sommet.
  await page.locator('#poly-sides').fill('5');
  await page.getByRole('button', { name: 'Polygone' }).click();
  await clickSketch(page, 0, -25);
  await page.mouse.move(...await sketchPoint(page, 0, -18), { steps: 5 });
  await shot(page, '40-polygone-elastique');
  await clickSketch(page, 0, -18);
  await expect(page.locator('#sketch-dims .dim')).toHaveText(['7']); // rayon de construction coté

  // Point libre.
  await page.getByRole('button', { name: 'Point' }).click();
  await clickSketch(page, 8, 20);

  // Outil Cote : un clic sur une ligne propose sa longueur.
  await page.getByRole('button', { name: 'Cote' }).click();
  await clickSketch(page, -20, 8); // côté du haut du rectangle
  await expect(page.locator('#sketch-ask input')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('30'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim', { hasText: '30' })).toBeVisible();
  // Rayon du polygone porté à 9 par double-clic sur sa cote.
  await page.locator('#sketch-dims .dim', { hasText: /^7$/ }).dblclick();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('9'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim', { hasText: /^9$/ })).toBeVisible();
  await shot(page, '41-outils-esquisse');

  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(1);
  await expect.poll(() => triangles(page)).toBeGreaterThan(20);
  const c = await code(page);
  expect(c).toContain('midpoint'); expect(c).toMatch(/length l\d+ 30./);
  await shot(page, '42-outils-extrusion');
});
