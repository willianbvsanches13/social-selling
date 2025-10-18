# FE-012: Error Handling & Toast Notifications

## Epic
Frontend Development - Phase 3

## Story
As a user, I want clear, helpful error messages and notifications when things go wrong or actions succeed so that I understand what happened and what I can do about it, ensuring a smooth and frustration-free experience.

## Description
Build a comprehensive error handling and notification system that includes React Error Boundaries, toast notifications, custom error pages, network error detection, automatic retry logic, loading states, skeleton screens, offline mode detection, API error mapping, and integration with Sentry for error logging.

## Priority
CRITICAL

## Estimated Story Points
13

## Acceptance Criteria

1. **React Error Boundary Component**
   - Global error boundary wrapping the entire app
   - Section-specific error boundaries for critical areas
   - Catch and display JavaScript errors gracefully
   - Error fallback UI with helpful message
   - "Report Problem" button that logs to Sentry
   - "Try Again" button to reset error boundary
   - Component stack trace in development mode
   - Different fallback UIs for different error types
   - Error boundary for async components (Suspense)
   - Prevent error boundary cascade (child errors don't trigger parent)

2. **Toast Notification System (react-hot-toast)**
   - Success toast: Green background, check icon, auto-dismiss
   - Error toast: Red background, X icon, longer duration
   - Warning toast: Yellow background, warning icon
   - Info toast: Blue background, info icon
   - Custom toast with custom JSX content
   - Toast position: top-center, top-right, bottom-center, bottom-right
   - Toast duration configuration (default 3s, error 5s)
   - Multiple toasts stacking
   - Dismiss toast on click
   - Dismiss all toasts button
   - Toast with action button
   - Toast with loading spinner
   - Promise-based toast (loading → success/error)
   - Custom toast animations

3. **Custom Error Pages**
   - **404 Page**: Not Found with helpful navigation links
   - **500 Page**: Internal Server Error with support contact
   - **403 Page**: Forbidden with permission explanation
   - **401 Page**: Unauthorized with login redirect
   - Custom illustrations for each error type
   - Search bar to find content on 404
   - "Go Home" and "Go Back" buttons
   - Recent pages/suggestions on 404
   - Report button for unexpected errors
   - Breadcrumb showing current location

4. **Network Error Detection and Handling**
   - Detect network connection loss
   - Show offline banner when disconnected
   - Queue failed requests for retry when online
   - "You are offline" toast notification
   - Pause auto-refresh/polling when offline
   - Resume operations when connection restored
   - Visual indicator of connection status
   - Retry button for failed requests
   - Save draft data locally when offline
   - Sync pending changes when online

5. **Automatic Retry with Exponential Backoff**
   - Retry failed API requests automatically
   - Exponential backoff algorithm: 1s, 2s, 4s, 8s
   - Maximum retry attempts: 3 (configurable)
   - Retry only on retryable errors (5xx, network errors)
   - Don't retry on client errors (4xx)
   - Show retry attempt count to user
   - Cancel retry option
   - Jitter to prevent thundering herd
   - Per-endpoint retry configuration
   - Circuit breaker pattern for repeated failures

6. **Global Loading Spinner/Overlay**
   - Full-screen loading overlay for critical operations
   - Semi-transparent backdrop
   - Animated spinner in center
   - Optional loading message
   - Progress percentage display (if available)
   - Cancel button for long operations
   - Prevent user interaction during loading
   - Z-index management to stay on top
   - Smooth fade in/out animations
   - Accessible loading announcements

7. **Skeleton Loading States**
   - Skeleton screens for list items
   - Skeleton for card components
   - Skeleton for table rows
   - Skeleton for images
   - Skeleton for text blocks
   - Animated shimmer effect
   - Maintain layout during loading (no layout shift)
   - Match actual content dimensions
   - Different skeletons for different components
   - Transition smoothly to real content

8. **Offline Mode Detection**
   - Detect browser online/offline events
   - Check actual connectivity (ping endpoint)
   - Offline indicator in header/footer
   - Disable features requiring network
   - Enable read-only mode when offline
   - Cache critical data for offline access
   - Service worker for offline support
   - Background sync for queued actions
   - Offline-first data strategy
   - User notification when going offline/online

9. **API Error Code Mapping to User Messages**
   - Map HTTP status codes to messages
   - Map custom error codes from API
   - User-friendly error messages (avoid technical jargon)
   - Actionable error messages (what user can do)
   - Error message localization support
   - Context-aware error messages
   - Error code reference documentation
   - Developer mode showing raw errors
   - Validation error field mapping
   - Bulk error handling for forms

10. **Error Logging to Sentry**
    - Initialize Sentry SDK
    - Automatic error capture
    - Manual error logging
    - User context (ID, email, username)
    - Session replay on errors
    - Breadcrumbs tracking user actions
    - Custom tags and context
    - Environment tagging (dev, staging, prod)
    - Release tracking
    - Performance monitoring
    - Source maps for production errors
    - Privacy controls (PII filtering)

11. **Form Validation Error Display**
    - Inline field errors below inputs
    - Error icon next to invalid fields
    - Red border on invalid fields
    - Error summary at top of form
    - Scroll to first error field
    - Clear errors on field change
    - Real-time validation feedback
    - Accessible error announcements
    - Multi-field validation errors
    - Server-side validation error mapping

12. **Rate Limit Error Handling**
    - Detect 429 Too Many Requests
    - Show rate limit exceeded message
    - Display cooldown timer
    - Automatic retry after cooldown
    - Suggest alternative actions
    - Queue requests if possible
    - User notification with retry time

13. **Authentication Error Handling**
    - Detect 401 Unauthorized
    - Redirect to login page
    - Preserve intended destination
    - Show session expired message
    - Refresh token automatically
    - Re-authenticate modal
    - Logout and clear state
    - Handle concurrent 401s gracefully

14. **Validation Error Aggregation**
    - Collect multiple validation errors
    - Display all errors at once
    - Group errors by field
    - Priority ordering of errors
    - Error count indicator
    - Expand/collapse error details
    - Fix all vs fix one at a time

15. **Graceful Degradation**
    - Fallback UI for failed components
    - Partial page loading on errors
    - Continue showing cached data
    - Disable affected features only
    - Alternative content suggestions
    - Reduced functionality mode
    - Progressive enhancement

16. **Error Recovery Actions**
    - Retry button on error messages
    - Clear cache and retry
    - Refresh page option
    - Contact support button
    - Report bug button
    - Alternative action suggestions
    - Undo failed action
    - Rollback to previous state

17. **Loading State Management**
    - Prevent duplicate requests
    - Cancel in-flight requests
    - Debounce rapid requests
    - Request deduplication
    - Loading state coordination
    - Prevent race conditions
    - Request timeout handling

18. **Error Analytics and Monitoring**
    - Track error frequency
    - Error categorization
    - User impact metrics
    - Error trend analysis
    - Alert on error spikes
    - Custom error dashboards
    - Error resolution tracking

19. **Timeout Error Handling**
    - Request timeout configuration
    - Timeout error detection
    - User notification on timeout
    - Increase timeout option
    - Retry with longer timeout
    - Background processing for long operations
    - Progress updates for long operations

20. **CORS Error Handling**
    - Detect CORS errors
    - User-friendly CORS message
    - Suggest contacting support
    - Developer documentation link
    - Fallback to JSONP if applicable
    - Proxy option suggestion

21. **File Upload Error Handling**
    - File size validation
    - File type validation
    - Upload progress tracking
    - Upload failure recovery
    - Resume failed uploads
    - Partial upload handling
    - Corrupt file detection
    - Virus scan integration

22. **Optimistic UI Error Handling**
    - Rollback on error
    - Show error on optimistic update
    - Retry optimistic action
    - Manual reconciliation UI
    - Conflict resolution
    - State sync verification

## Technical Implementation Details

### Component Structure

```typescript
// src/components/ErrorBoundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  level?: 'global' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      level: this.props.level === 'global' ? 'fatal' : 'error',
    });

    this.setState({
      errorInfo,
    });

    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReportProblem = () => {
    if (this.state.error) {
      const eventId = Sentry.captureException(this.state.error);
      Sentry.showReportDialog({ eventId });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component' } = this.props;

      // Component-level error: minimal fallback
      if (level === 'component') {
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Something went wrong
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  This component failed to load. Please try again.
                </p>
                <button
                  onClick={this.handleReset}
                  className="mt-2 text-sm text-red-800 hover:text-red-900 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Section/Global error: full page fallback
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-600 mb-6">
              {level === 'global'
                ? "We're sorry, but something unexpected happened. Our team has been notified and is working on a fix."
                : 'This section encountered an error. Please try refreshing or come back later.'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
                <p className="text-xs font-mono text-gray-800 mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                      Component Stack
                    </summary>
                    <pre className="mt-2 text-gray-700 overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>

            <button
              onClick={this.handleReportProblem}
              className="mt-4 text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1 mx-auto"
            >
              <Mail className="w-4 h-4" />
              Report Problem
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

```typescript
// src/lib/toast.tsx
import toast, { Toaster as HotToaster } from 'react-hot-toast';
import { Check, X, AlertTriangle, Info, Loader2 } from 'lucide-react';

const iconMap = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const colorMap = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  loading: 'bg-gray-50 text-gray-800 border-gray-200',
};

