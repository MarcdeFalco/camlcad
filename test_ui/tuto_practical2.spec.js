// Tutoriel Black Book ch. 5, Practical 2 (plaque) : rectangle par le centre 50 × 60 tapé au
// tracé, axe passé en construction (X), ligne inclinée cotée 70 et 80° au côté du rectangle,
// sa symétrique par rapport à l'axe (raccordée au coin), ligne de fermeture, oblong par le
// centre 16 × 15 tapé au tracé, côté du rectangle ajusté : un contour percé, extrudé de 10.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, cmd, triangles } from './lib.js';

const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};

test('Practical 2 : plaque inclinée à oblong', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.getByRole('button', { name: 'Rect. centre' }).click();
  await clickSketch(page, 0, 0);
  await page.mouse.move(...await sketchPoint(page, 10, 10), { steps: 3 });
  await page.keyboard.type('50'); await page.keyboard.press('Tab'); await page.keyboard.type('60'); await page.keyboard.press('Enter');
  // Recul à la molette pour voir où ira la ligne inclinée.
  await page.mouse.move(...await sketchPoint(page, 30, 0));
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
  // Axe horizontal, passé en construction.
  await page.getByRole('button', { name: 'Contour' }).click();
  await clickSketch(page, 0, 0); await clickSketch(page, 100, 0); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sélection' }).click();
  await clickSketch(page, 90, 0); await page.keyboard.press('x');
  // Ligne inclinée depuis le coin bas droit, puis sa symétrique (Maj : ligne puis axe).
  await page.getByRole('button', { name: 'Contour' }).click();
  await clickSketch(page, 25, -30); await clickSketch(page, 93.9, -17.8); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sélection' }).click();
  await page.keyboard.down('Shift'); await clickSketch(page, 60, -24); await clickSketch(page, 90, 0); await page.keyboard.up('Shift');
  await page.getByRole('button', { name: /Symétrie/ }).first().click();
  await expect(page.locator('#sketch-status')).not.toContainText('⚠');
  // Ligne de fermeture : les quatre lignes et le rectangle font un contour.
  await page.getByRole('button', { name: 'Contour' }).click();
  await clickSketch(page, 93.9, -17.8); await clickSketch(page, 93.9, 17.8); await page.keyboard.press('Escape');
  // Cotes : 70 sur la ligne inclinée, 80° entre elle et le côté du rectangle (sans retourner la figure).
  await page.getByRole('button', { name: 'Sélection' }).click();
  await clickSketch(page, 60, -24);
  await page.getByRole('button', { name: 'Longueur' }).click();
  await page.locator('#sketch-ask input').fill('70'); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Cote' }).click();
  await clickSketch(page, 25, -20); await clickSketch(page, 50, -25.6);
  await page.locator('#sketch-ask input').fill('80'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim', { hasText: '80°' })).toBeVisible();
  const p5 = await page.evaluate(() => window.camlcadSketch.pts.find((p) => p.x > 90 && p.x < 99 && p.y < -5));
  expect(p5.x).toBeCloseTo(93.94, 1); expect(p5.y).toBeCloseTo(-17.84, 1);
  await shot(page, '260-practical2-esquisse');
  // Oblong par le centre (menu ▾), entraxe 16 et largeur 15 tapés.
  await cmd(page, 'Oblong centre');
  await clickSketch(page, 65, 0);
  await page.mouse.move(...await sketchPoint(page, 72, 0), { steps: 3 });
  await page.keyboard.type('16'); await page.keyboard.press('Tab'); await page.keyboard.type('15'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim', { hasText: 'R7.5' })).toBeVisible();
  // Le côté droit du rectangle, intérieur à la plaque, est ajusté.
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await clickSketch(page, 25, 10);
  await expect(page.locator('#sketch-status')).not.toContainText('⚠');
  await shot(page, '261-practical2-ajuste');
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await expect(page.locator('#dialog')).toContainText('2 contours');
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(0);
  expect(await code(page)).toMatch(/Sketch\.\(loop \[[^\]]+\] - path/);
  await shot(page, '262-practical2-plaque');
  // (rectangle 50 × 60 + trapèze 60 / 35,68 sur 68,94) − oblong 16 × 15 : ≈ 58,8 cm³.
  await expect.poll(() => volume(page)).toBeCloseTo(58.8, 0);
});
