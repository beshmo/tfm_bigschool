import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateEntryUseCase,
  DeleteEntryUseCase,
  GetEntryUseCase,
  ListEntriesUseCase,
  UpdateEntryUseCase,
} from '@okvns/application';
import type { EntryDto } from '@okvns/shared';
import { NameParamPipe } from '../common/name-param.pipe';
import {
  ApiBadRequestError,
  ApiConflictError,
  ApiNotFoundError,
} from '../common/api-error.decorators';
import { CreateEntryDto, UpdateEntryDto } from './entry.dto';
import { EntryResponse } from './entry.schema';

@ApiTags('entries')
@ApiParam({ name: 'namespace', description: 'Namespace name.', example: 'users' })
@Controller('namespaces/:namespace/entries')
export class EntriesController {
  constructor(
    private readonly listEntries: ListEntriesUseCase,
    private readonly createEntry: CreateEntryUseCase,
    private readonly getEntry: GetEntryUseCase,
    private readonly updateEntry: UpdateEntryUseCase,
    private readonly deleteEntry: DeleteEntryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List entries in a namespace, ordered by name.' })
  @ApiOkResponse({ type: [EntryResponse] })
  @ApiBadRequestError()
  @ApiNotFoundError('Namespace not found.')
  list(@Param('namespace', NameParamPipe) namespace: string): Promise<EntryDto[]> {
    return this.listEntries.execute(namespace);
  }

  @Post()
  @ApiOperation({ summary: 'Create an entry in a namespace.' })
  @ApiCreatedResponse({ type: EntryResponse })
  @ApiBadRequestError()
  @ApiNotFoundError('Namespace not found.')
  @ApiConflictError('An entry with the same name already exists in the namespace.')
  create(
    @Param('namespace', NameParamPipe) namespace: string,
    @Body() body: CreateEntryDto,
  ): Promise<EntryDto> {
    return this.createEntry.execute(namespace, body.name, body.value);
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get an entry.' })
  @ApiParam({ name: 'name', description: 'Entry name.', example: 'admin' })
  @ApiOkResponse({ type: EntryResponse })
  @ApiBadRequestError()
  @ApiNotFoundError('Namespace or entry not found.')
  get(
    @Param('namespace', NameParamPipe) namespace: string,
    @Param('name', NameParamPipe) name: string,
  ): Promise<EntryDto> {
    return this.getEntry.execute(namespace, name);
  }

  @Put(':name')
  @ApiOperation({ summary: 'Update an entry name and/or value.' })
  @ApiParam({ name: 'name', description: 'Entry name.', example: 'admin' })
  @ApiOkResponse({ type: EntryResponse })
  @ApiBadRequestError()
  @ApiNotFoundError('Namespace or entry not found.')
  @ApiConflictError('An entry with the target name already exists in the namespace.')
  update(
    @Param('namespace', NameParamPipe) namespace: string,
    @Param('name', NameParamPipe) name: string,
    @Body() body: UpdateEntryDto,
  ): Promise<EntryDto> {
    return this.updateEntry.execute(namespace, name, { name: body.name, value: body.value });
  }

  @Delete(':name')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an entry.' })
  @ApiParam({ name: 'name', description: 'Entry name.', example: 'admin' })
  @ApiNoContentResponse({ description: 'Entry deleted.' })
  @ApiBadRequestError()
  @ApiNotFoundError('Namespace or entry not found.')
  async remove(
    @Param('namespace', NameParamPipe) namespace: string,
    @Param('name', NameParamPipe) name: string,
  ): Promise<void> {
    await this.deleteEntry.execute(namespace, name);
  }
}
