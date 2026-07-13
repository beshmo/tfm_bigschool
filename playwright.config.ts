import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright runs the E2E suite against the local admin frontend, which talks to
 * the local API. The admin build bakes in the default API base URL
 * (http://localhost:3000), so the API is served on port 3000 here.
 */
const ADMIN_WEB_PORT = Number(process.env.OKVNS_E2E_WEB_PORT ?? 4173);
const API_PORT = Number(process.env.OKVNS_E2E_API_PORT ?? 3000);
const ADMIN_WEB_URL = `http://127.0.0.1:${ADMIN_WEB_PORT}`;
const apiEnv = {
  OKVNS_API_PORT: String(API_PORT),
  OKVNS_STORAGE_DRIVER: 'mysql',
  OKVNS_MYSQL_HOST: process.env.OKVNS_E2E_MYSQL_HOST ?? process.env.OKVNS_MYSQL_HOST ?? '127.0.0.1',
  OKVNS_MYSQL_PORT: process.env.OKVNS_E2E_MYSQL_PORT ?? process.env.OKVNS_MYSQL_PORT ?? '3306',
  OKVNS_MYSQL_DATABASE:
    process.env.OKVNS_E2E_MYSQL_DATABASE ?? process.env.OKVNS_MYSQL_DATABASE ?? 'okvns',
  OKVNS_MYSQL_USER: process.env.OKVNS_E2E_MYSQL_USER ?? process.env.OKVNS_MYSQL_USER ?? 'okvns',
  OKVNS_MYSQL_PASSWORD:
    process.env.OKVNS_E2E_MYSQL_PASSWORD ?? process.env.OKVNS_MYSQL_PASSWORD ?? 'okvns',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: ADMIN_WEB_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @okvns/api run migrate && pnpm --filter @okvns/api run start:prod',
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: apiEnv,
    },
    {
      command: 'pnpm --filter @okvns/admin-web run preview:e2e',
      port: ADMIN_WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
