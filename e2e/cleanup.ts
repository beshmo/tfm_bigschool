import { request } from '@playwright/test';

interface NamespaceResponse {
  name: string;
}

const API_PORT = process.env.OKVNS_E2E_API_PORT ?? '3000';
const API_BASE_URL = process.env.OKVNS_E2E_API_BASE_URL ?? `http://127.0.0.1:${API_PORT}`;
const E2E_NAMESPACE_PREFIX = 'e2e-';

/**
 * Removes all E2E-owned namespaces from durable storage. This keeps local MySQL
 * and CI service-container runs from accumulating timestamped test data.
 */
export async function cleanupE2eNamespaces(): Promise<void> {
  const api = await request.newContext({ baseURL: API_BASE_URL });
  try {
    const response = await api.get('/namespaces');
    if (!response.ok()) {
      throw new Error(`Failed to list namespaces for E2E cleanup: HTTP ${response.status()}`);
    }

    const namespaces = (await response.json()) as NamespaceResponse[];
    const e2eNames = namespaces
      .map((namespace) => namespace.name)
      .filter((name) => name.startsWith(E2E_NAMESPACE_PREFIX));

    for (const name of e2eNames) {
      const deleteResponse = await api.delete(`/namespaces/${encodeURIComponent(name)}`);
      if (!deleteResponse.ok() && deleteResponse.status() !== 404) {
        throw new Error(
          `Failed to delete E2E namespace "${name}": HTTP ${deleteResponse.status()}`,
        );
      }
    }
  } finally {
    await api.dispose();
  }
}
