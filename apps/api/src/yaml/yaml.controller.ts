import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ExportYamlUseCase,
  ExportNamespaceYamlUseCase,
  ImportYamlUseCase,
} from '@okvns/application';
import { REQUEST_BODY_MAX_BYTES } from '@okvns/shared';
import type { YamlExportResponseDto, YamlImportResponseDto } from '@okvns/shared';
import { NameParamPipe } from '../common/name-param.pipe';
import { YamlImportDto, type UploadedYamlFile } from './yaml.dto';

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
  async import(
    @UploadedFile() file: UploadedYamlFile | undefined,
    @Body() body: YamlImportDto,
  ): Promise<YamlImportResponseDto> {
    const yaml = file ? file.buffer.toString('utf8') : (body.yaml ?? '');
    const namespaces = await this.importYaml.execute(yaml);
    return { namespaces };
  }

  @Get('export')
  async exportAll(): Promise<YamlExportResponseDto> {
    return { yaml: await this.exportYaml.execute() };
  }

  @Get('export/:namespace')
  async exportOne(
    @Param('namespace', NameParamPipe) namespace: string,
  ): Promise<YamlExportResponseDto> {
    return { yaml: await this.exportNamespaceYaml.execute(namespace) };
  }
}
