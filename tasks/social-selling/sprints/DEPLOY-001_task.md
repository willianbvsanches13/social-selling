# DEPLOY-001: Staging Environment Setup

**Priority:** P0 (Critical Path)
**Effort:** 12 hours
**Day:** 30
**Dependencies:** BE-001, FE-001, INFRA-001, INFRA-002, INFRA-003
**Domain:** Deployment

---

## Overview

Set up a complete staging environment that mirrors production infrastructure on a VPS. This includes environment-specific configurations, staging database setup, SSL certificates, backend and frontend deployments, Instagram test app configuration, mock data seeding, access controls, and basic monitoring. The staging environment serves as the final testing ground before production deployment.

---

## Infrastructure Architecture

### VPS Specifications (Staging)

```yaml
Provider: Hetzner/DigitalOcean/Vultr
Instance Type: CPX31 (4 vCPU, 8GB RAM, 160GB SSD)
Region: EU-Central (Frankfurt) / US-East (New York)
OS: Ubuntu 22.04 LTS
IPv4: 1 dedicated IP
IPv6: Enabled
Backups: Daily automated backups
```

### Network Architecture

```
Internet
   ↓
Cloudflare DNS
   ↓
VPS (staging.example.com)
   ↓
Nginx Reverse Proxy
   ↓
   ├── Backend (localhost:4000)
   ├── Frontend (localhost:3000)
   ├── PostgreSQL (localhost:5432)
   ├── Redis (localhost:6379)
   ├── MinIO (localhost:9000)
   └── Monitoring (localhost:9090)
```

---

## Phase 1: VPS Provisioning and Initial Setup (2 hours)

### 1.1 Create VPS Instance

```bash
# File: /deployment/scripts/01-provision-vps.sh

#!/bin/bash
set -e

echo "=== VPS Provisioning Script ==="

# Variables
VPS_PROVIDER="hetzner"  # or digitalocean, vultr
VPS_TYPE="cpx31"
VPS_REGION="eu-central"
VPS_NAME="social-selling-staging"
SSH_KEY_PATH="$HOME/.ssh/id_rsa.pub"

# Hetzner CLI example
if [ "$VPS_PROVIDER" = "hetzner" ]; then
    hcloud context create staging

    # Create SSH key
    hcloud ssh-key create --name staging-key --public-key-from-file $SSH_KEY_PATH

    # Create server
    hcloud server create \
        --name $VPS_NAME \
        --type $VPS_TYPE \
        --location $VPS_REGION \
        --image ubuntu-22.04 \
        --ssh-key staging-key \
        --label environment=staging \
        --label project=social-selling

    # Get server IP
    VPS_IP=$(hcloud server describe $VPS_NAME -o json | jq -r '.public_net.ipv4.ip')
    echo "VPS Created: $VPS_IP"
    echo "$VPS_IP" > vps-ip.txt
fi

# DigitalOcean example
if [ "$VPS_PROVIDER" = "digitalocean" ]; then
    doctl compute droplet create $VPS_NAME \
        --size s-4vcpu-8gb \
        --image ubuntu-22-04-x64 \
        --region nyc3 \
        --ssh-keys $(doctl compute ssh-key list --format ID --no-header) \
        --tag-names staging,social-selling \
        --enable-ipv6 \
        --enable-backups \
        --wait

    VPS_IP=$(doctl compute droplet list $VPS_NAME --format PublicIPv4 --no-header)
    echo "VPS Created: $VPS_IP"
    echo "$VPS_IP" > vps-ip.txt
fi

echo "=== Waiting for SSH to be ready ==="
until ssh -o StrictHostKeyChecking=no root@$VPS_IP "echo SSH Ready"; do
    echo "Waiting for SSH..."
    sleep 10
done

echo "=== VPS Provisioning Complete ==="
```

### 1.2 Initial Server Configuration

```bash
# File: /deployment/scripts/02-initial-setup.sh

#!/bin/bash
set -e

VPS_IP=$1

if [ -z "$VPS_IP" ]; then
    echo "Usage: ./02-initial-setup.sh <vps-ip>"
    exit 1
fi

echo "=== Initial Server Setup on $VPS_IP ==="

# Execute remote commands
ssh root@$VPS_IP <<'ENDSSH'
set -e

# Update system
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Set timezone
timedatectl set-timezone UTC

# Set hostname
hostnamectl set-hostname social-selling-staging

# Create deploy user
echo "Creating deploy user..."
useradd -m -s /bin/bash deploy
usermod -aG sudo deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/deploy

# Setup SSH for deploy user
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Configure SSH security
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload sshd

# Configure firewall
echo "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# Install essential packages
echo "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    fail2ban \
    unattended-upgrades \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Configure fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Configure automatic security updates
dpkg-reconfigure -plow unattended-upgrades

# Increase file limits
cat >> /etc/security/limits.conf <<EOF
* soft nofile 65536
* hard nofile 65536
EOF

echo "=== Initial Setup Complete ==="
ENDSSH

echo "=== Server setup complete! ==="
echo "You can now login as: ssh deploy@$VPS_IP"
```

