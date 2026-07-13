import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { RESOURCE_NAME_MAX_LENGTH, RESOURCE_NAME_PATTERN } from '@okvns/shared';

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
}
