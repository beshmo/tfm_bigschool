/**
 * @okvns/wrapper
 *
 * A small, framework-independent TypeScript client for external applications
 * that read entry values from an already-running OKVNS API. It wraps
 * `GET /namespaces/:namespace/entries/:entry`, returns a caller default when the
 * namespace or entry is missing, and surfaces every other failure as a typed
 * wrapper error.
 */

export { OkvnsWrapper } from './wrapper.js';
export type { OkvnsWrapperOptions, FetchLike, FetchLikeResponse } from './wrapper.js';
export {
  OkvnsWrapperError,
  OkvnsConfigurationError,
  OkvnsNetworkError,
  OkvnsValidationError,
  OkvnsServerError,
  OkvnsInvalidResponseError,
  OkvnsUnexpectedResponseError,
} from './errors.js';
export type { OkvnsWrapperErrorKind } from './errors.js';
