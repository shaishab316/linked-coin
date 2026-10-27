export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "IDEMPOTENT_REPLAY"
  | "UNBALANCED_TRANSACTION"
  | "INVALID_CURRENCY"
  | "INSUFFICIENT_FUNDS"
  | "EXCEEDS_OUTSTANDING_DEBT"
  | "IMMUTABLE_EVENT_MODIFIED"
  | "INTERNAL_SERVER_ERROR";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode = "INTERNAL_SERVER_ERROR",
    statusCode = 500,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError(message, "UNAUTHORIZED", 401);
  }

  static forbidden(message = "Access denied"): AppError {
    return new AppError(message, "FORBIDDEN", 403);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(message, "NOT_FOUND", 404);
  }

  static validation(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(message, "VALIDATION_ERROR", 400, details);
  }

  static conflict(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(message, "CONFLICT", 409, details);
  }

  static unbalanced(message = "Transaction debit and credit amounts must balance"): AppError {
    return new AppError(message, "UNBALANCED_TRANSACTION", 400);
  }

  static toResponse(error: unknown): {
    status: number;
    body: { success: false; error: { code: string; message: string; details?: Record<string, unknown> } };
  } {
    if (error instanceof AppError) {
      return {
        status: error.statusCode,
        body: {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
      };
    }

    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return {
      status: 500,
      body: {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message,
        },
      },
    };
  }
}
