// Scénarios d'interface : la vraie UI (worker OCaml compilé, manifold-3d WASM),
// pilotée à la souris et au clavier comme un utilisateur. Voir README.md.
// Le site est servi depuis le disque par interception (fixtures.js) : pas de serveur.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.js/,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['list']],
  outputDir: 'results',
  globalSetup: './setup.js',
  use: {
    baseURL: 'http://camlcad.test',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
    actionTimeout: 15_000,
    screenshot: 'only-on-failure',
    launchOptions: process.env.CAMLCAD_CHROMIUM ? { executablePath: process.env.CAMLCAD_CHROMIUM } : {},
  },
});
