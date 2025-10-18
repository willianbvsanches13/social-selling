# INFRA-003: PostgreSQL Database Initialization

**Priority:** P0 (Critical Path)
**Effort:** 4 hours
**Day:** 2
**Dependencies:** INFRA-002
**Domain:** Infrastructure & DevOps

---

## Overview

Set up PostgreSQL 15 database with initial schema, required extensions (uuid-ossp, pgcrypto, pg_trgm), migration framework using node-pg-migrate, and connection pooling configuration for optimal performance.

---

## Data Models

### Database Configuration

```yaml
# PostgreSQL Configuration
database:
  name: social_selling
  user: social_selling_user
  password: <from_env>
  host: postgres (Docker service name)
  port: 5432
  pool:
    min: 2
    max: 20
    idleTimeoutMillis: 30000
    connectionTimeoutMillis: 2000

# Extensions Required
extensions:
  - uuid-ossp          # UUID generation
  - pgcrypto           # Encryption for OAuth tokens
  - pg_trgm            # Full-text search for messages
  - pg_stat_statements # Query performance monitoring
```

### Initial Schema Tables

```sql
-- Users table (from BE-004)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  language VARCHAR(10) DEFAULT 'pt-BR',
  subscription_tier VARCHAR(50) DEFAULT 'free',
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Migration tracking table (for node-pg-migrate)
CREATE TABLE IF NOT EXISTS pgmigrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  run_on TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Implementation Approach

### Phase 1: Database Extension Setup (30 minutes)

```sql
-- File: /database/init/01-extensions.sql

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Verify extensions installed
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'pg_stat_statements');
```

### Phase 2: User and Permission Setup (20 minutes)

```sql
-- File: /database/init/02-users.sql

-- Create application database user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'social_selling_user') THEN
    CREATE USER social_selling_user WITH PASSWORD '<from_env>';
  END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE social_selling TO social_selling_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO social_selling_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO social_selling_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO social_selling_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO social_selling_user;
```

### Phase 3: Connection Pool Configuration (45 minutes)

```typescript
// File: /backend/src/infrastructure/database/database.ts

