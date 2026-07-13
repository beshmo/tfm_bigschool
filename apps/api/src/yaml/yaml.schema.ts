import { ApiProperty } from '@nestjs/swagger';
import { NamespaceResponse } from '../namespaces/namespace.schema';

/** Documented response returned by a YAML import once applied. */
export class YamlImportResponse {
  @ApiProperty({
    description: 'Namespaces present after the import was applied.',
    type: [NamespaceResponse],
  })
  namespaces!: NamespaceResponse[];
}

/** Documented response returned by YAML export endpoints. */
export class YamlExportResponse {
  @ApiProperty({
    description: 'Exported OKVNS YAML document (raw YAML, no markdown fence).',
    example: 'namespaces:\n  - name: users\n    entries: []\n',
  })
  yaml!: string;
}
