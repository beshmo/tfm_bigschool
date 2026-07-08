import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright runs the E2E suite against the local admin frontend, which talks to
 * the local API. The admin build bakes in the default API base URL
 * (http://localhost:3000), so the API is served on port 3000 here.
 */
const ADMIN_WEB_PORT = Number(process.env.OKVNS_E2E_WEB_PORT ?? 4173);
const API_PORT = Number(process.env.OKVNS_E2E_API_PORT ?? 3000);
const ADMIN_WEB_URL = `http://127.0.0.1:${ADMIN_WEB_PORT}`;

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
      command: 'pnpm --filter @okvns/api run start:prod',
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { OKVNS_API_PORT: String(API_PORT) },
    },
    {
      command: 'pnpm --filter @okvns/admin-web run preview:e2e',
      port: ADMIN_WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
