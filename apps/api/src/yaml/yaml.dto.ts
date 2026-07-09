import { IsOptional, IsString, MaxLength } from 'class-validator';
import { REQUEST_BODY_MAX_BYTES } from '@okvns/shared';

export class YamlImportDto {
  @IsOptional()
  @IsString()
  @MaxLength(REQUEST_BODY_MAX_BYTES)
  yaml?: string;
}

/**
 * Minimal shape of a Multer memory-storage upload. Declared locally so the API
 * does not depend on `@types/multer`; only the fields the controller reads are
 * described.
 */
export interface UploadedYamlFile {
  buffer: Buffer;
  size: number;
}
