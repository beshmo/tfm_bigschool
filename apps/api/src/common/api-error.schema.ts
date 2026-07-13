import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ERROR_CODES } from '@okvns/shared';

/** Documented body of the safe error shape (never contains stack traces). */
export class ApiErrorBody {
  @ApiProperty({
    description: 'Stable machine-readable error code.',
    enum: Object.values(ERROR_CODES),
    example: ERROR_CODES.NAMESPACE_NOT_FOUND,
  })
  code!: string;

  @ApiProperty({
    description: 'Human-readable error message.',
    example: 'Namespace not found.',
  })
  message!: string;

  @ApiPropertyOptional({
    description: 'Optional field-level validation details for boundary errors.',
    type: [String],
    example: ['property extra should not exist'],
  })
  details?: string[];
}

/** Documented safe API error response. */
export class ApiErrorResponse {
  @ApiProperty({ type: ApiErrorBody })
  error!: ApiErrorBody;
}
