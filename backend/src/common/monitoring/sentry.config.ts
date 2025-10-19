import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initializeSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '1.0.0',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [nodeProfilingIntegration(), Sentry.httpIntegration()],

    // Error filtering
    beforeSend(event, hint) {
      // Filter out specific errors
      const error = hint.originalException;

      if (error instanceof Error) {
        // Don't send validation errors
        if (error.message.includes('Validation failed')) {
          return null;
        }

        // Don't send 404 errors
        if (error.message.includes('Not Found')) {
          return null;
        }
      }

      return event;
    },

    // Add custom tags
    initialScope: {
      tags: {
        service: 'backend-api',
      },
    },
  });

  console.log('✅ Sentry initialized');
}
