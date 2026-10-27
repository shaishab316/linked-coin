/**
 * Stable, client-safe error codes. Messages are intentionally generic so
 * database or infrastructure details never reach the browser.
 */
export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "USERNAME_TAKEN"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors: FieldErrors | undefined;
  readonly retryable: boolean;

  constructor(
    code: AppErrorCode,
    message: string,
    options: { fieldErrors?: FieldErrors; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = options.fieldErrors;
    this.retryable = options.retryable ?? false;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * PostgreSQL unique-constraint violation, including when Drizzle wraps the
 * driver error.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;

  while (current instanceof Error) {
    if ("code" in current && current.code === "23505") {
      return true;
    }

    current = current.cause;
  }

  return false;
}
