import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DESCRIPTION_MAX_LENGTH,
  ENTRY_VALUE_MAX_LENGTH,
  RESOURCE_NAME_MAX_LENGTH,
} from '@okvns/shared';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateEntryDto {
  @ApiProperty({ maxLength: RESOURCE_NAME_MAX_LENGTH, example: 'currency' })
  @IsString()
  name!: string;

  @ApiProperty({ maxLength: ENTRY_VALUE_MAX_LENGTH, example: 'EUR' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({
    maxLength: DESCRIPTION_MAX_LENGTH,
    description: 'Trimmed; blank means no description.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false, description: 'Only booleans are accepted.' })
  @IsOptional()
  @IsBoolean()
  env_dependent?: boolean;
}

export class UpdateEntryDto {
  @ApiPropertyOptional({ maxLength: RESOURCE_NAME_MAX_LENGTH, description: 'Renames the entry.' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ maxLength: ENTRY_VALUE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    maxLength: DESCRIPTION_MAX_LENGTH,
    description: 'A blank string clears the description.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Send `false` to clear the marker.' })
  @IsOptional()
  @IsBoolean()
  env_dependent?: boolean;
}
