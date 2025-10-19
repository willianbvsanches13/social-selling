export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId: string;
  code?: string;
  details?: Record<string, any>;
  stack?: string; // Only in development
}

export interface ValidationErrorResponse extends ErrorResponse {
  validationErrors: ValidationError[];
}

export interface ValidationError {
  field: string;
  constraints: Record<string, string>;
  value?: any;
}
