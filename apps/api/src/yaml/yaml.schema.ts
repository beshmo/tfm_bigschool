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
    description:
      'Exported OKVNS YAML document (raw YAML, no markdown fence). Each namespace ' +
      'and entry includes `created_at` and `modified_at` timestamp metadata.',
    example:
      'namespaces:\n  - name: users\n    created_at: 2026-01-01T00:00:00.000Z\n' +
      '    modified_at: 2026-01-02T00:00:00.000Z\n    entries: []\n',
  })
  yaml!: string;
}
