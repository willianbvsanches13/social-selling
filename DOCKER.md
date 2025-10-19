# Docker Setup Guide

This project includes convenient scripts to manage Docker services.

## 🚀 Quick Start

```bash
# Start all services
./start.sh

# Start in background (detached mode)
./start.sh -d

# Stop all services
./stop.sh

# View logs
./logs.sh worker -f
```

## 📝 Available Scripts

### `start.sh` - Start All Services

Builds and starts all Docker containers with proper configuration.

**Usage:**
```bash
./start.sh [OPTIONS]
```

**Options:**
- `--clean` - Clean up old containers and volumes before starting
- `-d, --detach` - Run services in background (detached mode)
- `--build-only` - Only build images, don't start services
- `-h, --help` - Show help message

**Examples:**
```bash
# Start services and watch logs
./start.sh

# Start in background
./start.sh -d

# Clean start (removes old data)
./start.sh --clean -d

# Just build images
./start.sh --build-only
```

### `stop.sh` - Stop All Services

Stops all running Docker containers.

**Usage:**
```bash
./stop.sh [OPTIONS]
```

**Options:**
- `-v, --volumes` - Also remove volumes (⚠️ **deletes all database data!**)
- `-h, --help` - Show help message

**Examples:**
```bash
# Stop services (keeps data)
./stop.sh

# Stop and remove all data
./stop.sh -v
```

### `logs.sh` - View Service Logs

View logs from specific services or all services.

**Usage:**
```bash
./logs.sh [SERVICE] [OPTIONS]
```

**Services:**
- `backend` - Backend API logs
- `worker` - Worker service logs (BullMQ processors)
- `frontend` - Frontend Next.js logs
- `postgres` - PostgreSQL database logs
- `redis` - Redis cache logs
- `minio` - MinIO object storage logs
- `nginx` - Nginx reverse proxy logs
- `all` - All services (default)

**Options:**
- `-f, --follow` - Follow log output (like tail -f)
- `--tail N` - Show last N lines
- `-h, --help` - Show help message

**Examples:**
```bash
# Follow worker logs
./logs.sh worker -f

# Show last 100 backend logs
./logs.sh backend --tail 100

# Follow all logs
./logs.sh all -f
```

## 🔗 Service URLs

Once started, access services at:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js application |
| Backend API | http://localhost:4000/api | NestJS REST API |
| API Docs | http://localhost:4000/api/docs | Swagger/OpenAPI documentation |
| Health Check | http://localhost:4000/health | Service health status |
| MinIO Console | http://localhost:9001 | Object storage management |
| Grafana | http://localhost:3001 | Monitoring dashboards |
| Prometheus | http://localhost:9090 | Metrics collection |

## 🔧 Worker Service

The worker service runs in the background and processes jobs from:
- **Instagram Publishing Queue** - Scheduled Instagram posts
- **Webhook Events Queue** - Instagram webhook events
- **Email Notifications Queue** - Email sending

To monitor worker activity:
```bash
# View worker logs in real-time
./logs.sh worker -f

# Check worker status
docker compose ps worker
```

## 🐛 Troubleshooting

### "failed to execute bake" Error

The scripts automatically handle this by disabling BuildKit. If you run `docker compose` commands manually, use:

```bash
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0
docker compose up
```

Or source the environment file:
```bash
source .env.docker
docker compose up
```

### Services Not Starting

1. Check Docker is running:
   ```bash
   docker info
   ```

2. Check service logs:
   ```bash
   ./logs.sh [service-name]
   ```

3. Try clean restart:
   ```bash
   ./stop.sh -v
   ./start.sh --clean -d
   ```

### Port Conflicts

If ports are already in use, modify `docker-compose.yml` to use different ports.

### Database Connection Issues

Ensure the database is healthy:
```bash
docker compose ps postgres
./logs.sh postgres
```

## 📚 Additional Commands

```bash
# View running services
docker compose ps

# Execute command in container
docker compose exec backend npm run migrate:up
docker compose exec worker npm run migrate:status

# Restart specific service
docker compose restart worker

# View resource usage
docker stats

# Remove all stopped containers
docker system prune
```

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:
- Database credentials
- Redis password
- MinIO credentials
- API keys (Instagram, SendGrid, etc.)
- JWT secrets

## 📦 Services Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Nginx (Port 80)                      │
│                   Reverse Proxy                          │
└──────────────┬──────────────────────┬───────────────────┘
               │                       │
       ┌───────▼────────┐      ┌──────▼────────┐
       │   Frontend      │      │   Backend     │
       │   (Next.js)     │      │   (NestJS)    │
       │   Port 3000     │      │   Port 4000   │
       └─────────────────┘      └───────┬───────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
            ┌───────▼────────┐  ┌──────▼──────┐   ┌───────▼────────┐
            │   PostgreSQL    │  │    Redis    │   │     MinIO      │
            │   Port 5432     │  │  Port 6379  │   │   Port 9000    │
            └─────────────────┘  └──────┬──────┘   └────────────────┘
                                        │
                                ┌───────▼────────┐
                                │     Worker     │
                                │    (BullMQ)    │
                                │  Background    │
                                └────────────────┘
```

## 🎯 Development Workflow

1. **Start services:**
   ```bash
   ./start.sh -d
   ```

2. **Run migrations:**
   ```bash
   docker compose exec backend npm run migrate:up
   ```

3. **Watch logs:**
   ```bash
   ./logs.sh worker -f
   ```

4. **Make changes** to code (hot-reload enabled in dev mode)

5. **Stop services:**
   ```bash
   ./stop.sh
   ```

## 📄 License

See LICENSE file for details.
