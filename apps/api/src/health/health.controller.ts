import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto, StatusResponseDto } from '../common/api-schemas';
import type { ReadinessIndicator } from '../infrastructure/mysql/mysql-readiness';
import { READINESS_INDICATOR } from '../tokens';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(@Inject(READINESS_INDICATOR) private readonly readiness: ReadinessIndicator) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'The process is alive.', type: StatusResponseDto })
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (storage reachable and schema present)' })
  @ApiResponse({ status: 200, description: 'Ready to serve traffic.', type: StatusResponseDto })
  @ApiResponse({ status: 503, description: 'Storage is unavailable.', type: ErrorResponseDto })
  async ready(): Promise<{ status: string }> {
    if (!(await this.readiness.check())) {
      throw new ServiceUnavailableException('Not ready: storage is unavailable.');
    }
    return { status: 'ready' };
  }
}
