# INFRA-002: Docker Compose Stack Setup

**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 1-2
**Dependencies:** INFRA-001
**Domain:** Infrastructure & DevOps

---

## Overview

Create comprehensive Docker Compose configuration for all application services including PostgreSQL, Redis, MinIO, Nginx, Backend API, Frontend, Background Workers, Prometheus, and Grafana. This establishes the complete containerized infrastructure for the platform.

---

## Data Models

### Docker Compose Services Architecture

```yaml
# Service Definitions
services:
  postgres:
    image: postgres:15-alpine
    container_name: social-selling-postgres
    resource_limits:
      cpus: '0.5'
      memory: 512M

  redis:
    image: redis:7-alpine
    container_name: social-selling-redis
    resource_limits:
      cpus: '0.25'
      memory: 256M

  minio:
    image: minio/minio:latest
    container_name: social-selling-minio
    resource_limits:
      cpus: '0.25'
      memory: 512M

  nginx:
    image: nginx:alpine
    container_name: social-selling-nginx
    resource_limits:
      cpus: '0.25'
      memory: 128M

  backend:
    build: ./backend
    container_name: social-selling-backend
    resource_limits:
      cpus: '0.75'
      memory: 1G

  frontend:
    build: ./frontend
    container_name: social-selling-frontend
    resource_limits:
      cpus: '0.5'
      memory: 512M

  worker:
    build: ./backend
    container_name: social-selling-worker
    resource_limits:
      cpus: '0.5'
      memory: 512M

  prometheus:
    image: prom/prometheus:latest
    container_name: social-selling-prometheus
    resource_limits:
      cpus: '0.25'
      memory: 256M

  grafana:
    image: grafana/grafana:latest
    container_name: social-selling-grafana
    resource_limits:
      cpus: '0.25'
      memory: 256M

# Total Resource Allocation:
# CPUs: 3.5 cores (within 4 vCPU limit with 12% headroom)
# Memory: 3.9GB (within 4GB RAM limit with 2.5% headroom)
```

### Environment Variables Schema

```typescript
// .env.example structure
interface EnvironmentVariables {
  // Application
  NODE_ENV: 'development' | 'staging' | 'production';
  APP_NAME: string;
  APP_URL: string;
  API_URL: string;

  // Database (PostgreSQL)
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_DB: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  DATABASE_URL: string; // Connection string

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_URL: string; // Connection string

  // MinIO (S3-compatible storage)
  MINIO_HOST: string;
  MINIO_PORT: number;
  MINIO_CONSOLE_PORT: number;
  MINIO_ROOT_USER: string;
  MINIO_ROOT_PASSWORD: string;
  MINIO_BUCKET_NAME: string;
  MINIO_ENDPOINT: string;

  // Authentication
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string; // e.g., "24h"
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string; // e.g., "7d"

  // Instagram API
  INSTAGRAM_APP_ID: string;
  INSTAGRAM_APP_SECRET: string;
  INSTAGRAM_REDIRECT_URI: string;
  INSTAGRAM_WEBHOOK_VERIFY_TOKEN: string;

  // WhatsApp API (Phase 2)
  WHATSAPP_APP_ID: string;
  WHATSAPP_APP_SECRET: string;

  // Email Service
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_FROM_EMAIL: string;

  // Monitoring
  PROMETHEUS_PORT: number;
  GRAFANA_PORT: number;
  GRAFANA_ADMIN_USER: string;
  GRAFANA_ADMIN_PASSWORD: string;
}
```

---

## Implementation Approach

### Phase 1: Create docker-compose.yml (2 hours)

