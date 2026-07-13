import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ExportYamlUseCase,
  ExportNamespaceYamlUseCase,
  ImportYamlUseCase,
} from '@okvns/application';
import { REQUEST_BODY_MAX_BYTES } from '@okvns/shared';
import type { YamlExportResponseDto, YamlImportResponseDto } from '@okvns/shared';
import { NameParamPipe } from '../common/name-param.pipe';
import {
  ApiBadRequestError,
  ApiNotFoundError,
  ApiPayloadTooLargeError,
} from '../common/api-error.decorators';
import { YamlImportDto, YamlImportFileDto, type UploadedYamlFile } from './yaml.dto';
import { YamlExportResponse, YamlImportResponse } from './yaml.schema';

@ApiTags('yaml')
@Controller('yaml')
export class YamlController {
  constructor(
    private readonly importYaml: ImportYamlUseCase,
    private readonly exportYaml: ExportYamlUseCase,
    private readonly exportNamespaceYaml: ExportNamespaceYamlUseCase,
  ) {}

  /**
   * Imports OKVNS YAML from either a JSON `yaml` request field or a multipart
   * `file` upload. Uploaded bytes are decoded as UTF-8 text and routed through
   * the same {@link ImportYamlUseCase} as JSON imports, so validation,
   * atomicity, and upsert semantics stay identical across both request formats.
   * Multer enforces the memory upload size limit; the parser rejects empty,
   * missing, or invalid content as `INVALID_YAML`.
   */
  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: REQUEST_BODY_MAX_BYTES } }))
  @ApiOperation({
    summary: 'Import OKVNS YAML (JSON `yaml` field or multipart `file` upload).',
    description:
      'Validates the entire document before mutating anything and upserts by ' +
      'namespace name (an existing namespace’s entries are fully replaced).',
  })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    description: 'JSON body with a `yaml` field, or a multipart `file` upload.',
    schema: {
      oneOf: [{ $ref: getSchemaPath(YamlImportDto) }, { $ref: getSchemaPath(YamlImportFileDto) }],
    },
  })
  @ApiCreatedResponse({ type: YamlImportResponse })
  @ApiBadRequestError('Invalid or empty YAML (`INVALID_YAML`) or missing file field.')
  @ApiPayloadTooLargeError('Uploaded file exceeds the size limit.')
  async import(
    @UploadedFile() file: UploadedYamlFile | undefined,
    @Body() body: YamlImportDto,
  ): Promise<YamlImportResponseDto> {
    const yaml = file ? file.buffer.toString('utf8') : (body.yaml ?? '');
    const namespaces = await this.importYaml.execute(yaml);
    return { namespaces };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all namespaces as raw YAML.' })
  @ApiOkResponse({ type: YamlExportResponse })
  async exportAll(): Promise<YamlExportResponseDto> {
    return { yaml: await this.exportYaml.execute() };
  }

  @Get('export/:namespace')
  @ApiOperation({ summary: 'Export a single namespace as raw YAML.' })
  @ApiParam({ name: 'namespace', description: 'Namespace name.', example: 'users' })
  @ApiOkResponse({ type: YamlExportResponse })
  @ApiBadRequestError()
  @ApiNotFoundError('Namespace not found.')
  async exportOne(
    @Param('namespace', NameParamPipe) namespace: string,
  ): Promise<YamlExportResponseDto> {
    return { yaml: await this.exportNamespaceYaml.execute(namespace) };
  }
}
