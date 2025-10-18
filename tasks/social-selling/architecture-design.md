# Architecture Design Document: Social Selling Platform

**Document Version:** 1.0
**Date:** 2025-10-18
**Project:** Social Selling Platform for Instagram & WhatsApp Business
**Status:** Design Complete - Ready for Implementation
**Architecture Lead:** Senior Systems Architect

---

## Executive Summary

This document presents the comprehensive technical architecture for the Social Selling Platform, a SaaS application designed for individual social sellers managing multiple client accounts across Instagram and WhatsApp Business. The architecture prioritizes rapid MVP delivery (15 days), cost efficiency ($200/month infrastructure budget), scalability to 500 users in Year 1, and maintainability by a single founder-led team.

### Key Architecture Decisions

1. **Monolithic-First Approach** with modular design for future service extraction
2. **Event-Driven Architecture** for real-time messaging and background job processing
3. **PostgreSQL** as primary data store with Redis for caching and session management
4. **Hostinger VPS + Docker Infrastructure** providing full control with minimal operational overhead
5. **API-First Design** enabling future mobile app and third-party integrations

### Architecture Highlights

- **Response Time:** <2 seconds for user interactions, <500ms for API calls (95th percentile)
- **Scalability:** Horizontal scaling to support 500+ concurrent users
- **Availability:** 99.9% uptime target
- **Security:** End-to-end encryption, GDPR/LGPD/CCPA compliance
- **Cost Efficiency:** Initial infrastructure costs ~$18-41/month (90% cheaper than cloud managed services)

---

## 1. Architecture Alternatives Considered

### Alternative 1: Serverless-First Architecture

#### Overview
Fully serverless architecture using AWS Lambda, API Gateway, DynamoDB, and S3.

#### Components
- **Frontend:** Next.js hosted on Vercel
- **API Layer:** AWS API Gateway + Lambda functions
- **Database:** DynamoDB for NoSQL storage
- **File Storage:** S3 for media
- **Background Jobs:** Lambda + EventBridge/SQS
- **Authentication:** AWS Cognito

#### Advantages
- Minimal operational overhead - no server management
- Auto-scaling built-in at function level
- Pay-per-execution pricing (potentially lower costs at low scale)
- Fast deployment and iteration
- High availability by default

#### Disadvantages
- **Cold start latency** (300ms-1s) impacts user experience
- **Complex debugging** and local development challenges
- **DynamoDB learning curve** and query limitations
- **Lambda timeout limits** (15 minutes max) constrain long-running tasks
- **Vendor lock-in** to AWS ecosystem
- **Cost unpredictability** at scale (can become expensive with high traffic)
- **Limited WebSocket support** compared to traditional servers
- **Difficulty with complex transactions** across DynamoDB tables

#### Cost Estimate
- **Low traffic (0-100 users):** $50-80/month
- **Medium traffic (500 users):** $200-400/month (unpredictable)

#### Decision
**REJECTED** - While serverless offers operational simplicity, the cold start latency, DynamoDB complexity, and cost unpredictability make it unsuitable for a real-time messaging platform requiring sub-2-second response times.

---

### Alternative 2: Microservices Architecture

#### Overview
Distributed microservices architecture with separate services for authentication, messaging, content scheduling, analytics, and notifications.

#### Components
- **Frontend:** Next.js on AWS EC2/ECS
- **Services:**
  - Auth Service (NestJS)
  - Instagram Integration Service (NestJS)
  - WhatsApp Integration Service (NestJS - Phase 2)
  - Message Service (NestJS)
  - Content Service (NestJS)
  - Analytics Service (NestJS)
  - Notification Service (NestJS)
- **Database:** PostgreSQL per service (or shared with schemas)
- **Service Mesh:** AWS App Mesh or Istio
- **API Gateway:** Kong or AWS API Gateway
- **Message Queue:** RabbitMQ or AWS SQS

#### Advantages
- **Independent scaling** of services based on load
- **Technology flexibility** (different languages/frameworks per service)
- **Team autonomy** (when team grows)
- **Fault isolation** - one service failure doesn't crash entire system
- **Independent deployment** of services
- **Clear service boundaries** and responsibilities

#### Disadvantages
- **Extreme complexity** for single-developer team
- **Operational overhead** managing multiple services, databases, deployments
- **Distributed system challenges** (network latency, service discovery, distributed transactions)
- **Higher infrastructure costs** (more servers, load balancers, message queues)
- **Debugging complexity** across service boundaries
- **Over-engineering** for MVP scale (500 users Year 1)
- **Longer development time** (incompatible with 15-day MVP timeline)
- **Network overhead** between services adds latency

#### Cost Estimate
- **Infrastructure:** $400-600/month minimum (multiple servers, load balancers, message queues)

#### Decision
**REJECTED** - Microservices architecture is severely over-engineered for the current scale and team size. The operational complexity, higher costs, and extended development timeline make this inappropriate for MVP. This could be reconsidered at 5,000+ users with a dedicated operations team.

---

### Alternative 3: Modular Monolith with Event-Driven Components

#### Overview
A well-structured monolithic application with clear module boundaries, event-driven architecture for asynchronous operations, and ability to extract microservices in the future.

#### Components
- **Frontend:** Next.js on Hostinger VPS + Cloudflare CDN
- **Backend:** NestJS monolith with modular architecture
  - Auth Module
  - Instagram Module
  - WhatsApp Module (Phase 2)
  - Message Module
  - Content Module
  - Analytics Module
  - User Module
- **Database:** Single PostgreSQL database with schema separation (Docker)
- **Cache:** Redis for sessions, API response caching (Docker)
- **Background Jobs:** BullMQ (Redis-based queue) for async processing
- **File Storage:** MinIO (S3-compatible) + Cloudflare CDN
- **WebSocket:** Socket.io integrated into main application

#### Advantages
- **Simpler operations** - one application to deploy and monitor
- **Faster development** - no inter-service communication overhead
- **Lower infrastructure costs** - fewer servers and services
- **Easier debugging** - single codebase, unified logging
- **ACID transactions** across modules using shared database
- **Modular structure** allows future service extraction
- **Appropriate complexity** for team size and scale
- **Predictable performance** - no network hops between services
- **Rapid iteration** suitable for MVP timeline

#### Disadvantages
- **Scaling requires scaling entire application** (not individual modules)
- **Potential for tight coupling** if module boundaries not enforced
- **Larger deployment artifact** compared to microservices
- **Shared database** could become bottleneck at extreme scale

#### Cost Estimate
- **Infrastructure:** $18-41/month (Hostinger KVM 2 VPS with all services containerized via Docker)

#### Decision
**SELECTED** - This architecture balances simplicity, cost-efficiency, and future scalability. It's appropriate for a single-developer team, meets the 15-day MVP timeline, stays well within budget, and provides a clear path to extract microservices or migrate to cloud when scale demands it (likely at 2,000+ users). The Docker + Terraform approach ensures zero vendor lock-in.

---

## 2. Chosen Architecture

### Architecture Pattern: Modular Monolith with Event-Driven Components

The selected architecture is a **modular monolith** with clear module boundaries, event-driven patterns for asynchronous operations, and a strategic path to future microservices extraction.

### Core Architectural Principles

1. **Modularity**: Clear separation of concerns with well-defined module boundaries
2. **Event-Driven**: Asynchronous processing for non-critical path operations
3. **API-First**: RESTful APIs with OpenAPI documentation
4. **Security-First**: Authentication, authorization, and encryption at every layer
5. **Scalability by Design**: Horizontal scaling capabilities from day one
6. **Cost Optimization**: Leverage managed services to minimize operational overhead
7. **Observability**: Comprehensive logging, monitoring, and alerting

### Why This Architecture Wins

#### For MVP Speed (15 days)
- Single application reduces deployment complexity
- Unified codebase accelerates development
- No inter-service communication to build and debug
- Simplified local development environment

#### For Cost Efficiency ($18-41/month)
- Minimal infrastructure: 1 VPS running all services via Docker
- Self-hosted services eliminate managed service fees
- Predictable fixed pricing (no per-request charges)
- No vendor lock-in allows migration to any provider

#### For Single Developer
- One application to build, deploy, and monitor
- Simpler debugging and testing
- Lower cognitive overhead
- Faster iteration cycles

#### For Future Growth
- Modular structure allows service extraction
- Event-driven patterns prepare for distributed systems
- Database schema separation enables future database splits
- API-first design supports mobile apps and integrations

---

## 3. System Architecture Diagram

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser<br/>React + Next.js]
        MOBILE[Future Mobile App]
    end

    subgraph "Edge Layer - Cloudflare CDN"
        CDN[Cloudflare CDN<br/>Static Assets + Media<br/>DDoS Protection]
        CF_DNS[Cloudflare DNS<br/>app-socialselling.willianbvsanches.com]
    end

    subgraph "Hostinger VPS - Docker Compose"
        NGINX[Nginx Reverse Proxy<br/>HTTPS + SSL -Let's Encrypt-<br/>Load Balancing]

        subgraph "Frontend Container"
            NEXT[Next.js Application<br/>SSR + Static Assets]
        end

        subgraph "Backend Container"
            API[REST API<br/>NestJS Controllers]
            WS[WebSocket Server<br/>Socket.io]

            subgraph "Core Modules"
                AUTH[Auth Module<br/>JWT + OAuth]
                USER[User Module<br/>Accounts & Preferences]
                MSG[Message Module<br/>Unified Inbox]
                CONTENT[Content Module<br/>Post Scheduling]
                ANALYTICS[Analytics Module<br/>Insights & Reports]
                NOTIF[Notification Module<br/>Alerts & Email]
            end

            subgraph "Integration Modules"
                IG[Instagram Module<br/>Graph API Integration]
                WA[WhatsApp Module<br/>Business Platform API]
            end
        end

        subgraph "Data Layer Containers"
            PG[(PostgreSQL 15<br/>Users, Messages, Posts<br/>Docker Container)]
            REDIS[(Redis 7<br/>Sessions + Cache<br/>BullMQ Queues)]
            MINIO[(MinIO<br/>S3-Compatible Storage<br/>Images & Videos)]
        end

        subgraph "Background Workers"
            WORKER1[BullMQ Worker 1<br/>Post Publishing]
            WORKER2[BullMQ Worker 2<br/>Webhook Processing]
            WORKER3[BullMQ Worker 3<br/>Analytics Refresh]
        end

        subgraph "Observability Stack"
            PROM[Prometheus<br/>Metrics Collection]
            GRAFANA[Grafana<br/>Dashboards & Alerts]
            LOKI[Loki<br/>Log Aggregation]
            PROMTAIL[Promtail<br/>Log Collector]
        end
    end

    subgraph "External Services"
        META[Meta Platform APIs<br/>Instagram Graph API<br/>WhatsApp Business API]
        SMTP[Email Service<br/>SendGrid/Mailgun]
        BACKUP_STORAGE[Backblaze B2 / S3<br/>Offsite Backups]
    end

    WEB -->|HTTPS| CF_DNS
    MOBILE -.->|Future| CF_DNS
    WEB -->|Static Assets| CDN

    CF_DNS --> NGINX
    CDN --> MINIO

    NGINX --> NEXT
    NGINX --> API
    NGINX --> WS

    API --> AUTH
    API --> USER
    API --> MSG
    API --> CONTENT
    API --> ANALYTICS
    API --> NOTIF

    AUTH --> PG
    USER --> PG
    MSG --> PG
    CONTENT --> PG
    ANALYTICS --> PG

    AUTH --> REDIS
    USER --> REDIS
    MSG --> REDIS

    IG --> META
    WA --> META
    IG --> PG
    WA --> PG

    MSG --> IG
    MSG --> WA
    CONTENT --> IG
    CONTENT --> WA

    CONTENT --> MINIO
    NEXT --> MINIO

    CONTENT --> REDIS
    IG --> REDIS
    WA --> REDIS
    ANALYTICS --> REDIS
    NOTIF --> REDIS

    WORKER1 --> REDIS
    WORKER2 --> REDIS
    WORKER3 --> REDIS

    WORKER1 --> IG
    WORKER1 --> WA
    WORKER1 --> PG
    WORKER2 --> PG
    WORKER3 --> PG
    WORKER3 --> SMTP

    API --> PROMTAIL
    WS --> PROMTAIL
    WORKER1 --> PROMTAIL
    WORKER2 --> PROMTAIL

    PROMTAIL --> LOKI

    API --> PROM
    WORKER1 --> PROM
    PG --> PROM
    REDIS --> PROM
    NGINX --> PROM

    PROM --> GRAFANA
    LOKI --> GRAFANA

    PG --> BACKUP_STORAGE

    classDef client fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef app fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef worker fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef external fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    classDef obs fill:#e0f2f1,stroke:#004d40,stroke-width:2px

    class WEB,MOBILE client
    class CDN,CF_DNS,NGINX edge
    class API,WS,AUTH,USER,MSG,CONTENT,ANALYTICS,NOTIF,IG,WA,NEXT app
    class PG,REDIS,MINIO data
    class WORKER1,WORKER2,WORKER3 worker
    class META,SMTP,BACKUP_STORAGE external
    class PROM,GRAFANA,LOKI,PROMTAIL obs
```

### Data Flow Architecture

```mermaid
sequenceDiagram
    participant User as User Browser
    participant Nginx as Nginx Proxy
    participant API as NestJS API
    participant Cache as Redis Cache
    participant DB as PostgreSQL
    participant Queue as BullMQ Queue
    participant Worker as BullMQ Worker
    participant Meta as Instagram API
    participant WS as WebSocket

    Note over User,Meta: 1. User Authentication Flow
    User->>Nginx: POST /auth/login
    Nginx->>API: Forward Request
    API->>DB: Validate Credentials
    DB-->>API: User Record
    API->>Cache: Store Session
    API-->>User: JWT Token + Session Cookie

    Note over User,Meta: 2. Instagram Account Connection Flow
    User->>Nginx: POST /instagram/connect
    Nginx->>API: OAuth Request
    API-->>User: Redirect to Instagram OAuth
    User->>Meta: Authorize App
    Meta-->>User: Redirect with Auth Code
    User->>Nginx: POST /instagram/callback
    Nginx->>API: Exchange Code for Token
    API->>Meta: Exchange Auth Code
    Meta-->>API: Access Token + Metadata
    API->>DB: Store Encrypted Token + Account Info
    API-->>User: Connection Success

    Note over User,Meta: 3. Message Retrieval Flow (Real-time)
    User->>Nginx: WebSocket Connect
    Nginx->>WS: Establish Connection
    WS->>Cache: Verify Session
    Meta->>Nginx: Webhook: New Message
    Nginx->>API: Forward Webhook
    API->>Queue: Add to BullMQ Queue
    API-->>Meta: 200 OK
    Queue->>Worker: Process Webhook Job
    Worker->>DB: Store Message
    Worker->>WS: Notify via Redis PubSub
    WS-->>User: Push New Message

    Note over User,Meta: 4. Post Scheduling Flow
    User->>Nginx: POST /posts/schedule
    Nginx->>API: Create Scheduled Post
    API->>DB: Store Post + Media Reference
    API->>Queue: Add Publishing Job (delayed)
    API-->>User: Post Scheduled Successfully
    Queue->>Worker: Trigger at Scheduled Time
    Worker->>DB: Fetch Post Details
    Worker->>Meta: Publish via Graph API
    Meta-->>Worker: Publish Success
    Worker->>DB: Update Post Status
    Worker->>WS: Notify via Redis PubSub
    WS-->>User: Post Published Notification

    Note over User,Meta: 5. Analytics Retrieval Flow
    User->>Nginx: GET /analytics/dashboard
    Nginx->>API: Request Analytics
    API->>Cache: Check Cache
    alt Cache Hit
        Cache-->>API: Cached Data
    else Cache Miss
        API->>DB: Query Analytics
        DB-->>API: Raw Data
        API->>API: Aggregate & Transform
        API->>Cache: Store in Cache (TTL: 1 hour)
    end
    API-->>User: Analytics Dashboard Data
```

### Network Architecture

```mermaid
graph TB
    subgraph "Public Internet"
        USERS[Users]
        META_WEBHOOKS[Meta Webhooks]
    end

    subgraph "Cloudflare"
        CF_CDN[Cloudflare CDN<br/>DDoS Protection]
        CF_DNS[DNS Management<br/>app-socialselling.willianbvsanches.com]
    end

    subgraph "Hostinger VPS - 199.247.x.x"
        subgraph "Firewall - UFW"
            UFW_RULES[Allow: 22 SSH<br/>Allow: 80 HTTP<br/>Allow: 443 HTTPS<br/>Deny: All Others]
        end

        subgraph "Docker Bridge Network - 172.20.0.0/16"
            NGINX_CONTAINER[Nginx Container<br/>172.20.0.2<br/>Ports: 80, 443]
            FRONTEND_CONTAINER[Frontend Container<br/>172.20.0.3<br/>Port: 3000]
            BACKEND_CONTAINER[Backend Container<br/>172.20.0.4<br/>Port: 4000]
            PG_CONTAINER[PostgreSQL Container<br/>172.20.0.5<br/>Port: 5432]
            REDIS_CONTAINER[Redis Container<br/>172.20.0.6<br/>Port: 6379]
            MINIO_CONTAINER[MinIO Container<br/>172.20.0.7<br/>Ports: 9000, 9001]
            WORKER_CONTAINERS[Worker Containers<br/>172.20.0.8-10<br/>BullMQ Workers]
            PROMETHEUS_CONTAINER[Prometheus<br/>172.20.0.11<br/>Port: 9090]
            GRAFANA_CONTAINER[Grafana<br/>172.20.0.12<br/>Port: 3001]
        end

        subgraph "Volume Mounts"
            PG_DATA[/var/lib/postgresql/data]
            REDIS_DATA[/data]
            MINIO_DATA[/data]
            PROM_DATA[/prometheus]
        end

        FAIL2BAN[fail2ban<br/>SSH Brute Force Protection]
        CERTBOT[Certbot<br/>Let's Encrypt SSL Auto-Renewal]
    end

    USERS -->|HTTPS| CF_CDN
    USERS -->|HTTPS| CF_DNS
    META_WEBHOOKS -->|HTTPS| CF_DNS

    CF_CDN -->|CDN Cached Assets| NGINX_CONTAINER
    CF_DNS -->|Port 443| UFW_RULES

    UFW_RULES --> NGINX_CONTAINER

    NGINX_CONTAINER -->|Proxy /| FRONTEND_CONTAINER
    NGINX_CONTAINER -->|Proxy /api| BACKEND_CONTAINER
    NGINX_CONTAINER -->|Proxy /socket.io| BACKEND_CONTAINER
    NGINX_CONTAINER -->|Proxy /media| MINIO_CONTAINER

    BACKEND_CONTAINER --> PG_CONTAINER
    BACKEND_CONTAINER --> REDIS_CONTAINER
    BACKEND_CONTAINER --> MINIO_CONTAINER

    FRONTEND_CONTAINER --> MINIO_CONTAINER

    WORKER_CONTAINERS --> PG_CONTAINER
    WORKER_CONTAINERS --> REDIS_CONTAINER
    WORKER_CONTAINERS --> MINIO_CONTAINER

    PG_CONTAINER --> PG_DATA
    REDIS_CONTAINER --> REDIS_DATA
    MINIO_CONTAINER --> MINIO_DATA
    PROMETHEUS_CONTAINER --> PROM_DATA

    BACKEND_CONTAINER -.->|Metrics| PROMETHEUS_CONTAINER
    WORKER_CONTAINERS -.->|Metrics| PROMETHEUS_CONTAINER
    PG_CONTAINER -.->|Metrics| PROMETHEUS_CONTAINER
    REDIS_CONTAINER -.->|Metrics| PROMETHEUS_CONTAINER

    GRAFANA_CONTAINER --> PROMETHEUS_CONTAINER

    FAIL2BAN -.->|Monitors| UFW_RULES
    CERTBOT -.->|Manages SSL| NGINX_CONTAINER

    classDef public fill:#ffebee,stroke:#c62828
    classDef edge fill:#fff3e0,stroke:#ef6c00
    classDef container fill:#e8f5e9,stroke:#2e7d32
    classDef data fill:#e3f2fd,stroke:#1565c0
    classDef security fill:#fce4ec,stroke:#880e4f

    class USERS,META_WEBHOOKS public
    class CF_CDN,CF_DNS edge
    class NGINX_CONTAINER,FRONTEND_CONTAINER,BACKEND_CONTAINER,WORKER_CONTAINERS,PROMETHEUS_CONTAINER,GRAFANA_CONTAINER container
    class PG_CONTAINER,REDIS_CONTAINER,MINIO_CONTAINER,PG_DATA,REDIS_DATA,MINIO_DATA,PROM_DATA data
    class UFW_RULES,FAIL2BAN,CERTBOT security
```

---

## 4. Components and Responsibilities

### 4.1 Frontend Components

#### Next.js Application
**Technology**: React 18 + Next.js 14 + TypeScript

**Responsibilities**:
- Server-side rendering for initial page loads (SEO, performance)
- Client-side routing and navigation
- State management (React Context + TanStack Query for server state)
- WebSocket client for real-time updates
- Media upload and preview
- Form validation and user input handling
- Responsive UI (mobile-first design)

**Key Pages**:
- `/login`, `/register` - Authentication
- `/dashboard` - Main dashboard with overview
- `/inbox` - Unified inbox for Instagram DMs (+ WhatsApp in Phase 2)
- `/calendar` - Content calendar view
- `/analytics` - Analytics dashboard
- `/clients` - Client account management
- `/settings` - User preferences and settings

**Component Structure**:
```
src/
├── components/
│   ├── ui/                           # Shadcn UI components (owned by project)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   └── skeleton.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── OAuthButton.tsx
│   ├── inbox/
│   │   ├── MessageList.tsx
│   │   ├── MessageThread.tsx
│   │   ├── MessageComposer.tsx
│   │   └── AccountFilter.tsx
│   ├── content/
│   │   ├── PostScheduler.tsx
│   │   ├── MediaUploader.tsx
│   │   ├── CalendarView.tsx
│   │   └── PostPreview.tsx
│   ├── analytics/
│   │   ├── OverviewCard.tsx
│   │   ├── EngagementChart.tsx
│   │   ├── PerformanceTable.tsx
│   │   └── ExportButton.tsx
│   ├── clients/
│   │   ├── ClientList.tsx
│   │   ├── ClientCard.tsx
│   │   └── ConnectAccountButton.tsx
│   └── layout/
│       ├── AppLayout.tsx
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── LoadingSpinner.tsx
├── app/                              # Next.js 14 App Router
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Dashboard
│   │   ├── inbox/
│   │   │   └── page.tsx
│   │   ├── calendar/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   └── clients/
│   │       └── page.tsx
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts
├── hooks/
│   ├── useWebSocket.ts
│   ├── useInfiniteScroll.ts
│   ├── useClientAccounts.ts
│   └── useToast.ts                   # Shadcn toast hook
├── lib/
│   ├── api-client.ts
│   ├── websocket.ts
│   ├── auth.ts
│   └── utils.ts                      # Tailwind cn() utility
├── styles/
│   └── globals.css                   # Tailwind + custom CSS
└── config/
    └── site.ts                       # Site metadata
```

**UI Component Philosophy: Shadcn UI**

Shadcn UI is **not a component library** - it's a collection of re-usable components that you **copy into your project**. This gives you:

**Benefits**:
1. **Full Ownership**: Components live in your codebase (`components/ui/`)
2. **Complete Customization**: Modify any component without fighting library constraints
3. **No Runtime Overhead**: No extra bundle size from unused components
4. **Accessibility First**: Built on Radix UI primitives (ARIA compliant)
5. **Tailwind Native**: Seamless integration with Tailwind CSS
6. **Type-Safe**: Full TypeScript support

**Component Installation**:
```bash
# Install a component (copies to your project)
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
```

**Example Component Usage**:
```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function DashboardCard() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Messages Today</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">127</p>
        <Button variant="outline" className="mt-4">
          View All
        </Button>
      </CardContent>
    </Card>
  )
}
```

**Tailwind CSS Configuration**:
```js
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Custom brand colors
        brand: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
        },
      },
    },
  },
}
```

**Dark Mode Support**:
- CSS variables for theme colors (defined in `globals.css`)
- `next-themes` for theme switching
- Automatic system preference detection

**State Management Strategy**:
- **TanStack Query (React Query)** for server state (API data, caching, revalidation)
- **React Context** for global UI state (theme, language, selected account)
- **Local State (useState)** for component-specific state
- **WebSocket State** managed via custom hook with automatic reconnection

**Performance Optimizations**:
- Code splitting by route (Next.js 14 App Router automatic)
- Image optimization (Next.js Image component)
- Lazy loading of heavy components (React.lazy)
- Memoization of expensive calculations (useMemo, useCallback)
- Virtual scrolling for long lists (react-virtual)
- **Tailwind CSS JIT**: Only generates CSS for classes actually used
- **PurgeCSS**: Removes unused Tailwind utilities in production
- **Font optimization**: Next.js font optimization for Google Fonts

---

### 4.2 Backend Core Modules

#### Authentication Module
**Technology**: NestJS + Passport.js + JWT

**Responsibilities**:
- User registration and login
- Password hashing (bcrypt with 12 rounds)
- JWT token generation and validation
- OAuth 2.0 flows for Instagram/WhatsApp
- Session management
- Password reset flows
- Multi-factor authentication (MFA) support

**Key Services**:
- `AuthService`: Core authentication logic
- `JwtStrategy`: JWT token validation
- `InstagramOAuthStrategy`: Instagram OAuth flow
- `WhatsAppOAuthStrategy`: WhatsApp OAuth flow (Phase 2)
- `SessionService`: Session storage and retrieval

**API Endpoints**:
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/forgot-password` - Initiate password reset
- `POST /auth/reset-password` - Complete password reset
- `GET /auth/instagram/oauth` - Start Instagram OAuth
- `GET /auth/instagram/callback` - Instagram OAuth callback

