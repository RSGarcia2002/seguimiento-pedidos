import { defineConfig } from '@playwright/test';

/** Prueba la compilación de producción con una base separada de los datos de desarrollo. */
export default defineConfig({
  testDir: './pruebas/interfaz',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    channel: process.env['PLAYWRIGHT_CHANNEL'] || undefined,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm start -w @pedidos/api',
    url: 'http://127.0.0.1:3100/api/salud',
    reuseExistingServer: false,
    env: { PORT: '3100', MONGODB_URI: 'mongodb://127.0.0.1:27019/seguimiento_e2e' },
    timeout: 30000,
  },
});
