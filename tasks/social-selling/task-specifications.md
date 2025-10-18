# Technical Task Specifications: Social Selling Platform
**Document Version:** 1.0
**Date:** 2025-10-18
**Project:** Social Selling Platform - Instagram & WhatsApp Business
**Status:** Detailed Specifications - Ready for Development
**Reference Documents:**
- Implementation Plan: `/Users/williansanches/projects/personal/social-selling-2/tasks/social-selling/implementation-plan.md`
- Architecture Design: `/Users/williansanches/projects/personal/social-selling-2/tasks/social-selling/architecture-design.md`
- Discovery Summary: `/Users/williansanches/projects/personal/social-selling-2/tasks/social-selling/discovery-summary.md`

---

## Table of Contents

1. [Domain 1: Infrastructure & DevOps](#domain-1-infrastructure--devops)
2. [Domain 2: Backend Core](#domain-2-backend-core)
3. [Domain 3: Instagram Integration](#domain-3-instagram-integration)
4. [Domain 4: Frontend Development](#domain-4-frontend-development)
5. [Domain 5: Background Workers](#domain-5-background-workers)
6. [Domain 6: Testing & Deployment](#domain-6-testing--deployment)

---

## Domain 1: Infrastructure & DevOps

### INFRA-001: VPS Provisioning and Initial Setup

#### Data Models
N/A (Infrastructure task)

#### Configuration Files

**File: `/infrastructure/terraform/providers.tf`**
```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

provider "null" {}
```

**File: `/infrastructure/scripts/setup-server.sh`**
```bash
#!/bin/bash
# Social Selling Platform - Server Setup Script
# Run as root on fresh Ubuntu 22.04 installation

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root"
    exit 1
fi

log_info "Starting Social Selling Platform server setup..."

# Update system packages
log_info "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install essential packages
log_info "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    fail2ban \
    ca-certificates \
    gnupg \
    lsb-release \
    unattended-upgrades

# Configure automatic security updates
log_info "Configuring automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

# Enable unattended upgrades
dpkg-reconfigure -plow unattended-upgrades

# Configure UFW firewall
log_info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

log_info "Firewall rules:"
ufw status verbose

# Configure fail2ban for SSH protection
log_info "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@socialselling.com
sendername = Fail2Ban
action = %(action_mwl)s

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Create non-root user for deployment
log_info "Creating deployment user..."
if ! id -u deploy &>/dev/null; then
    useradd -m -s /bin/bash deploy
    mkdir -p /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh

    # Add to docker group (will be created by docker installation)
    log_info "User 'deploy' created. Add SSH key manually to /home/deploy/.ssh/authorized_keys"
else
    log_warn "User 'deploy' already exists"
fi

# Configure timezone
log_info "Setting timezone to UTC..."
timedatectl set-timezone UTC

# Create application directories
log_info "Creating application directories..."
mkdir -p /opt/social-selling
mkdir -p /var/log/social-selling
chown -R deploy:deploy /opt/social-selling
chown -R deploy:deploy /var/log/social-selling

# System optimization
log_info "Applying system optimizations..."
cat >> /etc/sysctl.conf <<EOF

# Social Selling Platform optimizations
net.core.somaxconn = 1024
net.ipv4.ip_local_port_range = 1024 65535
fs.file-max = 65535
EOF

sysctl -p

log_info "Server setup completed successfully!"
log_info "Next steps:"
log_info "1. Add SSH public key to /home/deploy/.ssh/authorized_keys"
log_info "2. Run install-docker.sh to install Docker and Docker Compose"
log_info "3. Configure SSH to disable password authentication"
```

**File: `/infrastructure/scripts/install-docker.sh`**
```bash
#!/bin/bash
# Install Docker and Docker Compose on Ubuntu 22.04

set -e

# Color codes
GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_info "Installing Docker and Docker Compose..."

# Remove old versions
apt-get remove -y docker docker-engine docker.io containerd runc || true

# Install Docker
log_info "Adding Docker repository..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update

log_info "Installing Docker Engine..."
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl enable docker
systemctl start docker

# Add deploy user to docker group
usermod -aG docker deploy

# Verify installation
log_info "Docker version:"
docker --version

log_info "Docker Compose version:"
docker compose version

# Configure Docker daemon for production
log_info "Configuring Docker daemon..."
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "userland-proxy": false,
  "default-address-pools": [
    {
      "base": "172.20.0.0/16",
      "size": 24
    }
  ]
}
EOF

systemctl restart docker

log_info "Docker installation completed successfully!"
log_info "Deployment user 'deploy' added to docker group"
log_info "Note: User may need to log out and back in for group membership to take effect"
```

#### Pseudocode/Logic Flow
```
PROCEDURE setup_vps():
    1. SSH into Hostinger VPS as root
    2. Run setup-server.sh:
        - Update all packages
        - Install essential tools
        - Configure UFW firewall (allow 22, 80, 443)
        - Configure fail2ban for SSH protection
        - Enable automatic security updates
        - Create deployment user
        - Set up directory structure
    3. Run install-docker.sh:
        - Install Docker Engine and Docker Compose
        - Add deployment user to docker group
        - Configure Docker daemon settings
    4. Configure SSH:
        - Copy public key to /home/deploy/.ssh/authorized_keys
        - Disable password authentication in /etc/ssh/sshd_config
        - Restart SSH service
    5. Test SSH access with key
    6. Test Docker: docker ps
END PROCEDURE
```

#### Dependencies
- Hostinger VPS account with KVM 2 plan purchased
- SSH access to fresh Ubuntu 22.04 installation
- SSH key pair generated locally

#### Integration Points
- **Upstream**: None (initial setup)
- **Downstream**: All subsequent infrastructure tasks depend on this

#### Acceptance Criteria Checklist
```
[ ] Can SSH into VPS using key-based authentication
[ ] Password authentication disabled
[ ] UFW firewall active with rules: allow 22, 80, 443
[ ] fail2ban running and monitoring SSH
[ ] Docker installed and running
[ ] Docker Compose installed
[ ] `docker ps` command works
[ ] User 'deploy' exists and can run docker commands
[ ] Automatic security updates configured
```

---

### INFRA-002: Docker Compose Stack Setup

#### Data Models
N/A (Infrastructure configuration)

#### Configuration Files

**File: `/docker-compose.yml`**
```yaml
version: '3.8'

networks:
  social-selling-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres_data:
  redis_data:
  minio_data:
  prometheus_data:
  grafana_data:

services:
  # ===== Frontend =====
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: social-selling-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${API_URL}
      - NEXT_PUBLIC_WS_URL=${WS_URL}
    networks:
      - social-selling-network
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    mem_limit: 512m
    cpus: 0.5

  # ===== Backend API =====
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: social-selling-backend
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - INSTAGRAM_APP_ID=${INSTAGRAM_APP_ID}
      - INSTAGRAM_APP_SECRET=${INSTAGRAM_APP_SECRET}
      - INSTAGRAM_REDIRECT_URI=${INSTAGRAM_REDIRECT_URI}
    networks:
      - social-selling-network
    depends_on:
      - postgres
      - redis
      - minio
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    mem_limit: 1g
    cpus: 1.0

  # ===== PostgreSQL Database =====
  postgres:
    image: postgres:15-alpine
    container_name: social-selling-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=en_US.utf8
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - social-selling-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    mem_limit: 512m
    cpus: 0.5
    command:
      - "postgres"
      - "-c"
      - "max_connections=100"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "effective_cache_size=1GB"
      - "-c"
      - "maintenance_work_mem=64MB"
      - "-c"
      - "checkpoint_completion_target=0.9"
      - "-c"
      - "wal_buffers=16MB"
      - "-c"
      - "default_statistics_target=100"

  # ===== Redis Cache =====
  redis:
    image: redis:7-alpine
    container_name: social-selling-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - social-selling-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    mem_limit: 256m
    cpus: 0.25

  # ===== MinIO S3-Compatible Storage =====
  minio:
    image: minio/minio:latest
    container_name: social-selling-minio
    restart: unless-stopped
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    networks:
      - social-selling-network
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
    mem_limit: 512m
    cpus: 0.5

  # ===== BullMQ Workers =====
  worker-publisher:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    container_name: social-selling-worker-publisher
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - WORKER_TYPE=post-publisher
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
    networks:
      - social-selling-network
    depends_on:
      - postgres
      - redis
      - backend
    mem_limit: 512m
    cpus: 0.5

  worker-webhook:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    container_name: social-selling-worker-webhook
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - WORKER_TYPE=webhook-processor
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
    networks:
      - social-selling-network
    depends_on:
      - postgres
      - redis
      - backend
    mem_limit: 512m
    cpus: 0.5

  worker-analytics:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    container_name: social-selling-worker-analytics
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - WORKER_TYPE=analytics-refresh
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
    networks:
      - social-selling-network
    depends_on:
      - postgres
      - redis
      - backend
    mem_limit: 256m
    cpus: 0.25

  # ===== Nginx Reverse Proxy =====
  nginx:
    image: nginx:alpine
    container_name: social-selling-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infrastructure/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./infrastructure/certbot/conf:/etc/letsencrypt:ro
      - ./infrastructure/certbot/www:/var/www/certbot:ro
    networks:
      - social-selling-network
    depends_on:
      - frontend
      - backend
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3
    mem_limit: 128m
    cpus: 0.25

  # ===== Prometheus Monitoring =====
  prometheus:
    image: prom/prometheus:latest
    container_name: social-selling-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./infrastructure/monitoring/alerts.yml:/etc/prometheus/alerts.yml:ro
      - prometheus_data:/prometheus
    networks:
      - social-selling-network
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    mem_limit: 512m
    cpus: 0.5

  # ===== Grafana Dashboards =====
  grafana:
    image: grafana/grafana:latest
    container_name: social-selling-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_USER}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_INSTALL_PLUGINS=
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infrastructure/monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
      - ./infrastructure/monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
    networks:
      - social-selling-network
    depends_on:
      - prometheus
    mem_limit: 256m
    cpus: 0.25

  # ===== Loki Log Aggregation =====
  loki:
    image: grafana/loki:latest
    container_name: social-selling-loki
    restart: unless-stopped
    ports:
      - "3100:3100"
    volumes:
      - ./infrastructure/monitoring/loki-config.yml:/etc/loki/loki-config.yml:ro
    networks:
      - social-selling-network
    command: -config.file=/etc/loki/loki-config.yml
    mem_limit: 256m
    cpus: 0.25

  # ===== Promtail Log Collector =====
  promtail:
    image: grafana/promtail:latest
    container_name: social-selling-promtail
    restart: unless-stopped
    volumes:
      - ./infrastructure/monitoring/promtail-config.yml:/etc/promtail/promtail-config.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/log:/var/log:ro
    networks:
      - social-selling-network
    command: -config.file=/etc/promtail/promtail-config.yml
    depends_on:
      - loki
    mem_limit: 128m
    cpus: 0.25
```

**File: `/.env.example`**
```bash
# Application
NODE_ENV=production
APP_NAME=Social Selling Platform
APP_URL=https://app-socialselling.willianbvsanches.com

# API Configuration
API_URL=https://app-socialselling.willianbvsanches.com/api
WS_URL=wss://app-socialselling.willianbvsanches.com/socket.io

# Database
DB_USER=socialselling
DB_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
DB_NAME=socialselling_production
DB_HOST=postgres
DB_PORT=5432

# Redis
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD
REDIS_HOST=redis
REDIS_PORT=6379

# MinIO S3 Storage
MINIO_ACCESS_KEY=CHANGE_THIS_ACCESS_KEY
MINIO_SECRET_KEY=CHANGE_THIS_SECRET_KEY
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_BUCKET=social-selling-media
MINIO_USE_SSL=false

# JWT Secrets (Generate with: openssl rand -base64 64)
JWT_SECRET=CHANGE_THIS_JWT_SECRET_MIN_32_CHARS
JWT_REFRESH_SECRET=CHANGE_THIS_REFRESH_SECRET_MIN_32_CHARS
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# Instagram API
INSTAGRAM_APP_ID=YOUR_INSTAGRAM_APP_ID
INSTAGRAM_APP_SECRET=YOUR_INSTAGRAM_APP_SECRET
INSTAGRAM_REDIRECT_URI=https://app-socialselling.willianbvsanches.com/api/instagram/oauth/callback

# WhatsApp API (Phase 2)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=

# Email Service (SendGrid)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@socialselling.com
SENDGRID_FROM_NAME=Social Selling Platform

# Monitoring
GRAFANA_USER=admin
GRAFANA_PASSWORD=CHANGE_THIS_GRAFANA_PASSWORD

# Backup Storage
BACKUP_STORAGE_TYPE=s3
BACKUP_S3_BUCKET=social-selling-backups
BACKUP_S3_REGION=us-east-1
BACKUP_S3_ACCESS_KEY=
BACKUP_S3_SECRET_KEY=
```

#### Pseudocode/Logic Flow
```
PROCEDURE setup_docker_compose():
    1. Copy docker-compose.yml to /opt/social-selling/
    2. Copy .env.example to .env
    3. Generate secure passwords:
        - DB_PASSWORD
        - REDIS_PASSWORD
        - JWT_SECRET (openssl rand -base64 64)
        - JWT_REFRESH_SECRET (openssl rand -base64 64)
        - MINIO_ACCESS_KEY and MINIO_SECRET_KEY
        - GRAFANA_PASSWORD
    4. Update Instagram API credentials in .env
    5. Run: docker compose up -d
    6. Wait for health checks to pass
    7. Verify all containers running: docker ps
    8. Check logs: docker compose logs -f
END PROCEDURE
```

#### Dependencies
- INFRA-001 (Docker installed)
- Instagram App created in Meta Developer Portal

#### Integration Points
- **Upstream**: INFRA-001
- **Downstream**: All database, backend, frontend, and worker tasks

#### Acceptance Criteria Checklist
```
[ ] docker-compose.yml valid and parses correctly
[ ] All services start successfully with `docker compose up -d`
[ ] docker ps shows all containers as "healthy" or "running"
[ ] Persistent volumes created for postgres, redis, minio
[ ] Environment variables loaded correctly (check docker compose config)
[ ] Services can communicate on docker network (test with docker exec)
[ ] Resource limits enforced (check docker stats)
[ ] Container restart policies working (test with docker compose restart)
```

---

### INFRA-003: PostgreSQL Database Initialization

#### Data Models

**File: `/database/init/01-extensions.sql`**
```sql
-- Install required PostgreSQL extensions

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptography functions for token encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search (trigram matching)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Output message
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL extensions installed successfully';
    RAISE NOTICE '- uuid-ossp: UUID generation';
    RAISE NOTICE '- pgcrypto: Encryption functions';
    RAISE NOTICE '- pg_trgm: Full-text search trigrams';
END $$;
```

**File: `/database/init/02-users.sql`**
```sql
-- Create database users and set permissions

-- Main application user (already created as POSTGRES_USER in docker-compose)
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE socialselling_production TO socialselling;

-- Create read-only user for analytics/reporting (future use)
CREATE USER socialselling_readonly WITH PASSWORD 'CHANGE_THIS_READONLY_PASSWORD';
GRANT CONNECT ON DATABASE socialselling_production TO socialselling_readonly;
GRANT USAGE ON SCHEMA public TO socialselling_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO socialselling_readonly;

-- Output message
DO $$
BEGIN
    RAISE NOTICE 'Database users configured successfully';
END $$;
```

**File: `/database/migrations/001-initial-schema.sql`**
```sql
-- Migration: 001 - Initial Schema
-- Created: 2025-10-18
-- Description: Create core tables for users, client accounts, OAuth tokens

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    subscription_tier VARCHAR(50) DEFAULT 'FREE', -- FREE, STARTER, PROFESSIONAL, ENTERPRISE
    preferences JSONB DEFAULT '{}'::jsonb,
    email_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP -- Soft delete
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier) WHERE deleted_at IS NULL;

-- Client accounts table (Instagram/WhatsApp accounts managed by users)
CREATE TABLE IF NOT EXISTS client_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'instagram' | 'whatsapp'
    platform_account_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    profile_picture_url TEXT,
    follower_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- 'active' | 'token_expired' | 'disconnected'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for client_accounts
CREATE INDEX idx_client_accounts_user_id ON client_accounts(user_id);
CREATE INDEX idx_client_accounts_platform ON client_accounts(platform);
CREATE INDEX idx_client_accounts_status ON client_accounts(status);
CREATE UNIQUE INDEX idx_client_accounts_platform_account ON client_accounts(platform, platform_account_id);

-- OAuth tokens table (encrypted storage of access tokens)
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'instagram' | 'whatsapp'
    access_token_encrypted BYTEA NOT NULL, -- Encrypted with pgcrypto
    refresh_token_encrypted BYTEA, -- Encrypted with pgcrypto
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP,
    scope TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for oauth_tokens
CREATE INDEX idx_oauth_tokens_client_account ON oauth_tokens(client_account_id);
CREATE INDEX idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

-- Messages table (Instagram DMs and WhatsApp messages)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    platform_message_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'instagram' | 'whatsapp'
    sender_id VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    recipient_id VARCHAR(255),
    content TEXT NOT NULL,
    media_urls JSONB, -- Array of media URLs/keys
    direction VARCHAR(50) NOT NULL, -- 'inbound' | 'outbound'
    status VARCHAR(50) NOT NULL DEFAULT 'sent', -- 'sent' | 'delivered' | 'read' | 'failed'
    conversation_id VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    search_vector TSVECTOR -- Full-text search
);

-- Indexes for messages
CREATE INDEX idx_messages_client_account ON messages(client_account_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_platform_message ON messages(platform_message_id);
CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);

-- Trigger for search vector auto-update
CREATE OR REPLACE FUNCTION update_messages_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, '') || ' ' || COALESCE(NEW.sender_name, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_update_messages_search_vector
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_messages_search_vector();

-- Scheduled posts table
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    post_type VARCHAR(50) NOT NULL, -- 'feed' | 'story' | 'reel'
    caption TEXT,
    media_keys JSONB NOT NULL, -- Array of MinIO object keys
    scheduled_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled' | 'processing' | 'published' | 'failed'
    published_at TIMESTAMP,
    platform_post_id VARCHAR(255),
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for scheduled_posts
CREATE INDEX idx_scheduled_posts_client_account ON scheduled_posts(client_account_id);
CREATE INDEX idx_scheduled_posts_scheduled_time ON scheduled_posts(scheduled_time);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_created_at ON scheduled_posts(created_at DESC);

-- Analytics snapshots table
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'instagram' | 'whatsapp'
    metric_type VARCHAR(100) NOT NULL, -- 'followers' | 'engagement_rate' | 'reach' | 'impressions'
    metric_value NUMERIC(15, 2),
    date DATE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics_snapshots
CREATE INDEX idx_analytics_client_account ON analytics_snapshots(client_account_id);
CREATE INDEX idx_analytics_date ON analytics_snapshots(date DESC);
CREATE INDEX idx_analytics_metric_type ON analytics_snapshots(metric_type);
CREATE UNIQUE INDEX idx_analytics_unique_snapshot ON analytics_snapshots(client_account_id, metric_type, date);

-- Sessions table (for session management)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_session_token ON sessions(session_token);

-- Updated_at trigger function (generic)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to tables
CREATE TRIGGER trig_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trig_client_accounts_updated_at
    BEFORE UPDATE ON client_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trig_oauth_tokens_updated_at
    BEFORE UPDATE ON oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trig_scheduled_posts_updated_at
    BEFORE UPDATE ON scheduled_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Output completion message
DO $$
BEGIN
    RAISE NOTICE 'Initial schema migration completed successfully';
    RAISE NOTICE 'Tables created: users, client_accounts, oauth_tokens, messages, scheduled_posts, analytics_snapshots, sessions';
    RAISE NOTICE 'Indexes and triggers configured';
END $$;
```

**File: `/backend/src/infrastructure/database/database.ts`**
```typescript
import pgPromise from 'pg-promise';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IDatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number; // Connection pool size
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db: pgPromise.IDatabase<any>;
  private pgp: pgPromise.IMain;

  constructor(private configService: ConfigService) {
    this.pgp = pgPromise({
      // Error handling
      error: (err, e) => {
        console.error('[DB ERROR]', err);
        if (e.cn) {
          // Connection error
          console.error('Connection:', e.cn);
        }
        if (e.query) {
          // Query error
          console.error('Query:', e.query);
        }
      },
      // Query logging (dev only)
      query: (e) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DB QUERY]', e.query);
        }
      }
    });
  }

  async onModuleInit() {
    const config: IDatabaseConfig = {
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      database: this.configService.get<string>('DB_NAME', 'socialselling_production'),
      user: this.configService.get<string>('DB_USER', 'socialselling'),
      password: this.configService.get<string>('DB_PASSWORD'),
      max: 20, // Max 20 connections in pool
    };

    this.db = this.pgp(config);

    // Test connection
    try {
      await this.db.connect();
      console.log('[DATABASE] Connected to PostgreSQL successfully');
    } catch (error) {
      console.error('[DATABASE] Connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pgp.end();
    console.log('[DATABASE] Connection pool closed');
  }

  getDatabase(): pgPromise.IDatabase<any> {
    return this.db;
  }

  // Transaction helper
  async transaction<T>(callback: (tx: pgPromise.ITask<any>) => Promise<T>): Promise<T> {
    return this.db.tx(callback);
  }

  // Helper methods
  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    return this.db.any(sql, params);
  }

  async queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
    return this.db.oneOrNone(sql, params);
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    await this.db.none(sql, params);
  }
}
```

**File: `/backend/src/infrastructure/database/db-config.ts`**
```typescript
export interface IDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
}

export const dbConfig = (): IDbConfig => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'socialselling_production',
  user: process.env.DB_USER || 'socialselling',
  password: process.env.DB_PASSWORD,
  max: 20,
});
```

#### Pseudocode/Logic Flow
```
PROCEDURE initialize_database():
    1. Ensure PostgreSQL container is running (docker ps)
    2. Connect to database as postgres superuser
    3. Run 01-extensions.sql:
        - Install uuid-ossp extension
        - Install pgcrypto extension
        - Install pg_trgm extension
    4. Run 02-users.sql:
        - Grant privileges to socialselling user
        - Create readonly user for future analytics
    5. Run migrations using node-pg-migrate:
        - Execute 001-initial-schema.sql
        - Create all core tables
        - Create indexes
        - Create triggers
    6. Verify tables created: \dt in psql
    7. Test connection from backend:
        - Run DatabaseService.onModuleInit()
        - Execute test query: SELECT 1
    8. Configure connection pooling (max 20 connections)
END PROCEDURE
```

#### Dependencies
- INFRA-002 (PostgreSQL container running)
- `.env` file with database credentials

#### Integration Points
- **Upstream**: INFRA-002 (Docker Compose)
- **Downstream**: All backend modules requiring database access

#### Acceptance Criteria Checklist
```
[ ] PostgreSQL container running and accessible
[ ] Extensions installed: uuid-ossp, pgcrypto, pg_trgm
[ ] All tables created successfully (users, client_accounts, oauth_tokens, messages, scheduled_posts, analytics_snapshots, sessions)
[ ] Indexes created on appropriate columns
[ ] Triggers created for updated_at and search_vector
[ ] Backend can connect to database successfully
[ ] Connection pooling configured (max 20 connections)
[ ] Can run migrations up/down without errors
[ ] Test query executed successfully from backend
```

---

## Domain 2: Backend Core

### BE-001: NestJS Project Initialization

#### Data Models
N/A (Project initialization)

#### Project Structure
```
backend/
├── src/
│   ├── main.ts                          # Application entry point
│   ├── app.module.ts                    # Root module
│   ├── config/
│   │   ├── configuration.ts             # Environment configuration
│   │   ├── logger.config.ts             # Winston logger configuration
│   │   └── swagger.config.ts            # Swagger/OpenAPI configuration
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   └── exceptions/
│   │       └── business.exception.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── instagram/
│   │   ├── message/
│   │   ├── content/
│   │   ├── analytics/
│   │   └── notification/
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── database.ts
│   │   │   ├── database.module.ts
│   │   │   ├── db-config.ts
│   │   │   └── repositories/
│   │   ├── cache/
│   │   │   ├── redis.service.ts
│   │   │   └── cache.module.ts
│   │   └── storage/
│   │       ├── minio.service.ts
│   │       └── storage.module.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   ├── client-account.entity.ts
│   │   │   ├── message.entity.ts
│   │   │   └── scheduled-post.entity.ts
│   │   └── repositories/
│   │       ├── user.repository.interface.ts
│   │       ├── client-account.repository.interface.ts
│   │       ├── message.repository.interface.ts
│   │       └── scheduled-post.repository.interface.ts
│   └── migrations/
│       └── ... (pg-migrate migrations)
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .eslintrc.js
├── .prettierrc
└── Dockerfile
```

#### Configuration Files

**File: `/backend/package.json`**
```json
{
  "name": "social-selling-backend",
  "version": "1.0.0",
  "description": "Social Selling Platform Backend API",
  "author": "Social Selling Team",
  "private": true,
  "license": "PROPRIETARY",
  "scripts": {
    "prebuild": "rimraf dist",
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "migrate:up": "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down",
    "migrate:create": "node-pg-migrate create"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "passport-oauth2": "^1.7.0",
    "bcrypt": "^5.1.0",
    "pg-promise": "^11.5.0",
    "redis": "^4.6.0",
    "bullmq": "^4.0.0",
    "minio": "^7.1.0",
    "axios": "^1.4.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "winston": "^3.10.0",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^3.0.8",
    "@types/passport-local": "^1.0.35",
    "@types/bcrypt": "^5.0.0",
    "@types/compression": "^1.7.2",
    "@typescript-eslint/eslint-plugin": "^5.59.11",
    "@typescript-eslint/parser": "^5.59.11",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^8.8.0",
    "eslint-plugin-prettier": "^4.2.1",
    "jest": "^29.5.0",
    "node-pg-migrate": "^6.2.2",
    "prettier": "^2.8.8",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3",
    "rimraf": "^5.0.1"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

**File: `/backend/tsconfig.json`**
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["src/*"],
      "@modules/*": ["src/modules/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@common/*": ["src/common/*"],
      "@domain/*": ["src/domain/*"],
      "@config/*": ["src/config/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**File: `/backend/.eslintrc.js`**
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
  },
};
```

**File: `/backend/.prettierrc`**
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**File: `/backend/src/main.ts`**
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import * as compression from 'compression';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Social Selling Platform API')
    .setDescription('API documentation for Social Selling Platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
```

**File: `/backend/src/app.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: process.env.NODE_ENV === 'production' ? '.env' : '.env.development',
    }),
    DatabaseModule,
    CacheModule,
    StorageModule,
    // Auth, User, Instagram, etc. modules will be added in subsequent tasks
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

**File: `/backend/src/config/configuration.ts`**
```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USER || 'socialselling',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'socialselling_production',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  instagram: {
    appId: process.env.INSTAGRAM_APP_ID,
    appSecret: process.env.INSTAGRAM_APP_SECRET,
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    bucket: process.env.MINIO_BUCKET || 'social-selling-media',
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@socialselling.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'Social Selling Platform',
  },
});
```

#### Pseudocode/Logic Flow
```
PROCEDURE initialize_nestjs_project():
    1. Create backend directory
    2. Run: npm init -y
    3. Install NestJS CLI: npm i -g @nestjs/cli
    4. Initialize NestJS project: nest new backend
    5. Install dependencies from package.json
    6. Create folder structure (modules, infrastructure, domain, config, common)
    7. Configure TypeScript (tsconfig.json) with path aliases
    8. Configure ESLint and Prettier
    9. Set up Husky for pre-commit hooks:
        - npx husky-init
        - Add pre-commit hook: npm run lint && npm run test
    10. Create main.ts with Swagger, helmet, compression
    11. Create app.module.ts with ConfigModule
    12. Create configuration.ts with environment variables
    13. Test server start: npm run start:dev
    14. Access Swagger docs: http://localhost:4000/api/docs
END PROCEDURE
```

#### Dependencies
- Node.js 18+ installed
- npm or yarn package manager
- INFRA-002 (Docker Compose with PostgreSQL, Redis, MinIO)

#### Integration Points
- **Upstream**: INFRA-002 (Database, cache, storage)
- **Downstream**: All backend modules (Auth, User, Instagram, etc.)

#### Acceptance Criteria Checklist
```
[ ] NestJS app starts successfully with `npm run start:dev`
[ ] TypeScript compilation working without errors
[ ] Environment variables loading from .env file
[ ] Linting and formatting working (npm run lint, npm run format)
[ ] Pre-commit hooks running (lint + tests)
[ ] Swagger UI accessible at http://localhost:4000/api/docs
[ ] Health endpoint responds at http://localhost:4000/api/health
[ ] Folder structure matches specification
[ ] Path aliases (@/, @modules/, etc.) working in imports
[ ] Database module imported and database connection tested
```

---

### BE-002: Database Repository Pattern Implementation

#### Data Models

**File: `/backend/src/domain/repositories/user.repository.interface.ts`**
```typescript
import { User } from '@domain/entities/user.entity';

export interface IUserRepository {
  // Create
  create(user: Partial<User>): Promise<User>;

  // Read
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(limit?: number, offset?: number): Promise<User[]>;

  // Update
  update(id: string, updates: Partial<User>): Promise<User>;
  updatePreferences(id: string, preferences: Record<string, any>): Promise<User>;

  // Delete
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;

  // Custom queries
  findBySubscriptionTier(tier: string): Promise<User[]>;
  countActiveUsers(): Promise<number>;

  // Transactions
  transaction<T>(callback: (repo: IUserRepository) => Promise<T>): Promise<T>;
}
```

**File: `/backend/src/domain/entities/user.entity.ts`**
```typescript
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  language: string;
  timezone: string;
  subscriptionTier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  preferences: Record<string, any>;
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type UpdateUserDto = Partial<Omit<User, 'id' | 'email' | 'passwordHash' | 'createdAt' | 'updatedAt'>>;
```

**File: `/backend/src/infrastructure/database/repositories/base.repository.ts`**
```typescript
import pgPromise from 'pg-promise';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database';

@Injectable()
export abstract class BaseRepository<T> {
  protected db: pgPromise.IDatabase<any>;

  constructor(
    protected databaseService: DatabaseService,
    protected tableName: string,
  ) {
    this.db = databaseService.getDatabase();
  }

  /**
   * Generic find by ID
   */
  protected async findById(id: string, columns: string = '*'): Promise<T | null> {
    const query = `SELECT ${columns} FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL`;
    return this.db.oneOrNone<T>(query, [id]);
  }

  /**
   * Generic find all with pagination
   */
  protected async findAll(
    limit: number = 50,
    offset: number = 0,
    orderBy: string = 'created_at DESC',
  ): Promise<T[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE deleted_at IS NULL
      ORDER BY ${orderBy}
      LIMIT $1 OFFSET $2
    `;
    return this.db.any<T>(query, [limit, offset]);
  }

  /**
   * Generic create
   */
  protected async create(data: Partial<T>): Promise<T> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    return this.db.one<T>(query, values);
  }

  /**
   * Generic update
   */
  protected async update(id: string, updates: Partial<T>): Promise<T> {
    const updateFields = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    const values = [id, ...Object.values(updates)];

    const query = `
      UPDATE ${this.tableName}
      SET ${updateFields}, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    return this.db.one<T>(query, values);
  }

  /**
   * Generic soft delete
   */
  protected async softDelete(id: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET deleted_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.none(query, [id]);
  }

  /**
   * Generic hard delete
   */
  protected async hardDelete(id: string): Promise<void> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    await this.db.none(query, [id]);
  }

  /**
   * Generic count
   */
  protected async count(whereClause: string = 'deleted_at IS NULL'): Promise<number> {
    const query = `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`;
    const result = await this.db.one<{ count: string }>(query);
    return parseInt(result.count, 10);
  }

  /**
   * Transaction helper
   */
  async transaction<R>(callback: (tx: pgPromise.ITask<any>) => Promise<R>): Promise<R> {
    return this.databaseService.transaction(callback);
  }
}
```

**File: `/backend/src/infrastructure/database/repositories/postgres-user.repository.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { User } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { DatabaseService } from '../database';

@Injectable()
export class PostgresUserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(databaseService: DatabaseService) {
    super(databaseService, 'users');
  }

  async create(user: Partial<User>): Promise<User> {
    return this.create(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE email = $1 AND deleted_at IS NULL`;
    return this.db.oneOrNone<User>(query, [email]);
  }

  async findAll(limit: number = 50, offset: number = 0): Promise<User[]> {
    return this.findAll(limit, offset);
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    return this.update(id, updates);
  }

  async updatePreferences(id: string, preferences: Record<string, any>): Promise<User> {
    const query = `
      UPDATE ${this.tableName}
      SET preferences = $2, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    return this.db.one<User>(query, [id, JSON.stringify(preferences)]);
  }

  async softDelete(id: string): Promise<void> {
    await this.softDelete(id);
  }

  async hardDelete(id: string): Promise<void> {
    await this.hardDelete(id);
  }

  async findBySubscriptionTier(tier: string): Promise<User[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE subscription_tier = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    return this.db.any<User>(query, [tier]);
  }

  async countActiveUsers(): Promise<number> {
    return this.count('deleted_at IS NULL');
  }
}
```

#### Pseudocode/Logic Flow
```
PROCEDURE implement_repository_pattern():
    1. Create IUserRepository interface:
        - Define standard CRUD methods
        - Define custom query methods
        - Define transaction support

    2. Create User entity:
        - Define User interface with all fields
        - Define DTOs (CreateUserDto, UpdateUserDto)

    3. Create BaseRepository<T>:
        - Inject DatabaseService
        - Implement generic CRUD methods:
            - findById(id): SELECT * FROM table WHERE id = $1
            - findAll(limit, offset): SELECT * FROM table LIMIT $1 OFFSET $2
            - create(data): INSERT INTO table VALUES (...) RETURNING *
            - update(id, updates): UPDATE table SET ... WHERE id = $1 RETURNING *
            - softDelete(id): UPDATE table SET deleted_at = NOW() WHERE id = $1
            - hardDelete(id): DELETE FROM table WHERE id = $1
            - count(whereClause): SELECT COUNT(*) FROM table WHERE ...
        - Implement transaction helper

    4. Create PostgresUserRepository extends BaseRepository:
        - Override/implement IUserRepository methods
        - Add user-specific queries:
            - findByEmail(email)
            - findBySubscriptionTier(tier)
            - updatePreferences(id, preferences)
            - countActiveUsers()

    5. Register repositories in DatabaseModule:
        - Provide PostgresUserRepository
        - Bind IUserRepository to PostgresUserRepository

    6. Test repository methods:
        - Create test user
        - Find user by ID and email
        - Update user
        - Soft delete user
        - Test transaction rollback
END PROCEDURE
```

#### Dependencies
- BE-001 (NestJS project initialized)
- INFRA-003 (Database initialized with users table)

#### Integration Points
- **Upstream**: INFRA-003 (Database schema)
- **Downstream**: All backend modules requiring user data access (Auth, User module)

#### Acceptance Criteria Checklist
```
[ ] DatabaseService provides database connection
[ ] BaseRepository implements generic CRUD operations
[ ] PostgresUserRepository implements IUserRepository interface
[ ] Can create user via repository
[ ] Can find user by ID
[ ] Can find user by email
[ ] Can update user fields
[ ] Can update user preferences (JSONB)
[ ] Can soft delete user (sets deleted_at)
[ ] Can hard delete user
[ ] Custom queries work (findBySubscriptionTier, countActiveUsers)
[ ] Transaction support working (commit/rollback)
[ ] Type safety with TypeScript interfaces
[ ] Dependency injection working in NestJS
```

---

### BE-003: Database Migrations System

#### Data Models
N/A (Migration infrastructure)

#### Configuration Files

**File: `/backend/migrations/config.json`**
```json
{
  "databaseUrl": {
    "env": "DATABASE_URL"
  },
  "dir": "migrations",
  "migrationsTable": "pg_migrations",
  "direction": "up",
  "checkOrder": true
}
```

**File: `/backend/package.json` (add scripts)**
```json
{
  "scripts": {
    "migrate:up": "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down",
    "migrate:create": "node-pg-migrate create",
    "migrate:redo": "node-pg-migrate redo",
    "migrate:status": "node-pg-migrate list"
  }
}
```

**File: `/backend/migrations/1697891234567_create-users-table.js`**
```javascript
/**
 * Migration: Create users table
 * Created: 2025-10-18
 */

exports.up = (pgm) => {
  // Create users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    language: {
      type: 'varchar(10)',
      notNull: true,
      default: 'en',
    },
    timezone: {
      type: 'varchar(50)',
      notNull: true,
      default: 'UTC',
    },
    subscription_tier: {
      type: 'varchar(50)',
      notNull: true,
      default: 'FREE',
    },
    preferences: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    email_verified: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    mfa_enabled: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    deleted_at: {
      type: 'timestamp',
      notNull: false,
    },
  });

  // Create indexes
  pgm.createIndex('users', 'email', {
    name: 'idx_users_email',
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('users', 'created_at', {
    name: 'idx_users_created_at',
  });
  pgm.createIndex('users', 'subscription_tier', {
    name: 'idx_users_subscription_tier',
    where: 'deleted_at IS NULL',
  });

  // Create updated_at trigger
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.createTrigger('users', 'trig_users_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('users', { cascade: true });
  pgm.dropFunction('update_updated_at_column', [], { cascade: true });
};
```

**File: `/backend/migrations/1697891234568_create-client-accounts-table.js`**
```javascript
/**
 * Migration: Create client_accounts table
 * Created: 2025-10-18
 */

exports.up = (pgm) => {
  pgm.createTable('client_accounts', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    platform: {
      type: 'varchar(50)',
      notNull: true,
    },
    platform_account_id: {
      type: 'varchar(255)',
      notNull: true,
    },
    username: {
      type: 'varchar(255)',
      notNull: true,
    },
    display_name: {
      type: 'varchar(255)',
    },
    profile_picture_url: {
      type: 'text',
    },
    follower_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Indexes
  pgm.createIndex('client_accounts', 'user_id');
  pgm.createIndex('client_accounts', 'platform');
  pgm.createIndex('client_accounts', 'status');
  pgm.createIndex('client_accounts', ['platform', 'platform_account_id'], {
    unique: true,
    name: 'idx_client_accounts_platform_account',
  });

  // Trigger
  pgm.createTrigger('client_accounts', 'trig_client_accounts_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('client_accounts', { cascade: true });
};
```

**File: `/backend/migrations/1697891234569_create-oauth-tokens-table.js`**
```javascript
/**
 * Migration: Create oauth_tokens table
 * Created: 2025-10-18
 */

exports.up = (pgm) => {
  pgm.createTable('oauth_tokens', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    client_account_id: {
      type: 'uuid',
      notNull: true,
      references: 'client_accounts',
      onDelete: 'CASCADE',
    },
    platform: {
      type: 'varchar(50)',
      notNull: true,
    },
    access_token_encrypted: {
      type: 'bytea',
      notNull: true,
    },
    refresh_token_encrypted: {
      type: 'bytea',
    },
    token_type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'Bearer',
    },
    expires_at: {
      type: 'timestamp',
    },
    scope: {
      type: 'text',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Indexes
  pgm.createIndex('oauth_tokens', 'client_account_id');
  pgm.createIndex('oauth_tokens', 'expires_at');

  // Trigger
  pgm.createTrigger('oauth_tokens', 'trig_oauth_tokens_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('oauth_tokens', { cascade: true });
};
```

**File: `/backend/migrations/1697891234570_create-messages-table.js`**
```javascript
/**
 * Migration: Create messages table
 * Created: 2025-10-18
 */

exports.up = (pgm) => {
  pgm.createTable('messages', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    client_account_id: {
      type: 'uuid',
      notNull: true,
      references: 'client_accounts',
      onDelete: 'CASCADE',
    },
    platform_message_id: {
      type: 'varchar(255)',
      notNull: true,
    },
    platform: {
      type: 'varchar(50)',
      notNull: true,
    },
    sender_id: {
      type: 'varchar(255)',
      notNull: true,
    },
    sender_name: {
      type: 'varchar(255)',
    },
    recipient_id: {
      type: 'varchar(255)',
    },
    content: {
      type: 'text',
      notNull: true,
    },
    media_urls: {
      type: 'jsonb',
    },
    direction: {
      type: 'varchar(50)',
      notNull: true,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'sent',
    },
    conversation_id: {
      type: 'varchar(255)',
    },
    is_read: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    search_vector: {
      type: 'tsvector',
    },
  });

  // Indexes
  pgm.createIndex('messages', 'client_account_id');
  pgm.createIndex('messages', 'created_at', {
    order: 'DESC',
  });
  pgm.createIndex('messages', 'is_read', {
    where: 'is_read = FALSE',
  });
  pgm.createIndex('messages', 'conversation_id');
  pgm.createIndex('messages', 'platform_message_id');
  pgm.createIndex('messages', 'search_vector', {
    method: 'GIN',
  });

  // Search vector trigger
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_messages_search_vector()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, '') || ' ' || COALESCE(NEW.sender_name, ''));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.createTrigger('messages', 'trig_update_messages_search_vector', {
    when: 'BEFORE',
    operation: ['INSERT', 'UPDATE'],
    function: 'update_messages_search_vector',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('messages', { cascade: true });
  pgm.dropFunction('update_messages_search_vector', [], { cascade: true });
};
```

**File: `/backend/migrations/1697891234571_create-scheduled-posts-table.js`**
```javascript
/**
 * Migration: Create scheduled_posts table
 * Created: 2025-10-18
 */

exports.up = (pgm) => {
  pgm.createTable('scheduled_posts', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    client_account_id: {
      type: 'uuid',
      notNull: true,
      references: 'client_accounts',
      onDelete: 'CASCADE',
    },
    post_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    caption: {
      type: 'text',
    },
    media_keys: {
      type: 'jsonb',
      notNull: true,
    },
    scheduled_time: {
      type: 'timestamp',
      notNull: true,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'scheduled',
    },
    published_at: {
      type: 'timestamp',
    },
    platform_post_id: {
      type: 'varchar(255)',
    },
    error_details: {
      type: 'jsonb',
    },
    retry_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Indexes
  pgm.createIndex('scheduled_posts', 'client_account_id');
  pgm.createIndex('scheduled_posts', 'scheduled_time');
  pgm.createIndex('scheduled_posts', 'status');
  pgm.createIndex('scheduled_posts', 'created_at', {
    order: 'DESC',
  });

  // Trigger
  pgm.createTrigger('scheduled_posts', 'trig_scheduled_posts_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('scheduled_posts', { cascade: true });
};
```

#### Pseudocode/Logic Flow
```
PROCEDURE setup_migrations():
    1. Install node-pg-migrate: npm install node-pg-migrate
    2. Create migrations directory
    3. Create config.json with database URL
    4. Add migration scripts to package.json:
        - migrate:up - Run pending migrations
        - migrate:down - Rollback last migration
        - migrate:create - Create new migration
        - migrate:status - List migration status

    5. Create migration files:
        - 1-create-users-table.js
        - 2-create-client-accounts-table.js
        - 3-create-oauth-tokens-table.js
        - 4-create-messages-table.js
        - 5-create-scheduled-posts-table.js

    6. Each migration defines:
        - exports.up(pgm): Create tables, indexes, triggers
        - exports.down(pgm): Rollback (drop tables)

    7. Run migrations:
        - npm run migrate:up (applies all pending)
        - npm run migrate:down (rollback last)
        - npm run migrate:status (check status)

    8. Test rollback:
        - Run migrate:up
        - Verify tables created
        - Run migrate:down
        - Verify tables dropped
        - Run migrate:up again
END PROCEDURE
```

#### Dependencies
- INFRA-003 (PostgreSQL database initialized)
- BE-001 (NestJS project with database connection)

#### Integration Points
- **Upstream**: INFRA-003 (Database)
- **Downstream**: BE-002 (Repository pattern uses migrated schema)

#### Acceptance Criteria Checklist
```
[ ] node-pg-migrate installed and configured
[ ] Migration config.json points to correct DATABASE_URL
[ ] All migration files created (users, client_accounts, oauth_tokens, messages, scheduled_posts)
[ ] Can run migrations up successfully: npm run migrate:up
[ ] All tables created with correct schema
[ ] Indexes created on appropriate columns
[ ] Triggers created (updated_at, search_vector)
[ ] Can rollback migrations: npm run migrate:down
[ ] Rollback drops tables cleanly
[ ] Can check migration status: npm run migrate:status
[ ] Migrations are idempotent (can run multiple times safely)
[ ] Migration status tracked in pg_migrations table
```

---

Due to the length limitations, I'll continue with the remaining domains in a structured format. Would you like me to:

1. **Continue with the remaining backend tasks** (BE-004 through BE-008)
2. **Move to Instagram Integration** (IG-001 through IG-007)
3. **Cover Frontend Development** (FE-001 through FE-012)
4. **Detail Background Workers** (WORKER-001 through WORKER-004)
5. **Complete Testing & Deployment** (TEST-001 through DEPLOY-005)

I'll create a comprehensive document with all tasks including:
- Complete data models with SQL schemas
- API endpoint specifications with request/response examples
- Detailed pseudocode for complex business logic
- Component dependencies and integration points
- Acceptance criteria for each task

This document will serve as the complete technical specification that developers can follow to implement each feature exactly as designed.

Let me know which sections you'd like me to prioritize, or I can create the complete document section by section!