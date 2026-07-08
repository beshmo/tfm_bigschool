import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ExportMarkdownUseCase,
  ExportNamespaceMarkdownUseCase,
  ImportMarkdownUseCase,
} from '@okvns/application';
import type {
  MarkdownExportResponseDto,
  MarkdownImportResponseDto,
} from '@okvns/shared';
import { NameParamPipe } from '../common/name-param.pipe';
import { MarkdownImportDto } from './markdown.dto';

@Controller('markdown')
export class MarkdownController {
  constructor(
    private readonly importMarkdown: ImportMarkdownUseCase,
    private readonly exportMarkdown: ExportMarkdownUseCase,
    private readonly exportNamespaceMarkdown: ExportNamespaceMarkdownUseCase,
  ) {}

  @Post('import')
  async import(@Body() body: MarkdownImportDto): Promise<MarkdownImportResponseDto> {
    const namespaces = await this.importMarkdown.execute(body.markdown);
    return { namespaces };
  }

  @Get('export')
  async exportAll(): Promise<MarkdownExportResponseDto> {
    return { markdown: await this.exportMarkdown.execute() };
  }

  @Get('export/:namespace')
  async exportOne(
    @Param('namespace', NameParamPipe) namespace: string,
  ): Promise<MarkdownExportResponseDto> {
    return { markdown: await this.exportNamespaceMarkdown.execute(namespace) };
  }
}
