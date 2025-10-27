import { Module } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';

@Module({
  providers: [
    MetricsService,
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    makeCounterProvider({
      name: 'instagram_posts_published_total',
      help: 'Total number of Instagram posts published',
      labelNames: ['status'],
    }),
    makeCounterProvider({
      name: 'webhook_events_processed_total',
      help: 'Total number of webhook events processed',
      labelNames: ['event', 'status'],
    }),
    makeCounterProvider({
      name: 'queue_jobs_completed_total',
      help: 'Total number of queue jobs completed',
      labelNames: ['queue', 'job'],
    }),
    makeCounterProvider({
      name: 'queue_jobs_failed_total',
      help: 'Total number of queue jobs failed',
      labelNames: ['queue', 'job'],
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
