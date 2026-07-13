import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { READINESS_INDICATOR, type ReadinessIndicator } from './readiness';

/** Liveness and readiness endpoints for Docker and Kubernetes probes. */
@Controller()
export class HealthController {
  constructor(@Inject(READINESS_INDICATOR) private readonly readiness: ReadinessIndicator) {}

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ status: string }> {
    if (!(await this.readiness.isReady())) {
      // 503 so Docker/Kubernetes probes hold traffic until MySQL is reachable
      // with the required schema.
      throw new ServiceUnavailableException('Not ready: storage is unavailable.');
    }
    return { status: 'ready' };
  }
}