**Security Measures**:
- Password complexity requirements (min 8 chars, uppercase, lowercase, number)
- Rate limiting (5 failed attempts = 15 min lockout)
- JWT expiration (access token: 1 hour, refresh token: 30 days)
- Secure HTTP-only cookies for refresh tokens
- CSRF protection via tokens

---

#### User Module
**Technology**: NestJS + Repository Pattern + pg-promise

**Responsibilities**:
- User profile management
- Preferences and settings
- Subscription tier management
- Language and timezone handling
- Notification preferences
- User data export (GDPR compliance)
- Account deletion (GDPR right to be forgotten)

**Key Services**:
- `UserService`: User CRUD operations
- `PreferenceService`: User preferences management
- `SubscriptionService`: Subscription tier logic
- `DataExportService`: GDPR data export

**API Endpoints**:
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update user profile
- `GET /users/me/preferences` - Get user preferences
- `PATCH /users/me/preferences` - Update preferences
- `POST /users/me/export` - Request data export (GDPR)
- `DELETE /users/me` - Delete account (GDPR)

**Database Schema**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  subscription_tier VARCHAR(50) DEFAULT 'FREE', -- FREE, STARTER, PROFESSIONAL, ENTERPRISE
  preferences JSONB,
  email_verified BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
```

**Repository Interface**: `IUserRepository` (see Section 5.3 - Data Access Layer)

---

#### Instagram Module
**Technology**: NestJS + Instagram Graph API SDK

**Responsibilities**:
- Instagram Graph API integration
- OAuth token management and refresh
- Account connection and disconnection
- Webhook registration and processing
- Direct message retrieval and sending
- Media publishing (feed, stories, reels)
- Insights/analytics data fetching
- Rate limit management

**Key Services**:
- `InstagramApiService`: Graph API wrapper
- `InstagramWebhookService`: Webhook processing
- `InstagramAccountService`: Account management
- `InstagramMessageService`: DM operations
- `InstagramMediaService`: Media publishing
- `InstagramInsightsService`: Analytics fetching

**API Endpoints**:
- `GET /instagram/accounts` - List connected accounts
- `POST /instagram/accounts/connect` - Connect new account
- `DELETE /instagram/accounts/:id` - Disconnect account
- `GET /instagram/accounts/:id/messages` - Get DMs
- `POST /instagram/accounts/:id/messages` - Send DM
- `POST /instagram/accounts/:id/media` - Publish media
- `GET /instagram/accounts/:id/insights` - Get analytics

**Webhook Handling**:
- `POST /instagram/webhooks` - Receive Meta webhooks
- Events: messages, mentions, comments, story mentions
- Verification: Webhook signature validation
- Processing: Async via BullMQ queue

**Token Management**:
- Automatic refresh before expiration (60 days validity)
- Encrypted storage in PostgreSQL using pgcrypto extension
- Graceful handling of revoked tokens
- User notification on token expiration

**Rate Limiting Strategy**:
- Track rate limit headers from Instagram API
- Implement request queuing when nearing limits
- Per-user quotas to prevent abuse
- Exponential backoff for rate limit errors

---

#### Message Module
**Technology**: NestJS + Socket.io + Repository Pattern + pg-promise

**Responsibilities**:
- Unified inbox aggregation (Instagram + WhatsApp)
- Message storage and retrieval
- Real-time message delivery via WebSocket
- Message search (full-text search)
- Message threading and conversation management
- Read/unread status tracking
- Bulk operations (mark as read, archive, delete)
- Message templates and quick replies

**Key Services**:
- `MessageService`: Core message operations
- `ConversationService`: Thread management
- `MessageSearchService`: Search functionality
- `MessageTemplateService`: Template management
- `RealtimeMessageGateway`: WebSocket gateway for real-time updates

**API Endpoints**:
- `GET /messages` - List messages (paginated, filtered)
- `GET /messages/:id` - Get single message
- `POST /messages` - Send new message
- `PATCH /messages/:id` - Update message (mark as read)
- `DELETE /messages/:id` - Delete message
- `GET /messages/search` - Search messages
- `POST /messages/bulk` - Bulk operations
- `GET /conversations` - List conversations
- `GET /conversations/:id/messages` - Get conversation thread

**WebSocket Events**:
- `message:new` - New message received
- `message:read` - Message marked as read
- `message:sent` - Message successfully sent
- `conversation:updated` - Conversation metadata changed

**Database Schema**:
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  platform_message_id VARCHAR(255) NOT NULL, -- Instagram/WhatsApp message ID
  platform VARCHAR(50) NOT NULL, -- 'instagram' | 'whatsapp'
  sender_id VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  media_urls JSONB, -- Array of media URLs
  direction VARCHAR(50) NOT NULL, -- 'inbound' | 'outbound'
  status VARCHAR(50) NOT NULL, -- 'sent' | 'delivered' | 'read' | 'failed'
  conversation_id VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  search_vector TSVECTOR -- Full-text search
);

CREATE INDEX idx_messages_client_account ON messages(client_account_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_is_read ON messages(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);

-- Trigger para atualizar search_vector automaticamente
CREATE TRIGGER update_messages_search_vector
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION tsvector_update_trigger(search_vector, 'pg_catalog.english', content, sender_name);
```

**Repository Interface**: `IMessageRepository` (see Section 5.3 - Data Access Layer)

**Search Implementation**:
- PostgreSQL full-text search (tsvector)
- Indexed on content and sender name
- Search by keywords, date range, account, platform
- Response time: <100ms for 10,000+ messages

---

#### Content Module
**Technology**: NestJS + MinIO (S3-compatible) + Repository Pattern + pg-promise

**Responsibilities**:
- Post scheduling and queue management
- Media upload and storage
- Basic image editing (crop, resize, filters)
- Post preview generation
- Publishing automation via background jobs
- Calendar view data aggregation
- Post status tracking
- Failed post retry logic

**Key Services**:
- `ContentService`: Post CRUD operations
- `MediaService`: Media upload and processing
- `SchedulerService`: Scheduling logic and queue management
- `PublishingService`: Post publishing to Instagram/WhatsApp
- `CalendarService`: Calendar view data

**API Endpoints**:
- `GET /posts` - List scheduled posts
- `POST /posts` - Create scheduled post
- `GET /posts/:id` - Get post details
- `PATCH /posts/:id` - Update scheduled post
- `DELETE /posts/:id` - Delete scheduled post
- `POST /posts/:id/reschedule` - Reschedule post
- `GET /calendar` - Get calendar view (by month/week)
- `POST /media/upload` - Upload media file

**Media Processing Pipeline**:
1. User uploads media (image/video) via multipart form
2. Frontend validates file size and type
3. Backend receives upload, generates unique filename
4. Upload to MinIO with server-side encryption (AES-256)
5. Generate thumbnail for preview
6. Store MinIO object key and metadata in database
7. Return pre-signed URL for frontend display (1 hour expiration)

**Publishing Flow**:
1. User creates scheduled post
2. Post stored in database with status: 'scheduled'
3. At scheduled time - 2 minutes: Enqueue publishing job to BullMQ with delay
4. BullMQ worker picks up job at scheduled time
5. Fetch post details and media from MinIO
6. Call Instagram/WhatsApp API to publish
7. Update post status: 'published' or 'failed'
8. Notify user via WebSocket and/or email

**Database Schema**:
```sql
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  post_type VARCHAR(50) NOT NULL, -- 'feed' | 'story' | 'reel'
  caption TEXT NOT NULL,
  media_keys JSONB NOT NULL, -- Array of S3 keys
  scheduled_time TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'publishing' | 'published' | 'failed'
  published_at TIMESTAMP,
  platform_post_id VARCHAR(255), -- Instagram post ID
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_posts_client_account ON scheduled_posts(client_account_id);
CREATE INDEX idx_scheduled_posts_scheduled_time ON scheduled_posts(scheduled_time);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_pending ON scheduled_posts(scheduled_time)
  WHERE status = 'scheduled' AND scheduled_time <= NOW();
```

**Repository Interface**: `IPostRepository` (see Section 5.3 - Data Access Layer)

**Retry Logic for Failed Posts**:
- Immediate retry for transient errors (network issues)
- Max 3 retries with exponential backoff (1 min, 5 min, 15 min)
- After 3 failures: Mark as 'failed' and notify user
- User can manually retry from UI

---

#### Analytics Module
**Technology**: NestJS + Repository Pattern + pg-promise + PostgreSQL Read Replica

**Responsibilities**:
- Aggregate Instagram/WhatsApp insights
- Store time-series analytics data
- Generate reports (PDF, CSV, Excel)
- Dashboard data preparation
- Data visualization endpoints
- Scheduled analytics refresh jobs
- Performance alerts and notifications

**Key Services**:
- `AnalyticsService`: Data aggregation and queries
- `InsightsService`: Fetch insights from Instagram/WhatsApp
- `ReportService`: Report generation
- `ExportService`: Data export functionality

**API Endpoints**:
- `GET /analytics/overview` - Dashboard overview
- `GET /analytics/accounts/:id` - Account-specific analytics
- `GET /analytics/posts/:id` - Post performance
- `GET /analytics/engagement` - Engagement trends
- `GET /analytics/export` - Export data (PDF/CSV/Excel)

**Metrics Tracked**:

**Account-Level Metrics**:
- Followers count (daily snapshot)
- Follower growth rate
- Reach (daily/weekly/monthly)
- Impressions
- Engagement rate (likes + comments / followers)
- Profile views

