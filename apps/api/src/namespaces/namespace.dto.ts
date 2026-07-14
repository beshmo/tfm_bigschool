import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  DESCRIPTION_MAX_LENGTH,
  RESOURCE_NAME_MAX_LENGTH,
  RESOURCE_NAME_PATTERN,
} from '@okvns/shared';

export class NamespaceInputDto {
  @ApiProperty({
    description: 'Namespace name. Trimmed, non-empty UTF-8 resource name.',
    pattern: RESOURCE_NAME_PATTERN.source,
    minLength: 1,
    maxLength: RESOURCE_NAME_MAX_LENGTH,
    example: 'users',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  @Matches(RESOURCE_NAME_PATTERN, {
    message: 'name must be a valid resource name',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional human-facing description. Blank values are stored as no description.',
    maxLength: DESCRIPTION_MAX_LENGTH,
    example: 'Accounts for the admin console.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string;
}

/** Partial namespace update: a name, a description, or both. */
export class UpdateNamespaceDto {
  @ApiPropertyOptional({
    description: 'New namespace name. Trimmed, non-empty UTF-8 resource name.',
    pattern: RESOURCE_NAME_PATTERN.source,
    minLength: 1,
    maxLength: RESOURCE_NAME_MAX_LENGTH,
    example: 'people',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  @Matches(RESOURCE_NAME_PATTERN, {
    message: 'name must be a valid resource name',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'New human-facing description. A blank value clears the stored description.',
    maxLength: DESCRIPTION_MAX_LENGTH,
    example: 'Accounts for the admin console.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string;
}
