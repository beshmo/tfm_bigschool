import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  ENTRY_VALUE_MAX_LENGTH,
  RESOURCE_NAME_MAX_LENGTH,
  RESOURCE_NAME_PATTERN,
} from '@okvns/shared';

export class CreateEntryDto {
  @ApiProperty({
    description: 'Entry name. Trimmed, non-empty UTF-8 resource name.',
    pattern: RESOURCE_NAME_PATTERN.source,
    minLength: 1,
    maxLength: RESOURCE_NAME_MAX_LENGTH,
    example: 'admin',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  @Matches(RESOURCE_NAME_PATTERN, { message: 'name must be a valid resource name' })
  name!: string;

  @ApiProperty({
    description: 'UTF-8 entry value.',
    maxLength: ENTRY_VALUE_MAX_LENGTH,
    example: 'secret',
  })
  @IsString()
  @MaxLength(ENTRY_VALUE_MAX_LENGTH)
  value!: string;
}

export class UpdateEntryDto {
  @ApiPropertyOptional({
    description: 'New entry name. Trimmed, non-empty UTF-8 resource name.',
    pattern: RESOURCE_NAME_PATTERN.source,
    minLength: 1,
    maxLength: RESOURCE_NAME_MAX_LENGTH,
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  @Matches(RESOURCE_NAME_PATTERN, { message: 'name must be a valid resource name' })
  name?: string;

  @ApiPropertyOptional({
    description: 'New UTF-8 entry value.',
    maxLength: ENTRY_VALUE_MAX_LENGTH,
    example: 'updated',
  })
  @IsOptional()
  @IsString()
  @MaxLength(ENTRY_VALUE_MAX_LENGTH)
  value?: string;
}
