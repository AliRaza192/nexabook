type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
  timestamp: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatLog(entry: LogEntry): string {
  const parts = [`[${entry.timestamp}]`, `[${entry.level.toUpperCase()}]`, entry.message];
  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context));
  }
  return parts.join(" ");
}

function createEntry(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): LogEntry {
  return {
    level,
    message,
    context,
    error,
    timestamp: new Date().toISOString(),
  };
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    if (!shouldLog("debug")) return;
    const entry = createEntry("debug", message, context);
    if (process.env.NODE_ENV === "development") {
      console.debug(formatLog(entry));
    }
  },

  info: (message: string, context?: Record<string, unknown>) => {
    if (!shouldLog("info")) return;
    const entry = createEntry("info", message, context);
    if (process.env.NODE_ENV === "development") {
      console.info(formatLog(entry));
    }
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    if (!shouldLog("warn")) return;
    const entry = createEntry("warn", message, context);
    console.warn(formatLog(entry));
  },

  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    if (!shouldLog("error")) return;
    const entry = createEntry("error", message, context, error);
    console.error(formatLog(entry), error || "");

    // In production, send to external monitoring service
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        fetch("/api/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        }).catch(() => {});
      } catch {}
    }
  },
};
