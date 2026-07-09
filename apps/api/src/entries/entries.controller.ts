import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import {
  CreateEntryUseCase,
  DeleteEntryUseCase,
  GetEntryUseCase,
  ListEntriesUseCase,
  UpdateEntryUseCase,
} from '@okvns/application';
import type { EntryDto } from '@okvns/shared';
import { NameParamPipe } from '../common/name-param.pipe';
import { CreateEntryDto, UpdateEntryDto } from './entry.dto';

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
  list(@Param('namespace', NameParamPipe) namespace: string): Promise<EntryDto[]> {
    return this.listEntries.execute(namespace);
  }

  @Post()
  create(
    @Param('namespace', NameParamPipe) namespace: string,
    @Body() body: CreateEntryDto,
  ): Promise<EntryDto> {
    return this.createEntry.execute(namespace, body.name, body.value);
  }

  @Get(':name')
  get(
    @Param('namespace', NameParamPipe) namespace: string,
    @Param('name', NameParamPipe) name: string,
  ): Promise<EntryDto> {
    return this.getEntry.execute(namespace, name);
  }

  @Put(':name')
  update(
    @Param('namespace', NameParamPipe) namespace: string,
    @Param('name', NameParamPipe) name: string,
    @Body() body: UpdateEntryDto,
  ): Promise<EntryDto> {
    return this.updateEntry.execute(namespace, name, { name: body.name, value: body.value });
  }

  @Delete(':name')
  @HttpCode(204)
  async remove(
    @Param('namespace', NameParamPipe) namespace: string,
    @Param('name', NameParamPipe) name: string,
  ): Promise<void> {
    await this.deleteEntry.execute(namespace, name);
  }
}
