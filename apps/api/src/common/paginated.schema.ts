import { ApiProperty } from '@nestjs/swagger';
import { PAGE_SIZES } from '@okvns/shared';

/**
 * Builds a documented paginated response schema for a given item type.
 *
 * Swagger cannot document a generic directly, so each list response extends a
 * class generated here. The generated class is renamed after its item type so
 * the OpenAPI document gets a distinct, readable schema name per list.
 */
export function PaginatedResponse<T>(ItemClass: new () => T): new () => {
  items: T[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
} {
  class PaginatedResponseClass {
    @ApiProperty({
      description: 'Items on the requested page. Shorter than page_size on the last page.',
      type: [ItemClass],
    })
    items!: T[];

    @ApiProperty({ description: 'The returned page, 1-based.', minimum: 1, example: 1 })
    page!: number;

    @ApiProperty({
      description: 'The page size this result was built with.',
      enum: PAGE_SIZES,
      example: 10,
    })
    page_size!: number;

    @ApiProperty({
      description: 'Total items matching the query across all pages, ignoring pagination.',
      minimum: 0,
      example: 42,
    })
    total_items!: number;

    @ApiProperty({
      description: 'Total pages available at this page size. Zero when nothing matched.',
      minimum: 0,
      example: 5,
    })
    total_pages!: number;
  }
  Object.defineProperty(PaginatedResponseClass, 'name', {
    value: `Paginated${ItemClass.name}`,
  });
  return PaginatedResponseClass;
}
