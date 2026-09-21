import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DESCRIPTION_MAX_LENGTH, ERROR_CODES, PAGE_SIZES } from '@okvns/shared';

/** Classes used only to describe response bodies in the generated OpenAPI document. */

export class ErrorBodyDto {
  @ApiProperty({ enum: Object.values(ERROR_CODES), example: ERROR_CODES.VALIDATION_ERROR })
  code!: string;

  @ApiProperty({ example: 'Request validation failed.' })
  message!: string;

  @ApiPropertyOptional({ type: [String], description: 'Present only when there are items.' })
  details?: string[];
}

export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto })
  error!: ErrorBodyDto;
}

export class EntryResponseDto {
  @ApiProperty({ example: 'currency' })
  name!: string;

  @ApiProperty({ example: 'EUR' })
  value!: string;

  @ApiPropertyOptional({ maxLength: DESCRIPTION_MAX_LENGTH, example: 'Default currency' })
  description?: string;

  @ApiProperty({ description: 'Marks a value that is only valid in one environment.' })
  env_dependent!: boolean;

  @ApiProperty({ format: 'date-time', example: '2026-09-21T10:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ format: 'date-time', example: '2026-09-21T10:00:00.000Z' })
  modified_at!: string;
}

export class NamespaceListItemResponseDto {
  @ApiProperty({ example: 'billing' })
  name!: string;

  @ApiPropertyOptional({ maxLength: DESCRIPTION_MAX_LENGTH, example: 'Billing settings' })
  description?: string;

  @ApiProperty({ format: 'date-time', example: '2026-09-21T10:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ format: 'date-time', example: '2026-09-21T10:00:00.000Z' })
  modified_at!: string;
}

export class NamespaceResponseDto extends NamespaceListItemResponseDto {
  @ApiProperty({ type: [EntryResponseDto] })
  entries!: EntryResponseDto[];
}

class PageMetadataDto {
  @ApiProperty({ minimum: 1, example: 1 })
  page!: number;

  @ApiProperty({ enum: [...PAGE_SIZES], example: 10 })
  page_size!: number;

  @ApiProperty({ example: 42, description: 'Items matching the query across all pages.' })
  total_items!: number;

  @ApiProperty({ example: 5, description: '`0` when nothing matched.' })
  total_pages!: number;
}

export class NamespacePageResponseDto extends PageMetadataDto {
  @ApiProperty({ type: [NamespaceListItemResponseDto] })
  items!: NamespaceListItemResponseDto[];
}

export class EntryPageResponseDto extends PageMetadataDto {
  @ApiProperty({ type: [EntryResponseDto] })
  items!: EntryResponseDto[];
}

export class YamlImportResponseDto {
  @ApiProperty({ type: [NamespaceResponseDto] })
  namespaces!: NamespaceResponseDto[];
}

export class YamlExportResponseDto {
  @ApiProperty({ description: 'Raw canonical OKVNS YAML (no code fence).' })
  yaml!: string;
}

export class StatusResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;
}
