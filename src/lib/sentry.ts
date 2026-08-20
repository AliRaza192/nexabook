interface SentryClient {
  captureException: (error: Error, context?: Record<string, unknown>) => void;
  setUser: (user: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
}

let sentryClient: SentryClient | null = null;

export function initSentry(): SentryClient | null {
  if (sentryClient) return sentryClient;
  if (!process.env.SENTRY_DSN) return null;

  try {
    sentryClient = {
      captureException: (error: Error, context?: Record<string, unknown>) => {
        if (process.env.NODE_ENV === "production") {
          console.error("[Sentry]", error.message, context);
        }
      },
      setUser: () => {},
      setTag: () => {},
    };
    return sentryClient;
  } catch {
    return null;
  }
}
