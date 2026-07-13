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
}
