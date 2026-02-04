/**
 * Error Boundary Component
 * 
 * Catches React errors and displays a user-friendly error page.
 * Integrates with standardized error codes.
 */

import { cn } from "@/lib/utils";
import { Warning, ArrowCounterClockwise, House, Copy, Check } from "@phosphor-icons/react";
import { Component, ReactNode, useState } from "react";
import { Button } from "./ui/button";
import { AppError, getErrorCode, getErrorMessage } from "@shared/errors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Functional component for copy button (needs hooks)
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-2 rounded hover:bg-muted-foreground/10 transition-colors"
      title="Copy error details"
    >
      {copied ? (
        <Check size={16} className="text-green-500" />
      ) : (
        <Copy size={16} className="text-muted-foreground" />
      )}
    </button>
  );
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console with full details
    console.error("[ErrorBoundary] Caught error:", {
      error,
      componentStack: errorInfo.componentStack,
      errorCode: getErrorCode(error),
    });

    // Here you could also send to error tracking service (e.g., Sentry)
    // if (ENV.isProduction) {
    //   captureException(error, { extra: errorInfo });
    // }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const errorCode = getErrorCode(error);
      const errorMessage = getErrorMessage(error);
      const isAppError = error instanceof AppError;
      const timestamp = isAppError ? error.timestamp : new Date().toISOString();

      // Build error details for copying
      const errorDetails = [
        `Error: ${errorMessage}`,
        errorCode ? `Code: ${errorCode}` : null,
        `Timestamp: ${timestamp}`,
        `URL: ${window.location.href}`,
        "",
        "Stack trace:",
        error?.stack ?? "No stack trace available",
      ]
        .filter(Boolean)
        .join("\n");

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4 sm:p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl">
            {/* Icon */}
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <Warning size={32} className="text-destructive" weight="fill" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold mb-2 text-center">
              Something went wrong
            </h1>

            {/* Error code badge */}
            {errorCode && (
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-mono mb-4">
                {errorCode}
              </span>
            )}

            {/* Error message */}
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {errorMessage}
            </p>

            {/* Error details (collapsible) */}
            <details className="w-full mb-6 group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Technical details
              </summary>
              <div className="relative mt-2">
                <CopyButton text={errorDetails} />
                <pre className="p-4 rounded-lg bg-muted overflow-auto text-xs text-muted-foreground max-h-64 whitespace-pre-wrap">
                  {errorDetails}
                </pre>
              </div>
            </details>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="gap-2"
              >
                <ArrowCounterClockwise size={16} />
                Try Again
              </Button>
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="gap-2"
              >
                <ArrowCounterClockwise size={16} />
                Reload Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="gap-2"
              >
                <House size={16} />
                Go Home
              </Button>
            </div>

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground mt-6">
              {new Date(timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Hook to manually trigger error boundary
 * Useful for handling async errors in event handlers
 */
export function useErrorBoundary() {
  const [, setError] = useState<Error | null>(null);

  return {
    showBoundary: (error: Error) => {
      setError(() => {
        throw error;
      });
    },
  };
}
