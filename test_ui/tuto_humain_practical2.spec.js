// Practical 2 (Black Book ch. 5) comme un utilisateur, figure par figure (captures « cmp2-* ») :
// rectangle par le centre tapé, ligne de 70 à 80° tapée au tracé (angle compté depuis le côté
// du rectangle), symétrie par l'axe, oblong, ajuster, Terminer puis E aussitôt, flasque sur la
// face du bout (esquisse à l'endroit, distance -5 tapée : vers la pièce), plan milieu et
// nervure d'une seule ligne jusqu'à la pièce.
import { test, expect } from './fixtures.js';
import { cmd, open, shot, sketchPoint, worldPoint, code, triangles, humanClick, humanSketch } from './lib.js';
const step = async (name, f) => f();
const bbox = (page) => page.evaluate(() => { const g = window.camlcadView.part.geometry; g.computeBoundingBox(); const b = g.boundingBox; return [b.min.x, b.max.x, b.min.z, b.max.z].map((v) => Math.round(v * 10) / 10); });
const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};
test('Practical 2 au clic humain', async ({ page }) => {
  test.setTimeout(240000);
  await open(page);
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await humanClick(page, await worldPoint(page, [25, 25, 0]));
  await expect(page.locator('#palette')).toBeVisible();
  await step('fig. 10 rectangle par le centre 50 x 60', async () => {
    await page.locator('[data-tool=crect]').click(); await humanSketch(page, 0, 0); await page.mouse.move(...await sketchPoint(page, 8, 10), { steps: 3 });
    await page.keyboard.type('50'); await page.keyboard.press('Tab'); await page.keyboard.type('60'); await page.keyboard.press('Enter');
    await page.keyboard.press('f'); await page.waitForTimeout(300);
    await page.mouse.move(...await sketchPoint(page, 30, 0)); for (let i = 0; i < 9; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
    await shot(page, 'cmp2-10-rect');
  });
  await step('fig. 11 ligne 70 à 80° tapée', async () => {
    await page.locator('[data-tool=poly]').click(); await humanSketch(page, 25, -30);
    await page.mouse.move(...await sketchPoint(page, 60, -24), { steps: 3 });
    await expect(page.locator('#sketch-live')).toContainText('°');
    await page.keyboard.type('70'); await page.keyboard.press('Tab'); await page.keyboard.type('80');
    await shot(page, 'cmp2-11-ligne-saisie');
    await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
    await page.keyboard.press('Escape'); // une fois de trop : retour à Sélection, l'esquisse reste ouverte
    await expect(page.locator('#palette')).toBeVisible();
    await expect(page.locator('[data-tool=select]')).toHaveClass(/on/);
    const p = await page.evaluate(() => window.camlcadSketch.pts.at(-1));
    expect(p.x).toBeCloseTo(93.94, 1); expect(p.y).toBeCloseTo(-17.84, 1); // 80° depuis le côté vertical, pas depuis l'horizontale
    await expect(page.locator('#sketch-dims .dim', { hasText: '80°' })).toBeVisible();
    await expect(page.locator('#sketch-status')).toContainText('Entièrement contrainte');
    await shot(page, 'cmp2-11b-ligne');
  });
  await step('fig. 12 symétrie par l axe', async () => {
    await page.locator('[data-tool=poly]').click(); await humanSketch(page, 0, 0); await humanSketch(page, 100, 0); await page.keyboard.press('Escape');
    await page.locator('[data-tool=select]').click(); await humanSketch(page, 90, 0); await page.keyboard.press('x');
    await humanSketch(page, -10, 40); // clic dans le vide : sélection vidée
    // La ligne inclinée se clique au milieu : la cote d'angle n'est plus posée dessus.
    await page.keyboard.down('Shift'); await humanSketch(page, 60, -23.8); await humanSketch(page, 90, 0); await page.keyboard.up('Shift');
    await page.getByRole('button', { name: /Symétrie/ }).first().click();
    await expect(page.locator('#sketch-status')).not.toContainText('⚠');
    await shot(page, 'cmp2-12-symetrie');
  });
  await step('fig. 13 à 15 fermeture, oblong, ajuster', async () => {
    await page.locator('[data-tool=poly]').click(); await humanSketch(page, 93.94, -17.84); await humanSketch(page, 93.94, 17.84); await page.keyboard.press('Escape');
    await cmd(page, 'Oblong centre'); await humanSketch(page, 65, 0); await page.mouse.move(...await sketchPoint(page, 70, 0), { steps: 3 });
    await page.keyboard.type('8'); await page.keyboard.press('Tab'); await page.keyboard.type('15'); await page.keyboard.press('Enter');
    await shot(page, 'cmp2-14-oblong');
    await page.getByRole('button', { name: 'Ajuster' }).click(); await humanSketch(page, 25, 15); await humanSketch(page, 25, -15);
    await shot(page, 'cmp2-15-ajuste');
  });
  await step('fig. 16 Terminer puis E aussitôt, 10', async () => {
    await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click(); await page.keyboard.press('e');
    await expect(page.locator('#dialog')).toContainText('2 contours');
    await page.keyboard.type('10'); await shot(page, 'cmp2-16-extrusion'); await page.keyboard.press('Enter');
    await expect.poll(() => triangles(page)).toBeGreaterThan(0);
    await page.locator('#home').click(); await page.waitForTimeout(500); await shot(page, 'cmp2-16b-plaque');
  });
  await step('fig. 17 face du bout, esquisse à l endroit', async () => {
    const c = await page.locator('canvas').first().boundingBox();
    await page.mouse.move(c.x + c.width / 2, c.y + c.height * 0.75); await page.mouse.down();
    await page.mouse.move(c.x + c.width / 2 + 260, c.y + c.height * 0.75, { steps: 12 }); await page.mouse.up();
    await page.waitForTimeout(300);
    await humanClick(page, await worldPoint(page, [-25, -10, 5]));
    await shot(page, 'cmp2-17-face');
    await page.getByRole('button', { name: 'Esquisse' }).click();
    await expect(page.locator('#palette')).toBeVisible();
    // Face debout : le haut de l'esquisse est le haut du monde (pas une esquisse à l'envers).
    expect(await page.evaluate(() => window.camlcadSketch.plane.y.toArray().map((v) => Math.round(v) + 0))).toEqual([0, 0, 1]);
    // La fin d'esquisse demandée plus haut (Terminer puis E) ne referme pas celle-ci toute seule.
    await page.locator('[data-tool=rect]').click();
    await humanSketch(page, -30, 10); await page.mouse.move(...await sketchPoint(page, -20, 20), { steps: 3 });
    await page.keyboard.type('60'); await page.keyboard.press('Tab'); await page.keyboard.type('25'); await page.keyboard.press('Enter');
    await expect(page.locator('#palette')).toBeVisible();
  });
  await step('fig. 18 deux trous Ø10', async () => {
    await page.keyboard.press('f'); await page.waitForTimeout(300);
    for (const x of [-20, 20]) {
      await page.locator('[data-tool=circle]').click();
      await humanSketch(page, x, 22.5); await page.mouse.move(...await sketchPoint(page, x + 3, 22.5), { steps: 3 });
      await page.keyboard.type('10'); await page.keyboard.press('Enter');
    }
    await shot(page, 'cmp2-18-flasque-esquisse');
    await page.getByRole('button', { name: "Terminer l'esquisse" }).click();
  });
  await step('fig. 19 extrusion -5, région cliquée, jointe', async () => {
    await page.locator('#home').click(); await page.waitForTimeout(400);
    await page.keyboard.press('e');
    await expect(page.locator('#dialog')).toContainText('1 contour, 2 cercles');
    await humanClick(page, await worldPoint(page, [-25, 10, 32])); // la région, loin de la flèche
    await expect(page.locator('#gizmo-field')).toBeFocused(); // la frappe va encore à la distance
    await page.keyboard.type('-5'); await shot(page, 'cmp2-19a-extrusion');
    await page.keyboard.press('Enter');
    await expect(page.locator('#timeline .feat')).toHaveCount(2);
    await expect.poll(() => bbox(page)).toEqual([-25, 93.9, 0, 35]); // -5 : vers la pièce, comme dans le livre
    await page.waitForTimeout(500); await shot(page, 'cmp2-19-flasque');
  });
  await step('fig. 20-21 plan milieu', async () => {
    await page.locator('#home').click(); await page.waitForTimeout(400);
    await cmd(page, 'Plan milieu');
    await humanClick(page, await worldPoint(page, [0, -30, 5]));
    await page.locator('.cubeface', { hasText: 'Avant' }).click();
    for (let i = 0; i < 2; i++) { await page.waitForTimeout(500); await page.locator('#viewcube .cubearrow.left').click(); }
    await page.waitForTimeout(500);
    await humanClick(page, await worldPoint(page, [0, 30, 5]));
    await expect(page.locator('#tree .row', { hasText: 'Construction (1)' })).toBeVisible();
    await page.locator('#home').click(); await page.waitForTimeout(400);
    await shot(page, 'cmp2-21-milieu');
  });
  await step('fig. 22-24 nervure d une ligne jusqu à la pièce', async () => {
    await page.locator('#tree .row', { hasText: 'Construction (1)' }).locator('xpath=following-sibling::*[1]').click();
    await expect(page.locator('#palette')).toBeVisible();
    await page.waitForTimeout(500);
    await page.locator('[data-tool=poly]').click();
    for (const p of [[-20, 0, 35], [25, 0, 10]]) await humanClick(page, await worldPoint(page, p));
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.camlcadSketch.pts.map((p) => [p.x, p.y, p.fixed]))).toEqual([[-20, 35, true], [25, 10, true]]); // sommets de la pièce
    await shot(page, 'cmp2-22-ligne');
    await page.locator('#sketch-rib').click();
    await expect(page.locator('#dialog .drow', { hasText: 'Étendue' }).locator('select')).toHaveValue('plane');
    await expect(page.locator('#dialog .drow', { hasText: 'Épaisseur' }).locator('input')).toHaveValue('5');
    await shot(page, 'cmp2-23-nervure');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('#timeline .feat')).toHaveCount(3);
    expect(await code(page)).toContain('Profile.polygon [ Geom.V2.v (-20.) 35.; Geom.V2.v (-20.) 10.; Geom.V2.v 25. 10. ]'); // le triangle sous la ligne
    await page.locator('#home').click(); await page.waitForTimeout(600); await shot(page, 'cmp2-24-piece');
  });
  // Plaque (≈ 60,0) + flasque (60 × 25 − 2 trous Ø10) × 5 (6,71) + nervure 45 × 25 / 2 × 5 (2,81).
  await expect.poll(() => volume(page)).toBeCloseTo(69.5, 0);
});
