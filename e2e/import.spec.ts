import { expect, test } from '@playwright/test';

const nsA = `e2e-import-a-${Date.now()}`;
const nsB = `e2e-import-b-${Date.now()}`;
const nsFile = `e2e-import-file-${Date.now()}`;

test('import YAML containing multiple namespaces and entries', async ({ page }) => {
  const yaml = `namespaces:
  - name: ${nsA}
    entries:
      - name: admin
        value: secret
  - name: ${nsB}
    entries:
      - name: token
        value: abc`;

  await page.goto('/import');
  await page.getByLabel('YAML', { exact: true }).fill(yaml);
  await page.getByRole('button', { name: 'Import', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Imported namespaces' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: nsA })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: nsB })).toBeVisible();

  // Verify the imported namespaces are now listed on the home page.
  await page.getByRole('link', { name: 'Namespaces', exact: true }).click();
  await expect(page.getByRole('link', { name: nsA, exact: true })).toBeVisible();
});

test('import YAML from an uploaded file', async ({ page }) => {
  const yaml = `namespaces:
  - name: ${nsFile}
    entries:
      - name: key
        value: val`;

  await page.goto('/import');
  await page.getByLabel('YAML file', { exact: true }).setInputFiles({
    name: 'import.yaml',
    mimeType: 'application/x-yaml',
    buffer: Buffer.from(yaml, 'utf8'),
  });
  await page.getByRole('button', { name: 'Import file' }).click();

  await expect(page.getByRole('heading', { name: 'Imported namespaces' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: nsFile })).toBeVisible();

  // Verify the imported namespace is now listed on the home page.
  await page.getByRole('link', { name: 'Namespaces', exact: true }).click();
  await expect(page.getByRole('link', { name: nsFile, exact: true })).toBeVisible();
});
