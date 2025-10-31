export interface HttpRequestLog {
  id: string;
  method: string;
  url: string;
  path: string;
  query_params?: Record<string, any>;
  request_headers?: Record<string, any>;
  response_headers?: Record<string, any>;
  request_body?: any;
  response_body?: any;
  status_code?: number;
  response_time_ms?: number;
  error_message?: string;
  error_stack?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface CreateHttpRequestLogDto {
  method: string;
  url: string;
  path: string;
  query_params?: Record<string, any>;
  request_headers?: Record<string, any>;
  response_headers?: Record<string, any>;
  request_body?: any;
  response_body?: any;
  status_code?: number;
  response_time_ms?: number;
  error_message?: string;
  error_stack?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
}
