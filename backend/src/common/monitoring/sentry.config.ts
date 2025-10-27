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
    integrations: [
      nodeProfilingIntegration(),
      Sentry.httpIntegration({
        // Don't track health check requests
        ignoreIncomingRequests: (url) => {
          return (
            url.includes('/health') ||
            url.includes('/health/ready') ||
            url.includes('/health/live')
          );
        },
      }),
    ],

    // Error filtering
    beforeSend(event, hint) {
      // Filter out health check requests
      if (event.request?.url) {
        const url = event.request.url;
        if (
          url.includes('/health') ||
          url.includes('/health/ready') ||
          url.includes('/health/live')
        ) {
          return null;
        }
      }

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

        // Don't send Service Unavailable from health checks
        if (
          error.message.includes('Service Unavailable') &&
          error.message.includes('health')
        ) {
          return null;
        }
      }

      return event;
    },

    // Ignore health check transactions in performance monitoring
    beforeSendTransaction(event) {
      if (event.transaction) {
        if (
          event.transaction.includes('/health') ||
          event.transaction.includes('GET /health')
        ) {
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
