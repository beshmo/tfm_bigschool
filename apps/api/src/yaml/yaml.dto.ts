import { ApiProperty } from '@nestjs/swagger';

export class ImportYamlBodyDto {
  @ApiProperty({ description: 'Raw OKVNS YAML (not wrapped in a code fence).' })
  yaml!: string;
}

export class ImportYamlFileDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'UTF-8 OKVNS YAML file.' })
  file!: unknown;
}