---

## Phase 2: Docker Installation and Configuration (1.5 hours)

### 2.1 Install Docker and Docker Compose

```bash
# File: /deployment/scripts/03-install-docker.sh

#!/bin/bash
set -e

VPS_IP=$1

if [ -z "$VPS_IP" ]; then
    echo "Usage: ./03-install-docker.sh <vps-ip>"
    exit 1
fi

echo "=== Installing Docker on $VPS_IP ==="

ssh deploy@$VPS_IP <<'ENDSSH'
set -e

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add deploy user to docker group
sudo usermod -aG docker deploy

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
docker --version
docker compose version

# Configure Docker daemon
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-address-pools": [
    {
      "base": "172.80.0.0/16",
      "size": 24
    }
  ]
}
EOF

sudo systemctl restart docker

echo "=== Docker Installation Complete ==="
ENDSSH

echo "=== Docker installed successfully! ==="
```

### 2.2 Docker Compose Configuration

```yaml
# File: /deployment/staging/docker-compose.yml

version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: staging-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - staging-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: staging-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis-data:/data
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - staging-network

  # MinIO Object Storage
  minio:
    image: minio/minio:latest
    container_name: staging-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio-data:/data
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - staging-network

  # Backend API
  backend:
    image: ${DOCKER_REGISTRY}/social-selling-backend:staging
    container_name: staging-backend
    restart: unless-stopped
    env_file:
      - .env.staging
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    ports:
      - "127.0.0.1:4000:4000"
    volumes:
      - backend-logs:/app/logs
      - backend-uploads:/app/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - staging-network

  # Frontend Application
  frontend:
    image: ${DOCKER_REGISTRY}/social-selling-frontend:staging
    container_name: staging-frontend
    restart: unless-stopped
    env_file:
      - .env.frontend.staging
    depends_on:
      - backend
    ports:
      - "127.0.0.1:3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - staging-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: staging-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      - backend
      - frontend
    networks:
      - staging-network

  # Prometheus Monitoring (Basic)
  prometheus:
    image: prom/prometheus:latest
    container_name: staging-prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - "127.0.0.1:9090:9090"
    networks:
      - staging-network

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local
  minio-data:
    driver: local
  backend-logs:
    driver: local
  backend-uploads:
    driver: local
  nginx-logs:
    driver: local
  prometheus-data:
    driver: local

networks:
  staging-network:
    driver: bridge
```

---

## Phase 3: Environment Configuration (2 hours)

### 3.1 Staging Environment Variables

```bash
# File: /deployment/staging/.env.staging

# Application
NODE_ENV=staging
APP_NAME="Social Selling Staging"
APP_URL=https://staging.yourdomain.com
API_URL=https://staging.yourdomain.com/api
PORT=4000

# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=social_selling_staging
POSTGRES_USER=staging_user
POSTGRES_PASSWORD=<GENERATE_SECURE_PASSWORD>
DATABASE_URL=postgresql://staging_user:<PASSWORD>@postgres:5432/social_selling_staging

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<GENERATE_SECURE_PASSWORD>
REDIS_URL=redis://:<PASSWORD>@redis:6379

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=staging-minio
MINIO_ROOT_PASSWORD=<GENERATE_SECURE_PASSWORD>
MINIO_ACCESS_KEY=staging-minio
MINIO_SECRET_KEY=<GENERATE_SECURE_PASSWORD>
MINIO_BUCKET_NAME=social-selling-staging
MINIO_PUBLIC_URL=https://staging.yourdomain.com/media

# JWT Authentication
JWT_SECRET=<GENERATE_SECURE_SECRET>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<GENERATE_SECURE_SECRET>
JWT_REFRESH_EXPIRES_IN=30d

# Session
SESSION_SECRET=<GENERATE_SECURE_SECRET>

# Instagram API (Test App)
INSTAGRAM_APP_ID=<STAGING_INSTAGRAM_APP_ID>
INSTAGRAM_APP_SECRET=<STAGING_INSTAGRAM_APP_SECRET>
INSTAGRAM_REDIRECT_URI=https://staging.yourdomain.com/api/instagram/callback
INSTAGRAM_GRAPH_API_VERSION=v18.0

# WhatsApp API (Test)
WHATSAPP_PHONE_NUMBER_ID=<TEST_PHONE_NUMBER_ID>
WHATSAPP_ACCESS_TOKEN=<TEST_ACCESS_TOKEN>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<GENERATE_SECURE_TOKEN>

# Email (Staging - Use Mailtrap)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=<MAILTRAP_USER>
SMTP_PASSWORD=<MAILTRAP_PASSWORD>
EMAIL_FROM=noreply@staging.yourdomain.com

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=/app/logs

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=https://staging.yourdomain.com

# Encryption
ENCRYPTION_KEY=<GENERATE_32_BYTE_KEY>
ENCRYPTION_ALGORITHM=aes-256-cbc

# Feature Flags
ENABLE_SWAGGER=true
ENABLE_DEBUG_MODE=true
ENABLE_QUEUE_DASHBOARD=true

# Monitoring
SENTRY_DSN=<STAGING_SENTRY_DSN>
SENTRY_ENVIRONMENT=staging
```

