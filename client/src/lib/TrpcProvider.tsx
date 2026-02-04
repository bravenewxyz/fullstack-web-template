/**
 * tRPC Provider with Error Handling
 * 
 * Integrates with toast notifications for user feedback.
 */

import { trpc } from "@/lib/trpc";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { useState, type ReactNode } from "react";
import superjson from "superjson";
import { toast } from "sonner";
import { ErrorCode, getErrorMessage } from "@shared/errors";

// Error codes that should show a toast
const TOAST_ERROR_CODES = new Set([
  ErrorCode.AUTH_REQUIRED,
  ErrorCode.AUTH_EXPIRED_TOKEN,
  ErrorCode.FORBIDDEN,
  ErrorCode.ADMIN_REQUIRED,
  ErrorCode.NOT_FOUND,
  ErrorCode.RATE_LIMITED,
  ErrorCode.SERVICE_UNAVAILABLE,
]);

// Error codes that should NOT show a toast (handled elsewhere)
const SILENT_ERROR_CODES = new Set([
  ErrorCode.VALIDATION_ERROR, // Form handles these
  ErrorCode.INVALID_INPUT,    // Form handles these
]);

interface TRPCErrorData {
  code?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Extract error info from tRPC error
 */
function extractErrorInfo(error: TRPCClientError<unknown>): {
  code: string | undefined;
  message: string;
  details: Record<string, unknown> | undefined;
} {
  const data = error.data as TRPCErrorData | undefined;
  return {
    code: data?.code,
    message: error.message,
    details: data?.details,
  };
}

/**
 * Handle API error with toast notification
 */
function handleApiError(error: TRPCClientError<unknown>, type: "query" | "mutation") {
  const { code, message } = extractErrorInfo(error);

  // Log all errors
  console.error(`[API ${type === "query" ? "Query" : "Mutation"} Error]`, {
    code,
    message,
    error,
  });

  // Skip toast for silent errors
  if (code && SILENT_ERROR_CODES.has(code as ErrorCode)) {
    return;
  }

  // Show toast for specific errors or mutations
  const shouldToast =
    type === "mutation" || // Always toast mutation errors
    (code && TOAST_ERROR_CODES.has(code as ErrorCode));

  if (shouldToast) {
    const title = code ? `Error (${code})` : "Error";
    toast.error(title, {
      description: message,
      duration: 5000,
    });
  }
}

export function TrpcProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: (failureCount, error) => {
            // Don't retry auth errors
            if (error instanceof TRPCClientError) {
              const { code } = extractErrorInfo(error);
              if (
                code === ErrorCode.AUTH_REQUIRED ||
                code === ErrorCode.AUTH_EXPIRED_TOKEN ||
                code === ErrorCode.FORBIDDEN
              ) {
                return false;
              }
            }
            // Retry up to 2 times for other errors
            return failureCount < 2;
          },
          staleTime: 1000 * 60, // 1 minute
        },
        mutations: {
          retry: false, // Don't retry mutations by default
        },
      },
    });

    // Subscribe to query errors
    client.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        const error = event.query.state.error;
        if (error instanceof TRPCClientError) {
          handleApiError(error, "query");
        }
      }
    });

    // Subscribe to mutation errors
    client.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        const error = event.mutation.state.error;
        if (error instanceof TRPCClientError) {
          handleApiError(error, "mutation");
        }
      }
    });

    return client;
  });

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          async headers() {
            if (!isSupabaseConfigured) {
              return {};
            }
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session?.access_token) {
              return {
                Authorization: `Bearer ${session.access_token}`,
              };
            }
            return {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
