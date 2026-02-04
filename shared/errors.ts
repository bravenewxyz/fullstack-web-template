/**
 * Standardized Error Handling
 * 
 * Centralized error codes, types, and utilities.
 * Used across client and server for consistent error handling.
 */

import { z } from "zod";

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Standardized error codes.
 * Format: CATEGORY_SPECIFIC (e.g., AUTH_INVALID_TOKEN)
 * 
 * Ranges:
 * - 1xxxx: Authentication errors
 * - 2xxxx: Authorization errors  
 * - 3xxxx: Validation errors
 * - 4xxxx: Resource errors
 * - 5xxxx: Server errors
 * - 6xxxx: External service errors
 */
export const ErrorCode = {
  // Authentication (1xxxx)
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN",
  AUTH_EXPIRED_TOKEN: "AUTH_EXPIRED_TOKEN",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",

  // Authorization (2xxxx)
  FORBIDDEN: "FORBIDDEN",
  ADMIN_REQUIRED: "ADMIN_REQUIRED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",

  // Validation (3xxxx)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Resource (4xxxx)
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Server (5xxxx)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // External (6xxxx)
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  TIMEOUT: "TIMEOUT",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ============================================================================
// Error Messages
// ============================================================================

export const ErrorMessages: Record<ErrorCode, string> = {
  // Authentication
  AUTH_REQUIRED: "Please log in to continue",
  AUTH_INVALID_TOKEN: "Invalid authentication token",
  AUTH_EXPIRED_TOKEN: "Your session has expired, please log in again",
  AUTH_INVALID_CREDENTIALS: "Invalid email or password",

  // Authorization
  FORBIDDEN: "You don't have permission to perform this action",
  ADMIN_REQUIRED: "Administrator access required",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions for this operation",

  // Validation
  VALIDATION_ERROR: "Invalid input data",
  INVALID_INPUT: "The provided input is invalid",
  MISSING_REQUIRED_FIELD: "A required field is missing",

  // Resource
  NOT_FOUND: "The requested resource was not found",
  ALREADY_EXISTS: "This resource already exists",
  CONFLICT: "The operation conflicts with existing data",

  // Server
  INTERNAL_ERROR: "An unexpected error occurred",
  DATABASE_ERROR: "Database operation failed",
  SERVICE_UNAVAILABLE: "Service is temporarily unavailable",

  // External
  EXTERNAL_SERVICE_ERROR: "External service error",
  RATE_LIMITED: "Too many requests, please try again later",
  TIMEOUT: "The operation timed out",
};

// ============================================================================
// Error Schema (for API responses)
// ============================================================================

export const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string(),
  requestId: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// ============================================================================
// AppError Class
// ============================================================================

export interface AppErrorOptions {
  code: ErrorCode;
  message?: string;
  cause?: Error;
  details?: Record<string, unknown>;
  statusCode?: number;
}

/**
 * Application error class with standardized codes.
 * Use this for all application errors.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly statusCode: number;
  public readonly timestamp: string;

  constructor(options: AppErrorOptions) {
    const message = options.message ?? ErrorMessages[options.code];
    super(message, { cause: options.cause });

    this.name = "AppError";
    this.code = options.code;
    this.details = options.details;
    this.statusCode = options.statusCode ?? getHttpStatusForCode(options.code);
    this.timestamp = new Date().toISOString();
  }

  /**
   * Convert to API response format
   */
  toResponse(requestId?: string): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      requestId,
    };
  }

  /**
   * Check if an error is an AppError
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }

  /**
   * Create from unknown error
   */
  static from(error: unknown, defaultCode: ErrorCode = ErrorCode.INTERNAL_ERROR): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError({
        code: defaultCode,
        message: error.message,
        cause: error,
      });
    }

    return new AppError({
      code: defaultCode,
      message: String(error),
    });
  }
}

// ============================================================================
// Error Factories
// ============================================================================

