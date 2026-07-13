/**
 * Typed errors raised by {@link OkvnsWrapper}.
 *
 * Every non-default failure surfaces as an {@link OkvnsWrapperError} subclass so
 * callers can branch on `error.kind` (or `instanceof`) instead of parsing
 * messages. Missing namespaces and missing entries are NOT errors — those
 * resolve to the caller-provided default value.
 */

/** Discriminator for the concrete wrapper error variant. */
export type OkvnsWrapperErrorKind =
  | 'configuration'
  | 'network'
  | 'validation'
  | 'server'
  | 'invalid-response'
  | 'unexpected-response';

/** Base class for all wrapper errors. */
export abstract class OkvnsWrapperError extends Error {
  /** Machine-readable discriminator for the failure variant. */
  abstract readonly kind: OkvnsWrapperErrorKind;

  protected constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = new.target.name;
    if (options && 'cause' in options) {
      this.cause = options.cause;
    }
  }
}

/** The wrapper has no usable fetch implementation (none injected, none global). */
export class OkvnsConfigurationError extends OkvnsWrapperError {
  readonly kind = 'configuration';

  constructor(message: string) {
    super(message);
  }
}

/** The fetch call failed before any HTTP response was received. */
export class OkvnsNetworkError extends OkvnsWrapperError {
  readonly kind = 'network';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/** The API rejected the request with a validation error. */
export class OkvnsValidationError extends OkvnsWrapperError {
  readonly kind = 'validation';

  constructor(
    message: string,
    /** Machine-readable error code returned by the API, when present. */
    readonly code: string | undefined,
    /** Field-level validation details returned by the API, when present. */
    readonly details: string[] | undefined,
  ) {
    super(message);
  }
}

/** The API responded with a server-side failure (HTTP 5xx). */
export class OkvnsServerError extends OkvnsWrapperError {
  readonly kind = 'server';

  constructor(
    message: string,
    /** HTTP status code of the failing response. */
    readonly status: number,
    /** Machine-readable error code returned by the API, when present. */
    readonly code: string | undefined,
  ) {
    super(message);
  }
}

/** A successful HTTP response did not contain a valid entry payload. */
export class OkvnsInvalidResponseError extends OkvnsWrapperError {
  readonly kind = 'invalid-response';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/** The API responded with an error that the wrapper does not otherwise handle. */
export class OkvnsUnexpectedResponseError extends OkvnsWrapperError {
  readonly kind = 'unexpected-response';

  constructor(
    message: string,
    /** HTTP status code of the response. */
    readonly status: number,
    /** Machine-readable error code returned by the API, when present. */
    readonly code: string | undefined,
  ) {
    super(message);
  }
}
