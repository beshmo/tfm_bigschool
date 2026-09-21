import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateNamespaceUseCase,
  DeleteNamespaceUseCase,
  GetNamespaceUseCase,
  ListNamespacesUseCase,
  UpdateNamespaceUseCase,
} from '@okvns/application';
import type { NamespaceDto, PaginatedResultDto, NamespaceListItemDto } from '@okvns/shared';
import {
  ErrorResponseDto,
  NamespacePageResponseDto,
  NamespaceResponseDto,
} from '../common/api-schemas';
import { toNamespaceDto, toNamespaceListItemDto, toPageDto } from '../common/dto-mappers';
import { parseNamespaceListQuery } from '../common/list-query.dto';
import { CreateNamespaceDto, UpdateNamespaceDto } from './namespace.dto';

const NAME_PARAM = { name: 'name', description: 'Namespace name', example: 'billing' } as const;

@ApiTags('namespaces')
@Controller('namespaces')
export class NamespacesController {
  constructor(
    private readonly createNamespace: CreateNamespaceUseCase,
    private readonly listNamespaces: ListNamespacesUseCase,
    private readonly getNamespace: GetNamespaceUseCase,
    private readonly updateNamespace: UpdateNamespaceUseCase,
    private readonly deleteNamespace: DeleteNamespaceUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List namespaces as a page (no entries)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '1-based page, default 1.',
  })
  @ApiQuery({ name: 'page_size', required: false, enum: [10, 50, 100], description: 'Default 10.' })
  @ApiQuery({ name: 'sort', required: false, enum: ['name', 'created_at', 'modified_at'] })
  @ApiQuery({ name: 'direction', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Case-insensitive literal "contains" filter on the name.',
  })
  @ApiResponse({ status: 200, type: NamespacePageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid query parameter.', type: ErrorResponseDto })
  async list(
    @Query() query: Record<string, unknown>,
  ): Promise<PaginatedResultDto<NamespaceListItemDto>> {
    return toPageDto(
      await this.listNamespaces.execute(parseNamespaceListQuery(query)),
      toNamespaceListItemDto,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a namespace' })
  @ApiResponse({ status: 201, type: NamespaceResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Duplicate namespace.', type: ErrorResponseDto })
  async create(@Body() body: CreateNamespaceDto): Promise<NamespaceDto> {
    return toNamespaceDto(await this.createNamespace.execute(body));
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get a namespace with its entries' })
  @ApiParam(NAME_PARAM)
  @ApiResponse({ status: 200, type: NamespaceResponseDto })
  @ApiResponse({ status: 404, description: 'Namespace not found.', type: ErrorResponseDto })
  async get(@Param('name') name: string): Promise<NamespaceDto> {
    return toNamespaceDto(await this.getNamespace.execute(name));
  }

  @Put(':name')
  @ApiOperation({ summary: 'Rename a namespace and/or change its description' })
  @ApiParam(NAME_PARAM)
  @ApiResponse({ status: 200, type: NamespaceResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Namespace not found.', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Duplicate namespace.', type: ErrorResponseDto })
  async update(
    @Param('name') name: string,
    @Body() body: UpdateNamespaceDto,
  ): Promise<NamespaceDto> {
    return toNamespaceDto(await this.updateNamespace.execute(name, body));
  }

  @Delete(':name')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a namespace and all its entries' })
  @ApiParam(NAME_PARAM)
  @ApiResponse({ status: 204, description: 'Deleted.' })
  @ApiResponse({ status: 404, description: 'Namespace not found.', type: ErrorResponseDto })
  async remove(@Param('name') name: string): Promise<void> {
    await this.deleteNamespace.execute(name);
  }
}