```yaml
# File: /docker-compose.yml
version: '3.9'

networks:
  social-selling-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local
  minio-data:
    driver: local
  prometheus-data:
    driver: local
  grafana-data:
    driver: local

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: social-selling-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-social_selling}
      POSTGRES_USER: ${POSTGRES_USER:-social_selling_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "-E UTF8 --locale=en_US.UTF-8"
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    networks:
      - social-selling-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-social_selling_user}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # Redis Cache & Queue
  redis:
    image: redis:7-alpine
    container_name: social-selling-redis
    restart: unless-stopped
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --appendfsync everysec
    volumes:
      - redis-data:/data
    ports:
      - "${REDIS_PORT:-6379}:6379"
    networks:
      - social-selling-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M

  # MinIO S3-Compatible Storage
  minio:
    image: minio/minio:latest
    container_name: social-selling-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_BROWSER_REDIRECT_URL: ${MINIO_ENDPOINT:-http://localhost:9001}
    volumes:
      - minio-data:/data
    ports:
      - "${MINIO_PORT:-9000}:9000"
      - "${MINIO_CONSOLE_PORT:-9001}:9001"
    networks:
      - social-selling-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 512M
        reservations:
          cpus: '0.1'
          memory: 256M

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: social-selling-nginx
    restart: unless-stopped
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infrastructure/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./infrastructure/certbot/conf:/etc/letsencrypt:ro
      - ./infrastructure/certbot/www:/var/www/certbot:ro
    ports:
      - "80:80"
      - "443:443"
    networks:
      - social-selling-network
    depends_on:
      - frontend
      - backend
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M
        reservations:
          cpus: '0.1'
          memory: 64M

  # Backend API (NestJS)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: ${NODE_ENV:-development}
    container_name: social-selling-backend
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 4000
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-24h}
      INSTAGRAM_APP_ID: ${INSTAGRAM_APP_ID}
      INSTAGRAM_APP_SECRET: ${INSTAGRAM_APP_SECRET}
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "${BACKEND_PORT:-4000}:4000"
    networks:
      - social-selling-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:4000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '0.75'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Frontend (Next.js)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: ${NODE_ENV:-development}
    container_name: social-selling-frontend
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      NEXT_PUBLIC_API_URL: ${API_URL:-http://localhost/api}
      NEXT_PUBLIC_WS_URL: ${WS_URL:-ws://localhost/socket.io}
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "${FRONTEND_PORT:-3000}:3000"
    networks:
      - social-selling-network
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # Background Worker (BullMQ)
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    container_name: social-selling-worker
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      WORKER_CONCURRENCY: ${WORKER_CONCURRENCY:-5}
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - social-selling-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # Prometheus (Metrics)
  prometheus:
    image: prom/prometheus:latest
    container_name: social-selling-prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    volumes:
      - ./infrastructure/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./infrastructure/monitoring/alerts.yml:/etc/prometheus/alerts.yml:ro
      - prometheus-data:/prometheus
    ports:
      - "${PROMETHEUS_PORT:-9090}:9090"
    networks:
      - social-selling-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:9090/-/healthy"]
      interval: 15s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M

  # Grafana (Dashboards)
  grafana:
    image: grafana/grafana:latest
    container_name: social-selling-grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD}
      GF_INSTALL_PLUGINS: ''
      GF_SERVER_ROOT_URL: ${GRAFANA_ROOT_URL:-http://localhost:3001}
    volumes:
      - ./infrastructure/monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
      - ./infrastructure/monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - grafana-data:/var/lib/grafana
    ports:
      - "${GRAFANA_PORT:-3001}:3000"
    networks:
      - social-selling-network
    depends_on:
      - prometheus
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 15s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M
```

### Phase 2: Create .env.example Template (30 minutes)

```bash
# File: /.env.example

# ====================================
# APPLICATION CONFIGURATION
# ====================================
NODE_ENV=development
APP_NAME=SocialSelling
APP_URL=http://localhost
API_URL=http://localhost/api
WS_URL=ws://localhost/socket.io

# ====================================
# DATABASE (PostgreSQL)
# ====================================
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=social_selling
POSTGRES_USER=social_selling_user
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

# ====================================
# CACHE & QUEUE (Redis)
# ====================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
REDIS_URL=redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}

# ====================================
# OBJECT STORAGE (MinIO)
# ====================================
MINIO_HOST=minio
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
MINIO_BUCKET_NAME=social-selling-media
MINIO_ENDPOINT=http://localhost:9000

# ====================================
# AUTHENTICATION & SECURITY
# ====================================
JWT_SECRET=CHANGE_ME_GENERATE_WITH_openssl_rand_-base64_64
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=CHANGE_ME_GENERATE_WITH_openssl_rand_-base64_64
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=CHANGE_ME_GENERATE_WITH_openssl_rand_-base64_32

# ====================================
# INSTAGRAM API CREDENTIALS
# ====================================
INSTAGRAM_APP_ID=YOUR_INSTAGRAM_APP_ID
INSTAGRAM_APP_SECRET=YOUR_INSTAGRAM_APP_SECRET
INSTAGRAM_REDIRECT_URI=http://localhost/api/instagram/oauth/callback
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=CHANGE_ME_RANDOM_STRING

# ====================================
# WHATSAPP API CREDENTIALS (Phase 2)
# ====================================
WHATSAPP_APP_ID=YOUR_WHATSAPP_APP_ID
WHATSAPP_APP_SECRET=YOUR_WHATSAPP_APP_SECRET

# ====================================
# EMAIL SERVICE (SendGrid/Mailgun)
# ====================================
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY
SMTP_FROM_EMAIL=noreply@willianbvsanches.com
SMTP_FROM_NAME=SocialSelling Platform

# ====================================
# MONITORING & OBSERVABILITY
# ====================================
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
GRAFANA_ROOT_URL=http://localhost:3001

# ====================================
# APPLICATION PORTS
# ====================================
BACKEND_PORT=4000
FRONTEND_PORT=3000

# ====================================
# WORKER CONFIGURATION
# ====================================
WORKER_CONCURRENCY=5

# ====================================
# FEATURE FLAGS
# ====================================
ENABLE_WHATSAPP=false
ENABLE_AI_FEATURES=false
```