const iconColorMap = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600',
  loading: 'text-gray-600',
};

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const showToast = ({
  message,
  type = 'info',
  duration,
  action,
}: ToastOptions) => {
  const Icon = iconMap[type];

  return toast.custom(
    (t) => (
      <div
        className={`
          max-w-md w-full shadow-lg rounded-lg border p-4
          ${colorMap[type]}
          ${t.visible ? 'animate-enter' : 'animate-leave'}
        `}
      >
        <div className="flex items-start gap-3">
          <Icon
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              type === 'loading' ? 'animate-spin' : ''
            } ${iconColorMap[type]}`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{message}</p>
            {action && (
              <button
                onClick={() => {
                  action.onClick();
                  toast.dismiss(t.id);
                }}
                className="mt-2 text-sm font-medium underline hover:no-underline"
              >
                {action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    ),
    { duration: duration || (type === 'error' ? 5000 : 3000) }
  );
};

export const toastSuccess = (message: string, duration?: number) => {
  return showToast({ message, type: 'success', duration });
};

export const toastError = (message: string, duration?: number) => {
  return showToast({ message, type: 'error', duration });
};

export const toastWarning = (message: string, duration?: number) => {
  return showToast({ message, type: 'warning', duration });
};

export const toastInfo = (message: string, duration?: number) => {
  return showToast({ message, type: 'info', duration });
};

export const toastLoading = (message: string) => {
  return showToast({ message, type: 'loading', duration: Infinity });
};

export const toastPromise = async <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
): Promise<T> => {
  const loadingToast = toastLoading(messages.loading);

  try {
    const data = await promise;
    toast.dismiss(loadingToast);
    toastSuccess(
      typeof messages.success === 'function'
        ? messages.success(data)
        : messages.success
    );
    return data;
  } catch (error) {
    toast.dismiss(loadingToast);
    toastError(
      typeof messages.error === 'function'
        ? messages.error(error as Error)
        : messages.error
    );
    throw error;
  }
};

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        className: '',
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
        },
      }}
    />
  );
}
```

```typescript
// src/app/not-found.tsx
import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
          <div className="relative -mt-16">
            <svg
              className="w-48 h-48 mx-auto text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for content..."
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Popular Links */}
        <div className="mt-12">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            Popular Pages
          </h3>
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="block text-sm text-blue-600 hover:underline"
            >
              Dashboard
            </Link>
            <Link
              href="/posts"
              className="block text-sm text-blue-600 hover:underline"
            >
              Posts
            </Link>
            <Link
              href="/analytics"
              className="block text-sm text-blue-600 hover:underline"
            >
              Analytics
            </Link>
            <Link
              href="/settings"
              className="block text-sm text-blue-600 hover:underline"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// src/lib/apiClient.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as Sentry from '@sentry/nextjs';
import { toastError } from './toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = crypto.randomUUID();

    return config;
  },
  (error) => {
    Sentry.captureException(error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Network error
    if (!error.response) {
      toastError('Network error. Please check your connection.');
      Sentry.captureException(error, {
        tags: { error_type: 'network' },
      });
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // 401 Unauthorized - Redirect to login
    if (status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 403 Forbidden
    if (status === 403) {
      toastError('You don't have permission to perform this action.');
      return Promise.reject(error);
    }

    // 404 Not Found
    if (status === 404) {
      toastError('The requested resource was not found.');
      return Promise.reject(error);
    }

    // 429 Rate Limited
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      toastError(`Too many requests. Please try again in ${retryAfter} seconds.`);
      return Promise.reject(error);
    }

    // 500+ Server errors - Retry with exponential backoff
    if (status >= 500 && !originalRequest._retry) {
      originalRequest._retry = true;

      const maxRetries = 3;
      const baseDelay = 1000;

      for (let i = 0; i < maxRetries; i++) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000; // Jitter
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
          return await apiClient(originalRequest);
        } catch (retryError) {
          if (i === maxRetries - 1) {
            toastError('Server error. Please try again later.');
            Sentry.captureException(error, {
              tags: { error_type: 'server', retry_count: maxRetries },
            });
            return Promise.reject(retryError);
          }
        }
      }
    }

    // API error with custom message
    const errorMessage = (data as any)?.message || 'An unexpected error occurred.';
    toastError(errorMessage);

    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        error_type: 'api',
        status_code: status,
      },
      contexts: {
        response: {
          status,
          data,
        },
      },
    });

    return Promise.reject(error);
  }
);

export default apiClient;
```

```typescript
// src/components/LoadingSpinner.tsx
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({
  message,
  fullScreen = false,
  size = 'md',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} text-blue-600 animate-spin`} />
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
```

```typescript
// src/components/SkeletonLoader.tsx
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-12 bg-gray-100 border-b border-gray-200" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-16 border-b border-gray-200 px-6 flex items-center gap-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/5" />
          <div className="h-4 bg-gray-200 rounded w-1/6" />
        </div>
      ))}
    </div>
  );
}
```

```typescript
// src/hooks/useOnlineStatus.ts
import { useState, useEffect } from 'react';
import { toastInfo, toastWarning } from '@/lib/toast';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toastInfo('You are back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toastWarning('You are offline. Some features may be unavailable.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check
    const interval = setInterval(async () => {
      try {
        await fetch('/api/health', { method: 'HEAD' });
        if (!isOnline) {
          setIsOnline(true);
          toastInfo('Connection restored');
        }
      } catch {
        if (isOnline) {
          setIsOnline(false);
          toastWarning('Connection lost');
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  return isOnline;
}
```

## Testing Requirements

### Unit Tests
- Test ErrorBoundary catches errors
- Test toast notifications display correctly
- Test retry logic with exponential backoff
- Test online/offline detection
- Test error message mapping

### Integration Tests
- Test API error handling flow
- Test network error recovery
- Test 401 redirect to login
- Test rate limiting handling
- Test form validation errors

### E2E Tests
- Test error boundary fallback UI
- Test toast notifications on actions
- Test custom error pages (404, 500)
- Test offline mode behavior
- Test retry mechanism

## Dependencies
```json
{
  "react-hot-toast": "^2.4.1",
  "@sentry/nextjs": "^7.100.0",
  "axios": "^1.6.0",
  "lucide-react": "^0.300.0"
}
```

## Definition of Done
- [ ] All 22 acceptance criteria implemented
- [ ] Error boundaries in place
- [ ] Toast notification system working
- [ ] Custom error pages created
- [ ] Network error detection
- [ ] Automatic retry implemented
- [ ] Loading states and skeletons
- [ ] Offline mode support
- [ ] API error mapping
- [ ] Sentry integration
- [ ] Comprehensive error handling
- [ ] Unit tests with >80% coverage
- [ ] Integration tests passing
- [ ] E2E tests covering error scenarios
- [ ] Error logging and monitoring
- [ ] Code review completed
- [ ] Documentation updated

## Notes
- Configure Sentry DSN in environment variables
- Set up error alerting thresholds
- Create error handling documentation
- Implement error recovery strategies
- Add user feedback collection on errors
- Monitor error rates in production
- Regularly review and improve error messages
