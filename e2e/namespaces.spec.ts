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

  // Create (with a description)
  await page.getByLabel('Namespace name').fill(ns);
  await page.getByLabel('Description (optional)', { exact: true }).fill('created by e2e');
  await page.getByRole('button', { name: 'Create namespace' }).click();
  await expect(page.getByRole('link', { name: ns, exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'created by e2e' })).toBeVisible();

  // Read (open detail)
  await page.getByRole('link', { name: ns, exact: true }).click();
  await expect(page.getByRole('heading', { name: ns })).toBeVisible();

  // Update (description). The page subheading reflects server-confirmed state,
  // so waiting on it (rather than on the field we just typed into) guarantees
  // the reload finished before the rename below.
  await page.getByLabel('Description (optional)', { exact: true }).fill('updated by e2e');
  await page.getByRole('button', { name: 'Save description' }).click();
  await expect(page.locator('p.sub')).toContainText('updated by e2e');

  // Update (rename) preserves the description
  await page.getByLabel('New name').fill(renamed);
  await page.getByRole('button', { name: 'Rename' }).click();
  await expect(page.getByRole('heading', { name: renamed })).toBeVisible();
  await expect(page.locator('p.sub')).toContainText('updated by e2e');

  // Delete, which now asks for confirmation first
  await page.getByRole('button', { name: `Delete namespace ${renamed}` }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('link', { name: renamed, exact: true })).toHaveCount(0);
});
