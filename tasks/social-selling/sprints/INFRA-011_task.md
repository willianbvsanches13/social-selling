# INFRA-011: Backup and Disaster Recovery Setup

**Priority:** P1 (High)
**Effort:** 4 hours
**Day:** 14
**Dependencies:** INFRA-003, INFRA-005
**Domain:** Infrastructure & DevOps

---

## Overview

Set up automated daily backups for PostgreSQL database, MinIO object storage, and configuration files with offsite storage and tested recovery procedures.

---

## Implementation

### PostgreSQL Backup Script

```bash
#!/bin/bash
# File: /infrastructure/scripts/backup-postgres.sh

set -e

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/postgres_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
docker compose exec -T postgres pg_dump -U social_selling_user social_selling | gzip > $BACKUP_FILE

# Upload to remote storage (Backblaze B2)
rclone copy $BACKUP_FILE b2:social-selling-backups/postgres/

# Keep only last 7 days locally
find $BACKUP_DIR -name "postgres_*.sql.gz" -mtime +7 -delete

echo "PostgreSQL backup completed: $BACKUP_FILE"
```

### MinIO Backup Script

```bash
#!/bin/bash
# File: /infrastructure/scripts/backup-minio.sh

set -e

BACKUP_DIR="/backups/minio"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/minio_$DATE.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MinIO data
docker compose exec -T minio tar czf - /data | cat > $BACKUP_FILE

# Upload to remote storage
rclone copy $BACKUP_FILE b2:social-selling-backups/minio/

# Keep only last 7 days locally
find $BACKUP_DIR -name "minio_*.tar.gz" -mtime +7 -delete

echo "MinIO backup completed: $BACKUP_FILE"
```

### Restoration Scripts

```bash
#!/bin/bash
# File: /infrastructure/scripts/restore-postgres.sh

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# Stop backend to prevent writes
docker compose stop backend

# Drop and recreate database
docker compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS social_selling;"
docker compose exec postgres psql -U postgres -c "CREATE DATABASE social_selling;"

# Restore from backup
gunzip -c $BACKUP_FILE | docker compose exec -T postgres psql -U social_selling_user social_selling

# Start backend
docker compose start backend

echo "PostgreSQL restore completed"
```

### Cron Jobs

```bash
# File: /etc/cron.d/social-selling-backups

# PostgreSQL backup daily at 2 AM
0 2 * * * /infrastructure/scripts/backup-postgres.sh >> /var/log/backup-postgres.log 2>&1

# MinIO backup daily at 3 AM
0 3 * * * /infrastructure/scripts/backup-minio.sh >> /var/log/backup-minio.log 2>&1
```

---

## Disaster Recovery Procedures

### Full System Recovery

1. **Provision new VPS** (same specs)
2. **Install Docker and Docker Compose**
3. **Clone repository**
4. **Restore environment variables**
5. **Download latest backups from B2**
6. **Restore PostgreSQL:** `./restore-postgres.sh postgres_latest.sql.gz`
7. **Restore MinIO:** `./restore-minio.sh minio_latest.tar.gz`
8. **Start services:** `docker compose up -d`
9. **Verify health:** `curl http://localhost/health`

---

## Acceptance Criteria

- [ ] Daily PostgreSQL backups running
- [ ] Daily MinIO backups running
- [ ] Backups uploaded to B2
- [ ] Restoration script tested
- [ ] 7-day local, 30-day remote retention
- [ ] Recovery procedures documented

---

## Testing

```bash
# Test PostgreSQL backup
./infrastructure/scripts/backup-postgres.sh

# Test restoration
./infrastructure/scripts/restore-postgres.sh /backups/postgres/postgres_20251018_020000.sql.gz

# Verify restoration
docker compose exec postgres psql -U social_selling_user -d social_selling -c "SELECT COUNT(*) FROM users;"
```

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
