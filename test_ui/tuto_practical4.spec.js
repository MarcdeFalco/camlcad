// Tutoriel Black Book ch. 5, Practical 4 (support de palier) : Ø70, Ø40 et trois Ø20 tapés ;
// arcs R20 par le centre autour des Ø20, lignes qui les relient, congés R8 qui viennent
// toucher le Ø70, sans rien ajuster. À l'extrusion, le dessin est découpé en régions comme
// dans un modeleur : la bride (bordée par le bas du Ø70) extrudée de 12, puis, l'esquisse
// reprise du navigateur, l'anneau Ø70/Ø40 de 50.
import { test, expect } from './fixtures.js';
import { cmd, open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, triangles } from './lib.js';
const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};
const step = async (name, f) => f();
test('Practical 4 : bride et moyeu, régions du dessin', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  const circle = async (x, y, d) => { await page.getByRole('button', { name: 'Cercle' }).click(); await clickSketch(page, x, y); await page.mouse.move(...await sketchPoint(page, x + d / 4, y), { steps: 2 }); await page.keyboard.type(String(d)); await page.keyboard.press('Enter'); };
  await circle(0, 0, 70); await circle(0, 0, 40);
  await page.mouse.move(...await sketchPoint(page, 0, 0)); for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
  await circle(-50, 0, 20); await circle(50, 0, 20); await circle(0, -50, 20);
  const arc = async (c, a, b) => { await page.locator('[data-tool=arc]').click(); await clickSketch(page, ...c); await clickSketch(page, ...a); await clickSketch(page, ...b); };
  const line = async (a, b) => { await page.getByRole('button', { name: 'Contour' }).click(); await clickSketch(page, ...a); await clickSketch(page, ...b); await page.keyboard.press('Escape'); };
  await step('contour', async () => {
    await arc([-50, 0], [-50, 20], [-64.14, -14.14]);
    await arc([0, -50], [-14.14, -64.14], [14.14, -64.14]);
    await arc([50, 0], [64.14, -14.14], [50, 20]);
    await line([-64.14, -14.14], [-14.14, -64.14]);
    await line([14.14, -64.14], [64.14, -14.14]);
    await line([-50, 20], [-41.29, 20]);
    await line([41.29, 20], [50, 20]);
    await arc([-41.29, 12], [-33.61, 9.77], [-41.29, 20]);
    await arc([41.29, 12], [41.29, 20], [33.61, 9.77]);
  });
  await shot(page, '310-practical4-esquisse');
  await step('terminer', async () => {
    await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
    await expect(page.locator('#dialog')).toContainText('EXTRUSION');
    await expect(page.locator('#dialog')).toContainText('2 contours, 4 cercles'); // bride et disque Ø70 ; Ø40 et trois Ø20
  });
  await shot(page, '311-practical4-regions');
  const regions = page.locator('#dialog .profiles input[type=checkbox]');
  for (let i = 1; i < 6; i++) await regions.nth(i).uncheck();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('12');
  await shot(page, '312-practical4-bride');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(0);
  const v1 = await volume(page);
  expect(v1).toBeGreaterThan(45); expect(v1).toBeLessThan(60); // bride seule, percée
  expect(await code(page)).toContain('Profile.region 0 esquisse1');
  await cmd(page, 'Extrusion');
  await page.locator('#tree .row', { hasText: 'esquisse1' }).click();
  await expect(page.locator('#dialog')).toContainText('EXTRUSION');
  for (let i = 0; i < 6; i++) { if (i === 1) await regions.nth(i).check(); else await regions.nth(i).uncheck(); }
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('50');
  await shot(page, '313-practical4-moyeu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toContain('Profile.region 1 esquisse1');
  await shot(page, '314-practical4');
  // L'anneau Ø70/Ø40 de 50 s'ajoute sans recouvrement : π (35² − 20²) × 50 ≈ 129,6 cm³ (volume
  // affiché à trois chiffres, cercles en facettes).
  await expect.poll(async () => Math.abs((await volume(page)) - v1 - 129.6)).toBeLessThan(1.5);
});
