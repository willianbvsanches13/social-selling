# DEPLOY-005: Documentation & Handoff

## Overview
Comprehensive documentation package covering system architecture, API documentation, deployment runbooks, operational procedures, troubleshooting guides, and training materials for successful project handoff and long-term maintainability.

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
1. [System Architecture Documentation](#system-architecture-documentation)
2. [API Documentation](#api-documentation)
3. [Deployment Runbook](#deployment-runbook)
4. [Operational Procedures](#operational-procedures)
5. [Troubleshooting Guides](#troubleshooting-guides)
6. [Database Schema Documentation](#database-schema-documentation)
7. [Environment Setup Guide](#environment-setup-guide)
8. [Development Workflow](#development-workflow)
9. [Security Checklist](#security-checklist)
10. [Handoff Training Plan](#handoff-training-plan)

---

## 1. System Architecture Documentation

### 1.1 High-Level Architecture Diagram

**File:** `docs/architecture/system-overview.md`
```markdown
# Social Selling Platform - System Architecture

## Overview
The Social Selling Platform is a cloud-native, microservices-based application designed for scalability, reliability, and performance.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CDN (Cloudflare)                         │
│                    Static Assets, Images, CSS                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                     Load Balancer (Nginx)                       │
│                  SSL Termination, Routing                       │
└─────────┬─────────────────────────────────┬─────────────────────┘
          │                                 │
┌─────────▼──────────────┐        ┌────────▼──────────────┐
│   Frontend (Next.js)   │        │  Backend (NestJS)     │
│   - SSR/SSG            │        │  - REST API           │
│   - React              │        │  - WebSockets         │
│   - TypeScript         │        │  - Business Logic     │
└─────────┬──────────────┘        └────────┬──────────────┘
          │                                │
          │        ┌───────────────────────┴────────┐
          │        │                                │
    ┌─────▼────────▼─────┐              ┌──────────▼─────────┐
    │   Redis Cache      │              │  PostgreSQL DB     │
    │   - Sessions       │              │  - Primary Data    │
    │   - API Cache      │              │  - Transactions    │
    │   - Rate Limiting  │              │  - Relationships   │
    └────────────────────┘              └────────────────────┘
                                                  │
                          ┌───────────────────────┴────────┐
                          │                                │
                ┌─────────▼──────────┐         ┌──────────▼─────────┐
                │  AWS S3            │         │  Backup Server     │
                │  - User Uploads    │         │  - DB Backups      │
                │  - Product Images  │         │  - File Backups    │
                └────────────────────┘         └────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                    Monitoring & Logging                           │
│  Prometheus | Grafana | Loki | Sentry | New Relic | PagerDuty   │
└───────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **UI Library**: React 18
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **WebSocket**: Socket.io-client

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **ORM**: TypeORM
- **Authentication**: JWT + Passport
- **Validation**: class-validator
- **WebSocket**: Socket.io
- **API Docs**: Swagger/OpenAPI

### Database
- **Primary**: PostgreSQL 15
- **Cache**: Redis 7
- **Search**: PostgreSQL Full-Text Search
- **File Storage**: AWS S3

### Infrastructure
- **Platform**: Docker + Docker Swarm
- **Web Server**: Nginx
- **SSL**: Let's Encrypt
- **CDN**: Cloudflare
- **Monitoring**: Prometheus + Grafana
- **Logging**: Loki + Promtail
- **Error Tracking**: Sentry
- **APM**: New Relic

## Core Components

### 1. Frontend Application (Next.js)
- Server-side rendering for SEO
- Static generation for performance
- Client-side routing
- Progressive Web App capabilities
- Responsive design

### 2. Backend API (NestJS)
- RESTful API endpoints
- GraphQL support (future)
- Real-time communication via WebSockets
- JWT-based authentication
- Role-based access control
- Request validation and sanitization

### 3. Database Layer (PostgreSQL)
- Relational data storage
- ACID compliance
- Complex queries with joins
- Full-text search
- Transactional integrity

### 4. Cache Layer (Redis)
- Session storage
- API response caching
- Rate limiting
- Real-time data
- Pub/Sub messaging

### 5. File Storage (S3)
- User profile images
- Product images
- Document uploads
- Backup storage

## Data Flow

### User Registration Flow
```
User → Frontend → Backend API → Validation
                                    ↓
                              Hash Password
                                    ↓
                            PostgreSQL Insert
                                    ↓
                            Send Welcome Email
                                    ↓
                            Return JWT Token
                                    ↓
Frontend ← Backend API ← Store Session in Redis
```

### Product Search Flow
```
User → Frontend → Backend API → Check Redis Cache
                                        ↓
                                   Cache Miss?
                                        ↓
                              Query PostgreSQL
                                        ↓
                              Process Results
                                        ↓
                            Store in Redis Cache
                                        ↓
Frontend ← Backend API ← Return Results
```

### Order Creation Flow
```
User → Frontend → Backend API → Validate Cart
                                        ↓
                            Begin DB Transaction
                                        ↓
                              Create Order
                                        ↓
                          Create Order Items
                                        ↓
                          Update Inventory
                                        ↓
                         Process Payment
                                        ↓
                        Commit Transaction
                                        ↓
                      Send Notifications
                                        ↓
Frontend ← Backend API ← Return Order Details
```

## Security Architecture

### Authentication
- JWT tokens with refresh mechanism
- Secure password hashing (bcrypt)
- Rate limiting on auth endpoints
- Account lockout after failed attempts

### Authorization
- Role-based access control (RBAC)
- Resource ownership verification
- Permission middleware
- API key authentication for integrations

### Data Protection
- HTTPS everywhere (TLS 1.2+)
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- CSRF protection
- Content Security Policy headers

### Infrastructure Security
- Firewall rules (UFW)
- Fail2ban for intrusion prevention
- Regular security updates
- Docker container isolation
- Secrets management (Docker secrets)

## Scalability Strategy

### Horizontal Scaling
- Stateless application design
- Load balancing across multiple instances
- Database connection pooling
- Redis for session storage

### Vertical Scaling
- Resource allocation tuning
- Database query optimization
- Index optimization
- Caching strategies

### Performance Optimization
- CDN for static assets
- Image optimization (WebP, responsive images)
- Lazy loading
- Code splitting
- Database indexes
- Query result caching

## High Availability

### Application Layer
- Multiple application instances
- Health checks
- Automatic restart on failure
- Blue-green deployments

### Database Layer
- Regular backups (daily)
- Point-in-time recovery
- Replication (future)
- Connection pooling

### Monitoring
- Real-time metrics (Prometheus)
- Log aggregation (Loki)
- Error tracking (Sentry)
- Uptime monitoring (UptimeRobot)
- Alerting (PagerDuty)

## Disaster Recovery

### Backup Strategy
- Database: Daily automated backups (30-day retention)
- Files: S3 versioning enabled
- Configuration: Git version control
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 24 hours

### Incident Response
- Documented playbooks
- On-call rotation
- Escalation procedures
- Post-mortem process
```

### 1.2 Component Diagrams

**File:** `docs/architecture/component-diagrams.md`
```markdown
# Component Diagrams

## Frontend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Application                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────┐ │
│  │    Pages      │  │  Components   │  │   Hooks    │ │
│  │  - Home       │  │  - Header     │  │  - useAuth │ │
│  │  - Products   │  │  - Footer     │  │  - useCart │ │
│  │  - Profile    │  │  - ProductCard│  │  - useAPI  │ │
│  └───────┬───────┘  └───────┬───────┘  └─────┬──────┘ │
│          │                  │                 │        │
│  ┌───────▼──────────────────▼─────────────────▼──────┐ │
│  │              Redux Store (State)                  │ │
│  │  - auth    - products  - cart  - notifications   │ │
│  └───────────────────────┬───────────────────────────┘ │
│                          │                             │
│  ┌───────────────────────▼───────────────────────────┐ │
│  │                 API Services                      │ │
│  │  - AuthService  - ProductService  - OrderService │ │
│  └───────────────────────┬───────────────────────────┘ │
│                          │                             │
└──────────────────────────┼─────────────────────────────┘
                           │
                           ▼
                    Backend API
```

## Backend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   NestJS Application                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Controllers (HTTP)                    │ │
│  │  AuthController | ProductController | ...         │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │                                 │
│  ┌────────────────────▼───────────────────────────────┐ │
│  │              Guards & Middleware                   │ │
│  │  AuthGuard | RolesGuard | ValidationPipe          │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │                                 │
│  ┌────────────────────▼───────────────────────────────┐ │
│  │                 Services                           │ │
│  │  - Business Logic                                  │ │
│  │  - Data Validation                                 │ │
│  │  - External Integrations                           │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │                                 │
│  ┌────────────────────▼───────────────────────────────┐ │
│  │              Repositories                          │ │
│  │  - Data Access Layer                               │ │
│  │  - TypeORM Entities                                │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │                                 │
└───────────────────────┼─────────────────────────────────┘
                        │
                        ▼
              PostgreSQL Database
```

## Database Schema

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │  products   │       │   orders    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │◄──┐   │ id          │   ┌──►│ id          │
│ email       │   │   │ title       │   │   │ user_id     │
│ password    │   │   │ description │   │   │ seller_id   │
│ role        │   │   │ price       │   │   │ status      │
│ ...         │   │   │ user_id     │───┘   │ total       │
└─────────────┘   │   │ ...         │       │ ...         │
                  │   └─────────────┘       └─────────────┘
                  │           │                     │
                  │           │                     │
                  │   ┌───────▼─────────┐   ┌──────▼──────┐
                  │   │    reviews      │   │ order_items │
                  │   ├─────────────────┤   ├─────────────┤
                  │   │ id              │   │ id          │
                  │   │ product_id      │   │ order_id    │
                  │   │ user_id         │───┘ │ product_id  │
                  │   │ rating          │     │ quantity    │
                  │   │ comment         │     │ price       │
                  │   │ ...             │     │ ...         │
                  │   └─────────────────┘     └─────────────┘
                  │
                  │   ┌─────────────────┐
                  └──►│   messages      │
                      ├─────────────────┤
                      │ id              │
                      │ sender_id       │
                      │ receiver_id     │
                      │ content         │
                      │ ...             │
                      └─────────────────┘
```
```

---

## 2. API Documentation

### 2.1 API Overview

**File:** `docs/api/api-overview.md`
```markdown
# API Documentation

## Base URL
```
Production: https://api.yourdomain.com
Staging: https://api-staging.yourdomain.com
Development: http://localhost:3000
```

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format
All API responses follow this format:
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "timestamp": "2025-01-18T10:30:00Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": []
  },
  "timestamp": "2025-01-18T10:30:00Z"
}
```

## Rate Limiting
- **Unauthenticated**: 100 requests/hour
- **Authenticated**: 1000 requests/hour
- **Premium**: 5000 requests/hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642521600
```

## Pagination
List endpoints support pagination:
```
GET /api/products?page=1&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Filtering & Sorting
```
GET /api/products?category=electronics&sort=-createdAt&minPrice=100
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Endpoints

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Products

#### List Products
```http
GET /api/products?page=1&limit=20&category=electronics&sort=-createdAt
Authorization: Bearer <token>
```

#### Get Product
```http
GET /api/products/:id
Authorization: Bearer <token>
```

#### Create Product
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "category": "electronics",
  "images": ["url1", "url2"]
}
```

#### Update Product
```http
PUT /api/products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Name",
  "price": 89.99
}
```

#### Delete Product
```http
DELETE /api/products/:id
Authorization: Bearer <token>
```

### Orders

#### Create Order
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "City",
    "state": "State",
    "zipCode": "12345"
  }
}
```

#### Get User Orders
```http
GET /api/orders/my-orders?page=1&limit=10
Authorization: Bearer <token>
```

#### Get Order Details
```http
GET /api/orders/:id
Authorization: Bearer <token>
```

### WebSocket Events

Connect to WebSocket:
```javascript
const socket = io('wss://api.yourdomain.com', {
  auth: {
    token: 'jwt_token'
  }
});
```

#### Join Conversation
```javascript
socket.emit('join_conversation', { conversationId: 'uuid' });
```

#### Send Message
```javascript
socket.emit('send_message', {
  conversationId: 'uuid',
  content: 'Hello!'
});
```

#### Receive Message
```javascript
socket.on('new_message', (message) => {
  console.log(message);
});
```

## Swagger Documentation
Interactive API documentation available at:
```
https://api.yourdomain.com/api/docs
```
```

### 2.2 API Examples

**File:** `docs/api/examples.md`
```markdown
# API Usage Examples

## JavaScript/TypeScript

### Authentication
```typescript
import axios from 'axios';

const API_URL = 'https://api.yourdomain.com';

// Register
const register = async (userData) => {
  const response = await axios.post(`${API_URL}/api/auth/register`, userData);
  return response.data;
};

// Login
const login = async (email, password) => {
  const response = await axios.post(`${API_URL}/api/auth/login`, {
    email,
    password
  });

  // Store tokens
  localStorage.setItem('token', response.data.data.token);
  localStorage.setItem('refreshToken', response.data.data.refreshToken);

  return response.data;
};

// API client with auth
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken
          });
          localStorage.setItem('token', response.data.data.token);
          error.config.headers.Authorization = `Bearer ${response.data.data.token}`;
          return axios(error.config);
        } catch (refreshError) {
          // Refresh failed, logout user
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

### Products
```typescript
// List products
const getProducts = async (params) => {
  const response = await apiClient.get('/api/products', { params });
  return response.data;
};

// Get single product
const getProduct = async (id) => {
  const response = await apiClient.get(`/api/products/${id}`);
  return response.data;
};

// Create product
const createProduct = async (productData) => {
  const response = await apiClient.post('/api/products', productData);
  return response.data;
};

// Update product
const updateProduct = async (id, productData) => {
  const response = await apiClient.put(`/api/products/${id}`, productData);
  return response.data;
};

// Delete product
const deleteProduct = async (id) => {
  const response = await apiClient.delete(`/api/products/${id}`);
  return response.data;
};

// Search products
const searchProducts = async (query) => {
  const response = await apiClient.get('/api/products/search', {
    params: { q: query }
  });
  return response.data;
};
```

### File Upload
```typescript
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};
```

### WebSocket
```typescript
import { io } from 'socket.io-client';

const socket = io('wss://api.yourdomain.com', {
  auth: {
    token: localStorage.getItem('token')
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Join conversation
const joinConversation = (conversationId) => {
  socket.emit('join_conversation', { conversationId });
};

// Send message
const sendMessage = (conversationId, content) => {
  socket.emit('send_message', {
    conversationId,
    content
  });
};

// Receive messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // Update UI
});

// Receive notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // Show notification
});
```

## Python

```python
import requests
import json

API_URL = 'https://api.yourdomain.com'

class SocialSellingClient:
    def __init__(self):
        self.base_url = API_URL
        self.token = None
        self.session = requests.Session()

    def login(self, email, password):
        response = self.session.post(
            f'{self.base_url}/api/auth/login',
            json={'email': email, 'password': password}
        )
        response.raise_for_status()
        data = response.json()
        self.token = data['data']['token']
        self.session.headers.update({
            'Authorization': f'Bearer {self.token}'
        })
        return data

    def get_products(self, page=1, limit=20):
        response = self.session.get(
            f'{self.base_url}/api/products',
            params={'page': page, 'limit': limit}
        )
        response.raise_for_status()
        return response.json()

    def create_product(self, product_data):
        response = self.session.post(
            f'{self.base_url}/api/products',
            json=product_data
        )
        response.raise_for_status()
        return response.json()

# Usage
client = SocialSellingClient()
client.login('user@example.com', 'password')
products = client.get_products(page=1, limit=10)
print(products)
```

## cURL

```bash
# Login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'

# Get products
curl -X GET "https://api.yourdomain.com/api/products?page=1&limit=20" \
  -H "Authorization: Bearer <token>"

# Create product
curl -X POST https://api.yourdomain.com/api/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Product Name",
    "description": "Description",
    "price": 99.99,
    "category": "electronics"
  }'
```
```

---

## 3. Deployment Runbook

**File:** `docs/deployment/runbook.md`
```markdown
# Deployment Runbook

## Prerequisites
- [ ] Docker installed on deployment server
- [ ] Docker Swarm initialized
- [ ] SSL certificates obtained
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backup verified

## Pre-Deployment Checklist
- [ ] Code reviewed and approved
- [ ] Tests passing (unit, integration, e2e)
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Stakeholders notified

## Deployment Steps

### 1. Prepare Environment
```bash
# SSH into production server
ssh deploy@production-server

# Navigate to deployment directory
cd /opt/social-selling

# Pull latest changes
git fetch origin
git checkout main
git pull origin main

# Verify correct version
git log -1 --oneline
```

### 2. Build Docker Images
```bash
# Set version
export VERSION=$(git describe --tags --always)

# Build images
docker-compose -f docker-compose.production.yml build

# Tag images
docker tag social-selling-backend:latest registry.yourdomain.com/social-selling-backend:$VERSION
docker tag social-selling-frontend:latest registry.yourdomain.com/social-selling-frontend:$VERSION
docker tag social-selling-nginx:latest registry.yourdomain.com/social-selling-nginx:$VERSION

# Push to registry
docker push registry.yourdomain.com/social-selling-backend:$VERSION
docker push registry.yourdomain.com/social-selling-frontend:$VERSION
docker push registry.yourdomain.com/social-selling-nginx:$VERSION
```

### 3. Backup Database
```bash
# Create backup
./deployment/scripts/backup-database.sh

# Verify backup
ls -lh /opt/backups/postgres/

# Test backup integrity
gunzip -t /opt/backups/postgres/social-selling-$(date +%Y%m%d)*.sql.gz
```

### 4. Run Database Migrations
```bash
# Review pending migrations
docker exec $(docker ps -qf "name=social-selling_backend") \
  npm run migration:show

# Run migrations (dry-run first)
./deployment/scripts/run-migrations.sh true

# Run migrations
./deployment/scripts/run-migrations.sh
```

### 5. Deploy Application
```bash
# Option A: Rolling update (recommended)
./deployment/scripts/rolling-update.sh backend $VERSION
./deployment/scripts/rolling-update.sh frontend $VERSION
./deployment/scripts/rolling-update.sh nginx $VERSION

# Option B: Blue-green deployment
./deployment/scripts/blue-green-deploy.sh $VERSION

# Option C: Full stack deployment
./deployment/scripts/swarm-deploy.sh $VERSION
```

### 6. Verify Deployment
```bash
# Check service status
docker service ls

# Check container health
docker ps

# Run health checks
./deployment/scripts/health-check.sh

# Run smoke tests
./deployment/scripts/smoke-tests.sh https://yourdomain.com
```

### 7. Monitor Application
```bash
# Watch logs
docker service logs -f social-selling_backend

# Check metrics
# Visit: https://grafana.yourdomain.com

# Check error rates
# Visit: https://sentry.io
```

### 8. Post-Deployment Tasks
- [ ] Verify all features working
- [ ] Check error rates in Sentry
- [ ] Monitor response times
- [ ] Review logs for errors
- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Document any issues

## Rollback Procedure

### Quick Rollback
```bash
# Rollback single service
./deployment/scripts/rollback.sh backend

# Rollback all services
./deployment/scripts/rollback.sh all
```

### Full Stack Rollback
```bash
# Identify previous version
PREVIOUS_VERSION="v1.2.3"

# Redeploy previous version
./deployment/scripts/rollback-stack.sh $PREVIOUS_VERSION

# Verify rollback
./deployment/scripts/health-check.sh
```

### Database Rollback
```bash
# Revert migrations
./deployment/scripts/rollback-migration.sh 1

# Restore from backup
./deployment/scripts/restore-database.sh social-selling-20250118_103000.sql.gz
```

## Troubleshooting

### Deployment Fails
1. Check Docker service status
2. Review deployment logs
3. Verify environment variables
4. Check disk space
5. Verify database connectivity

### Health Checks Fail
1. Check application logs
2. Verify database connection
3. Check Redis connectivity
4. Review recent changes
5. Check resource usage

### High Error Rate After Deployment
1. Check Sentry for errors
2. Review application logs
3. Verify database migrations
4. Check external service status
5. Consider rollback

## Emergency Contacts

- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Engineering Lead**: +1-XXX-XXX-XXXX
- **CTO**: +1-XXX-XXX-XXXX
- **PagerDuty**: https://pagerduty.com
- **Status Page**: https://status.yourdomain.com
```

---

## 4. Operational Procedures

**File:** `docs/operations/procedures.md`
```markdown
# Operational Procedures

## Starting the Application

### Development
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# View logs
docker-compose logs -f backend
```

### Production
```bash
# Start stack
docker stack deploy -c deployment/docker-stack.production.yml social-selling

# Scale service
docker service scale social-selling_backend=5

# View service logs
docker service logs -f social-selling_backend
```

## Stopping the Application

### Development
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production
```bash
# Remove stack
docker stack rm social-selling

# Wait for services to stop
watch docker service ls
```

## Restarting Services

### Single Service
```bash
# Restart backend
docker service update --force social-selling_backend

# Restart with zero downtime
docker service update --update-parallelism 1 --update-delay 30s social-selling_backend
```

### All Services
```bash
# Update all services
for service in $(docker service ls --filter "name=social-selling" --format "{{.Name}}"); do
  docker service update --force $service
done
```

## Scaling Services

### Scale Up
```bash
# Scale backend to 5 replicas
docker service scale social-selling_backend=5

# Scale multiple services
docker service scale social-selling_backend=5 social-selling_frontend=3
```

### Scale Down
```bash
# Scale backend to 2 replicas
docker service scale social-selling_backend=2
```

### Auto-scaling (Future)
- Configure based on CPU/memory metrics
- Set min/max replicas
- Define scaling policies

## Database Operations

### Backup
```bash
# Manual backup
./deployment/scripts/backup-database.sh

# Verify backup
ls -lh /opt/backups/postgres/
```

### Restore
```bash
# List backups
ls -lh /opt/backups/postgres/

# Restore from backup
./deployment/scripts/restore-database.sh <backup-file>
```

### Migrations
```bash
# Show migration status
docker exec $(docker ps -qf "name=social-selling_backend") npm run migration:show

# Run migrations
./deployment/scripts/run-migrations.sh

# Revert migration
./deployment/scripts/rollback-migration.sh 1
```

### Maintenance
```bash
# Connect to database
docker exec -it $(docker ps -qf "name=social-selling_postgres") psql -U social_selling

# Vacuum database
VACUUM ANALYZE;

# Reindex database
REINDEX DATABASE social_selling;

# Check database size
SELECT pg_size_pretty(pg_database_size('social_selling'));
```

## Log Management

### View Logs
```bash
# Service logs
docker service logs -f social-selling_backend

# Container logs
docker logs -f <container-id>

# Follow logs from specific time
docker service logs --since 10m social-selling_backend
```

### Search Logs
```bash
# Search for errors
docker service logs social-selling_backend 2>&1 | grep -i error

# Search in Loki
# Visit: https://logs.yourdomain.com
```

### Log Rotation
- Configured in `/etc/logrotate.d/docker-containers`
- Rotates daily
- Keeps 7 days of logs
- Compresses old logs

## SSL Certificate Management

### Renew Certificates
```bash
# Manual renewal
docker run --rm \
  -v /opt/letsencrypt/certs:/etc/letsencrypt \
  -v /opt/letsencrypt/www:/var/www/certbot \
  certbot/certbot renew

# Reload Nginx
docker service update --force social-selling_nginx
```

### Certificate Status
```bash
# Check expiration
docker run --rm \
  -v /opt/letsencrypt/certs:/etc/letsencrypt \
  certbot/certbot certificates
```

## Cache Management

### Clear Cache
```bash
# Clear all cache
docker exec -it $(docker ps -qf "name=social-selling_redis") redis-cli FLUSHALL

# Clear specific keys
docker exec -it $(docker ps -qf "name=social-selling_redis") redis-cli DEL "products:*"
```

### Cache Statistics
```bash
# Redis info
docker exec $(docker ps -qf "name=social-selling_redis") redis-cli INFO

# Memory usage
docker exec $(docker ps -qf "name=social-selling_redis") redis-cli INFO memory
```

## Security Operations

### Update System Packages
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Reboot if required
sudo reboot
```

### Security Scan
```bash
# Scan Docker images
trivy image registry.yourdomain.com/social-selling-backend:latest

# Scan for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### Access Control
```bash
# Add user to docker group
sudo usermod -aG docker username

# Review firewall rules
sudo ufw status

# Review fail2ban status
sudo fail2ban-client status
```

## Monitoring & Alerts

### Check Metrics
- **Grafana**: https://grafana.yourdomain.com
- **Prometheus**: https://prometheus.yourdomain.com:9090

### Acknowledge Alerts
1. Login to PagerDuty
2. Acknowledge alert
3. Create incident channel
4. Begin investigation

### Silence Alerts
```bash
# Silence alert in Alertmanager
amtool silence add alertname=HighCPUUsage --duration=2h
```
```

---

## 5. Troubleshooting Guides

**File:** `docs/troubleshooting/common-issues.md`
```markdown
# Troubleshooting Guide

## Common Issues

### 1. Application Won't Start

**Symptoms:**
- Services fail to start
- Container exits immediately
- Health checks fail

**Diagnosis:**
```bash
# Check service status
docker service ps social-selling_backend --no-trunc

# View logs
docker service logs social-selling_backend

# Check resource usage
docker stats
```

**Solutions:**

**Issue: Port already in use**
```bash
# Find process using port
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

**Issue: Out of disk space**
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a

# Remove old logs
sudo journalctl --vacuum-time=3d
```

**Issue: Missing environment variables**
```bash
# Verify .env file exists
cat .env.production

# Check Docker secrets
docker secret ls
```

### 2. Database Connection Issues

**Symptoms:**
- "Connection refused" errors
- "Too many connections" errors
- Slow database queries

**Diagnosis:**
```bash
# Check database status
docker exec $(docker ps -qf "name=social-selling_postgres") pg_isready

# Check active connections
docker exec $(docker ps -qf "name=social-selling_postgres") psql -U social_selling -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
docker exec $(docker ps -qf "name=social-selling_postgres") psql -U social_selling -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Solutions:**

**Issue: Database not running**
```bash
# Start database
docker service scale social-selling_postgres=1

# Check logs
docker service logs social-selling_postgres
```

**Issue: Connection pool exhausted**
```bash
# Restart backend to reset pool
docker service update --force social-selling_backend

# Increase pool size (in code)
# Edit src/config/database.config.ts
# max: 20 -> max: 30
```

**Issue: Slow queries**
```bash
# Add indexes
docker exec $(docker ps -qf "name=social-selling_postgres") psql -U social_selling -d social_selling -c "CREATE INDEX CONCURRENTLY idx_products_user_id ON products(user_id);"

# Analyze tables
docker exec $(docker ps -qf "name=social-selling_postgres") psql -U social_selling -d social_selling -c "ANALYZE;"
```

### 3. High CPU/Memory Usage

**Symptoms:**
- Slow application response
- Server unresponsive
- Out of memory errors

**Diagnosis:**
```bash
# Check server resources
top
htop

# Check container resources
docker stats

# Check specific service
docker service ps social-selling_backend
```

**Solutions:**

**Issue: Memory leak**
```bash
# Restart service
docker service update --force social-selling_backend

# Monitor memory usage
watch -n 1 docker stats
```

**Issue: High CPU usage**
```bash
# Scale horizontally
docker service scale social-selling_backend=5

# Check for infinite loops in code
docker service logs social-selling_backend | grep -i "loop\|timeout"
```

### 4. SSL/HTTPS Issues

**Symptoms:**
- SSL certificate warnings
- HTTPS not working
- Mixed content warnings

**Diagnosis:**
```bash
# Check certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiration
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Solutions:**

**Issue: Certificate expired**
```bash
# Renew certificate
docker run --rm \
  -v /opt/letsencrypt/certs:/etc/letsencrypt \
  -v /opt/letsencrypt/www:/var/www/certbot \
  certbot/certbot renew

# Reload Nginx
docker service update --force social-selling_nginx
```

**Issue: Mixed content**
- Update all HTTP URLs to HTTPS in code
- Check API base URL configuration
- Verify CDN URLs use HTTPS

### 5. WebSocket Connection Issues

**Symptoms:**
- Real-time features not working
- WebSocket connection fails
- Messages not delivered

**Diagnosis:**
```bash
# Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  https://api.yourdomain.com/socket.io/

# Check Nginx configuration
docker exec $(docker ps -qf "name=social-selling_nginx") cat /etc/nginx/conf.d/default.conf | grep -A 10 "location /ws"
```

**Solutions:**

**Issue: Nginx not proxying WebSocket**
- Verify Nginx configuration includes WebSocket headers
- Reload Nginx configuration

**Issue: CORS blocking WebSocket**
- Update CORS configuration in backend
- Add WebSocket origin to allowed origins

### 6. Redis Connection Issues

**Symptoms:**
- Cache not working
- Session errors
- "Connection refused" errors

**Diagnosis:**
```bash
# Check Redis status
docker exec $(docker ps -qf "name=social-selling_redis") redis-cli ping

# Check Redis connections
docker exec $(docker ps -qf "name=social-selling_redis") redis-cli CLIENT LIST
```

**Solutions:**

**Issue: Redis not running**
```bash
# Start Redis
docker service scale social-selling_redis=1
```

**Issue: Redis out of memory**
```bash
# Check memory usage
docker exec $(docker ps -qf "name=social-selling_redis") redis-cli INFO memory

# Flush cache
docker exec $(docker ps -qf "name=social-selling_redis") redis-cli FLUSHALL

# Increase memory limit
# Edit docker-stack.production.yml
# --maxmemory 512mb -> --maxmemory 1024mb
```

## Performance Issues

### Slow Page Load

**Diagnosis:**
1. Check Lighthouse score
2. Analyze bundle size
3. Check API response times
4. Verify CDN is working

**Solutions:**
- Optimize images
- Enable compression
- Implement code splitting
- Use CDN for static assets

### Slow API Response

**Diagnosis:**
1. Check API response time in Grafana
2. Review slow query logs
3. Check cache hit rate
4. Analyze database query plans

**Solutions:**
- Add database indexes
- Optimize queries
- Implement caching
- Scale backend horizontally

## Getting Help

1. **Check Documentation**: Review relevant docs
2. **Search Logs**: Check application and system logs
3. **Check Monitoring**: Review Grafana dashboards
4. **Review Recent Changes**: Check git history
5. **Ask Team**: Post in #engineering Slack channel
6. **Escalate**: Contact on-call engineer if critical
```

---

## 6. Database Schema Documentation

**File:** `docs/database/schema.md`
```markdown
# Database Schema Documentation

## Overview
PostgreSQL 15 database with full ACID compliance, supporting complex relationships and full-text search.

## Tables

### users
Primary user accounts table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| password | VARCHAR(255) | NOT NULL | Hashed password |
| first_name | VARCHAR(100) | | First name |
| last_name | VARCHAR(100) | | Last name |
| role | ENUM | NOT NULL | user, seller, admin |
| status | ENUM | NOT NULL | active, suspended, deleted |
| email_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| avatar_url | VARCHAR(500) | | Profile image URL |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |
| deleted_at | TIMESTAMP | | Soft delete timestamp |

**Indexes:**
- `idx_users_email_lower` on `LOWER(email)`
- `idx_users_role_status` on `(role, status)`
- `idx_users_created_at` on `created_at DESC`

### products
Product listings table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | FOREIGN KEY users(id) | Seller |
| title | VARCHAR(200) | NOT NULL | Product title |
| description | TEXT | | Product description |
| price | DECIMAL(10,2) | NOT NULL | Product price |
| category | VARCHAR(50) | NOT NULL | Product category |
| condition | ENUM | NOT NULL | new, used, refurbished |
| status | ENUM | NOT NULL | draft, active, sold, archived |
| quantity | INTEGER | DEFAULT 1 | Available quantity |
| images | JSONB | | Array of image URLs |
| location | VARCHAR(200) | | Product location |
| views | INTEGER | DEFAULT 0 | View count |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |
| deleted_at | TIMESTAMP | | Soft delete timestamp |

**Indexes:**
- `idx_products_user_status` on `(user_id, status)`
- `idx_products_category_status` on `(category, status)`
- `idx_products_price` on `price`
- `idx_products_created_at` on `created_at DESC`
- `idx_products_search` GIN index for full-text search

### orders
Order transactions table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| user_id | UUID | FOREIGN KEY users(id) | Buyer |
| seller_id | UUID | FOREIGN KEY users(id) | Seller |
| status | ENUM | NOT NULL | pending, processing, shipped, completed, cancelled |
| total_amount | DECIMAL(10,2) | NOT NULL | Total order amount |
| shipping_address | JSONB | NOT NULL | Shipping address |
| payment_method | VARCHAR(50) | | Payment method |
| payment_status | ENUM | | pending, paid, refunded |
| tracking_number | VARCHAR(100) | | Shipment tracking |
| notes | TEXT | | Order notes |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- `idx_orders_user_status` on `(user_id, status, created_at DESC)`
- `idx_orders_seller_status` on `(seller_id, status, created_at DESC)`
- `idx_orders_status_created` on `(status, created_at DESC)`

### order_items
Order line items table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| order_id | UUID | FOREIGN KEY orders(id) | Order reference |
| product_id | UUID | FOREIGN KEY products(id) | Product reference |
| quantity | INTEGER | NOT NULL | Quantity ordered |
| price | DECIMAL(10,2) | NOT NULL | Price at time of order |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |

**Indexes:**
- `idx_order_items_order` on `order_id`
- `idx_order_items_product` on `product_id`

### messages
Direct messaging table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| conversation_id | UUID | NOT NULL | Conversation reference |
| sender_id | UUID | FOREIGN KEY users(id) | Message sender |
| receiver_id | UUID | FOREIGN KEY users(id) | Message receiver |
| content | TEXT | NOT NULL | Message content |
| read_at | TIMESTAMP | | Read timestamp |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |

**Indexes:**
- `idx_messages_conversation_created` on `(conversation_id, created_at DESC)`
- `idx_messages_sender` on `(sender_id, created_at DESC)`
- `idx_messages_unread` on `(receiver_id, read_at)` WHERE `read_at IS NULL`

### reviews
Product reviews table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| product_id | UUID | FOREIGN KEY products(id) | Product reference |
| user_id | UUID | FOREIGN KEY users(id) | Reviewer |
| rating | INTEGER | NOT NULL CHECK (1-5) | Star rating |
| comment | TEXT | | Review comment |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- `idx_reviews_product_rating` on `(product_id, rating, created_at DESC)`
- `idx_reviews_user` on `(user_id, created_at DESC)`

## Relationships

```
users (1) ----< (N) products
users (1) ----< (N) orders (as buyer)
users (1) ----< (N) orders (as seller)
orders (1) ----< (N) order_items
products (1) ----< (N) order_items
products (1) ----< (N) reviews
users (1) ----< (N) reviews
users (1) ----< (N) messages (as sender)
users (1) ----< (N) messages (as receiver)
```

## Constraints

- All tables use UUID primary keys
- Soft deletes implemented via `deleted_at` timestamp
- Foreign keys enforce referential integrity
- CHECK constraints validate data ranges
- UNIQUE constraints prevent duplicates

## Migrations

Migrations stored in: `src/database/migrations/`

Run migrations:
```bash
npm run migration:run
```

Revert migration:
```bash
npm run migration:revert
```
```

---

## 7-10. Additional Documentation Files

Due to length constraints, I'll provide the structure for the remaining sections:

**File:** `docs/development/environment-setup.md`
- Local development setup
- Docker setup
- Database setup
- Environment variables
- IDE configuration
- Git workflow

**File:** `docs/development/workflow.md`
- Branch strategy
- Code review process
- Testing requirements
- Commit conventions
- Pull request process

**File:** `docs/security/checklist.md`
- Security best practices
- OWASP Top 10
- Authentication security
- Data protection
- Infrastructure security
- Compliance requirements

**File:** `docs/handoff/training-plan.md`
- Technical overview training
- Deployment training
- Operations training
- Monitoring training
- Incident response training
- Knowledge transfer schedule

---

## Acceptance Criteria

### Must Have (25+ criteria)

1. ✅ System architecture diagrams created
2. ✅ Component diagrams documented
3. ✅ Data flow diagrams documented
4. ✅ Complete API documentation
5. ✅ API examples for all major endpoints
6. ✅ Swagger/OpenAPI documentation exported
7. ✅ Deployment runbook completed
8. ✅ Operational procedures documented
9. ✅ Start/stop procedures documented
10. ✅ Scaling procedures documented
11. ✅ Troubleshooting guide completed
12. ✅ Common issues documented
13. ✅ Database schema documentation
14. ✅ Entity relationship diagrams
15. ✅ Migration guide documented
16. ✅ Environment setup guide
17. ✅ Development workflow documented
18. ✅ Git workflow documented
19. ✅ Security checklist completed
20. ✅ OWASP compliance documented
21. ✅ Training plan created
22. ✅ Training schedule defined
23. ✅ Knowledge base created
24. ✅ Video tutorials recorded (optional)
25. ✅ Team trained on all procedures
26. ✅ Documentation reviewed and approved
27. ✅ Handoff complete

### Should Have

- Video walkthroughs for complex procedures
- Interactive API documentation
- Automated documentation generation
- Regular documentation updates
- Documentation feedback process

### Could Have

- AI-powered chatbot for documentation
- Interactive architecture explorer
- Automated runbook execution
- Documentation versioning
- Multi-language documentation

---

## Dependencies

### Requires
- All DEPLOY tasks (001-004) complete
- All development complete
- Production deployment successful

### Blocks
- Project handoff
- Team onboarding
- Maintenance operations

---

## Definition of Done

- [ ] All architecture diagrams created
- [ ] Complete API documentation
- [ ] Deployment runbook tested
- [ ] Operational procedures verified
- [ ] Troubleshooting guide comprehensive
- [ ] Database schema documented
- [ ] Environment setup guide tested
- [ ] Development workflow documented
- [ ] Security checklist complete
- [ ] Training sessions completed
- [ ] Team can operate system independently
- [ ] Documentation reviewed and approved

---

**Task ID:** DEPLOY-005
**Created:** 2025-01-18
**Epic:** Epic 13 - Deployment & DevOps
**Sprint:** Deployment Sprint
**Estimated Hours:** 50-70 hours
**Actual Hours:** _TBD_
