import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ExportYamlUseCase,
  ExportNamespaceYamlUseCase,
  ImportYamlUseCase,
} from '@okvns/application';
import type {
  YamlExportResponseDto,
  YamlImportResponseDto,
} from '@okvns/shared';
import { NameParamPipe } from '../common/name-param.pipe';
import { YamlImportDto } from './yaml.dto';

@Controller('yaml')
export class YamlController {
  constructor(
    private readonly importYaml: ImportYamlUseCase,
    private readonly exportYaml: ExportYamlUseCase,
    private readonly exportNamespaceYaml: ExportNamespaceYamlUseCase,
  ) {}

  @Post('import')
  async import(@Body() body: YamlImportDto): Promise<YamlImportResponseDto> {
    const namespaces = await this.importYaml.execute(body.yaml);
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
