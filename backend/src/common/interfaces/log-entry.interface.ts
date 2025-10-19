export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  error?: ErrorMetadata;
  performance?: PerformanceMetadata;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug' | 'verbose';

export interface ErrorMetadata {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

export interface PerformanceMetadata {
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure';
  requestId: string;
}
