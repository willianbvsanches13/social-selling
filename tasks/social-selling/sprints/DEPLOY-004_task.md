# DEPLOY-004: Monitoring & Alerting

## Overview
Comprehensive monitoring and alerting infrastructure using Prometheus, Grafana, Sentry, and centralized logging to ensure 99.9% uptime and rapid incident response with complete observability across the entire stack.

## Epic
Epic 13: Deployment & DevOps

## Story Points
13

## Priority
Critical

## Status
Ready for Implementation

---

## Table of Contents
1. [Prometheus Setup](#prometheus-setup)
2. [Grafana Dashboards](#grafana-dashboards)
3. [Alert Rules](#alert-rules)
4. [Uptime Monitoring](#uptime-monitoring)
5. [Sentry Error Tracking](#sentry-error-tracking)
6. [Log Aggregation](#log-aggregation)
7. [APM Integration](#apm-integration)
8. [Incident Response](#incident-response)
9. [Monitoring Best Practices](#monitoring-best-practices)

---

## 1. Prometheus Setup

### 1.1 Prometheus Configuration

**File:** `deployment/prometheus/prometheus.yml`
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'social-selling-production'
    environment: 'production'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# Load alert rules
rule_files:
  - '/etc/prometheus/alerts/*.yml'

# Scrape configurations
scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets:
          - 'node-exporter:9100'
        labels:
          instance: 'production-server-01'

  # Docker metrics
  - job_name: 'docker'
    static_configs:
      - targets:
          - 'localhost:9323'

  # Application metrics
  - job_name: 'backend'
    metrics_path: '/metrics'
    static_configs:
      - targets:
          - 'backend:3000'
        labels:
          service: 'backend'

  # PostgreSQL metrics
  - job_name: 'postgres'
    static_configs:
      - targets:
          - 'postgres-exporter:9187'
        labels:
          database: 'social-selling'

  # Redis metrics
  - job_name: 'redis'
    static_configs:
      - targets:
          - 'redis-exporter:9121'
        labels:
          service: 'redis'

  # Nginx metrics
  - job_name: 'nginx'
    static_configs:
      - targets:
          - 'nginx-exporter:9113'
        labels:
          service: 'nginx'

  # Blackbox exporter (endpoint monitoring)
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - https://yourdomain.com
        - https://api.yourdomain.com/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

### 1.2 Docker Compose for Monitoring Stack

**File:** `deployment/docker-compose.monitoring.yml`
```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts:/etc/prometheus/alerts
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - '9090:9090'
    networks:
      - monitoring
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    volumes:
      - ./alertmanager/config.yml:/etc/alertmanager/config.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/config.yml'
      - '--storage.path=/alertmanager'
    ports:
      - '9093:9093'
    networks:
      - monitoring
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
      - grafana_data:/var/lib/grafana
    ports:
      - '3001:3000'
    networks:
      - monitoring
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    command:
      - '--path.rootfs=/host'
    volumes:
      - '/:/host:ro,rslave'
    ports:
      - '9100:9100'
    networks:
      - monitoring
    restart: unless-stopped

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable"
    ports:
      - '9187:9187'
    networks:
      - monitoring
    restart: unless-stopped

  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: redis-exporter
    environment:
      REDIS_ADDR: "redis:6379"
      REDIS_PASSWORD: "${REDIS_PASSWORD}"
    ports:
      - '9121:9121'
    networks:
      - monitoring
    restart: unless-stopped

  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:latest
    container_name: nginx-exporter
    command:
      - '-nginx.scrape-uri=http://nginx:80/stub_status'
    ports:
      - '9113:9113'
    networks:
      - monitoring
    restart: unless-stopped

  blackbox-exporter:
    image: prom/blackbox-exporter:latest
    container_name: blackbox-exporter
    volumes:
      - ./blackbox/config.yml:/etc/blackbox/config.yml
    command:
      - '--config.file=/etc/blackbox/config.yml'
    ports:
      - '9115:9115'
    networks:
      - monitoring
    restart: unless-stopped

  loki:
    image: grafana/loki:latest
    container_name: loki
    volumes:
      - ./loki/config.yml:/etc/loki/config.yml
      - loki_data:/loki
    command: -config.file=/etc/loki/config.yml
    ports:
      - '3100:3100'
    networks:
      - monitoring
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    container_name: promtail
    volumes:
      - ./promtail/config.yml:/etc/promtail/config.yml
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - monitoring
    restart: unless-stopped

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus_data:
  alertmanager_data:
  grafana_data:
  loki_data:
```

### 1.3 Prometheus Setup Script

**File:** `deployment/scripts/setup-monitoring.sh`
```bash
#!/bin/bash
set -euo pipefail

echo "========================================="
echo "Setting up Monitoring Stack"
echo "========================================="

# Create directories
mkdir -p deployment/prometheus/alerts
mkdir -p deployment/alertmanager
mkdir -p deployment/grafana/{provisioning,dashboards}
mkdir -p deployment/blackbox
mkdir -p deployment/loki
mkdir -p deployment/promtail

# Copy configuration files
echo "Copying configuration files..."

# Start monitoring stack
echo "Starting monitoring stack..."
docker-compose -f deployment/docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check Prometheus
echo -n "Checking Prometheus... "
if curl -sf http://localhost:9090/-/healthy > /dev/null; then
    echo "✓ OK"
else
    echo "✗ FAILED"
fi

# Check Grafana
echo -n "Checking Grafana... "
if curl -sf http://localhost:3001/api/health > /dev/null; then
    echo "✓ OK"
else
    echo "✗ FAILED"
fi

# Check Alertmanager
echo -n "Checking Alertmanager... "
if curl -sf http://localhost:9093/-/healthy > /dev/null; then
    echo "✓ OK"
else
    echo "✗ FAILED"
fi

echo "========================================="
echo "Monitoring stack setup complete!"
echo ""
echo "Access URLs:"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana: http://localhost:3001"
echo "  Alertmanager: http://localhost:9093"
echo ""
echo "Default Grafana credentials:"
echo "  Username: admin"
echo "  Password: ${GRAFANA_ADMIN_PASSWORD}"
echo "========================================="
```

---

## 2. Grafana Dashboards

### 2.1 System Dashboard

**File:** `deployment/grafana/dashboards/system-metrics.json`
```json
{
  "dashboard": {
    "title": "System Metrics - Social Selling",
    "tags": ["system", "infrastructure"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{instance}}"
          }
        ],
        "yaxes": [
          {
            "format": "percent",
            "max": 100,
            "min": 0
          }
        ]
      },
      {
        "id": 2,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "{{instance}}"
          }
        ],
        "yaxes": [
          {
            "format": "percent",
            "max": 100,
            "min": 0
          }
        ]
      },
      {
        "id": 3,
        "title": "Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_filesystem_size_bytes{mountpoint=\"/\"} - node_filesystem_avail_bytes{mountpoint=\"/\"}) / node_filesystem_size_bytes{mountpoint=\"/\"} * 100",
            "legendFormat": "{{instance}}"
          }
        ],
        "yaxes": [
          {
            "format": "percent",
            "max": 100,
            "min": 0
          }
        ]
      },
      {
        "id": 4,
        "title": "Network Traffic",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(node_network_receive_bytes_total[5m])",
            "legendFormat": "Receive - {{device}}"
          },
          {
            "expr": "rate(node_network_transmit_bytes_total[5m])",
            "legendFormat": "Transmit - {{device}}"
          }
        ],
        "yaxes": [
          {
            "format": "Bps"
          }
        ]
      }
    ]
  }
}
```

### 2.2 Application Dashboard

**File:** `deployment/grafana/dashboards/application-metrics.json`
```json
{
  "dashboard": {
    "title": "Application Metrics - Social Selling",
    "tags": ["application", "backend"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (method, route)",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "yaxes": [
          {
            "format": "reqps",
            "label": "Requests/sec"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le, route))",
            "legendFormat": "{{route}}"
          }
        ],
        "yaxes": [
          {
            "format": "ms",
            "label": "Response Time"
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [500],
                "type": "gt"
              },
              "operator": {
                "type": "and"
              },
              "query": {
                "params": ["A", "5m", "now"]
              },
              "reducer": {
                "params": [],
                "type": "avg"
              },
              "type": "query"
            }
          ],
          "executionErrorState": "alerting",
          "frequency": "60s",
          "handler": 1,
          "name": "High Response Time Alert",
          "noDataState": "no_data",
          "notifications": []
        }
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
            "legendFormat": "Error Rate"
          }
        ],
        "yaxes": [
          {
            "format": "percent",
            "label": "Error Rate"
          }
        ]
      },
      {
        "id": 4,
        "title": "Active Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends{datname=\"social_selling\"}",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "id": 5,
        "title": "Cache Hit Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(cache_requests_total{result=\"hit\"}[5m])) / sum(rate(cache_requests_total[5m])) * 100",
            "legendFormat": "Cache Hit Rate"
          }
        ],
        "yaxes": [
          {
            "format": "percent",
            "max": 100,
            "min": 0
          }
        ]
      },
      {
        "id": 6,
        "title": "Database Query Duration (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(db_query_duration_ms_bucket[5m])) by (le, operation))",
            "legendFormat": "{{operation}}"
          }
        ],
        "yaxes": [
          {
            "format": "ms"
          }
        ]
      }
    ]
  }
}
```

### 2.3 Business Metrics Dashboard

**File:** `deployment/grafana/dashboards/business-metrics.json`
```json
{
  "dashboard": {
    "title": "Business Metrics - Social Selling",
    "tags": ["business", "analytics"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Active Users (Last 24h)",
        "type": "stat",
        "targets": [
          {
            "expr": "count(count by (user_id) (http_requests_total{status_code=\"200\"} offset 24h))"
          }
        ]
      },
      {
        "id": 2,
        "title": "New User Registrations",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(user_registrations_total[1h])",
            "legendFormat": "Registrations"
          }
        ]
      },
      {
        "id": 3,
        "title": "Orders Created",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(orders_created_total[1h])",
            "legendFormat": "Orders"
          }
        ]
      },
      {
        "id": 4,
        "title": "Revenue (Last 24h)",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(increase(order_total_amount[24h]))"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD"
          }
        }
      },
      {
        "id": 5,
        "title": "Products Listed",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(products_created_total[1h])",
            "legendFormat": "Products"
          }
        ]
      },
      {
        "id": 6,
        "title": "Messages Sent",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(messages_sent_total[1h])",
            "legendFormat": "Messages"
          }
        ]
      }
    ]
  }
}
```

### 2.4 Database Dashboard

**File:** `deployment/grafana/dashboards/database-metrics.json`
```json
{
  "dashboard": {
    "title": "Database Metrics - PostgreSQL",
    "tags": ["database", "postgresql"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Transactions Per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pg_stat_database_xact_commit{datname=\"social_selling\"}[5m])",
            "legendFormat": "Commits"
          },
          {
            "expr": "rate(pg_stat_database_xact_rollback{datname=\"social_selling\"}[5m])",
            "legendFormat": "Rollbacks"
          }
        ]
      },
      {
        "id": 2,
        "title": "Cache Hit Ratio",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_blks_hit{datname=\"social_selling\"} / (pg_stat_database_blks_hit{datname=\"social_selling\"} + pg_stat_database_blks_read{datname=\"social_selling\"}) * 100",
            "legendFormat": "Cache Hit Ratio"
          }
        ],
        "yaxes": [
          {
            "format": "percent",
            "max": 100,
            "min": 0
          }
        ]
      },
      {
        "id": 3,
        "title": "Table Size",
        "type": "table",
        "targets": [
          {
            "expr": "pg_table_size_bytes",
            "format": "table"
          }
        ]
      },
      {
        "id": 4,
        "title": "Slow Queries",
        "type": "table",
        "targets": [
          {
            "expr": "topk(10, pg_stat_statements_mean_time_seconds)",
            "format": "table"
          }
        ]
      },
      {
        "id": 5,
        "title": "Connection Pool",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends{datname=\"social_selling\"}",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "id": 6,
        "title": "Deadlocks",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pg_stat_database_deadlocks{datname=\"social_selling\"}[5m])",
            "legendFormat": "Deadlocks"
          }
        ]
      }
    ]
  }
}
```

---

## 3. Alert Rules

### 3.1 Infrastructure Alerts

**File:** `deployment/prometheus/alerts/infrastructure.yml`
```yaml
groups:
  - name: infrastructure
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value | humanize }}% on {{ $labels.instance }}"

      - alert: CriticalCPUUsage
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 95
        for: 2m
        labels:
          severity: critical
          component: system
        annotations:
          summary: "Critical CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value | humanize }}% on {{ $labels.instance }}"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 80
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanize }}% on {{ $labels.instance }}"

      - alert: CriticalMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 95
        for: 2m
        labels:
          severity: critical
          component: system
        annotations:
          summary: "Critical memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanize }}% on {{ $labels.instance }}"

      # High disk usage
      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}) / node_filesystem_size_bytes{mountpoint="/"} * 100 > 80
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "High disk usage on {{ $labels.instance }}"
          description: "Disk usage is {{ $value | humanize }}% on {{ $labels.instance }}"

      - alert: CriticalDiskUsage
        expr: (node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}) / node_filesystem_size_bytes{mountpoint="/"} * 100 > 90
        for: 2m
        labels:
          severity: critical
          component: system
        annotations:
          summary: "Critical disk usage on {{ $labels.instance }}"
          description: "Disk usage is {{ $value | humanize }}% on {{ $labels.instance }}"

      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
          component: service
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.job }} on {{ $labels.instance }} is down"
```

### 3.2 Application Alerts

**File:** `deployment/prometheus/alerts/application.yml`
```yaml
groups:
  - name: application
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100 > 1
        for: 5m
        labels:
          severity: warning
          component: application
        annotations:
          summary: "High error rate"
          description: "Error rate is {{ $value | humanize }}%"

      - alert: CriticalErrorRate
        expr: sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100 > 5
        for: 2m
        labels:
          severity: critical
          component: application
        annotations:
          summary: "Critical error rate"
          description: "Error rate is {{ $value | humanize }}%"

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le, route)) > 500
        for: 5m
        labels:
          severity: warning
          component: application
        annotations:
          summary: "High response time on {{ $labels.route }}"
          description: "p95 response time is {{ $value | humanize }}ms"

      - alert: CriticalResponseTime
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le, route)) > 1000
        for: 2m
        labels:
          severity: critical
          component: application
        annotations:
          summary: "Critical response time on {{ $labels.route }}"
          description: "p95 response time is {{ $value | humanize }}ms"

      # Low cache hit rate
      - alert: LowCacheHitRate
        expr: sum(rate(cache_requests_total{result="hit"}[5m])) / sum(rate(cache_requests_total[5m])) * 100 < 70
        for: 10m
        labels:
          severity: warning
          component: cache
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanize }}%"

      # High database query time
      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, sum(rate(db_query_duration_ms_bucket[5m])) by (le, operation)) > 100
        for: 5m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "Slow database queries detected"
          description: "p95 query time for {{ $labels.operation }} is {{ $value | humanize }}ms"
```

### 3.3 Database Alerts

**File:** `deployment/prometheus/alerts/database.yml`
```yaml
groups:
  - name: database
    interval: 30s
    rules:
      # High connection usage
      - alert: HighDatabaseConnections
        expr: pg_stat_database_numbackends{datname="social_selling"} > 15
        for: 5m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "High number of database connections"
          description: "{{ $value }} active connections to database"

      # Low cache hit ratio
      - alert: LowDatabaseCacheHitRatio
        expr: pg_stat_database_blks_hit{datname="social_selling"} / (pg_stat_database_blks_hit{datname="social_selling"} + pg_stat_database_blks_read{datname="social_selling"}) * 100 < 90
        for: 10m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "Low database cache hit ratio"
          description: "Cache hit ratio is {{ $value | humanize }}%"

      # Deadlocks detected
      - alert: DatabaseDeadlocks
        expr: rate(pg_stat_database_deadlocks{datname="social_selling"}[5m]) > 0
        for: 1m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "Database deadlocks detected"
          description: "{{ $value }} deadlocks per second"

      # High rollback rate
      - alert: HighRollbackRate
        expr: rate(pg_stat_database_xact_rollback{datname="social_selling"}[5m]) / rate(pg_stat_database_xact_commit{datname="social_selling"}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "High transaction rollback rate"
          description: "Rollback rate is {{ $value | humanizePercentage }}"

      # Database is down
      - alert: DatabaseDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
          component: database
        annotations:
          summary: "PostgreSQL database is down"
          description: "Database {{ $labels.instance }} is not responding"
```

### 3.4 Alertmanager Configuration

**File:** `deployment/alertmanager/config.yml`
```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.sendgrid.net:587'
  smtp_from: 'alerts@yourdomain.com'
  smtp_auth_username: 'apikey'
  smtp_auth_password: '${SMTP_PASSWORD}'

# Alert routing
route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h

  routes:
    # Critical alerts
    - match:
        severity: critical
      receiver: 'critical'
      continue: true

    # Warning alerts
    - match:
        severity: warning
      receiver: 'warning'

    # Database alerts
    - match:
        component: database
      receiver: 'database-team'

# Alert receivers
receivers:
  - name: 'default'
    email_configs:
      - to: 'ops@yourdomain.com'
        headers:
          Subject: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'

  - name: 'critical'
    email_configs:
      - to: 'ops@yourdomain.com,cto@yourdomain.com'
        headers:
          Subject: '[CRITICAL] {{ .GroupLabels.alertname }}'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-critical'
        title: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'

  - name: 'warning'
    email_configs:
      - to: 'ops@yourdomain.com'
        headers:
          Subject: '[WARNING] {{ .GroupLabels.alertname }}'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-warning'
        title: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'database-team'
    email_configs:
      - to: 'dba@yourdomain.com'
        headers:
          Subject: '[DATABASE] {{ .GroupLabels.alertname }}'
```

---

## 4. Uptime Monitoring

### 4.1 Uptime Monitoring Setup

**File:** `deployment/scripts/setup-uptime-monitoring.sh`
```bash
#!/bin/bash
set -euo pipefail

UPTIMEROBOT_API_KEY="${UPTIMEROBOT_API_KEY:-}"
DOMAIN="${1:-yourdomain.com}"

if [ -z "$UPTIMEROBOT_API_KEY" ]; then
    echo "Error: UPTIMEROBOT_API_KEY must be set"
    exit 1
fi

echo "========================================="
echo "Setting up Uptime Monitoring"
echo "Domain: $DOMAIN"
echo "========================================="

# Create HTTP monitor for main site
curl -X POST https://api.uptimerobot.com/v2/newMonitor \
    -d "api_key=$UPTIMEROBOT_API_KEY" \
    -d "format=json" \
    -d "type=1" \
    -d "url=https://$DOMAIN" \
    -d "friendly_name=Social Selling - Homepage" \
    -d "interval=300" \
    -d "timeout=30"

# Create HTTP monitor for API
curl -X POST https://api.uptimerobot.com/v2/newMonitor \
    -d "api_key=$UPTIMEROBOT_API_KEY" \
    -d "format=json" \
    -d "type=1" \
    -d "url=https://api.$DOMAIN/health" \
    -d "friendly_name=Social Selling - API Health" \
    -d "interval=300" \
    -d "timeout=30"

# Create Keyword monitor for API status
curl -X POST https://api.uptimerobot.com/v2/newMonitor \
    -d "api_key=$UPTIMEROBOT_API_KEY" \
    -d "format=json" \
    -d "type=2" \
    -d "url=https://api.$DOMAIN/health" \
    -d "friendly_name=Social Selling - API Status" \
    -d "keyword_type=1" \
    -d "keyword_value=\"status\":\"ok\"" \
    -d "interval=300"

echo "========================================="
echo "Uptime monitoring configured!"
echo "========================================="
```

### 4.2 Health Check Endpoint

**File:** `src/controllers/health.controller.ts`
```typescript
import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from '../services/cache.service';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private cacheService: CacheService
  ) {}

  @Get()
  async health() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const [dbCheck, redisCheck] = checks;

    const status = checks.every((check) => check.status === 'fulfilled')
      ? 'ok'
      : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbCheck.status === 'fulfilled' ? 'ok' : 'failed',
        redis: redisCheck.status === 'fulfilled' ? 'ok' : 'failed',
      },
    };
  }

  @Get('ready')
  async readiness() {
    // Check if application is ready to serve traffic
    try {
      await this.checkDatabase();
      await this.checkRedis();

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  @Get('live')
  async liveness() {
    // Simple liveness check
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<void> {
    await this.dataSource.query('SELECT 1');
  }

  private async checkRedis(): Promise<void> {
    await this.cacheService.set('health_check', Date.now(), 10);
    await this.cacheService.get('health_check');
  }
}
```

---

## 5. Sentry Error Tracking

### 5.1 Sentry Backend Integration

**File:** `src/config/sentry.config.ts`
```typescript
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { ConfigService } from '@nestjs/config';

export const initializeSentry = (configService: ConfigService) => {
  const dsn = configService.get('SENTRY_DSN');
  const environment = configService.get('NODE_ENV', 'development');

  if (!dsn) {
    console.warn('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: true }),
      new Sentry.Integrations.Postgres(),
    ],

    // Performance monitoring
    beforeSend(event, hint) {
      // Filter out certain errors
      if (event.exception) {
        const error = hint.originalException;

        // Don't report validation errors
        if (error?.name === 'ValidationError') {
          return null;
        }

        // Don't report 404 errors
        if (error?.status === 404) {
          return null;
        }
      }

      return event;
    },

    // Set user context
    beforeBreadcrumb(breadcrumb, hint) {
      // Sanitize sensitive data
      if (breadcrumb.category === 'http') {
        delete breadcrumb.data?.headers?.authorization;
        delete breadcrumb.data?.headers?.cookie;
      }

      return breadcrumb;
    },
  });

  console.log('Sentry initialized successfully');
};

export { Sentry };
```

### 5.2 Sentry Error Handler Middleware

**File:** `src/middleware/sentry-error.middleware.ts`
```typescript
import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // Set user context
    if (request.user) {
      Sentry.setUser({
        id: request.user.id,
        email: request.user.email,
        username: request.user.username,
      });
    }

    // Set request context
    Sentry.setContext('request', {
      method: request.method,
      url: request.url,
      headers: this.sanitizeHeaders(request.headers),
      query: request.query,
      body: this.sanitizeBody(request.body),
    });

    // Capture exception
    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      // Only report server errors to Sentry
      if (status >= 500) {
        Sentry.captureException(exception);
      }
    } else {
      Sentry.captureException(exception);
    }

    // Call parent exception handler
    super.catch(exception, host);
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized.cookie;
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    return sanitized;
  }
}
```

### 5.3 Sentry Frontend Integration

**File:** `src/lib/sentry.ts` (Frontend)
```typescript
import * as Sentry from '@sentry/nextjs';

export const initSentry = () => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const environment = process.env.NODE_ENV;

  if (!dsn) {
    console.warn('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    beforeSend(event, hint) {
      // Filter out certain errors
      if (event.exception) {
        const error = hint.originalException;

        // Don't report network errors
        if (error?.message?.includes('NetworkError')) {
          return null;
        }
      }

      return event;
    },
  });
};

export const captureError = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureException(error);
  });
};
```

---

## 6. Log Aggregation

### 6.1 Loki Configuration

**File:** `deployment/loki/config.yml`
```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2023-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://alertmanager:9093

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
  per_stream_rate_limit: 5MB
  per_stream_rate_limit_burst: 20MB
```

### 6.2 Promtail Configuration

**File:** `deployment/promtail/config.yml`
```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Docker container logs
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'

  # System logs
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: syslog
          __path__: /var/log/syslog

  # Nginx logs
  - job_name: nginx
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/*.log

  # Application logs
  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: social-selling
          __path__: /var/log/social-selling/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            timestamp: timestamp
            message: message
            context: context
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: RFC3339
```

### 6.3 Structured Logging Service

**File:** `src/utils/logger.ts`
```typescript
import { createLogger, format, transports } from 'winston';
import * as Sentry from '@sentry/node';

const { combine, timestamp, errors, json, printf, colorize } = format;

export class Logger {
  private logger: any;
  private context: string;

  constructor(context: string) {
    this.context = context;

    const logFormat = printf(({ level, message, timestamp, context, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        context,
        message,
        ...meta,
      });
    });

    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        json()
      ),
      defaultMeta: { service: 'social-selling', context },
      transports: [
        // Console transport
        new transports.Console({
          format: combine(
            colorize(),
            printf(({ level, message, timestamp, ...meta }) => {
              return `${timestamp} [${level}] ${context}: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
              }`;
            })
          ),
        }),
        // File transport
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880,
          maxFiles: 5,
        }),
      ],
      exceptionHandlers: [
        new transports.File({ filename: 'logs/exceptions.log' }),
      ],
      rejectionHandlers: [
        new transports.File({ filename: 'logs/rejections.log' }),
      ],
    });
  }

  info(message: string, meta?: any) {
    this.logger.info(message, { context: this.context, ...meta });
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  error(message: string, meta?: any) {
    this.logger.error(message, { context: this.context, ...meta });

    // Send errors to Sentry
    if (meta?.error) {
      Sentry.captureException(meta.error, {
        contexts: {
          context: {
            name: this.context,
            message,
            ...meta,
          },
        },
      });
    }
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, { context: this.context, ...meta });
  }
}
```

---

## 7. APM Integration

### 7.1 New Relic Setup

**File:** `src/config/newrelic.ts`
```typescript
import newrelic from 'newrelic';
import { ConfigService } from '@nestjs/config';

export const initializeNewRelic = (configService: ConfigService) => {
  const licenseKey = configService.get('NEW_RELIC_LICENSE_KEY');
  const appName = configService.get('NEW_RELIC_APP_NAME', 'Social Selling');

  if (!licenseKey) {
    console.warn('New Relic license key not configured');
    return;
  }

  newrelic.configure({
    app_name: [appName],
    license_key: licenseKey,
    logging: {
      level: 'info',
    },
    distributed_tracing: {
      enabled: true,
    },
    transaction_tracer: {
      enabled: true,
      record_sql: 'obfuscated',
    },
    error_collector: {
      enabled: true,
      ignore_status_codes: [404],
    },
    attributes: {
      exclude: [
        'request.headers.cookie',
        'request.headers.authorization',
        'request.headers.proxyAuthorization',
        'request.headers.setCookie*',
        'request.headers.x*',
        'response.headers.cookie',
        'response.headers.authorization',
        'response.headers.proxyAuthorization',
        'response.headers.setCookie*',
        'response.headers.x*',
      ],
    },
  });

  console.log('New Relic APM initialized successfully');
};

export { newrelic };
```

---

## 8. Incident Response

### 8.1 Incident Response Playbook

**File:** `docs/incident-response-playbook.md`
```markdown
# Incident Response Playbook

## Severity Levels

### P1 - Critical
- Complete service outage
- Data breach or security incident
- Response Time: Immediate (< 15 minutes)
- Escalation: CTO, CEO

### P2 - High
- Partial service degradation
- High error rates (>5%)
- Performance severely degraded
- Response Time: < 30 minutes
- Escalation: Engineering Lead

### P3 - Medium
- Minor service degradation
- Performance issues
- Non-critical features affected
- Response Time: < 2 hours
- Escalation: On-call engineer

### P4 - Low
- Cosmetic issues
- Non-urgent bugs
- Response Time: Next business day
- Escalation: Not required

## Incident Response Process

### 1. Detection & Alert
- Monitor alert channels (PagerDuty, Slack, Email)
- Acknowledge alert immediately
- Create incident ticket

### 2. Initial Assessment
- Determine severity level
- Identify affected services
- Estimate user impact
- Review recent deployments/changes

### 3. Communication
- Update status page
- Notify stakeholders
- Create incident Slack channel
- Post initial update (< 15 minutes)

### 4. Investigation
- Check monitoring dashboards
- Review recent logs
- Analyze error patterns
- Identify root cause

### 5. Mitigation
- Implement immediate fix or workaround
- Consider rollback if recent deployment
- Test fix in staging if possible
- Deploy fix to production

### 6. Verification
- Monitor metrics for improvement
- Verify issue is resolved
- Get confirmation from affected users
- Update status page

### 7. Post-Incident
- Write post-mortem (within 48 hours)
- Document root cause
- List action items
- Schedule retrospective

## Common Incidents

### High Error Rate

**Detection:**
- Alert: HighErrorRate or CriticalErrorRate
- Dashboard: Application Metrics

**Investigation:**
1. Check error logs in Sentry
2. Review recent deployments
3. Check database connectivity
4. Check external service status

**Mitigation:**
1. If caused by recent deployment: rollback
2. If database issue: check connections, restart if needed
3. If external service: implement fallback/circuit breaker

**Verification:**
- Error rate returns to < 1%
- User reports of errors stop

### High Response Time

**Detection:**
- Alert: HighResponseTime or CriticalResponseTime
- Dashboard: Application Metrics

**Investigation:**
1. Check database query performance
2. Review slow query logs
3. Check cache hit rate
4. Monitor CPU/memory usage

**Mitigation:**
1. Scale application horizontally
2. Restart unresponsive services
3. Clear cache if corrupted
4. Optimize slow queries

**Verification:**
- p95 response time < 500ms
- p99 response time < 1000ms

### Database Connection Issues

**Detection:**
- Alert: HighDatabaseConnections
- Dashboard: Database Metrics

**Investigation:**
1. Check active connections
2. Review connection pool settings
3. Check for long-running queries
4. Monitor database CPU/memory

**Mitigation:**
1. Kill idle connections
2. Restart application to reset pool
3. Increase connection pool size
4. Terminate long-running queries

**Verification:**
- Connection count returns to normal
- No connection timeout errors

### Service Down

**Detection:**
- Alert: ServiceDown
- Uptime monitoring alerts

**Investigation:**
1. Check service logs
2. Verify network connectivity
3. Check resource usage
4. Review recent changes

**Mitigation:**
1. Restart service
2. Check and fix configuration
3. Rollback if caused by deployment
4. Scale resources if needed

**Verification:**
- Service health check passes
- Uptime monitoring shows green

## Escalation Matrix

| Severity | Initial Response | Escalation (15 min) | Escalation (30 min) |
|----------|-----------------|---------------------|---------------------|
| P1       | On-call engineer| Engineering Lead    | CTO                 |
| P2       | On-call engineer| Engineering Lead    | -                   |
| P3       | On-call engineer| -                   | -                   |
| P4       | Team member     | -                   | -                   |

## Communication Templates

### Initial Alert
> **INCIDENT [P1/P2/P3]**: [Brief description]
>
> **Impact**: [User-facing impact]
> **Services Affected**: [List services]
> **Started**: [Timestamp]
> **Status**: Investigating
>
> Next update in 15 minutes.

### Update
> **INCIDENT UPDATE**: [Brief description]
>
> **Current Status**: [Investigating/Mitigating/Resolved]
> **Actions Taken**: [What's been done]
> **Next Steps**: [What's next]
>
> Next update in 15 minutes.

### Resolution
> **INCIDENT RESOLVED**: [Brief description]
>
> **Root Cause**: [What caused it]
> **Resolution**: [How it was fixed]
> **Duration**: [Total time]
> **Post-mortem**: Will be published within 48 hours
>
> Thank you for your patience.

## Tools & Access

- **Monitoring**: https://grafana.yourdomain.com
- **Logs**: https://logs.yourdomain.com
- **Status Page**: https://status.yourdomain.com
- **Incident Channel**: #incidents
- **On-call Schedule**: https://pagerduty.com
- **Runbooks**: https://docs.yourdomain.com/runbooks
```

---

## 9. Monitoring Best Practices

### 9.1 Monitoring Checklist

**File:** `docs/monitoring-checklist.md`
```markdown
# Monitoring Checklist

## Infrastructure Monitoring
- [ ] CPU usage tracked for all servers
- [ ] Memory usage tracked for all servers
- [ ] Disk usage tracked for all servers
- [ ] Network I/O tracked
- [ ] Server uptime monitored
- [ ] Alerts configured for high resource usage
- [ ] Alerts configured for server downtime

## Application Monitoring
- [ ] Request rate tracked
- [ ] Response time tracked (p50, p95, p99)
- [ ] Error rate tracked
- [ ] Active connections tracked
- [ ] Cache hit rate tracked
- [ ] Alerts configured for high error rates
- [ ] Alerts configured for slow response times

## Database Monitoring
- [ ] Query performance tracked
- [ ] Connection pool usage tracked
- [ ] Cache hit ratio tracked
- [ ] Deadlocks tracked
- [ ] Slow queries logged
- [ ] Table sizes monitored
- [ ] Alerts configured for high connections
- [ ] Alerts configured for low cache hit ratio

## Business Metrics
- [ ] User registrations tracked
- [ ] Active users tracked
- [ ] Orders created tracked
- [ ] Revenue tracked
- [ ] Products listed tracked
- [ ] Messages sent tracked

## Logs
- [ ] Application logs centralized
- [ ] Error logs captured
- [ ] Access logs captured
- [ ] Database logs captured
- [ ] Log retention configured
- [ ] Log search functional

## Alerts
- [ ] Alert rules defined for all critical metrics
- [ ] Alert thresholds validated
- [ ] Alert routing configured
- [ ] Alert notifications working
- [ ] Escalation paths defined
- [ ] Alert fatigue minimized

## Dashboards
- [ ] System dashboard created
- [ ] Application dashboard created
- [ ] Database dashboard created
- [ ] Business metrics dashboard created
- [ ] Dashboards accessible to team
- [ ] Dashboards updated regularly

## Incident Response
- [ ] On-call rotation defined
- [ ] Incident response playbook documented
- [ ] Communication templates prepared
- [ ] Escalation matrix defined
- [ ] Post-mortem process defined
- [ ] Status page configured
```

---

## Acceptance Criteria

### Must Have (25+ criteria)

1. ✅ Prometheus installed and collecting metrics
2. ✅ Node exporter collecting system metrics
3. ✅ PostgreSQL exporter collecting database metrics
4. ✅ Redis exporter collecting cache metrics
5. ✅ Application exposing custom metrics
6. ✅ Grafana installed and connected to Prometheus
7. ✅ System metrics dashboard created
8. ✅ Application metrics dashboard created
9. ✅ Database metrics dashboard created
10. ✅ Business metrics dashboard created
11. ✅ Alert rules defined for critical metrics
12. ✅ Alertmanager configured with proper routing
13. ✅ Email alerts working
14. ✅ Slack alerts working
15. ✅ PagerDuty integration configured
16. ✅ Uptime monitoring configured
17. ✅ Health check endpoints implemented
18. ✅ Sentry error tracking configured (backend)
19. ✅ Sentry error tracking configured (frontend)
20. ✅ Loki log aggregation deployed
21. ✅ Promtail collecting logs
22. ✅ Structured logging implemented
23. ✅ APM integration configured
24. ✅ Incident response playbook documented
25. ✅ On-call rotation defined
26. ✅ Status page configured
27. ✅ Monitoring best practices documented

### Should Have

- Custom business metric tracking
- Advanced log analysis with AI
- Distributed tracing with Jaeger
- Cost monitoring and optimization
- Capacity planning dashboards

### Could Have

- Anomaly detection with machine learning
- Automated incident remediation
- Advanced visualization with custom panels
- Mobile app for on-call monitoring
- Integration with ChatOps

---

## Dependencies

### Requires
- DEPLOY-002: Production deployment complete
- DEPLOY-003: Performance optimization complete

### Blocks
- DEPLOY-005: Documentation & handoff

---

## Definition of Done

- [ ] All monitoring tools deployed
- [ ] All dashboards created and verified
- [ ] All alert rules tested
- [ ] Alert notifications working
- [ ] Uptime monitoring active
- [ ] Error tracking operational
- [ ] Log aggregation working
- [ ] APM providing insights
- [ ] Incident response playbook complete
- [ ] Team trained on monitoring tools
- [ ] Documentation complete

---

**Task ID:** DEPLOY-004
**Created:** 2025-01-18
**Epic:** Epic 13 - Deployment & DevOps
**Sprint:** Deployment Sprint
**Estimated Hours:** 40-60 hours
**Actual Hours:** _TBD_
