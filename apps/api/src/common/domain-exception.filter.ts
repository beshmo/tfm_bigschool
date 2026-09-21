import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { DomainError } from '@okvns/domain';
import { ERROR_CODES, type ApiErrorDto } from '@okvns/shared';
import { YamlError } from '@okvns/yaml';
import type { Response } from 'express';
import { STATUS_BY_CODE, UNEXPECTED_ERROR_MESSAGE, apiError } from './api-error';

interface Translated {
  status: number;
  body: ApiErrorDto;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Extracts a safe message and details from a Nest `HttpException` response. */
function describe(
  response: string | object,
  fallback: string,
): { message: string; details: string[] } {
  if (typeof response === 'string') {
    return { message: response, details: [] };
  }
  const record = response as Record<string, unknown>;
  if (typeof record.message === 'string') {
    return { message: record.message, details: stringArray(record.details) };
  }
  // Nest's own validation shape: `message` is a list of violated rules.
  return { message: fallback, details: stringArray(record.message) };
}

/**
 * Multer's own errors. Nest only translates the messages it knows, and newer
 * multer wording (for example "Unexpected file field") slips through as a 500,
 * so map them here: an oversized file is 413, every other upload problem is 400.
 */
function multerStatus(exception: unknown): number | undefined {
  if (!(exception instanceof Error) || exception.name !== 'MulterError') {
    return undefined;
  }
  return (exception as Error & { code?: string }).code === 'LIMIT_FILE_SIZE' ? 413 : 400;
}

/** Status of an Express/body-parser (`http-errors`) failure, when it has one. */
function externalStatus(exception: unknown): number | undefined {
  if (!isRecord(exception)) {
    return undefined;
  }
  const status = exception.status ?? exception.statusCode;
  return typeof status === 'number' && status >= 400 && status <= 599 ? status : undefined;
}

/** Maps domain, YAML and framework errors to the safe `{ error: { code, message, details? } }` shape. */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = this.translate(exception);
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  private translate(exception: unknown): Translated {
    if (exception instanceof DomainError || exception instanceof YamlError) {
      return {
        status: STATUS_BY_CODE[exception.code],
        body: apiError(exception.code, exception.message, exception.details),
      };
    }
    if (exception instanceof HttpException) {
      const { message, details } = describe(exception.getResponse(), exception.message);
      return this.fromStatus(exception.getStatus(), message, details);
    }
    const status = multerStatus(exception) ?? externalStatus(exception);
    if (status !== undefined && status < 500 && exception instanceof Error) {
      return this.fromStatus(status, exception.message, []);
    }
    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );
    return this.fromStatus(500, UNEXPECTED_ERROR_MESSAGE, []);
  }

  /** 5xx becomes INTERNAL_ERROR; anything else is a VALIDATION_ERROR that keeps its status. */
  private fromStatus(status: number, message: string, details: string[]): Translated {
    const code = status >= 500 ? ERROR_CODES.INTERNAL_ERROR : ERROR_CODES.VALIDATION_ERROR;
    return { status, body: apiError(code, message, details) };
  }
}
