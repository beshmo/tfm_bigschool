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
  await expect(page.getByRole('heading', { name: ns })).toBeVisible();

  // Create entry (with a description)
  await page.getByLabel('Entry name').fill('admin');
  await page.getByLabel('Entry value').fill('secret');
  await page.getByLabel('Entry description (optional)').fill('the admin key');
  await page.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByRole('cell', { name: 'secret' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'the admin key' })).toBeVisible();

  // Update the entry's value through the edit dialog, preserving its description.
  await page.getByRole('button', { name: 'Edit entry admin' }).click();
  await page.getByLabel('Value for admin').fill('rotated');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'rotated', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'the admin key' })).toBeVisible();

  // Update the entry's description. Reload first to prove the value above
  // survived a fresh page load rather than only living in client state.
  await page.reload();
  await expect(page.getByRole('cell', { name: 'rotated', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit entry admin' }).click();
  await page.getByLabel('Description for admin').fill('rotated admin key');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'rotated admin key' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'rotated', exact: true })).toBeVisible();

  // Delete entry, confirming the destructive dialog
  await page.getByRole('button', { name: 'Delete entry admin' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('button', { name: 'Edit entry admin' })).toHaveCount(0);
});
