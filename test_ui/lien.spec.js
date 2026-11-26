// Black Book, chapitre 7 (Motion Link) : deux bras sur deux pivots ; un lien de mouvement de
// rapport −1 fait tourner le second en sens inverse quand on pilote le premier.
import { test, expect } from './fixtures.js';
import { open, shot, code } from './lib.js';

const SRC = `open Cad
open Geom
open Cad_mech

let model : Assembly.t Doc.t =
  let bati = Part.make ~ports:[ ("p1", Frame.at (-20.) 0. 5.); ("p2", Frame.at 20. 0. 5.) ] "bati" Shape.(cube ~center:true (V3.v 70. 30. 10.)) in
  let bras n c = Part.make ~color:c ~ports:[ ("axe", Frame.at 0. 0. 0.) ] n Shape.(cube (V3.v 15. 4. 3.) |> translate (V3.v 0. (-2.) 0.)) in
  let b1 = bras "bras1" (220, 120, 40) and b2 = bras "bras2" (60, 130, 210) in
  Doc.return
    (Assembly.make ~ground:bati
       [ Joint.revolute ~name:"j1" Part.(bati @: "p1") Part.(b1 @: "axe");
         Joint.revolute ~name:"j2" Part.(bati @: "p2") Part.(b2 @: "axe") ])
`;

test('lien de mouvement', async ({ page }) => {
  await open(page, 'nouveau');
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(SRC);
  await expect(page.locator('#status')).toContainText('3 pièces');
  await page.getByRole('button', { name: 'MÉCANISME' }).click();
  await page.getByRole('button', { name: 'Lien' }).click();
  const field = (label) => page.locator('#dialog .drow', { hasText: label }).locator('select, input').first();
  await field('Menante').selectOption('j1'); await field('Menée').selectOption('j2');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toContain('~couplings:[ { driver = "j1"; driven = "j2"; ratio = (-1.) } ]');
  await expect(page.locator('#status')).toContainText('3 pièces');
  await page.getByRole('button', { name: 'Mouvement' }).click();
  const s1 = page.locator('#dialog input[type=range][data-name=j1]'), s2 = page.locator('#dialog input[type=range][data-name=j2]');
  const sb = await s1.boundingBox();
  await s1.click({ position: { x: sb.width * 0.75, y: sb.height / 2 } });
  await expect.poll(async () => Number(await s1.inputValue())).toBeGreaterThan(80);
  const v1 = Number(await s1.inputValue());
  await expect.poll(async () => Math.round(Number(await s2.inputValue()))).toBe(Math.round(-v1));
  await shot(page, '124-lien-mouvement');
});
