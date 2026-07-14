import { ApiProperty } from '@nestjs/swagger';
import { RESOURCE_NAME_MAX_LENGTH } from '@okvns/shared';
import { EntryResponse } from '../entries/entry.schema';

/** Documented namespace response body, including its entries. */
export class NamespaceResponse {
  @ApiProperty({
    description: 'Namespace name (unique across the store).',
    maxLength: RESOURCE_NAME_MAX_LENGTH,
    example: 'users',
  })
  name!: string;

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
