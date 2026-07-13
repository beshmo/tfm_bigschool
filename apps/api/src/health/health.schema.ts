import { ApiProperty } from '@nestjs/swagger';

/** Documented liveness response body. */
export class HealthResponse {
  @ApiProperty({ description: 'Liveness status.', example: 'ok' })
  status!: string;
}

/** Documented readiness response body. */
export class ReadinessResponse {
  @ApiProperty({ description: 'Readiness status.', example: 'ready' })
  status!: string;
}
