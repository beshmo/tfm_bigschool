export type OkvnsWrapperErrorKind =
  | 'configuration'
  | 'network'
  | 'validation'
  | 'server'
  | 'invalid-response'
  | 'unexpected-response';

/** Base class for every error the wrapper raises instead of returning the default value. */
export abstract class OkvnsWrapperError extends Error {
  abstract readonly kind: OkvnsWrapperErrorKind;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The wrapper is misconfigured (missing base URL or no fetch implementation). */
export class OkvnsConfigurationError extends OkvnsWrapperError {
  readonly kind = 'configuration';
}

/** The request failed before any HTTP response was received. */
export class OkvnsNetworkError extends OkvnsWrapperError {
  readonly kind = 'network';

  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
  }
}

/** The API rejected the request as invalid (HTTP 400). */
export class OkvnsValidationError extends OkvnsWrapperError {
  readonly kind = 'validation';
}

/** The API failed while serving the request (HTTP 5xx). */
export class OkvnsServerError extends OkvnsWrapperError {
  readonly kind = 'server';

  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** A successful response did not contain a string entry value. */
export class OkvnsInvalidResponseError extends OkvnsWrapperError {
  readonly kind = 'invalid-response';
}

/** Any other response the wrapper does not know how to interpret. */
export class OkvnsUnexpectedResponseError extends OkvnsWrapperError {
  readonly kind = 'unexpected-response';

  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
