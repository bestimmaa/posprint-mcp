import type { PrintErrorCode } from "./types.js";

export class AppError extends Error {
  constructor(
    public readonly code: PrintErrorCode,
    message: string,
    public readonly meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function mapUnknownError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error && /timeout/i.test(error.message)) {
    return new AppError("TIMEOUT", "Printing timed out", { cause: error.message });
  }

  return new AppError("UNKNOWN_ERROR", "Unexpected printing failure", {
    cause: error instanceof Error ? error.message : String(error)
  });
}
