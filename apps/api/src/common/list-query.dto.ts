import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_FIELD,
  ENTRY_SORT_FIELDS,
  NAMESPACE_SORT_FIELDS,
  PAGE_SIZES,
  RESOURCE_NAME_MAX_LENGTH,
  SORT_DIRECTIONS,
  type EntryListQuery,
  type EntrySortField,
  type NamespaceListQuery,
  type NamespaceSortField,
  type PageSize,
  type SortDirection,
} from '@okvns/shared';

/**
 * Query parameters shared by the namespace and entry list endpoints.
 *
 * Every field is validated against an allowlist here, at the boundary, because
 * the repositories map the sort field and direction straight onto fixed SQL
 * fragments. Unsupported values are rejected before any list query runs.
 *
 * The name filter is deliberately *not* checked against `RESOURCE_NAME_PATTERN`:
 * it matches a substring of a name, and a substring of a valid name need not
 * itself be a valid name.
 */
export abstract class ListQueryDto {
  @ApiPropertyOptional({
    description: 'Page to return, 1-based.',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page.',
    enum: PAGE_SIZES,
    default: DEFAULT_PAGE_SIZE,
    example: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn(PAGE_SIZES, { message: `page_size must be one of: ${PAGE_SIZES.join(', ')}` })
  page_size: PageSize = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({
    description: 'Sort direction.',
    enum: SORT_DIRECTIONS,
    default: DEFAULT_SORT_DIRECTION,
    example: DEFAULT_SORT_DIRECTION,
  })
  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  direction: SortDirection = DEFAULT_SORT_DIRECTION;

  @ApiPropertyOptional({
    description: 'Case-insensitive "contains" filter on the name. Omit for all items.',
    maxLength: RESOURCE_NAME_MAX_LENGTH,
    example: 'user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  name?: string;
}

export class NamespaceListQueryDto extends ListQueryDto implements NamespaceListQuery {
  @ApiPropertyOptional({
    description: 'Field to order namespaces by.',
    enum: NAMESPACE_SORT_FIELDS,
    default: DEFAULT_SORT_FIELD,
    example: DEFAULT_SORT_FIELD,
  })
  @IsOptional()
  @IsIn(NAMESPACE_SORT_FIELDS)
  sort: NamespaceSortField = DEFAULT_SORT_FIELD;
}

export class EntryListQueryDto extends ListQueryDto implements EntryListQuery {
  @ApiPropertyOptional({
    description: 'Field to order entries by.',
    enum: ENTRY_SORT_FIELDS,
    default: DEFAULT_SORT_FIELD,
    example: DEFAULT_SORT_FIELD,
  })
  @IsOptional()
  @IsIn(ENTRY_SORT_FIELDS)
  sort: EntrySortField = DEFAULT_SORT_FIELD;

  @ApiPropertyOptional({
    description:
      'Restricts to entries with this environment-dependence marker. Omit for all entries.',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  // Query values arrive as strings, so only the two literals map to booleans;
  // anything else passes through unchanged for @IsBoolean to reject, rather
  // than being coerced into a silently wrong filter.
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  env_dependent?: boolean;
}
