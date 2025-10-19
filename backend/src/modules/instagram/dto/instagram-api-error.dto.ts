export interface InstagramApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
}

export class InstagramGraphApiException extends Error {
  public readonly error_user_msg?: string;

  constructor(
    message: string,
    public readonly code: number,
    public readonly type: string,
    public readonly subcode?: number,
    public readonly fbtraceId?: string,
    errorUserMsg?: string,
  ) {
    super(message);
    this.name = 'InstagramGraphApiException';
    this.error_user_msg = errorUserMsg;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InstagramGraphApiException);
    }
  }

  /**
   * Check if this is a rate limit error
   */
  isRateLimitError(): boolean {
    return (
      this.code === 4 || // Application request limit reached
      this.code === 32 || // User request limit reached
      this.type === 'OAuthException' ||
      this.code === 613 // Calls to this api have exceeded the rate limit
    );
  }

  /**
   * Check if access token is expired
   */
  isTokenExpired(): boolean {
    return (
      this.code === 190 || // Access token expired/invalid
      this.subcode === 463 || // Token expired
      this.subcode === 467 // Token validation error
    );
  }

  /**
   * Check if this is a permission error
   */
  isPermissionError(): boolean {
    return (
      this.code === 10 || // Permission denied
      this.code === 200 || // Permissions error
      this.code === 299 // Permission is not granted or has been removed
    );
  }

  /**
   * Check if error is retryable (temporary failures)
   */
  isRetryable(): boolean {
    return (
      this.code >= 500 || // Server errors
      this.code === 1 || // Unknown error (might be temporary)
      this.code === 2 || // Temporary service error
      this.code === 17 // User request limit
    );
  }

  /**
   * Check if user needs to re-authenticate
   */
  needsReauth(): boolean {
    return this.isTokenExpired() || this.isPermissionError();
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    if (this.error_user_msg) {
      return this.error_user_msg;
    }

    if (this.isRateLimitError()) {
      return 'Rate limit reached. Please try again later.';
    }

    if (this.isTokenExpired()) {
      return 'Your Instagram connection has expired. Please reconnect your account.';
    }

    if (this.isPermissionError()) {
      return 'Permission denied. Please ensure all required permissions are granted.';
    }

    return (
      this.message || 'An error occurred while communicating with Instagram.'
    );
  }

  /**
   * Convert to plain object for logging/serialization
   */
  toObject(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      subcode: this.subcode,
      fbtraceId: this.fbtraceId,
      userMessage: this.getUserMessage(),
      isRateLimitError: this.isRateLimitError(),
      isTokenExpired: this.isTokenExpired(),
      isPermissionError: this.isPermissionError(),
      isRetryable: this.isRetryable(),
    };
  }
}
