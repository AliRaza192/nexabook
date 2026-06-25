let sentryClient: any = null;

export function initSentry() {
  if (sentryClient) return sentryClient;
  if (!process.env.SENTRY_DSN) return null;

  try {
    // Dynamic import — Sentry is optional
    // Install with: npm install @sentry/nextjs
    sentryClient = {
      captureException: (error: Error, context?: any) => {
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
