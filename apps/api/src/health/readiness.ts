/** DI token for the readiness indicator. */
export const READINESS_INDICATOR = Symbol('READINESS_INDICATOR');

/**
 * Reports whether the API is ready to serve traffic. For the durable runtime
 * this verifies MySQL connectivity and required schema availability; for the
 * in-memory profile it is always ready.
 */
export interface ReadinessIndicator {
  isReady(): Promise<boolean>;
}

/** Readiness indicator for the in-memory profile — ready as soon as the app is up. */
export class AlwaysReadyIndicator implements ReadinessIndicator {
  async isReady(): Promise<boolean> {
    return true;
  }
}
