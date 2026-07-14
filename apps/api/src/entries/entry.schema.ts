import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DESCRIPTION_MAX_LENGTH,
  ENTRY_VALUE_MAX_LENGTH,
  RESOURCE_NAME_MAX_LENGTH,
} from '@okvns/shared';

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

  @ApiPropertyOptional({
    description: 'Human-facing description. Omitted when the entry has none.',
    maxLength: DESCRIPTION_MAX_LENGTH,
    example: 'API key used by the admin console.',
  })
  description?: string;

  @ApiProperty({
    description: 'When the entry was first created.',
    format: 'date-time',
    example: '2026-01-01T00:00:00.000Z',
  })
  created_at!: string;

  @ApiProperty({
    description: 'When the entry was last modified.',
    format: 'date-time',
    example: '2026-01-02T00:00:00.000Z',
  })
  modified_at!: string;
}
