import { ApiProperty } from '@nestjs/swagger';
import { ENTRY_VALUE_MAX_LENGTH, RESOURCE_NAME_MAX_LENGTH } from '@okvns/shared';

/** Documented entry response body. */
export class EntryResponse {
  @ApiProperty({
    description: 'Entry name (unique within its namespace).',
    maxLength: RESOURCE_NAME_MAX_LENGTH,
    example: 'admin',
  })
  name!: string;

  @ApiProperty({
    description: 'UTF-8 entry value.',
    maxLength: ENTRY_VALUE_MAX_LENGTH,
    example: 'secret',
  })
  value!: string;
}
