# INFRA-009: Monitoring Stack (Prometheus + Grafana)

**Priority:** P1 (High)
**Effort:** 5 hours
**Day:** 3
**Dependencies:** INFRA-002
**Domain:** Infrastructure & DevOps

---

## Overview

Set up Prometheus for metrics collection and Grafana for visualization dashboards to monitor application health, performance, and business metrics.

---

## Implementation

### Prometheus Configuration

```yaml
# File: /infrastructure/monitoring/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'backend'
    static_configs:
      - targets: ['backend:4000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

### Alert Rules

```yaml
# File: /infrastructure/monitoring/alerts.yml

groups:
  - name: application
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Memory usage above 90%"

      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk usage above 85%"
```

### Grafana Datasource

```yaml
# File: /infrastructure/monitoring/grafana/datasources/prometheus.yml

apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

### Backend Metrics Endpoint

```typescript
// File: /backend/src/infrastructure/monitoring/metrics.service.ts

import { Injectable } from '@nestjs/common';
import { register, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;

  constructor() {
    collectDefaultMetrics();

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });
  }

  incrementHttpRequests(method: string, path: string, status: number) {
    this.httpRequestsTotal.inc({ method, path, status });
  }

  observeHttpDuration(method: string, path: string, status: number, duration: number) {
    this.httpRequestDuration.observe({ method, path, status }, duration);
  }

  getMetrics(): Promise<string> {
    return register.metrics();
  }
}
```

---

## Dashboards

1. **Operational Dashboard:**
   - CPU, Memory, Disk usage
   - Network I/O
   - Container stats
   - Request rate and latency

2. **Business Metrics Dashboard:**
   - Active users
   - Messages sent/received
   - Posts scheduled/published
   - API usage by endpoint

---

## Acceptance Criteria

- [ ] Prometheus scraping all services
- [ ] Grafana accessible at http://localhost:3001
- [ ] Dashboards showing real-time metrics
- [ ] Alerts configured and firing
- [ ] Backend exposing /metrics endpoint

---

## Testing

```bash
# Check Prometheus targets
curl http://localhost:9090/targets

# Check metrics endpoint
curl http://localhost:4000/metrics

# Test alert
# Trigger high error rate
for i in {1..100}; do curl http://localhost:4000/api/nonexistent; done
```

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
