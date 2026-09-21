import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ExportNamespaceYamlUseCase,
  ExportYamlUseCase,
  ImportYamlUseCase,
} from '@okvns/application';
import {
  ERROR_CODES,
  REQUEST_BODY_MAX_BYTES,
  type YamlExportResponseDto as YamlExportDto,
  type YamlImportResponseDto as YamlImportDto,
} from '@okvns/shared';
import { YamlError } from '@okvns/yaml';
import {
  ErrorResponseDto,
  YamlExportResponseDto,
  YamlImportResponseDto,
} from '../common/api-schemas';
import { toNamespaceDto } from '../common/dto-mappers';
import { requestValidationError } from '../common/validation';
import { ImportYamlBodyDto, ImportYamlFileDto } from './yaml.dto';

interface UploadedYamlFile {
  buffer: Buffer;
}

/** Decodes an upload as strict UTF-8 so mojibake never reaches the parser. */
function decodeUpload(file: UploadedYamlFile): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
  } catch {
    throw new YamlError(ERROR_CODES.INVALID_YAML, 'The uploaded file is not valid UTF-8 text.');
  }
}

@ApiTags('yaml')
@ApiExtraModels(ImportYamlBodyDto, ImportYamlFileDto)
@Controller('yaml')
export class YamlController {
  constructor(
    private readonly importYaml: ImportYamlUseCase,
    private readonly exportYaml: ExportYamlUseCase,
    private readonly exportNamespaceYaml: ExportNamespaceYamlUseCase,
  ) {}

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      // Held in memory only for the request; nothing is written to disk.
      limits: { fileSize: REQUEST_BODY_MAX_BYTES, files: 1 },
    }),
  )
  @ApiOperation({
    summary: 'Import OKVNS YAML',
    description:
      'Send `{ "yaml": "..." }` as JSON, or upload a UTF-8 file in the multipart field `file`. ' +
      'The whole document is validated before anything is stored, and namespaces are upserted by name.',
  })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/ImportYamlBodyDto' },
        { $ref: '#/components/schemas/ImportYamlFileDto' },
      ],
    },
  })
  @ApiResponse({ status: 201, type: YamlImportResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid YAML or missing content.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate namespace or entry in the file.',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 413, description: 'Payload over 1 MiB.', type: ErrorResponseDto })
  async import(
    @Body() body: Record<string, unknown> | undefined,
    @UploadedFile() file?: UploadedYamlFile,
  ): Promise<YamlImportDto> {
    let yaml: string;
    if (file) {
      yaml = decodeUpload(file);
    } else if (typeof body?.yaml === 'string') {
      yaml = body.yaml;
    } else {
      throw requestValidationError([
        'yaml must be a string, or upload a file in the multipart field "file"',
      ]);
    }
    const namespaces = await this.importYaml.execute(yaml);
    return { namespaces: namespaces.map(toNamespaceDto) };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export every namespace as YAML' })
  @ApiResponse({ status: 200, type: YamlExportResponseDto })
  async exportAll(): Promise<YamlExportDto> {
    return { yaml: await this.exportYaml.execute() };
  }

  @Get('export/:name')
  @ApiOperation({ summary: 'Export one namespace as YAML' })
  @ApiParam({ name: 'name', description: 'Namespace name', example: 'billing' })
  @ApiResponse({ status: 200, type: YamlExportResponseDto })
  @ApiResponse({ status: 404, description: 'Namespace not found.', type: ErrorResponseDto })
  async exportOne(@Param('name') name: string): Promise<YamlExportDto> {
    return { yaml: await this.exportNamespaceYaml.execute(name) };
  }
}
