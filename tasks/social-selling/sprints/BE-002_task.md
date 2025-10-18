# BE-002: Database Schema & Migrations

**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 3
**Dependencies:** INFRA-003 (PostgreSQL Setup)
**Domain:** Backend Core

---

## Overview

Design and implement complete PostgreSQL database schema for the Social Selling platform. Create migration system using node-pg-migrate to manage schema changes. Include all tables for users, client accounts, products, messages, analytics, and content management.

---

## Database Schema

### Complete ERD

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   users     │────<│ client_accounts  │────<│  oauth_tokens   │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                     │
       │                     │
       ▼                     ▼
┌─────────────┐     ┌──────────────────┐
│  products   │     │    messages      │
└─────────────┘     └──────────────────┘
       │                     │
       │                     │
       ▼                     ▼
┌─────────────┐     ┌──────────────────┐
│product_links│     │ message_products │
└─────────────┘     └──────────────────┘
       │                     │
       │                     │
       ▼                     ▼
┌─────────────┐     ┌──────────────────┐
│ analytics   │     │   conversations  │
└─────────────┘     └──────────────────┘
```

### Table Definitions

#### 1. Users Table

```sql
-- File: /backend/migrations/001-create-users-table.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  deleted_at TIMESTAMP,
  CONSTRAINT chk_subscription_tier CHECK (
    subscription_tier IN ('free', 'basic', 'pro', 'enterprise')
  )
);

CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE UNIQUE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;
```

#### 2. Client Accounts Table

```sql
-- File: /backend/migrations/002-create-client-accounts.sql

CREATE TABLE client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_account_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  profile_picture_url TEXT,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  CONSTRAINT chk_platform CHECK (platform IN ('instagram', 'whatsapp')),
  CONSTRAINT chk_status CHECK (status IN ('active', 'token_expired', 'token_revoked', 'disconnected', 'error'))
);

CREATE UNIQUE INDEX idx_client_accounts_platform_account
  ON client_accounts(platform, platform_account_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_client_accounts_user_id ON client_accounts(user_id);
CREATE INDEX idx_client_accounts_status ON client_accounts(status);
CREATE INDEX idx_client_accounts_last_sync ON client_accounts(last_sync_at);
```

#### 3. OAuth Tokens Table

```sql
-- File: /backend/migrations/003-create-oauth-tokens.sql

CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted with pgcrypto
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP NOT NULL,
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  CONSTRAINT chk_oauth_platform CHECK (platform IN ('instagram', 'whatsapp'))
);

CREATE UNIQUE INDEX idx_oauth_tokens_client_account
  ON oauth_tokens(client_account_id)
  WHERE revoked_at IS NULL;
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_expires_at ON oauth_tokens(expires_at) WHERE revoked_at IS NULL;
```

#### 4. Products Table

```sql
-- File: /backend/migrations/004-create-products.sql

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'BRL',
  category VARCHAR(100),
  tags TEXT[],
  images JSONB DEFAULT '[]', -- Array of image URLs
  stock_quantity INTEGER,
  sku VARCHAR(100),
  is_available BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_name_search ON products USING GIN(to_tsvector('portuguese', name));
```

#### 5. Product Links Table

```sql
-- File: /backend/migrations/005-create-product-links.sql

CREATE TABLE product_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  instagram_media_id VARCHAR(255), -- Associated Instagram post ID
  short_link VARCHAR(255) UNIQUE, -- Generated short link
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_links_product_id ON product_links(product_id);
CREATE INDEX idx_product_links_client_account ON product_links(client_account_id);
CREATE INDEX idx_product_links_instagram_media ON product_links(instagram_media_id);
CREATE UNIQUE INDEX idx_product_links_short_link ON product_links(short_link);
```

#### 6. Conversations Table

```sql
-- File: /backend/migrations/006-create-conversations.sql

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  platform_conversation_id VARCHAR(255) NOT NULL,
  participant_platform_id VARCHAR(255) NOT NULL, -- Instagram user ID
  participant_username VARCHAR(255),
  participant_profile_pic TEXT,
  last_message_at TIMESTAMP,
  unread_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'open',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_conversation_status CHECK (status IN ('open', 'closed', 'archived'))
);

CREATE UNIQUE INDEX idx_conversations_platform
  ON conversations(client_account_id, platform_conversation_id);
