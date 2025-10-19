# 🚀 Quick Start Scripts

This project includes convenient shell scripts to manage all Docker services.

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `./start.sh` | Start all services (builds if needed) |
| `./stop.sh` | Stop all services |
| `./logs.sh` | View service logs |
| `./status.sh` | Check service health and status |

## ⚡ Quick Commands

```bash
# First time setup or after code changes
./start.sh --clean -d

# Check if everything is running
./status.sh

# Watch worker logs
./logs.sh worker -f

# Watch all logs
./logs.sh all -f

# Stop everything
./stop.sh
```

## 📖 Detailed Usage

### Start Services
```bash
# Start and watch logs (foreground)
./start.sh

# Start in background
./start.sh -d

# Clean start (removes old data)
./start.sh --clean -d

# Just build (don't start)
./start.sh --build-only
```

### View Logs
```bash
# Follow worker logs
./logs.sh worker -f

# Last 100 backend logs
./logs.sh backend --tail 100

# All services
./logs.sh all -f
```

### Stop Services
```bash
# Stop (keeps data)
./stop.sh

# Stop and remove data
./stop.sh -v
```

### Check Status
```bash
# See all service statuses
./status.sh
```

## 🎯 Common Workflows

### Development
```bash
# Start everything
./start.sh -d

# Watch worker processing jobs
./logs.sh worker -f

# Check status
./status.sh

# Stop when done
./stop.sh
```

### Fresh Start
```bash
# Clean everything and restart
./stop.sh -v
./start.sh --clean -d
```

### Debugging
```bash
# Check what's running
./status.sh

# View specific service logs
./logs.sh backend --tail 200

# Follow logs in real-time
./logs.sh worker -f
```

## 🔗 Service URLs (after starting)

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api
- **API Docs**: http://localhost:4000/api/docs
- **MinIO Console**: http://localhost:9001
- **Grafana**: http://localhost:3001

## 📚 More Information

See `DOCKER.md` for complete documentation.