import pgPromise, { IDatabase, IMain } from 'pg-promise';
import { ConfigService } from '@nestjs/config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  private db: IDatabase<any>;
  private pgp: IMain;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    this.pgp = pgPromise({
      // Error handling
      error: (err, e) => {
        console.error('Database error:', err);
        if (e.cn) {
          console.error('Connection:', e.cn);
        }
        if (e.query) {
          console.error('Query:', e.query);
        }
      },
      // Query monitoring (development only)
      ...(process.env.NODE_ENV === 'development' && {
        query: (e) => {
          console.log('QUERY:', e.query);
        },
      }),
    });

    const config: DatabaseConfig = {
      host: this.configService.get<string>('POSTGRES_HOST'),
      port: this.configService.get<number>('POSTGRES_PORT'),
      database: this.configService.get<string>('POSTGRES_DB'),
      user: this.configService.get<string>('POSTGRES_USER'),
      password: this.configService.get<string>('POSTGRES_PASSWORD'),
      max: 20, // Maximum pool size
      min: 2,  // Minimum pool size
      idleTimeoutMillis: 30000, // 30 seconds
      connectionTimeoutMillis: 2000, // 2 seconds
    };

    this.db = this.pgp(config);

    // Test connection
    try {
      await this.db.connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.$pool.end();
      console.log('Database connection closed');
    }
  }

  // Query methods
  async query(sql: string, params?: any[]): Promise<any[]> {
    return this.db.any(sql, params);
  }

  async one<T>(sql: string, params?: any[]): Promise<T> {
    return this.db.one<T>(sql, params);
  }

  async oneOrNone<T>(sql: string, params?: any[]): Promise<T | null> {
    return this.db.oneOrNone<T>(sql, params);
  }

  async many<T>(sql: string, params?: any[]): Promise<T[]> {
    return this.db.many<T>(sql, params);
  }

  async none(sql: string, params?: any[]): Promise<null> {
    return this.db.none(sql, params);
  }

  async tx<T>(callback: (t: any) => Promise<T>): Promise<T> {
    return this.db.tx(callback);
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      await this.db.one('SELECT 1 as result');
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

### Phase 4: Migration Framework Setup (1.5 hours)

```json
// File: /backend/package.json (add scripts)

{
  "scripts": {
    "migrate": "node-pg-migrate",
    "migrate:up": "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down",
    "migrate:create": "node-pg-migrate create",
    "migrate:redo": "node-pg-migrate redo"
  },
  "devDependencies": {
    "node-pg-migrate": "^6.2.2"
  }
}
```

```javascript
// File: /backend/migrations/config.js

require('dotenv').config();

module.exports = {
  database: process.env.POSTGRES_DB || 'social_selling',
  user: process.env.POSTGRES_USER || 'social_selling_user',
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  schema: 'public',
  dir: 'migrations',
  migrationsTable: 'pgmigrations',
  count: 1,
  checkOrder: true,
  verbose: true,
};
```

```javascript
// File: /backend/migrations/1710000000001_initial-schema.js

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Enable extensions
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
  `);

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
    timezone: {
      type: 'varchar(50)',
      default: 'America/Sao_Paulo',
    },
    language: {
      type: 'varchar(10)',
      default: 'pt-BR',
    },
    subscription_tier: {
      type: 'varchar(50)',
      default: 'free',
      check: "subscription_tier IN ('free', 'basic', 'pro', 'enterprise')",
    },
    email_verified: {
      type: 'boolean',
      default: false,
    },
    email_verification_token: {
      type: 'varchar(255)',
    },
    password_reset_token: {
      type: 'varchar(255)',
    },
    password_reset_expires: {
      type: 'timestamp',
    },
    last_login_at: {
      type: 'timestamp',
    },
    last_login_ip: {
      type: 'varchar(45)',
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
    },
  });

  // Create indexes
  pgm.createIndex('users', 'email', {
    unique: true,
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('users', 'created_at');
  pgm.createIndex('users', 'last_login_at');

  // Create updated_at trigger function
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Apply trigger to users table
  pgm.createTrigger('users', 'update_users_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW',
  });
};

exports.down = (pgm) => {
  pgm.dropTrigger('users', 'update_users_updated_at', { ifExists: true });
  pgm.dropFunction('update_updated_at_column', { ifExists: true });
  pgm.dropTable('users', { ifExists: true });
  pgm.sql(`
    DROP EXTENSION IF EXISTS "pg_trgm";
    DROP EXTENSION IF EXISTS "pgcrypto";
    DROP EXTENSION IF EXISTS "uuid-ossp";
  `);
};
```

### Phase 5: Database Module Configuration (30 minutes)

```typescript
// File: /backend/src/infrastructure/database/database.module.ts

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Database } from './database';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [Database],
  exports: [Database],
})
export class DatabaseModule {}
```

```typescript
// File: /backend/src/infrastructure/database/health-check.ts

import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Database } from './database';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly database: Database) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.database.isHealthy();
    const result = this.getStatus(key, isHealthy);

    if (isHealthy) {
      return result;
    }

    throw new HealthCheckError('Database health check failed', result);
  }
}
```

---

## Files to Create

```
/backend/
├── migrations/
│   ├── config.js
│   └── 1710000000001_initial-schema.js
├── src/
│   └── infrastructure/
│       └── database/
│           ├── database.ts
│           ├── database.module.ts
│           └── health-check.ts
/database/
└── init/
    ├── 01-extensions.sql
    └── 02-users.sql
