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

    const clientStatus = clientErrorStatus(exception);
    if (clientStatus !== undefined) {
      response
        .status(clientStatus)
        .json(buildApiError(codeForStatus(clientStatus), CLIENT_ERROR_MESSAGES[clientStatus]));
      return;
    }

    this.logger.error(
      'Unhandled error',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(500).json(buildApiError(ERROR_CODES.INTERNAL, 'An unexpected error occurred.'));
  }
}

const CLIENT_ERROR_MESSAGES: Record<number, string> = {
  400: 'The request could not be processed.',
  413: 'Request body exceeds the size limit.',
};

/**
 * Maps request-parsing failures raised outside Nest (multer for uploads,
 * body-parser for JSON bodies) to a client status. Matches on the error's
 * identity and machine-readable fields, never on message text, which changes
 * between library versions.
 */
function clientErrorStatus(exception: unknown): number | undefined {
  if (typeof exception !== 'object' || exception === null) {
    return undefined;
  }
  const error = exception as { name?: unknown; code?: unknown; type?: unknown };
  if (error.name === 'MulterError') {
    return error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  }
  if (error.type === 'entity.too.large') {
    return 413;
  }
  if (error.type === 'entity.parse.failed') {
    return 400;
  }
  return undefined;
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
