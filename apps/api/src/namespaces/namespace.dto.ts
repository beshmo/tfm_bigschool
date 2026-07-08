import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { RESOURCE_NAME_MAX_LENGTH, RESOURCE_NAME_PATTERN } from '@okvns/shared';

export class NamespaceInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  @Matches(RESOURCE_NAME_PATTERN, {
    message: 'name must be a valid resource name',
  })
  name!: string;
}
