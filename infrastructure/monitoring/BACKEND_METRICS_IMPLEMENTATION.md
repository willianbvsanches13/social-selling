# Backend Metrics Implementation Guide

This document provides step-by-step instructions for implementing Prometheus metrics in the NestJS backend application.

## Prerequisites

- NestJS backend application initialized (BE-001 completed)
- prom-client library installed: `npm install prom-client`
- Docker Compose monitoring stack running

## Implementation Steps

### Step 1: Create Metrics Service

Create the file `backend/src/infrastructure/monitoring/metrics.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;
  private activeConnections: Gauge;

  constructor() {
    // Collect default metrics (CPU, memory, event loop, etc.)
    collectDefaultMetrics({
      prefix: 'social_selling_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // HTTP Requests Counter
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    });

    // HTTP Request Duration Histogram
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5], // 100ms, 500ms, 1s, 2s, 5s
    });

    // Active WebSocket Connections Gauge
    this.activeConnections = new Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
    });
  }

  /**
   * Increment HTTP request counter
   */
  incrementHttpRequests(method: string, path: string, status: number) {
    this.httpRequestsTotal.inc({ method, path, status });
  }

  /**
   * Observe HTTP request duration
   */
  observeHttpDuration(method: string, path: string, status: number, duration: number) {
    this.httpRequestDuration.observe({ method, path, status }, duration);
  }

  /**
   * Set active WebSocket connections
   */
  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  /**
   * Increment active connections
   */
  incrementActiveConnections() {
    this.activeConnections.inc();
  }

  /**
   * Decrement active connections
   */
  decrementActiveConnections() {
    this.activeConnections.dec();
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get content type for metrics
   */
  getContentType(): string {
    return register.contentType;
  }
}
```

### Step 2: Create Metrics Module

Create the file `backend/src/infrastructure/monitoring/metrics.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Global() // Make metrics service available globally
@Module({
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
```

### Step 3: Create Metrics Controller

Create the file `backend/src/infrastructure/monitoring/metrics.controller.ts`:

```typescript
import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Monitoring')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Metrics in Prometheus format' })
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
```

### Step 4: Create HTTP Metrics Middleware

Create the file `backend/src/common/middleware/metrics.middleware.ts`:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../../infrastructure/monitoring/metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Capture response finish event
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const path = this.normalizePath(req.route?.path || req.path);

      this.metricsService.incrementHttpRequests(
        req.method,
        path,
        res.statusCode,
      );

      this.metricsService.observeHttpDuration(
        req.method,
        path,
        res.statusCode,
        duration,
      );
    });

    next();
  }

  /**
   * Normalize paths to avoid high cardinality
   * Replace UUIDs and numeric IDs with placeholders
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
      .replace(/\/\d+/g, '/:id');
  }
}
```

### Step 5: Register Metrics Module in AppModule

Update `backend/src/app.module.ts`:

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MetricsModule } from './infrastructure/monitoring/metrics.module';
import { MetricsMiddleware } from './common/middleware/metrics.middleware';

@Module({
  imports: [
    // ... other modules
    MetricsModule, // Add MetricsModule
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply metrics middleware to all routes
    consumer
      .apply(MetricsMiddleware)
      .forRoutes('*');
  }
}
```

### Step 6: Update Main.ts for Health Check

Ensure `backend/src/main.ts` includes a health check endpoint:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Health check endpoint (already exists typically)
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  await app.listen(4000);
}
bootstrap();
```

## Business Metrics

For tracking business-specific metrics, add custom metrics to the MetricsService:

```typescript
// In MetricsService constructor:
this.postsPublished = new Counter({
  name: 'social_selling_posts_published_total',
  help: 'Total number of posts published successfully',
  labelNames: ['platform'], // instagram, whatsapp
});

this.messagesProcessed = new Counter({
  name: 'social_selling_messages_processed_total',
  help: 'Total number of messages processed',
  labelNames: ['platform', 'direction'], // inbound, outbound
});

this.queueJobsProcessed = new Counter({
  name: 'bullmq_job_completed_total',
  help: 'Total number of BullMQ jobs completed',
  labelNames: ['queue', 'status'], // success, failed
});

this.queueJobsWaiting = new Gauge({
  name: 'bullmq_queue_waiting',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue'],
});
```

## Testing

1. Start the backend application:
   ```bash
   cd backend
   npm run start:dev
   ```

2. Test the metrics endpoint:
   ```bash
   curl http://localhost:4000/metrics
   ```

3. Verify metrics appear in Prometheus:
   - Navigate to http://localhost:9090
   - Query: `http_requests_total`
   - Check targets: http://localhost:9090/targets

## Metrics Naming Conventions

- Use snake_case for metric names
- Add `_total` suffix for counters
- Add appropriate unit suffixes (`_seconds`, `_bytes`)
- Use descriptive labels but avoid high cardinality

## Example Metrics Queries

```promql
# Request rate by endpoint
rate(http_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Active WebSocket connections
websocket_connections_active
```

## Integration with Workers

For BullMQ workers, track metrics in worker processors:

```typescript
// In worker processor
try {
  await processJob(job);
  metricsService.incrementQueueJobsCompleted(queueName, 'success');
} catch (error) {
  metricsService.incrementQueueJobsCompleted(queueName, 'failed');
  throw error;
}
```

## Next Steps

1. Implement the above code when backend application is initialized
2. Test metrics collection locally
3. Verify Prometheus scraping
4. Create custom dashboards in Grafana
5. Test alert rules

## References

- [prom-client Documentation](https://github.com/siimon/prom-client)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [NestJS Middleware Guide](https://docs.nestjs.com/middleware)
