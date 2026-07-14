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
  CreateNamespaceUseCase,
  DeleteNamespaceUseCase,
  GetNamespaceUseCase,
  ListNamespacesUseCase,
  UpdateNamespaceUseCase,
} from '@okvns/application';
import type { NamespaceDto } from '@okvns/shared';
import { NameParamPipe } from '../common/name-param.pipe';
import {
  ApiBadRequestError,
  ApiConflictError,
  ApiNotFoundError,
} from '../common/api-error.decorators';
import { NamespaceInputDto, UpdateNamespaceDto } from './namespace.dto';
import { NamespaceResponse } from './namespace.schema';

@ApiTags('namespaces')
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
  @ApiOperation({ summary: 'List all namespaces, ordered by name.' })
  @ApiOkResponse({ type: [NamespaceResponse] })
  list(): Promise<NamespaceDto[]> {
    return this.listNamespaces.execute();
  }

  @Post()
  @ApiOperation({ summary: 'Create a namespace.' })
  @ApiCreatedResponse({ type: NamespaceResponse })
  @ApiBadRequestError()
  @ApiConflictError('A namespace with the same name already exists.')
  create(@Body() body: NamespaceInputDto): Promise<NamespaceDto> {
    return this.createNamespace.execute(body.name, body.description);
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get a namespace with its entries.' })
  @ApiParam({ name: 'name', description: 'Namespace name.', example: 'users' })
  @ApiOkResponse({ type: NamespaceResponse })
  @ApiBadRequestError()
  @ApiNotFoundError('Namespace not found.')
  get(@Param('name', NameParamPipe) name: string): Promise<NamespaceDto> {
    return this.getNamespace.execute(name);
  }

  @Put(':name')
  @ApiOperation({ summary: 'Update a namespace name and/or description.' })
  @ApiParam({ name: 'name', description: 'Current namespace name.', example: 'users' })
  @ApiOkResponse({ type: NamespaceResponse })
  @ApiBadRequestError()
  @ApiNotFoundError('Namespace not found.')
  @ApiConflictError('A namespace with the target name already exists.')
  update(
    @Param('name', NameParamPipe) name: string,
    @Body() body: UpdateNamespaceDto,
  ): Promise<NamespaceDto> {
    return this.updateNamespace.execute(name, { name: body.name, description: body.description });
  }

  @Delete(':name')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a namespace and its entries.' })
  @ApiParam({ name: 'name', description: 'Namespace name.', example: 'users' })
  @ApiNoContentResponse({ description: 'Namespace deleted.' })
  @ApiBadRequestError()
  @ApiNotFoundError('Namespace not found.')
  async remove(@Param('name', NameParamPipe) name: string): Promise<void> {
    await this.deleteNamespace.execute(name);
  }
}
