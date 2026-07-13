import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiPayloadTooLargeResponse,
} from '@nestjs/swagger';
import { ApiErrorResponse } from './api-error.schema';

/**
 * Reusable Swagger error-response decorators that reference the shared safe
 * {@link ApiErrorResponse} shape, keeping controller annotations concise and
 * consistent with the runtime {@link DomainExceptionFilter} contract.
 */

export const ApiBadRequestError = (
  description = 'Validation error (invalid body or route parameter).',
) => applyDecorators(ApiBadRequestResponse({ description, type: ApiErrorResponse }));

export const ApiNotFoundError = (description = 'Resource not found.') =>
  applyDecorators(ApiNotFoundResponse({ description, type: ApiErrorResponse }));

export const ApiConflictError = (description = 'Resource already exists.') =>
  applyDecorators(ApiConflictResponse({ description, type: ApiErrorResponse }));

export const ApiPayloadTooLargeError = (description = 'Request body exceeds the size limit.') =>
  applyDecorators(ApiPayloadTooLargeResponse({ description, type: ApiErrorResponse }));
