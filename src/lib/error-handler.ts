import { logger } from "@/lib/logger";

export function captureException(
  error: unknown,
  context: Record<string, unknown> = {},
): string {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(err.message, {
    stack: err.stack,
    ...context,
  });
  return err.message;
}
