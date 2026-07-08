import { Controller, Get } from '@nestjs/common';

/** Liveness and readiness endpoints for Docker and Kubernetes probes. */
@Controller()
export class HealthController {
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  ready(): { status: string } {
    return { status: 'ready' };
  }
}
