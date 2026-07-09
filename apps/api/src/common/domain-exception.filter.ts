import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, InvalidYamlError } from '@okvns/domain';
import { YamlError } from '@okvns/yaml';
import { ERROR_CODES } from '@okvns/shared';
import { STATUS_BY_CODE, buildApiError, codeForStatus } from './api-error';

/**
 * Global exception filter. Maps domain, YAML, and framework errors to safe
 * API error responses without leaking stack traces or implementation details.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof DomainError) {
      const details = exception instanceof InvalidYamlError ? exception.details : undefined;
      response
        .status(STATUS_BY_CODE[exception.code])
        .json(buildApiError(exception.code, exception.message, details));
      return;
    }

    if (exception instanceof YamlError) {
      response
        .status(STATUS_BY_CODE[exception.code])
        .json(buildApiError(exception.code, exception.message, exception.details));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const { message, details } = extractHttpDetails(exception);
      response.status(status).json(buildApiError(codeForStatus(status), message, details));
      return;
    }

    this.logger.error(
      'Unhandled error',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(500).json(buildApiError(ERROR_CODES.INTERNAL, 'An unexpected error occurred.'));
  }
}

function extractHttpDetails(exception: HttpException): { message: string; details?: string[] } {
  const response = exception.getResponse();
  if (typeof response === 'object' && response !== null) {
    const body = response as { message?: unknown };
    if (Array.isArray(body.message)) {
      return { message: 'Request validation failed.', details: body.message.map(String) };
    }
    if (typeof body.message === 'string') {
      return { message: body.message };
    }
  }
  return { message: exception.message };
}
