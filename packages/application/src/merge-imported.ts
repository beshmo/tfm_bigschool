import { Namespace } from '@okvns/domain';

/**
 * Upsert rule for YAML import: an existing namespace keeps its identity and
 * timestamps but has its entries fully replaced; its description is replaced
 * only when the import supplies one.
 */
export function mergeImported(previous: Namespace | undefined, incoming: Namespace): Namespace {
  if (!previous) {
    return incoming;
  }
  return Namespace.create({
    name: previous.name,
    description: incoming.description ?? previous.description,
    entries: incoming.entries,
    createdAt: previous.createdAt,
    modifiedAt: previous.modifiedAt,
  });
}
