import fs from "fs";
import path from "path";

// =============================================================================
// Session Log Directory
// =============================================================================

// Session folder is created once when first accessed
let sessionLogDir: string | null = null;

/**
 * Get timestamp in format: YYYY-MM-DD_HH-mm-ss
 */
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

/**
 * Format timestamp for log entries: YYYY-MM-DD HH:mm:ss.SSS
 */
function formatLogTimestamp(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
}

/**
 * Get or create the session log directory.
 * Creates a timestamped folder like: logs/2026-02-03_14-30-45/
 * The same folder is returned for all calls during the app lifetime.
 */
export function getSessionLogDir(): string {
  if (!sessionLogDir) {
    const logsBaseDir = path.join(process.cwd(), ".logs");
    sessionLogDir = path.join(logsBaseDir, getTimestamp());
    fs.mkdirSync(sessionLogDir, { recursive: true });
  }
  return sessionLogDir;
}

// =============================================================================
// Logger
// =============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  // Foreground colors
  gray: "\x1b[90m",
  white: "\x1b[37m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  // Background colors
  bgCyan: "\x1b[46m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgRed: "\x1b[41m",
};

const levelStyles: Record<LogLevel, { badge: string; text: string }> = {
  debug: { badge: `${colors.gray}DEBUG${colors.reset}`, text: colors.gray },
  info: { badge: `${colors.cyan}INFO ${colors.reset}`, text: colors.white },
  warn: { badge: `${colors.yellow}${colors.bold}WARN ${colors.reset}`, text: colors.yellow },
  error: { badge: `${colors.red}${colors.bold}ERROR${colors.reset}`, text: colors.red },
};

const isDev = process.env.NODE_ENV !== "production";

class Logger {
  private sessionDir: string = "";
  private logFile: string = "";
  private errorFile: string = "";
  private minLevel: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";
  private initialized = false;

  /**
   * Initialize the logger with a timestamped session folder.
   * Call this once when the app starts.
   */
  init(): void {
    if (this.initialized) return;

    this.sessionDir = getSessionLogDir();
    this.logFile = path.join(this.sessionDir, "server.log");
    this.errorFile = path.join(this.sessionDir, "error.log");
    this.initialized = true;

    this.info("Logger", `Session started. Logs: ${this.sessionDir}`);
  }

  /** Get the current session directory path */
  getSessionDir(): string {
    return this.sessionDir;
  }

  /** Set minimum log level */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
    const timestamp = formatLogTimestamp();
    const levelStr = level.toUpperCase().padEnd(5);
    const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : "";
    return `[${timestamp}] [${levelStr}] [${context}] ${message}${dataStr}`;
  }

  private formatConsoleMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
    const timestamp = formatLogTimestamp();
    const style = levelStyles[level];
    const dataStr = data !== undefined ? ` ${colors.dim}${JSON.stringify(data)}${colors.reset}` : "";

    return `${colors.dim}${timestamp}${colors.reset} ${style.badge} ${colors.magenta}${context}${colors.reset} ${style.text}${message}${colors.reset}${dataStr}`;
  }

  private writeToFile(filePath: string, message: string): void {
    if (!this.initialized) return;
    try {
      fs.appendFileSync(filePath, message + "\n");
    } catch {
      // Silently fail if file writing fails
    }
  }

  private log(level: LogLevel, context: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    // Console output (colorful in dev mode)
    const consoleMessage = isDev
      ? this.formatConsoleMessage(level, context, message, data)
      : this.formatMessage(level, context, message, data);

    const consoleMethod =
      level === "error" ? console.error
      : level === "warn" ? console.warn
      : level === "debug" ? console.debug
      : console.log;
    consoleMethod(consoleMessage);

    // File output (plain text, no colors)
    const fileMessage = this.formatMessage(level, context, message, data);
    this.writeToFile(this.logFile, fileMessage);
    if (level === "error" || level === "warn") {
      this.writeToFile(this.errorFile, fileMessage);
    }
  }

  debug(context: string, message: string, data?: unknown): void {
    this.log("debug", context, message, data);
  }

  info(context: string, message: string, data?: unknown): void {
    this.log("info", context, message, data);
  }

  warn(context: string, message: string, data?: unknown): void {
    this.log("warn", context, message, data);
  }

  error(context: string, message: string, data?: unknown): void {
    this.log("error", context, message, data);
  }

  /** Create a child logger with a fixed context */
  child(context: string): ChildLogger {
    return new ChildLogger(this, context);
  }
}

class ChildLogger {
  constructor(
    private parent: Logger,
    private context: string
  ) {}

  debug(message: string, data?: unknown): void {
    this.parent.debug(this.context, message, data);
  }

  info(message: string, data?: unknown): void {
    this.parent.info(this.context, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.parent.warn(this.context, message, data);
  }

  error(message: string, data?: unknown): void {
    this.parent.error(this.context, message, data);
  }
}

// Singleton instance
export const logger = new Logger();

// Export types
export type { LogLevel, ChildLogger };
