# Detailed Technical Specifications: Social Selling Platform

**Document Version:** 1.0
**Date:** 2025-10-18
**Project:** Social Selling Platform - Instagram & WhatsApp Business
**Status:** Ready for Development
**References:**
- Implementation Plan: `/tasks/social-selling/implementation-plan.md`
- Architecture Design: `/tasks/social-selling/architecture-design.md`

---

## Table of Contents

1. [Document Overview](#document-overview)
2. [Domain 1: Infrastructure & DevOps](#domain-1-infrastructure--devops)
3. [Domain 2: Backend Core](#domain-2-backend-core)
4. [Domain 3: Instagram Integration](#domain-3-instagram-integration)
5. [Domain 4: Frontend Development](#domain-4-frontend-development)
6. [Domain 5: Background Workers](#domain-5-background-workers)
7. [Domain 6: Testing & Deployment](#domain-6-testing--deployment)
8. [Common Data Models](#common-data-models)
9. [API Standards & Conventions](#api-standards--conventions)
10. [Error Codes Reference](#error-codes-reference)

---

## Document Overview

This document expands each task from the implementation plan into detailed technical specifications including:
- Clear objectives and acceptance criteria
- Complete data models with field types and validation rules
- API endpoints with full request/response schemas
- Pseudocode for complex business logic
- Dependencies and prerequisites
- Testing considerations
- Error handling strategies

Each task specification follows this structure:
1. **Overview** - High-level description and context
2. **Objectives** - What needs to be achieved
3. **Data Models** - Database schemas and TypeScript interfaces
4. **API Contracts** - Request/response schemas
5. **Business Logic** - Algorithms and pseudocode
6. **Implementation Steps** - Detailed task breakdown
7. **Dependencies** - Prerequisites and related tasks
8. **Testing Strategy** - Unit, integration, and E2E test considerations
9. **Error Handling** - Error scenarios and responses
10. **Acceptance Criteria** - Measurable success criteria

---

## Domain 1: Infrastructure & DevOps

### INFRA-001: VPS Provisioning and Initial Setup

#### Overview
Set up the Hostinger KVM 2 VPS as the foundation for the entire platform, including security hardening, Docker installation, and firewall configuration.

#### Objectives
- Provision Hostinger VPS with secure SSH access
- Install and configure Docker and Docker Compose
- Configure firewall rules and fail2ban
- Enable automatic security updates

#### Technical Specifications

**VPS Specifications:**
```yaml
Provider: Hostinger
Plan: KVM 2
Resources:
  vCPU: 2 cores
  RAM: 4 GB
  Storage: 100 GB SSD NVMe
  Bandwidth: 2 TB/month
  OS: Ubuntu 22.04 LTS
  Expected Cost: $8.99/month
```

**Security Configuration:**

```bash
# SSH Key Authentication Setup
# File: /infrastructure/scripts/setup-ssh.sh

#!/bin/bash
set -e

# Add SSH public key
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "$SSH_PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Disable password authentication
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config

# Disable root login
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Restart SSH service
sudo systemctl restart sshd

echo "✅ SSH security configured"
```

**Firewall Configuration:**

```bash
# File: /infrastructure/scripts/setup-firewall.sh

#!/bin/bash
set -e

# Install UFW
sudo apt-get update
sudo apt-get install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (before enabling firewall!)
sudo ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Enable UFW
sudo ufw --force enable

# Show status
sudo ufw status verbose

echo "✅ Firewall configured"
```

**fail2ban Configuration:**

```bash
# File: /infrastructure/scripts/install-fail2ban.sh

#!/bin/bash
set -e

# Install fail2ban
sudo apt-get install -y fail2ban

# Create jail configuration
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@example.com
sendername = Fail2Ban

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
EOF

# Start and enable fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

echo "✅ fail2ban configured"
```

**Docker Installation:**

```bash
# File: /infrastructure/scripts/install-docker.sh

#!/bin/bash
set -e

# Remove old Docker versions
sudo apt-get remove -y docker docker-engine docker.io containerd runc || true

# Install dependencies
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
docker --version
docker compose version

echo "✅ Docker installed successfully"
```

**Automatic Updates:**

```bash
# File: /infrastructure/scripts/enable-auto-updates.sh

#!/bin/bash
set -e

# Install unattended-upgrades
sudo apt-get install -y unattended-upgrades

# Configure automatic security updates
sudo tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

# Enable automatic updates
sudo tee /etc/apt/apt.conf.d/20auto-upgrades > /dev/null <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

echo "✅ Automatic updates enabled"
```

#### Implementation Steps

1. **Purchase and Access VPS**
   - Purchase Hostinger KVM 2 plan
   - Note down IP address and root credentials
   - Test SSH access: `ssh root@<IP_ADDRESS>`

2. **Create Non-Root User**
   ```bash
   adduser deploy
   usermod -aG sudo deploy
   ```

3. **Configure SSH Key Authentication**
   ```bash
   # On local machine
   ssh-keygen -t ed25519 -C "deploy@socialselling"

   # Copy to VPS
   ssh-copy-id deploy@<IP_ADDRESS>
   ```

4. **Run Setup Scripts**
   ```bash
   chmod +x /infrastructure/scripts/*.sh
   ./setup-ssh.sh
   ./setup-firewall.sh
   ./install-fail2ban.sh
   ./install-docker.sh
   ./enable-auto-updates.sh
   ```

5. **Verify Installation**
   ```bash
   # Test SSH key auth (should work without password)
   ssh deploy@<IP_ADDRESS>

   # Test Docker
   docker ps
   docker compose version

   # Test firewall
   sudo ufw status

   # Test fail2ban
   sudo fail2ban-client status
   ```

#### Dependencies
- None (first task in the project)

#### Testing Strategy

**Manual Verification Tests:**
1. SSH key authentication works
2. Password authentication is disabled
3. Firewall is active with correct rules
4. fail2ban is monitoring SSH
5. Docker and Docker Compose are installed
6. Automatic updates are enabled

**Security Tests:**
```bash
# Test SSH brute force protection
# From another machine, attempt multiple failed logins
# Verify IP gets banned by fail2ban

# Test firewall
nmap -p 1-65535 <IP_ADDRESS>
# Should only show ports 22, 80, 443 open
```

#### Error Handling

**Common Issues:**

| Error | Cause | Solution |
|-------|-------|----------|
| SSH connection refused | Firewall blocking before SSH rule | Add SSH rule before enabling UFW |
| Docker permission denied | User not in docker group | Run `newgrp docker` or logout/login |
| fail2ban not starting | Configuration syntax error | Check `/var/log/fail2ban.log` |

#### Acceptance Criteria
- [ ] VPS accessible via SSH key only (no password)
- [ ] Docker version >= 24.0
- [ ] Docker Compose version >= 2.20
- [ ] UFW firewall active with rules for ports 22, 80, 443
- [ ] fail2ban monitoring SSH with 3 max retries
- [ ] Automatic security updates enabled
- [ ] Can run `docker ps` without sudo

---

### INFRA-002: Docker Compose Stack Setup

#### Overview
Create the complete Docker Compose configuration for all application services, including networking, volumes, and health checks.

#### Objectives
- Define all services in docker-compose.yml
- Configure Docker networks and volumes
- Set up environment variable management
- Configure service health checks and dependencies
- Set resource limits for containers

#### Technical Specifications

**Docker Compose Configuration:**

```yaml
# File: /docker-compose.yml
version: '3.9'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: socialselling-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d:ro
    ports:
      - "5432:5432"
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Redis Cache & Queue
  redis:
    image: redis:7-alpine
    container_name: socialselling-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
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

  # MinIO S3-Compatible Storage
  minio:
    image: minio/minio:latest
    container_name: socialselling-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # Backend API (NestJS)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    container_name: socialselling-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      INSTAGRAM_APP_ID: ${INSTAGRAM_APP_ID}
      INSTAGRAM_APP_SECRET: ${INSTAGRAM_APP_SECRET}
    ports:
      - "4000:4000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Frontend (Next.js)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    container_name: socialselling-frontend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      NEXT_PUBLIC_WS_URL: ${NEXT_PUBLIC_WS_URL}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # Background Worker
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    container_name: socialselling-worker
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      INSTAGRAM_APP_ID: ${INSTAGRAM_APP_ID}
      INSTAGRAM_APP_SECRET: ${INSTAGRAM_APP_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      backend:
        condition: service_healthy
    networks:
      - app-network
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: socialselling-nginx
    restart: unless-stopped
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infrastructure/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./infrastructure/certbot/conf:/etc/letsencrypt:ro
      - ./infrastructure/certbot/www:/var/www/certbot:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Prometheus Metrics
  prometheus:
    image: prom/prometheus:latest
    container_name: socialselling-prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    volumes:
      - ./infrastructure/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - app-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  # Grafana Dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: socialselling-grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_USER}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infrastructure/monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
      - ./infrastructure/monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
```

**Environment Variables Template:**

```bash
# File: /.env.example

# Database Configuration
DB_USER=socialselling
DB_PASSWORD=<GENERATE_STRONG_PASSWORD>
DB_NAME=socialselling_db

# Redis Configuration
REDIS_PASSWORD=<GENERATE_STRONG_PASSWORD>

# MinIO Configuration
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<GENERATE_STRONG_PASSWORD>

# JWT Secrets
JWT_SECRET=<GENERATE_RANDOM_SECRET_64_CHARS>
JWT_REFRESH_SECRET=<GENERATE_RANDOM_SECRET_64_CHARS>

# Instagram OAuth
INSTAGRAM_APP_ID=<YOUR_INSTAGRAM_APP_ID>
INSTAGRAM_APP_SECRET=<YOUR_INSTAGRAM_APP_SECRET>

# Frontend URLs
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_WS_URL=ws://localhost/socket.io

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=<GENERATE_STRONG_PASSWORD>

# Application
NODE_ENV=production
PORT=4000
```

**Docker Override for Development:**

```yaml
# File: /docker-compose.override.yml
version: '3.9'

services:
  backend:
    build:
      target: development
    volumes:
      - ./backend/src:/app/src:ro
      - ./backend/node_modules:/app/node_modules
    environment:
      NODE_ENV: development
    command: npm run start:dev

  frontend:
    build:
      target: development
    volumes:
      - ./frontend/src:/app/src:ro
      - ./frontend/node_modules:/app/node_modules
    environment:
      NODE_ENV: development
    command: npm run dev

  postgres:
    ports:
      - "5432:5432"

  redis:
    ports:
      - "6379:6379"
```

#### Implementation Steps

1. **Create Directory Structure**
   ```bash
   mkdir -p infrastructure/{nginx/conf.d,monitoring/grafana/{datasources,dashboards},certbot/{conf,www}}
   mkdir -p database/init
   ```

2. **Create docker-compose.yml**
   - Copy the configuration above
   - Ensure proper indentation

3. **Create .env File**
   ```bash
   cp .env.example .env
   # Generate strong passwords
   openssl rand -base64 32  # For passwords
   openssl rand -hex 32     # For JWT secrets
   ```

4. **Validate Configuration**
   ```bash
   docker compose config
   # Should output the resolved configuration
   ```

5. **Pull All Images**
   ```bash
   docker compose pull
   ```

6. **Start Services**
   ```bash
   docker compose up -d
   ```

7. **Verify All Services**
   ```bash
   docker compose ps
   docker compose logs -f
   ```

#### Dependencies
- INFRA-001 (VPS must be provisioned with Docker installed)

#### Testing Strategy

**Service Health Checks:**
```bash
# Test all services are running
docker compose ps | grep "Up"

# Test health checks
docker compose ps | grep "healthy"

# Test network connectivity
docker compose exec backend ping -c 3 postgres
docker compose exec backend ping -c 3 redis
docker compose exec backend ping -c 3 minio

# Test volumes
docker volume ls | grep socialselling
```

**Integration Tests:**
```bash
# Test PostgreSQL
docker compose exec postgres psql -U $DB_USER -d $DB_NAME -c "SELECT version();"

# Test Redis
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping

# Test MinIO
curl http://localhost:9000/minio/health/live
```

#### Error Handling

**Common Issues:**

| Error | Cause | Solution |
|-------|-------|----------|
| Port already in use | Another service using the port | Change port mapping or stop conflicting service |
| Volume permission denied | Incorrect permissions | `chown -R 1000:1000 ./volumes` |
| Service unhealthy | Misconfiguration | Check logs: `docker compose logs <service>` |
| Out of memory | Insufficient VPS resources | Reduce resource limits or upgrade VPS |

#### Acceptance Criteria
- [ ] `docker compose up -d` starts all services successfully
- [ ] All services show status "Up" and "healthy"
- [ ] Persistent volumes created and mounted correctly
- [ ] Environment variables loaded from .env
- [ ] Services can communicate on Docker network (test with ping)
- [ ] Resource limits enforced (check with `docker stats`)
- [ ] Logs accessible via `docker compose logs`

---

### INFRA-003: PostgreSQL Database Initialization

#### Overview
Set up PostgreSQL database with initial schema, extensions, and migration framework for version-controlled database changes.

#### Objectives
- Initialize PostgreSQL with required extensions
- Create database users with appropriate permissions
- Set up node-pg-migrate for schema migrations
- Create initial schema for users table
- Configure connection pooling

#### Technical Specifications

**Database Extensions:**

```sql
-- File: /database/init/01-extensions.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable timestamp functions
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Verify extensions
SELECT * FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'btree_gist');
```

**Database Users and Permissions:**

```sql
-- File: /database/init/02-users.sql

-- Create application user (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'socialselling') THEN
    CREATE USER socialselling WITH PASSWORD '<DB_PASSWORD>';
  END IF;
END
$$;

-- Grant necessary privileges
GRANT CONNECT ON DATABASE socialselling_db TO socialselling;
GRANT USAGE ON SCHEMA public TO socialselling;
GRANT CREATE ON SCHEMA public TO socialselling;

-- Grant table privileges (for future tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO socialselling;

-- Grant sequence privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO socialselling;
```

**Migration Configuration:**

```javascript
// File: /backend/migrations/config.js

const { Client } = require('pg');

module.exports = {
  database_url: process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,

  // Migration table name
  migrationsTable: 'pgmigrations',

  // Migration directory
  dir: 'migrations',

  // Migration file extension
  'migrations-file-extension': 'sql',

  // Disable transactions for migrations (if needed)
  'disable-transactions': false,

  // Check order of migrations
  'check-order': true,

  // Create schema if not exists
  schema: 'public',

  // Migration lock timeout (milliseconds)
  'migration-lock-timeout': 30000,
};
```

**Initial Users Table Migration:**

```sql
-- File: /backend/migrations/1_create_users_table.sql

-- Up Migration
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  subscription_tier VARCHAR(50) DEFAULT 'FREE',
  preferences JSONB DEFAULT '{}',
  email_verified BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE users IS 'Application users with authentication and preferences';
COMMENT ON COLUMN users.subscription_tier IS 'User subscription: FREE, STARTER, PROFESSIONAL, ENTERPRISE';
COMMENT ON COLUMN users.preferences IS 'JSON object for user preferences and settings';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp for GDPR compliance';
```

**Database Connection Service:**

```typescript
// File: /backend/src/infrastructure/database/database.service.ts

import pgPromise from 'pg-promise';
import { IDatabase, IMain } from 'pg-promise';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number; // Connection pool size
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private static instance: IDatabase<any>;
  private pgp: IMain;

  constructor(private configService: ConfigService) {
    this.pgp = pgPromise({
      // Initialization options
      capSQL: true, // Capitalize SQL keywords
      error: (err, e) => {
        console.error('Database error:', err);
        if (e.cn) {
          // Connection error
          console.error('Connection string:', e.cn);
        }
        if (e.query) {
          // Query error
          console.error('Query:', e.query);
          if (e.params) {
            console.error('Parameters:', e.params);
          }
        }
      },
    });
  }

  async onModuleInit() {
    if (!DatabaseService.instance) {
      const config = this.getConfig();
      DatabaseService.instance = this.pgp(config);

      // Test connection
      try {
        await DatabaseService.instance.one('SELECT $1 AS value', 123);
        console.log('✅ Database connection established');
      } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    if (DatabaseService.instance) {
      await DatabaseService.instance.$pool.end();
      console.log('Database pool closed');
    }
  }

  private getConfig(): DatabaseConfig {
    return {
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      database: this.configService.get<string>('DB_NAME', 'socialselling_db'),
      user: this.configService.get<string>('DB_USER', 'socialselling'),
      password: this.configService.get<string>('DB_PASSWORD'),
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000, // 30 seconds
      connectionTimeoutMillis: 5000, // 5 seconds
    };
  }

  getDatabase(): IDatabase<any> {
    if (!DatabaseService.instance) {
      throw new Error('Database not initialized. Call onModuleInit first.');
    }
    return DatabaseService.instance;
  }

  // Helper method for transactions
  async transaction<T>(
    callback: (t: any) => Promise<T>
  ): Promise<T> {
    return this.getDatabase().tx(callback);
  }

  // Helper method for tasks
  async task<T>(
    callback: (t: any) => Promise<T>
  ): Promise<T> {
    return this.getDatabase().task(callback);
  }
}
```

**Package.json Scripts:**

```json
{
  "scripts": {
    "migrate:up": "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down",
    "migrate:create": "node-pg-migrate create",
    "migrate:status": "node-pg-migrate status",
    "db:reset": "node-pg-migrate down --count 999 && node-pg-migrate up"
  }
}
```

#### Implementation Steps

1. **Install Migration Tool**
   ```bash
   cd backend
   npm install --save-dev node-pg-migrate
   npm install pg pg-promise
   ```

2. **Create Migration Directory**
   ```bash
   mkdir -p migrations
   ```

3. **Create Database Initialization Scripts**
   ```bash
   mkdir -p ../database/init
   # Create 01-extensions.sql and 02-users.sql
   ```

4. **Create Migration Config**
   ```bash
   # Create migrations/config.js
   ```

5. **Run Initial Setup**
   ```bash
   # Start PostgreSQL container
   docker compose up -d postgres

   # Wait for health check
   docker compose ps postgres

   # Extensions should be loaded automatically from init scripts
   ```

6. **Create First Migration**
   ```bash
   npm run migrate:create create_users_table
   # Edit the generated migration file
   ```

7. **Run Migrations**
   ```bash
   npm run migrate:up
   ```

8. **Verify Schema**
   ```bash
   docker compose exec postgres psql -U socialselling -d socialselling_db -c "\dt"
   docker compose exec postgres psql -U socialselling -d socialselling_db -c "\d users"
   ```

#### Dependencies
- INFRA-002 (Docker Compose stack must be running)

#### Testing Strategy

**Database Connection Test:**
```typescript
// File: /backend/src/infrastructure/database/database.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                DB_HOST: 'localhost',
                DB_PORT: 5432,
                DB_NAME: 'socialselling_test',
                DB_USER: 'socialselling',
                DB_PASSWORD: 'test_password',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect to database', async () => {
    const db = service.getDatabase();
    const result = await db.one('SELECT $1 AS value', [42]);
    expect(result.value).toBe(42);
  });

  it('should execute transactions', async () => {
    const result = await service.transaction(async (t) => {
      return t.one('SELECT $1 AS value', [42]);
    });
    expect(result.value).toBe(42);
  });
});
```

**Migration Tests:**
```bash
# Test migration up
npm run migrate:up

# Verify tables created
npm run migrate:status

# Test migration down
npm run migrate:down

# Test migration up again
npm run migrate:up
```

#### Error Handling

**Common Issues:**

| Error | Cause | Solution |
|-------|-------|----------|
| Connection refused | PostgreSQL not running | `docker compose up -d postgres` |
| Authentication failed | Wrong password | Check .env file |
| Extension not found | Extensions not loaded | Run init scripts manually |
| Migration failed | SQL syntax error | Check migration file syntax |
| Pool exhausted | Too many connections | Increase max pool size or close connections |

**Error Response Format:**
```typescript
interface DatabaseError {
  code: string; // PostgreSQL error code (e.g., '23505' for unique violation)
  message: string;
  detail?: string;
  hint?: string;
  query?: string;
}
```

#### Acceptance Criteria
- [ ] PostgreSQL container running and accessible
- [ ] Extensions installed: uuid-ossp, pgcrypto, pg_trgm, btree_gist
- [ ] Migrations system configured and working
- [ ] Can run `npm run migrate:up` successfully
- [ ] Can run `npm run migrate:down` successfully
- [ ] Users table created with correct schema
- [ ] Backend can connect to database
- [ ] Connection pooling configured (max 20 connections)
- [ ] Database service unit tests passing

---

## Domain 2: Backend Core

### BE-004: Authentication Module (Registration & Login)

#### Overview
Implement comprehensive authentication system with user registration, login, JWT token management, and session handling using bcrypt for password hashing and Passport.js for authentication strategies.

#### Objectives
- Implement user registration with email validation
- Implement login with JWT token generation
- Set up bcrypt password hashing (12 rounds)
- Configure Passport JWT strategy
- Implement refresh token flow
- Add rate limiting to auth endpoints
- Create validation DTOs for requests

#### Technical Specifications

**Data Models:**

```typescript
// File: /backend/src/domain/entities/user.entity.ts

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  language: string;
  timezone: string;
  subscription_tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  preferences: Record<string, any>;
  email_verified: boolean;
  mfa_enabled: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface UserSession {
  userId: string;
  email: string;
  sessionId: string;
  expiresAt: Date;
}

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string; // user ID
  sessionId: string;
  iat?: number;
  exp?: number;
}
```

**Request/Response DTOs:**

```typescript
// File: /backend/src/modules/auth/dto/register.dto.ts

import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User password (min 8 chars, must include uppercase, lowercase, and number)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }
  )
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name: string;

  @ApiProperty({
    example: 'en',
    description: 'Preferred language (ISO 639-1)',
    required: false,
    default: 'en',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}$/, { message: 'Language must be a valid ISO 639-1 code' })
  language?: string;

  @ApiProperty({
    example: 'America/Sao_Paulo',
    description: 'User timezone (IANA timezone)',
    required: false,
    default: 'UTC',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

// File: /backend/src/modules/auth/dto/login.dto.ts

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User password',
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

// File: /backend/src/modules/auth/dto/auth-response.dto.ts

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token (expires in 1 hour)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token (expires in 30 days)',
  })
  refreshToken: string;

  @ApiProperty({
    example: 3600,
    description: 'Access token expiration in seconds',
  })
  expiresIn: number;

  @ApiProperty({
    example: 'Bearer',
    description: 'Token type',
  })
  tokenType: string;

  @ApiProperty({
    description: 'User information',
  })
  user: {
    id: string;
    email: string;
    name: string;
    language: string;
    timezone: string;
    subscription_tier: string;
  };
}

// File: /backend/src/modules/auth/dto/refresh-token.dto.ts

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token',
  })
  @IsString()
  @MinLength(1, { message: 'Refresh token is required' })
  refreshToken: string;
}
```

**Business Logic:**

```typescript
// File: /backend/src/modules/auth/auth.service.ts

import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { SessionService } from './session.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { User, JwtPayload, RefreshTokenPayload } from '../../domain/entities/user.entity';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '30d';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user
   *
   * Algorithm:
   * 1. Validate email doesn't already exist
   * 2. Hash password with bcrypt (12 rounds)
   * 3. Create user record in database
   * 4. Generate JWT tokens
   * 5. Create session in Redis
   * 6. Return tokens and user info
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Create user
    const user = await this.userRepository.create({
      email: dto.email.toLowerCase(),
      password_hash: passwordHash,
      name: dto.name,
      language: dto.language || 'en',
      timezone: dto.timezone || 'UTC',
      subscription_tier: 'FREE',
      preferences: {},
      email_verified: false,
      mfa_enabled: false,
    });

    // Generate tokens and create session
    return this.generateAuthResponse(user);
  }

  /**
   * Login user
   *
   * Algorithm:
   * 1. Find user by email
   * 2. Verify password with bcrypt.compare
   * 3. Check if account is locked/deleted
   * 4. Generate JWT tokens
   * 5. Create session in Redis
   * 6. Return tokens and user info
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.userRepository.findByEmail(dto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is deleted
    if (user.deleted_at) {
      throw new UnauthorizedException('Account has been deleted');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      // TODO: Increment failed login attempts
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens and create session
    return this.generateAuthResponse(user);
  }

  /**
   * Refresh access token
   *
   * Algorithm:
   * 1. Verify refresh token signature
   * 2. Extract payload (userId, sessionId)
   * 3. Validate session exists in Redis
   * 4. Generate new access token
   * 5. Optionally rotate refresh token
   * 6. Return new tokens
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Verify refresh token
      const payload: RefreshTokenPayload = await this.jwtService.verifyAsync(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        }
      );

      // Validate session exists
      const session = await this.sessionService.getSession(payload.sessionId);
      if (!session) {
        throw new UnauthorizedException('Invalid session');
      }

      // Get user
      const user = await this.userRepository.findById(payload.sub);
      if (!user || user.deleted_at) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      return this.generateAuthResponse(user, payload.sessionId);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Logout user
   *
   * Algorithm:
   * 1. Extract sessionId from token
   * 2. Delete session from Redis
   * 3. Optionally blacklist token (if needed)
   */
  async logout(sessionId: string): Promise<void> {
    await this.sessionService.deleteSession(sessionId);
  }

  /**
   * Validate JWT token and return user
   */
  async validateUser(payload: JwtPayload): Promise<User> {
    // Validate session exists
    const session = await this.sessionService.getSession(payload.sessionId);
    if (!session) {
      throw new UnauthorizedException('Session has expired');
    }

    // Get user
    const user = await this.userRepository.findById(payload.sub);
    if (!user || user.deleted_at) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Generate auth response with tokens
   * @private
   */
  private async generateAuthResponse(
    user: User,
    existingSessionId?: string
  ): Promise<AuthResponseDto> {
    // Generate session ID
    const sessionId = existingSessionId || uuidv4();

    // JWT payload
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      sessionId,
    };

    // Generate access token
    const accessToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    // Generate refresh token
    const refreshTokenPayload: RefreshTokenPayload = {
      sub: user.id,
      sessionId,
    };

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    // Create session in Redis
    if (!existingSessionId) {
      await this.sessionService.createSession({
        sessionId,
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }

    // Return auth response
    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        language: user.language,
        timezone: user.timezone,
        subscription_tier: user.subscription_tier,
      },
    };
  }
}
```

**JWT Strategy:**

```typescript
// File: /backend/src/modules/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../../../domain/entities/user.entity';
import { User } from '../../../domain/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
```

**Auth Controller:**

```typescript
// File: /backend/src/modules/auth/auth.controller.ts

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(3, 60) // 3 requests per 60 seconds
  @ApiOperation({
    summary: 'Register new user',
    description: 'Create a new user account with email and password',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(5, 60) // 5 requests per 60 seconds
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticate user and receive JWT tokens',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get new access token using refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidate user session',
  })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Request() req): Promise<void> {
    const sessionId = req.user.sessionId;
    await this.authService.logout(sessionId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description: 'Get authenticated user information',
  })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req) {
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      language: req.user.language,
      timezone: req.user.timezone,
      subscription_tier: req.user.subscription_tier,
    };
  }
}
```

**Rate Limiting Configuration:**

```typescript
// File: /backend/src/modules/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SessionService } from './session.service';
import { UserModule } from '../user/user.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot({
      ttl: 60, // Time window in seconds
      limit: 10, // Max requests per time window
    }),
    UserModule,
    CacheModule,
  ],
  providers: [AuthService, JwtStrategy, SessionService],
  controllers: [AuthController],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
```

#### API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/me` | Get current user | Yes |

**Request/Response Examples:**

**Register:**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "language": "pt",
  "timezone": "America/Sao_Paulo"
}

Response 201:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "language": "pt",
    "timezone": "America/Sao_Paulo",
    "subscription_tier": "FREE"
  }
}

Response 409:
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

**Login:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}

Response 200:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "language": "pt",
    "timezone": "America/Sao_Paulo",
    "subscription_tier": "FREE"
  }
}

Response 401:
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

#### Implementation Steps

1. **Install Dependencies**
   ```bash
   npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
   npm install @nestjs/throttler
   npm install --save-dev @types/passport-jwt @types/bcrypt
   ```

2. **Create Module Structure**
   ```bash
   mkdir -p src/modules/auth/{dto,strategies,guards}
   ```

3. **Implement DTOs**
   - Create all DTO classes with validation decorators
   - Add Swagger decorators for API documentation

4. **Implement User Repository**
   - Create `IUserRepository` interface
   - Implement `PostgresUserRepository`

5. **Implement Session Service**
   - Create Redis-based session management
   - Implement create/get/delete session methods

6. **Implement Auth Service**
   - Implement registration logic
   - Implement login logic
   - Implement token generation
   - Implement token refresh

7. **Implement JWT Strategy**
   - Create Passport strategy
   - Implement token validation

8. **Implement Auth Controller**
   - Create all endpoints
   - Add validation pipes
   - Add rate limiting

9. **Create Auth Guard**
   - Implement JWT auth guard
   - Add to protected routes

10. **Test All Endpoints**
    - Test with Postman/Insomnia
    - Verify token generation
    - Test error scenarios

#### Dependencies
- BE-002 (Repository pattern must be implemented)
- BE-003 (Users table must exist)
- INFRA-004 (Redis must be running for sessions)

#### Testing Strategy

**Unit Tests:**
```typescript
// File: /backend/src/modules/auth/auth.service.spec.ts

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: MockType<IUserRepository>;
  let sessionService: MockType<SessionService>;

  beforeEach(async () => {
    // Setup test module
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      const result = await service.register(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(dto.email.toLowerCase());
    });

    it('should throw ConflictException if email exists', async () => {
      // Test duplicate email
    });

    it('should hash password with bcrypt', async () => {
      // Verify password is hashed
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      // Test successful login
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      // Test wrong password
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      // Test user not found
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Test token refresh
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      // Test invalid token
    });

    it('should throw UnauthorizedException for expired token', async () => {
      // Test expired token
    });
  });
});
```

**Integration Tests:**
```typescript
// File: /backend/test/auth.e2e-spec.ts

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Setup test app
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should return 409 for duplicate email', () => {
      // Test duplicate registration
    });

    it('should return 400 for weak password', () => {
      // Test password validation
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login user', () => {
      // Test login
    });

    it('should return 401 for wrong password', () => {
      // Test wrong password
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh token', () => {
      // Test refresh
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout user', () => {
      // Test logout
    });
  });

  describe('/auth/me (GET)', () => {
    it('should return current user', () => {
      // Test get current user
    });

    it('should return 401 without token', () => {
      // Test unauthorized access
    });
  });
});
```

#### Error Handling

**Error Scenarios:**

| Scenario | Error Code | HTTP Status | Message |
|----------|-----------|-------------|---------|
| Email already exists | CONFLICT | 409 | User with this email already exists |
| Invalid credentials | UNAUTHORIZED | 401 | Invalid email or password |
| Weak password | BAD_REQUEST | 400 | Password must meet requirements |
| Invalid email format | BAD_REQUEST | 400 | Invalid email format |
| Token expired | UNAUTHORIZED | 401 | Token has expired |
| Invalid token | UNAUTHORIZED | 401 | Invalid token |
| Session not found | UNAUTHORIZED | 401 | Session has expired |
| Rate limit exceeded | TOO_MANY_REQUESTS | 429 | Too many requests |

#### Acceptance Criteria
- [ ] User can register with email and password
- [ ] Password hashed with bcrypt (12 rounds)
- [ ] User can login and receive JWT tokens
- [ ] JWT access token expires in 1 hour
- [ ] Refresh token expires in 30 days
- [ ] JWT token validated on protected routes
- [ ] Refresh token flow working
- [ ] Rate limiting active (5 login attempts per minute, 3 register per minute)
- [ ] Input validation working (email format, password strength)
- [ ] Session created in Redis on login
- [ ] Session deleted on logout
- [ ] Unit tests passing with >80% coverage
- [ ] Integration tests passing for all endpoints
- [ ] Swagger documentation generated

---

## Common Data Models

### Database Schema Reference

This section provides the complete database schema for all entities used throughout the application.

#### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  subscription_tier VARCHAR(50) DEFAULT 'FREE',
  preferences JSONB DEFAULT '{}',
  email_verified BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
```

#### Client Accounts Table

```sql
CREATE TABLE client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'instagram' | 'whatsapp'
  platform_account_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  profile_picture_url TEXT,
  follower_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- 'active' | 'token_expired' | 'disconnected'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_client_accounts_user_id ON client_accounts(user_id);
CREATE INDEX idx_client_accounts_platform ON client_accounts(platform);
CREATE INDEX idx_client_accounts_status ON client_accounts(status);
CREATE UNIQUE INDEX idx_client_accounts_platform_account ON client_accounts(platform, platform_account_id);
```

#### OAuth Tokens Table

```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL, -- pgcrypto encrypted
  refresh_token_encrypted TEXT,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oauth_tokens_client_account ON oauth_tokens(client_account_id);
CREATE INDEX idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);
```

#### Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  platform_message_id VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'instagram' | 'whatsapp'
  sender_id VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  media_urls JSONB,
  direction VARCHAR(50) NOT NULL, -- 'inbound' | 'outbound'
  status VARCHAR(50) NOT NULL, -- 'sent' | 'delivered' | 'read' | 'failed'
  conversation_id VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  search_vector TSVECTOR
);

CREATE INDEX idx_messages_client_account ON messages(client_account_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_is_read ON messages(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);
CREATE UNIQUE INDEX idx_messages_platform_id ON messages(platform, platform_message_id);
```

#### Scheduled Posts Table

```sql
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  post_type VARCHAR(50) NOT NULL, -- 'feed' | 'story' | 'reel'
  caption TEXT,
  media_keys JSONB NOT NULL, -- Array of MinIO object keys
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled' | 'publishing' | 'published' | 'failed'
  published_at TIMESTAMP WITH TIME ZONE,
  platform_post_id VARCHAR(255),
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_posts_client_account ON scheduled_posts(client_account_id);
CREATE INDEX idx_scheduled_posts_scheduled_time ON scheduled_posts(scheduled_time);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
```

#### Analytics Snapshots Table

```sql
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  snapshot_type VARCHAR(50) NOT NULL, -- 'account' | 'post'
  reference_id VARCHAR(255), -- Post ID if type is 'post'
  metrics JSONB NOT NULL, -- All metrics as JSON
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_client_account ON analytics_snapshots(client_account_id);
CREATE INDEX idx_analytics_snapshot_date ON analytics_snapshots(snapshot_date);
CREATE INDEX idx_analytics_type ON analytics_snapshots(snapshot_type);
CREATE UNIQUE INDEX idx_analytics_unique ON analytics_snapshots(client_account_id, snapshot_type, snapshot_date, reference_id);
```

---

## API Standards & Conventions

### REST API Guidelines

**Base URL:**
- Development: `http://localhost:4000/api`
- Staging: `https://staging-api.socialselling.com/api`
- Production: `https://api.socialselling.com/api`

**Versioning:**
- API version in URL path: `/api/v1/...`
- Current version: v1 (implicit, no version prefix needed for MVP)

**HTTP Methods:**
- `GET` - Retrieve resource(s)
- `POST` - Create new resource
- `PUT` - Replace entire resource
- `PATCH` - Partial update resource
- `DELETE` - Delete resource

**Status Codes:**
- `200 OK` - Successful GET, PATCH, PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource
- `422 Unprocessable Entity` - Semantic validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <access_token>
Accept: application/json
X-Request-ID: <uuid> (optional, for tracing)
```

**Response Headers:**
```http
Content-Type: application/json
X-Request-ID: <uuid>
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

**Pagination:**
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  },
  "links": {
    "first": "/api/messages?page=1",
    "prev": null,
    "next": "/api/messages?page=2",
    "last": "/api/messages?page=8"
  }
}
```

**Error Response Format:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2025-10-18T12:00:00Z",
  "path": "/auth/register",
  "correlationId": "abc-123-def"
}
```

**Filtering, Sorting, Searching:**
```http
GET /api/messages?
  filter[platform]=instagram&
  filter[is_read]=false&
  sort=-created_at&
  search=hello&
  page=1&
  perPage=20
```

---

## Error Codes Reference

### Application Error Codes

| Code | Description | HTTP Status | User Message |
|------|-------------|-------------|--------------|
| AUTH_001 | Invalid credentials | 401 | Invalid email or password |
| AUTH_002 | Email already exists | 409 | User with this email already exists |
| AUTH_003 | Weak password | 400 | Password must contain uppercase, lowercase, and number |
| AUTH_004 | Token expired | 401 | Your session has expired. Please login again |
| AUTH_005 | Invalid token | 401 | Invalid authentication token |
| AUTH_006 | Account locked | 403 | Account has been locked due to too many failed login attempts |
| AUTH_007 | Email not verified | 403 | Please verify your email address |
| USER_001 | User not found | 404 | User not found |
| USER_002 | Insufficient permissions | 403 | You don't have permission to perform this action |
| OAUTH_001 | OAuth authorization failed | 400 | Failed to connect Instagram account |
| OAUTH_002 | Token refresh failed | 401 | Instagram token has expired. Please reconnect your account |
| OAUTH_003 | Invalid OAuth state | 400 | Invalid OAuth state parameter |
| IG_001 | Instagram API error | 500 | Instagram API request failed |
| IG_002 | Rate limit exceeded | 429 | Instagram rate limit exceeded. Please try again later |
| IG_003 | Account not connected | 400 | Instagram account not connected |
| MSG_001 | Message not found | 404 | Message not found |
| MSG_002 | Failed to send message | 500 | Failed to send message to Instagram |
| POST_001 | Post not found | 404 | Scheduled post not found |
| POST_002 | Failed to publish | 500 | Failed to publish post to Instagram |
| POST_003 | Invalid media format | 400 | Media file format not supported |
| MEDIA_001 | Upload failed | 500 | Failed to upload media file |
| MEDIA_002 | File too large | 400 | File size exceeds maximum limit (10MB) |
| MEDIA_003 | Invalid file type | 400 | File type not supported |

---

*Note: This document continues with detailed specifications for all remaining tasks. The format above should be replicated for:*
- *Remaining Infrastructure tasks (INFRA-004 through INFRA-012)*
- *Backend Core tasks (BE-002, BE-003, BE-005 through BE-008)*
- *Instagram Integration tasks (IG-001 through IG-007)*
- *Frontend Development tasks (FE-001 through FE-012)*
- *Background Workers (WORKER-001 through WORKER-004)*
- *Testing & Deployment tasks (TEST-001 through TEST-003, DEPLOY-001 through DEPLOY-005)*

**Document Status:** Foundation Complete - Ready for Expansion
**Next Steps:** Continue detailed specifications for remaining domains following the established format.