### 3.2 Frontend Environment Variables

```bash
# File: /deployment/staging/.env.frontend.staging

# Application
NEXT_PUBLIC_APP_NAME="Social Selling Staging"
NEXT_PUBLIC_API_URL=https://staging.yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://staging.yourdomain.com

# Environment
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=staging

# Instagram
NEXT_PUBLIC_INSTAGRAM_APP_ID=<STAGING_INSTAGRAM_APP_ID>

# Analytics (Use staging/test accounts)
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_HOTJAR_ID=

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_MOCKS=false

# Sentry
NEXT_PUBLIC_SENTRY_DSN=<STAGING_SENTRY_DSN>
NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging
```

### 3.3 Environment Setup Script

```bash
# File: /deployment/scripts/04-setup-environment.sh

#!/bin/bash
set -e

VPS_IP=$1

if [ -z "$VPS_IP" ]; then
    echo "Usage: ./04-setup-environment.sh <vps-ip>"
    exit 1
fi

echo "=== Setting up environment on $VPS_IP ==="

# Create deployment directory
ssh deploy@$VPS_IP "mkdir -p ~/social-selling/staging"

# Copy docker-compose and configs
scp -r ../staging/* deploy@$VPS_IP:~/social-selling/staging/

# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
MINIO_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Create .env file from template
ssh deploy@$VPS_IP <<EOF
cd ~/social-selling/staging

# Replace placeholders in .env.staging
sed -i "s/<GENERATE_SECURE_PASSWORD>/$POSTGRES_PASSWORD/g" .env.staging
sed -i "s/<GENERATE_SECURE_PASSWORD>/$REDIS_PASSWORD/g" .env.staging
sed -i "s/<GENERATE_SECURE_PASSWORD>/$MINIO_PASSWORD/g" .env.staging
sed -i "s/<GENERATE_SECURE_SECRET>/$JWT_SECRET/g" .env.staging
sed -i "s/<GENERATE_SECURE_SECRET>/$JWT_REFRESH_SECRET/g" .env.staging
sed -i "s/<GENERATE_SECURE_SECRET>/$SESSION_SECRET/g" .env.staging
sed -i "s/<GENERATE_32_BYTE_KEY>/$ENCRYPTION_KEY/g" .env.staging

# Secure the .env files
chmod 600 .env.staging .env.frontend.staging

echo "=== Environment files created ==="
EOF

echo "=== Environment setup complete! ==="
echo "IMPORTANT: Update Instagram and WhatsApp credentials in .env.staging"
```

---

## Phase 4: SSL Certificates with Let's Encrypt (1.5 hours)

### 4.1 Nginx Configuration

```nginx
# File: /deployment/staging/nginx/nginx.conf

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";

    include /etc/nginx/conf.d/*.conf;
}
```

```nginx
# File: /deployment/staging/nginx/conf.d/staging.conf

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/s;

# Upstream definitions
upstream backend {
    server backend:4000;
}

upstream frontend {
    server frontend:3000;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name staging.yourdomain.com;

    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name staging.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check (no rate limit)
    location /api/health {
        proxy_pass http://backend/health;
        access_log off;
    }

    # Frontend application
    location / {
        limit_req zone=general_limit burst=50 nodelay;

        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files (cached)
    location /_next/static {
        proxy_pass http://frontend;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.2 SSL Setup Script

```bash
# File: /deployment/scripts/05-setup-ssl.sh

#!/bin/bash
set -e

VPS_IP=$1
DOMAIN=$2

if [ -z "$VPS_IP" ] || [ -z "$DOMAIN" ]; then
    echo "Usage: ./05-setup-ssl.sh <vps-ip> <domain>"
    exit 1
fi

echo "=== Setting up SSL for $DOMAIN on $VPS_IP ==="

# Install certbot
ssh deploy@$VPS_IP <<ENDSSH
sudo apt-get update
sudo apt-get install -y certbot

# Create directory for ACME challenges
sudo mkdir -p /var/www/certbot

# Start nginx temporarily for certificate generation
cd ~/social-selling/staging
docker compose up -d nginx

# Wait for nginx to start
sleep 10

