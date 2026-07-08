import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  ENTRY_VALUE_MAX_LENGTH,
  RESOURCE_NAME_MAX_LENGTH,
  RESOURCE_NAME_PATTERN,
} from '@okvns/shared';

export class CreateEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  @Matches(RESOURCE_NAME_PATTERN, { message: 'name must be a valid resource name' })
  name!: string;

  @IsString()
  @MaxLength(ENTRY_VALUE_MAX_LENGTH)
  value!: string;
}

export class UpdateEntryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  @Matches(RESOURCE_NAME_PATTERN, { message: 'name must be a valid resource name' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(ENTRY_VALUE_MAX_LENGTH)
  value?: string;
}
