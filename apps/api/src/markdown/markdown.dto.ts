import { IsString, MaxLength, MinLength } from 'class-validator';
import { REQUEST_BODY_MAX_BYTES } from '@okvns/shared';

export class MarkdownImportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(REQUEST_BODY_MAX_BYTES)
  markdown!: string;
}