### Phase 3: Create docker-compose.override.yml for Development (30 minutes)

```yaml
# File: /docker-compose.override.yml
# This file is automatically merged with docker-compose.yml in development
version: '3.9'

services:
  backend:
    build:
      target: development
    command: npm run start:dev
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      DEBUG: 'app:*'
    ports:
      - "4000:4000"
      - "9229:9229"  # Node.js debugger port

  frontend:
    build:
      target: development
    command: npm run dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      NODE_ENV: development

  worker:
    build:
      target: development
    command: npm run worker:dev
    volumes:
      - ./backend:/app
      - /app/node_modules

  # Development-only services
  postgres-admin:
    image: dpage/pgadmin4:latest
    container_name: social-selling-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@socialselling.local
      PGADMIN_DEFAULT_PASSWORD: admin
      PGADMIN_CONFIG_SERVER_MODE: 'False'
    ports:
      - "5050:80"
    networks:
      - social-selling-network
    depends_on:
      - postgres

  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: social-selling-redis-commander
    restart: unless-stopped
    environment:
      REDIS_HOSTS: local:redis:6379:0:${REDIS_PASSWORD}
    ports:
      - "8081:8081"
    networks:
      - social-selling-network
    depends_on:
      - redis
```

### Phase 4: Create Infrastructure Documentation (1 hour)

```markdown
# File: /infrastructure/docker/README.md

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
```

---

## Files to Create

```
/
├── docker-compose.yml                    # Main compose configuration
├── docker-compose.override.yml           # Development overrides
├── .env.example                          # Environment template
├── .env                                  # Actual environment (gitignored)
└── infrastructure/
    └── docker/
        └── README.md                     # Docker documentation
```

---

## Dependencies

**Prerequisites:**
- INFRA-001 (VPS with Docker installed)

**Blocks:**
- INFRA-003 (PostgreSQL Database)
- INFRA-004 (Redis Cache)
- INFRA-005 (MinIO Storage)
- INFRA-006 (Nginx Reverse Proxy)
- INFRA-009 (Monitoring Stack)
- BE-001 (NestJS Initialization)
- FE-001 (Next.js Initialization)

---

## Acceptance Criteria

- [ ] `docker compose up -d` starts all services successfully
- [ ] All services show as healthy in `docker compose ps`:
  - [ ] postgres (healthy)
  - [ ] redis (healthy)
  - [ ] minio (healthy)
  - [ ] nginx (healthy)
  - [ ] backend (healthy)
  - [ ] frontend (healthy)
  - [ ] worker (running)
  - [ ] prometheus (healthy)
  - [ ] grafana (healthy)
- [ ] Persistent volumes created for all data services
- [ ] Environment variables loaded correctly from `.env`
- [ ] Services can communicate on Docker network
- [ ] Resource limits enforced (verify with `docker stats`)
- [ ] Health checks working for all services
- [ ] Restart policies configured (unless-stopped)
- [ ] Can access services via exposed ports:
  - [ ] PostgreSQL: localhost:5432
  - [ ] Redis: localhost:6379
  - [ ] MinIO Console: localhost:9001
  - [ ] Backend: localhost:4000
  - [ ] Frontend: localhost:3000
  - [ ] Prometheus: localhost:9090
  - [ ] Grafana: localhost:3001
- [ ] `.env.example` template complete and documented
- [ ] Development override working with hot reload

---

## Testing Procedure

```bash
# 1. Start stack
docker compose up -d

# 2. Wait for health checks (30 seconds)
sleep 30

# 3. Verify all services healthy
docker compose ps | grep -c "healthy"
# Should output: 7 (postgres, redis, minio, nginx, backend, frontend, prometheus, grafana)

# 4. Test PostgreSQL
docker compose exec postgres pg_isready -U social_selling_user

# 5. Test Redis
docker compose exec redis redis-cli -a ${REDIS_PASSWORD} ping

# 6. Test MinIO
curl -I http://localhost:9001

# 7. Test Backend
curl http://localhost:4000/health

# 8. Test Frontend
curl -I http://localhost:3000

# 9. Test Prometheus
curl http://localhost:9090/-/healthy

# 10. Test Grafana
curl http://localhost:3001/api/health

# 11. Check resource usage
docker stats --no-stream

# 12. Check logs for errors
docker compose logs --tail=50 | grep -i error

# 13. Test restart
docker compose restart backend
sleep 10
docker compose ps backend | grep -c "healthy"
```

---

## Cost Estimate

- **Infrastructure:** Included in INFRA-001 VPS cost
- **Docker Images:** Free (using official images)
- **Time Investment:** 6 hours
- **Total Additional Cost:** $0

---

## Related Documents

- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Previous Task: INFRA-001 (VPS Provisioning)
- Next Tasks: INFRA-003, INFRA-004, INFRA-005, BE-001, FE-001

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
