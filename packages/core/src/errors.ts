export type ReconcileErrorCode =
  "INVALID_RECORD" | "COLLECTOR_UNAVAILABLE" | "INVALID_AMOUNT" | "INTERNAL";

export class ReconcileError extends Error {
  constructor(
    readonly code: ReconcileErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ReconcileError";
  }
}
