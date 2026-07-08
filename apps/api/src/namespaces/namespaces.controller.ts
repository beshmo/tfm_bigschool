import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  CreateNamespaceUseCase,
  DeleteNamespaceUseCase,
  GetNamespaceUseCase,
  ListNamespacesUseCase,
  UpdateNamespaceUseCase,
} from '@okvns/application';
import type { NamespaceDto } from '@okvns/shared';
import { NameParamPipe } from '../common/name-param.pipe';
import { NamespaceInputDto } from './namespace.dto';

@Controller('namespaces')
export class NamespacesController {
  constructor(
    private readonly listNamespaces: ListNamespacesUseCase,
    private readonly createNamespace: CreateNamespaceUseCase,
    private readonly getNamespace: GetNamespaceUseCase,
    private readonly updateNamespace: UpdateNamespaceUseCase,
    private readonly deleteNamespace: DeleteNamespaceUseCase,
  ) {}

  @Get()
  list(): Promise<NamespaceDto[]> {
    return this.listNamespaces.execute();
  }

  @Post()
  create(@Body() body: NamespaceInputDto): Promise<NamespaceDto> {
    return this.createNamespace.execute(body.name);
  }

  @Get(':name')
  get(@Param('name', NameParamPipe) name: string): Promise<NamespaceDto> {
    return this.getNamespace.execute(name);
  }

  @Put(':name')
  update(
    @Param('name', NameParamPipe) name: string,
    @Body() body: NamespaceInputDto,
  ): Promise<NamespaceDto> {
    return this.updateNamespace.execute(name, body.name);
  }

  @Delete(':name')
  @HttpCode(204)
  async remove(@Param('name', NameParamPipe) name: string): Promise<void> {
    await this.deleteNamespace.execute(name);
  }
}