export const Errors = {
  // Auth
  authRequired: (message?: string) =>
    new AppError({ code: ErrorCode.AUTH_REQUIRED, message, statusCode: 401 }),

  invalidToken: (message?: string) =>
    new AppError({ code: ErrorCode.AUTH_INVALID_TOKEN, message, statusCode: 401 }),

  expiredToken: (message?: string) =>
    new AppError({ code: ErrorCode.AUTH_EXPIRED_TOKEN, message, statusCode: 401 }),

  invalidCredentials: (message?: string) =>
    new AppError({ code: ErrorCode.AUTH_INVALID_CREDENTIALS, message, statusCode: 401 }),

  // Authorization
  forbidden: (message?: string) =>
    new AppError({ code: ErrorCode.FORBIDDEN, message, statusCode: 403 }),

  adminRequired: (message?: string) =>
    new AppError({ code: ErrorCode.ADMIN_REQUIRED, message, statusCode: 403 }),

  // Validation
  validation: (details: Record<string, unknown>, message?: string) =>
    new AppError({ code: ErrorCode.VALIDATION_ERROR, message, details, statusCode: 400 }),

  invalidInput: (field: string, message?: string) =>
    new AppError({
      code: ErrorCode.INVALID_INPUT,
      message: message ?? `Invalid value for ${field}`,
      details: { field },
      statusCode: 400,
    }),

  // Resource
  notFound: (resource: string, id?: string | number) =>
    new AppError({
      code: ErrorCode.NOT_FOUND,
      message: id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      details: { resource, id },
      statusCode: 404,
    }),

  alreadyExists: (resource: string, message?: string) =>
    new AppError({
      code: ErrorCode.ALREADY_EXISTS,
      message: message ?? `${resource} already exists`,
      details: { resource },
      statusCode: 409,
    }),

  // Server
  internal: (message?: string, cause?: Error) =>
    new AppError({ code: ErrorCode.INTERNAL_ERROR, message, cause, statusCode: 500 }),

  database: (message?: string, cause?: Error) =>
    new AppError({ code: ErrorCode.DATABASE_ERROR, message, cause, statusCode: 500 }),

  unavailable: (message?: string) =>
    new AppError({ code: ErrorCode.SERVICE_UNAVAILABLE, message, statusCode: 503 }),

  // External
  external: (service: string, message?: string) =>
    new AppError({
      code: ErrorCode.EXTERNAL_SERVICE_ERROR,
      message: message ?? `${service} service error`,
      details: { service },
      statusCode: 502,
    }),

  rateLimited: (retryAfter?: number) =>
    new AppError({
      code: ErrorCode.RATE_LIMITED,
      details: retryAfter ? { retryAfter } : undefined,
      statusCode: 429,
    }),

  timeout: (operation?: string) =>
    new AppError({
      code: ErrorCode.TIMEOUT,
      message: operation ? `${operation} timed out` : undefined,
      details: operation ? { operation } : undefined,
      statusCode: 504,
    }),
};

// ============================================================================
// Utilities
// ============================================================================

/**
 * Map error code to HTTP status code
 */
function getHttpStatusForCode(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    // Auth (401)
    AUTH_REQUIRED: 401,
    AUTH_INVALID_TOKEN: 401,
    AUTH_EXPIRED_TOKEN: 401,
    AUTH_INVALID_CREDENTIALS: 401,

    // Authorization (403)
    FORBIDDEN: 403,
    ADMIN_REQUIRED: 403,
    INSUFFICIENT_PERMISSIONS: 403,

    // Validation (400)
    VALIDATION_ERROR: 400,
    INVALID_INPUT: 400,
    MISSING_REQUIRED_FIELD: 400,

    // Resource (4xx)
    NOT_FOUND: 404,
    ALREADY_EXISTS: 409,
    CONFLICT: 409,

    // Server (5xx)
    INTERNAL_ERROR: 500,
    DATABASE_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,

    // External (5xx)
    EXTERNAL_SERVICE_ERROR: 502,
    RATE_LIMITED: 429,
    TIMEOUT: 504,
  };

  return statusMap[code] ?? 500;
}

/**
 * Check if error is retryable
 */
const RETRYABLE_CODES: ErrorCode[] = [
  ErrorCode.SERVICE_UNAVAILABLE,
  ErrorCode.TIMEOUT,
  ErrorCode.RATE_LIMITED,
  ErrorCode.DATABASE_ERROR,
];

export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return RETRYABLE_CODES.includes(error.code);
  }
  return false;
}

/**
 * Extract error message for display
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Extract error code if available
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof AppError) {
    return error.code;
  }
  return undefined;
}
