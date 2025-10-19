# Monitoring Stack - Social Selling Platform

This directory contains the configuration and documentation for the comprehensive monitoring solution for the Social Selling Platform using Prometheus and Grafana.

## Overview

The monitoring stack provides:
- **Metrics Collection** via Prometheus
- **Visualization** via Grafana dashboards
- **Alerting** for critical system events
- **Exporters** for PostgreSQL, Redis, and host metrics

## Components

### 1. Prometheus
- **Image**: `prom/prometheus:latest`
- **Port**: 9090
- **Purpose**: Metrics collection and storage
- **Retention**: 30 days
- **Configuration**: `prometheus.yml`

### 2. Grafana
- **Image**: `grafana/grafana:latest`
- **Port**: 3001
- **Purpose**: Dashboard visualization and alerting UI
- **Admin User**: Set via `GRAFANA_ADMIN_USER` (default: admin)
- **Admin Password**: Set via `GRAFANA_ADMIN_PASSWORD`

### 3. Exporters

#### PostgreSQL Exporter
- **Image**: `prometheuscommunity/postgres-exporter:latest`
- **Port**: 9187
- **Metrics**: Database connections, queries, locks, replication

#### Redis Exporter
- **Image**: `oliver006/redis_exporter:latest`
- **Port**: 9121
- **Metrics**: Memory usage, commands, keys, connections

#### Node Exporter
- **Image**: `prom/node-exporter:latest`
- **Port**: 9100
- **Metrics**: CPU, memory, disk, network

## Directory Structure

```
infrastructure/monitoring/
├── README.md                          # This file
├── prometheus.yml                     # Prometheus configuration
├── alerts.yml                         # Alert rules
├── BACKEND_METRICS_IMPLEMENTATION.md  # Backend integration guide
├── grafana/
│   ├── datasources/
│   │   └── prometheus.yml            # Grafana datasource config
│   └── dashboards/
│       ├── dashboard-provider.yml    # Dashboard provisioning config
│       ├── operational-dashboard.json # Infrastructure metrics
│       └── business-metrics-dashboard.json # Business KPIs
```

## Getting Started

### 1. Start the Monitoring Stack

```bash
# From project root
docker compose up -d prometheus grafana postgres-exporter redis-exporter node-exporter
```

### 2. Access the Interfaces

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Username: `admin` (or value from `.env`)
  - Password: Check `.env` file (`GRAFANA_ADMIN_PASSWORD`)

### 3. Verify Prometheus Targets

Navigate to http://localhost:9090/targets and ensure all targets show as "UP":
- prometheus (self)
- backend (when implemented)
- postgres-exporter
- redis-exporter
- node-exporter
- minio (when available)

### 4. View Grafana Dashboards

1. Navigate to http://localhost:3001
2. Log in with admin credentials
3. Go to Dashboards
4. Available dashboards:
   - **Social Selling - Operational Dashboard**: Infrastructure and system metrics
   - **Social Selling - Business Metrics**: Application KPIs and business metrics

## Available Dashboards

### Operational Dashboard
**Purpose**: Monitor infrastructure health and performance

**Panels**:
- Services Up (count of healthy services)
- Memory Usage (%)
- Disk Usage (%)
- CPU Usage Over Time
- HTTP Request Rate by Status
- HTTP Request Latency (p50, p95)
- Memory Usage (bytes)
- Request Distribution by Method

**Use Cases**:
- Detect service outages
- Monitor resource usage
- Identify performance bottlenecks
- Track request patterns

### Business Metrics Dashboard
**Purpose**: Monitor application-level KPIs

**Panels**:
- Posts Published (24h)
- Messages Received (24h)
- Messages Sent (24h)
- Active WebSocket Connections
- Post Publishing Rate by Platform
- Message Processing Rate
- Queue Backlog by Queue
- Job Completion Rate (Success vs Failed)
- Posts by Platform (pie chart)
- Messages by Platform (pie chart)

**Use Cases**:
- Track user engagement
- Monitor posting activity
- Identify message processing issues
- Detect queue backlogs

## Prometheus Metrics

### System Metrics (Node Exporter)
- `node_cpu_seconds_total` - CPU usage
- `node_memory_MemTotal_bytes` - Total memory
- `node_memory_MemAvailable_bytes` - Available memory
- `node_filesystem_size_bytes` - Disk size
- `node_filesystem_avail_bytes` - Available disk space

### Application Metrics (Backend)
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency histogram
- `websocket_connections_active` - Active WebSocket connections

### Business Metrics (Backend - when implemented)
- `social_selling_posts_published_total` - Posts published
- `social_selling_messages_processed_total` - Messages processed
- `bullmq_queue_waiting` - Jobs waiting in queue
- `bullmq_job_completed_total` - Jobs completed (success/failed)

### Database Metrics (PostgreSQL Exporter)
- `pg_up` - Database availability
- `pg_stat_activity_count` - Active connections
- `pg_settings_max_connections` - Max connection limit

### Cache Metrics (Redis Exporter)
- `redis_up` - Redis availability
- `redis_memory_used_bytes` - Memory usage
- `redis_memory_max_bytes` - Memory limit