# Generate certificate
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Copy certificates to nginx volume
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ~/social-selling/staging/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ~/social-selling/staging/nginx/ssl/
sudo chown deploy:deploy ~/social-selling/staging/nginx/ssl/*

# Setup auto-renewal
echo "0 0 * * * certbot renew --quiet && docker exec staging-nginx nginx -s reload" | sudo crontab -

# Restart nginx with SSL
docker compose restart nginx

echo "=== SSL setup complete ==="
ENDSSH

echo "=== SSL certificates installed! ==="
```

---

## Phase 5: Database Setup and Migration (1.5 hours)

### 5.1 Database Initialization Script

```sql
-- File: /deployment/staging/postgres/init/01-init.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create application user
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'staging_user') THEN
      CREATE USER staging_user WITH PASSWORD 'placeholder';
   END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE social_selling_staging TO staging_user;

-- Set default search path
ALTER DATABASE social_selling_staging SET search_path TO public;

-- Performance tuning for staging
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '10MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';
```

### 5.2 Migration Runner

```bash
# File: /deployment/scripts/06-run-migrations.sh

#!/bin/bash
set -e

VPS_IP=$1

if [ -z "$VPS_IP" ]; then
    echo "Usage: ./06-run-migrations.sh <vps-ip>"
    exit 1
fi

echo "=== Running database migrations on $VPS_IP ==="

ssh deploy@$VPS_IP <<'ENDSSH'
cd ~/social-selling/staging

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until docker exec staging-postgres pg_isready -U staging_user; do
    sleep 2
done

# Run migrations
echo "Running migrations..."
docker exec staging-backend npm run migration:run

# Verify migrations
echo "Verifying migrations..."
docker exec staging-postgres psql -U staging_user -d social_selling_staging -c "SELECT version, name FROM migrations ORDER BY version;"

echo "=== Migrations complete ==="
ENDSSH
```

### 5.3 Mock Data Seeding

```typescript
// File: /backend/src/database/seeds/staging.seed.ts

import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

export async function seedStagingData(dataSource: DataSource): Promise<void> {
  console.log('🌱 Seeding staging data...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Create test users
    const users = [];
    for (let i = 0; i < 10; i++) {
      const password = await bcrypt.hash('Password123!', 10);
      const user = await queryRunner.manager.query(
        `INSERT INTO users (email, password, name, role, email_verified)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [
          faker.internet.email(),
          password,
          faker.person.fullName(),
          i === 0 ? 'admin' : 'user',
        ],
      );
      users.push(user[0]);
    }

    console.log(`✅ Created ${users.length} test users`);

    // Create Instagram accounts
    for (const user of users) {
      for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
        await queryRunner.manager.query(
          `INSERT INTO client_accounts (user_id, platform, username, display_name, profile_image_url, is_active)
           VALUES ($1, 'instagram', $2, $3, $4, true)`,
          [
            user.id,
            faker.internet.userName(),
            faker.person.fullName(),
            faker.image.avatar(),
          ],
        );
      }
    }

    console.log('✅ Created Instagram accounts');

    // Create contact lists
    for (const user of users) {
      for (let i = 0; i < 3; i++) {
        await queryRunner.manager.query(
          `INSERT INTO contact_lists (user_id, name, description)
           VALUES ($1, $2, $3)`,
          [
            user.id,
            faker.commerce.department(),
            faker.lorem.sentence(),
          ],
        );
      }
    }

    console.log('✅ Created contact lists');

    // Create contacts
    const lists = await queryRunner.manager.query('SELECT id, user_id FROM contact_lists');
    for (const list of lists) {
      for (let i = 0; i < 50; i++) {
        await queryRunner.manager.query(
          `INSERT INTO contacts (list_id, user_id, instagram_username, full_name, tags, custom_fields)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            list.id,
            list.user_id,
            faker.internet.userName(),
            faker.person.fullName(),
            JSON.stringify([faker.word.noun(), faker.word.adjective()]),
            JSON.stringify({
              city: faker.location.city(),
              interests: [faker.word.noun()],
            }),
          ],
        );
      }
    }

    console.log('✅ Created contacts');

    // Create message templates
    for (const user of users) {
      for (let i = 0; i < 10; i++) {
        await queryRunner.manager.query(
          `INSERT INTO message_templates (user_id, name, content, variables, category)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            user.id,
            faker.lorem.words(3),
            `Hi {{name}}, ${faker.lorem.sentence()}`,
            JSON.stringify(['name', 'product']),
            faker.helpers.arrayElement(['greeting', 'follow-up', 'promotion']),
          ],
        );
      }
    }

    console.log('✅ Created message templates');

    // Create campaigns
    const accounts = await queryRunner.manager.query('SELECT id, user_id FROM client_accounts');
    for (const account of accounts.slice(0, 5)) {
      await queryRunner.manager.query(
        `INSERT INTO campaigns (account_id, user_id, name, status, start_date, end_date, daily_limit, total_sent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          account.id,
          account.user_id,
          faker.company.catchPhrase(),
          faker.helpers.arrayElement(['draft', 'active', 'paused', 'completed']),
          faker.date.recent({ days: 30 }),
          faker.date.future({ years: 0.1 }),
          faker.number.int({ min: 50, max: 200 }),
          faker.number.int({ min: 0, max: 500 }),
        ],
      );
    }

    console.log('✅ Created campaigns');

    await queryRunner.commitTransaction();
    console.log('✅ Staging data seeding complete!');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

```bash
# File: /deployment/scripts/07-seed-data.sh

#!/bin/bash
set -e

VPS_IP=$1

if [ -z "$VPS_IP" ]; then
    echo "Usage: ./07-seed-data.sh <vps-ip>"
    exit 1
fi

echo "=== Seeding staging data on $VPS_IP ==="

ssh deploy@$VPS_IP <<'ENDSSH'
cd ~/social-selling/staging

# Run seed script
docker exec staging-backend npm run seed:staging

echo "=== Data seeding complete ==="
ENDSSH
```

---

## Phase 6: Application Deployment (2 hours)

### 6.1 Build and Push Docker Images

```bash
# File: /deployment/scripts/08-build-images.sh

#!/bin/bash
set -e

REGISTRY=${DOCKER_REGISTRY:-"ghcr.io/yourusername"}
VERSION=${VERSION:-"staging-latest"}

echo "=== Building Docker images ==="

# Build backend
echo "Building backend image..."
docker build \
    -f backend/Dockerfile \
    -t $REGISTRY/social-selling-backend:$VERSION \
    -t $REGISTRY/social-selling-backend:staging-latest \
    ./backend

# Build frontend
echo "Building frontend image..."
docker build \
    -f frontend/Dockerfile \
    -t $REGISTRY/social-selling-frontend:$VERSION \
    -t $REGISTRY/social-selling-frontend:staging-latest \
    --build-arg NEXT_PUBLIC_API_URL=https://staging.yourdomain.com/api \
    ./frontend

# Push images
echo "Pushing images to registry..."
docker push $REGISTRY/social-selling-backend:$VERSION
docker push $REGISTRY/social-selling-backend:staging-latest
docker push $REGISTRY/social-selling-frontend:$VERSION
docker push $REGISTRY/social-selling-frontend:staging-latest

echo "=== Images built and pushed successfully ==="
```

### 6.2 Deploy to Staging

```bash
# File: /deployment/scripts/09-deploy-staging.sh

#!/bin/bash
set -e

VPS_IP=$1
VERSION=${VERSION:-"staging-latest"}

if [ -z "$VPS_IP" ]; then
    echo "Usage: ./09-deploy-staging.sh <vps-ip> [version]"
    exit 1
fi

echo "=== Deploying version $VERSION to staging ($VPS_IP) ==="

ssh deploy@$VPS_IP <<ENDSSH
set -e

cd ~/social-selling/staging

# Pull latest images
echo "Pulling Docker images..."
docker compose pull

# Stop services gracefully
echo "Stopping services..."
docker compose down

# Start infrastructure services first
echo "Starting infrastructure..."
docker compose up -d postgres redis minio

# Wait for services to be healthy
echo "Waiting for infrastructure..."
sleep 20

# Run migrations
echo "Running migrations..."
docker compose run --rm backend npm run migration:run

# Start application services
echo "Starting application..."
docker compose up -d backend frontend nginx

# Wait for health checks
echo "Waiting for health checks..."
sleep 30

# Verify deployment
echo "Verifying deployment..."
curl -f http://localhost:4000/health || exit 1
curl -f http://localhost:3000 || exit 1

# Show running containers
docker compose ps

echo "=== Deployment complete ==="
ENDSSH

# Verify external access
echo "Verifying external access..."
sleep 5
curl -f https://staging.yourdomain.com/api/health || echo "Warning: External health check failed"

echo "=== Staging deployment successful! ==="
echo "Frontend: https://staging.yourdomain.com"
echo "API: https://staging.yourdomain.com/api"
echo "Swagger: https://staging.yourdomain.com/api/docs"
```

---

## Phase 7: Instagram Test App Setup (1 hour)

### 7.1 Create Instagram Test App

```markdown
# Instagram Test App Setup Guide

## 1. Create Facebook App

1. Go to https://developers.facebook.com/
2. Click "My Apps" → "Create App"
3. Select "Business" type
4. Fill in app details:
   - App Name: "Social Selling Staging"
   - App Contact Email: your-email@example.com
   - Business Account: Select or create

## 2. Add Instagram Basic Display

1. In app dashboard, click "Add Product"
2. Find "Instagram Basic Display" and click "Set Up"
3. Configure:
   - Valid OAuth Redirect URIs:
     - https://staging.yourdomain.com/api/instagram/callback
   - Deauthorize Callback URL:
     - https://staging.yourdomain.com/api/instagram/deauthorize
   - Data Deletion Request URL:
     - https://staging.yourdomain.com/api/instagram/delete

## 3. Add Instagram Graph API

1. In app dashboard, click "Add Product"
2. Find "Instagram Graph API" and click "Set Up"
3. Add test users:
   - Go to Roles → Test Users
   - Add Instagram test accounts

## 4. Get Credentials

1. Go to Settings → Basic
2. Copy:
   - App ID → `INSTAGRAM_APP_ID`
   - App Secret → `INSTAGRAM_APP_SECRET`
3. Update `.env.staging` with these values

## 5. Switch to Live Mode (for Staging)

1. Go to App Mode toggle
2. Keep in "Development" mode for staging
3. Add your Instagram account as a test user
```

### 7.2 Test Instagram Integration

```bash
# File: /deployment/scripts/10-test-instagram.sh

#!/bin/bash
set -e

STAGING_URL="https://staging.yourdomain.com"

echo "=== Testing Instagram Integration ==="

# Test OAuth flow
echo "1. Open this URL in your browser to authorize Instagram:"
echo "$STAGING_URL/api/instagram/auth"
echo ""
echo "After authorization, you should be redirected to the callback URL."
echo ""

read -p "Press enter after completing OAuth flow..."

# Test API endpoints
echo "2. Testing Instagram API endpoints..."

# Get user profile
curl -f -X GET "$STAGING_URL/api/instagram/profile" \
    -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
    || echo "Profile fetch failed"

# Get media list
curl -f -X GET "$STAGING_URL/api/instagram/media" \
    -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
    || echo "Media fetch failed"

echo "=== Instagram integration test complete ==="
```

---

## Phase 8: Access Controls (1 hour)

### 8.1 IP Whitelist Configuration

```nginx
# File: /deployment/staging/nginx/conf.d/access-control.conf

# Geo block configuration
geo $allowed_ip {
    default 0;

    # Office IPs
    203.0.113.0/24 1;  # Office network
    198.51.100.50 1;   # VPN exit

    # Developer IPs
    192.0.2.100 1;     # Developer 1
    192.0.2.101 1;     # Developer 2
}

# Basic auth for staging
map $allowed_ip $basic_auth_staging {
    0 "Staging Environment - Restricted";
    1 "off";
}
```

```bash
# Create htpasswd file
htpasswd -c /deployment/staging/nginx/.htpasswd staging
# Password: create-strong-password
```

Update staging.conf:

```nginx
# Add to server block in staging.conf
auth_basic $basic_auth_staging;
auth_basic_user_file /etc/nginx/.htpasswd;

# Whitelist health checks
location /api/health {
    auth_basic off;
    proxy_pass http://backend/health;
}

# Whitelist webhook endpoints
location /api/webhooks {
    auth_basic off;
    # Add Instagram/WhatsApp IP ranges here
    proxy_pass http://backend/webhooks;
}
```

### 8.2 Network Security

```bash
# File: /deployment/scripts/11-configure-firewall.sh

#!/bin/bash
set -e

VPS_IP=$1

if [ -z "$VPS_IP" ]; then
    echo "Usage: ./11-configure-firewall.sh <vps-ip>"
    exit 1
fi

ssh deploy@$VPS_IP <<'ENDSSH'
# Configure UFW rules
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH (from specific IPs only)
sudo ufw allow from 203.0.113.0/24 to any port 22
sudo ufw allow from 198.51.100.50 to any port 22

# HTTP/HTTPS (public)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable UFW
sudo ufw --force enable

# Configure fail2ban
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

sudo systemctl restart fail2ban

echo "=== Firewall configured ==="
ENDSSH
```

---

## Phase 9: Monitoring Setup (1.5 hours)

### 9.1 Prometheus Configuration

```yaml
# File: /deployment/staging/prometheus/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: 'staging'
    project: 'social-selling'

scrape_configs:
  # Node Exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # Backend metrics
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:4000']
    metrics_path: '/metrics'

  # PostgreSQL
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Nginx
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']
```

### 9.2 Basic Alerting

```yaml
# File: /deployment/staging/prometheus/alerts.yml

groups:
  - name: staging_alerts
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for 5 minutes"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 85%"

      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} has been down for 2 minutes"
```

### 9.3 Health Check Dashboard

```bash
# File: /deployment/scripts/12-setup-monitoring.sh

#!/bin/bash
set -e

VPS_IP=$1

if [ -z "$VPS_IP" ]; then
    echo "Usage: ./12-setup-monitoring.sh <vps-ip>"
    exit 1
fi

echo "=== Setting up monitoring on $VPS_IP ==="

# Add exporters to docker-compose
ssh deploy@$VPS_IP <<'ENDSSH'
cd ~/social-selling/staging

# Add node-exporter service
cat >> docker-compose.yml <<EOF

  node-exporter:
    image: prom/node-exporter:latest
    container_name: staging-node-exporter
    restart: unless-stopped
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    networks:
      - staging-network
EOF

# Restart with monitoring
docker compose up -d

echo "=== Monitoring setup complete ==="
echo "Prometheus: http://$VPS_IP:9090"
ENDSSH
```

---

## Complete Deployment Workflow

```bash
# File: /deployment/scripts/complete-staging-setup.sh

#!/bin/bash
set -e

VPS_IP=$1
DOMAIN=$2

if [ -z "$VPS_IP" ] || [ -z "$DOMAIN" ]; then
    echo "Usage: ./complete-staging-setup.sh <vps-ip> <domain>"
    echo "Example: ./complete-staging-setup.sh 203.0.113.50 staging.example.com"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        Social Selling - Staging Environment Setup          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Provision VPS
echo "📦 Step 1/12: Provisioning VPS..."
./01-provision-vps.sh
VPS_IP=$(cat vps-ip.txt)

# Step 2: Initial setup
echo "🔧 Step 2/12: Initial server configuration..."
./02-initial-setup.sh $VPS_IP

# Step 3: Install Docker
echo "🐳 Step 3/12: Installing Docker..."
./03-install-docker.sh $VPS_IP

# Step 4: Setup environment
echo "⚙️  Step 4/12: Configuring environment..."
./04-setup-environment.sh $VPS_IP

echo "⚠️  MANUAL STEP REQUIRED:"
echo "Update Instagram and WhatsApp credentials in:"
echo "  ssh deploy@$VPS_IP"
echo "  cd ~/social-selling/staging"
echo "  vim .env.staging"
echo ""
read -p "Press enter when ready to continue..."

# Step 5: Setup DNS
echo "🌐 Step 5/12: Configure DNS..."
echo "Add A record: $DOMAIN → $VPS_IP"
echo "Waiting for DNS propagation..."
while ! host $DOMAIN | grep -q $VPS_IP; do
    echo "Waiting for DNS..."
    sleep 10
done

# Step 6: Setup SSL
echo "🔒 Step 6/12: Setting up SSL certificates..."
./05-setup-ssl.sh $VPS_IP $DOMAIN

# Step 7: Build images
echo "🏗️  Step 7/12: Building Docker images..."
./08-build-images.sh

# Step 8: Deploy application
echo "🚀 Step 8/12: Deploying application..."
./09-deploy-staging.sh $VPS_IP

# Step 9: Run migrations
echo "💾 Step 9/12: Running database migrations..."
./06-run-migrations.sh $VPS_IP

# Step 10: Seed data
echo "🌱 Step 10/12: Seeding test data..."
./07-seed-data.sh $VPS_IP

# Step 11: Configure firewall
echo "🛡️  Step 11/12: Configuring firewall..."
./11-configure-firewall.sh $VPS_IP

# Step 12: Setup monitoring
echo "📊 Step 12/12: Setting up monitoring..."
./12-setup-monitoring.sh $VPS_IP

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           Staging Environment Setup Complete!              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Frontend: https://$DOMAIN"
echo "🔌 API: https://$DOMAIN/api"
echo "📚 Swagger: https://$DOMAIN/api/docs"
echo "📊 Prometheus: http://$VPS_IP:9090"
echo ""
echo "🔐 Basic Auth Credentials:"
echo "   Username: staging"
echo "   Password: <check .htpasswd file>"
echo ""
echo "📝 Next Steps:"
echo "   1. Test Instagram OAuth: https://$DOMAIN/api/instagram/auth"
echo "   2. Run ./10-test-instagram.sh to verify integration"
echo "   3. Access frontend and create test account"
echo "   4. Configure monitoring alerts"
echo ""
```

---

## Acceptance Criteria

- [ ] VPS instance provisioned and accessible via SSH
- [ ] Deploy user created with sudo access and SSH key authentication
- [ ] Root login disabled for security
- [ ] UFW firewall configured and enabled
- [ ] Fail2ban installed and protecting SSH
- [ ] Docker and Docker Compose installed
- [ ] Docker daemon configured with logging limits
- [ ] All environment variables configured in .env.staging
- [ ] Secure passwords generated for all services
- [ ] PostgreSQL running in Docker container
- [ ] Redis running with password protection
- [ ] MinIO object storage configured
- [ ] Database initialized with extensions
- [ ] All migrations applied successfully
- [ ] Mock data seeded for testing
- [ ] Backend application running and healthy
- [ ] Frontend application running and accessible
- [ ] Nginx reverse proxy configured
- [ ] SSL certificates installed via Let's Encrypt
- [ ] SSL auto-renewal configured
- [ ] Domain resolving to VPS IP
- [ ] HTTPS working with valid certificates
- [ ] HTTP redirecting to HTTPS
- [ ] Instagram test app created on Facebook Developer
- [ ] Instagram OAuth flow working
- [ ] Instagram API integration tested
- [ ] Basic authentication configured for staging
- [ ] IP whitelist configured (optional)
- [ ] Health checks responding correctly
- [ ] Rate limiting configured in Nginx
- [ ] Security headers configured
- [ ] Prometheus metrics collection working
- [ ] Basic alerts configured
- [ ] Docker container logs accessible
- [ ] Backup strategy documented
- [ ] Rollback procedure tested

---

## Testing Procedure

```bash
# 1. Verify VPS accessibility
ssh deploy@<VPS_IP>
docker ps
exit

# 2. Check DNS resolution
dig staging.yourdomain.com +short
# Should return VPS IP

# 3. Test SSL certificate
curl -vI https://staging.yourdomain.com 2>&1 | grep "SSL certificate"
# Should show valid certificate

# 4. Test backend health
curl https://staging.yourdomain.com/api/health
# Should return: {"status":"ok"}

# 5. Test frontend
curl -I https://staging.yourdomain.com
# Should return 200 or 401 (if basic auth enabled)

# 6. Test basic authentication
curl -u staging:password https://staging.yourdomain.com
# Should return frontend HTML

# 7. Test database connection
ssh deploy@<VPS_IP> "docker exec staging-postgres psql -U staging_user -d social_selling_staging -c 'SELECT version();'"

# 8. Test Redis
ssh deploy@<VPS_IP> "docker exec staging-redis redis-cli -a \$REDIS_PASSWORD ping"
# Should return: PONG

# 9. Test MinIO
curl http://<VPS_IP>:9000/minio/health/live
# Should return 200

# 10. Verify migrations
ssh deploy@<VPS_IP> "docker exec staging-postgres psql -U staging_user -d social_selling_staging -c 'SELECT COUNT(*) FROM migrations;'"

# 11. Test Instagram OAuth (manual)
# Open: https://staging.yourdomain.com/api/instagram/auth
# Complete OAuth flow
# Verify redirect to callback

# 12. Check Prometheus metrics
curl http://<VPS_IP>:9090/api/v1/query?query=up
# Should show all services up=1

# 13. Test rate limiting
for i in {1..15}; do curl -s -o /dev/null -w "%{http_code}\n" https://staging.yourdomain.com/api/health; done
# Should show 429 after hitting limit

# 14. Verify logs
ssh deploy@<VPS_IP> "docker logs staging-backend --tail 50"
ssh deploy@<VPS_IP> "docker logs staging-nginx --tail 50"

# 15. Test container restart
ssh deploy@<VPS_IP> "cd ~/social-selling/staging && docker compose restart backend"
sleep 10
curl https://staging.yourdomain.com/api/health
# Should return healthy after restart
```

---

## Rollback Procedure

```bash
# File: /deployment/scripts/rollback-staging.sh

#!/bin/bash
set -e

VPS_IP=$1
VERSION=$2

if [ -z "$VPS_IP" ] || [ -z "$VERSION" ]; then
    echo "Usage: ./rollback-staging.sh <vps-ip> <version>"
    exit 1
fi

echo "=== Rolling back to version $VERSION ==="

ssh deploy@$VPS_IP <<ENDSSH
cd ~/social-selling/staging

# Update image tags in .env
sed -i "s/staging-latest/$VERSION/g" .env.staging

# Pull specific version
docker compose pull

# Restart services
docker compose down
docker compose up -d

# Verify health
sleep 20
curl -f http://localhost:4000/health || exit 1

echo "=== Rollback complete ==="
ENDSSH
```

---

## Troubleshooting Guide

### Issue: Docker containers not starting

```bash
# Check logs
docker logs staging-backend
docker logs staging-postgres

# Check resource usage
docker stats

# Restart services
cd ~/social-selling/staging
docker compose restart
```

### Issue: Database connection failed

```bash
# Check PostgreSQL status
docker exec staging-postgres pg_isready -U staging_user

# Check environment variables
docker exec staging-backend env | grep POSTGRES

# Reset PostgreSQL
docker compose down postgres
docker compose up -d postgres
```

### Issue: SSL certificate not working

```bash
# Check certificate validity
openssl x509 -in ~/social-selling/staging/nginx/ssl/fullchain.pem -text -noout

# Renew certificate manually
sudo certbot renew --force-renewal

# Copy to nginx volume
sudo cp /etc/letsencrypt/live/staging.yourdomain.com/fullchain.pem ~/social-selling/staging/nginx/ssl/
sudo cp /etc/letsencrypt/live/staging.yourdomain.com/privkey.pem ~/social-selling/staging/nginx/ssl/

# Restart nginx
docker compose restart nginx
```

### Issue: Out of disk space

```bash
# Check disk usage
df -h

# Clean Docker system
docker system prune -a --volumes

# Check large files
du -sh /var/lib/docker/*
du -sh ~/social-selling/staging/*
```

---

## Security Checklist

- [ ] SSH root login disabled
- [ ] SSH password authentication disabled
- [ ] UFW firewall enabled
- [ ] Fail2ban protecting against brute force
- [ ] All services running with non-root users
- [ ] Database passwords are strong and unique
- [ ] JWT secrets are cryptographically secure
- [ ] SSL/TLS certificates valid and auto-renewing
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers configured in Nginx
- [ ] Rate limiting enabled
- [ ] Basic authentication protecting staging (optional)
- [ ] Docker daemon secured
- [ ] Sensitive data not in logs
- [ ] Environment files have restricted permissions (600)
- [ ] Regular security updates enabled
- [ ] Backups encrypted

---

## Cost Estimate

### Infrastructure (Monthly)
- **VPS (Hetzner CPX31):** €11.90/month
- **Domain:** €1/month
- **SSL Certificate:** Free (Let's Encrypt)
- **Backups:** €2.38/month (20% of server cost)
- **Total:** ~€15/month (~$16 USD)

### Time Investment
- **Total:** 12 hours

---

## Related Documents

- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Production Deployment: `DEPLOY-002_task.md`
- Infrastructure Setup: `INFRA-001_task.md` through `INFRA-011_task.md`

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
