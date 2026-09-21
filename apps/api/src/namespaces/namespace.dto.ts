import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DESCRIPTION_MAX_LENGTH, RESOURCE_NAME_MAX_LENGTH } from '@okvns/shared';
import { IsOptional, IsString } from 'class-validator';

export class CreateNamespaceDto {
  @ApiProperty({
    maxLength: RESOURCE_NAME_MAX_LENGTH,
    pattern: '^[\\p{L}\\p{N}][\\p{L}\\p{N}._-]*$',
    example: 'billing',
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    maxLength: DESCRIPTION_MAX_LENGTH,
    description: 'Trimmed; blank means no description.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateNamespaceDto {
  @ApiPropertyOptional({
    maxLength: RESOURCE_NAME_MAX_LENGTH,
    description: 'Renames the namespace.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    maxLength: DESCRIPTION_MAX_LENGTH,
    description: 'A blank string clears the description.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