CREATE INDEX idx_conversations_client_account ON conversations(client_account_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
```

#### 7. Messages Table

```sql
-- File: /backend/migrations/007-create-messages.sql

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  platform_message_id VARCHAR(255) NOT NULL UNIQUE,
  sender_type VARCHAR(50) NOT NULL, -- 'user' or 'customer'
  sender_platform_id VARCHAR(255),
  message_type VARCHAR(50) DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  media_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP NOT NULL,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_sender_type CHECK (sender_type IN ('user', 'customer')),
  CONSTRAINT chk_message_type CHECK (message_type IN ('text', 'image', 'video', 'audio', 'story_mention', 'story_reply'))
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE UNIQUE INDEX idx_messages_platform_id ON messages(platform_message_id);
```

#### 8. Message Products Table (Join Table)

```sql
-- File: /backend/migrations/008-create-message-products.sql

CREATE TABLE message_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_message_product UNIQUE (message_id, product_id)
);

CREATE INDEX idx_message_products_message ON message_products(message_id);
CREATE INDEX idx_message_products_product ON message_products(product_id);
```

#### 9. Analytics Table

```sql
-- File: /backend/migrations/009-create-analytics.sql

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_account_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL, -- 'engagement', 'sales', 'message', 'content'
  entity_type VARCHAR(50), -- 'product', 'message', 'conversation', 'post'
  entity_id UUID,
  value DECIMAL(10, 2),
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_client_account ON analytics_events(client_account_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_occurred_at ON analytics_events(occurred_at DESC);
CREATE INDEX idx_analytics_entity ON analytics_events(entity_type, entity_id);

-- Materialized view for daily aggregations
CREATE MATERIALIZED VIEW analytics_daily_summary AS
SELECT
  user_id,
  client_account_id,
  DATE(occurred_at) as date,
  event_category,
  event_type,
  COUNT(*) as event_count,
  SUM(value) as total_value,
  AVG(value) as avg_value
FROM analytics_events
GROUP BY user_id, client_account_id, DATE(occurred_at), event_category, event_type;

CREATE UNIQUE INDEX idx_analytics_daily_unique
  ON analytics_daily_summary(user_id, client_account_id, date, event_category, event_type);
CREATE INDEX idx_analytics_daily_date ON analytics_daily_summary(date DESC);
```

#### 10. Content Cache Table (Instagram Media)

```sql
-- File: /backend/migrations/010-create-content-cache.sql

CREATE TABLE instagram_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  platform_media_id VARCHAR(255) NOT NULL UNIQUE,
  media_type VARCHAR(50) NOT NULL,
  media_url TEXT,
  thumbnail_url TEXT,
  permalink TEXT,
  caption TEXT,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  timestamp TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_media_type CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'))
);

CREATE INDEX idx_instagram_media_client_account ON instagram_media(client_account_id);
CREATE UNIQUE INDEX idx_instagram_media_platform_id ON instagram_media(platform_media_id);
CREATE INDEX idx_instagram_media_timestamp ON instagram_media(timestamp DESC);
```

#### 11. Notifications Table

```sql
-- File: /backend/migrations/011-create-notifications.sql

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

---

## Database Functions and Triggers

```sql
-- File: /backend/migrations/012-create-functions-triggers.sql

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_accounts_updated_at
  BEFORE UPDATE ON client_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_links_updated_at
  BEFORE UPDATE ON product_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment unread count
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'customer' AND NEW.is_read = FALSE THEN
    UPDATE conversations
    SET unread_count = unread_count + 1,
        last_message_at = NEW.sent_at
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_increment_unread
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION increment_unread_count();

-- Function to decrement unread count
CREATE OR REPLACE FUNCTION decrement_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
    UPDATE conversations
    SET unread_count = GREATEST(unread_count - 1, 0)
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_decrement_unread
  AFTER UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION decrement_unread_count();

-- Function to refresh analytics materialized view
CREATE OR REPLACE FUNCTION refresh_analytics_daily_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;
END;
$$ LANGUAGE plpgsql;
```

---

## Migration System Implementation

### TypeScript Migration Runner

