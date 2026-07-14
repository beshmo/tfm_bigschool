import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { REQUEST_BODY_MAX_BYTES } from '@okvns/shared';

export class YamlImportDto {
  @ApiPropertyOptional({
    description:
      'OKVNS YAML document to import. Alternative to a multipart `file` upload. ' +
      'Accepts the canonical `namespaces: [...]` shape or a single `namespace: {...}`. ' +
      'Optional `created_at`/`modified_at` metadata on namespaces or entries is ' +
      'accepted but ignored — imported resources are stamped by the target store.',
    maxLength: REQUEST_BODY_MAX_BYTES,
    example:
      'namespaces:\n  - name: users\n    entries:\n      - name: admin\n        value: secret\n',
  })
  @IsOptional()
  @IsString()
  @MaxLength(REQUEST_BODY_MAX_BYTES)
  yaml?: string;
}

/** Documented body for multipart YAML file upload (`multipart/form-data`). */
export class YamlImportFileDto {
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'OKVNS YAML file, decoded as UTF-8 text.',
  })
  file?: unknown;
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
