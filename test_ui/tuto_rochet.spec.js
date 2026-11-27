// Tutoriel Black Book ch. 5, Practical 3 (roue à rochet) : cercles Ø100, Ø20, Ø8 ; une dent
// (ligne de 10 sous le Ø100, arc par trois points jusqu'au cercle) ; réseau circulaire de la
// dent ×10 autour du centre ; dix ajustements du Ø100 (coupé par les lignes et par les arcs) :
// le contour denté est reconnu, extrudé de 13.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, sketchPoint, worldPoint, clickAt, cmd, triangles } from './lib.js';

const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};
const size = (page) => page.evaluate(() => { const g = window.camlcadView.part.geometry; g.computeBoundingBox(); const s = g.boundingBox.getSize(g.boundingBox.min.clone()); return [Math.round(s.x), Math.round(s.y), Math.round(s.z)]; });

test('roue à rochet', async ({ page }) => {
  test.setTimeout(240_000);
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  for (const [d, r] of [[100, 30], [20, 6], [8, 2]]) {
    await page.getByRole('button', { name: 'Cercle' }).click();
    await clickSketch(page, 0, 0); await page.mouse.move(...await sketchPoint(page, r, 0), { steps: 2 });
    await page.keyboard.type(String(d)); await page.keyboard.press('Enter');
  }
  await page.keyboard.press('f');
  await page.mouse.move(...await sketchPoint(page, 0, 0));
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
  // Une dent : ligne de 10 sous le cercle, arc par trois points (rayon 60) jusqu'au cercle.
  await page.getByRole('button', { name: 'Contour' }).click();
  await clickSketch(page, 0, -50); await clickSketch(page, 0, -60); await page.keyboard.press('Escape');
  await cmd(page, 'Arc 3 points');
  await clickSketch(page, 0, -60); await clickSketch(page, -29.15, -40.63); await clickSketch(page, -16, -52.49);
  await shot(page, '300-rochet-dent');
  // Réseau circulaire : la ligne, l'arc, puis (Maj) le centre ; 10 exemplaires.
  await page.locator('[data-tool=select]').click();
  await clickSketch(page, 0, -55);
  await page.keyboard.down('Shift'); await clickSketch(page, -16, -52.49); await clickSketch(page, 0, 0); await page.keyboard.up('Shift');
  await page.getByRole('button', { name: 'Réseau circulaire' }).click();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('10'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-status')).not.toContainText('⚠');
  // Le Ø100 ajusté dans chaque dent, entre la ligne et l'arc.
  await page.getByRole('button', { name: 'Ajuster' }).click();
  for (let k = 0; k < 10; k++) { const t = ((-107 + 36 * k) * Math.PI) / 180; await clickSketch(page, 50 * Math.cos(t), 50 * Math.sin(t)); }
  await expect.poll(() => page.evaluate(() => window.camlcadSketch.loops.length)).toBe(1);
  await shot(page, '301-rochet-ajuste');
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await expect(page.locator('#dialog')).toContainText('1 contour, 2 cercles');
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('13');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page), { timeout: 60_000 }).toBeGreaterThan(0);
  await shot(page, '302-rochet');
  // Pointes des dents à 60 du centre ; plus que le disque Ø100 percé, moins que le Ø120.
  const [sx, sy, sz] = await size(page);
  expect(sz).toBe(13); expect(sx).toBeGreaterThan(110); expect(sy).toBeGreaterThan(110);
  const v = await volume(page);
  expect(v).toBeGreaterThan(98.7); expect(v).toBeLessThan(130);
});
