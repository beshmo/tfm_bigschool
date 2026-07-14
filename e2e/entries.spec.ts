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

  // Create entry (with a description)
  await page.getByLabel('Entry name').fill('admin');
  await page.getByLabel('Entry value').fill('secret');
  await page.getByLabel('Entry description (optional)').fill('the admin key');
  await page.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByLabel('Value for admin')).toHaveValue('secret');
  await expect(page.getByLabel('Description for admin')).toHaveValue('the admin key');

  // Update entry value, preserving the description. `Save` is exact so it does
  // not also match the namespace's "Save description" button.
  await page.getByLabel('Value for admin').fill('rotated');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByLabel('Value for admin')).toHaveValue('rotated');
  await expect(page.getByLabel('Description for admin')).toHaveValue('the admin key');

  // Update entry description. Reload first so the save above has fully settled:
  // its reload() remounts the entry list, which would otherwise discard text
  // typed into the (uncontrolled) description field. This also proves the
  // description survived a fresh page load.
  await page.reload();
  await expect(page.getByLabel('Description for admin')).toHaveValue('the admin key');
  await page.getByLabel('Description for admin').fill('rotated admin key');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('p', { hasText: 'rotated admin key' })).toBeVisible();
  await expect(page.getByLabel('Value for admin')).toHaveValue('rotated');

  // Delete entry
  await page.getByRole('button', { name: 'Delete entry admin' }).click();
  await expect(page.getByLabel('Value for admin')).toHaveCount(0);
});
