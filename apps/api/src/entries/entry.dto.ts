import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  DESCRIPTION_MAX_LENGTH,
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

  @ApiPropertyOptional({
    description: 'Optional human-facing description. Blank values are stored as no description.',
    maxLength: DESCRIPTION_MAX_LENGTH,
    example: 'API key used by the admin console.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Marks a value as specific to one deployment environment, so it can be found and reviewed after being imported elsewhere. Omitted means false.',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  env_dependent?: boolean;
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

  @ApiPropertyOptional({
    description: 'New human-facing description. A blank value clears the stored description.',
    maxLength: DESCRIPTION_MAX_LENGTH,
    example: 'API key used by the admin console.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({
    description:
      'New environment-dependence marker. Omitting the field keeps the stored value; false clears the marker.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  env_dependent?: boolean;
}
