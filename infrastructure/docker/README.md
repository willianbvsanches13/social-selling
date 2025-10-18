# Docker Infrastructure Guide

## Overview

The Social Selling Platform uses Docker Compose to orchestrate all services. This document provides comprehensive guidance for working with the containerized infrastructure.

## Prerequisites

- Docker Engine >= 24.0
- Docker Compose v2 (plugin mode)
- Minimum 4GB RAM, 2 vCPU
- 20GB free disk space

## Quick Start

### First-Time Setup

1. Clone the repository

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Generate secure secrets:
   ```bash
   # JWT Secret
   openssl rand -base64 64

   # Session Secret
   openssl rand -base64 32

   # Database Password
   openssl rand -base64 32
   ```

4. Update `.env` with generated secrets and API credentials

5. Start all services:
   ```bash
   docker compose up -d
   ```

6. Verify all services are healthy:
   ```bash
   docker compose ps
   ```

### Daily Development

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend

# Stop services
docker compose down

# Restart a specific service
docker compose restart backend

# Rebuild and restart
docker compose up -d --build backend
```

## Service Details

### PostgreSQL (Database)
- **Port:** 5432
- **Default Database:** social_selling
- **Admin Tool:** pgAdmin at http://localhost:5050 (dev only)
- **Connection String:** `postgresql://user:pass@localhost:5432/social_selling`

### Redis (Cache & Queue)
- **Port:** 6379
- **Admin Tool:** Redis Commander at http://localhost:8081 (dev only)
- **Connection String:** `redis://:password@localhost:6379`

### MinIO (Object Storage)
- **API Port:** 9000
- **Console Port:** 9001
- **Console URL:** http://localhost:9001
- **Default Bucket:** social-selling-media

### Nginx (Reverse Proxy)
- **HTTP Port:** 80
- **HTTPS Port:** 443
- **Routing:**
  - `/` → Frontend (Next.js)
  - `/api` → Backend (NestJS)
  - `/socket.io` → WebSocket
  - `/media` → MinIO

### Backend (NestJS API)
- **Port:** 4000
- **Debug Port:** 9229 (dev only)
- **Health Check:** http://localhost:4000/health
- **API Docs:** http://localhost:4000/api/docs

### Frontend (Next.js)
- **Port:** 3000
- **URL:** http://localhost (via Nginx) or http://localhost:3000 (direct)

### Workers (BullMQ)
- **No exposed ports**
- **Concurrency:** 5 workers
- **Queue Dashboard:** http://localhost:4000/admin/queues (future)

### Prometheus (Metrics)
- **Port:** 9090
- **URL:** http://localhost:9090

### Grafana (Dashboards)
- **Port:** 3001
- **URL:** http://localhost:3001
- **Default Credentials:** admin / (from .env)

## Resource Management

### View Resource Usage

```bash
# Real-time stats
docker stats

# Per-service resource limits
docker compose config | grep -A 5 "deploy:"
```

### Resource Limits

Total resource allocation (4GB RAM, 2 vCPU VPS):
- PostgreSQL: 512MB RAM, 0.5 CPU
- Redis: 256MB RAM, 0.25 CPU
- MinIO: 512MB RAM, 0.25 CPU
- Backend: 1GB RAM, 0.75 CPU
- Frontend: 512MB RAM, 0.5 CPU
- Worker: 512MB RAM, 0.5 CPU
- Nginx: 128MB RAM, 0.25 CPU
- Prometheus: 256MB RAM, 0.25 CPU
- Grafana: 256MB RAM, 0.25 CPU

**Total:** 3.9GB RAM, 3.5 CPU (10% buffer)

## Data Persistence

### Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect social-selling-2_postgres-data

# Backup volume
docker run --rm -v social-selling-2_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v social-selling-2_postgres-data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /data
```

### Volume Locations

- PostgreSQL: `postgres-data`
- Redis: `redis-data`
- MinIO: `minio-data`
- Prometheus: `prometheus-data`
- Grafana: `grafana-data`

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs [service_name]

# Check health status
docker compose ps

# Recreate service
docker compose up -d --force-recreate [service_name]
```

### Database Connection Errors

```bash
# Test PostgreSQL connection
docker compose exec postgres pg_isready -U social_selling_user

# Connect to database
docker compose exec postgres psql -U social_selling_user -d social_selling
```

### Redis Connection Errors

```bash
# Test Redis connection
docker compose exec redis redis-cli -a YOUR_PASSWORD ping

# Monitor Redis
docker compose exec redis redis-cli -a YOUR_PASSWORD monitor
```

### High Memory Usage

```bash
# Check stats
docker stats

# Restart services
docker compose restart

# Clear logs
docker compose down
docker system prune -f
docker compose up -d
```

## Production Deployment

### Environment Configuration

1. Copy `.env.example` to `.env.production`
2. Set `NODE_ENV=production`
3. Generate strong production secrets
4. Configure production domain and URLs
5. Set resource limits appropriately

### Deploy to Production

```bash
# Build production images
docker compose -f docker-compose.yml build

# Start in production mode
NODE_ENV=production docker compose up -d

# Monitor deployment
docker compose ps
docker compose logs -f
```

## Maintenance

### Update Images

```bash
# Pull latest images
docker compose pull

# Rebuild custom images
docker compose build --no-cache

# Restart with new images
docker compose up -d
```

### Clean Up

```bash
# Remove stopped containers
docker compose down

# Remove volumes (WARNING: deletes data)
docker compose down -v

# Prune unused resources
docker system prune -a
```

## Security Best Practices

1. **Never commit `.env` file to git**
2. **Use strong, unique passwords for all services**
3. **Rotate secrets regularly (every 90 days)**
4. **Limit resource access to internal network only**
5. **Enable authentication for all admin tools in production**
6. **Keep Docker and images updated**
7. **Monitor logs for suspicious activity**

## Getting Help

- Docker Compose docs: https://docs.docker.com/compose/
- Service-specific issues: Check individual service logs
- Platform issues: Create issue in GitHub repository
