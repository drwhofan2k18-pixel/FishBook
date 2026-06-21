const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initCrashReporting() {
  if (!SENTRY_DSN) return;
  // Sentry will be added when a DSN is configured.
  // Install @sentry/react-native and uncomment below:
  // import * as Sentry from '@sentry/react-native';
  // Sentry.init({ dsn: SENTRY_DSN, ... });
  console.log('[CrashReporting] Sentry not configured — crash reporting disabled');
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error('[CrashReporting]', error.message, context);
}

export function setUser(_userId: string, _email?: string) {
  // No-op until Sentry is configured
}

export function clearUser() {
  // No-op until Sentry is configured
}
