// Tutoriel (Black Book ch. 6, Parameters) : un débutant crée ses paramètres avec des noms
// ordinaires (« Largeur », « Épaisseur totale »), se trompe (« type », doublon) sans casser
// le document, voit qu'un paramètre n'agit sur rien tant qu'il n'est pas lié, le lie à une
// cote d'esquisse et à la hauteur d'extrusion (ƒx), puis le change : la pièce suit en direct, puis dans le code.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code } from './lib.js';

const size = (page) => page.evaluate(() => { const g = window.camlcadView.part?.geometry; if (!g) return null; g.computeBoundingBox(); const s = g.boundingBox.getSize(g.boundingBox.min.clone()); return [Math.round(s.x), Math.round(s.y), Math.round(s.z)]; });
async function addParam(page, name, value) {
  await page.locator('#param-new-name').fill(name);
  await page.locator('#param-new-value').fill(String(value));
  await page.getByRole('button', { name: '+ Ajouter' }).click();
}

test('paramètres d’un débutant', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Paramètres' }).click();
  // Nom avec majuscule : ramené à « largeur » ; le dialogue se rouvre avec lui.
  await addParam(page, 'Largeur', 40);
  await expect(page.locator('#dialog .prow .pname', { hasText: 'largeur' })).toBeVisible();
  expect(await code(page)).toContain('let%param largeur = 40.');
  // Accents et espace : « epaisseur_totale ».
  await addParam(page, 'Épaisseur totale', 6);
  await expect(page.locator('#dialog .prow .pname', { hasText: 'epaisseur_totale' })).toBeVisible();
  // Pas encore utilisés : le dialogue le dit et dit comment les lier.
  await expect(page.locator('#dialog .punused')).toContainText('epaisseur_totale, largeur');
  // Erreurs : mot réservé, doublon ; message dans le dialogue, document intact.
  const before = await code(page);
  await addParam(page, 'type', 3);
  await expect(page.locator('#param-error')).toContainText('mot réservé');
  await addParam(page, 'largeur', 3);
  await expect(page.locator('#param-error')).toContainText('déjà');
  expect(await code(page)).toBe(before);
  await expect(page.locator('#status')).not.toContainText('erreur');
  await shot(page, '220-parametres-erreurs');
  await page.getByRole('button', { name: 'OK' }).click();

  // Rectangle dont la largeur est le paramètre, extrudé de l'épaisseur.
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -25, -10); await clickSketch(page, 5, 10);
  await page.locator('[data-tool=dim]').click();
  await clickSketch(page, -10, -10);
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('largeur'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim.fx')).toHaveCount(1);
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => size(page)).toEqual([40, 20, 5]);
  // La hauteur d'extrusion se lie au paramètre existant (ƒx, nom proposé dans la liste).
  await page.locator('#timeline .feat', { hasText: 'extrusion' }).dblclick();
  const lit = page.locator('#dialog .lit', { hasText: '5' }).first();
  await lit.getByRole('button', { name: 'ƒx' }).click();
  await lit.locator('.promote input').fill('epaisseur_totale');
  await lit.getByRole('button', { name: 'créer' }).click();
  await expect.poll(() => code(page)).toMatch(/extrude ~h:epaisseur_totale /);
  await expect.poll(() => size(page)).toEqual([40, 20, 6]);
  await expect(page.locator('#tree .row', { hasText: 'epaisseur_totale' })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();

  // Le paramètre change : aperçu direct, puis écrit dans le code à OK.
  await page.getByRole('button', { name: 'Paramètres' }).click();
  await expect(page.locator('#dialog .punused')).toHaveCount(0); // tous liés
  await expect(page.locator('#dialog .prow.unused')).toHaveCount(0);
  await page.locator('#dialog .prow', { hasText: 'largeur' }).locator('input[type=number]').fill('60');
  await expect.poll(() => size(page)).toEqual([60, 20, 6]);
  await shot(page, '221-parametre-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toContain('let%param largeur = 60.');
  await expect.poll(() => size(page)).toEqual([60, 20, 6]);
});
