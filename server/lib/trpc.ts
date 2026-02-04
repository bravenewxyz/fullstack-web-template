/**
 * tRPC Server Setup
 * 
 * Configured with standardized error handling.
 */

import { AppError, ErrorCode, Errors } from "@shared/errors";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Extract AppError details if available
    const cause = error.cause;
    const appError = cause instanceof AppError ? cause : null;

    return {
      ...shape,
      data: {
        ...shape.data,
        // Add standardized error info
        code: appError?.code ?? shape.data.code,
        details: appError?.details,
        timestamp: appError?.timestamp ?? new Date().toISOString(),
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Convert AppError to TRPCError
 */
function toTRPCError(error: AppError): TRPCError {
  const codeMap: Record<number, TRPCError["code"]> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_SERVER_ERROR",
    502: "BAD_GATEWAY",
    503: "INTERNAL_SERVER_ERROR",
    504: "TIMEOUT",
  };

  return new TRPCError({
    code: codeMap[error.statusCode] ?? "INTERNAL_SERVER_ERROR",
    message: error.message,
    cause: error,
  });
}

/**
 * Middleware that requires authenticated user
 */
const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw toTRPCError(Errors.authRequired());
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Middleware that requires admin role
 */
const requireAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw toTRPCError(Errors.authRequired());
  }

  if (ctx.user.role !== "admin") {
    throw toTRPCError(Errors.adminRequired());
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Error handling middleware - wraps procedures to catch and format errors
 */
const errorHandler = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // If it's already a TRPCError, rethrow
    if (error instanceof TRPCError) {
      throw error;
    }

    // Convert AppError to TRPCError
    if (error instanceof AppError) {
      throw toTRPCError(error);
    }

    // Wrap unknown errors
    const appError = AppError.from(error, ErrorCode.INTERNAL_ERROR);
    throw toTRPCError(appError);
  }
});

// Procedure types with error handling
export const protectedProcedure = t.procedure.use(errorHandler).use(requireUser);
export const adminProcedure = t.procedure.use(errorHandler).use(requireAdmin);

// Re-export for convenience
export { Errors, AppError, ErrorCode };
