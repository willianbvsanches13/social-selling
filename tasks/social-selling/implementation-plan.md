# Implementation Plan: Social Selling Platform
**Document Version:** 1.0
**Date:** 2025-10-18
**Project:** Social Selling Platform - Instagram & WhatsApp Business
**Status:** Ready for Execution
**Timeline:** 15 Days (MVP Phase 1)
**Architecture Reference:** `/Users/williansanches/projects/personal/social-selling-2/tasks/social-selling/architecture-design.md`

---

## Executive Summary

This implementation plan breaks down the Social Selling Platform MVP into executable tasks organized by domain and dependency chains. The plan is designed for a **15-day sprint** by a single developer, with tasks sized for manageable increments (max 8 hours each).

### Key Metrics
- **Total Tasks:** 68 tasks across 6 domains
- **Critical Path:** 15 days (Day 1-15 sequential core tasks)
- **Parallel Opportunities:** Frontend/Backend can be developed concurrently after Day 3
- **MVP Scope:** Instagram integration only (Phase 1)
- **Phase 2 (WhatsApp):** Deferred to post-MVP (adds ~7-10 days)

### Success Criteria for MVP Launch
✅ User can register and log in securely
✅ User can connect Instagram account via OAuth
✅ User can view Instagram DMs in unified inbox
✅ User can send Instagram DMs from platform
✅ User can schedule Instagram posts (feed, stories, reels)
✅ User can view basic analytics dashboard
✅ Platform deployed on Hostinger VPS with monitoring
✅ Infrastructure costs < $50/month

---

## Table of Contents

