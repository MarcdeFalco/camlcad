// Avant les scénarios : captures de la session précédente effacées.
import { rmSync, mkdirSync } from 'node:fs';
export default () => {
  const dir = new URL('./shots/', import.meta.url).pathname;
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
};
