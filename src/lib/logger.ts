type LogLevel = "error" | "warn" | "info";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string;
  orgId?: string;
  userId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  error(message: string, meta?: Record<string, unknown>) {
    emit("error", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    emit("warn", message, meta);
  },
  info(message: string, meta?: Record<string, unknown>) {
    emit("info", message, meta);
  },
};