## Alert Rules

### Critical Alerts (severity: critical)
- **ServiceDown**: Any service has been down for >1 minute
- **PostgreSQLDown**: Database unreachable for >1 minute
- **RedisDown**: Cache unreachable for >1 minute

### Warning Alerts (severity: warning)
- **HighErrorRate**: HTTP 5xx error rate >5% for 5 minutes
- **HighRequestLatency**: p95 latency >2s for 5 minutes
- **HighMemoryUsage**: Memory usage >90% for 5 minutes
- **HighDiskUsage**: Disk usage >85% for 5 minutes
- **HighCPUUsage**: CPU usage >80% for 10 minutes
- **PostgreSQLTooManyConnections**: Using >80% of max connections
- **RedisMemoryHigh**: Using >90% of max Redis memory
- **WebhookQueueBacklog**: >100 webhooks waiting for 10 minutes
- **HighPostPublishFailureRate**: >10% failure rate for 10 minutes

## Backend Integration

To integrate Prometheus metrics into the NestJS backend, follow the comprehensive guide in:
**`BACKEND_METRICS_IMPLEMENTATION.md`**

Quick summary:
1. Install `prom-client`: `npm install prom-client`
2. Create `MetricsService` in `backend/src/infrastructure/monitoring/`
3. Create `MetricsController` to expose `/metrics` endpoint
4. Add `MetricsMiddleware` to track HTTP requests
5. Register module in `AppModule`

## Querying Metrics

### Example PromQL Queries

```promql
# Total request rate
sum(rate(http_requests_total[5m]))

# Error rate percentage
(sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100

# 95th percentile latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Memory usage percentage
100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)

# Database connection usage
(pg_stat_activity_count / pg_settings_max_connections) * 100

# Posts published in last hour
sum(increase(social_selling_posts_published_total[1h]))
```

## Troubleshooting

### Prometheus not scraping targets

1. Check target status: http://localhost:9090/targets
2. Verify service is running: `docker compose ps`
3. Check network connectivity:
   ```bash
   docker compose exec prometheus wget -O- http://backend:4000/metrics
   ```
4. Review Prometheus logs:
   ```bash
   docker compose logs prometheus
   ```

### Grafana not showing data

1. Verify datasource connection:
   - Go to Configuration > Data Sources
   - Click "Test" on Prometheus datasource
2. Check if Prometheus is scraping:
   - Visit http://localhost:9090/graph
   - Run query: `up`
3. Verify dashboard queries are correct

### Exporters not working

1. Check exporter logs:
   ```bash
   docker compose logs postgres-exporter
   docker compose logs redis-exporter
   ```
2. Verify database/redis credentials in docker-compose.yml
3. Test exporter endpoint:
   ```bash
   curl http://localhost:9187/metrics  # PostgreSQL
   curl http://localhost:9121/metrics  # Redis
   ```

## Maintenance

### Adding New Metrics

1. Add metric collection in backend `MetricsService`
2. Expose via existing `/metrics` endpoint
3. Prometheus will automatically scrape
4. Create dashboard panels in Grafana

### Adding New Alerts

1. Edit `alerts.yml`
2. Restart Prometheus:
   ```bash
   docker compose restart prometheus
   ```
3. Verify alert is loaded: http://localhost:9090/alerts

### Updating Dashboards

Option 1: Via Grafana UI
1. Edit dashboard in Grafana
2. Click "Save dashboard"
3. Export JSON and save to `grafana/dashboards/`

Option 2: Edit JSON directly
1. Edit JSON file in `grafana/dashboards/`
2. Restart Grafana:
   ```bash
   docker compose restart grafana
   ```

## Performance Considerations

- **Scrape Interval**: 15 seconds (configurable in `prometheus.yml`)
- **Retention**: 30 days (adjust via `--storage.tsdb.retention.time` flag)
- **Resource Usage**:
  - Prometheus: ~128-256MB RAM
  - Grafana: ~128-256MB RAM
  - Each Exporter: ~32-64MB RAM

## Security

- Grafana admin password should be changed from default
- Prometheus and Grafana should be behind authentication in production
- Consider enabling HTTPS for Grafana
- Restrict port access using firewall rules

## Next Steps

1. ✅ Configure Prometheus and Grafana
2. ⏳ Implement backend metrics (see `BACKEND_METRICS_IMPLEMENTATION.md`)
3. ⏳ Test alert rules
4. ⏳ Create custom dashboards for specific use cases
5. ⏳ Set up alert notifications (email, Slack, etc.)
6. ⏳ Enable HTTPS for Grafana in production

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Node Exporter](https://github.com/prometheus/node_exporter)
- [PostgreSQL Exporter](https://github.com/prometheus-community/postgres_exporter)
- [Redis Exporter](https://github.com/oliver006/redis_exporter)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)

## Support

For issues or questions:
1. Check Prometheus logs: `docker compose logs prometheus`
2. Check Grafana logs: `docker compose logs grafana`
3. Review this README and implementation guide
4. Check [Prometheus troubleshooting guide](https://prometheus.io/docs/prometheus/latest/troubleshooting/)
