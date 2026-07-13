import { expect, test } from '@playwright/test';
import { cleanupE2eNamespaces } from './cleanup';

const ns = `e2e-entry-${Date.now()}`;

test.afterAll(async () => {
  await cleanupE2eNamespaces();
});

test('entry CRUD workflow within a namespace', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Namespace name').fill(ns);
  await page.getByRole('button', { name: 'Create namespace' }).click();
  await page.getByRole('link', { name: ns, exact: true }).click();
  await expect(page.getByRole('heading', { name: `Namespace: ${ns}` })).toBeVisible();

  // Create entry
  await page.getByLabel('Entry name').fill('admin');
  await page.getByLabel('Entry value').fill('secret');
  await page.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByLabel('Value for admin')).toHaveValue('secret');

  // Update entry value
  await page.getByLabel('Value for admin').fill('rotated');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByLabel('Value for admin')).toHaveValue('rotated');

  // Delete entry
  await page.getByRole('button', { name: 'Delete entry admin' }).click();
  await expect(page.getByLabel('Value for admin')).toHaveCount(0);
});
