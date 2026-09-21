import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { VALIDATION_FAILED_MESSAGE } from './api-error';

/** A 400 carrying one detail string per violated rule. */
export function requestValidationError(details: string[]): BadRequestException {
  return new BadRequestException({ message: VALIDATION_FAILED_MESSAGE, details });
}

function flatten(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...flatten(error.children ?? []),
  ]);
}

/** Global body validation: unknown keys and wrong types are rejected before any use case runs. */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => requestValidationError(flatten(errors)),
  });
}
