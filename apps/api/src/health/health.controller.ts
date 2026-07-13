import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponse } from '../common/api-error.schema';
import { HealthResponse, ReadinessResponse } from './health.schema';
import { READINESS_INDICATOR, type ReadinessIndicator } from './readiness';

/** Liveness and readiness endpoints for Docker and Kubernetes probes. */
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(@Inject(READINESS_INDICATOR) private readonly readiness: ReadinessIndicator) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe.' })
  @ApiOkResponse({ type: HealthResponse })
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe.' })
  @ApiOkResponse({ type: ReadinessResponse })
  @ApiServiceUnavailableResponse({
    description: 'Storage is unavailable; the API is not ready to serve traffic.',
    type: ApiErrorResponse,
  })
  async ready(): Promise<{ status: string }> {
    if (!(await this.readiness.isReady())) {
      // 503 so Docker/Kubernetes probes hold traffic until MySQL is reachable
      // with the required schema.
      throw new ServiceUnavailableException('Not ready: storage is unavailable.');
    }
    return { status: 'ready' };
  }
}