1. [Phase Organization](#phase-organization)
2. [Domain 1: Infrastructure & DevOps](#domain-1-infrastructure--devops)
3. [Domain 2: Backend Core](#domain-2-backend-core)
4. [Domain 3: Instagram Integration](#domain-3-instagram-integration)
5. [Domain 4: Frontend Development](#domain-4-frontend-development)
6. [Domain 5: Background Workers](#domain-5-background-workers)
7. [Domain 6: Testing & Deployment](#domain-6-testing--deployment)
8. [Critical Path Timeline](#critical-path-timeline)
9. [Risk Mitigation](#risk-mitigation)
10. [Post-MVP Enhancements](#post-mvp-enhancements)

---

## Phase Organization

### Phase A: Foundation (Days 1-3)
**Goal:** Set up infrastructure, development environment, and core backend architecture.

**Deliverables:**
- VPS provisioned with Docker Compose stack
- PostgreSQL database with schema
- Redis cache operational
- MinIO object storage configured
- Backend API boilerplate running
- CI/CD pipeline basic setup

---

### Phase B: Core Backend (Days 4-7)
**Goal:** Build authentication, user management, and core API services.

**Deliverables:**
- User registration and login (JWT + session)
- OAuth 2.0 framework for Instagram
- Repository pattern implementation
- API documentation (Swagger)
- Database migrations system

---

### Phase C: Instagram Integration (Days 6-9)
**Goal:** Implement Instagram Graph API integration for messages and content.

**Deliverables:**
- Instagram OAuth connection flow
- Direct messages retrieval and sending
- Post scheduling and publishing
- Webhook processing for real-time messages
- Basic insights/analytics fetching

---

### Phase D: Frontend Development (Days 5-11)
**Goal:** Build user interface with Next.js, Shadcn UI, and Tailwind CSS.

**Deliverables:**
- Authentication pages (login, register)
- Dashboard layout with sidebar navigation
- Unified inbox UI with real-time updates
- Content calendar and post scheduler
- Analytics dashboard with charts
- Account connection UI

---

### Phase E: Background Processing (Days 10-12)
**Goal:** Implement BullMQ workers for async operations.

**Deliverables:**
- Post publishing worker
- Webhook processing worker
- Analytics refresh worker
- Email notification worker

---

### Phase F: Testing & Production Deployment (Days 13-15)
**Goal:** Test, optimize, and deploy to production.

**Deliverables:**
- Integration tests for critical paths
- Performance optimization
- Production deployment with monitoring
- Backup and disaster recovery setup
- Documentation

---

## Domain 1: Infrastructure & DevOps

### INFRA-001: VPS Provisioning and Initial Setup
**Priority:** P0 (Critical Path)
**Effort:** 4 hours
**Day:** 1
**Dependencies:** None

**Description:**
Set up Hostinger KVM 2 VPS with Ubuntu 22.04, Docker, Docker Compose, and basic security configuration.

**Tasks:**
1. Purchase Hostinger KVM 2 VPS (2 vCPU, 4GB RAM, 100GB SSD)
2. Configure SSH key-based authentication
3. Disable password authentication for SSH
4. Install Docker and Docker Compose
5. Configure UFW firewall (allow 22, 80, 443)
6. Install fail2ban for SSH brute-force protection
7. Set up automatic security updates

**Files to Create:**
- `/infrastructure/terraform/providers.tf`
- `/infrastructure/terraform/modules/vps/main.tf`
- `/infrastructure/scripts/setup-server.sh`
- `/infrastructure/scripts/install-docker.sh`

**Acceptance Criteria:**
- [ ] VPS accessible via SSH key only
- [ ] Docker and Docker Compose installed and working
- [ ] UFW firewall active with correct rules
- [ ] fail2ban monitoring SSH attempts
- [ ] Can run `docker ps` successfully
- [ ] Automatic updates configured

---

### INFRA-002: Docker Compose Stack Setup
**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 1-2
**Dependencies:** INFRA-001

**Description:**
Create Docker Compose configuration for all services (PostgreSQL, Redis, MinIO, Nginx, Backend, Frontend, Workers, Prometheus, Grafana).

**Tasks:**
1. Create `docker-compose.yml` with all service definitions
2. Configure Docker networks (bridge network for isolation)
3. Set up persistent volumes for data
4. Create `.env.example` template file
5. Configure service health checks
6. Set resource limits for containers
7. Configure container restart policies

**Files to Create:**
- `/docker-compose.yml`
- `/docker-compose.override.yml` (for local development)
- `/.env.example`
- `/infrastructure/docker/README.md`

**Service Definitions:**
- `postgres` (PostgreSQL 15 Alpine)
- `redis` (Redis 7 Alpine)
- `minio` (MinIO latest)
- `nginx` (Nginx Alpine)
- `backend` (NestJS app)
- `frontend` (Next.js app)
- `worker` (BullMQ workers)
- `prometheus` (Prometheus latest)
- `grafana` (Grafana latest)

**Acceptance Criteria:**
- [ ] `docker-compose up -d` starts all services
- [ ] All services show as healthy in `docker ps`
- [ ] Persistent volumes created and mounted
- [ ] Environment variables loaded correctly
- [ ] Services can communicate on Docker network
- [ ] Resource limits enforced

---

### INFRA-003: PostgreSQL Database Initialization
**Priority:** P0 (Critical Path)
**Effort:** 4 hours
**Day:** 2
**Dependencies:** INFRA-002

**Description:**
Set up PostgreSQL database with initial schema, extensions, and migration framework.

**Tasks:**
1. Create database initialization script
2. Enable required extensions (uuid-ossp, pgcrypto, pg_trgm)
3. Create database users with appropriate permissions
4. Set up node-pg-migrate for migrations
5. Create initial migration for users table
6. Configure connection pooling
7. Test database connectivity from backend container

**Files to Create:**
- `/database/init/01-extensions.sql`
- `/database/init/02-users.sql`
- `/database/migrations/001-initial-schema.sql`
- `/backend/src/infrastructure/database/database.ts`
- `/backend/src/infrastructure/database/db-config.ts`

**Acceptance Criteria:**
- [ ] PostgreSQL container running and accessible
- [ ] Extensions installed successfully
- [ ] Migrations system configured
- [ ] Can run migrations up/down
- [ ] Backend can connect to database
- [ ] Connection pooling working (max 20 connections)

---

### INFRA-004: Redis Cache Configuration
**Priority:** P0 (Critical Path)
**Effort:** 2 hours
**Day:** 2
**Dependencies:** INFRA-002

**Description:**
Configure Redis for session storage, caching, and BullMQ queue backend.

**Tasks:**
1. Configure Redis with password authentication
2. Set up eviction policy (allkeys-lru)
3. Configure persistence (optional for MVP - cache-only mode)
4. Test Redis connectivity from backend
5. Create Redis connection wrapper service

**Files to Create:**
- `/backend/src/infrastructure/cache/redis.service.ts`
- `/backend/src/infrastructure/cache/cache.module.ts`
- `/infrastructure/redis/redis.conf` (if custom config needed)

**Acceptance Criteria:**
- [ ] Redis container running
- [ ] Password authentication working
- [ ] Backend can connect and set/get keys
- [ ] TTL expiration working
- [ ] BullMQ can connect for queue operations

---

### INFRA-005: MinIO S3-Compatible Storage Setup
**Priority:** P0 (Critical Path)
**Effort:** 3 hours
**Day:** 2
**Dependencies:** INFRA-002

**Description:**
Set up MinIO for media file storage with S3-compatible API.

**Tasks:**
1. Configure MinIO with access/secret keys
2. Create initial bucket: `social-selling-media`
3. Configure bucket lifecycle policies
4. Set up S3 client wrapper service
5. Test file upload/download operations
6. Configure pre-signed URL generation (1 hour expiry)

**Files to Create:**
- `/backend/src/infrastructure/storage/minio.service.ts`
- `/backend/src/infrastructure/storage/storage.module.ts`
- `/infrastructure/minio/init-buckets.sh`

**Acceptance Criteria:**
- [ ] MinIO container running (ports 9000, 9001)
- [ ] MinIO console accessible at http://localhost:9001
- [ ] Bucket created successfully
- [ ] Backend can upload files to MinIO
- [ ] Pre-signed URLs generated correctly
- [ ] Can download files via pre-signed URL

---

### INFRA-006: Nginx Reverse Proxy Configuration
**Priority:** P1 (High)
**Effort:** 4 hours
**Day:** 3
**Dependencies:** INFRA-002

**Description:**
Configure Nginx as reverse proxy for frontend, backend API, and WebSocket connections.

**Tasks:**
1. Create Nginx configuration file
2. Configure proxy for frontend (port 3000)
3. Configure proxy for backend API (/api → port 4000)
4. Configure WebSocket proxy (/socket.io)
5. Configure proxy for MinIO (/media → port 9000)
6. Set up rate limiting rules
7. Configure proxy headers (X-Forwarded-For, etc.)

**Files to Create:**
- `/infrastructure/nginx/nginx.conf`
- `/infrastructure/nginx/conf.d/default.conf`
- `/infrastructure/nginx/conf.d/rate-limit.conf`

**Acceptance Criteria:**
- [ ] Nginx container running and routing requests
- [ ] Frontend accessible at http://localhost
- [ ] Backend API accessible at http://localhost/api
- [ ] WebSocket connections working
- [ ] MinIO media accessible at http://localhost/media
- [ ] Rate limiting working (test with curl)

---

### INFRA-007: SSL Certificate Setup (Let's Encrypt)
**Priority:** P2 (Medium)
**Effort:** 3 hours
**Day:** 13 (before production deployment)
**Dependencies:** INFRA-006, INFRA-012

**Description:**
Configure Let's Encrypt SSL certificates with automatic renewal via Certbot.

**Tasks:**
1. Install Certbot on VPS
2. Configure Nginx for ACME challenge
3. Obtain SSL certificates for production domain
4. Configure Nginx to use SSL certificates
5. Set up automatic renewal cron job
6. Test certificate renewal process
7. Configure HTTPS redirects

**Files to Create:**
- `/infrastructure/scripts/setup-ssl.sh`
- `/infrastructure/nginx/conf.d/ssl.conf`
- `/infrastructure/certbot/renewal-hooks.sh`

**Acceptance Criteria:**
- [ ] SSL certificates obtained successfully
- [ ] HTTPS working for production domain
- [ ] HTTP redirects to HTTPS
- [ ] Certificate auto-renewal cron configured
- [ ] Test renewal with `certbot renew --dry-run`
- [ ] A+ rating on SSL Labs test

---

### INFRA-008: Cloudflare DNS and CDN Setup
**Priority:** P2 (Medium)
**Effort:** 2 hours
**Day:** 13
**Dependencies:** INFRA-007

**Description:**
Configure Cloudflare for DNS management, CDN, and DDoS protection.

**Tasks:**
1. Add domain to Cloudflare
2. Configure A records for app subdomain
3. Enable Cloudflare CDN (orange cloud)
4. Configure SSL mode (Full Strict)
5. Set up page rules for caching
6. Enable DDoS protection features
7. Configure firewall rules (optional)

**Files to Create:**
- `/infrastructure/terraform/modules/dns/cloudflare.tf`
- `/infrastructure/cloudflare/page-rules.md` (documentation)

**Acceptance Criteria:**
- [ ] Domain resolves through Cloudflare
- [ ] CDN caching working for static assets
- [ ] SSL/TLS working with Full Strict mode
- [ ] Page rules configured correctly
- [ ] DDoS protection active
- [ ] Analytics visible in Cloudflare dashboard

---

### INFRA-009: Monitoring Stack (Prometheus + Grafana)
**Priority:** P1 (High)
**Effort:** 5 hours
**Day:** 3
**Dependencies:** INFRA-002

**Description:**
Set up Prometheus for metrics collection and Grafana for visualization.

**Tasks:**
1. Configure Prometheus to scrape all services
2. Create Prometheus alerting rules
3. Configure Grafana data source (Prometheus)
4. Import pre-built dashboards (Docker, Node.js)
5. Create custom dashboards (operational, business)
6. Configure Grafana alerts
7. Set up email notifications (optional)

**Files to Create:**
- `/infrastructure/monitoring/prometheus.yml`
- `/infrastructure/monitoring/alerts.yml`
- `/infrastructure/monitoring/grafana/datasources/prometheus.yml`
- `/infrastructure/monitoring/grafana/dashboards/operational.json`
- `/infrastructure/monitoring/grafana/dashboards/business.json`

**Acceptance Criteria:**
- [ ] Prometheus scraping metrics from all services
- [ ] Grafana accessible at http://localhost:3001
- [ ] Data source connected successfully
- [ ] Dashboards showing real-time metrics
- [ ] Alerts configured and firing test alerts
- [ ] Can query metrics with PromQL

---

### INFRA-010: Logging Stack (Loki + Promtail)
**Priority:** P2 (Medium)
**Effort:** 4 hours
**Day:** 11
**Dependencies:** INFRA-009

**Description:**
Set up Loki for log aggregation and Promtail for log collection from Docker containers.

**Tasks:**
1. Configure Promtail to collect Docker logs
2. Set up Loki for log storage
3. Add Loki data source to Grafana
4. Create log dashboard in Grafana
5. Configure log retention (30 days)
6. Set up log-based alerts (optional)

**Files to Create:**
- `/infrastructure/monitoring/loki-config.yml`
- `/infrastructure/monitoring/promtail-config.yml`
- `/infrastructure/monitoring/grafana/dashboards/logs.json`

**Acceptance Criteria:**
- [ ] Promtail collecting logs from all containers
- [ ] Loki storing logs successfully
- [ ] Grafana can query logs with LogQL
- [ ] Log dashboard showing recent logs
- [ ] Can search logs by container, level, message
- [ ] 30-day retention working

---

### INFRA-011: Backup and Disaster Recovery Setup
**Priority:** P1 (High)
**Effort:** 4 hours
**Day:** 14
**Dependencies:** INFRA-003, INFRA-005

**Description:**
Set up automated backups for PostgreSQL, MinIO, and configuration files.

**Tasks:**
1. Create PostgreSQL backup script (pg_dump)
2. Create MinIO backup script (tar archive)
3. Configure rclone for external backup storage (Backblaze B2 or S3)
4. Set up daily backup cron jobs
5. Create backup restoration test script
6. Document recovery procedures
7. Test full disaster recovery process

**Files to Create:**
- `/infrastructure/scripts/backup-postgres.sh`
- `/infrastructure/scripts/backup-minio.sh`
- `/infrastructure/scripts/restore-postgres.sh`
- `/infrastructure/scripts/restore-minio.sh`
- `/infrastructure/docs/disaster-recovery.md`

**Acceptance Criteria:**
- [ ] Daily PostgreSQL backups running via cron
- [ ] Daily MinIO backups running via cron
- [ ] Backups uploaded to external storage successfully
- [ ] Restoration script tested and working
- [ ] 7-day local retention, 30-day remote retention
- [ ] Recovery procedures documented

---

### INFRA-012: CI/CD Pipeline (GitHub Actions)
**Priority:** P1 (High)
**Effort:** 6 hours
**Day:** 12
**Dependencies:** INFRA-001, BE-001

**Description:**
Set up GitHub Actions for automated testing, building, and deployment.

**Tasks:**
1. Create PR check workflow (lint, test, build)
2. Create staging deployment workflow
3. Create production deployment workflow
4. Configure Docker image building and pushing
5. Set up SSH deployment to VPS
6. Configure GitHub secrets (VPS credentials, env vars)
7. Add deployment notifications (Slack/Discord)

**Files to Create:**
- `/.github/workflows/pr-checks.yml`
- `/.github/workflows/deploy-staging.yml`
- `/.github/workflows/deploy-production.yml`
- `/.github/workflows/test.yml`

**Acceptance Criteria:**
- [ ] PR checks run automatically on pull requests
- [ ] Lint and tests pass in CI
- [ ] Docker images build successfully
- [ ] Staging deployment works on merge to `staging` branch
- [ ] Production deployment works on merge to `main` branch
- [ ] Health checks validate deployment
- [ ] Team notifications sent on deployment

---

## Domain 2: Backend Core

### BE-001: NestJS Project Initialization
**Priority:** P0 (Critical Path)
**Effort:** 3 hours
**Day:** 2
**Dependencies:** INFRA-002

**Description:**
Initialize NestJS backend project with TypeScript, folder structure, and core configuration.

**Tasks:**
1. Initialize NestJS project with CLI
2. Configure TypeScript (strict mode)
3. Set up project folder structure (modular architecture)
4. Configure environment variables (@nestjs/config)
5. Install core dependencies (pg-promise, passport, jwt, etc.)
6. Configure ESLint and Prettier
7. Set up Husky for pre-commit hooks

**Files to Create:**
- `/backend/src/main.ts`
- `/backend/src/app.module.ts`
- `/backend/src/config/configuration.ts`
- `/backend/tsconfig.json`
- `/backend/.eslintrc.js`
- `/backend/.prettierrc`
- `/backend/package.json`

**Folder Structure:**
```
backend/src/
├── modules/
│   ├── auth/
│   ├── user/
│   ├── instagram/
│   ├── message/
│   ├── content/
│   ├── analytics/
│   └── notification/
├── infrastructure/
│   ├── database/
│   ├── cache/
│   └── storage/
├── domain/
│   ├── entities/
│   └── repositories/
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   └── filters/
└── config/
```

**Acceptance Criteria:**
- [x] NestJS app starts successfully
- [x] TypeScript compilation working
- [x] Environment variables loading
- [x] Linting and formatting working
- [x] Pre-commit hooks running
- [x] Can access http://localhost:4000/health

**Status:** ✅ Completed (2025-10-18)

---

### BE-002: Database Repository Pattern Implementation
**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 3
**Dependencies:** BE-001, INFRA-003

**Description:**
Implement repository pattern with pg-promise for database-agnostic data access layer.

**Tasks:**
1. Create Database connection service (pg-promise)
2. Define repository interfaces (IUserRepository, etc.)
3. Implement PostgresUserRepository
4. Create base repository class with common methods
5. Set up dependency injection for repositories
6. Create database transaction helper
7. Add connection pooling configuration

**Files to Create:**
- `/backend/src/infrastructure/database/database.ts`
- `/backend/src/infrastructure/database/database.module.ts`
- `/backend/src/domain/repositories/user.repository.interface.ts`
- `/backend/src/infrastructure/database/repositories/postgres-user.repository.ts`
- `/backend/src/infrastructure/database/repositories/base.repository.ts`

**Acceptance Criteria:**
- [ ] Database connection established successfully
- [ ] Repository pattern working with DI
- [ ] Can perform CRUD operations via repository
- [ ] Transactions working correctly
- [ ] Connection pooling configured (max 20)
- [ ] Type safety with TypeScript interfaces

---

### BE-003: Database Migrations System
**Priority:** P0 (Critical Path)
**Effort:** 3 hours
**Day:** 3
**Dependencies:** INFRA-003, BE-002

**Description:**
Set up node-pg-migrate for database schema migrations with up/down support.

**Tasks:**
1. Install and configure node-pg-migrate
2. Create initial migration for users table
3. Create migration for client_accounts table
4. Create migration for oauth_tokens table
5. Add migration scripts to package.json
6. Document migration workflow
7. Test migrations up/down

**Files to Create:**
- `/backend/migrations/1-create-users-table.js`
- `/backend/migrations/2-create-client-accounts-table.js`
- `/backend/migrations/3-create-oauth-tokens-table.js`
- `/backend/migrations/4-create-messages-table.js`
- `/backend/migrations/5-create-scheduled-posts-table.js`

**Migration Script Examples:**
```bash
npm run migrate:up      # Run all pending migrations
npm run migrate:down    # Rollback last migration
npm run migrate:create  # Create new migration
```

**Acceptance Criteria:**
- [ ] Migrations run successfully
- [ ] All tables created with correct schema
- [ ] Indexes and constraints applied
- [ ] Down migrations work (rollback)
- [ ] Can create new migrations easily
- [ ] Migration status tracked in database

---

### BE-004: Authentication Module (Registration & Login)
**Priority:** P0 (Critical Path)
**Effort:** 8 hours
**Day:** 4
**Dependencies:** BE-002, BE-003

**Description:**
Implement user registration and login with JWT tokens and bcrypt password hashing.

**Tasks:**
1. Create AuthModule, AuthService, AuthController
2. Implement user registration with validation
3. Implement bcrypt password hashing (12 rounds)
4. Implement login with JWT token generation
5. Create JWT strategy for Passport.js
6. Implement JWT refresh token flow
7. Add rate limiting for auth endpoints
8. Create DTOs for request/response validation

**Files to Create:**
- `/backend/src/modules/auth/auth.module.ts`
- `/backend/src/modules/auth/auth.service.ts`
- `/backend/src/modules/auth/auth.controller.ts`
- `/backend/src/modules/auth/strategies/jwt.strategy.ts`
- `/backend/src/modules/auth/dto/register.dto.ts`
- `/backend/src/modules/auth/dto/login.dto.ts`
- `/backend/src/modules/auth/guards/jwt-auth.guard.ts`

**API Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout

**Acceptance Criteria:**
- [ ] User can register with email and password
- [ ] Password hashed with bcrypt (12 rounds)
- [ ] User can login and receive JWT token
- [ ] JWT token validated on protected routes
- [ ] Refresh token flow working
- [ ] Rate limiting active (5 login attempts per minute)
- [ ] Input validation working (Zod or class-validator)

---

### BE-005: User Module (Profile & Preferences)
**Priority:** P1 (High)
**Effort:** 4 hours
**Day:** 5
**Dependencies:** BE-004

**Description:**
Implement user profile management and preferences.

**Tasks:**
1. Create UserModule, UserService, UserController
2. Implement get user profile endpoint
3. Implement update user profile endpoint
4. Implement user preferences CRUD
5. Add timezone and language support
6. Create subscription tier logic
7. Add user data export (GDPR)

**Files to Create:**
- `/backend/src/modules/user/user.module.ts`
- `/backend/src/modules/user/user.service.ts`
- `/backend/src/modules/user/user.controller.ts`
- `/backend/src/modules/user/dto/update-user.dto.ts`
- `/backend/src/modules/user/dto/user-preferences.dto.ts`

**API Endpoints:**
- `GET /users/me` - Get current user
- `PATCH /users/me` - Update user profile
- `GET /users/me/preferences` - Get preferences
- `PATCH /users/me/preferences` - Update preferences
- `POST /users/me/export` - Request data export (GDPR)

**Acceptance Criteria:**
- [ ] User can fetch their profile
- [ ] User can update name, language, timezone
- [ ] Preferences stored and retrieved correctly
- [ ] Subscription tier tracked
- [ ] Data export generates JSON file
- [ ] Authorization checks prevent access to other users

---

### BE-006: Session Management (Redis)
**Priority:** P1 (High)
**Effort:** 3 hours
**Day:** 5
**Dependencies:** BE-004, INFRA-004

**Description:**
Implement Redis-backed session management for storing user sessions and OAuth state.

**Tasks:**
1. Create SessionService for Redis operations
2. Store user session on login
3. Validate session on protected routes
4. Implement session expiration (24 hours)
5. Store OAuth state in session
6. Add concurrent session limiting (max 5 devices)
7. Implement logout (session invalidation)

**Files to Create:**
- `/backend/src/modules/auth/session.service.ts`
- `/backend/src/common/decorators/session.decorator.ts`

**Session Data Structure:**
```typescript
{
  userId: string;
  email: string;
  permissions: string[];
  oauthState?: string;
  createdAt: Date;
  expiresAt: Date;
}
```

**Acceptance Criteria:**
- [ ] Session created on login and stored in Redis
- [ ] Session validated on protected routes
- [ ] Session expires after 24 hours of inactivity
- [ ] Logout invalidates session
- [ ] OAuth state stored and retrieved correctly
- [ ] Concurrent session limit enforced

---

### BE-007: API Documentation (Swagger/OpenAPI)
**Priority:** P2 (Medium)
**Effort:** 3 hours
**Day:** 6
**Dependencies:** BE-004, BE-005

**Description:**
Set up Swagger/OpenAPI documentation for REST API.

**Tasks:**
1. Install @nestjs/swagger
2. Configure Swagger module in main.ts
3. Add @ApiTags, @ApiOperation decorators to controllers
4. Document request/response DTOs with @ApiProperty
5. Add authentication documentation
6. Generate OpenAPI specification file
7. Test Swagger UI at /api/docs

**Files to Create:**
- `/backend/src/config/swagger.config.ts`
- Update all controller files with Swagger decorators

**Acceptance Criteria:**
- [ ] Swagger UI accessible at http://localhost:4000/api/docs
- [ ] All endpoints documented
- [ ] Request/response schemas visible
- [ ] Can test endpoints from Swagger UI
- [ ] Authentication configured (JWT bearer)
- [ ] OpenAPI spec downloadable

---

### BE-008: Error Handling and Logging
**Priority:** P1 (High)
**Effort:** 4 hours
**Day:** 4
**Dependencies:** BE-001

**Description:**
Implement global exception filters, error handling, and structured logging.

**Tasks:**
1. Create global exception filter
2. Create custom exception classes
3. Configure Winston logger
4. Add request/response logging middleware
5. Add error tracking (Sentry integration optional)
6. Create standardized error response format
7. Add correlation IDs for request tracing

**Files to Create:**
- `/backend/src/common/filters/http-exception.filter.ts`
- `/backend/src/common/exceptions/business.exception.ts`
- `/backend/src/common/interceptors/logging.interceptor.ts`
- `/backend/src/config/logger.config.ts`

**Error Response Format:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["Email is required"],
  "timestamp": "2025-10-18T12:00:00Z",
  "path": "/auth/register",
  "correlationId": "abc-123-def"
}
```

**Acceptance Criteria:**
- [ ] All exceptions caught and formatted consistently
- [ ] Structured logging with Winston
- [ ] Request/response logs include correlation ID
- [ ] Error logs include stack traces
- [ ] Business exceptions handled gracefully
- [ ] Logs visible in Grafana/Loki

---

## Domain 3: Instagram Integration

### IG-001: Instagram OAuth 2.0 Flow
**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 6
**Dependencies:** BE-004, BE-006

**Description:**
Implement Instagram OAuth 2.0 authorization flow for connecting user Instagram accounts.

**Tasks:**
1. Register app with Meta Developer Portal
2. Create InstagramOAuthStrategy (Passport.js)
3. Implement OAuth initiation endpoint (redirect to Instagram)
4. Implement OAuth callback endpoint (exchange code for token)
5. Store encrypted access token in database (pgcrypto)
6. Implement token refresh logic
7. Handle OAuth errors (denied access, expired tokens)

**Files to Create:**
- `/backend/src/modules/instagram/instagram.module.ts`
- `/backend/src/modules/instagram/instagram-oauth.service.ts`
- `/backend/src/modules/instagram/strategies/instagram-oauth.strategy.ts`
- `/backend/src/modules/instagram/instagram.controller.ts`
- `/backend/src/domain/repositories/oauth-token.repository.interface.ts`

**API Endpoints:**
- `GET /instagram/oauth/authorize` - Start OAuth flow
- `GET /instagram/oauth/callback` - Handle OAuth callback
- `POST /instagram/accounts/disconnect/:id` - Disconnect account

**Acceptance Criteria:**
- [ ] User redirected to Instagram authorization page
- [ ] OAuth callback receives authorization code
- [ ] Access token exchanged and encrypted
- [ ] Token stored in oauth_tokens table
- [ ] Account metadata stored in client_accounts table
- [ ] Can disconnect account (revoke token)
- [ ] Error handling for OAuth failures

---

### IG-002: Instagram Account Management
**Priority:** P0 (Critical Path)
**Effort:** 4 hours
**Day:** 7
**Dependencies:** IG-001

**Description:**
Implement endpoints for listing and managing connected Instagram accounts.

**Tasks:**
1. Create ClientAccount entity and repository
2. Implement list connected accounts endpoint
3. Fetch Instagram account metadata (username, profile pic, followers)
4. Store account metadata in database
5. Implement account status tracking (active, token_expired, disconnected)
6. Add pagination for accounts list
7. Implement account switching logic

**Files to Create:**
- `/backend/src/domain/entities/client-account.entity.ts`
- `/backend/src/domain/repositories/client-account.repository.interface.ts`
- `/backend/src/infrastructure/database/repositories/postgres-client-account.repository.ts`
- `/backend/src/modules/instagram/instagram-account.service.ts`

**Database Schema:**
```sql
CREATE TABLE client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  platform VARCHAR(50) NOT NULL, -- 'instagram'
  platform_account_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  profile_picture_url TEXT,
  follower_count INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
- `GET /instagram/accounts` - List connected accounts
- `GET /instagram/accounts/:id` - Get account details
- `PATCH /instagram/accounts/:id` - Update account metadata

**Acceptance Criteria:**
- [ ] Can list all connected Instagram accounts for user
- [ ] Account metadata fetched and stored
- [ ] Account status tracked correctly
- [ ] Can fetch single account by ID
- [ ] Authorization check (user can only access their accounts)
- [ ] Pagination working for large account lists

---

### IG-003: Instagram Graph API Wrapper Service
**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 7
**Dependencies:** IG-001

**Description:**
Create wrapper service for Instagram Graph API with error handling and rate limiting.

**Tasks:**
1. Create InstagramApiService with axios
2. Implement token retrieval and decryption
3. Add rate limit tracking and handling
4. Implement retry logic with exponential backoff
5. Handle Graph API errors (token expired, rate limits)
6. Create method for fetching user profile
7. Create method for fetching media list

**Files to Create:**
- `/backend/src/modules/instagram/instagram-api.service.ts`
- `/backend/src/modules/instagram/dto/instagram-api-error.dto.ts`
- `/backend/src/modules/instagram/utils/rate-limiter.ts`

**API Methods:**
- `getUserProfile(accountId: string)`
- `getMediaList(accountId: string, limit?: number)`
- `publishMedia(accountId: string, mediaData: PublishMediaDto)`
- `getConversations(accountId: string)`
- `sendMessage(accountId: string, recipientId: string, message: string)`
- `getInsights(accountId: string, metrics: string[])`

**Acceptance Criteria:**
- [ ] Can fetch user profile from Instagram API
- [ ] Token decrypted and used for API calls
- [ ] Rate limits tracked and respected
- [ ] Exponential backoff on errors
- [ ] Graph API errors handled gracefully
- [ ] Can retry failed requests
- [ ] Type-safe API responses with DTOs

---

### IG-004: Instagram Direct Messages (Inbox)
**Priority:** P0 (Critical Path)
**Effort:** 8 hours
**Day:** 8
**Dependencies:** IG-003

**Description:**
Implement Instagram direct message retrieval, storage, and sending.

**Tasks:**
1. Create Message entity and repository
2. Implement fetch conversations from Instagram API
3. Implement fetch messages for conversation
4. Store messages in database with full-text search
5. Implement send message endpoint
6. Add message status tracking (sent, delivered, read)
7. Handle media messages (images, videos)

**Files to Create:**
- `/backend/src/domain/entities/message.entity.ts`
- `/backend/src/domain/repositories/message.repository.interface.ts`
- `/backend/src/infrastructure/database/repositories/postgres-message.repository.ts`
- `/backend/src/modules/message/message.module.ts`
- `/backend/src/modules/message/message.service.ts`
- `/backend/src/modules/message/message.controller.ts`

**Database Schema:**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id),
  platform_message_id VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  sender_id VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  content TEXT NOT NULL,
  media_urls JSONB,
  direction VARCHAR(50) NOT NULL, -- 'inbound' | 'outbound'
  status VARCHAR(50) NOT NULL,
  conversation_id VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  search_vector TSVECTOR
);

CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);
```

**API Endpoints:**
- `GET /messages` - List messages (paginated, filtered)
- `GET /messages/:id` - Get single message
- `POST /messages` - Send new message
- `PATCH /messages/:id/read` - Mark as read
- `GET /conversations` - List conversations
- `GET /conversations/:id/messages` - Get conversation thread

**Acceptance Criteria:**
- [ ] Can fetch Instagram DMs via API
- [ ] Messages stored in database
- [ ] Full-text search working
- [ ] Can send DMs to Instagram users
- [ ] Message status tracked correctly
- [ ] Media messages handled (URLs stored)
- [ ] Pagination working for large message lists

---

### IG-005: Instagram Webhooks (Real-time Messages)
**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 8
**Dependencies:** IG-003, IG-004

**Description:**
Implement webhook endpoint for receiving real-time Instagram events (messages, mentions, comments).

**Tasks:**
1. Configure webhook in Meta App Dashboard
2. Create webhook verification endpoint (GET)
3. Create webhook event receiver endpoint (POST)
4. Validate webhook signatures
5. Queue webhook events for async processing
6. Implement idempotency checks (prevent duplicate processing)
7. Test with Meta webhook testing tool

**Files to Create:**
- `/backend/src/modules/instagram/instagram-webhook.controller.ts`
- `/backend/src/modules/instagram/instagram-webhook.service.ts`
- `/backend/src/modules/instagram/utils/webhook-signature-validator.ts`

**Webhook Endpoint:**
- `GET /instagram/webhooks` - Webhook verification (Meta requirement)
- `POST /instagram/webhooks` - Receive webhook events

**Webhook Events Handled:**
- `messages` - New direct messages
- `messaging_postbacks` - Message read receipts
- `mentions` - @mentions in stories
- `comments` - Comments on posts

**Acceptance Criteria:**
- [ ] Webhook verification endpoint working
- [ ] Webhook events received from Instagram
- [ ] Signature validation working
- [ ] Events queued to BullMQ for async processing
- [ ] Idempotency prevents duplicate processing
- [ ] Can test webhooks with Meta testing tool
- [ ] Returns 200 OK immediately (< 5 seconds)

---

### IG-006: Instagram Post Scheduling
**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 9
**Dependencies:** IG-003, INFRA-005

**Description:**
Implement post scheduling for Instagram feed, stories, and reels.

**Tasks:**
1. Create ScheduledPost entity and repository
2. Implement create scheduled post endpoint
3. Handle media upload to MinIO
4. Store post metadata and media references
5. Queue post for publishing at scheduled time (BullMQ)
6. Implement update/delete scheduled post
7. Implement calendar view endpoint

**Files to Create:**
- `/backend/src/domain/entities/scheduled-post.entity.ts`
- `/backend/src/domain/repositories/scheduled-post.repository.interface.ts`
- `/backend/src/infrastructure/database/repositories/postgres-scheduled-post.repository.ts`
- `/backend/src/modules/content/content.module.ts`
- `/backend/src/modules/content/content.service.ts`
- `/backend/src/modules/content/content.controller.ts`

**Database Schema:**
```sql
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id),
  post_type VARCHAR(50) NOT NULL, -- 'feed' | 'story' | 'reel'
  caption TEXT NOT NULL,
  media_keys JSONB NOT NULL,
  scheduled_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  published_at TIMESTAMP,
  platform_post_id VARCHAR(255),
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
- `POST /posts` - Create scheduled post
- `GET /posts` - List scheduled posts
- `GET /posts/:id` - Get post details
- `PATCH /posts/:id` - Update scheduled post
- `DELETE /posts/:id` - Delete scheduled post
- `GET /calendar` - Get calendar view

**Acceptance Criteria:**
- [ ] Can schedule Instagram post with media
- [ ] Media uploaded to MinIO successfully
- [ ] Post queued for publishing at scheduled time
- [ ] Can list all scheduled posts
- [ ] Can update scheduled post (before publishing)
- [ ] Can delete scheduled post
- [ ] Calendar view returns posts grouped by date

---

### IG-007: Instagram Analytics/Insights
**Priority:** P1 (High)
**Effort:** 6 hours
**Day:** 9
**Dependencies:** IG-003

**Description:**
Fetch and store Instagram insights for account and post-level metrics.

**Tasks:**
1. Create AnalyticsSnapshot entity and repository
2. Implement fetch account insights from Instagram API
3. Implement fetch post insights from Instagram API
4. Store time-series snapshots in database
5. Implement analytics aggregation service
6. Add caching layer for analytics (Redis, 1 hour TTL)
7. Create analytics dashboard endpoint

**Files to Create:**
- `/backend/src/domain/entities/analytics-snapshot.entity.ts`
- `/backend/src/domain/repositories/analytics.repository.interface.ts`
- `/backend/src/infrastructure/database/repositories/postgres-analytics.repository.ts`
- `/backend/src/modules/analytics/analytics.module.ts`
- `/backend/src/modules/analytics/analytics.service.ts`
- `/backend/src/modules/analytics/analytics.controller.ts`

**Metrics Tracked:**
- Account: followers, reach, impressions, profile_views
- Post: likes, comments, shares, saves, reach, impressions, engagement_rate

**API Endpoints:**
- `GET /analytics/overview` - Dashboard overview
- `GET /analytics/accounts/:id` - Account-specific analytics
- `GET /analytics/posts/:id` - Post performance

**Acceptance Criteria:**
- [ ] Can fetch account insights from Instagram API
- [ ] Can fetch post insights from Instagram API
- [ ] Insights stored as time-series snapshots
- [ ] Analytics dashboard aggregates data correctly
- [ ] Redis caching reduces API calls
- [ ] Can query analytics by date range
- [ ] Handles missing/incomplete data gracefully

---

## Domain 4: Frontend Development

### FE-001: Next.js Project Initialization
**Priority:** P0 (Critical Path)
**Effort:** 3 hours
**Day:** 5
**Dependencies:** INFRA-002

**Description:**
Initialize Next.js 14 project with TypeScript, Tailwind CSS, and Shadcn UI setup.

**Tasks:**
1. Create Next.js 14 app with TypeScript
2. Configure Tailwind CSS
3. Initialize Shadcn UI (install CLI, configure components)
4. Set up Next.js App Router folder structure
5. Configure environment variables
6. Set up ESLint and Prettier
7. Create base layout component

**Files to Create:**
- `/frontend/src/app/layout.tsx`
- `/frontend/src/app/page.tsx`
- `/frontend/tailwind.config.js`
- `/frontend/components.json` (Shadcn config)
- `/frontend/src/lib/utils.ts` (cn() helper)
- `/frontend/src/styles/globals.css`

**Shadcn UI Components to Install:**
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add form
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add skeleton
```

**Acceptance Criteria:**
- [ ] Next.js app starts successfully
- [ ] Tailwind CSS working with hot reload
- [ ] Shadcn UI components installed in /components/ui/
- [ ] Dark mode configured with next-themes
- [ ] Can import and use Shadcn components
- [ ] TypeScript compilation working
- [ ] ESLint and Prettier configured

---

### FE-002: Authentication Pages (Login & Register)
**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 6
**Dependencies:** FE-001, BE-004

**Description:**
Build login and registration pages with form validation and API integration.

**Tasks:**
1. Create login page (/login)
2. Create registration page (/register)
3. Set up React Hook Form with Zod validation
4. Create API client service (axios)
5. Implement login form with email/password
6. Implement registration form
7. Handle authentication errors (display toast notifications)
8. Store JWT token in localStorage/cookies
9. Redirect to dashboard on successful login

**Files to Create:**
- `/frontend/src/app/(auth)/login/page.tsx`
- `/frontend/src/app/(auth)/register/page.tsx`
- `/frontend/src/components/auth/LoginForm.tsx`
- `/frontend/src/components/auth/RegisterForm.tsx`
- `/frontend/src/lib/api-client.ts`
- `/frontend/src/lib/auth.ts`

**Form Validation:**
- Email: valid email format
- Password: min 8 chars, uppercase, lowercase, number

**Acceptance Criteria:**
- [ ] Login page renders with form
- [ ] Registration page renders with form
- [ ] Form validation working (Zod)
- [ ] Can submit login form and receive JWT
- [ ] Can submit registration form
- [ ] JWT stored securely (httpOnly cookie or localStorage)
- [ ] Redirects to dashboard on success
- [ ] Error messages displayed (toast notifications)

---

### FE-003: Dashboard Layout with Sidebar
**Priority:** P0 (Critical Path)
**Effort:** 5 hours
**Day:** 7
**Dependencies:** FE-002

**Description:**
Create main dashboard layout with sidebar navigation, header, and responsive design.

**Tasks:**
1. Create dashboard layout component
2. Create sidebar navigation component
3. Create header component with user menu
4. Add responsive navigation (mobile menu)
5. Implement route-based active link highlighting
6. Add logout functionality
7. Create loading states with Skeleton components

**Files to Create:**
- `/frontend/src/app/(dashboard)/layout.tsx`
- `/frontend/src/components/layout/AppLayout.tsx`
- `/frontend/src/components/layout/Sidebar.tsx`
- `/frontend/src/components/layout/Header.tsx`
- `/frontend/src/components/layout/MobileNav.tsx`

**Navigation Links:**
- Dashboard (/)
- Inbox (/inbox)
- Calendar (/calendar)
- Analytics (/analytics)
- Clients (/clients)
- Settings (/settings)

**Acceptance Criteria:**
- [ ] Dashboard layout renders correctly
- [ ] Sidebar navigation visible on desktop
- [ ] Mobile menu working (hamburger icon)
- [ ] Active link highlighted based on route
- [ ] User menu shows profile and logout
- [ ] Logout clears token and redirects to login
- [ ] Responsive design (mobile, tablet, desktop)

---

### FE-004: Dashboard Overview Page
**Priority:** P1 (High)
**Effort:** 4 hours
**Day:** 8
**Dependencies:** FE-003, BE-005, IG-007

**Description:**
Build dashboard overview page with key metrics cards and recent activity.

**Tasks:**
1. Create dashboard page component
2. Fetch user data and analytics overview
3. Create metric cards (messages, posts, followers)
4. Create recent activity feed
5. Add loading states and error handling
6. Implement TanStack Query for data fetching
7. Add auto-refresh (optional)

**Files to Create:**
- `/frontend/src/app/(dashboard)/page.tsx`
- `/frontend/src/components/dashboard/MetricCard.tsx`
- `/frontend/src/components/dashboard/ActivityFeed.tsx`
- `/frontend/src/hooks/useAnalytics.ts`

**Metrics Displayed:**
- Total messages today
- Scheduled posts
- Total followers across accounts
- Engagement rate trend

**Acceptance Criteria:**
- [ ] Dashboard page renders with metrics
- [ ] Metrics fetched from API
- [ ] Loading states displayed while fetching
- [ ] Error states handled gracefully
- [ ] Metric cards show real data
- [ ] Recent activity feed displays latest actions
- [ ] TanStack Query caching working

---

### FE-005: Unified Inbox (Messages)
**Priority:** P0 (Critical Path)
**Effort:** 8 hours
**Day:** 9-10
**Dependencies:** FE-003, IG-004

**Description:**
Build unified inbox UI for Instagram DMs with real-time updates via WebSocket.

**Tasks:**
1. Create inbox page layout (list + detail view)
2. Create message list component
3. Create message thread component
4. Create message composer component
5. Implement WebSocket connection for real-time messages
6. Add infinite scroll for message list
7. Add message search functionality
8. Handle media messages (images, videos)

**Files to Create:**
- `/frontend/src/app/(dashboard)/inbox/page.tsx`
- `/frontend/src/components/inbox/MessageList.tsx`
- `/frontend/src/components/inbox/MessageThread.tsx`
- `/frontend/src/components/inbox/MessageComposer.tsx`
- `/frontend/src/components/inbox/AccountFilter.tsx`
- `/frontend/src/hooks/useWebSocket.ts`
- `/frontend/src/hooks/useInfiniteMessages.ts`

**Features:**
- Filter by account (dropdown)
- Search messages (full-text)
- Mark as read/unread
- Send new messages
- Real-time message updates

**Acceptance Criteria:**
- [ ] Inbox page renders with message list
- [ ] Can select conversation to view thread
- [ ] Messages displayed in chronological order
- [ ] Can send new messages
- [ ] Real-time updates via WebSocket
- [ ] Infinite scroll loads older messages
- [ ] Search filters messages correctly
- [ ] Media messages displayed (images/videos)

---

### FE-006: Content Calendar & Post Scheduler
**Priority:** P0 (Critical Path)
**Effort:** 8 hours
**Day:** 10-11
**Dependencies:** FE-003, IG-006

**Description:**
Build content calendar view and post scheduling UI.

**Tasks:**
1. Create calendar page with month/week view
2. Create post scheduler modal/form
3. Implement media upload component
4. Add post preview component
5. Implement drag-and-drop for rescheduling
6. Add post status indicators (scheduled, published, failed)
7. Handle post editing and deletion

**Files to Create:**
- `/frontend/src/app/(dashboard)/calendar/page.tsx`
- `/frontend/src/components/content/CalendarView.tsx`
- `/frontend/src/components/content/PostScheduler.tsx`
- `/frontend/src/components/content/MediaUploader.tsx`
- `/frontend/src/components/content/PostPreview.tsx`
- `/frontend/src/hooks/usePostScheduler.ts`

**Calendar Library:** `react-big-calendar` or custom calendar component

**Acceptance Criteria:**
- [ ] Calendar view displays scheduled posts by date
- [ ] Can create new scheduled post
- [ ] Media upload working (drag-and-drop or file select)
- [ ] Post preview shows final Instagram appearance
- [ ] Can edit scheduled posts
- [ ] Can delete scheduled posts
- [ ] Post status visible (scheduled, published, failed)
- [ ] Can reschedule via drag-and-drop

---

### FE-007: Analytics Dashboard
**Priority:** P1 (High)
**Effort:** 6 hours
**Day:** 11
**Dependencies:** FE-003, IG-007

**Description:**
Build analytics dashboard with charts and performance metrics.

**Tasks:**
1. Create analytics page layout
2. Create overview metrics cards
3. Add engagement chart (Recharts)
4. Add follower growth chart
5. Create top posts table
6. Add date range selector
7. Implement data export functionality

**Files to Create:**
- `/frontend/src/app/(dashboard)/analytics/page.tsx`
- `/frontend/src/components/analytics/OverviewCard.tsx`
- `/frontend/src/components/analytics/EngagementChart.tsx`
- `/frontend/src/components/analytics/FollowerGrowthChart.tsx`
- `/frontend/src/components/analytics/TopPostsTable.tsx`
- `/frontend/src/components/analytics/DateRangeSelector.tsx`

**Charts:**
- Engagement rate trend (line chart)
- Follower growth (area chart)
- Post performance (bar chart)

**Acceptance Criteria:**
- [ ] Analytics page renders with metrics
- [ ] Charts display real data from API
- [ ] Date range selector filters data
- [ ] Overview cards show account-level metrics
- [ ] Top posts table sorted by engagement
- [ ] Can export data to CSV
- [ ] Charts responsive on mobile

---

### FE-008: Client Account Management
**Priority:** P1 (High)
**Effort:** 5 hours
**Day:** 8
**Dependencies:** FE-003, IG-002

**Description:**
Build UI for managing connected Instagram accounts.

**Tasks:**
1. Create clients/accounts page
2. Create account card component
3. Add "Connect Instagram Account" button (OAuth flow)
4. Display account metadata (username, followers, profile pic)
5. Add disconnect account functionality
6. Show account status (active, token_expired)
7. Handle OAuth callback redirect

**Files to Create:**
- `/frontend/src/app/(dashboard)/clients/page.tsx`
- `/frontend/src/components/clients/ClientList.tsx`
- `/frontend/src/components/clients/ClientCard.tsx`
- `/frontend/src/components/clients/ConnectAccountButton.tsx`

**Acceptance Criteria:**
- [ ] Clients page displays connected accounts
- [ ] "Connect Instagram" button initiates OAuth
- [ ] OAuth callback handled and account connected
- [ ] Account metadata displayed (username, profile pic, followers)
- [ ] Can disconnect account
- [ ] Account status shown (active, expired)
- [ ] Empty state when no accounts connected

---

### FE-009: Settings Page
**Priority:** P2 (Medium)
**Effort:** 4 hours
**Day:** 12
**Dependencies:** FE-003, BE-005

**Description:**
Build user settings page for profile, preferences, and notifications.

**Tasks:**
1. Create settings page layout (tabs or sections)
2. Create profile section (name, email, password change)
3. Create preferences section (language, timezone)
4. Create notification preferences section
5. Add save/cancel functionality
6. Show success/error toast on save

**Files to Create:**
- `/frontend/src/app/(dashboard)/settings/page.tsx`
- `/frontend/src/components/settings/ProfileSettings.tsx`
- `/frontend/src/components/settings/PreferencesSettings.tsx`
- `/frontend/src/components/settings/NotificationSettings.tsx`

**Acceptance Criteria:**
- [ ] Settings page renders with sections
- [ ] Can update profile (name, email)
- [ ] Can change password
- [ ] Can update preferences (language, timezone)
- [ ] Can toggle notification preferences
- [ ] Changes saved to backend
- [ ] Success/error toast displayed

---

### FE-010: WebSocket Real-time Updates
**Priority:** P0 (Critical Path)
**Effort:** 4 hours
**Day:** 10
**Dependencies:** FE-005, IG-005

**Description:**
Implement WebSocket connection for real-time message updates and notifications.

**Tasks:**
1. Create WebSocket client service (Socket.io)
2. Connect to backend WebSocket server on auth
3. Listen for `message:new` events
4. Update inbox UI when new message received
5. Show toast notification for new messages
6. Handle reconnection on disconnect
7. Clean up connection on logout

**Files to Create:**
- `/frontend/src/lib/websocket.ts`
- `/frontend/src/hooks/useWebSocket.ts`
- `/frontend/src/contexts/WebSocketContext.tsx`

**Events to Handle:**
- `message:new` - New message received
- `message:read` - Message marked as read
- `post:published` - Scheduled post published
- `post:failed` - Scheduled post failed

**Acceptance Criteria:**
- [ ] WebSocket connection established on login
- [ ] New messages appear in inbox in real-time
- [ ] Toast notification shown for new messages
- [ ] Automatic reconnection on disconnect
- [ ] Connection closed on logout
- [ ] Connection status indicator (optional)

---

### FE-011: Loading States and Error Handling
**Priority:** P1 (High)
**Effort:** 3 hours
**Day:** 11
**Dependencies:** FE-001

**Description:**
Implement consistent loading states and error handling across the app.

**Tasks:**
1. Create loading skeleton components (Shadcn Skeleton)
2. Add loading states to all data-fetching components
3. Create error boundary component
4. Add error states with retry functionality
5. Create empty states for no data scenarios
6. Add global error toast notifications
7. Handle network errors gracefully

**Files to Create:**
- `/frontend/src/components/ui/loading-skeleton.tsx`
- `/frontend/src/components/errors/ErrorBoundary.tsx`
- `/frontend/src/components/errors/ErrorState.tsx`
- `/frontend/src/components/errors/EmptyState.tsx`

**Acceptance Criteria:**
- [ ] Loading skeletons shown while fetching data
- [ ] Error boundaries catch runtime errors
- [ ] Error states display with retry button
- [ ] Empty states shown when no data available
- [ ] Network errors show user-friendly messages
- [ ] Can retry failed requests

---

### FE-012: Responsive Design & Mobile Optimization
**Priority:** P2 (Medium)
**Effort:** 4 hours
**Day:** 12
**Dependencies:** FE-003, FE-005, FE-006

**Description:**
Optimize UI for mobile and tablet devices with responsive design.

**Tasks:**
1. Test all pages on mobile (375px - 768px)
2. Adjust layouts for mobile breakpoints
3. Optimize sidebar for mobile (collapsible drawer)
4. Test touch interactions (buttons, forms)
5. Optimize images for mobile (lazy loading)
6. Test performance on mobile devices
7. Add PWA manifest (optional)

**Breakpoints (Tailwind):**
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

**Acceptance Criteria:**
- [ ] All pages responsive on mobile (375px+)
- [ ] Sidebar collapses on mobile
- [ ] Forms usable on mobile
- [ ] Images lazy load on mobile
- [ ] Touch interactions smooth
- [ ] Performance acceptable on mobile (Lighthouse score > 80)

---

## Domain 5: Background Workers

### WORKER-001: Post Publishing Worker (BullMQ)
**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 10
**Dependencies:** IG-006, INFRA-004

**Description:**
Implement BullMQ worker for publishing scheduled Instagram posts at the scheduled time.

**Tasks:**
1. Create BullMQ queue (`post-publishing-queue`)
2. Create worker process file
3. Implement post publishing job handler
4. Fetch post and media from database/MinIO
5. Call Instagram Graph API to publish
6. Update post status (published or failed)
7. Implement retry logic (max 3 retries, exponential backoff)
8. Notify user via WebSocket on success/failure

**Files to Create:**
- `/backend/src/workers/post-publisher.worker.ts`
- `/backend/src/modules/content/queues/post-publishing.queue.ts`
- `/backend/Dockerfile.worker`

**Job Processing Flow:**
1. Fetch post from database
2. Download media from MinIO
3. Call Instagram Graph API
4. Update post status
5. Notify user

**Acceptance Criteria:**
- [ ] Worker processes jobs from queue
- [ ] Posts published to Instagram successfully
- [ ] Post status updated in database
- [ ] Retry logic working (max 3 retries)
- [ ] User notified via WebSocket
- [ ] Failed posts marked with error details
- [ ] Worker runs in Docker container

---

### WORKER-002: Webhook Processing Worker
**Priority:** P0 (Critical Path)
**Effort:** 5 hours
**Day:** 10
**Dependencies:** IG-005, INFRA-004

**Description:**
Implement BullMQ worker for processing Instagram webhook events asynchronously.

**Tasks:**
1. Create BullMQ queue (`webhook-processing-queue`)
2. Create worker process file
3. Implement webhook event handler
4. Process different event types (messages, mentions, comments)
5. Store new messages in database
6. Trigger WebSocket notification to user
7. Handle duplicate events (idempotency)

**Files to Create:**
- `/backend/src/workers/webhook-processor.worker.ts`
- `/backend/src/modules/instagram/queues/webhook-processing.queue.ts`

**Event Types:**
- `messages` - Store message, notify user
- `mentions` - Store mention, notify user
- `comments` - Store comment, notify user

**Acceptance Criteria:**
- [ ] Worker processes webhook events from queue
- [ ] Messages stored in database
- [ ] User notified in real-time via WebSocket
- [ ] Idempotency prevents duplicate processing
- [ ] Different event types handled correctly
- [ ] High concurrency (5 workers)
- [ ] Processing time < 1 second per event

---

### WORKER-003: Analytics Refresh Worker
**Priority:** P1 (High)
**Effort:** 5 hours
**Day:** 11
**Dependencies:** IG-007, INFRA-004

**Description:**
Implement scheduled worker to refresh Instagram analytics daily.

**Tasks:**
1. Create BullMQ queue (`analytics-refresh-queue`)
2. Create worker process file
3. Implement analytics refresh job
4. Fetch insights from Instagram Graph API
5. Store snapshots in database
6. Schedule job to run daily at 2 AM (user timezone)
7. Handle rate limits gracefully

**Files to Create:**
- `/backend/src/workers/analytics-refresher.worker.ts`
- `/backend/src/modules/analytics/queues/analytics-refresh.queue.ts`

**Metrics to Refresh:**
- Account-level: followers, reach, impressions, profile_views
- Post-level: likes, comments, shares, saves, reach, impressions

**Acceptance Criteria:**
- [ ] Worker scheduled to run daily at 2 AM
- [ ] Analytics fetched from Instagram API
- [ ] Snapshots stored in database
- [ ] Handles multiple accounts efficiently
- [ ] Rate limits respected
- [ ] Failed fetches retried later
- [ ] User notified on completion (optional)

---

### WORKER-004: Email Notification Worker
**Priority:** P2 (Medium)
**Effort:** 4 hours
**Day:** 12
**Dependencies:** INFRA-004

**Description:**
Implement worker for sending transactional emails via SendGrid/Mailgun.

**Tasks:**
1. Create BullMQ queue (`email-queue`)
2. Create worker process file
3. Integrate SendGrid/Mailgun API
4. Create email templates (welcome, password reset, etc.)
5. Implement email sending job handler
6. Track email delivery status
7. Handle bounces and failures

**Files to Create:**
- `/backend/src/workers/email-sender.worker.ts`
- `/backend/src/modules/notification/queues/email.queue.ts`
- `/backend/src/modules/notification/templates/welcome.html`
- `/backend/src/modules/notification/templates/password-reset.html`

**Email Templates:**
- Welcome email (after registration)
- Password reset
- Post published confirmation
- Post failed alert

**Acceptance Criteria:**
- [ ] Worker sends emails via SendGrid/Mailgun
- [ ] Templates rendered with user data
- [ ] Email delivery tracked
- [ ] Bounces and failures logged
- [ ] Retry logic for transient failures
- [ ] Rate limiting respected (SendGrid limits)

---

## Domain 6: Testing & Deployment

### TEST-001: Unit Tests for Core Services
**Priority:** P1 (High)
**Effort:** 8 hours
**Day:** 13
**Dependencies:** BE-004, BE-005, IG-003

**Description:**
Write unit tests for critical backend services (auth, user, Instagram API).

**Tasks:**
1. Set up Jest testing framework
2. Create test database setup/teardown
3. Write tests for AuthService
4. Write tests for UserService
5. Write tests for InstagramApiService
6. Mock external API calls
7. Achieve >80% code coverage for core services

**Files to Create:**
- `/backend/src/modules/auth/auth.service.spec.ts`
- `/backend/src/modules/user/user.service.spec.ts`
- `/backend/src/modules/instagram/instagram-api.service.spec.ts`
- `/backend/test/setup.ts`

**Test Cases:**
- Auth: registration, login, JWT validation, password hashing
- User: CRUD operations, preferences, data export
- Instagram API: OAuth flow, token refresh, API calls

**Acceptance Criteria:**
- [ ] Unit tests run with `npm test`
- [ ] All tests passing
- [ ] Code coverage > 80% for core services
- [ ] Mocks for external dependencies (Instagram API, database)
- [ ] Test database created/destroyed for each test
- [ ] CI runs tests on every PR

---

### TEST-002: Integration Tests for API Endpoints
**Priority:** P1 (High)
**Effort:** 6 hours
**Day:** 13
**Dependencies:** BE-004, IG-004, IG-006

**Description:**
Write integration tests for critical API endpoints using Supertest.

**Tasks:**
1. Set up Supertest for API testing
2. Create test fixtures (users, accounts, messages)
3. Write tests for auth endpoints (/auth/login, /auth/register)
4. Write tests for message endpoints (/messages)
5. Write tests for post endpoints (/posts)
6. Test authorization checks
7. Test error scenarios (401, 403, 404, 500)

**Files to Create:**
- `/backend/test/auth.e2e-spec.ts`
- `/backend/test/messages.e2e-spec.ts`
- `/backend/test/posts.e2e-spec.ts`
- `/backend/test/fixtures/users.fixture.ts`

**Acceptance Criteria:**
- [ ] Integration tests run with `npm run test:e2e`
- [ ] All endpoints tested (happy path + errors)
- [ ] Authorization checks tested
- [ ] Database state verified after operations
- [ ] Tests isolated (no shared state)
- [ ] CI runs integration tests on every PR

---

### TEST-003: Frontend Component Tests
**Priority:** P2 (Medium)
**Effort:** 4 hours
**Day:** 13
**Dependencies:** FE-002, FE-005

**Description:**
Write component tests for critical frontend components using React Testing Library.

**Tasks:**
1. Set up Jest and React Testing Library
2. Write tests for LoginForm component
3. Write tests for MessageList component
4. Write tests for PostScheduler component
5. Mock API calls with MSW (Mock Service Worker)
6. Test user interactions (clicks, form submissions)

**Files to Create:**
- `/frontend/src/components/auth/LoginForm.test.tsx`
- `/frontend/src/components/inbox/MessageList.test.tsx`
- `/frontend/src/components/content/PostScheduler.test.tsx`
- `/frontend/src/test/mocks/handlers.ts` (MSW)

**Acceptance Criteria:**
- [ ] Component tests run with `npm test`
- [ ] All tests passing
- [ ] User interactions tested (clicks, input)
- [ ] API calls mocked with MSW
- [ ] Accessibility tests included (ARIA labels)
- [ ] CI runs tests on every PR

---

### DEPLOY-001: Staging Environment Deployment
**Priority:** P1 (High)
**Effort:** 4 hours
**Day:** 14
**Dependencies:** INFRA-012

**Description:**
Deploy application to staging environment for pre-production testing.

**Tasks:**
1. Create staging branch in Git
2. Configure staging environment variables
3. Deploy backend to staging VPS
4. Deploy frontend to staging VPS
5. Run database migrations on staging
6. Configure staging domain (staging.example.com)
7. Smoke test all critical flows

**Staging Checklist:**
- [ ] Backend accessible at staging API URL
- [ ] Frontend accessible at staging URL
- [ ] Database migrations applied
- [ ] Can register and login
- [ ] Can connect Instagram account
- [ ] Can view inbox
- [ ] Can schedule post
- [ ] Analytics dashboard working

**Acceptance Criteria:**
- [ ] Staging environment fully deployed
- [ ] All services running in Docker
- [ ] Smoke tests passing
- [ ] Staging domain configured with SSL
- [ ] Can test OAuth flow (Instagram app in sandbox)
- [ ] Staging data separate from production

---

### DEPLOY-002: Production Environment Setup
**Priority:** P0 (Critical Path)
**Effort:** 6 hours
**Day:** 14-15
**Dependencies:** DEPLOY-001, INFRA-007, INFRA-008

**Description:**
Set up production environment on Hostinger VPS with SSL, monitoring, and backups.

**Tasks:**
1. Configure production environment variables
2. Set up production domain DNS (Cloudflare)
3. Obtain SSL certificates (Let's Encrypt)
4. Configure Nginx with SSL
5. Deploy backend and frontend to production
6. Run database migrations on production
7. Configure monitoring and alerting
8. Set up automated backups

**Production Checklist:**
- [ ] Domain configured with Cloudflare
- [ ] SSL certificates installed and working
- [ ] Backend deployed and running
- [ ] Frontend deployed and running
- [ ] Database migrations applied
- [ ] Monitoring dashboards active
- [ ] Backups scheduled and tested
- [ ] Meta app approved for production use

**Acceptance Criteria:**
- [ ] Production accessible at https://app.example.com
- [ ] SSL/TLS working (A+ rating)
- [ ] All services running and healthy
- [ ] Monitoring dashboards showing metrics
- [ ] Backups running automatically
- [ ] Can onboard real users
- [ ] OAuth flow working with real Instagram accounts

---

### DEPLOY-003: Performance Optimization
**Priority:** P2 (Medium)
**Effort:** 4 hours
**Day:** 15
**Dependencies:** DEPLOY-002

**Description:**
Optimize application performance for production use.

**Tasks:**
1. Run Lighthouse audit on frontend
2. Optimize image sizes and formats (WebP)
3. Enable Nginx gzip compression
4. Configure browser caching headers
5. Optimize database queries (add indexes)
6. Enable Redis caching for frequently accessed data
7. Minify and compress frontend assets

**Performance Targets:**
- Lighthouse Performance score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- API response time < 500ms (95th percentile)

**Acceptance Criteria:**
- [ ] Lighthouse score > 90
- [ ] Images optimized and lazy-loaded
- [ ] Gzip compression enabled
- [ ] Caching headers configured
- [ ] Database queries optimized
- [ ] Redis caching enabled
- [ ] Bundle size minimized

---

### DEPLOY-004: Production Monitoring and Alerts
**Priority:** P1 (High)
**Effort:** 3 hours
**Day:** 15
**Dependencies:** DEPLOY-002, INFRA-009

**Description:**
Configure production monitoring alerts and dashboards.

**Tasks:**
1. Configure critical alerts (P0 - server down, database down)
2. Configure high-priority alerts (P1 - high error rate, slow response)
3. Set up email notifications for alerts
4. Create operational dashboard in Grafana
5. Create business metrics dashboard
6. Test alert firing and notifications
7. Document on-call procedures

**Critical Alerts:**
- VPS unreachable
- Docker container down
- Database unreachable
- Error rate > 10%
- Disk usage > 95%

**Acceptance Criteria:**
- [ ] Prometheus alerts configured
- [ ] Email notifications working
- [ ] Grafana dashboards created
- [ ] Test alerts firing correctly
- [ ] On-call procedures documented
- [ ] Alert fatigue minimized (only critical alerts)

---

### DEPLOY-005: Documentation and Handoff
**Priority:** P2 (Medium)
**Effort:** 4 hours
**Day:** 15
**Dependencies:** DEPLOY-002

**Description:**
Create comprehensive documentation for deployment, operations, and troubleshooting.

**Tasks:**
1. Document deployment process (step-by-step)
2. Create runbook for common operations
3. Document disaster recovery procedures
4. Create API documentation (Swagger)
5. Document architecture decisions (ADRs)
6. Create troubleshooting guide
7. Document monitoring and alerting

**Documents to Create:**
- `/docs/deployment.md`
- `/docs/runbook.md`
- `/docs/disaster-recovery.md`
- `/docs/troubleshooting.md`
- `/docs/architecture.md`
- `/docs/api.md` (link to Swagger)

**Acceptance Criteria:**
- [ ] Deployment process documented
- [ ] Runbook covers common operations
- [ ] Disaster recovery procedures tested
- [ ] API documentation complete (Swagger)
- [ ] Architecture documented (diagrams + ADRs)
- [ ] Troubleshooting guide covers common issues

---

## Critical Path Timeline

### Day 1: Infrastructure Foundation
**Tasks:** INFRA-001, INFRA-002
**Goal:** VPS provisioned with Docker Compose stack running
**Milestone:** Can run `docker-compose up -d` successfully

---

### Day 2: Data Layer Setup
**Tasks:** INFRA-003, INFRA-004, INFRA-005, BE-001
**Goal:** Database, Redis, MinIO operational; Backend boilerplate running
**Milestone:** Backend can connect to database and cache

---

### Day 3: Core Backend & Infrastructure
**Tasks:** BE-002, BE-003, INFRA-006, INFRA-009
**Goal:** Repository pattern, migrations, Nginx proxy, monitoring
**Milestone:** Can run migrations and access backend through Nginx

---

### Day 4: Authentication
**Tasks:** BE-004, BE-008
**Goal:** User registration and login working
**Milestone:** Can register, login, and receive JWT token

---

### Day 5: User Management & Frontend Init
**Tasks:** BE-005, BE-006, FE-001, FE-002 (start)
**Goal:** User profile API ready; Frontend boilerplate with auth pages
**Milestone:** Frontend login page can call backend login API

---

### Day 6: Instagram OAuth & Frontend Auth
**Tasks:** IG-001, FE-002 (complete), BE-007
**Goal:** Instagram OAuth flow working; Frontend login/register complete
**Milestone:** Can connect Instagram account via OAuth

---

### Day 7: Instagram Accounts & Dashboard Layout
**Tasks:** IG-002, IG-003, FE-003, FE-004
**Goal:** Instagram accounts management; Dashboard UI ready
**Milestone:** Can see connected Instagram accounts in UI

---

### Day 8: Messages & Client Management
**Tasks:** IG-004, IG-005, FE-005 (start), FE-008
**Goal:** Instagram DMs working; Webhook endpoint ready
**Milestone:** Can view Instagram DMs in backend and frontend

---

### Day 9: Post Scheduling & Analytics
**Tasks:** IG-006, IG-007, FE-005 (complete)
**Goal:** Post scheduling backend; Analytics API ready; Inbox UI complete
**Milestone:** Can schedule Instagram posts; Can view analytics

---

### Day 10: Workers & Real-time
**Tasks:** WORKER-001, WORKER-002, FE-006 (start), FE-010
**Goal:** Background workers processing jobs; WebSocket real-time updates
**Milestone:** Scheduled posts publish automatically; Real-time inbox updates

---

### Day 11: Content Calendar & Analytics UI
**Tasks:** FE-006 (complete), FE-007, FE-011, WORKER-003, INFRA-010
**Goal:** Calendar UI ready; Analytics dashboard complete; Logging setup
**Milestone:** Can schedule posts from calendar UI; Analytics visible

---

### Day 12: Settings & Email
**Tasks:** FE-009, FE-012, WORKER-004, INFRA-012
**Goal:** Settings page; Mobile optimization; Email worker; CI/CD pipeline
**Milestone:** All frontend pages complete and responsive

---

### Day 13: SSL, CDN, & Testing
**Tasks:** INFRA-007, INFRA-008, TEST-001, TEST-002, TEST-003
**Goal:** SSL certificates; Cloudflare CDN; Comprehensive testing
**Milestone:** Production-ready infrastructure; Tests passing

---

### Day 14: Staging & Backups
**Tasks:** DEPLOY-001, INFRA-011, DEPLOY-002 (start)
**Goal:** Staging deployment; Backup system; Production setup
**Milestone:** Staging environment live and tested

---

### Day 15: Production Launch
**Tasks:** DEPLOY-002 (complete), DEPLOY-003, DEPLOY-004, DEPLOY-005
**Goal:** Production deployment; Optimization; Monitoring; Documentation
**Milestone:** 🚀 **MVP LIVE IN PRODUCTION**

---

## Risk Mitigation

### Risk 1: Instagram API Rate Limits
**Impact:** High
**Probability:** Medium

**Mitigation:**
- Implement request queuing with BullMQ
- Track rate limit headers from Instagram API
- Cache frequently accessed data (Redis, 1 hour TTL)
- Implement exponential backoff on rate limit errors
- Per-user quotas to prevent abuse

---

### Risk 2: OAuth Token Expiration
**Impact:** High
**Probability:** High

**Mitigation:**
- Automatic token refresh 7 days before expiration
- Daily background job to check token expiry
- User notification when token expires
- Clear UI to reconnect account
- Graceful handling of expired tokens

---

### Risk 3: VPS Resource Exhaustion
**Impact:** Critical
**Probability:** Low

**Mitigation:**
- Resource limits in Docker Compose (CPU, memory)
- Monitoring alerts at 80% CPU/memory usage
- Prometheus dashboards for resource tracking
- Documented upgrade path to larger VPS
- Horizontal scaling plan (multiple VPS)

---

### Risk 4: Meta App Review Delays
**Impact:** High
**Probability:** Medium

**Mitigation:**
- Submit Meta app for review early (Day 6-7)
- Use sandbox mode for development and testing
- Prepare all required materials (privacy policy, terms, demo video)
- Have contingency plan for review rejection
- Build with standard permissions only (avoid advanced permissions)

---

### Risk 5: Database Performance Degradation
**Impact:** High
**Probability:** Low

**Mitigation:**
- Proper indexing on frequently queried columns
- Connection pooling (max 20 connections)
- Read replica for analytics queries (when needed)
- Regular vacuum and analyze (nightly cron)
- Monitoring of slow queries (> 1 second)

---

### Risk 6: Scope Creep (Feature Bloat)
**Impact:** Critical
**Probability:** High

**Mitigation:**
- **Strict adherence to MVP scope** (Instagram only, Phase 1)
- Defer all Phase 2 features (WhatsApp, AI, teams)
- Prioritize P0 and P1 tasks only
- Timeboxing for each task (max 8 hours)
- Daily progress review against timeline

---

### Risk 7: WebSocket Connection Issues
**Impact:** Medium
**Probability:** Medium

**Mitigation:**
- Automatic reconnection logic (Socket.io built-in)
- Fallback to long polling if WebSocket fails
- Health check endpoint for connection status
- Connection timeout handling (30 seconds)
- Graceful degradation (fall back to API polling)

---

### Risk 8: Backup Failure
**Impact:** Critical
**Probability:** Low

**Mitigation:**
- Automated daily backups with cron
- Backup verification (test restoration monthly)
- Offsite backup storage (Backblaze B2 / S3)
- Multiple backup retention periods (7 days, 30 days, 12 months)
- Documented disaster recovery procedures

---

## Post-MVP Enhancements

### Phase 2: WhatsApp Business Integration (7-10 days)

**High-Level Tasks:**
1. WhatsApp Business API setup and verification
2. WhatsApp OAuth flow implementation
3. WhatsApp message retrieval and sending
4. Template message management
5. 24-hour messaging window enforcement
6. Compliance tracking (quality rating)
7. Cost tracking and billing integration

**Estimated Effort:** 7-10 days
**Dependencies:** MVP launched successfully

---

### Phase 3: Team Collaboration (5-7 days)

**High-Level Tasks:**
1. Team and workspace management
2. Role-based access control (owner, manager, editor, viewer)
3. Invite team members
4. Permission management
5. Activity logs and audit trails
6. Team analytics dashboards

**Estimated Effort:** 5-7 days
**Dependencies:** User feedback from MVP

---

### Phase 4: AI Features (10-14 days)

**High-Level Tasks:**
1. OpenAI API integration
2. Content suggestion service (GPT-4)
3. Auto-response templates (GPT-4)
4. Sentiment analysis for messages
5. Hashtag recommendations
6. Best time to post predictions
7. AI cost tracking and quotas

**Estimated Effort:** 10-14 days
**Dependencies:** Sufficient user base (>100 users)

---

### Phase 5: Advanced Analytics (7-10 days)

**High-Level Tasks:**
1. Data warehouse setup (Redshift or BigQuery)
2. Custom report builder
3. Scheduled reports (PDF, Excel)
4. Comparative analytics (period-over-period)
5. Competitor benchmarking
6. Export to Google Sheets/Excel
7. Advanced visualizations (heatmaps, funnels)

**Estimated Effort:** 7-10 days
**Dependencies:** Analytics data volume (>1,000 posts)

---

### Phase 6: Mobile App (20-30 days)

**High-Level Tasks:**
1. React Native project setup
2. Shared authentication with web
3. Push notifications (FCM/APNs)
4. Offline mode support
5. Camera integration for media upload
6. App Store / Play Store submission
7. Mobile-specific optimizations

**Estimated Effort:** 20-30 days
**Dependencies:** Strong web app usage

---

## Appendix: Task Dependency Graph

```
INFRA-001 (VPS Setup)
    ↓
INFRA-002 (Docker Compose)
    ↓
    ├─→ INFRA-003 (PostgreSQL) ─→ BE-002 (Repositories) ─→ BE-003 (Migrations)
    │                                   ↓
    │                               BE-004 (Auth) ─→ BE-005 (User) ─→ BE-006 (Session)
    │                                   ↓                   ↓
    │                               IG-001 (OAuth) ─→ IG-002 (Accounts) ─→ IG-003 (API Wrapper)
    │                                   ↓                                       ↓
    │                               IG-004 (Messages) ←───────────────────────┘
    │                                   ↓
    │                               IG-005 (Webhooks) ─→ WORKER-002 (Webhook Processor)
    │                                   ↓
    │                               IG-006 (Scheduling) ─→ WORKER-001 (Post Publisher)
    │                                   ↓
    │                               IG-007 (Analytics) ─→ WORKER-003 (Analytics Refresh)
    │
    ├─→ INFRA-004 (Redis) ─→ BE-006 (Session) ─→ WORKER-001, WORKER-002, WORKER-003
    │
    ├─→ INFRA-005 (MinIO) ─→ IG-006 (Scheduling)
    │
    ├─→ INFRA-006 (Nginx)
    │
    ├─→ INFRA-009 (Prometheus/Grafana) ─→ INFRA-010 (Loki/Promtail)
    │
    ├─→ BE-001 (NestJS Init) ─→ BE-004, BE-008 (Error Handling)
    │
    └─→ FE-001 (Next.js Init) ─→ FE-002 (Auth Pages)
                                    ↓
                                FE-003 (Dashboard Layout)
                                    ↓
                                    ├─→ FE-004 (Dashboard)
                                    ├─→ FE-005 (Inbox) ─→ FE-010 (WebSocket)
                                    ├─→ FE-006 (Calendar)
                                    ├─→ FE-007 (Analytics)
                                    ├─→ FE-008 (Clients)
                                    └─→ FE-009 (Settings)
                                        ↓
                                    FE-011 (Loading/Errors)
                                        ↓
                                    FE-012 (Responsive)

INFRA-007 (SSL) + INFRA-008 (Cloudflare) ─→ DEPLOY-002 (Production)
                                                ↓
INFRA-011 (Backups) ─────────────────────────┘
                                                ↓
INFRA-012 (CI/CD) ─────────────────────────→ DEPLOY-001 (Staging) ─→ DEPLOY-002
                                                                        ↓
TEST-001, TEST-002, TEST-003 ──────────────────────────────────────→ DEPLOY-003 (Optimization)
                                                                        ↓
                                                                    DEPLOY-004 (Monitoring)
                                                                        ↓
                                                                    DEPLOY-005 (Docs)
```

---

## Conclusion

This implementation plan provides a **comprehensive, step-by-step roadmap** for building the Social Selling Platform MVP in **15 days**. The plan is designed for:

✅ **Single Developer Execution**: Tasks sized for manageable increments
✅ **Clear Dependencies**: Task dependency chains prevent bottlenecks
✅ **Parallel Development**: Frontend/Backend can proceed concurrently after Day 3
✅ **Risk Mitigation**: Identified risks with concrete mitigation strategies
✅ **Quality Assurance**: Testing integrated throughout development
✅ **Production-Ready**: Deployment, monitoring, and documentation included

### Success Metrics

**Technical Success:**
- All 68 tasks completed on schedule
- Test coverage > 80% for core services
- Lighthouse performance score > 90
- Infrastructure costs < $50/month
- Zero P0 security vulnerabilities

**Business Success:**
- First 10 users onboarded successfully
- Instagram DMs working in real-time
- Post scheduling working without failures
- User can complete core workflow end-to-end
- Positive user feedback on usability

### Next Steps

1. **Review and approve** implementation plan with stakeholders
2. **Set up development environment** (Day 1 morning)
3. **Begin Phase A: Foundation** (Day 1)
4. **Daily standup** to track progress against timeline
5. **Weekly retrospective** to adjust plan as needed

---

**Plan Status:** ✅ **READY FOR EXECUTION**
**Document Prepared By:** Implementation Planning Specialist
**Last Updated:** 2025-10-18
**Timeline:** 15 Days (MVP Phase 1)
**Architecture Reference:** `/Users/williansanches/projects/personal/social-selling-2/tasks/social-selling/architecture-design.md`
