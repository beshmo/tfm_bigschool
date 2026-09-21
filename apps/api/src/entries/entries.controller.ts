import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateEntryUseCase,
  DeleteEntryUseCase,
  GetEntryUseCase,
  ListEntriesUseCase,
  UpdateEntryUseCase,
} from '@okvns/application';
import type { EntryDto, PaginatedResultDto } from '@okvns/shared';
import { EntryPageResponseDto, EntryResponseDto, ErrorResponseDto } from '../common/api-schemas';
import { toEntryDto, toPageDto } from '../common/dto-mappers';
import { parseEntryListQuery } from '../common/list-query.dto';
import { CreateEntryDto, UpdateEntryDto } from './entry.dto';

const NAMESPACE_PARAM = {
  name: 'name',
  description: 'Namespace name',
  example: 'billing',
} as const;
const ENTRY_PARAM = { name: 'entry', description: 'Entry name', example: 'currency' } as const;

@ApiTags('entries')
@Controller('namespaces/:name/entries')
export class EntriesController {
  constructor(
    private readonly createEntry: CreateEntryUseCase,
    private readonly listEntries: ListEntriesUseCase,
    private readonly getEntry: GetEntryUseCase,
    private readonly updateEntry: UpdateEntryUseCase,
    private readonly deleteEntry: DeleteEntryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List a namespace’s entries as a page' })
  @ApiParam(NAMESPACE_PARAM)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '1-based page, default 1.',
  })
  @ApiQuery({ name: 'page_size', required: false, enum: [10, 50, 100], description: 'Default 10.' })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['name', 'created_at', 'modified_at', 'env_dependent'],
  })
  @ApiQuery({ name: 'direction', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Case-insensitive literal "contains" filter on the name.',
  })
  @ApiQuery({
    name: 'env_dependent',
    required: false,
    type: Boolean,
    description: 'Return only entries whose marker matches; omit for all.',
  })
  @ApiResponse({ status: 200, type: EntryPageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid query parameter.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Namespace not found.', type: ErrorResponseDto })
  async list(
    @Param('name') name: string,
    @Query() query: Record<string, unknown>,
  ): Promise<PaginatedResultDto<EntryDto>> {
    return toPageDto(await this.listEntries.execute(name, parseEntryListQuery(query)), toEntryDto);
  }

  @Post()
  @ApiOperation({ summary: 'Create an entry' })
  @ApiParam(NAMESPACE_PARAM)
  @ApiResponse({ status: 201, type: EntryResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Namespace not found.', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Duplicate entry.', type: ErrorResponseDto })
  async create(@Param('name') name: string, @Body() body: CreateEntryDto): Promise<EntryDto> {
    return toEntryDto(
      await this.createEntry.execute(name, {
        name: body.name,
        value: body.value,
        description: body.description,
        envDependent: body.env_dependent,
      }),
    );
  }

  @Get(':entry')
  @ApiOperation({ summary: 'Get an entry' })
  @ApiParam(NAMESPACE_PARAM)
  @ApiParam(ENTRY_PARAM)
  @ApiResponse({ status: 200, type: EntryResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Namespace or entry not found.',
    type: ErrorResponseDto,
  })
  async get(@Param('name') name: string, @Param('entry') entry: string): Promise<EntryDto> {
    return toEntryDto(await this.getEntry.execute(name, entry));
  }

  @Put(':entry')
  @ApiOperation({ summary: 'Update an entry (name, value, description, env_dependent)' })
  @ApiParam(NAMESPACE_PARAM)
  @ApiParam(ENTRY_PARAM)
  @ApiResponse({ status: 200, type: EntryResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ErrorResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Namespace or entry not found.',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Duplicate entry.', type: ErrorResponseDto })
  async update(
    @Param('name') name: string,
    @Param('entry') entry: string,
    @Body() body: UpdateEntryDto,
  ): Promise<EntryDto> {
    return toEntryDto(
      await this.updateEntry.execute(name, entry, {
        name: body.name,
        value: body.value,
        description: body.description,
        envDependent: body.env_dependent,
      }),
    );
  }

  @Delete(':entry')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an entry' })
  @ApiParam(NAMESPACE_PARAM)
  @ApiParam(ENTRY_PARAM)
  @ApiResponse({ status: 204, description: 'Deleted.' })
  @ApiResponse({
    status: 404,
    description: 'Namespace or entry not found.',
    type: ErrorResponseDto,
  })
  async remove(@Param('name') name: string, @Param('entry') entry: string): Promise<void> {
    await this.deleteEntry.execute(name, entry);
  }
}
