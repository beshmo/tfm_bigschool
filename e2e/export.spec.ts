import { expect, test } from '@playwright/test';
import { cleanupE2eNamespaces } from './cleanup';

const nsA = `e2e-export-a-${Date.now()}`;
const nsB = `e2e-export-b-${Date.now()}`;

test.afterAll(async () => {
  await cleanupE2eNamespaces();
});

test('export YAML for all namespaces and for a selected namespace', async ({ page }) => {
  // Seed two namespaces; only the first carries a description.
  await page.goto('/');
  await page.getByLabel('Namespace name').fill(nsA);
  await page.getByLabel('Description (optional)', { exact: true }).fill('exported description a');
  await page.getByRole('button', { name: 'Create namespace' }).click();
  await expect(page.getByRole('link', { name: nsA, exact: true })).toBeVisible();

  await page.getByLabel('Namespace name').fill(nsB);
  await page.getByRole('button', { name: 'Create namespace' }).click();
  await expect(page.getByRole('link', { name: nsB, exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Export', exact: true }).click();

  // Export all
  await page.getByRole('button', { name: 'Export all namespaces' }).click();
  const all = page.getByLabel('Exported YAML');
  await expect(all).toContainText(nsA);
  await expect(all).toContainText(nsB);
  await expect(all).toContainText('description: exported description a');

  // Export a selected namespace only
  await page.getByLabel('Namespace', { exact: true }).selectOption(nsA);
  await page.getByRole('button', { name: 'Export selected namespace' }).click();
  const one = page.getByLabel('Exported YAML');
  await expect(one).toContainText(nsA);
  await expect(one).not.toContainText(nsB);
  await expect(one).toContainText('description: exported description a');
});
