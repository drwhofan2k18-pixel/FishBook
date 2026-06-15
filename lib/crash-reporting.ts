import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initCrashReporting() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) {
    console.error('Error:', error.message, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

export function setUser(userId: string, email?: string) {
  if (!SENTRY_DSN) return;
  Sentry.setUser({ id: userId, email });
}

export function clearUser() {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}

export { Sentry };