```typescript
// File: /backend/src/infrastructure/database/migrations/migration-runner.ts

import * as fs from 'fs';
import * as path from 'path';
import { Database } from '../database';

interface Migration {
  id: number;
  name: string;
  file: string;
  executedAt: Date;
}

export class MigrationRunner {
  private readonly migrationsDir: string;

  constructor(
    private readonly db: Database,
  ) {
    this.migrationsDir = path.join(__dirname, '../../../../migrations');
  }

  async initialize(): Promise<void> {
    // Create migrations table if it doesn't exist
    await this.db.none(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        file VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  async run(): Promise<void> {
    await this.initialize();

    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} migrations...`);

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    console.log('All migrations completed successfully');
  }

  async rollback(steps: number = 1): Promise<void> {
    const executedMigrations = await this.db.many<Migration>(
      'SELECT * FROM migrations ORDER BY id DESC LIMIT $1',
      [steps]
    );

    for (const migration of executedMigrations) {
      await this.rollbackMigration(migration);
    }
  }

  private async getPendingMigrations(): Promise<string[]> {
    const allFiles = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const executedMigrations = await this.db.manyOrNone<Migration>(
      'SELECT * FROM migrations ORDER BY id ASC'
    );

    const executedNames = new Set(executedMigrations.map(m => m.name));

    return allFiles.filter(file => !executedNames.has(file));
  }

  private async executeMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`Executing migration: ${filename}`);

    await this.db.tx(async t => {
      await t.none(sql);
      await t.none(
        'INSERT INTO migrations (name, file) VALUES ($1, $2)',
        [filename, filename]
      );
    });

    console.log(`Migration completed: ${filename}`);
  }

  private async rollbackMigration(migration: Migration): Promise<void> {
    console.log(`Rolling back migration: ${migration.name}`);

    const filePath = path.join(this.migrationsDir, migration.file);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${migration.file}`);
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    // Extract rollback section (-- ROLLBACK to end of file)
    const rollbackMatch = sql.match(/-- ROLLBACK\n([\s\S]*)/);
    if (!rollbackMatch) {
      throw new Error(`No rollback section found in ${migration.file}`);
    }

    const rollbackSql = rollbackMatch[1];

    await this.db.tx(async t => {
      await t.none(rollbackSql);
      await t.none('DELETE FROM migrations WHERE id = $1', [migration.id]);
    });

    console.log(`Rollback completed: ${migration.name}`);
  }
}
```

### Migration CLI

```typescript
// File: /backend/src/cli/migrate.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MigrationRunner } from '../infrastructure/database/migrations/migration-runner';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationRunner = app.get(MigrationRunner);

  const command = process.argv[2];

  switch (command) {
    case 'up':
      await migrationRunner.run();
      break;
    case 'down':
      const steps = parseInt(process.argv[3] || '1');
      await migrationRunner.rollback(steps);
      break;
    default:
      console.log('Usage: npm run migrate [up|down] [steps]');
      process.exit(1);
  }

  await app.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

---

## Seed Data

```sql
-- File: /backend/migrations/seed-dev-data.sql

-- Development seed data (DO NOT run in production)

-- Insert test user
INSERT INTO users (email, password_hash, name, email_verified)
VALUES (
  'demo@socialselling.com',
  '$2b$12$KIXxJ8F9xQZYh5YvZ5YvZ5YvZ5YvZ5YvZ5YvZ5YvZ5YvZ5YvZ5Yv', -- password: Demo123!
  'Demo User',
  true
) ON CONFLICT (email) DO NOTHING;

-- Insert test products
INSERT INTO products (user_id, name, description, price, currency, category, is_available)
SELECT
  u.id,
  'Product ' || generate_series,
  'Description for product ' || generate_series,
  (random() * 500 + 50)::DECIMAL(10,2),
  'BRL',
  (ARRAY['Electronics', 'Fashion', 'Beauty', 'Food'])[floor(random() * 4 + 1)],
  true
FROM users u, generate_series(1, 20)
WHERE u.email = 'demo@socialselling.com';
```

---

## Database Indexes Strategy

### Performance Optimization

```sql
-- File: /backend/migrations/013-performance-indexes.sql

-- Composite indexes for common queries

-- Users + Client Accounts join
CREATE INDEX idx_client_accounts_user_platform
  ON client_accounts(user_id, platform)
  WHERE deleted_at IS NULL;

-- Messages with conversation and timestamp (for pagination)
CREATE INDEX idx_messages_conversation_sent
  ON messages(conversation_id, sent_at DESC);

-- Products with user and availability (for listing)
CREATE INDEX idx_products_user_available
  ON products(user_id, is_available, created_at DESC)
  WHERE deleted_at IS NULL;

-- Analytics events for dashboard queries
CREATE INDEX idx_analytics_user_date_category
  ON analytics_events(user_id, occurred_at DESC, event_category);

-- Product links for tracking
CREATE INDEX idx_product_links_product_clicks
  ON product_links(product_id, clicks DESC);

-- Partial indexes for active records only
CREATE INDEX idx_conversations_active
  ON conversations(client_account_id, status, last_message_at DESC)
  WHERE status = 'open';

-- GIN indexes for full-text search
CREATE INDEX idx_products_description_search
  ON products USING GIN(to_tsvector('portuguese', description));

CREATE INDEX idx_messages_content_search
  ON messages USING GIN(to_tsvector('portuguese', content))
  WHERE message_type = 'text';
```

---

## Acceptance Criteria

- [ ] All tables created with proper constraints
- [ ] Foreign key relationships established correctly
- [ ] Indexes created for optimal query performance
- [ ] Triggers working for updated_at columns
- [ ] Cascade deletes configured appropriately
- [ ] Unique constraints preventing duplicates
- [ ] Check constraints validating data integrity
- [ ] JSONB columns for flexible metadata storage
- [ ] Migration system runs migrations in order
- [ ] Migration rollback functionality works
- [ ] Seed data script creates test data
- [ ] All columns use appropriate data types
- [ ] Timestamps stored in UTC
- [ ] Soft delete implemented with deleted_at
- [ ] Full-text search indexes for relevant columns
- [ ] Materialized views for analytics aggregations
- [ ] Database functions for common operations

---

## Testing Procedure

```bash
# 1. Run all migrations
npm run migrate up

# 2. Verify all tables created
psql -d social_selling -c "\dt"

# Expected: All 12 tables listed

# 3. Check indexes
psql -d social_selling -c "\di"

# Expected: All indexes created

# 4. Test foreign key constraints
psql -d social_selling -c "
  INSERT INTO client_accounts (user_id, platform, platform_account_id, username)
  VALUES ('00000000-0000-0000-0000-000000000000', 'instagram', '123', 'test');
"

# Expected: ERROR - foreign key constraint violation

# 5. Test triggers
psql -d social_selling -c "
  INSERT INTO users (email, password_hash, name) VALUES ('test@example.com', 'hash', 'Test');
  SELECT created_at, updated_at FROM users WHERE email = 'test@example.com';
"

# Expected: created_at = updated_at

# 6. Update and check trigger
psql -d social_selling -c "
  UPDATE users SET name = 'Updated' WHERE email = 'test@example.com';
  SELECT created_at, updated_at FROM users WHERE email = 'test@example.com';
"

# Expected: updated_at > created_at

# 7. Test rollback
npm run migrate down 1

# Expected: Last migration rolled back

# 8. Re-run migrations
npm run migrate up

# Expected: Migration re-applied successfully

# 9. Load seed data
psql -d social_selling -f backend/migrations/seed-dev-data.sql

# Expected: Test data created

# 10. Verify seed data
psql -d social_selling -c "SELECT COUNT(*) FROM products;"

# Expected: 20 products
```

---

## Performance Considerations

1. **Indexing Strategy:** Create indexes on all foreign keys and frequently queried columns
2. **Partitioning:** Consider partitioning analytics_events by date for large datasets
3. **Materialized Views:** Use for complex aggregations that don't need real-time data
4. **Connection Pooling:** Configure pg-pool with appropriate pool size
5. **Query Optimization:** Use EXPLAIN ANALYZE to identify slow queries
6. **Vacuum Strategy:** Configure auto-vacuum for optimal performance
7. **Archive Strategy:** Move old analytics data to separate tables

---

## Files to Create

```
/backend/
├── migrations/
│   ├── 001-create-users-table.sql
│   ├── 002-create-client-accounts.sql
│   ├── 003-create-oauth-tokens.sql
│   ├── 004-create-products.sql
│   ├── 005-create-product-links.sql
│   ├── 006-create-conversations.sql
│   ├── 007-create-messages.sql
│   ├── 008-create-message-products.sql
│   ├── 009-create-analytics.sql
│   ├── 010-create-content-cache.sql
│   ├── 011-create-notifications.sql
│   ├── 012-create-functions-triggers.sql
│   ├── 013-performance-indexes.sql
│   └── seed-dev-data.sql
└── src/
    ├── infrastructure/
    │   └── database/
    │       └── migrations/
    │           └── migration-runner.ts
    └── cli/
        └── migrate.ts
```

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
