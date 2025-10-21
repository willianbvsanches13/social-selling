import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_requests_total')
    public requestCounter: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    public requestDuration: Histogram<string>,

    @InjectMetric('instagram_posts_published_total')
    public instagramPostsCounter: Counter<string>,

    @InjectMetric('webhook_events_processed_total')
    public webhookEventsCounter: Counter<string>,

    @InjectMetric('queue_jobs_completed_total')
    public queueJobsCompletedCounter: Counter<string>,

    @InjectMetric('queue_jobs_failed_total')
    public queueJobsFailedCounter: Counter<string>,
  ) {}

  /**
   * Record HTTP request metrics
   */
  recordRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
  ) {
    this.requestCounter.inc({
      method,
      path,
      status_code: statusCode,
    });

    this.requestDuration.observe(
      {
        method,
        path,
        status_code: statusCode,
      },
      duration / 1000, // Convert to seconds
    );
  }

  /**
   * Record Instagram post publication
   */
  recordInstagramPost(status: 'success' | 'failed') {
    this.instagramPostsCounter.inc({ status });
  }

  /**
   * Record webhook event processing
   */
  recordWebhookEvent(event: string, status: 'success' | 'failed') {
    this.webhookEventsCounter.inc({ event, status });
  }

  /**
   * Record queue job completion
   */
  recordQueueJobCompleted(queue: string, job: string) {
    this.queueJobsCompletedCounter.inc({ queue, job });
  }

  /**
   * Record queue job failure
   */
  recordQueueJobFailed(queue: string, job: string) {
    this.queueJobsFailedCounter.inc({ queue, job });
  }
}
