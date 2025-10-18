# INFRA-010: Logging Stack (Loki + Promtail)

**Priority:** P2 (Medium)
**Effort:** 4 hours
**Day:** 11
**Dependencies:** INFRA-009
**Domain:** Infrastructure & DevOps

---

## Overview

Set up Loki for log aggregation and Promtail for collecting logs from Docker containers, enabling centralized log search and analysis in Grafana.

---

## Implementation

### Loki Configuration

```yaml
# File: /infrastructure/monitoring/loki-config.yml

auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb:
    directory: /tmp/loki/index
  filesystem:
    directory: /tmp/loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 720h

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h
```

### Promtail Configuration

```yaml
# File: /infrastructure/monitoring/promtail-config.yml

server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'
```

### Log Dashboard

```json
// File: /infrastructure/monitoring/grafana/dashboards/logs.json

{
  "dashboard": {
    "title": "Application Logs",
    "panels": [
      {
        "title": "Error Logs",
        "targets": [
          {
            "expr": "{container=~\"backend|frontend\"} |~ \"ERROR\""
          }
        ]
      },
      {
        "title": "API Requests",
        "targets": [
          {
            "expr": "{container=\"backend\"} |~ \"HTTP\""
          }
        ]
      }
    ]
  }
}
```

---

## Acceptance Criteria

- [ ] Loki storing logs
- [ ] Promtail collecting from all containers
- [ ] Grafana can query logs with LogQL
- [ ] Log dashboard showing recent logs
- [ ] 30-day retention working

---

## Testing

```bash
# Check Loki ready
curl http://localhost:3100/ready

# Query logs
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={container="backend"}' | jq

# Test in Grafana
# Navigate to Explore → Loki → {container="backend"}
```

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
