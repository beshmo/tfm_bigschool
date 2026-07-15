import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DESCRIPTION_MAX_LENGTH, RESOURCE_NAME_MAX_LENGTH } from '@okvns/shared';
import { PaginatedResponse } from '../common/paginated.schema';
import { EntryResponse } from '../entries/entry.schema';

/** Documented namespace response body, including its entries. */
export class NamespaceResponse {
  @ApiProperty({
    description: 'Namespace name (unique across the store).',
    maxLength: RESOURCE_NAME_MAX_LENGTH,
    example: 'users',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Human-facing description. Omitted when the namespace has none.',
    maxLength: DESCRIPTION_MAX_LENGTH,
    example: 'Accounts for the admin console.',
  })
  description?: string;

  @ApiProperty({
    description: 'Entries contained in the namespace, ordered by name.',
    type: [EntryResponse],
  })
  entries!: EntryResponse[];

  @ApiProperty({
    description: 'When the namespace was first created.',
    format: 'date-time',
    example: '2026-01-01T00:00:00.000Z',
  })
  created_at!: string;

  @ApiProperty({
    description:
      'When the namespace last changed — the most recent namespace-level change ' +
      'or entry mutation inside it (aggregate freshness).',
    format: 'date-time',
    example: '2026-01-02T00:00:00.000Z',
  })
  modified_at!: string;
}

/**
 * Documented namespace item in a paginated list. Carries no entries: a page of
 * namespaces would otherwise include every entry of every namespace on it. Read
 * a namespace's entries from `GET /namespaces/{namespace}/entries`, or the whole
 * namespace from `GET /namespaces/{name}`.
 */
export class NamespaceListItemResponse {
  @ApiProperty({
    description: 'Namespace name (unique across the store).',
    maxLength: RESOURCE_NAME_MAX_LENGTH,
    example: 'users',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Human-facing description. Omitted when the namespace has none.',
    maxLength: DESCRIPTION_MAX_LENGTH,
    example: 'Accounts for the admin console.',
  })
  description?: string;

  @ApiProperty({
    description: 'When the namespace was first created.',
    format: 'date-time',
    example: '2026-01-01T00:00:00.000Z',
  })
  created_at!: string;

  @ApiProperty({
    description: 'When the namespace or any entry inside it last changed.',
    format: 'date-time',
    example: '2026-01-02T00:00:00.000Z',
  })
  modified_at!: string;
}

/** Documented paginated namespace list response body. */
export class PaginatedNamespaceListResponse extends PaginatedResponse(NamespaceListItemResponse) {}