```

---

## Dependencies

**Prerequisites:**
- INFRA-002 (Docker Compose with PostgreSQL container)
- Environment variables configured (.env file)

**Blocks:**
- BE-002 (Repository Pattern Implementation)
- BE-003 (Database Migrations)
- All backend data models

---

## Acceptance Criteria

- [ ] PostgreSQL 15 container running and accessible
- [ ] Extensions installed: uuid-ossp, pgcrypto, pg_trgm, pg_stat_statements
- [ ] Application database user created with correct permissions
- [ ] Backend can connect to PostgreSQL
- [ ] Connection pool configured (min 2, max 20)
- [ ] node-pg-migrate installed and configured
- [ ] Can run `npm run migrate:up` successfully
- [ ] Can run `npm run migrate:down` successfully
- [ ] Initial migration creates users table
- [ ] updated_at trigger working on users table
- [ ] Database health check endpoint returns status
- [ ] Query logging enabled in development mode
- [ ] Can create new migrations with `npm run migrate:create`

---

## Testing Procedure

```bash
# 1. Test PostgreSQL connection
docker compose exec postgres psql -U social_selling_user -d social_selling -c "SELECT version();"

# Expected: PostgreSQL 15.x version information

# 2. Verify extensions
docker compose exec postgres psql -U social_selling_user -d social_selling -c \
  "SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm');"

# Expected: All 3 extensions listed

# 3. Test connection from backend
cd backend
npm run migrate:up

# Expected: Migration runs successfully, users table created

# 4. Verify users table created
docker compose exec postgres psql -U social_selling_user -d social_selling -c "\d users"

# Expected: Table structure with all columns

# 5. Test trigger
docker compose exec postgres psql -U social_selling_user -d social_selling -c \
  "INSERT INTO users (email, password_hash, name) VALUES ('test@test.com', 'hash', 'Test');
   UPDATE users SET name = 'Updated' WHERE email = 'test@test.com';
   SELECT updated_at > created_at as trigger_working FROM users WHERE email = 'test@test.com';"

# Expected: trigger_working = true

# 6. Test connection pool
cd backend && npm run start:dev
curl http://localhost:4000/health

# Expected: {"status":"ok","database":"up"}

# 7. Test migration rollback
npm run migrate:down

# Expected: Migration rolled back, users table dropped

# 8. Re-apply migration
npm run migrate:up

# Expected: Migration reapplied successfully
```

---

## Rollback Plan

If database initialization fails:

```bash
# 1. Stop all containers
docker compose down

# 2. Remove PostgreSQL volume (WARNING: deletes all data)
docker volume rm social-selling-2_postgres-data

# 3. Restart containers
docker compose up -d postgres

# 4. Wait for PostgreSQL to be ready
docker compose exec postgres pg_isready

# 5. Re-run initialization scripts
docker compose exec postgres psql -U postgres -d social_selling -f /docker-entrypoint-initdb.d/01-extensions.sql
docker compose exec postgres psql -U postgres -d social_selling -f /docker-entrypoint-initdb.d/02-users.sql

# 6. Test connection
docker compose exec postgres psql -U social_selling_user -d social_selling -c "SELECT 1;"
```

---

## Security Considerations

1. **Password Security:** Use strong, randomly generated password for database user
2. **Network Isolation:** PostgreSQL only accessible within Docker network
3. **Connection Encryption:** Use SSL/TLS for production connections
4. **Least Privilege:** Application user has minimum required permissions
5. **Query Logging:** Sanitize logs to prevent password/sensitive data exposure
6. **Extension Security:** Only install necessary extensions
7. **Backup Encryption:** Encrypt backup files before storage
8. **Access Control:** Limit database access to application only

---

## Performance Considerations

1. **Connection Pooling:** Max 20 connections prevents resource exhaustion
2. **Idle Timeout:** 30 seconds prevents stale connections
3. **Prepared Statements:** Use parameterized queries for better performance
4. **Indexes:** Strategic indexes on frequently queried columns
5. **Vacuum:** Regular vacuum operations for optimal performance
6. **Query Monitoring:** pg_stat_statements for slow query analysis

---

## Cost Estimate

- **PostgreSQL (Docker Image):** Free
- **Storage:** Included in VPS disk (estimate 5-10GB for MVP)
- **Backup Storage:** $0-5/month (depending on backup service)
- **Time Investment:** 4 hours
- **Total Additional Cost:** $0-5/month

---

## Related Documents

- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Implementation Plan: `/tasks/social-selling/implementation-plan.md`
- Previous Task: INFRA-002 (Docker Compose Stack)
- Next Tasks: BE-002 (Repository Pattern), BE-003 (Migrations)

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
