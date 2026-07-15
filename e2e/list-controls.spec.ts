import { expect, test } from '@playwright/test';
import { cleanupE2eNamespaces } from './cleanup';

/**
 * Exercises the API-backed list controls through the browser: page size,
 * ordering, and filtering for both the namespace list and a namespace's entry
 * list.
 *
 * Durable storage is shared across runs, so every assertion here works inside a
 * name filter scoped to this run's unique prefix — that keeps the visible list
 * independent of whatever else happens to be stored.
 */
const prefix = `e2e-list-${Date.now()}`;
const namespaceNames = [`${prefix}-a`, `${prefix}-b`, `${prefix}-c`];
const entriesNamespace = `${prefix}-entries`;

test.afterAll(async () => {
  await cleanupE2eNamespaces();
});

test('namespace list page size, ordering, and filtering', async ({ page }) => {
  await page.goto('/');

  for (const name of namespaceNames) {
    await page.getByLabel('Namespace name').fill(name);
    await page.getByRole('button', { name: 'Create namespace' }).click();
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  }

  // Filtering narrows the list to this run's namespaces via an API query.
  await page.getByLabel('Filter by name').fill(prefix);
  await expect(page.getByRole('link', { name: new RegExp(`^${prefix}`) })).toHaveCount(3);
  await expect(page.getByText(/Page 1 of 1 \(3 total\)/)).toBeVisible();

  // Ordering is applied by the API and reflected in the rendered order.
  await expect(page.getByRole('link', { name: new RegExp(`^${prefix}`) })).toHaveText(
    namespaceNames,
  );
  await page.getByLabel('Direction').selectOption('desc');
  await expect(page.getByRole('link', { name: new RegExp(`^${prefix}`) })).toHaveText(
    [...namespaceNames].reverse(),
  );
  await page.getByLabel('Direction').selectOption('asc');

  // Page size is selectable from the allowlisted choices and re-queries the API.
  await page.getByLabel('Per page').selectOption('50');
  await expect(page.getByText(/Page 1 of 1 \(3 total\)/)).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(`^${prefix}`) })).toHaveCount(3);

  // A filter matching nothing reports an empty result rather than an error.
  await page.getByLabel('Filter by name').fill(`${prefix}-nothing-matches`);
  await expect(page.getByText('No namespaces match the filter.')).toBeVisible();

  // Ordering by a timestamp field is offered and queried without error.
  await page.getByLabel('Filter by name').fill(prefix);
  await page.getByLabel('Order by').selectOption('created_at');
  await expect(page.getByRole('link', { name: new RegExp(`^${prefix}`) })).toHaveCount(3);

  for (const name of namespaceNames) {
    await page.getByLabel('Filter by name').fill(name);
    await page.getByRole('button', { name: `Delete namespace ${name}` }).click();
    await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0);
  }
});

test('entry list page size, ordering, and filtering', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Namespace name').fill(entriesNamespace);
  await page.getByRole('button', { name: 'Create namespace' }).click();
  await page.getByRole('link', { name: entriesNamespace, exact: true }).click();
  await expect(page.getByRole('heading', { name: `Namespace: ${entriesNamespace}` })).toBeVisible();

  const entries: Array<{ name: string; envDependent: boolean }> = [
    { name: 'db-host', envDependent: true },
    { name: 'db-port', envDependent: false },
    { name: 'retries', envDependent: false },
  ];
  for (const entry of entries) {
    await page.getByLabel('Entry name').fill(entry.name);
    await page.getByLabel('Entry value').fill('v');
    if (entry.envDependent) {
      await page.getByLabel('Environment-dependent', { exact: true }).check();
    }
    await page.getByRole('button', { name: 'Add entry' }).click();
    await expect(page.getByLabel(`Value for ${entry.name}`)).toBeVisible();
  }

  await expect(page.getByText(/Page 1 of 1 \(3 total\)/)).toBeVisible();

  // Filtering by name is applied by the API.
  await page.getByLabel('Filter by name').fill('db');
  await expect(page.getByLabel('Value for db-host')).toBeVisible();
  await expect(page.getByLabel('Value for retries')).toHaveCount(0);
  await expect(page.getByText(/Page 1 of 1 \(2 total\)/)).toBeVisible();
  await page.getByLabel('Filter by name').fill('');

  // The environment-dependence filter requests an API-filtered entry list.
  await page.getByLabel('Show only environment-dependent entries').check();
  await expect(page.getByLabel('Value for db-host')).toBeVisible();
  await expect(page.getByLabel('Value for db-port')).toHaveCount(0);
  await expect(page.getByText(/Page 1 of 1 \(1 total\)/)).toBeVisible();
  await page.getByLabel('Show only environment-dependent entries').uncheck();

  // Ordering by environment-dependence puts independent entries first ascending.
  await page.getByLabel('Order by').selectOption('env_dependent');
  await expect(page.getByRole('textbox', { name: /^Value for/ })).toHaveCount(3);
  await page.getByLabel('Direction').selectOption('desc');
  await expect(page.getByLabel('Value for db-host')).toBeVisible();

  // Page size is selectable from the allowlisted choices.
  await page.getByLabel('Per page').selectOption('100');
  await expect(page.getByText(/Page 1 of 1 \(3 total\)/)).toBeVisible();

  await page.getByRole('button', { name: `Delete namespace ${entriesNamespace}` }).click();
  await expect(page.getByRole('heading', { name: 'Namespaces' })).toBeVisible();
});