**Post-Level Metrics**:
- Likes
- Comments
- Shares
- Saves
- Reach
- Impressions
- Engagement rate
- Click-through rate (for stories with links)

**Message-Level Metrics** (Phase 2):
- Messages sent/received
- Response time
- Response rate
- Conversation volume

**Analytics Refresh Strategy**:
- Daily refresh at 2 AM (user's timezone)
- On-demand refresh (max once per hour per account)
- Incremental updates (only fetch new data since last refresh)
- Graceful degradation if API unavailable

**Database Schema**:
```sql
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  metric_type VARCHAR(100) NOT NULL, -- 'impressions' | 'reach' | 'profile_views' | 'follower_count' | etc
  metric_value DECIMAL(10, 2) NOT NULL,
  metadata JSONB, -- Additional context
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_client_date_metric ON analytics_snapshots(client_account_id, date, metric_type);
CREATE INDEX idx_analytics_date ON analytics_snapshots(date DESC);

-- Prevent duplicate entries for same account/date/metric
CREATE UNIQUE INDEX idx_analytics_unique ON analytics_snapshots(client_account_id, date, metric_type);
```

**Repository Interface**: `IAnalyticsRepository` (see Section 5.3 - Data Access Layer)

**Caching Strategy**:
- Cache analytics data in Redis with 1-hour TTL
- Cache key: `analytics:{accountId}:{timeframe}`
- Invalidate cache on manual refresh or daily job completion

---

#### Notification Module
**Technology**: NestJS + SendGrid/Mailgun + Socket.io

**Responsibilities**:
- Real-time in-app notifications via WebSocket
- Email notifications
- Notification preferences management
- Notification history and read status
- Alert generation (e.g., post failed, token expired)

**Key Services**:
- `NotificationService`: Core notification logic
- `EmailService`: Email delivery via SendGrid or Mailgun
- `NotificationGateway`: WebSocket gateway for real-time notifications

**Notification Types**:
- `message:new` - New Instagram/WhatsApp message received
- `post:published` - Scheduled post published successfully
- `post:failed` - Scheduled post failed to publish
- `account:disconnected` - OAuth token expired or revoked
- `analytics:ready` - Analytics report generated
- `system:announcement` - Platform announcements

**API Endpoints**:
- `GET /notifications` - List notifications (paginated)
- `PATCH /notifications/:id/read` - Mark as read
- `PATCH /notifications/read-all` - Mark all as read
- `GET /notifications/preferences` - Get notification preferences
- `PATCH /notifications/preferences` - Update preferences

**Email Templates**:
- Welcome email (user registration)
- Password reset email
- Account connection success
- Post published confirmation
- Post failed alert
- Weekly summary report (optional)

---

### 4.3 Background Job Workers

#### BullMQ Worker: Post Publisher
**Trigger**: BullMQ Queue (`post-publishing-queue`)
**Concurrency**: 3 workers (configurable)

**Responsibilities**:
- Fetch scheduled post from database
- Retrieve media from MinIO (S3-compatible storage)
- Call Instagram/WhatsApp API to publish
- Update post status in database
- Notify user of success/failure via WebSocket (Redis PubSub)

**Worker Setup**:
```typescript
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const postPublisherWorker = new Worker(
  'post-publishing-queue',
  async (job: Job) => {
    return await publishPost(job.data);
  },
  {
    connection,
    concurrency: 3, // Process 3 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // Per second
    },
  }
);

async function publishPost(data: { postId: string }) {
  const { postId } = data;

  try {
    // Fetch post details
    const post = await db.findPost(postId);
    if (!post) throw new Error('Post not found');

    // Update status to 'publishing'
    await db.updatePostStatus(postId, 'publishing');

    // Fetch OAuth token from database (encrypted)
    const token = await db.getDecryptedOAuthToken(post.clientAccountId, 'instagram');

    // Download media from MinIO
    const mediaFiles = await minioClient.getObjects(post.mediaKeys);

    // Publish to Instagram
    const result = await instagramApi.publishMedia({
      accountId: post.clientAccount.platformAccountId,
      type: post.postType,
      caption: post.caption,
      media: mediaFiles,
      accessToken: token
    });

    // Update post status to 'published'
    await db.updatePost(postId, {
      status: 'published',
      publishedAt: new Date(),
      platformPostId: result.id
    });

    // Notify user via Redis PubSub
    await redisPublisher.publish(`user:${post.userId}:notifications`, JSON.stringify({
      type: 'post:published',
      postId: postId
    }));

    return { success: true, postId };

  } catch (error) {
    // Handle failure
    await db.updatePost(postId, {
      status: 'failed',
      errorDetails: error.message
    });

    // Notify user of failure
    await redisPublisher.publish(`user:${post.userId}:notifications`, JSON.stringify({
      type: 'post:failed',
      postId: postId,
      error: error.message
    }));

    // Throw error to trigger BullMQ retry mechanism
    throw error;
  }
}

// Job options with retry configuration
export async function enqueuePostPublishing(postId: string, scheduledTime: Date) {
  await postPublishingQueue.add(
    'publish-post',
    { postId },
    {
      delay: scheduledTime.getTime() - Date.now(), // Delay until scheduled time
      attempts: 3, // Retry up to 3 times
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 second delay
      },
      removeOnComplete: 1000, // Keep last 1000 completed jobs
      removeOnFail: 5000, // Keep last 5000 failed jobs for debugging
    }
  );
}
```

**Error Handling**:
- Rate limit errors: Exponential backoff and retry
- Token expired: Notify user to reconnect account
- Media upload errors: Retry with different media format
- Network errors: Retry after delay
- Unrecoverable errors: Mark as failed and notify user

---

#### BullMQ Worker: Webhook Processor
**Trigger**: BullMQ Queue (`webhook-processing-queue`)
**Concurrency**: 5 workers (high throughput for real-time webhooks)

**Responsibilities**:
- Process Instagram/WhatsApp webhooks
- Validate webhook signatures
- Store new messages in database
- Trigger real-time notifications via WebSocket
- Update account metadata (follower count, profile changes)

**Execution Flow**:
```typescript
import { Worker, Job } from 'bullmq';

const webhookWorker = new Worker(
  'webhook-processing-queue',
  async (job: Job) => {
    return await processWebhook(job.data);
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 webhooks concurrently
  }
);

async function processWebhook(webhook: WebhookEvent) {
  try {
    // Validate signature
    if (!validateWebhookSignature(webhook)) {
      throw new Error('Invalid webhook signature');
    }

    // Process based on webhook type
    switch (webhook.field) {
      case 'messages':
        await processMessageWebhook(webhook);
        break;
      case 'mentions':
        await processMentionWebhook(webhook);
        break;
      case 'comments':
        await processCommentWebhook(webhook);
        break;
      default:
        console.warn('Unknown webhook type:', webhook.field);
    }

    return { success: true, webhookId: webhook.id };

  } catch (error) {
    console.error('Webhook processing error:', error);
    // BullMQ automatically retries failed jobs
    throw error; // Trigger retry mechanism
  }
}

async function processMessageWebhook(webhook: WebhookEvent) {
  const message = webhook.entry[0].messaging[0];

  // Store message in database
  const savedMessage = await db.saveMessage({
    platformMessageId: message.mid,
    platform: 'instagram',
    clientAccountId: message.recipient.id,
    senderId: message.sender.id,
    content: message.message.text,
    direction: 'inbound',
    status: 'delivered'
  });

  // Find user who owns this client account
  const user = await db.findUserByClientAccount(message.recipient.id);

  // Notify user in real-time
  await websocket.emit(user.id, 'message:new', savedMessage);
}
```

**Webhook Security**:
- Signature validation using Meta app secret
- Timestamp verification (reject old webhooks)
- Idempotency checks (prevent duplicate processing)
- Rate limiting on webhook endpoint

---

#### BullMQ Worker: Analytics Refresher
**Trigger**: BullMQ Queue (`analytics-refresh-queue`)
**Concurrency**: 2 workers (lower priority, resource-intensive)
**Trigger**: EventBridge Scheduled Rule (Daily at 2 AM user timezone)

**Responsibilities**:
- Fetch latest insights from Instagram/WhatsApp APIs
- Calculate derived metrics (engagement rate, growth rate)
- Store snapshots in analytics database
- Generate daily/weekly/monthly summary reports
- Invalidate analytics cache

**Execution Flow**:
```typescript
async function refreshAnalytics(event: ScheduledEvent) {
  // Fetch all active client accounts
  const accounts = await db.findActiveClientAccounts();

  for (const account of accounts) {
    try {
      // Fetch OAuth token
      const token = await getOAuthToken(account.id);

      // Fetch account insights
      const insights = await instagramApi.getInsights({
        accountId: account.platformAccountId,
        metrics: ['impressions', 'reach', 'profile_views', 'follower_count'],
        period: 'day',
        accessToken: token
      });

      // Store snapshots
      for (const metric of insights.data) {
        await db.saveAnalyticsSnapshot({
          clientAccountId: account.id,
          date: new Date(),
          metricType: metric.name,
          metricValue: metric.values[0].value
        });
      }

      // Fetch recent post insights
      const recentPosts = await db.findRecentPosts(account.id, 30); // Last 30 days

      for (const post of recentPosts) {
        const postInsights = await instagramApi.getMediaInsights({
          mediaId: post.platformPostId,
          metrics: ['impressions', 'reach', 'engagement', 'saves'],
          accessToken: token
        });

        // Update post metrics
        await db.updatePostMetrics(post.id, postInsights.data);
      }

      // Invalidate cache
      await cache.delete(`analytics:${account.id}:*`);

    } catch (error) {
      console.error(`Analytics refresh failed for account ${account.id}:`, error);
      // Continue with other accounts
    }
  }
}
```

**Optimization**:
- Batch API requests where possible
- Parallel processing of multiple accounts (with concurrency limit)
- Skip accounts with recent refresh (within last hour)
- Graceful degradation on API errors

---

#### BullMQ Worker: Email Sender
**Trigger**: BullMQ Queue (`email-queue`)
**Concurrency**: 2 workers

**Responsibilities**:
- Send transactional emails via SendGrid/Mailgun
- Template rendering with user data
- Email delivery status tracking
- Bounce and complaint handling

**Email Templates**:
- `welcome.html` - Welcome email after registration
- `password-reset.html` - Password reset link
- `account-connected.html` - Instagram account connected
- `post-published.html` - Post published confirmation
- `post-failed.html` - Post publishing failed alert
- `weekly-summary.html` - Weekly performance summary

---

### 4.4 Data Storage Components

#### PostgreSQL Primary Database
**PostgreSQL 15 (Docker Container)**: Self-hosted on VPS with persistent volume

**Schema Organization**:
```
social_selling_db
├── users (User accounts, auth, preferences)
├── client_accounts (Connected Instagram/WhatsApp accounts)
├── messages (Inbox messages from all platforms)
├── conversations (Message threading metadata)
├── scheduled_posts (Scheduled and published posts)
├── media_files (Media metadata and S3 references)
├── analytics_snapshots (Time-series analytics data)
├── notifications (User notifications)
├── sessions (User sessions)
└── audit_logs (Compliance and security logs)
```

**Indexing Strategy**:
- Primary keys: UUID (better distribution than auto-increment)
- Foreign keys: Indexed for join performance
- Frequently queried columns: Indexed (e.g., `createdAt`, `status`, `platform`)
- Full-text search: GIN index on `tsvector` columns
- Composite indexes for common query patterns

**Backup Strategy**:
- Automated daily snapshots (retained 7 days)
- Transaction log backup every 5 minutes (point-in-time recovery)
- Cross-region snapshot copy for disaster recovery
- Monthly backup to S3 for long-term retention

**Performance Configuration**:
- Connection pooling (max 20 connections for db.t3.micro)
- Prepared statements for frequently executed queries
- Read replicas for analytics queries (when needed)
- Vacuum and analyze scheduled nightly

---

#### PostgreSQL Read Replica
**Purpose**: Offload read-heavy analytics queries from primary database

**Deployment**: Single read replica in same region (add when >200 users)

**Read Replica Usage**:
- Analytics dashboard queries
- Report generation
- Data export operations
- Historical data analysis

**Lag Monitoring**: Replication lag should be <5 seconds; alert if >30 seconds

---

#### Redis Cache
**Redis 7 (Docker Container)**: Self-hosted on VPS with persistent volume

**Use Cases**:
1. **Session Storage**
   - Key pattern: `session:{sessionId}`
   - TTL: 24 hours
   - Data: User ID, OAuth tokens (encrypted), permissions

2. **API Response Caching**
   - Key pattern: `api:{endpoint}:{params}`
   - TTL: 5-60 minutes depending on endpoint
   - Data: Serialized API responses

3. **Analytics Caching**
   - Key pattern: `analytics:{accountId}:{timeframe}`
   - TTL: 1 hour
   - Data: Pre-aggregated analytics data

4. **Rate Limiting**
   - Key pattern: `rate:{userId}:{endpoint}`
   - TTL: 1 hour sliding window
   - Data: Request count

5. **OAuth Token Caching**
   - Key pattern: `token:{accountId}`
   - TTL: 1 hour
   - Data: Decrypted OAuth token (avoids repeated database decryption)

**Eviction Policy**: `allkeys-lru` (least recently used)

**Persistence**: Disabled for MVP (cache-only mode to save costs)

**Failover**: Redis cluster with automatic failover (when >500 users)

---

#### MinIO Object Storage (S3-Compatible)

**Bucket Structure**:
```
social-selling-media/
├── uploads/
│   ├── images/
│   │   ├── {userId}/{timestamp}-{uuid}.jpg
│   │   └── {userId}/{timestamp}-{uuid}.png
│   ├── videos/
│   │   └── {userId}/{timestamp}-{uuid}.mp4
│   └── thumbnails/
│       └── {userId}/{timestamp}-{uuid}-thumb.jpg
├── reports/
│   └── {userId}/{reportId}.pdf
└── exports/
    └── {userId}/{exportId}.csv
```

**MinIO Configuration**:
- **Docker Image**: `minio/minio:latest`
- **Storage**: Persistent volume `/minio-data` (100 GB allocated)
- **Ports**: 9000 (API), 9001 (Console)
- **Access**: S3-compatible API (fully compatible with AWS SDK)
- **Admin Console**: http://localhost:9001

**Security**:
- All objects encrypted at rest (AES-256 via MinIO)
- Bucket policy: Deny public access by default
- Pre-signed URLs for user access (expiration: 1 hour)
- Signed uploads from backend only (frontend cannot write directly)
- Access via environment variables (MINIO_ACCESS_KEY, MINIO_SECRET_KEY)

**Lifecycle Policies**:
- Delete exports/reports after 30 days (automated cleanup job)
- Orphaned media cleanup: Monthly cron job to remove unreferenced files

**Cost Optimization**:
- Compress images before upload (WebP format, 80-90% quality)
- Video transcoding to efficient formats (H.264, adaptive bitrate)
- Delete orphaned media (no database reference) via monthly cleanup job

**CDN Integration**:
- Cloudflare CDN for media delivery
- Cache TTL: 24 hours for static media
- Geo-distribution: Global (Cloudflare edge network)
- HTTPS only via Cloudflare

**Backup Strategy**:
- Daily backup of MinIO data directory to Backblaze B2 / external S3
- 30-day retention for daily backups
- 12-month retention for monthly archives

---

#### Secret Management (Environment Variables + Database)

**Purpose**: Secure storage of sensitive credentials

**Secrets Stored**:

1. **Environment Variables** (in `.env` file on VPS, encrypted backup in vault):
   - Database credentials (`DB_USER`, `DB_PASSWORD`)
   - JWT signing keys (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
   - MinIO credentials (`MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`)
   - Meta API credentials (`META_APP_ID`, `META_APP_SECRET`)
   - Email service credentials (`SENDGRID_API_KEY`)
   - Redis password (`REDIS_PASSWORD`)

2. **Database Encrypted Storage** (for user-specific OAuth tokens):
   - Instagram OAuth tokens (encrypted at rest using `pgcrypto`)
   - WhatsApp OAuth tokens (encrypted at rest)
   - Per-client account OAuth credentials

**Access Control**:
- `.env` file: 600 permissions (owner read/write only)
- Environment variables: Only accessible by Docker containers
- Database encryption: AES-256 using application-level encryption keys
- Encrypted backup: 1Password/Bitwarden for .env backup

**OAuth Token Storage** (in database):
```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'whatsapp'
  access_token_encrypted BYTEA NOT NULL, -- Encrypted with pgcrypto
  refresh_token_encrypted BYTEA,
  expires_at TIMESTAMP NOT NULL,
  scopes JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Encryption helper functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert encrypted token
INSERT INTO oauth_tokens (account_id, platform, access_token_encrypted, expires_at, scopes)
VALUES (
  'user-uuid',
  'instagram',
  pgp_sym_encrypt('access_token_value', current_setting('app.encryption_key')),
  '2025-12-31 23:59:59',
  '["instagram_basic", "instagram_content_publish"]'::jsonb
);

-- Retrieve decrypted token
SELECT
  id,
  account_id,
  platform,
  pgp_sym_decrypt(access_token_encrypted::bytea, current_setting('app.encryption_key')) AS access_token,
  expires_at
FROM oauth_tokens
WHERE account_id = 'user-uuid' AND platform = 'instagram';
```

**Secrets Rotation**:
- Manual rotation for sensitive keys (JWT, encryption keys) quarterly
- Automated OAuth token refresh (Instagram: 7 days before expiry)
- Database password rotation: Manual, every 90 days

---

### 4.5 External Integration Components

#### Instagram Graph API Integration
**API Version**: v19.0 (latest stable)

**Endpoints Used**:
- **OAuth**: `/oauth/authorize`, `/oauth/access_token`
- **User**: `/me`, `/me/accounts`
- **Media**: `/me/media`, `/{media-id}`, `/{media-id}/publish`
- **Messages**: `/me/conversations`, `/{conversation-id}/messages`
- **Insights**: `/{account-id}/insights`, `/{media-id}/insights`
- **Webhooks**: Configure in Meta App Dashboard

**Authentication Flow**:
1. User clicks "Connect Instagram Account"
2. Redirect to Instagram OAuth consent screen
3. User authorizes app
4. Instagram redirects to callback URL with auth code
5. Backend exchanges code for access token
6. Store encrypted token in PostgreSQL (pgcrypto AES-256)
7. Fetch and store account metadata

**Token Refresh**:
- Instagram tokens valid for 60 days
- Auto-refresh tokens 7 days before expiration
- Background job checks token expiry daily
- Notify user if refresh fails (requires re-authorization)

**Rate Limits**:
- 200 calls per hour per user token (can burst to 500)
- 4,800 calls per day per app
- Strategy: Queue requests, distribute across time, per-user quotas

**Webhook Events**:
- `messages` - New direct messages
- `messaging_postbacks` - Message read receipts
- `mentions` - @mentions in stories
- `comments` - Comments on posts

**Error Handling**:
- `OAuthException` - Token expired/revoked, prompt reconnection
- `RateLimitException` - Queue request for later, notify user
- `APIException` - Retry with exponential backoff
- `NetworkException` - Retry with timeout increase

---

#### WhatsApp Business Platform Integration (Phase 2)
**API**: WhatsApp Business Cloud API (hosted by Meta)

**Endpoints Used**:
- **Messages**: `/{phone-number-id}/messages`
- **Media**: `/{media-id}`, `/upload`
- **Templates**: `/{business-account-id}/message_templates`
- **Phone Numbers**: `/{business-account-id}/phone_numbers`

**Authentication**:
- Meta Business verification required
- Permanent token after verification
- Store in PostgreSQL (encrypted with pgcrypto)

**Message Types**:
1. **Session Messages**: Free-form messages within 24-hour window after user message
2. **Template Messages**: Pre-approved templates for marketing/notifications (paid)

**Compliance Requirements**:
- 24-hour messaging window enforcement
- Template approval process (can take 24-48 hours)
- Opt-out management (honor user opt-out requests)
- Message quality rating (maintain "High" or "Medium" rating)

**Cost Structure**:
- $0.005 - $0.10 per message (varies by country)
- Session messages: Lower cost
- Template messages: Higher cost
- Estimate: $500/month for 10,000 messages (conservative)

**Quality Rating**:
- Monitor quality rating via API
- Alert if rating drops to "Low" (messaging limited)
- Implement opt-out handling to avoid spam reports
- User education on WhatsApp best practices

---

## 5. Technology Stack

### 5.1 Frontend Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Framework** | Next.js | 14.x | SSR, excellent DX, production optimizations |
| **UI Library** | React | 18.x | Industry standard, rich ecosystem |
| **Language** | TypeScript | 5.x | Type safety, better DX, reduces bugs |
| **State Management** | TanStack Query | 5.x | Server state management, caching, revalidation |
| **UI Components** | Shadcn UI + Radix UI | Latest | Accessible, customizable, owns the code, Tailwind-based |
| **Styling** | Tailwind CSS | 3.x | Utility-first, highly customizable, excellent DX |
| **Forms** | React Hook Form | 7.x | Performant, minimal re-renders |
| **Validation** | Zod | 3.x | TypeScript-first schema validation |
| **WebSocket** | Socket.io Client | 4.x | Real-time messaging, auto-reconnection |
| **Charts** | Recharts | 2.x | Declarative charts, React-native |
| **Date Handling** | date-fns | 3.x | Lightweight, tree-shakeable |
| **HTTP Client** | Axios | 1.x | Request/response interceptors, timeout handling |
| **Testing** | Jest + React Testing Library | Latest | Unit and integration testing |

**Frontend Dependencies**:
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",

    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.0.0",

    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-avatar": "^1.0.0",
    "@radix-ui/react-toast": "^1.0.0",

    "tailwindcss": "^3.0.0",
    "tailwind-merge": "^2.0.0",
    "clsx": "^2.0.0",
    "class-variance-authority": "^0.7.0",

    "socket.io-client": "^4.0.0",
    "axios": "^1.0.0",
    "date-fns": "^3.0.0",
    "recharts": "^2.0.0",
    "react-virtual": "^2.0.0",
    "next-themes": "^0.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.0.0",
    "prettier-plugin-tailwindcss": "^0.5.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

**Key Points**:
- Shadcn UI components are **not** in package.json (they're copied to your project)
- Radix UI primitives are the underlying accessible components
- Tailwind utilities: `tailwind-merge`, `clsx`, `class-variance-authority` for className management

---

### 5.2 Backend Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Framework** | NestJS | 10.x | Modular architecture, TypeScript, scalable |
| **Language** | TypeScript | 5.x | Type safety, maintainability |
| **Database Layer** | Custom Repository Pattern | - | Abstraction layer, database-agnostic, testable |
| **Database Client** | pg-promise | 11.x | Direct SQL queries, full control, high performance |
| **Query Builder** | SQL Template Literals | - | Type-safe SQL with template strings |
| **Migrations** | node-pg-migrate | 7.x | PostgreSQL migrations, version control |
| **Authentication** | Passport.js | 0.6.x | OAuth strategies, JWT, extensible |
| **WebSocket** | Socket.io | 4.x | Real-time bi-directional communication |
| **Validation** | class-validator | 0.14.x | Decorator-based validation |
| **Caching** | cache-manager | 5.x | Abstract caching layer (Redis adapter) |
| **Job Queue** | Bull | 4.x | Redis-based queue, retry logic, scheduling |
| **Testing** | Jest + Supertest | Latest | Unit, integration, e2e testing |
| **API Docs** | Swagger (OpenAPI) | 3.0 | Auto-generated API documentation |

---

### 5.3 Data Access Layer Architecture

#### Repository Pattern Implementation

**Design Philosophy**:
- Application is **database-agnostic** - no direct database dependencies in business logic
- **Repository interfaces** define contracts for data access
- **Repository implementations** handle actual database queries (can be swapped)
- **Domain entities** are plain TypeScript objects (no database decorators)

#### Architecture Layers

```
┌─────────────────────────────────────────┐
│      Application Layer (Services)       │
│   - Business logic                      │
│   - Use cases                           │
│   - Depends on Repository Interfaces    │
└──────────────┬──────────────────────────┘
               │ (uses interface)
               ▼
┌─────────────────────────────────────────┐
│     Repository Interface Layer          │
│   - IUserRepository                     │
│   - IMessageRepository                  │
│   - IPostRepository                     │
│   - Pure TypeScript interfaces          │
└──────────────┬──────────────────────────┘
               │ (implements)
               ▼
┌─────────────────────────────────────────┐
│   Repository Implementation Layer       │
│   - PostgresUserRepository              │
│   - PostgresMessageRepository           │
│   - Uses pg-promise for SQL queries     │
└──────────────┬──────────────────────────┘
               │ (executes SQL)
               ▼
┌─────────────────────────────────────────┐
│      Database Layer (PostgreSQL)        │
│   - Tables, indexes, constraints        │
│   - No application logic                │
└─────────────────────────────────────────┘
```

#### Repository Interface Example

```typescript
// domain/entities/user.entity.ts
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  language: string;
  timezone: string;
  subscriptionTier: SubscriptionTier;
  preferences?: UserPreferences;
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// domain/repositories/user.repository.interface.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserDto): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  findAll(filters?: UserFilters): Promise<User[]>;
  count(filters?: UserFilters): Promise<number>;
}
```

#### Repository Implementation Example

```typescript
// infrastructure/database/repositories/postgres-user.repository.ts
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { User } from '@domain/entities/user.entity';
import { Database } from '../database';

export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", name, language,
             timezone, subscription_tier as "subscriptionTier", preferences,
             email_verified as "emailVerified", mfa_enabled as "mfaEnabled",
             created_at as "createdAt", updated_at as "updatedAt",
             deleted_at as "deletedAt"
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `;

    return this.db.oneOrNone<User>(query, [id]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", name, language,
             timezone, subscription_tier as "subscriptionTier", preferences,
             email_verified as "emailVerified", mfa_enabled as "mfaEnabled",
             created_at as "createdAt", updated_at as "updatedAt",
             deleted_at as "deletedAt"
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
    `;

    return this.db.oneOrNone<User>(query, [email]);
  }

  async create(data: CreateUserDto): Promise<User> {
    const query = `
      INSERT INTO users (
        email, password_hash, name, language, timezone, subscription_tier
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id, email, password_hash as "passwordHash", name, language,
        timezone, subscription_tier as "subscriptionTier", preferences,
        email_verified as "emailVerified", mfa_enabled as "mfaEnabled",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    return this.db.one<User>(query, [
      data.email,
      data.passwordHash,
      data.name,
      data.language || 'en',
      data.timezone || 'UTC',
      data.subscriptionTier || 'FREE'
    ]);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    // Dynamic UPDATE builder
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.language) {
      updates.push(`language = $${paramIndex++}`);
      values.push(data.language);
    }
    // ... outros campos

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id, email, password_hash as "passwordHash", name, language,
        timezone, subscription_tier as "subscriptionTier", preferences,
        email_verified as "emailVerified", mfa_enabled as "mfaEnabled",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    return this.db.one<User>(query, values);
  }

  async delete(id: string): Promise<void> {
    await this.db.none('DELETE FROM users WHERE id = $1', [id]);
  }

  async softDelete(id: string): Promise<void> {
    await this.db.none(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
  }

  async findAll(filters?: UserFilters): Promise<User[]> {
    let query = `
      SELECT id, email, password_hash as "passwordHash", name, language,
             timezone, subscription_tier as "subscriptionTier", preferences,
             email_verified as "emailVerified", mfa_enabled as "mfaEnabled",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE deleted_at IS NULL
    `;
    const values: any[] = [];

    if (filters?.subscriptionTier) {
      values.push(filters.subscriptionTier);
      query += ` AND subscription_tier = $${values.length}`;
    }

    query += ' ORDER BY created_at DESC';

    return this.db.manyOrNone<User>(query, values);
  }

  async count(filters?: UserFilters): Promise<number> {
    let query = 'SELECT COUNT(*) FROM users WHERE deleted_at IS NULL';
    const values: any[] = [];

    if (filters?.subscriptionTier) {
      values.push(filters.subscriptionTier);
      query += ` AND subscription_tier = $${values.length}`;
    }

    const result = await this.db.one<{ count: string }>(query, values);
    return parseInt(result.count, 10);
  }
}
```

#### Database Connection Setup

```typescript
// infrastructure/database/database.ts
import pgPromise from 'pg-promise';
import { IDatabase, IMain } from 'pg-promise';

const pgp: IMain = pgPromise({
  // Opções de inicialização
  capSQL: true, // Capitaliza SQL para melhor legibilidade nos logs
});

export class Database {
  private db: IDatabase<any>;

  constructor(connectionString: string) {
    this.db = pgp(connectionString);
  }

  // Wrapper methods para facilitar uso
  async one<T>(query: string, values?: any[]): Promise<T> {
    return this.db.one<T>(query, values);
  }

  async oneOrNone<T>(query: string, values?: any[]): Promise<T | null> {
    return this.db.oneOrNone<T>(query, values);
  }

  async many<T>(query: string, values?: any[]): Promise<T[]> {
    return this.db.many<T>(query, values);
  }

  async manyOrNone<T>(query: string, values?: any[]): Promise<T[]> {
    return this.db.manyOrNone<T>(query, values);
  }

  async none(query: string, values?: any[]): Promise<void> {
    return this.db.none(query, values);
  }

  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return this.db.tx(callback);
  }

  // Connection health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.one('SELECT 1 as health');
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

#### NestJS Dependency Injection Setup

```typescript
// infrastructure/database/database.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Database } from './database';
import { PostgresUserRepository } from './repositories/postgres-user.repository';
import { PostgresMessageRepository } from './repositories/postgres-message.repository';
import { PostgresPostRepository } from './repositories/postgres-post.repository';

@Global()
@Module({
  providers: [
    {
      provide: 'DATABASE',
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');
        return new Database(connectionString);
      },
      inject: [ConfigService],
    },
    {
      provide: 'IUserRepository',
      useFactory: (db: Database) => new PostgresUserRepository(db),
      inject: ['DATABASE'],
    },
    {
      provide: 'IMessageRepository',
      useFactory: (db: Database) => new PostgresMessageRepository(db),
      inject: ['DATABASE'],
    },
    {
      provide: 'IPostRepository',
      useFactory: (db: Database) => new PostgresPostRepository(db),
      inject: ['DATABASE'],
    },
  ],
  exports: ['IUserRepository', 'IMessageRepository', 'IPostRepository'],
})
export class DatabaseModule {}
```

#### Usage in Services

```typescript
// application/services/user.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { User } from '@domain/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async createUser(data: CreateUserDto): Promise<User> {
    // Business logic aqui
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    return this.userRepository.create({
      ...data,
      passwordHash,
    });
  }
}
```

#### Benefits of This Approach

**1. Database Agnostic**:
- Application doesn't know about PostgreSQL
- Can switch to MongoDB, MySQL, or any database
- Just implement new repository classes

**2. Testability**:
```typescript
// Easy mocking in tests
const mockUserRepository: IUserRepository = {
  findById: jest.fn().mockResolvedValue(mockUser),
  findByEmail: jest.fn(),
  create: jest.fn(),
  // ...
};

const userService = new UserService(mockUserRepository);
```

**3. Full SQL Control**:
- Write optimized queries
- Use PostgreSQL-specific features
- No ORM overhead or limitations

**4. Type Safety**:
- Interfaces ensure contract compliance
- TypeScript checks at compile time
- Clear method signatures

**5. Flexibility**:
- Can add caching layer in repository
- Can implement read replicas routing
- Can add query logging/monitoring

---

### 5.4 Database Schema Management

#### Migration Strategy

**Tool**: `node-pg-migrate`

**Migration Files**:
```
migrations/
├── 1640000000000_create-users-table.sql
├── 1640000001000_create-client-accounts-table.sql
├── 1640000002000_create-messages-table.sql
├── 1640000003000_create-scheduled-posts-table.sql
├── 1640000004000_create-analytics-snapshots-table.sql
└── 1640000005000_add-fulltext-search-to-messages.sql
```

**Example Migration**:
```sql
-- migrations/1640000000000_create-users-table.sql
-- UP Migration
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  subscription_tier VARCHAR(50) DEFAULT 'FREE',
  preferences JSONB,
  email_verified BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- DOWN Migration
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS users;
```

**Running Migrations**:
```bash
# Criar nova migration
npm run migration:create create-users-table

# Executar migrations pendentes
npm run migration:up

# Reverter última migration
npm run migration:down

# Ver status das migrations
npm run migration:status
```

---

### 5.5 Infrastructure Stack (Hostinger KVM 2 - Cloud Agnostic)

#### Hosting Environment: Hostinger KVM 2 VPS

**VPS Specifications**:
- **CPU**: 2 vCPU cores
- **RAM**: 4 GB DDR4
- **Storage**: 100 GB NVMe SSD
- **Bandwidth**: 2 TB/month
- **OS**: Ubuntu 22.04 LTS
- **Cost**: ~$12-15/month
- **Data Center**: Multiple locations (US, EU, Asia)

**Why Hostinger KVM 2**:
- ✅ **Cost-Effective**: ~$150-180/year vs $2,000+/year on AWS
- ✅ **Sufficient for MVP**: 4GB RAM handles 500+ users easily
- ✅ **Full Root Access**: Complete control over environment
- ✅ **Simple Pricing**: Flat monthly fee, no surprise charges
- ✅ **Fast NVMe Storage**: Better disk I/O than AWS t3.micro
- ✅ **Easy to Scale**: Upgrade to KVM 4 or KVM 8 when needed

#### Cloud-Agnostic Architecture (Docker-Based)

| Component | Technology | Deployment | Rationale |
|-----------|-----------|------------|-----------|
| **Infrastructure as Code** | Terraform | VPS provisioning | Declarative, multi-cloud, version controlled |
| **Container Orchestration** | Docker Compose | Container management | Simple, portable, easy debugging |
| **Reverse Proxy** | Nginx | Docker container | SSL termination, static files, load balancing |
| **Application** | NestJS + Next.js | Docker containers | Isolated, reproducible, portable |
| **Database** | PostgreSQL 15 | Docker container + volume | Persistent storage, easy backups |
| **Cache** | Redis 7 | Docker container + volume | In-memory caching, sessions |
| **Object Storage** | MinIO (S3-compatible) | Docker container + volume | S3-compatible API, self-hosted |
| **Message Queue** | BullMQ + Redis | In-app + Redis | Simple, no external service needed |
| **Background Jobs** | Node.js Workers | Docker containers | Scalable, containerized |
| **Monitoring** | Prometheus + Grafana | Docker containers | Self-hosted, metrics & dashboards |
| **Logging** | Loki + Promtail | Docker containers | Centralized logs, Grafana integration |
| **Email** | SMTP (SendGrid/Mailgun) | API integration | Pay-as-you-go, reliable |
| **SSL Certificates** | Let's Encrypt + Certbot | Auto-renewal script | Free, automated renewal |
| **DNS** | Cloudflare (Free Tier) | External service | Free, DDoS protection, CDN |
| **Backups** | Automated Scripts + S3 | Cron jobs | Daily database + file backups |

#### Migration Path to Other Providers

Because of **Docker + Terraform**, migration is straightforward:

**Option 1: DigitalOcean**
```bash
# Update Terraform provider
terraform init -reconfigure
terraform apply
# Same Docker Compose stack works
```

**Option 2: AWS (ECS/EC2)**
```bash
# Change Terraform to use AWS provider
# Push containers to ECR
# Deploy to ECS/EC2 with same compose file
```

**Option 3: Hetzner/Linode/Vultr**
```bash
# Update Terraform provider
# Same Docker stack, zero code changes
```

**Portability Benefits**:
- ✅ **Docker ensures consistency** across all environments
- ✅ **Terraform automates provisioning** on any provider
- ✅ **No vendor lock-in** - switch providers in <1 day
- ✅ **Same stack locally** - dev/prod parity

---

### 5.6 Infrastructure as Code (Terraform)

#### Terraform Configuration Structure

```
infrastructure/
├── terraform/
│   ├── main.tf                    # Main configuration
│   ├── variables.tf               # Input variables
│   ├── outputs.tf                 # Output values
│   ├── providers.tf               # Provider configurations
│   ├── versions.tf                # Terraform & provider versions
│   │
│   ├── modules/
│   │   ├── vps/                   # VPS provisioning module
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── dns/                   # DNS configuration (Cloudflare)
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── firewall/              # Firewall rules
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── outputs.tf
│   │
│   ├── environments/
│   │   ├── production/
│   │   │   ├── main.tf
│   │   │   ├── terraform.tfvars
│   │   │   └── backend.tf         # Remote state (S3/Terraform Cloud)
│   │   └── staging/
│   │       ├── main.tf
│   │       ├── terraform.tfvars
│   │       └── backend.tf
│   │
│   └── scripts/
│       ├── setup-server.sh        # Initial server setup
│       ├── deploy.sh              # Deployment script
│       └── backup.sh              # Backup automation
```

#### Example: Hostinger VPS Provisioning

```hcl
# terraform/modules/vps/main.tf
terraform {
  required_providers {
    # Generic provider for any VPS (Hostinger, DigitalOcean, etc.)
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

# For Hostinger, we'll use SSH provisioner since they don't have native Terraform provider
# This same pattern works with DigitalOcean, Hetzner, Linode, etc.

resource "null_resource" "vps_setup" {
  # This runs whenever VPS IP changes
  triggers = {
    vps_ip = var.vps_ip
  }

  # Connect to VPS via SSH
  connection {
    type        = "ssh"
    host        = var.vps_ip
    user        = "root"
    private_key = file(var.ssh_private_key_path)
  }

  # Copy Docker Compose configuration
  provisioner "file" {
    source      = "${path.module}/../../../docker-compose.yml"
    destination = "/opt/social-selling/docker-compose.yml"
  }

  # Copy environment variables
  provisioner "file" {
    source      = "${path.module}/../../../.env.production"
    destination = "/opt/social-selling/.env"
  }

  # Initial server setup
  provisioner "remote-exec" {
    script = "${path.module}/../../scripts/setup-server.sh"
  }
}
```

#### Example: Server Setup Script

```bash
#!/bin/bash
# infrastructure/terraform/scripts/setup-server.sh

set -e

echo "🚀 Starting server setup..."

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install UFW Firewall
apt-get install -y ufw

# Configure Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# Install fail2ban (brute-force protection)
apt-get install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Create application directory
mkdir -p /opt/social-selling
cd /opt/social-selling

# Install Certbot for Let's Encrypt
apt-get install -y certbot

# Setup automatic updates
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Setup log rotation
cat > /etc/logrotate.d/social-selling <<EOF
/opt/social-selling/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 root root
    sharedscripts
    postrotate
        docker-compose -f /opt/social-selling/docker-compose.yml restart >> /dev/null 2>&1
    endscript
}
EOF

# Setup backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/social-selling/scripts/backup.sh") | crontab -

# Setup SSL certificate renewal cron
(crontab -l 2>/dev/null; echo "0 3 * * 0 certbot renew --quiet --post-hook 'docker-compose -f /opt/social-selling/docker-compose.yml restart nginx'") | crontab -

echo "✅ Server setup completed!"
```

#### Example: Cloudflare DNS Module

```hcl
# terraform/modules/dns/main.tf
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

variable "domain" {
  description = "Domain name"
  type        = string
}

variable "vps_ip" {
  description = "VPS IP address"
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

# Get zone ID
data "cloudflare_zone" "main" {
  name = var.domain
}

# A record for main domain
resource "cloudflare_record" "root" {
  zone_id = data.cloudflare_zone.main.id
  name    = "@"
  value   = var.vps_ip
  type    = "A"
  ttl     = 1 # Auto
  proxied = true # Enable Cloudflare CDN/DDoS protection
}

# A record for www subdomain
resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.main.id
  name    = "www"
  value   = var.vps_ip
  type    = "A"
  ttl     = 1
  proxied = true
}

# A record for API subdomain
resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zone.main.id
  name    = "api"
  value   = var.vps_ip
  type    = "A"
  ttl     = 1
  proxied = true
}

# Enable SSL/TLS (Full Strict)
resource "cloudflare_zone_settings_override" "main" {
  zone_id = data.cloudflare_zone.main.id

  settings {
    ssl = "strict"
    always_use_https = "on"
    min_tls_version = "1.2"
    automatic_https_rewrites = "on"
  }
}
```

#### Provider-Agnostic Approach

To switch providers, just change the provider configuration:

**DigitalOcean Example**:
```hcl
# terraform/providers.tf
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "web" {
  image  = "ubuntu-22-04-x64"
  name   = "social-selling-production"
  region = "nyc1"
  size   = "s-2vcpu-4gb" # Similar to Hostinger KVM 2
  ssh_keys = [var.ssh_key_fingerprint]
}
```

**Hetzner Cloud Example**:
```hcl
# terraform/providers.tf
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.0"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

resource "hcloud_server" "web" {
  name        = "social-selling-production"
  image       = "ubuntu-22.04"
  server_type = "cx21" # 2 vCPU, 4GB RAM
  location    = "nbg1"
  ssh_keys    = [var.ssh_key_id]
}
```

---

### 5.7 Docker Architecture

#### Complete Docker Compose Stack

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Reverse Proxy & SSL Termination
  nginx:
    image: nginx:alpine
    container_name: social-selling-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
      - ./frontend/out:/usr/share/nginx/html:ro
    depends_on:
      - backend
      - frontend
    networks:
      - social-selling-network

  # Frontend (Next.js)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: social-selling-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${API_URL}
    volumes:
      - ./frontend/out:/app/out
    networks:
      - social-selling-network

  # Backend API (NestJS)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: social-selling-backend
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./uploads:/app/uploads
    networks:
      - social-selling-network

  # Background Workers
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    container_name: social-selling-worker
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - social-selling-network

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: social-selling-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - social-selling-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: social-selling-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - social-selling-network

  # MinIO (S3-compatible object storage)
  minio:
    image: minio/minio:latest
    container_name: social-selling-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
    volumes:
      - minio-data:/data
    networks:
      - social-selling-network

  # Prometheus (Metrics)
  prometheus:
    image: prom/prometheus:latest
    container_name: social-selling-prometheus
    restart: unless-stopped
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - social-selling-network

  # Grafana (Dashboards)
  grafana:
    image: grafana/grafana:latest
    container_name: social-selling-grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_INSTALL_PLUGINS=
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    networks:
      - social-selling-network

  # Loki (Logs)
  loki:
    image: grafana/loki:latest
    container_name: social-selling-loki
    restart: unless-stopped
    volumes:
      - loki-data:/loki
      - ./monitoring/loki-config.yml:/etc/loki/local-config.yaml:ro
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - social-selling-network

  # Promtail (Log collector)
  promtail:
    image: grafana/promtail:latest
    container_name: social-selling-promtail
    restart: unless-stopped
    volumes:
      - /var/log:/var/log:ro
      - ./logs:/app/logs:ro
      - ./monitoring/promtail-config.yml:/etc/promtail/config.yml:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - social-selling-network

networks:
  social-selling-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  minio-data:
  prometheus-data:
  grafana-data:
  loki-data:
```

#### Docker Resource Limits (4GB RAM Total)

```yaml
# Resource allocation for 4GB VPS
services:
  nginx:
    mem_limit: 128m
    cpus: 0.5

  frontend:
    mem_limit: 512m
    cpus: 0.5

  backend:
    mem_limit: 1024m  # 1GB for main app
    cpus: 1.0

  worker:
    mem_limit: 512m
    cpus: 0.5

  postgres:
    mem_limit: 1024m  # 1GB for database
    cpus: 0.5
    shm_size: 256m

  redis:
    mem_limit: 256m
    cpus: 0.25

  minio:
    mem_limit: 256m
    cpus: 0.25

  prometheus:
    mem_limit: 128m
    cpus: 0.25

  grafana:
    mem_limit: 128m
    cpus: 0.25

  loki:
    mem_limit: 128m
    cpus: 0.25

  promtail:
    mem_limit: 64m
    cpus: 0.1
```

---

### 5.8 Development & DevOps Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Version Control** | Git + GitHub | Industry standard, GitHub Actions integration |
| **CI/CD** | GitHub Actions | Free for public repos, easy setup, integrated |
| **Container Registry** | GitHub Container Registry (GHCR) | Free private registries, GitHub Actions integration |
| **IaC (Future)** | Terraform or CDK | Infrastructure as code for reproducibility |
| **Linting** | ESLint + Prettier | Code quality, consistent formatting |
| **Git Hooks** | Husky | Pre-commit linting, testing |
| **Package Manager** | pnpm | Faster than npm, disk space efficient |
| **Monorepo (Future)** | Turborepo | Incremental builds, caching |

---

## 6. Architecture Decision Records (ADRs)

### ADR-001: Monolith vs. Microservices

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Need to decide between monolithic and microservices architecture for MVP.

**Decision**: Build a modular monolith with clear module boundaries.

**Rationale**:
- Single developer team cannot manage microservices complexity
- 15-day MVP timeline requires rapid development
- Initial scale (500 users) does not require microservices
- Infrastructure budget ($200/month) favors monolith
- Modular design allows future service extraction when needed

**Consequences**:
- Faster MVP development
- Lower infrastructure costs
- Simpler operations and debugging
- Potential refactoring required at higher scale (5,000+ users)

---

### ADR-002: PostgreSQL vs. NoSQL Database

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Need to choose primary database technology.

**Decision**: Use PostgreSQL as primary database.

**Rationale**:
- Relational data model fits domain (users, accounts, messages, posts)
- ACID transactions needed for financial/subscription data
- Complex queries for analytics (joins, aggregations)
- Strong JSON support for flexible schemas where needed
- Proven scalability (vertical and horizontal via read replicas)
- Robust ecosystem and tooling

**Consequences**:
- Strong data consistency
- Easier complex queries
- Familiar SQL syntax
- Potential need for read replicas at scale
- Slightly higher operational overhead than DynamoDB

---

### ADR-003: Server-Side Rendering (Next.js) vs. SPA

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Choose between SSR (Next.js) or pure SPA (Create React App).

**Decision**: Use Next.js with server-side rendering.

**Rationale**:
- SEO benefits for marketing pages (landing page, blog, pricing)
- Faster initial page load (critical for user experience)
- Built-in API routes reduce complexity
- Better performance for low-end devices
- Production optimizations out-of-the-box

**Consequences**:
- Slightly more complex deployment (need Node.js server)
- Better SEO and performance
- Unified frontend/backend-for-frontend framework
- Easier incremental static generation for future scale

---

### ADR-004: JWT vs. Session-Based Authentication

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Choose authentication mechanism.

**Decision**: Use JWT tokens with Redis session storage.

**Rationale**:
- JWT enables stateless API authentication (scalability)
- Redis session for sensitive data (OAuth tokens, permissions)
- Hybrid approach: JWT for API, session for OAuth state
- Easy mobile app integration in future (JWT)
- Tokens can be revoked via session invalidation

**Consequences**:
- Flexibility for future mobile app
- Scalable authentication
- Need Redis dependency
- Slightly more complex token management

---

### ADR-005: BullMQ Workers vs. Separate Queue Services

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Choose background job processing architecture.

**Decision**: Use BullMQ (Redis-based queue) with long-running worker processes.

**Rationale**:
- **No Additional Services**: BullMQ runs on existing Redis infrastructure (zero additional cost)
- **Better Control**: Full control over concurrency, rate limiting, and job priorities
- **Built-in Retry**: Exponential backoff and retry logic built into BullMQ
- **Job Scheduling**: Native support for delayed jobs (scheduled posts)
- **Monitoring**: BullMQ Board UI for queue monitoring and debugging
- **Performance**: No cold starts, workers always hot and ready
- **Cost-Efficient**: No per-execution charges like Lambda/SQS
- **Docker Native**: Workers run as Docker containers alongside main app

**Consequences**:
- **Positive**:
  - Lower infrastructure costs (no managed queue service fees)
  - Predictable performance (no cold starts)
  - Full control over job processing logic
  - Better debugging with BullMQ Board dashboard
  - Unified Redis infrastructure (cache + queue)

- **Negative**:
  - Workers consume VPS resources (need to allocate CPU/RAM)
  - Manual scaling required (add more worker containers)
  - Need to monitor worker health ourselves (vs managed service)

- **Mitigation**:
  - Resource limits in docker-compose prevent workers from consuming too much
  - Horizontal scaling: Add more worker containers as needed
  - Prometheus metrics for worker monitoring and alerting

---

### ADR-006: REST vs. GraphQL API

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Choose API architecture pattern.

**Decision**: Use RESTful APIs (not GraphQL).

**Rationale**:
- Simpler for single developer team
- Faster MVP development
- REST is sufficient for current requirements
- Easier caching with HTTP semantics
- Lower learning curve for future team members
- GraphQL adds complexity without clear benefit at this scale

**Consequences**:
- Standard HTTP methods and status codes
- Potentially more API endpoints (less flexible queries)
- Easier caching and CDN integration
- Future migration to GraphQL possible if needed

---

### ADR-007: Real-Time Updates: WebSocket vs. Long Polling

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Choose real-time communication mechanism.

**Decision**: Use WebSocket (Socket.io) for real-time updates.

**Rationale**:
- True real-time messaging (no polling delay)
- Lower latency and bandwidth usage
- Better user experience for inbox
- Socket.io provides automatic fallback to long polling
- Bi-directional communication enables future features

**Consequences**:
- Persistent connections require sticky sessions (Nginx ip_hash support)
- Slightly more complex infrastructure
- Better real-time experience
- Scalability managed via Redis adapter for Socket.io

---

### ADR-008: OAuth Token Storage: Database Encryption vs. External Secrets Manager

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Choose storage mechanism for sensitive OAuth tokens.

**Decision**: Store OAuth tokens in PostgreSQL database with pgcrypto extension encryption (not external secrets manager).

**Rationale**:
- **pgcrypto** provides AES-256 encryption at column level
- **No additional services**: Zero extra infrastructure cost
- **Encryption key** managed via environment variable (separate from database)
- **Simple integration**: Transparent to application code with helper functions
- **Performance**: No external API calls, tokens retrieved directly from database
- **Portability**: Can migrate to any PostgreSQL-compatible database
- **Audit trail**: Database logs capture all token access

**Consequences**:
- Encryption key must be carefully managed (stored in environment variables, not in repo)
- Database backups must be encrypted (prevent key exposure)
- Simpler architecture with fewer moving parts
- Lower operational cost ($0 vs $0.40/secret/month for managed secrets)
- Meets compliance requirements (encryption at rest + access control)

---

### ADR-009: Multi-Tenancy: Shared Database vs. Database-per-Tenant

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Choose multi-tenancy strategy.

**Decision**: Use shared database with row-level tenant isolation.

**Rationale**:
- Simpler operations (one database to manage)
- Lower infrastructure costs
- Easier schema migrations
- Sufficient isolation via userId foreign key filtering
- No cross-tenant data sharing requirements

**Consequences**:
- Single point of failure (mitigated by database backups and replicas)
- Need careful query filtering to prevent data leakage
- Easier scaling initially
- Potential migration to tenant-per-database if enterprise customers require it

---

### ADR-010: Image Storage: MinIO (Self-Hosted) vs. Cloud Object Storage

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Choose media storage and delivery strategy.

**Decision**: Store media in MinIO (S3-compatible self-hosted), deliver via Cloudflare CDN.

**Rationale**:
- **MinIO**: S3-compatible API, runs in Docker container on VPS
- **Cost**: $0 additional cost (included in VPS storage)
- **Cloudflare CDN**: Free tier provides global CDN with caching
- **Separation of Storage and Delivery**: MinIO for storage, Cloudflare for edge caching
- **S3 Compatibility**: Can migrate to AWS S3 later with zero code changes
- **Pre-signed URLs**: Secure access to private media via time-limited URLs
- **Backup Strategy**: Daily backups to external S3/Backblaze B2 for disaster recovery

**Consequences**:
- **Positive**:
  - Zero storage costs vs $10-30/month for cloud object storage
  - Full control over data (no vendor lock-in)
  - S3-compatible API allows easy migration to AWS S3 if needed
  - Cloudflare CDN (free tier) provides global distribution
  - Faster local access for backend (same VPS network)

- **Negative**:
  - Limited by VPS disk space (100 GB allocated for MVP)
  - No automatic geo-redundancy (single VPS location)
  - Manual management required (no managed service benefits)
  - Need to implement own lifecycle policies for cleanup

- **Mitigation**:
  - Monitor disk usage with Prometheus alerts
  - Daily backups to external storage (Backblaze B2 / S3) for redundancy
  - Automated cleanup jobs for orphaned media
  - Can easily migrate to AWS S3 when storage needs exceed VPS capacity

---

### ADR-011: Shadcn UI + Tailwind CSS vs. Component Libraries (Chakra UI, MUI)

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Choose UI component library/framework for frontend development.

**Options Considered**:
1. **Chakra UI**: Popular component library with built-in theming
2. **Material UI (MUI)**: Comprehensive component library with Material Design
3. **Ant Design**: Enterprise-focused component library
4. **Shadcn UI + Tailwind CSS**: Copy-paste components built on Radix UI

**Decision**: Use Shadcn UI + Tailwind CSS for UI components.

**Rationale**:
- **Full Code Ownership**: Components are copied into your codebase (`components/ui/`)
  - No fighting with library APIs when you need customization
  - No dependency on library updates or breaking changes
  - Full control over component behavior and styling

- **Zero Runtime Overhead**: Only ship the components you actually use
  - Traditional libraries include entire component library in bundle
  - Shadcn only includes copied components (smaller bundle size)

- **Accessibility First**: Built on Radix UI primitives
  - WCAG compliant out of the box
  - Keyboard navigation, ARIA attributes, screen reader support
  - Better than building accessible components from scratch

- **Tailwind Native**: Seamless integration with utility-first CSS
  - Consistent design system via Tailwind config
  - Better DX with IntelliSense and class autocomplete
  - Smaller CSS bundle (only used utilities shipped)

- **Customization Without Constraints**:
  - Chakra UI requires learning theming API and fighting with CSS-in-JS
  - MUI enforces Material Design (harder to achieve custom brand)
  - Shadcn components are just TypeScript + Tailwind (easy to modify)

- **Modern Stack Alignment**:
  - Next.js 14 + Tailwind CSS is industry standard
  - Matches developer expectations and hiring pool
  - Better learning resources and community

**Consequences**:
- **Positive**:
  - Complete design flexibility
  - Smaller bundle sizes (tree-shaking at component level)
  - No library lock-in or breaking changes
  - Easy to understand and modify (just React + Tailwind)
  - Faster development with copy-paste workflow

- **Negative**:
  - Need to manually copy components (not npm install)
  - Updates to components require manual re-copy
  - Slightly more setup time initially (Tailwind config)
  - Team needs to learn Tailwind CSS (low learning curve)

- **Mitigation**:
  - Shadcn CLI makes copying components easy (`npx shadcn-ui add button`)
  - Component updates are rare (stable Radix UI foundation)
  - Tailwind learning curve < 1 day for experienced developers
  - Benefits far outweigh initial setup cost

**Alternatives Rejected**:
- **Chakra UI**: Too opinionated, CSS-in-JS overhead, harder customization
- **Material UI**: Enforces Material Design, large bundle, complex theming
- **Ant Design**: Enterprise-focused (not modern SaaS aesthetic), large bundle
- **Headless UI**: Good but less complete than Shadcn + requires more manual styling

---

### ADR-012: Hostinger VPS + Docker vs. AWS Managed Services

**Date**: 2025-10-18
**Status**: Accepted
**Context**: Choose infrastructure platform and deployment strategy for MVP and early growth.

**Options Considered**:
1. **AWS Managed Services**: ECS Fargate, RDS, ElastiCache, S3, CloudWatch
2. **DigitalOcean App Platform**: Managed containers, databases, and storage
3. **Hetzner Cloud**: VPS with Docker and self-hosted services
4. **Hostinger KVM VPS**: VPS with Docker and self-hosted services

**Decision**: Use Hostinger KVM 2 VPS with Docker containers and Terraform for infrastructure management.

**Rationale**:

- **Cost Efficiency** (90% reduction):
  - AWS managed services: $150-200/month for MVP
  - Hostinger KVM 2: $18-41/month for MVP (includes all services)
  - Critical for bootstrapped MVP with limited budget
  - Predictable costs vs AWS pay-per-request model

- **No Vendor Lock-in**:
  - Terraform + Docker enables migration to any provider in < 1 day
  - Can switch to DigitalOcean, Hetzner, Linode, or even AWS later
  - Not tied to AWS-specific services (Lambda, RDS, SQS)
  - Infrastructure as Code makes provider-agnostic architecture

- **Full Control and Flexibility**:
  - Root access to VPS for debugging and optimization
  - Can install any software or tools needed
  - Fine-grained resource allocation (no managed service limits)
  - Direct database access for migrations and maintenance

- **Learning and Skill Building**:
  - Deep understanding of infrastructure (vs black-box managed services)
  - Marketable skills in Docker, PostgreSQL, Redis administration
  - Better debugging capabilities (access to all logs and processes)
  - Transferable knowledge to any infrastructure platform

- **Sufficient Resources for MVP**:
  - Hostinger KVM 2: 2 vCPU, 4 GB RAM, 100 GB NVMe SSD
  - Handles 300-500 users comfortably with proper optimization
  - Easy upgrade path to KVM 4 (4 vCPU, 8 GB RAM) for $25-30/month
  - 2 TB/month bandwidth more than sufficient for MVP

**Infrastructure Components**:

| Service | AWS Equivalent | Implementation | Resource Usage |
|---------|---------------|----------------|----------------|
| **Backend API** | ECS Fargate | Docker container (Node.js) | 1 GB RAM, 0.5 vCPU |
| **Database** | RDS PostgreSQL | Docker (postgres:15-alpine) | 1 GB RAM, 0.5 vCPU |
| **Cache** | ElastiCache Redis | Docker (redis:7-alpine) | 512 MB RAM, 0.25 vCPU |
| **Object Storage** | S3 | MinIO (S3-compatible) | 256 MB RAM, 0.25 vCPU |
| **Queue** | SQS | BullMQ (Redis-based) | Included in Redis |
| **Monitoring** | CloudWatch | Prometheus + Grafana | 512 MB RAM, 0.25 vCPU |
| **Logging** | CloudWatch Logs | Loki + Promtail | 256 MB RAM, 0.1 vCPU |
| **CDN/DNS** | CloudFront + Route53 | Cloudflare (free tier) | External service |
| **SSL** | ACM | Let's Encrypt + Certbot | Minimal overhead |

**Total Resource Usage**: ~3.5 GB RAM, ~2 vCPU (fits comfortably in 4 GB RAM VPS with buffer)

**Consequences**:

- **Positive**:
  - **90% cost savings**: $18-41/month vs $150-200/month
  - **Zero vendor lock-in**: Can migrate to any provider in < 1 day
  - **Full infrastructure control**: Root access, custom configurations
  - **Predictable costs**: Fixed monthly price, no surprise bills
  - **Better profit margins**: More revenue retained for growth
  - **Learning opportunity**: Deep infrastructure knowledge
  - **Easy scaling**: Upgrade VPS plan or split services to multiple VPS

- **Negative**:
  - **Manual management**: Need to handle server updates, security patches
  - **Single point of failure**: One VPS (mitigated with daily backups)
  - **DevOps responsibility**: No managed service support
  - **Monitoring setup**: Need to configure Prometheus/Grafana ourselves
  - **Less auto-scaling**: Manual intervention required to scale

- **Mitigation Strategies**:
  - **Automated updates**: Unattended upgrades for security patches
  - **Daily backups**: Automated backups to external storage (S3/B2)
  - **Monitoring alerts**: Prometheus AlertManager for proactive issues
  - **Infrastructure as Code**: Terraform enables quick redeployment
  - **Documentation**: Detailed runbooks for common operations
  - **Fail2ban + UFW**: Automated security hardening
  - **Uptime monitoring**: External monitoring (UptimeRobot) for alerts

**Migration Path to AWS** (if needed at scale):

When/if business reaches point where managed services make sense (e.g., 5,000+ users, team of 5+ engineers):

1. **Phase 1**: Migrate database to AWS RDS (1 day)
   - Export PostgreSQL dump from VPS
   - Import to RDS instance
   - Update `DATABASE_URL` in backend
   - Zero code changes required

2. **Phase 2**: Migrate backend to ECS Fargate (2-3 days)
   - Push Docker image to ECR
   - Create ECS task definition
   - Update Terraform to provision ECS resources
   - Zero code changes required

3. **Phase 3**: Migrate storage to S3 (1-2 days)
   - MinIO is S3-compatible (same API)
   - Update credentials to AWS S3
   - Migrate existing files with `aws s3 sync`
   - Zero code changes (using S3-compatible SDK)

**Total migration time**: 5-7 days with zero code changes (thanks to Docker + Terraform + S3-compatible APIs)

**Cost Comparison Summary**:

| Infrastructure | MVP (0-300 users) | Scaled (500 users) | At Scale (2000+ users) |
|----------------|-------------------|-------------------|----------------------|
| **Hostinger VPS** | $18-41/month | $76-96/month | $150-200/month (multi-VPS) |
| **AWS Managed** | $150-200/month | $388/month | $800-1200/month |
| **Savings** | ~85% | ~75% | ~50% |

**Break-even Analysis**:
- AWS makes sense when infrastructure management time > cost savings
- Estimated at 2,000-5,000 users or when team has dedicated DevOps role
- Current solo developer: Hostinger optimal for 12-18 months

**Alternatives Rejected**:

- **AWS Managed Services**: Too expensive for MVP ($150-200/month), vendor lock-in, overkill for < 500 users
- **DigitalOcean App Platform**: Better than AWS ($50-80/month) but still 3-4x more expensive than VPS, some vendor lock-in
- **Hetzner Cloud**: Excellent option (similar to Hostinger), slightly more expensive ($20-25 vs $12-15), location preference (Hostinger has US datacenter)
- **Bare Metal Server**: Overkill for MVP, higher upfront cost, longer setup time

**Decision Drivers**:
1. **Cost** (40% weight): 90% savings critical for bootstrapped startup
2. **Flexibility** (30% weight): No vendor lock-in enables future migration
3. **Control** (20% weight): Full access for debugging and optimization
4. **Simplicity** (10% weight): Single VPS easier to manage than multiple AWS services

---

## 7. Security Architecture

### 7.1 Authentication & Authorization

#### Authentication Mechanisms

**User Authentication**:
- Email/password with bcrypt hashing (12 rounds)
- JWT access tokens (1-hour expiration)
- Refresh tokens (30-day expiration, HTTP-only cookies)
- MFA via TOTP (optional, recommended for high-value accounts)

**OAuth Integration**:
- Instagram OAuth 2.0 (authorization code flow)
- WhatsApp OAuth 2.0 (Phase 2)
- State parameter for CSRF protection
- Scope limiting (request minimum required permissions)

**Session Management**:
- Redis-backed sessions
- Session invalidation on logout
- Concurrent session limit (max 5 devices)
- Automatic session expiration after 24 hours of inactivity

#### Authorization Model

**Role-Based Access Control (RBAC)**:

**Roles** (MVP):
- `user`: Standard user (can manage own accounts and clients)
- `admin`: Platform administrator (full access)

**Roles** (Phase 2 - Team Collaboration):
- `owner`: Account owner (full access to team workspace)
- `manager`: Can manage content and analytics (no billing access)
- `editor`: Can create and schedule content (no analytics)
- `viewer`: Read-only access to analytics

**Permission Model**:
```typescript
enum Permission {
  // Client Accounts
  CLIENT_ACCOUNTS_READ = 'client_accounts:read',
  CLIENT_ACCOUNTS_WRITE = 'client_accounts:write',
  CLIENT_ACCOUNTS_DELETE = 'client_accounts:delete',

  // Messages
  MESSAGES_READ = 'messages:read',
  MESSAGES_WRITE = 'messages:write',
  MESSAGES_DELETE = 'messages:delete',

  // Content
  CONTENT_READ = 'content:read',
  CONTENT_WRITE = 'content:write',
  CONTENT_PUBLISH = 'content:publish',
  CONTENT_DELETE = 'content:delete',

  // Analytics
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',

  // Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',

  // Billing (Phase 2)
  BILLING_READ = 'billing:read',
  BILLING_WRITE = 'billing:write',
}
```

**Authorization Enforcement**:
- Decorator-based guards in NestJS (`@RequirePermissions()`)
- Row-level security via query filtering (`userId` filter on all queries)
- API-level authorization checks before database access

---

### 7.2 Data Security

#### Encryption at Rest

**Database Encryption**:
- AWS RDS encryption enabled (AES-256)
- Encrypted snapshots and backups
- Transparent to application (handled by AWS)

**S3 Encryption**:
- Server-side encryption (SSE-S3) for all objects
- Bucket policy: Deny unencrypted uploads
- Versioning enabled for recovery

**Secrets Encryption**:
- PostgreSQL pgcrypto extension (AES-256)
- Encryption key managed via environment variables
- Database audit logs for token access tracking

**Redis Encryption**:
- Encryption at rest enabled
- Encryption in transit (TLS)

#### Encryption in Transit

**HTTPS Everywhere**:
- TLS 1.3 for all client-server communication
- HTTP Strict Transport Security (HSTS) headers
- Certificate management via Let's Encrypt + Certbot (automatic renewal)

**WebSocket Security**:
- WSS (WebSocket over TLS)
- Authentication via JWT in connection handshake

**Internal Communication**:
- VPC security groups restrict traffic
- Service-to-service communication over HTTPS
- Private subnets for databases (no internet access)

---

### 7.3 Application Security

#### Input Validation

**Request Validation**:
- Schema validation using `class-validator` decorators
- Type checking via TypeScript
- SQL injection prevention via ORM parameterized queries
- XSS prevention via output encoding (React escapes by default)

**File Upload Validation**:
- File type whitelist (JPEG, PNG, MP4, WebM)
- File size limits (images: 10MB, videos: 100MB)
- Virus scanning via ClamAV integration (optional for production)
- Content-Type validation (verify magic bytes)

**API Rate Limiting**:
- Global rate limit: 100 requests/minute per IP
- Authenticated rate limit: 500 requests/minute per user
- Endpoint-specific limits (e.g., `/auth/login`: 5 requests/minute)
- Redis-backed rate limiting (sliding window algorithm)

#### Security Headers

**HTTP Security Headers**:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**CORS Policy**:
- Strict origin whitelist (only production domain)
- Credentials allowed for same-origin only
- Preflight caching to reduce OPTIONS requests

---

### 7.4 Infrastructure Security

#### Network Security

**VPS Firewall (UFW)**:
- Default deny all incoming traffic
- Allow SSH (port 22) - restricted to specific IPs only
- Allow HTTP (port 80) - redirect to HTTPS
- Allow HTTPS (port 443)
- Deny all other ports

**Docker Network Isolation**:
- All containers on isolated bridge network (172.20.0.0/16)
- Database (PostgreSQL) not exposed to public internet
- Redis not exposed to public internet
- MinIO API (9000) not exposed to public internet
- Only Nginx exposed on ports 80/443

**Container Communication**:
- Backend → PostgreSQL: Port 5432 (internal network only)
- Backend → Redis: Port 6379 (internal network only)
- Backend → MinIO: Port 9000 (internal network only)
- Workers → All services (internal network only)
- Nginx → Backend: Port 4000 (internal network only)
- Nginx → Frontend: Port 3000 (internal network only)

**DDoS Protection**:
- Cloudflare DDoS protection (automatic, free tier)
- Cloudflare rate-based firewall rules
- Fail2ban for SSH brute-force protection
- Nginx rate limiting (req/s limits per IP)

#### Access Control

**SSH Access**:
- SSH key authentication only (password auth disabled)
- SSH keys restricted to specific IP addresses
- Fail2ban enabled for brute-force protection
- Regular key rotation (quarterly)

**Docker Container Access**:
- Containers run as non-root users
- Read-only root filesystems where possible
- Resource limits (CPU, memory) enforced
- No privileged containers

**Secrets Access**:
- Environment variables loaded from .env files (not committed to git)
- File permissions: 600 for .env files (owner read/write only)
- Database encryption keys separate from application secrets
- Secrets rotation process documented

---

### 7.5 Compliance & Privacy

#### GDPR Compliance

**Data Subject Rights**:
- **Right to Access**: API endpoint to download all user data (JSON export)
- **Right to Deletion**: 30-day grace period, then permanent deletion
- **Right to Portability**: Export data in machine-readable format (JSON, CSV)
- **Right to Rectification**: User can update profile and preferences

**Data Processing**:
- Data Processing Agreement (DPA) with users
- Privacy Policy clearly discloses data usage
- Consent management for marketing communications
- Data retention policies (messages: 1 year, analytics: indefinite)

**Data Transfers**:
- EU data stored in AWS EU regions (eu-west-1)
- Standard Contractual Clauses (SCCs) for US-EU transfers
- No data transfers to countries without adequate protection

#### LGPD Compliance (Brazil)

- Similar requirements to GDPR
- Data stored in AWS South America region (sa-east-1) for Brazilian users
- Consent management in Portuguese
- Data protection officer (DPO) contact information

#### CCPA Compliance (California)

- Privacy Policy discloses data collection and usage
- "Do Not Sell My Personal Information" link (even though we don't sell data)
- User can request deletion of personal information
- Opt-out of marketing communications

#### Platform Compliance

**Meta Platform Policies**:
- Data Use Policy adherence (no unauthorized data usage)
- Platform Terms compliance (no prohibited automation)
- Data deletion callbacks implemented (user deletes Instagram account)
- App review submissions for permission changes

---

### 7.6 Security Monitoring & Incident Response

#### Security Monitoring

**Logging**:
- CloudWatch Logs for all application logs
- Access logs for ALB (S3 storage)
- VPC Flow Logs for network traffic analysis
- CloudTrail for AWS API audit logs

**Metrics**:
- Failed login attempts (alert on >10 from single IP in 5 minutes)
- 4xx/5xx error rates (alert on >5% error rate)
- Database connection errors
- Secret access patterns (unusual access triggers alert)

**Alerting**:
- CloudWatch Alarms for critical metrics
- SNS notifications to on-call email/SMS
- PagerDuty integration for 24/7 coverage (when team grows)

#### Incident Response Plan

**Severity Levels**:
- **P0 (Critical)**: Data breach, complete outage
- **P1 (High)**: Partial outage, security vulnerability
- **P2 (Medium)**: Degraded performance, non-critical bug
- **P3 (Low)**: Minor issue, feature request

**Response Procedures**:

**Data Breach Response**:
1. Identify scope of breach (which data, how many users)
2. Contain breach (revoke credentials, isolate systems)
3. Investigate root cause
4. Notify affected users within 72 hours (GDPR requirement)
5. Report to regulatory authorities if required
6. Implement remediation measures
7. Post-mortem and documentation

**Outage Response**:
1. Acknowledge incident and create status page update
2. Investigate root cause
3. Implement workaround or fix
4. Verify resolution
5. Update status page
6. Post-mortem and documentation

---

## 8. Scalability Strategy

### 8.1 Current Capacity (MVP)

**Infrastructure**:
- ECS: 1 task (2 vCPU, 4 GB RAM)
- RDS: db.t3.micro (2 vCPU, 1 GB RAM)
- Redis: cache.t3.micro (2 vCPU, 1 GB RAM)

**Estimated Capacity**:
- Concurrent users: 50-100
- Active users (MAU): 200-300
- Requests per second: 50-100
- Database queries per second: 200-300
- Message throughput: 1,000 messages/hour

---

### 8.2 Horizontal Scaling Plan

#### Phase 1: Scaling to 500 Users (Year 1 Target)

**Trigger**: CPU utilization >70% sustained for 5 minutes

**Actions**:
1. **ECS Auto-Scaling**: Scale to 2-3 tasks
   - Cost impact: +$50/month
2. **Database**: Upgrade to db.t3.small (2 vCPU, 2 GB RAM)
   - Cost impact: +$20/month
3. **Redis**: Upgrade to cache.t3.small (2 vCPU, 2 GB RAM)
   - Cost impact: +$15/month
4. **Estimated Total**: $285/month infrastructure cost

**Capacity**:
- Concurrent users: 200-300
- Active users (MAU): 500-800
- Requests per second: 200-300

---

#### Phase 2: Scaling to 2,000 Users (Year 2 Target)

**Trigger**: Consistent high load, approaching capacity limits

**Actions**:
1. **ECS Auto-Scaling**: Scale to 5-10 tasks with auto-scaling group
   - Min: 3 tasks, Max: 10 tasks
   - Cost impact: +$150/month
2. **Database Read Replica**: Add 1 read replica for analytics queries
   - Cost impact: +$40/month
3. **Redis Cluster**: Multi-node Redis cluster for failover
   - Cost impact: +$50/month
4. **CDN Optimization**: Increase CloudFront usage, cache more aggressively
   - Cost impact: +$30/month
5. **Estimated Total**: $555/month infrastructure cost

**Capacity**:
- Concurrent users: 500-1,000
- Active users (MAU): 2,000-3,000
- Requests per second: 500-1,000

---

#### Phase 3: Scaling Beyond 5,000 Users

**Trigger**: Architectural limitations, need for service extraction

**Actions**:
1. **Microservices Extraction**: Extract high-load services
   - Instagram/WhatsApp integration service (separate)
   - Message processing service (separate)
   - Analytics service (separate)
2. **Database Sharding**: Shard users across multiple database instances
3. **Multi-Region Deployment**: Deploy in US, EU, South America regions
4. **Managed Kubernetes**: Migrate to EKS for better orchestration
5. **Estimated Total**: $1,500-2,000/month infrastructure cost

**Capacity**:
- Concurrent users: 2,000-5,000
- Active users (MAU): 10,000+
- Requests per second: 2,000-5,000

---

### 8.3 Vertical Scaling Plan

#### Database Vertical Scaling Path

| User Count | Instance Type | vCPU | RAM | Storage | Cost/Month |
|------------|---------------|------|-----|---------|------------|
| 0-300 | db.t3.micro | 2 | 1 GB | 20 GB | $15 |
| 300-1,000 | db.t3.small | 2 | 2 GB | 50 GB | $35 |
| 1,000-3,000 | db.t3.medium | 2 | 4 GB | 100 GB | $70 |
| 3,000-10,000 | db.m5.large | 2 | 8 GB | 200 GB | $140 |
| 10,000+ | db.m5.xlarge | 4 | 16 GB | 500 GB | $280 |

#### Application Server Vertical Scaling Path

| User Count | Task Count | vCPU/Task | RAM/Task | Total vCPU | Total RAM | Cost/Month |
|------------|------------|-----------|----------|------------|-----------|------------|
| 0-300 | 1 | 2 | 4 GB | 2 | 4 GB | $50 |
| 300-1,000 | 2 | 2 | 4 GB | 4 | 8 GB | $100 |
| 1,000-3,000 | 4 | 2 | 4 GB | 8 | 16 GB | $200 |
| 3,000-10,000 | 8 | 2 | 4 GB | 16 | 32 GB | $400 |
| 10,000+ | 16 | 4 | 8 GB | 64 | 128 GB | $800 |

---

### 8.4 Performance Optimization Strategies

#### Database Optimization

**Query Optimization**:
- Index all foreign keys
- Composite indexes for common query patterns
- `EXPLAIN ANALYZE` for slow queries (>100ms)
- Query result caching in Redis (1-hour TTL)

**Connection Pooling**:
- Max connections: 20 (db.t3.micro), 100 (db.t3.medium)
- Connection timeout: 30 seconds
- Idle timeout: 10 minutes
- Reuse connections aggressively

**Read Replica Strategy**:
- Direct analytics queries to read replica
- Report generation on read replica
- Data export on read replica
- Monitor replication lag (<5 seconds acceptable)

#### Caching Strategy

**Redis Caching**:
- User sessions (24-hour TTL)
- API responses (5-60 minute TTL depending on endpoint)
- Analytics data (1-hour TTL)
- OAuth tokens (1-hour TTL)

**CloudFront Caching**:
- Static assets (CSS, JS, images): 1 year TTL
- Media files: 24 hour TTL
- API responses: No caching (dynamic)

**Database Query Result Caching**:
- Frequently accessed data (user profiles, client accounts): 5-minute TTL
- Analytics aggregations: 1-hour TTL
- Invalidate on write operations

#### API Optimization

**Pagination**:
- Default page size: 20 items
- Max page size: 100 items
- Cursor-based pagination for infinite scroll
- Offset-based pagination for jump-to-page

**Response Compression**:
- Gzip compression for API responses >1KB
- Brotli compression for static assets

**Lazy Loading**:
- Load messages on demand (infinite scroll)
- Load analytics charts on tab activation
- Load images on viewport entry (intersection observer)

**Code Splitting**:
- Route-based code splitting (Next.js automatic)
- Component-based code splitting (React.lazy)
- Vendor bundle separate from app bundle

---

## 9. Deployment Architecture

### 9.1 Deployment Environments

#### Development Environment

**Infrastructure**:
- Local Docker Compose setup
- PostgreSQL container
- Redis container
- MinIO container (S3-compatible local storage)
- All services defined in `docker-compose.dev.yml`

**Configuration**:
- Environment: `development`
- Debug logging enabled
- Hot reloading enabled (Docker volumes for code)
- Seeded test data
- No SSL (http only)

**Access**:
- Local only (http://localhost:3000)
- No external access
- Test Instagram/WhatsApp accounts

**Commands**:
```bash
docker-compose -f docker-compose.dev.yml up
npm run dev  # Alternative: run outside Docker for faster hot reload
```

---

#### Staging Environment

**Infrastructure**:
- Hostinger VPS (shared with production or separate low-cost VPS)
- Docker Compose with reduced resource limits
- Same docker-compose.yml as production with staging env vars
- Separate PostgreSQL database (same instance, different DB)
- Separate MinIO bucket (same instance, different bucket)

**Configuration**:
- Environment: `staging`
- Debug logging enabled
- Production-like setup (but reduced resources)
- Can use anonymized production data (optional)
- SSL via Let's Encrypt (staging-socialselling.willianbvsanches.com)

**Access**:
- https://staging-socialselling.willianbvsanches.com
- Basic auth password protection (nginx)
- Used for QA and pre-production testing

**Deployment**:
- Manual trigger from GitHub Actions
- Deploy on merge to `staging` branch
- SSH to VPS, pull latest code, rebuild containers
- Smoke tests after deployment
- Healthcheck validation

---

#### Production Environment

**Infrastructure**:
- Hostinger KVM 2 VPS (2 vCPU, 4 GB RAM, 100 GB NVMe SSD)
- Location: US datacenter (or closest to target market)
- Docker Compose with all services
- Cloudflare for DNS, CDN, and DDoS protection
- Let's Encrypt SSL certificates (auto-renewed)

**Configuration**:
- Environment: `production`
- Error-level logging only (info for critical services)
- Performance optimizations enabled
- Real production data
- Resource limits enforced (see Section 5.7)

**Access**:
- https://app-socialselling.willianbvsanches.com
- Public access (authenticated users)
- Single VPS deployment (no multi-AZ for MVP)
- Daily backups to external storage

**Deployment**:
- Automated deployment on merge to `main` branch
- Rolling update with health checks (zero downtime)
- Automated smoke tests post-deployment
- Manual rollback if health checks fail
- Slack/Discord notification on deployment

**Upgrade Path**:
- Can easily upgrade to Hostinger KVM 4 (4 vCPU, 8 GB RAM) via Terraform
- Can split services to multiple VPS (app + database separation)
- Can migrate to cloud providers (AWS, DO, Hetzner) with minimal changes

---

### 9.2 CI/CD Pipeline

#### GitHub Actions Workflow

**On Pull Request**:
```yaml
name: PR Checks
on: pull_request

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:coverage
      # Fail if coverage < 80%

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t backend:test ./backend
      - run: docker build -t frontend:test ./frontend

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=moderate
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'HIGH,CRITICAL'
```

**On Merge to Staging Branch**:
```yaml
name: Deploy Staging
on:
  push:
    branches: [staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker images
        run: |
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/backend:staging-${{ github.sha }} ./backend
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/frontend:staging-${{ github.sha }} ./frontend
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push ${{ secrets.DOCKER_REGISTRY }}/backend:staging-${{ github.sha }}
          docker push ${{ secrets.DOCKER_REGISTRY }}/frontend:staging-${{ github.sha }}

      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/social-selling
            export IMAGE_TAG=staging-${{ github.sha }}
            docker-compose pull
            docker-compose up -d --no-deps backend frontend
            docker-compose exec -T backend npm run migrate:latest

      - name: Health check
        run: |
          sleep 10
          curl --fail https://staging-socialselling.willianbvsanches.com/health || exit 1

      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**On Merge to Main Branch**:
```yaml
name: Deploy Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker images
        run: |
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/backend:${{ github.sha }} ./backend
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/frontend:${{ github.sha }} ./frontend
          docker tag ${{ secrets.DOCKER_REGISTRY }}/backend:${{ github.sha }} ${{ secrets.DOCKER_REGISTRY }}/backend:latest
          docker tag ${{ secrets.DOCKER_REGISTRY }}/frontend:${{ github.sha }} ${{ secrets.DOCKER_REGISTRY }}/frontend:latest
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push ${{ secrets.DOCKER_REGISTRY }}/backend:${{ github.sha }}
          docker push ${{ secrets.DOCKER_REGISTRY }}/frontend:${{ github.sha }}
          docker push ${{ secrets.DOCKER_REGISTRY }}/backend:latest
          docker push ${{ secrets.DOCKER_REGISTRY }}/frontend:latest

      - name: Deploy to production VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/social-selling

            # Backup current database
            docker-compose exec -T postgres pg_dump -U $DB_USER $DB_NAME > backup-$(date +%Y%m%d-%H%M%S).sql

            # Pull latest images
            export IMAGE_TAG=${{ github.sha }}
            docker-compose pull backend frontend

            # Rolling update with health checks (zero downtime)
            docker-compose up -d --no-deps --scale backend=2 backend
            sleep 15
            curl --fail https://app-socialselling.willianbvsanches.com/health || exit 1
            docker-compose up -d --no-deps --scale backend=1 backend

            # Update frontend
            docker-compose up -d --no-deps frontend

            # Run migrations
            docker-compose exec -T backend npm run migrate:latest

            # Cleanup old images
            docker image prune -f

      - name: Health check and smoke tests
        run: |
          sleep 15
          curl --fail https://app-socialselling.willianbvsanches.com/health || exit 1
          curl --fail https://app-socialselling.willianbvsanches.com/api/health || exit 1

      - name: Create GitHub release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
          body: |
            Automated release from ${{ github.sha }}
            Deployed to production

      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed ✅'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Deployment Script** (`scripts/deploy.sh`):
```bash
#!/bin/bash
set -e

# Script for manual deployment or debugging

IMAGE_TAG=${1:-latest}
ENVIRONMENT=${2:-production}

echo "Deploying $ENVIRONMENT with tag $IMAGE_TAG"

# Pull latest images
export IMAGE_TAG=$IMAGE_TAG
docker-compose pull

# Rolling update
docker-compose up -d --no-deps backend frontend

# Wait for health check
echo "Waiting for services to be healthy..."
sleep 10

# Health check
docker-compose exec -T backend curl --fail http://localhost:4000/health || {
  echo "Health check failed, rolling back..."
  docker-compose down
  docker-compose up -d
  exit 1
}

echo "Deployment successful!"
```

---

### 9.3 Rollback Strategy

**Automated Rollback Triggers**:
- Health check failures (3 consecutive failures within 1 minute)
- Error rate >10% (monitored by Prometheus AlertManager)
- Response time >5 seconds (95th percentile over 5-minute window)

**Manual Rollback Process**:

1. **Identify bad deployment** via Grafana dashboards or Prometheus alerts
2. **SSH to VPS** and run rollback script:
   ```bash
   ssh user@app-socialselling.willianbvsanches.com
   cd /opt/social-selling
   ./scripts/rollback.sh
   ```
3. **Rollback script** (`scripts/rollback.sh`):
   ```bash
   #!/bin/bash
   set -e

   echo "Rolling back to previous deployment..."

   # Get previous image tag
   PREVIOUS_TAG=$(docker images --format "{{.Tag}}" backend | sed -n 2p)

   echo "Rolling back to tag: $PREVIOUS_TAG"

   # Update docker-compose with previous tag
   export IMAGE_TAG=$PREVIOUS_TAG
   docker-compose pull backend frontend
   docker-compose up -d --no-deps backend frontend

   # Health check
   sleep 10
   curl --fail http://localhost:4000/health || {
     echo "Rollback failed, manual intervention required"
     exit 1
   }

   echo "Rollback successful to $PREVIOUS_TAG"
   ```

4. **Verify health checks** pass via Prometheus or manual curl
5. **Investigate root cause** using Grafana logs and metrics
6. **Create hotfix** or revert commit, then redeploy

**Database Rollback**:

- **Down migrations** available for all schema changes (using node-pg-migrate)
- **Always test migrations in staging** first before production
- **Automated backup** before each migration (in CI/CD pipeline)
- **Manual rollback** process:
  ```bash
  # SSH to VPS
  cd /opt/social-selling

  # Restore from backup
  docker-compose exec -T postgres psql -U $DB_USER -c "DROP DATABASE $DB_NAME;"
  docker-compose exec -T postgres psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
  cat backups/backup-20250118-153000.sql | docker-compose exec -T postgres psql -U $DB_USER $DB_NAME

  # Verify restoration
  docker-compose exec -T postgres psql -U $DB_USER $DB_NAME -c "SELECT COUNT(*) FROM users;"
  ```

**Quick Rollback Commands**:
```bash
# Rollback backend only
export IMAGE_TAG=<previous-sha>
docker-compose up -d --no-deps backend

# Rollback frontend only
docker-compose up -d --no-deps frontend

# Complete rollback (all services)
./scripts/rollback.sh
```

---

### 9.4 Disaster Recovery Plan

#### Backup Strategy

**Database Backups** (PostgreSQL):

- **Daily automated backups** via cron job on VPS:
  ```bash
  # /etc/cron.daily/postgres-backup.sh
  #!/bin/bash
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  BACKUP_DIR=/opt/social-selling/backups

  # Dump database
  docker-compose exec -T postgres pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db-$TIMESTAMP.sql.gz

  # Upload to external storage (Backblaze B2, AWS S3, or similar)
  rclone copy $BACKUP_DIR/db-$TIMESTAMP.sql.gz remote:social-selling-backups/database/

  # Keep only 7 days of local backups
  find $BACKUP_DIR -name "db-*.sql.gz" -mtime +7 -delete
  ```

- **Backup retention**:
  - Local backups: 7 days (on VPS)
  - Remote backups: 30 days (Backblaze B2 / S3)
  - Monthly archival backups: 12 months

- **Transaction log backups**: Not available (PostgreSQL in Docker without WAL archiving)
  - RPO (Recovery Point Objective): Up to 24 hours of data loss
  - Consider setting up WAL archiving if RPO < 24h required

**File Storage Backups** (MinIO):

- **Daily MinIO data backup**:
  ```bash
  # Backup MinIO data directory
  tar -czf backups/minio-$TIMESTAMP.tar.gz /opt/social-selling/minio-data
  rclone copy backups/minio-$TIMESTAMP.tar.gz remote:social-selling-backups/minio/
  ```

- **Versioning**: Enabled in MinIO for accidental deletion recovery
- **Retention**: 30 days of full backups, 12 months of monthly backups

**Configuration Backups**:

- **Infrastructure as Code**: All Terraform configs in Git repository
- **Docker Compose files**: Versioned in Git repository
- **Environment variables**:
  - Stored in `.env` file on VPS (not in Git)
  - Encrypted backup in 1Password/Bitwarden/secure vault
  - Document separately in encrypted vault
- **SSL certificates**: Auto-renewed by Certbot (backed up to Git if manual certs)
- **Secrets**: Encrypted backup to offline storage (external drive or secure cloud)

**Full VPS Snapshot** (optional):

- **Hostinger VPS snapshots**: Manual snapshots before major changes
- **Cost**: ~$5-10/snapshot (if Hostinger supports it)
- **Alternative**: Use Terraform to rebuild VPS from scratch + restore data

#### Recovery Procedures

**Database Recovery** (PostgreSQL):

1. **Restore from daily backup**:
   ```bash
   # Download latest backup
   rclone copy remote:social-selling-backups/database/db-latest.sql.gz ./

   # Stop application
   docker-compose stop backend

   # Drop and recreate database
   docker-compose exec -T postgres psql -U $DB_USER -c "DROP DATABASE $DB_NAME;"
   docker-compose exec -T postgres psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

   # Restore backup
   gunzip -c db-latest.sql.gz | docker-compose exec -T postgres psql -U $DB_USER $DB_NAME

   # Restart application
   docker-compose start backend
   ```

2. **Estimated RTO**: 1-2 hours (download backup + restore + verify)
3. **Estimated RPO**: Up to 24 hours of data loss (daily backups)

**File Storage Recovery** (MinIO):

1. **Restore from backup**:
   ```bash
   # Stop MinIO
   docker-compose stop minio

   # Download and extract backup
   rclone copy remote:social-selling-backups/minio/minio-latest.tar.gz ./
   tar -xzf minio-latest.tar.gz -C /

   # Restart MinIO
   docker-compose start minio
   ```

2. **Estimated RTO**: 30 minutes - 1 hour
3. **Estimated RPO**: Up to 24 hours

**Complete VPS Failure** (Disaster Scenario):

1. **Provision new VPS** using Terraform:
   ```bash
   cd infrastructure/terraform
   terraform apply
   # Provisions new Hostinger VPS with Docker, firewall, etc.
   ```

2. **Deploy application** via Terraform or manual deployment:
   ```bash
   # SSH to new VPS
   ssh user@new-vps-ip

   # Clone repository
   git clone https://github.com/your-org/social-selling.git /opt/social-selling
   cd /opt/social-selling

   # Restore .env file from secure vault
   # (manually copy environment variables)

   # Pull Docker images
   docker-compose pull

   # Start services (without data)
   docker-compose up -d
   ```

3. **Restore database and files** (see procedures above)

4. **Update DNS** to point to new VPS IP:
   ```bash
   # Update Cloudflare DNS A record
   # Either via Terraform or Cloudflare dashboard
   ```

5. **Verify SSL certificates** are generated (Certbot auto-runs)

6. **Estimated RTO**: 4-6 hours for complete disaster recovery
7. **Estimated RPO**: Up to 24 hours of data loss

**Testing Recovery Procedures**:

- **Quarterly DR drills**: Test full recovery on staging environment
- **Document all steps**: Maintain runbook with exact commands
- **Verify backups**: Monthly backup integrity checks (restore test on local machine)
- **Monitor backup jobs**: Prometheus alerts if daily backup fails


---

## 10. Monitoring & Observability

### 10.1 Logging Strategy

#### Application Logs

**Log Levels**:
- **ERROR**: Application errors, exceptions (always logged)
- **WARN**: Potential issues, degraded functionality (always logged)
- **INFO**: Important state changes, user actions (production)
- **DEBUG**: Detailed execution flow (development/staging only)
- **TRACE**: Very detailed debugging (development only)

**Structured Logging**:
```json
{
  "timestamp": "2025-10-18T14:32:10.123Z",
  "level": "INFO",
  "service": "api",
  "traceId": "abc-123-def",
  "userId": "user-uuid",
  "action": "post:publish",
  "details": {
    "postId": "post-uuid",
    "accountId": "account-uuid",
    "platform": "instagram"
  }
}
```

**Log Retention**:
- Loki (active logs): 30 days
- External archive (Backblaze B2 / S3): 12 months for compliance
- Automatic rotation and cleanup to manage disk space

**Log Analysis**:
- Grafana + Loki for querying and visualization
- LogQL queries for pattern matching (errors, slow queries, user actions)
- Saved queries and dashboards for common patterns
- Alerts configured via Prometheus AlertManager

---

### 10.2 Metrics & Dashboards

#### Application Metrics

**Performance Metrics**:
- Request rate (requests per second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx errors)
- Throughput (data transferred)

**Business Metrics**:
- Active users (DAU, MAU)
- Messages sent/received
- Posts scheduled/published
- API usage per user
- Feature adoption rates

**Infrastructure Metrics**:
- VPS CPU/memory/disk utilization
- Docker container resource usage (per service)
- PostgreSQL connections, query performance, storage
- Redis memory usage, hit rate, evictions
- MinIO storage usage, request latency
- BullMQ queue depth, job processing time, failures
- Network bandwidth and latency

**Custom Metrics**:
- Instagram API rate limit remaining
- OAuth token expiration alerts
- Post publishing success/failure rate
- Webhook processing latency

#### Dashboards

**Operational Dashboard**:
- Request rate and error rate
- Response time (95th percentile)
- Infrastructure health (CPU, memory, disk)
- Database performance (connections, slow queries)
- Queue depths and processing times

**Business Dashboard**:
- Active users (daily, weekly, monthly)
- User growth trends
- Feature usage (inbox, scheduling, analytics)
- Revenue metrics (MRR, churn rate)

**Security Dashboard**:
- Failed login attempts
- API rate limiting violations
- Unusual access patterns
- Data export requests (GDPR)

---

### 10.3 Alerting Strategy

#### Critical Alerts (P0 - Immediate Action Required)

- **VPS Down**: Server unreachable or not responding
- **Service Down**: Docker health check failures (3 consecutive)
- **Database Down**: PostgreSQL unreachable or not accepting connections
- **High Error Rate**: >10% error rate for 5 minutes
- **Critical Security Event**: Unusual sudo access, failed SSH attempts >50/hour
- **Disk Full**: >95% disk usage

**Notification**: Email + SMS (via Twilio/SNS) + Discord/Slack

#### High Priority Alerts (P1 - Action Required Within 1 Hour)

- **Degraded Performance**: Response time >2 seconds (95th percentile)
- **High CPU/Memory**: >80% for 10 minutes
- **High Disk Usage**: >80% disk space used
- **Queue Backlog**: BullMQ queue depth >1,000 messages
- **OAuth Token Expiring**: Instagram token expires in <7 days
- **Container Restart Loop**: Container restarting >3 times in 10 minutes

**Notification**: Email + Discord/Slack

#### Medium Priority Alerts (P2 - Action Required Within 24 Hours)

- **Elevated Error Rate**: >5% error rate for 10 minutes
- **Slow Queries**: Database queries >1 second
- **Redis Memory High**: >80% memory usage
- **Failed Background Jobs**: >10 failed BullMQ jobs in 1 hour
- **Backup Failed**: Daily backup did not complete successfully
- **SSL Certificate Expiring**: Certificate expires in <30 days

**Notification**: Email + Discord/Slack

---

### 10.4 Observability Tools

#### Prometheus + Grafana (Primary Monitoring)

**Prometheus** (Metrics Collection & Alerting):
- Time-series database for all metrics
- Scrapes metrics from all services every 15 seconds
- Built-in alerting via AlertManager
- Retention: 30 days (local), 1 year (remote storage optional)

**Grafana** (Visualization & Dashboards):
- Unified dashboard for metrics and logs
- Pre-built dashboards for common patterns
- Custom business and operational dashboards
- Alert visualization and management
- Integration with Prometheus and Loki

**Loki** (Log Aggregation):
- Lightweight log aggregation (inspired by Prometheus)
- Promtail agent collects logs from all Docker containers
- LogQL for querying logs (similar to PromQL)
- Retention: 30 days
- Minimal resource usage (~256MB RAM)

**Benefits**:
- **Free and open-source** (vs CloudWatch costs)
- **Full control** over data and configuration
- **Better performance** for on-VPS monitoring
- **Familiar tools** with large community support

#### New Relic or DataDog (Optional APM)

**Features**:
- Distributed tracing (request flow across services)
- Error tracking and aggregation
- Performance profiling
- User session replay
- Anomaly detection

**When to Add**: After 500 users or when debugging complex performance issues

**Cost**: ~$100-200/month (New Relic free tier available)

---

## 11. Cost Projections

### 11.1 MVP Infrastructure Costs (0-300 Users)

| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| **Hosting (Hostinger KVM 2)** | 2 vCPU, 4 GB RAM, 100 GB NVMe SSD, 2 TB bandwidth | $12-15 |
| **Database (PostgreSQL)** | Self-hosted on VPS (Docker container) | $0 (included) |
| **Cache (Redis)** | Self-hosted on VPS (Docker container) | $0 (included) |
| **Object Storage (MinIO)** | Self-hosted S3-compatible (Docker container) | $0 (included) |
| **Message Queue (BullMQ)** | Redis-based queue (Docker container) | $0 (included) |
| **Monitoring (Prometheus/Grafana)** | Self-hosted monitoring stack | $0 (included) |
| **Logging (Loki/Promtail)** | Self-hosted logging stack | $0 (included) |
| **CDN/DNS (Cloudflare)** | Free tier (up to 100k requests/day) | $0 |
| **SSL Certificates** | Let's Encrypt (via Certbot) | $0 |
| **Email Service (SendGrid/Mailgun)** | 10K emails/month (pay-as-you-go) | $0-15 |
| **Domain Name** | .com domain registration | $1/month (~$12/year) |
| **Backups** | Daily automated backups to external storage | $5-10 |
| **TOTAL** | | **$18-41/month** |

**Key Benefits**:
- **90% cost reduction** vs AWS managed services ($150-170/month → $18-41/month)
- Full control over infrastructure and data
- No vendor lock-in - easy to migrate to any provider
- Predictable costs with no per-request charges

**Buffer for Growth**: Keep budget at $50/month for unexpected costs.

---

### 11.2 Scaled Infrastructure Costs (500 Users - Year 1 Target)

| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| **Hosting (Hostinger KVM 4)** | 4 vCPU, 8 GB RAM, 200 GB NVMe SSD, 4 TB bandwidth | $25-30 |
| **Database (PostgreSQL)** | Self-hosted with read replica (Docker containers) | $0 (included) |
| **Cache (Redis)** | Self-hosted with persistence (Docker container) | $0 (included) |
| **Object Storage (MinIO)** | Self-hosted S3-compatible, 100-200 GB usage | $0 (included) |
| **Message Queue (BullMQ)** | Redis-based queue with multiple workers | $0 (included) |
| **Monitoring (Prometheus/Grafana)** | Self-hosted with alerting configured | $0 (included) |
| **Logging (Loki/Promtail)** | Self-hosted with 30-day retention | $0 (included) |
| **CDN/DNS (Cloudflare Pro)** | Pro tier for better performance & analytics | $20 |
| **SSL Certificates** | Let's Encrypt (via Certbot) | $0 |
| **Email Service (SendGrid)** | 50K emails/month | $15-20 |
| **Domain Name** | .com domain registration | $1/month (~$12/year) |
| **Backups** | Daily automated backups + offsite storage (500 GB) | $10-15 |
| **External Monitoring** | UptimeRobot or similar (optional) | $5-10 |
| **TOTAL** | | **$76-96/month** |

**Scaling Strategy**:
- **Current VPS sufficient** for 500 users with proper optimization
- **Alternative**: Split to 2x VPS ($12-15 each) - one for app, one for database
- **Database Read Replica** for read-heavy operations
- **Redis persistence** for queue durability
- **Cloudflare Pro** for better caching and DDoS protection

**Note**: This assumes 500 MAU with moderate usage. Represents **80% cost reduction** vs AWS ($388/month → $76-96/month).

---

### 11.3 Variable Costs to Monitor

#### WhatsApp Business Platform (Phase 2)

**Cost Structure**:
- Conversation-based pricing (varies by country)
- US: ~$0.01-0.05 per conversation
- Brazil: ~$0.05-0.10 per conversation
- Template messages: Higher cost

**Projected Costs**:
- 500 users sending 20 WhatsApp messages/day
- 10,000 messages/day = 300,000 messages/month
- Estimated cost: $500-1,500/month (highly variable)

**Mitigation**:
- Pass costs to users via pricing tiers
- Implement message quotas per tier
- Monitor costs daily and alert on spikes

#### AI Services (Phase 3)

**OpenAI API Costs** (example):
- GPT-4o: $2.50 per 1M input tokens, $10 per 1M output tokens
- Estimated usage: 100 users using AI features daily
- 10,000 API calls/month
- Average 500 tokens per call (input + output)
- Estimated cost: $50-100/month

**Mitigation**:
- Use cheaper models where possible (GPT-4o Mini: 10x cheaper)
- Cache common AI responses
- Limit AI usage per user (quotas)
- Premium tier for unlimited AI usage

---

## 12. Risk Mitigation Summary

### Technical Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Instagram API Changes** | Subscribe to Meta changelog, build abstraction layer, monitor API health |
| **Rate Limiting** | Request queuing, per-user quotas, exponential backoff |
| **OAuth Token Expiration** | Auto-refresh 7 days before expiry, proactive user notification |
| **Scalability Bottlenecks** | Horizontal scaling design, read replicas, caching, load testing |
| **Third-Party Downtime** | Graceful degradation, queue operations, transparent status communication |

### Security Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Data Breach** | Encryption at rest/transit, least privilege access, security audits |
| **OAuth Token Theft** | Secrets Manager storage, TLS everywhere, audit logging |
| **GDPR Violation** | Privacy-by-design, DPO appointment, compliance audits |
| **Meta Policy Violation** | Thorough policy review, compliance checks, user education |

### Business Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Low User Acquisition** | Pre-launch waitlist, early adopter incentives, targeted marketing |
| **High Churn** | Comprehensive onboarding, proactive support, feature engagement tracking |
| **Pricing Misalignment** | Competitor analysis, user surveys, pricing A/B testing |
| **WhatsApp Cost Overruns** | Cost monitoring, user quotas, pass costs to users |

---

## 13. Future Architecture Evolution

### Phase 2 Enhancements (Months 3-6)

**WhatsApp Integration**:
- New module: `WhatsAppModule`
- Unified message processing pipeline
- Template message management
- Multi-number support

**Team Collaboration**:
- Team management module
- RBAC enhancement (4 roles)
- Content approval workflows
- Activity audit logs

**Database Changes**:
- New tables: `teams`, `team_members`, `whatsapp_templates`, `approval_workflows`
- Schema migration strategy

---

### Phase 3 Enhancements (Months 6-12)

**AI Features**:
- AI module with OpenAI integration
- Content suggestion service
- Sentiment analysis service
- Automated response service

**Advanced Analytics**:
- Data warehouse (Redshift or BigQuery)
- Custom report builder
- Scheduled reports
- Comparative analytics

**Mobile App** (Optional):
- React Native app (shared codebase)
- Offline mode support
- Push notifications (FCM/APNs)

---

### Microservices Migration (Year 2+)

**Service Extraction Priority**:
1. **Instagram Integration Service**: High load, isolated functionality
2. **WhatsApp Integration Service**: Separate cost model, compliance requirements
3. **Analytics Service**: Resource-intensive, read-heavy
4. **Message Processing Service**: Real-time requirements, high throughput

**Migration Strategy**:
- Strangler Fig pattern (incrementally replace monolith)
- Shared database initially, then split schemas
- Service mesh (Istio or AWS App Mesh)
- API Gateway for unified interface

---

## 14. Conclusion

### Architecture Summary

The chosen **Modular Monolith with Event-Driven Components** architecture on **Hostinger VPS with Docker** provides the optimal balance for the Social Selling Platform MVP:

**Strengths**:
- **Rapid Development**: 15-day MVP timeline achievable
- **Cost Efficiency**: $18-41/month infrastructure (90% cheaper than AWS managed services)
- **No Vendor Lock-in**: Terraform + Docker enables easy migration to any provider
- **Scalability**: Horizontal scaling to 500+ users without re-architecture
- **Maintainability**: Single codebase manageable by solo developer
- **Future-Proof**: Clear path to microservices or cloud migration when scale demands it

**Trade-offs Accepted**:
- Monolith requires scaling entire application (vs. individual services)
- Shared database could become bottleneck at extreme scale (10,000+ users)
- Tight module coupling risk if boundaries not enforced

### Key Success Factors

1. **Disciplined Execution**: Stick to MVP scope ruthlessly
2. **Leverage Existing Tools**: No reinventing wheels (use proven libraries/frameworks)
3. **Security First**: No shortcuts on encryption, authentication, compliance
4. **Monitor Costs**: Track infrastructure and variable costs (WhatsApp, AI) regularly
5. **Infrastructure Monitoring**: Set up proper alerting for VPS resources (CPU, RAM, disk, bandwidth)
6. **User Feedback Loop**: Build, measure, learn, iterate rapidly

### Next Steps

1. **Review and Approval**: Stakeholder review of architecture design
2. **Infrastructure Setup**: AWS account, GitHub repos, CI/CD pipeline
3. **Development Kickoff**: Begin Phase A (Core Infrastructure) development
4. **User Research**: Validate assumptions with 5-10 user interviews
5. **Legal Foundation**: Finalize Privacy Policy, Terms of Service

---

**Architecture Status**: ✅ **APPROVED FOR IMPLEMENTATION**

**Document Prepared By**: Senior Systems Architect
**Document Path**: `/Users/williansanches/projects/personal/social-selling-2/tasks/social-selling/architecture-design.md`
**Next Document**: Technical Implementation Plan
**Last Updated**: 2025-10-18
