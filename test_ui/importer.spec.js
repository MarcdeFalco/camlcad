// Black Book, chapitre 1 (Insert Mesh) : un STL binaire (pavé 30 × 20 × 10) choisi au
// sélecteur de fichiers devient un corps : Shape.of_mesh (Cad_export.Stl.of_file …), volume ;
// après rechargement de la page, le fichier gardé est redonné au worker et le corps revient.
import { test, expect } from './fixtures.js';
import { open, code, triangles, cmd, shot } from './lib.js';
import { writeFile } from 'node:fs/promises';

// STL binaire d'un pavé : 8 sommets, 12 triangles orientés vers l'extérieur.
function boxStl(a, b, c) {
  const v = [[0, 0, 0], [a, 0, 0], [a, b, 0], [0, b, 0], [0, 0, c], [a, 0, c], [a, b, c], [0, b, c]];
  const t = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
  const buf = Buffer.alloc(84 + 50 * t.length);
  buf.write('pave de test', 0); buf.writeUInt32LE(t.length, 80);
  t.forEach((tri, k) => tri.forEach((i, j) => v[i].forEach((x, d) => buf.writeFloatLE(x, 84 + 50 * k + 12 + 12 * j + 4 * d))));
  return buf;
}

test('insérer un STL', async ({ page }, info) => {
  await open(page, 'nouveau');
  const file = info.outputPath('Pave Test.stl');
  await writeFile(file, boxStl(30, 20, 10));
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), cmd(page, 'Insérer STL')]);
  await chooser.setFiles(file);
  await expect.poll(() => triangles(page)).toBe(12);
  expect(await code(page)).toContain('Shape.of_mesh (Cad_export.Stl.of_file "pave_test.stl")');
  await cmd(page, 'Propriétés');
  await expect(page.locator('#props-volume')).toHaveText('6 cm³');
  await page.getByRole('button', { name: 'Fermer' }).click();
  await shot(page, '184-import-stl');
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.locator('#notice')).toContainText('repris');
  await expect.poll(() => triangles(page)).toBe(12);
});
