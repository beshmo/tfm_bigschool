import { request } from '@playwright/test';

interface NamespaceListItemResponse {
  name: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total_pages: number;
}

const API_PORT = process.env.OKVNS_E2E_API_PORT ?? '3000';
const API_BASE_URL = process.env.OKVNS_E2E_API_BASE_URL ?? `http://127.0.0.1:${API_PORT}`;
const E2E_NAMESPACE_PREFIX = 'e2e-';
/** Largest page the list endpoint serves; drains the list in few requests. */
const MAX_PAGE_SIZE = 100;

/**
 * Removes all E2E-owned namespaces from durable storage. This keeps local MySQL
 * and CI service-container runs from accumulating timestamped test data.
 *
 * The namespace list is paginated, so this walks every page — cleaning only the
 * first page would silently leave test data behind once a run creates more
 * namespaces than fit on one.
 */
export async function cleanupE2eNamespaces(): Promise<void> {
  const api = await request.newContext({ baseURL: API_BASE_URL });
  try {
    const e2eNames: string[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const response = await api.get('/namespaces', {
        params: { page, page_size: MAX_PAGE_SIZE, name: E2E_NAMESPACE_PREFIX },
      });
      if (!response.ok()) {
        throw new Error(`Failed to list namespaces for E2E cleanup: HTTP ${response.status()}`);
      }
      const body = (await response.json()) as PaginatedResponse<NamespaceListItemResponse>;
      // The API filters by a "contains" match, so re-check the prefix here.
      e2eNames.push(
        ...body.items
          .map((namespace) => namespace.name)
          .filter((name) => name.startsWith(E2E_NAMESPACE_PREFIX)),
      );
      totalPages = body.total_pages;
      page += 1;
    } while (page <= totalPages);

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
