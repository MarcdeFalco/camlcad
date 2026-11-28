// Practical 1 (Black Book ch. 5) comme un utilisateur : clics décalés de quelques pixels, plan
// choisi dans la vue, diamètres et rectangle tapés, ajustement, Terminer (l'esquisse reste
// visible), E puis 25. Comparaison avec les figures du livre :
// https://claude.ai/artifact/PrZ337gP3N5eUwGVpYUMXH (captures « cmp1-* »).
import { test, expect } from './fixtures.js';
import { cmd, open, shot, sketchPoint, worldPoint, code, triangles, humanClick, humanSketch } from './lib.js';
const step = async (name, f) => f();
test('Practical 1 au clic humain', async ({ page }) => {
  await open(page);
  await step('1 Esquisse, plan du dessus', async () => {
    await page.getByRole('button', { name: 'Esquisse' }).click();
    await shot(page, 'cmp1-01-choix-plan');
    await humanClick(page, await worldPoint(page, [25, 25, 0]));
    await expect(page.locator('#palette')).toBeVisible();
    expect(await page.evaluate(() => window.camlcadSketch.plane.z.toArray())).toEqual([0, 0, 1]); // le plan visé, XY
  });
  await step('2 cercle Ø50 à l origine (taper 50)', async () => {
    await page.locator('[data-tool=circle]').click();
    await humanSketch(page, 0, 0);
    await page.mouse.move(...await sketchPoint(page, 10, 4), { steps: 3 });
    await page.keyboard.type('50');
    await shot(page, 'cmp1-02-cercle-saisie');
    await page.keyboard.press('Enter');
    await page.locator('[data-tool=circle]').click();
    await humanSketch(page, 0, 0); await page.mouse.move(...await sketchPoint(page, 5, 2), { steps: 3 });
    await page.keyboard.type('20'); await page.keyboard.press('Enter');
    expect((await page.evaluate(() => window.camlcadSketch.pts))[0]).toMatchObject({ x: 0, y: 0, fixed: true }); // centre accroché à l'origine
    await shot(page, 'cmp1-03-cercles');
  });
  await step('3 rectangle par le centre 5 x 25', async () => {
    await page.locator('[data-tool=crect]').click();
    await humanSketch(page, 0, 0); await page.mouse.move(...await sketchPoint(page, 3, 10), { steps: 3 });
    await page.keyboard.type('5'); await page.keyboard.press('Tab'); await page.keyboard.type('25');
    await shot(page, 'cmp1-04-rect-saisie');
    await page.keyboard.press('Enter');
    await shot(page, 'cmp1-05-rect');
  });
  await step('4 ajuster', async () => {
    await page.getByRole('button', { name: 'Ajuster' }).click();
    for (const [x, y] of [[0, 10], [0, -10], [2.5, 0], [-2.5, 0]]) await humanSketch(page, x, y);
    await shot(page, 'cmp1-06-ajuste');
    await expect(page.locator('#sketch-status')).not.toContainText('⚠');
  });
  await step('5 terminer', async () => {
    await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
    await shot(page, 'cmp1-07-termine');
    // L'esquisse terminée reste dessinée dans la vue.
    expect(await page.evaluate(() => window.camlcadView.scene.children.some((o) => o.userData.sketch === 'esquisse1'))).toBe(true);
  });
  await step('6 extrusion', async () => {
    await page.keyboard.press('e');
    await expect(page.locator('#dialog')).toContainText('EXTRUSION');
    await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('25');
    await shot(page, 'cmp1-08-extrusion');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect.poll(() => triangles(page)).toBeGreaterThan(0);
    await page.locator('#home').click();
    await shot(page, 'cmp1-09-piece');
  });
  await cmd(page, 'Propriétés');
  expect(Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1])).toBeCloseTo(40.6, 0);
  // L'esquisse utilisée n'est plus dessinée.
  expect(await page.evaluate(() => window.camlcadView.scene.children.some((o) => o.userData.sketch))).toBe(false);
});
