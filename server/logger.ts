/**
 * Structured logging module for CRStats.
 *
 * - Production: JSON output (one JSON object per line) for log aggregators.
 * - Development: human-readable, coloured output.
 *
 * Every log entry carries at least: level, msg, timestamp.
 * Request-scoped entries also carry requestId when available.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isProduction = process.env.NODE_ENV === "production";
const configuredLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (isProduction ? "info" : "debug");

interface LogEntry {
  level: LogLevel;
  msg: string;
  timestamp: string;
  [key: string]: unknown;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[configuredLevel];
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

function formatDev(entry: LogEntry): string {
  const { level, msg, timestamp, ...rest } = entry;
  const color = LEVEL_COLORS[level];
  const time = new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `${time} ${color}${level.toUpperCase().padEnd(5)}${RESET} ${msg}${extra}`;
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  if (isProduction) {
    // Structured JSON -- one line per entry
    const stream = entry.level === "error" ? process.stderr : process.stdout;
    stream.write(JSON.stringify(entry) + "\n");
  } else {
    // Human-readable for development
    const stream = entry.level === "error" ? console.error : console.log;
    stream(formatDev(entry));
  }
}

function createEntry(level: LogLevel, msg: string, extra?: Record<string, unknown>): LogEntry {
  return {
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

/** Core logger -- use for application-wide (non-request) logging. */
export const logger = {
  debug(msg: string, extra?: Record<string, unknown>) {
    emit(createEntry("debug", msg, extra));
  },
  info(msg: string, extra?: Record<string, unknown>) {
    emit(createEntry("info", msg, extra));
  },
  warn(msg: string, extra?: Record<string, unknown>) {
    emit(createEntry("warn", msg, extra));
  },
  error(msg: string, extra?: Record<string, unknown>) {
    emit(createEntry("error", msg, extra));
  },
};

/**
 * Create a child logger scoped to a request.
 * All entries emitted through it automatically include the requestId.
 */
export function createRequestLogger(requestId: string) {
  function withRequestId(extra?: Record<string, unknown>): Record<string, unknown> {
    return { requestId, ...extra };
  }

  return {
    debug(msg: string, extra?: Record<string, unknown>) {
      emit(createEntry("debug", msg, withRequestId(extra)));
    },
    info(msg: string, extra?: Record<string, unknown>) {
      emit(createEntry("info", msg, withRequestId(extra)));
    },
    warn(msg: string, extra?: Record<string, unknown>) {
      emit(createEntry("warn", msg, withRequestId(extra)));
    },
    error(msg: string, extra?: Record<string, unknown>) {
      emit(createEntry("error", msg, withRequestId(extra)));
    },
  };
}

export type RequestLogger = ReturnType<typeof createRequestLogger>;
