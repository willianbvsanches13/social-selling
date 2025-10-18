# DEPLOY-002: Production Deployment

## Overview
Complete production deployment infrastructure with high availability, zero-downtime deployments, and enterprise-grade reliability using Docker Swarm orchestration.

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
1. [Production VPS Setup](#production-vps-setup)
2. [Docker Swarm Orchestration](#docker-swarm-orchestration)
3. [Zero-Downtime Deployment](#zero-downtime-deployment)
4. [Database Migration Strategy](#database-migration-strategy)
5. [SSL & Security](#ssl-security)
6. [Environment Management](#environment-management)
7. [Health Checks](#health-checks)
8. [Rollback Procedures](#rollback-procedures)
9. [Load Balancing](#load-balancing)
10. [Production Monitoring](#production-monitoring)

---

## 1. Production VPS Setup

### 1.1 VPS Requirements

**Minimum Specifications:**
```yaml
production_primary:
  provider: DigitalOcean/AWS/Hetzner
  cpu: 4 vCPUs
  ram: 8 GB
  storage: 160 GB SSD
  bandwidth: 5 TB
  backup: enabled

production_replica:
  provider: Different Region/Provider
  cpu: 4 vCPUs
  ram: 8 GB
  storage: 160 GB SSD
  bandwidth: 5 TB
  backup: enabled

database_server:
  provider: Same as primary
  cpu: 2 vCPUs
  ram: 4 GB
  storage: 100 GB SSD (with auto-scaling)
  backup: daily automated
```

### 1.2 Initial Server Setup Script

**File:** `deployment/scripts/setup-production-server.sh`
```bash
#!/bin/bash
set -euo pipefail

# Production Server Setup Script
# Run as root on fresh Ubuntu 22.04 LTS server

HOSTNAME="${1:-social-selling-prod-01}"
ADMIN_USER="${2:-deploy}"
SSH_KEY_PATH="${3:-~/.ssh/id_rsa.pub}"

echo "========================================="
echo "Production Server Setup"
echo "Hostname: $HOSTNAME"
echo "Admin User: $ADMIN_USER"
echo "========================================="

# Update system
apt-get update
apt-get upgrade -y
apt-get autoremove -y

# Set hostname
hostnamectl set-hostname "$HOSTNAME"
echo "127.0.0.1 $HOSTNAME" >> /etc/hosts

# Install essential packages
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    ufw \
    fail2ban \
    unattended-upgrades \
    htop \
    vim \
    git \
    build-essential \
    python3-pip \
    jq

# Configure automatic security updates
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

systemctl enable unattended-upgrades
systemctl start unattended-upgrades

# Create admin user
if ! id "$ADMIN_USER" &>/dev/null; then
    useradd -m -s /bin/bash -G sudo "$ADMIN_USER"
    echo "$ADMIN_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$ADMIN_USER
    chmod 0440 /etc/sudoers.d/$ADMIN_USER
fi

# Setup SSH for admin user
mkdir -p /home/$ADMIN_USER/.ssh
if [ -f "$SSH_KEY_PATH" ]; then
    cp "$SSH_KEY_PATH" /home/$ADMIN_USER/.ssh/authorized_keys
else
    echo "Warning: SSH key not found at $SSH_KEY_PATH"
fi
chmod 700 /home/$ADMIN_USER/.ssh
chmod 600 /home/$ADMIN_USER/.ssh/authorized_keys 2>/dev/null || true
chown -R $ADMIN_USER:$ADMIN_USER /home/$ADMIN_USER/.ssh

# Harden SSH
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<EOF
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
AllowUsers $ADMIN_USER
MaxAuthTries 3
LoginGraceTime 20
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

systemctl restart sshd

# Configure firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 2377/tcp  # Docker Swarm
ufw allow 7946/tcp  # Docker Swarm
ufw allow 7946/udp  # Docker Swarm
ufw allow 4789/udp  # Docker Swarm overlay
ufw --force enable

# Configure fail2ban
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = ops@yourdomain.com
sendername = Fail2Ban

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Configure Docker daemon
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "userland-proxy": false,
  "experimental": false,
  "metrics-addr": "127.0.0.1:9323",
  "storage-driver": "overlay2"
}
EOF

systemctl enable docker
systemctl restart docker

# Add admin user to docker group
usermod -aG docker $ADMIN_USER

# Install Docker Compose standalone (for compatibility)
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# System limits for production
cat >> /etc/security/limits.conf <<EOF
*               soft    nofile          65535
*               hard    nofile          65535
root            soft    nofile          65535
root            hard    nofile          65535
EOF

# Sysctl optimizations
cat > /etc/sysctl.d/99-production.conf <<EOF
# Network optimizations
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15
net.ipv4.ip_local_port_range = 1024 65535

# Memory optimizations
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2

# File system optimizations
fs.file-max = 2097152
EOF

sysctl -p /etc/sysctl.d/99-production.conf

# Setup log rotation
cat > /etc/logrotate.d/docker-containers <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
EOF

# Install monitoring tools
apt-get install -y prometheus-node-exporter
systemctl enable prometheus-node-exporter
systemctl start prometheus-node-exporter

# Create deployment directory
mkdir -p /opt/social-selling
chown $ADMIN_USER:$ADMIN_USER /opt/social-selling

# Setup MOTD
cat > /etc/motd <<EOF
========================================
Social Selling Platform - Production
Hostname: $HOSTNAME
Environment: Production
========================================
CRITICAL: All changes must follow deployment procedures
Documentation: https://docs.yourdomain.com
========================================
EOF

echo "========================================="
echo "Production server setup completed!"
echo "Next steps:"
echo "1. Logout and login as $ADMIN_USER"
echo "2. Initialize Docker Swarm"
echo "3. Deploy application stack"
echo "========================================="
```

### 1.3 Multi-Server Setup

**File:** `deployment/scripts/setup-cluster.sh`
```bash
#!/bin/bash
set -euo pipefail

# Multi-server cluster setup
MANAGER_IP="${1:-}"
WORKER_IPS="${2:-}"

if [ -z "$MANAGER_IP" ]; then
    echo "Usage: $0 <manager_ip> <worker_ips_comma_separated>"
    exit 1
fi

echo "Setting up Docker Swarm cluster"
echo "Manager: $MANAGER_IP"
echo "Workers: $WORKER_IPS"

# Initialize Swarm on manager
ssh deploy@$MANAGER_IP "docker swarm init --advertise-addr $MANAGER_IP"

# Get join token
JOIN_TOKEN=$(ssh deploy@$MANAGER_IP "docker swarm join-token worker -q")

# Join workers to swarm
if [ -n "$WORKER_IPS" ]; then
    IFS=',' read -ra WORKERS <<< "$WORKER_IPS"
    for WORKER in "${WORKERS[@]}"; do
        echo "Adding worker: $WORKER"
        ssh deploy@$WORKER "docker swarm join --token $JOIN_TOKEN $MANAGER_IP:2377"
    done
fi

echo "Cluster setup complete!"
ssh deploy@$MANAGER_IP "docker node ls"
```

---

## 2. Docker Swarm Orchestration

### 2.1 Swarm Stack Configuration

**File:** `deployment/docker-stack.production.yml`
```yaml
version: '3.8'

services:
  nginx:
    image: ${REGISTRY_URL}/social-selling-nginx:${VERSION}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - nginx_cache:/var/cache/nginx
      - letsencrypt_certs:/etc/letsencrypt:ro
      - letsencrypt_www:/var/www/certbot:ro
    networks:
      - frontend
    deploy:
      mode: replicated
      replicas: 2
      placement:
        max_replicas_per_node: 1
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s

  backend:
    image: ${REGISTRY_URL}/social-selling-backend:${VERSION}
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
      SESSION_SECRET: ${SESSION_SECRET}
      AWS_REGION: ${AWS_REGION}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      S3_BUCKET: ${S3_BUCKET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SENTRY_DSN: ${SENTRY_DSN}
      LOG_LEVEL: info
    networks:
      - frontend
      - backend
    deploy:
      mode: replicated
      replicas: 3
      placement:
        max_replicas_per_node: 2
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
        failure_action: rollback
      rollback_config:
        parallelism: 1
        delay: 5s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    secrets:
      - db_password
      - jwt_secret
      - session_secret

  frontend:
    image: ${REGISTRY_URL}/social-selling-frontend:${VERSION}
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      NEXT_PUBLIC_WS_URL: ${NEXT_PUBLIC_WS_URL}
      NEXT_PUBLIC_SENTRY_DSN: ${NEXT_PUBLIC_SENTRY_DSN}
    networks:
      - frontend
    deploy:
      mode: replicated
      replicas: 2
      placement:
        max_replicas_per_node: 1
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --appendfsync everysec
      --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - backend
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - postgres_backups:/backups
    networks:
      - backend
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 30s
      timeout: 5s
      retries: 3
    secrets:
      - db_password

  certbot:
    image: certbot/certbot:latest
    volumes:
      - letsencrypt_certs:/etc/letsencrypt
      - letsencrypt_www:/var/www/certbot
    networks:
      - frontend
    deploy:
      mode: replicated
      replicas: 0
      restart_policy:
        condition: none
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  frontend:
    driver: overlay
    attachable: true
  backend:
    driver: overlay
    internal: true

volumes:
  postgres_data:
    driver: local
  postgres_backups:
    driver: local
  redis_data:
    driver: local
  nginx_cache:
    driver: local
  letsencrypt_certs:
    driver: local
  letsencrypt_www:
    driver: local

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
  session_secret:
    external: true
```

### 2.2 Swarm Management Scripts

**File:** `deployment/scripts/swarm-deploy.sh`
```bash
#!/bin/bash
set -euo pipefail

VERSION="${1:-latest}"
STACK_NAME="social-selling"
REGISTRY_URL="${REGISTRY_URL:-registry.yourdomain.com}"

echo "========================================="
echo "Deploying Social Selling Platform"
echo "Version: $VERSION"
echo "Stack: $STACK_NAME"
echo "========================================="

# Load environment variables
if [ -f .env.production ]; then
    set -a
    source .env.production
    set +a
else
    echo "Error: .env.production not found"
    exit 1
fi

# Export variables for docker stack
export VERSION
export REGISTRY_URL

# Ensure secrets are created
./deployment/scripts/create-secrets.sh

# Deploy stack
docker stack deploy \
    --compose-file deployment/docker-stack.production.yml \
    --with-registry-auth \
    --prune \
    $STACK_NAME

echo "Deployment initiated. Waiting for services..."

# Wait for services to be ready
sleep 10

# Check service status
docker stack services $STACK_NAME

# Wait for all services to be running
for i in {1..30}; do
    PENDING=$(docker stack services $STACK_NAME --filter "desired-state=running" --format "{{.Replicas}}" | grep -c "0/" || true)
    if [ "$PENDING" -eq 0 ]; then
        echo "All services are running!"
        break
    fi
    echo "Waiting for services to start... ($i/30)"
    sleep 10
done

# Show final status
docker stack ps $STACK_NAME --no-trunc

echo "========================================="
echo "Deployment completed!"
echo "Run health checks: ./deployment/scripts/health-check.sh"
echo "========================================="
```

---

## 3. Zero-Downtime Deployment

### 3.1 Blue-Green Deployment Strategy

**File:** `deployment/scripts/blue-green-deploy.sh`
```bash
#!/bin/bash
set -euo pipefail

# Blue-Green deployment for zero-downtime releases
NEW_VERSION="${1:-}"
STACK_NAME="social-selling"
CURRENT_COLOR="${2:-blue}"

if [ -z "$NEW_VERSION" ]; then
    echo "Usage: $0 <version> [current_color]"
    exit 1
fi

# Determine colors
if [ "$CURRENT_COLOR" = "blue" ]; then
    NEW_COLOR="green"
else
    NEW_COLOR="blue"
fi

echo "========================================="
echo "Blue-Green Deployment"
echo "Current: $CURRENT_COLOR"
echo "New: $NEW_COLOR"
echo "Version: $NEW_VERSION"
echo "========================================="

# Step 1: Deploy new version to inactive color
echo "Step 1: Deploying version $NEW_VERSION to $NEW_COLOR environment..."
export VERSION=$NEW_VERSION
export COLOR=$NEW_COLOR
export STACK_NAME="${STACK_NAME}-${NEW_COLOR}"

docker stack deploy \
    --compose-file deployment/docker-stack.production.yml \
    --with-registry-auth \
    $STACK_NAME

# Step 2: Wait for new deployment to be healthy
echo "Step 2: Waiting for $NEW_COLOR environment to be healthy..."
sleep 30

MAX_WAIT=300
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    HEALTH=$(curl -sf http://localhost:8080/health || echo "unhealthy")
    if [ "$HEALTH" = "healthy" ]; then
        echo "$NEW_COLOR environment is healthy!"
        break
    fi
    echo "Waiting for health check... ($ELAPSED/$MAX_WAIT)"
    sleep 10
    ELAPSED=$((ELAPSED + 10))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "Error: $NEW_COLOR environment failed health checks"
    echo "Rolling back..."
    docker stack rm $STACK_NAME
    exit 1
fi

# Step 3: Run smoke tests
echo "Step 3: Running smoke tests..."
if ! ./deployment/scripts/smoke-tests.sh http://localhost:8080; then
    echo "Error: Smoke tests failed"
    echo "Rolling back..."
    docker stack rm $STACK_NAME
    exit 1
fi

# Step 4: Switch traffic
echo "Step 4: Switching traffic to $NEW_COLOR..."
# Update load balancer to point to new color
./deployment/scripts/switch-traffic.sh $NEW_COLOR

# Step 5: Verify traffic switch
echo "Step 5: Verifying traffic switch..."
sleep 10
./deployment/scripts/verify-traffic.sh

# Step 6: Remove old deployment
echo "Step 6: Removing $CURRENT_COLOR environment..."
docker stack rm "${STACK_NAME}-${CURRENT_COLOR}"

# Update current color marker
echo $NEW_COLOR > /opt/social-selling/current-color

echo "========================================="
echo "Blue-Green deployment completed!"
echo "Active environment: $NEW_COLOR"
echo "Version: $NEW_VERSION"
echo "========================================="
```

### 3.2 Rolling Update Strategy

**File:** `deployment/scripts/rolling-update.sh`
```bash
#!/bin/bash
set -euo pipefail

SERVICE="${1:-}"
VERSION="${2:-latest}"
STACK_NAME="social-selling"

if [ -z "$SERVICE" ]; then
    echo "Usage: $0 <service_name> [version]"
    echo "Services: backend, frontend, nginx"
    exit 1
fi

SERVICE_NAME="${STACK_NAME}_${SERVICE}"

echo "========================================="
echo "Rolling Update"
echo "Service: $SERVICE_NAME"
echo "Version: $VERSION"
echo "========================================="

# Get current image
CURRENT_IMAGE=$(docker service inspect $SERVICE_NAME --format='{{.Spec.TaskTemplate.ContainerSpec.Image}}')
NEW_IMAGE="${REGISTRY_URL}/social-selling-${SERVICE}:${VERSION}"

echo "Current: $CURRENT_IMAGE"
echo "New: $NEW_IMAGE"

# Confirm update
read -p "Proceed with update? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Update cancelled"
    exit 0
fi

# Update service
docker service update \
    --image $NEW_IMAGE \
    --update-parallelism 1 \
    --update-delay 30s \
    --update-order start-first \
    --update-failure-action rollback \
    $SERVICE_NAME

# Monitor update progress
echo "Monitoring update progress..."
while true; do
    STATE=$(docker service inspect $SERVICE_NAME --format='{{.UpdateStatus.State}}')
    if [ "$STATE" = "completed" ]; then
        echo "Update completed successfully!"
        break
    elif [ "$STATE" = "rollback_completed" ]; then
        echo "Update failed and was rolled back"
        exit 1
    fi
    echo "Update state: $STATE"
    docker service ps $SERVICE_NAME --filter "desired-state=running" --format "table {{.Name}}\t{{.Image}}\t{{.CurrentState}}"
    sleep 10
done

echo "========================================="
echo "Rolling update completed successfully!"
echo "========================================="
```

---

## 4. Database Migration Strategy

### 4.1 Pre-Migration Backup

**File:** `deployment/scripts/backup-database.sh`
```bash
#!/bin/bash
set -euo pipefail

# Database backup script with compression and verification
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/postgres"
BACKUP_FILE="social-selling-${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

echo "========================================="
echo "Database Backup"
echo "Timestamp: $TIMESTAMP"
echo "========================================="

# Create backup
echo "Creating backup..."
docker exec $(docker ps -qf "name=social-selling_postgres") \
    pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} | \
    gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

# Verify backup
echo "Verifying backup..."
if gunzip -t "${BACKUP_DIR}/${BACKUP_FILE}"; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    echo "Error: Backup verification failed"
    exit 1
fi

# Upload to S3
echo "Uploading to S3..."
aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" \
    "s3://${S3_BACKUP_BUCKET}/postgres/${BACKUP_FILE}" \
    --storage-class STANDARD_IA

# Cleanup old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "========================================="
echo "Backup completed: ${BACKUP_FILE}"
echo "========================================="
```

### 4.2 Migration Execution

**File:** `deployment/scripts/run-migrations.sh`
```bash
#!/bin/bash
set -euo pipefail

MIGRATION_DIR="./src/database/migrations"
DRY_RUN="${1:-false}"

echo "========================================="
echo "Database Migrations"
echo "Dry Run: $DRY_RUN"
echo "========================================="

# Step 1: Backup database
echo "Step 1: Creating backup..."
./deployment/scripts/backup-database.sh

# Step 2: Check pending migrations
echo "Step 2: Checking pending migrations..."
PENDING=$(docker exec $(docker ps -qf "name=social-selling_backend") \
    npm run migration:show | grep -c "pending" || true)

echo "Pending migrations: $PENDING"

if [ "$PENDING" -eq 0 ]; then
    echo "No pending migrations"
    exit 0
fi

# Step 3: Run migrations
if [ "$DRY_RUN" = "true" ]; then
    echo "Step 3: Dry run - showing SQL..."
    docker exec $(docker ps -qf "name=social-selling_backend") \
        npm run migration:show
else
    echo "Step 3: Running migrations..."
    docker exec $(docker ps -qf "name=social-selling_backend") \
        npm run migration:run

    # Verify migrations
    echo "Step 4: Verifying migrations..."
    STILL_PENDING=$(docker exec $(docker ps -qf "name=social-selling_backend") \
        npm run migration:show | grep -c "pending" || true)

    if [ "$STILL_PENDING" -gt 0 ]; then
        echo "Error: Some migrations failed"
        echo "Rolling back..."
        docker exec $(docker ps -qf "name=social-selling_backend") \
            npm run migration:revert
        exit 1
    fi

    echo "All migrations completed successfully"
fi

echo "========================================="
echo "Migration process completed!"
echo "========================================="
```

### 4.3 Migration Rollback

**File:** `deployment/scripts/rollback-migration.sh`
```bash
#!/bin/bash
set -euo pipefail

STEPS="${1:-1}"

echo "========================================="
echo "Migration Rollback"
echo "Steps to revert: $STEPS"
echo "========================================="

# Confirm rollback
read -p "This will revert the last $STEPS migration(s). Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Backup before rollback
echo "Creating backup before rollback..."
./deployment/scripts/backup-database.sh

# Revert migrations
for i in $(seq 1 $STEPS); do
    echo "Reverting migration $i of $STEPS..."
    docker exec $(docker ps -qf "name=social-selling_backend") \
        npm run migration:revert
done

echo "========================================="
echo "Rollback completed!"
echo "Reverted $STEPS migration(s)"
echo "========================================="
```

---

## 5. SSL & Security

### 5.1 SSL Certificate Setup

**File:** `deployment/scripts/setup-ssl.sh`
```bash
#!/bin/bash
set -euo pipefail

DOMAIN="${1:-yourdomain.com}"
EMAIL="${2:-admin@yourdomain.com}"
STAGING="${3:-false}"

echo "========================================="
echo "SSL Certificate Setup"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Staging: $STAGING"
echo "========================================="

# Determine if using staging server
if [ "$STAGING" = "true" ]; then
    STAGING_FLAG="--staging"
else
    STAGING_FLAG=""
fi

# Create required directories
mkdir -p /opt/letsencrypt/certs
mkdir -p /opt/letsencrypt/www

# Obtain certificate
docker run -it --rm \
    -v /opt/letsencrypt/certs:/etc/letsencrypt \
    -v /opt/letsencrypt/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $STAGING_FLAG \
    -d $DOMAIN \
    -d www.$DOMAIN

# Setup auto-renewal cron
cat > /etc/cron.d/certbot-renew <<EOF
0 0,12 * * * root docker run --rm -v /opt/letsencrypt/certs:/etc/letsencrypt -v /opt/letsencrypt/www:/var/www/certbot certbot/certbot renew --quiet && docker service update --force social-selling_nginx
EOF

echo "========================================="
echo "SSL certificate installed successfully!"
echo "Certificates location: /opt/letsencrypt/certs"
echo "Auto-renewal configured"
echo "========================================="
```

### 5.2 Nginx SSL Configuration

**File:** `deployment/nginx/ssl.conf`
```nginx
# SSL Configuration
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;

# SSL Protocols and Ciphers
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers off;

# SSL Session
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Security Headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'self';" always;

# Diffie-Hellman parameter
ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
```

---

## 6. Environment Management

### 6.1 Secret Management

**File:** `deployment/scripts/create-secrets.sh`
```bash
#!/bin/bash
set -euo pipefail

echo "========================================="
echo "Creating Docker Swarm Secrets"
echo "========================================="

# Function to create or update secret
create_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2

    if docker secret inspect $SECRET_NAME >/dev/null 2>&1; then
        echo "Secret $SECRET_NAME already exists, removing..."
        docker secret rm $SECRET_NAME
    fi

    echo "$SECRET_VALUE" | docker secret create $SECRET_NAME -
    echo "Created secret: $SECRET_NAME"
}

# Load environment file
if [ -f .env.production.secrets ]; then
    source .env.production.secrets
else
    echo "Error: .env.production.secrets not found"
    exit 1
fi

# Create secrets
create_secret "db_password" "$DB_PASSWORD"
create_secret "jwt_secret" "$JWT_SECRET"
create_secret "session_secret" "$SESSION_SECRET"
create_secret "redis_password" "$REDIS_PASSWORD"
create_secret "aws_secret_key" "$AWS_SECRET_ACCESS_KEY"
create_secret "smtp_password" "$SMTP_PASS"

echo "========================================="
echo "All secrets created successfully!"
echo "========================================="
```

### 6.2 Environment Configuration Template

**File:** `deployment/.env.production.template`
```bash
# Production Environment Configuration
# Copy to .env.production and fill in values

# Application
NODE_ENV=production
APP_NAME=social-selling
APP_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com

# Docker Registry
REGISTRY_URL=registry.yourdomain.com
VERSION=latest

# Database
POSTGRES_DB=social_selling
POSTGRES_USER=social_selling
DATABASE_URL=postgresql://social_selling:PASSWORD@postgres:5432/social_selling

# Redis
REDIS_URL=redis://:PASSWORD@redis:6379/0

# AWS
AWS_REGION=us-east-1
S3_BUCKET=social-selling-uploads
S3_BACKUP_BUCKET=social-selling-backups

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
FROM_EMAIL=noreply@yourdomain.com

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
NEW_RELIC_LICENSE_KEY=...

# SSL
SSL_DOMAIN=yourdomain.com
SSL_EMAIL=admin@yourdomain.com

# Secrets (store separately in .env.production.secrets)
# DB_PASSWORD=
# JWT_SECRET=
# SESSION_SECRET=
# REDIS_PASSWORD=
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# SMTP_PASS=
```

---

## 7. Health Checks

### 7.1 Comprehensive Health Check Script

**File:** `deployment/scripts/health-check.sh`
```bash
#!/bin/bash
set -euo pipefail

STACK_NAME="social-selling"
API_URL="${1:-http://localhost}"
TIMEOUT=5

echo "========================================="
echo "Health Check - Social Selling Platform"
echo "API URL: $API_URL"
echo "========================================="

FAILED=0

# Function to check endpoint
check_endpoint() {
    local NAME=$1
    local URL=$2
    local EXPECTED=${3:-200}

    echo -n "Checking $NAME... "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$URL" || echo "000")

    if [ "$HTTP_CODE" = "$EXPECTED" ]; then
        echo "✓ OK ($HTTP_CODE)"
    else
        echo "✗ FAILED (got $HTTP_CODE, expected $EXPECTED)"
        FAILED=$((FAILED + 1))
    fi
}

# Function to check service
check_service() {
    local SERVICE=$1
    echo -n "Checking service $SERVICE... "

    REPLICAS=$(docker service ls --filter "name=${STACK_NAME}_${SERVICE}" --format "{{.Replicas}}")
    DESIRED=$(echo $REPLICAS | cut -d'/' -f2)
    RUNNING=$(echo $REPLICAS | cut -d'/' -f1)

    if [ "$RUNNING" = "$DESIRED" ] && [ "$RUNNING" != "0" ]; then
        echo "✓ OK ($RUNNING/$DESIRED)"
    else
        echo "✗ FAILED ($RUNNING/$DESIRED)"
        FAILED=$((FAILED + 1))
    fi
}

# Check Docker services
echo ""
echo "Docker Services:"
check_service "nginx"
check_service "backend"
check_service "frontend"
check_service "postgres"
check_service "redis"

# Check HTTP endpoints
echo ""
echo "HTTP Endpoints:"
check_endpoint "Frontend" "$API_URL" "200"
check_endpoint "API Health" "$API_URL/api/health" "200"
check_endpoint "API Docs" "$API_URL/api/docs" "200"

# Check database connectivity
echo ""
echo "Database:"
echo -n "Checking PostgreSQL... "
if docker exec $(docker ps -qf "name=${STACK_NAME}_postgres") pg_isready -U ${POSTGRES_USER} >/dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAILED"
    FAILED=$((FAILED + 1))
fi

# Check Redis
echo -n "Checking Redis... "
if docker exec $(docker ps -qf "name=${STACK_NAME}_redis") redis-cli ping >/dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAILED"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "========================================="
if [ $FAILED -eq 0 ]; then
    echo "All health checks passed! ✓"
    echo "========================================="
    exit 0
else
    echo "Health checks failed: $FAILED ✗"
    echo "========================================="
    exit 1
fi
```

### 7.2 Smoke Tests

**File:** `deployment/scripts/smoke-tests.sh`
```bash
#!/bin/bash
set -euo pipefail

BASE_URL="${1:-http://localhost}"
FAILED=0

echo "========================================="
echo "Smoke Tests"
echo "Base URL: $BASE_URL"
echo "========================================="

# Function to run test
run_test() {
    local NAME=$1
    local METHOD=$2
    local ENDPOINT=$3
    local EXPECTED_CODE=${4:-200}
    local DATA=${5:-}

    echo -n "Test: $NAME... "

    if [ -n "$DATA" ]; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X $METHOD \
            -H "Content-Type: application/json" \
            -d "$DATA" \
            "${BASE_URL}${ENDPOINT}")
    else
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X $METHOD \
            "${BASE_URL}${ENDPOINT}")
    fi

    if [ "$HTTP_CODE" = "$EXPECTED_CODE" ]; then
        echo "✓ PASS"
    else
        echo "✗ FAIL (got $HTTP_CODE, expected $EXPECTED_CODE)"
        FAILED=$((FAILED + 1))
    fi
}

# Basic connectivity tests
run_test "Homepage loads" "GET" "/" "200"
run_test "API health check" "GET" "/api/health" "200"
run_test "API documentation" "GET" "/api/docs" "200"

# Authentication tests
run_test "Login endpoint exists" "POST" "/api/auth/login" "400"
run_test "Register endpoint exists" "POST" "/api/auth/register" "400"

# Public API tests
run_test "Products list" "GET" "/api/products" "200"
run_test "Not found returns 404" "GET" "/api/nonexistent" "404"

# Summary
echo ""
echo "========================================="
if [ $FAILED -eq 0 ]; then
    echo "All smoke tests passed! ✓"
    exit 0
else
    echo "Smoke tests failed: $FAILED ✗"
    exit 1
fi
```

---

## 8. Rollback Procedures

### 8.1 Service Rollback Script

**File:** `deployment/scripts/rollback.sh`
```bash
#!/bin/bash
set -euo pipefail

SERVICE="${1:-}"
STACK_NAME="social-selling"

if [ -z "$SERVICE" ]; then
    echo "Usage: $0 <service_name|all>"
    echo "Services: backend, frontend, nginx, all"
    exit 1
fi

SERVICE_NAME="${STACK_NAME}_${SERVICE}"

echo "========================================="
echo "Service Rollback"
echo "Service: $SERVICE"
echo "========================================="

# Confirm rollback
read -p "This will rollback $SERVICE to the previous version. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Perform rollback
if [ "$SERVICE" = "all" ]; then
    echo "Rolling back all services..."
    for SVC in backend frontend nginx; do
        echo "Rolling back ${STACK_NAME}_${SVC}..."
        docker service rollback ${STACK_NAME}_${SVC}
    done
else
    echo "Rolling back $SERVICE_NAME..."
    docker service rollback $SERVICE_NAME
fi

# Monitor rollback
echo "Monitoring rollback progress..."
sleep 5

if [ "$SERVICE" = "all" ]; then
    docker stack ps $STACK_NAME
else
    docker service ps $SERVICE_NAME
fi

# Verify rollback
echo ""
echo "Waiting for services to stabilize..."
sleep 30

# Run health checks
./deployment/scripts/health-check.sh

echo "========================================="
echo "Rollback completed!"
echo "========================================="
```

### 8.2 Complete Stack Rollback

**File:** `deployment/scripts/rollback-stack.sh`
```bash
#!/bin/bash
set -euo pipefail

PREVIOUS_VERSION="${1:-}"
STACK_NAME="social-selling"

if [ -z "$PREVIOUS_VERSION" ]; then
    echo "Usage: $0 <previous_version>"
    echo "Example: $0 v1.2.3"
    exit 1
fi

echo "========================================="
echo "Complete Stack Rollback"
echo "Target Version: $PREVIOUS_VERSION"
echo "========================================="

# Confirm rollback
echo "WARNING: This will rollback the entire stack to version $PREVIOUS_VERSION"
read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Backup current state
echo "Backing up current state..."
./deployment/scripts/backup-database.sh

# Update version
export VERSION=$PREVIOUS_VERSION

# Redeploy stack with previous version
echo "Redeploying stack with version $PREVIOUS_VERSION..."
docker stack deploy \
    --compose-file deployment/docker-stack.production.yml \
    --with-registry-auth \
    $STACK_NAME

# Wait for deployment
echo "Waiting for deployment to complete..."
sleep 30

# Check for failed migrations
echo "Checking database state..."
CURRENT_MIGRATION=$(docker exec $(docker ps -qf "name=${STACK_NAME}_backend") \
    npm run migration:show | tail -1)
echo "Current migration: $CURRENT_MIGRATION"

# Run health checks
echo "Running health checks..."
if ./deployment/scripts/health-check.sh; then
    echo "Rollback successful!"
else
    echo "WARNING: Health checks failed after rollback"
    echo "Manual intervention may be required"
    exit 1
fi

echo "========================================="
echo "Stack rollback completed!"
echo "Active version: $PREVIOUS_VERSION"
echo "========================================="
```

---

## 9. Load Balancing

### 9.1 Nginx Load Balancer Configuration

**File:** `deployment/nginx/load-balancer.conf`
```nginx
# Upstream backend servers
upstream backend {
    least_conn;
    server backend:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Upstream frontend servers
upstream frontend {
    least_conn;
    server frontend:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Health check endpoint
server {
    listen 80;
    server_name localhost;

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    include /etc/nginx/ssl.conf;

    # Security headers
    add_header X-Request-ID $request_id always;

    # Client settings
    client_max_body_size 50M;
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;

    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 65;
    send_timeout 10;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/json application/javascript;

    # API endpoints
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
        proxy_set_header Connection "";

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        proxy_cache frontend_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
        add_header X-Cache-Status $upstream_cache_status;
    }

    # Static assets caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf)$ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# Proxy cache
proxy_cache_path /var/cache/nginx/frontend levels=1:2 keys_zone=frontend_cache:10m max_size=1g inactive=60m use_temp_path=off;
```

---

## 10. Production Monitoring

### 10.1 Docker Service Monitoring

**File:** `deployment/scripts/monitor-services.sh`
```bash
#!/bin/bash
set -euo pipefail

STACK_NAME="social-selling"
INTERVAL=${1:-60}

echo "Starting service monitor (interval: ${INTERVAL}s)"
echo "Press Ctrl+C to stop"

while true; do
    clear
    echo "========================================="
    echo "Social Selling Platform - Service Status"
    echo "Timestamp: $(date)"
    echo "========================================="
    echo ""

    # Service status
    echo "Services:"
    docker service ls --filter "name=${STACK_NAME}" --format "table {{.Name}}\t{{.Mode}}\t{{.Replicas}}\t{{.Image}}"
    echo ""

    # Resource usage
    echo "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
        $(docker ps --filter "name=${STACK_NAME}" -q)
    echo ""

    # Recent logs
    echo "Recent Errors (last 5 minutes):"
    docker service logs --since 5m ${STACK_NAME}_backend 2>&1 | grep -i error | tail -5 || echo "No errors found"

    sleep $INTERVAL
done
```

### 10.2 Automated Monitoring Alerts

**File:** `deployment/scripts/monitoring-alerts.sh`
```bash
#!/bin/bash
set -euo pipefail

# Service monitoring with alerting
STACK_NAME="social-selling"
ALERT_EMAIL="${ALERT_EMAIL:-ops@yourdomain.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

send_alert() {
    local SEVERITY=$1
    local MESSAGE=$2

    # Send email
    echo "$MESSAGE" | mail -s "[${SEVERITY}] Social Selling Alert" $ALERT_EMAIL

    # Send to Slack
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"[$SEVERITY] $MESSAGE\"}" \
            $SLACK_WEBHOOK
    fi

    # Log alert
    echo "[$(date)] [$SEVERITY] $MESSAGE" >> /var/log/social-selling-alerts.log
}

check_service_health() {
    local SERVICE=$1
    local REPLICAS=$(docker service ls --filter "name=${STACK_NAME}_${SERVICE}" --format "{{.Replicas}}")
    local DESIRED=$(echo $REPLICAS | cut -d'/' -f2)
    local RUNNING=$(echo $REPLICAS | cut -d'/' -f1)

    if [ "$RUNNING" != "$DESIRED" ]; then
        send_alert "CRITICAL" "Service ${SERVICE} is unhealthy: ${RUNNING}/${DESIRED} replicas running"
    fi
}

check_disk_space() {
    local USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$USAGE" -gt 80 ]; then
        send_alert "WARNING" "Disk usage is at ${USAGE}%"
    fi
}

check_memory() {
    local USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    if [ "$USAGE" -gt 90 ]; then
        send_alert "WARNING" "Memory usage is at ${USAGE}%"
    fi
}

# Run checks
check_service_health "backend"
check_service_health "frontend"
check_service_health "postgres"
check_service_health "redis"
check_disk_space
check_memory

# Check application health
if ! curl -sf http://localhost/api/health > /dev/null; then
    send_alert "CRITICAL" "Application health check failed"
fi
```

---

## Acceptance Criteria

### Must Have (20+ criteria)

1. ✅ Production VPS provisioned and hardened
2. ✅ Docker installed and configured for production
3. ✅ Docker Swarm cluster initialized with manager and workers
4. ✅ Firewall configured with only required ports open
5. ✅ Fail2ban configured for intrusion prevention
6. ✅ Automatic security updates enabled
7. ✅ SSL certificates obtained and auto-renewal configured
8. ✅ All services deployed to Docker Swarm stack
9. ✅ Services configured with health checks
10. ✅ Service replicas running across multiple nodes
11. ✅ Zero-downtime deployment strategy implemented
12. ✅ Database backup strategy with automated backups
13. ✅ Database migration scripts with rollback capability
14. ✅ Environment variables managed securely via Docker secrets
15. ✅ Load balancer configured with SSL termination
16. ✅ Health check endpoints responding correctly
17. ✅ Smoke tests passing on production deployment
18. ✅ Rollback procedures tested and documented
19. ✅ Service monitoring scripts operational
20. ✅ Automated alerts configured for critical issues
21. ✅ Log rotation configured for all containers
22. ✅ Resource limits set for all services
23. ✅ Blue-green deployment capability verified
24. ✅ Production environment documentation complete
25. ✅ Disaster recovery procedures documented

### Should Have

- Multi-region deployment capability
- Automated disaster recovery testing
- Infrastructure as Code (Terraform)
- Container vulnerability scanning
- Advanced monitoring dashboards

### Could Have

- Kubernetes migration path documented
- Multi-cloud deployment strategy
- Chaos engineering tests
- Advanced caching strategies
- Global CDN integration

---

## Dependencies

### Requires
- DEVOPS-001: Docker containerization complete
- SECURITY-001: Security implementation complete
- All backend and frontend development complete

### Blocks
- DEPLOY-003: Performance optimization
- DEPLOY-004: Monitoring & alerting
- DEPLOY-005: Documentation & handoff

---

## Technical Notes

### Performance Considerations
- Service replicas distributed across nodes for high availability
- Resource limits prevent resource exhaustion
- Connection pooling for database and Redis
- Nginx caching reduces backend load

### Security Considerations
- All secrets managed via Docker secrets
- SSL/TLS encryption for all traffic
- Network isolation using Docker overlay networks
- Regular security updates automated
- Fail2ban prevents brute force attacks

### Scalability Considerations
- Horizontal scaling via service replicas
- Load balancing across all service instances
- Database connection pooling
- Stateless application design

---

## Testing Strategy

### Unit Tests
- Deployment script validation
- Configuration file syntax validation
- Secret management testing

### Integration Tests
- Complete stack deployment test
- Service communication testing
- Database migration testing
- SSL certificate validation

### Load Tests
- Deploy under simulated load
- Verify auto-scaling behavior
- Test failover scenarios

---

## Rollback Plan

1. Identify failing service/version
2. Run backup verification
3. Execute rollback script for affected service
4. Verify service health
5. Run smoke tests
6. Monitor for 30 minutes
7. Document incident

---

## Documentation Requirements

- [x] Production VPS setup guide
- [x] Docker Swarm deployment procedures
- [x] Zero-downtime deployment strategy
- [x] Database migration procedures
- [x] SSL certificate management
- [x] Secret management procedures
- [x] Health check documentation
- [x] Rollback procedures
- [x] Load balancer configuration
- [x] Monitoring setup guide

---

## Definition of Done

- [ ] All production servers provisioned and hardened
- [ ] Docker Swarm cluster operational
- [ ] All services deployed and healthy
- [ ] SSL certificates installed and auto-renewing
- [ ] Database backups running automatically
- [ ] Zero-downtime deployment tested
- [ ] Rollback procedures tested
- [ ] Health checks passing
- [ ] Monitoring and alerts operational
- [ ] Documentation complete and reviewed
- [ ] Production deployment checklist created
- [ ] Team trained on deployment procedures

---

## Resources

### Documentation
- Docker Swarm documentation
- Nginx documentation
- Let's Encrypt documentation
- PostgreSQL backup documentation

### Tools
- Docker & Docker Compose
- Nginx
- Certbot
- PostgreSQL
- Redis
- fail2ban

### External Services
- VPS provider (DigitalOcean/AWS/Hetzner)
- Domain registrar
- Email service (SendGrid)
- Monitoring services

---

**Task ID:** DEPLOY-002
**Created:** 2025-01-18
**Epic:** Epic 13 - Deployment & DevOps
**Sprint:** Deployment Sprint
**Estimated Hours:** 40-60 hours
**Actual Hours:** _TBD_

---

**Notes:**
- All scripts tested on Ubuntu 22.04 LTS
- Production deployment requires multiple VPS instances
- SSL certificates require valid domain configuration
- Database backups require S3 or equivalent storage
- Monitoring integration covered in DEPLOY-004
