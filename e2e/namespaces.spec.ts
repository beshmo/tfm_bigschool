import { expect, test } from '@playwright/test';
import { cleanupE2eNamespaces } from './cleanup';

// Unique per run so the shared durable API state does not collide.
const ns = `e2e-ns-${Date.now()}`;
const renamed = `${ns}-renamed`;

test.afterAll(async () => {
  await cleanupE2eNamespaces();
});

test('namespace CRUD workflow', async ({ page }) => {
  await page.goto('/');

  // Create
  await page.getByLabel('Namespace name').fill(ns);
  await page.getByRole('button', { name: 'Create namespace' }).click();
  await expect(page.getByRole('link', { name: ns, exact: true })).toBeVisible();

  // Read (open detail)
  await page.getByRole('link', { name: ns, exact: true }).click();
  await expect(page.getByRole('heading', { name: `Namespace: ${ns}` })).toBeVisible();

  // Update (rename)
  await page.getByLabel('New name').fill(renamed);
  await page.getByRole('button', { name: 'Rename' }).click();
  await expect(page.getByRole('heading', { name: `Namespace: ${renamed}` })).toBeVisible();

  // Delete
  await page.getByRole('button', { name: `Delete namespace ${renamed}` }).click();
  await expect(page.getByRole('link', { name: renamed, exact: true })).toHaveCount(0);
});
