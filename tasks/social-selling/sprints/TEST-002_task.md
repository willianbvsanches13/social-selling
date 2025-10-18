# TEST-002: Integration Testing

## Epic
Testing Infrastructure & Quality Assurance

## Story
As a developer, I need comprehensive integration tests using Supertest to verify end-to-end API functionality, database interactions, authentication flows, Instagram API integration, webhook processing, and background job execution with real database fixtures and complete request/response validation.

## Priority
P0 - Critical

## Estimated Effort
13 Story Points (Large)

## Dependencies
- TEST-001: Unit Testing Setup (test infrastructure)
- Authentication implementation (JWT, OAuth)
- Instagram Graph API integration
- Database schema and migrations
- BullMQ workers implementation
- Webhook handlers

## Technical Context

### Technology Stack
- **HTTP Testing**: Supertest for API testing
- **Test Framework**: Jest with custom integration config
- **Database**: PostgreSQL with test fixtures
- **Authentication**: JWT tokens with test users
- **API Mocking**: MSW for external API calls
- **Queue Testing**: BullMQ test utilities
- **Webhook Testing**: ngrok for local testing
- **Data Seeding**: Custom seed scripts
- **Validation**: class-validator testing

### Architecture Overview
```
┌──────────────────────────────────────────────────┐
│        Integration Test Infrastructure           │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │         Supertest Client               │    │
│  │  - HTTP requests to NestJS app        │    │
│  │  - Authentication headers              │    │
│  │  - Request/Response validation         │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  Test Database │    │  Mock Instagram  │    │
│  │  - Fixtures    │    │  API (MSW)       │    │
│  │  - Seeds       │    │  - OAuth flow    │    │
│  │  - Cleanup     │    │  - Webhooks      │    │
│  └────────────────┘    └──────────────────┘    │
│                                                  │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  BullMQ Queue  │    │  WebSocket Test  │    │
│  │  - Job testing │    │  - Realtime      │    │
│  │  - Workers     │    │  - Events        │    │
│  └────────────────┘    └──────────────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Testing Strategy
- **Full Request/Response Cycle**: Test entire HTTP flow
- **Database Transactions**: Roll back after each test
- **Real Dependencies**: Use actual Postgres, Redis, MinIO
- **Mock External APIs**: Instagram, payment gateways
- **Fixture Data**: Predefined test data sets
- **Authentication Testing**: JWT generation and validation
- **Webhook Simulation**: Test webhook endpoints
- **Job Queue Testing**: Verify background job execution

## Detailed Requirements

### 1. Integration Test Configuration

#### Jest Integration Config
```typescript
// jest.integration.config.ts

import baseConfig from './jest.config';
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  ...baseConfig,
  displayName: 'integration',
  testMatch: [
    '**/test/integration/**/*.test.ts',
    '**/*.integration.test.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '.*\\.spec\\.ts$',
    '.*\\.e2e\\.test\\.ts$',
  ],

  // Integration tests can take longer
  testTimeout: 30000,

  // Run integration tests sequentially
  maxWorkers: 1,

  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup.ts'],
  globalSetup: '<rootDir>/test/integration/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/global-teardown.ts',
};

export default config;
```

#### Integration Test Setup
```typescript
// test/integration/setup.ts

import { config } from 'dotenv';
import path from 'path';
import { instagramApiMockServer } from '@test/mocks/instagram-api.mock';

// Load test environment
config({ path: path.join(__dirname, '../../.env.test') });

// Global timeout for integration tests
jest.setTimeout(30000);

// Start MSW server for API mocking
beforeAll(() => {
  instagramApiMockServer.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  instagramApiMockServer.resetHandlers();
});

afterAll(() => {
  instagramApiMockServer.close();
});

// Suppress console logs in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
```

### 2. Supertest Test Utilities

#### Test Application Bootstrap
```typescript
// test/integration/helpers/test-app.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/shared/prisma/prisma.service';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';

export class TestApp {
  private app: INestApplication;
  private prisma: PrismaService;

  async initialize(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.prisma = this.app.get(PrismaService);

    // Apply same middleware as production
    this.app.use(cookieParser());
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await this.app.init();
  }

  async cleanDatabase(): Promise<void> {
    const tablenames = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.prisma.$executeRawUnsafe(
            `TRUNCATE TABLE "public"."${tablename}" CASCADE;`
          );
        } catch (error) {
          console.log(`Could not truncate table ${tablename}`);
        }
      }
    }
  }

  async close(): Promise<void> {
    await this.app.close();
  }

  getApp(): INestApplication {
    return this.app;
  }

  getPrisma(): PrismaService {
    return this.prisma;
  }

  getHttpServer() {
    return this.app.getHttpServer();
  }

  request() {
    return request(this.app.getHttpServer());
  }
}

// Global test app instance
export let testApp: TestApp;

export async function setupTestApp(): Promise<TestApp> {
  testApp = new TestApp();
  await testApp.initialize();
  return testApp;
}

export async function teardownTestApp(): Promise<void> {
  if (testApp) {
    await testApp.close();
  }
}
```

#### Authentication Test Helper
```typescript
// test/integration/helpers/auth-helper.ts

import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { UserFactory } from '@test/factories/user.factory';

export class AuthHelper {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async createUser(overrides: Partial<User> = {}): Promise<User> {
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    return this.prisma.user.create({
      data: {
        ...UserFactory.create(),
        password: hashedPassword,
        ...overrides,
      },
    });
  }

  generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  getAuthHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }

  async createAuthenticatedUser(
    overrides: Partial<User> = {}
  ): Promise<{ user: User; token: string; headers: { Authorization: string } }> {
    const user = await this.createUser(overrides);
    const token = this.generateToken(user);
    const headers = this.getAuthHeader(token);

    return { user, token, headers };
  }

  async createUserWithInstagramAccount(
    overrides: Partial<User> = {}
  ): Promise<{
    user: User;
    account: any;
    token: string;
    headers: { Authorization: string };
  }> {
    const { user, token, headers } = await this.createAuthenticatedUser(overrides);

    const account = await this.prisma.instagramAccount.create({
      data: {
        userId: user.id,
        instagramUserId: '123456789',
        username: 'test_account',
        accessToken: 'test_access_token',
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        accountType: 'BUSINESS',
        isActive: true,
      },
    });

    return { user, account, token, headers };
  }
}
```

### 3. Test Fixtures & Seeds

#### Fixture Manager
```typescript
// test/integration/fixtures/fixture-manager.ts

import { PrismaService } from '@/shared/prisma/prisma.service';
import { User, InstagramAccount, Product, Conversation, Message } from '@prisma/client';

export interface FixtureData {
  users?: Partial<User>[];
  instagramAccounts?: Partial<InstagramAccount>[];
  products?: Partial<Product>[];
  conversations?: Partial<Conversation>[];
  messages?: Partial<Message>[];
}

export class FixtureManager {
  constructor(private prisma: PrismaService) {}

  async load(fixtures: FixtureData): Promise<{
    users: User[];
    instagramAccounts: InstagramAccount[];
    products: Product[];
    conversations: Conversation[];
    messages: Message[];
  }> {
    const result = {
      users: [] as User[],
      instagramAccounts: [] as InstagramAccount[],
      products: [] as Product[],
      conversations: [] as Conversation[],
      messages: [] as Message[],
    };

    // Load users first
    if (fixtures.users) {
      for (const userData of fixtures.users) {
        const user = await this.prisma.user.create({
          data: userData as any,
        });
        result.users.push(user);
      }
    }

    // Load Instagram accounts
    if (fixtures.instagramAccounts) {
      for (const accountData of fixtures.instagramAccounts) {
        const account = await this.prisma.instagramAccount.create({
          data: accountData as any,
        });
        result.instagramAccounts.push(account);
      }
    }

    // Load products
    if (fixtures.products) {
      for (const productData of fixtures.products) {
        const product = await this.prisma.product.create({
          data: productData as any,
        });
        result.products.push(product);
      }
    }

    // Load conversations
    if (fixtures.conversations) {
      for (const conversationData of fixtures.conversations) {
        const conversation = await this.prisma.conversation.create({
          data: conversationData as any,
        });
        result.conversations.push(conversation);
      }
    }

    // Load messages
    if (fixtures.messages) {
      for (const messageData of fixtures.messages) {
        const message = await this.prisma.message.create({
          data: messageData as any,
        });
        result.messages.push(message);
      }
    }

    return result;
  }

  async loadFromFile(filename: string): Promise<any> {
    const fixtures = await import(`./data/${filename}`);
    return this.load(fixtures.default);
  }
}
```

#### Example Fixture Data
```typescript
// test/integration/fixtures/data/basic-setup.fixture.ts

import * as bcrypt from 'bcrypt';

export default {
  users: [
    {
      email: 'user1@example.com',
      name: 'Test User 1',
      password: bcrypt.hashSync('Password123!', 10),
      role: 'USER',
      emailVerified: true,
      isActive: true,
    },
    {
      email: 'user2@example.com',
      name: 'Test User 2',
      password: bcrypt.hashSync('Password123!', 10),
      role: 'USER',
      emailVerified: true,
      isActive: true,
    },
    {
      email: 'admin@example.com',
      name: 'Admin User',
      password: bcrypt.hashSync('Admin123!', 10),
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
    },
  ],
  instagramAccounts: [
    {
      userId: 'user-1-id', // Will be replaced with actual ID
      instagramUserId: '111111111',
      username: 'test_user_1',
      accessToken: 'access_token_1',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      accountType: 'BUSINESS',
      isActive: true,
    },
  ],
  products: [
    {
      userId: 'user-1-id',
      name: 'Test Product 1',
      description: 'A test product for integration testing',
      price: 99.99,
      currency: 'USD',
      sku: 'TEST-PROD-001',
      stockQuantity: 100,
      imageUrls: ['https://example.com/image1.jpg'],
      status: 'ACTIVE',
      category: 'Electronics',
      tags: ['test', 'product'],
    },
  ],
};
```

### 4. Authentication Flow Tests

```typescript
// test/integration/auth/auth.integration.test.ts

import { TestApp } from '../helpers/test-app';
import * as request from 'supertest';

describe('Authentication Integration Tests', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = new TestApp();
    await app.initialize();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.cleanDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New User',
      };

      const response = await app
        .request()
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toMatchObject({
        user: {
          email: registerDto.email,
          name: registerDto.name,
          role: 'USER',
        },
        accessToken: expect.any(String),
      });

      // Verify user in database
      const user = await app.getPrisma().user.findUnique({
        where: { email: registerDto.email },
      });

      expect(user).toBeTruthy();
      expect(user?.password).not.toBe(registerDto.password); // Password should be hashed
    });

    it('should reject registration with weak password', async () => {
      const response = await app
        .request()
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // Too weak
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.message).toContain('password');
    });

    it('should reject registration with duplicate email', async () => {
      const registerDto = {
        email: 'duplicate@example.com',
        password: 'Password123!',
        name: 'User 1',
      };

      // First registration
      await app.request().post('/auth/register').send(registerDto).expect(201);

      // Duplicate registration
      const response = await app
        .request()
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should reject registration with invalid email', async () => {
      const response = await app
        .request()
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.message).toContain('email');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      // Register user first
      const credentials = {
        email: 'loginuser@example.com',
        password: 'Password123!',
      };

      await app
        .request()
        .post('/auth/register')
        .send({ ...credentials, name: 'Login User' });

      // Login
      const response = await app
        .request()
        .post('/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          email: credentials.email,
        },
        accessToken: expect.any(String),
      });
    });

    it('should reject login with invalid password', async () => {
      // Register user
      await app
        .request()
        .post('/auth/register')
        .send({
          email: 'user@example.com',
          password: 'CorrectPassword123!',
          name: 'Test User',
        });

      // Login with wrong password
      const response = await app
        .request()
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login for non-existent user', async () => {
      const response = await app
        .request()
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid token', async () => {
      // Register and login
      const credentials = {
        email: 'me@example.com',
        password: 'Password123!',
        name: 'Me User',
      };

      const loginResponse = await app
        .request()
        .post('/auth/register')
        .send(credentials);

      const token = loginResponse.body.accessToken;

      // Get current user
      const response = await app
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: credentials.email,
        name: credentials.name,
      });
    });

    it('should reject request without token', async () => {
      await app.request().get('/auth/me').expect(401);
    });

    it('should reject request with invalid token', async () => {
      await app
        .request()
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token', async () => {
      // Register user
      const loginResponse = await app
        .request()
        .post('/auth/register')
        .send({
          email: 'refresh@example.com',
          password: 'Password123!',
          name: 'Refresh User',
        });

      const refreshToken = loginResponse.body.refreshToken;

      // Refresh token
      const response = await app
        .request()
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user and invalidate token', async () => {
      const loginResponse = await app
        .request()
        .post('/auth/register')
        .send({
          email: 'logout@example.com',
          password: 'Password123!',
          name: 'Logout User',
        });

      const token = loginResponse.body.accessToken;

      // Logout
      await app
        .request()
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Token should no longer work
      await app
        .request()
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });
});
```

### 5. Instagram OAuth Integration Tests

```typescript
// test/integration/instagram/oauth.integration.test.ts

import { TestApp } from '../helpers/test-app';
import { AuthHelper } from '../helpers/auth-helper';
import { JwtService } from '@nestjs/jwt';

describe('Instagram OAuth Integration Tests', () => {
  let app: TestApp;
  let authHelper: AuthHelper;

  beforeAll(async () => {
    app = new TestApp();
    await app.initialize();

    const jwtService = app.getApp().get(JwtService);
    authHelper = new AuthHelper(app.getPrisma(), jwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.cleanDatabase();
  });

  describe('GET /instagram/auth/url', () => {
    it('should return Instagram OAuth URL', async () => {
      const { headers } = await authHelper.createAuthenticatedUser();

      const response = await app
        .request()
        .get('/instagram/auth/url')
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({
        url: expect.stringContaining('instagram.com'),
        state: expect.any(String),
      });

      // Verify state is stored in database
      const user = await app.getPrisma().user.findFirst();
      expect(user?.instagramOAuthState).toBe(response.body.state);
    });

    it('should require authentication', async () => {
      await app.request().get('/instagram/auth/url').expect(401);
    });
  });

  describe('GET /instagram/auth/callback', () => {
    it('should handle successful OAuth callback', async () => {
      const { user } = await authHelper.createAuthenticatedUser();

      // Set OAuth state
      const state = 'test-state-123';
      await app.getPrisma().user.update({
        where: { id: user.id },
        data: { instagramOAuthState: state },
      });

      const response = await app
        .request()
        .get('/instagram/auth/callback')
        .query({
          code: 'valid_auth_code',
          state: state,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        account: {
          username: expect.any(String),
          instagramUserId: expect.any(String),
        },
      });

      // Verify account created in database
      const account = await app.getPrisma().instagramAccount.findFirst({
        where: { userId: user.id },
      });

      expect(account).toBeTruthy();
      expect(account?.accessToken).toBeTruthy();
    });

    it('should reject invalid state', async () => {
      await app
        .request()
        .get('/instagram/auth/callback')
        .query({
          code: 'auth_code',
          state: 'invalid_state',
        })
        .expect(400);
    });

    it('should handle OAuth errors', async () => {
      const response = await app
        .request()
        .get('/instagram/auth/callback')
        .query({
          error: 'access_denied',
          error_description: 'User denied access',
        })
        .expect(400);

      expect(response.body.message).toContain('denied');
    });
  });

  describe('POST /instagram/accounts/:id/disconnect', () => {
    it('should disconnect Instagram account', async () => {
      const { user, account, headers } =
        await authHelper.createUserWithInstagramAccount();

      await app
        .request()
        .post(`/instagram/accounts/${account.id}/disconnect`)
        .set(headers)
        .expect(200);

      // Verify account is deactivated
      const updatedAccount = await app.getPrisma().instagramAccount.findUnique({
        where: { id: account.id },
      });

      expect(updatedAccount?.isActive).toBe(false);
    });

    it('should not allow disconnecting another user account', async () => {
      const { account } = await authHelper.createUserWithInstagramAccount();
      const { headers: otherUserHeaders } =
        await authHelper.createAuthenticatedUser({
          email: 'other@example.com',
        });

      await app
        .request()
        .post(`/instagram/accounts/${account.id}/disconnect`)
        .set(otherUserHeaders)
        .expect(403);
    });
  });

  describe('POST /instagram/accounts/:id/refresh-token', () => {
    it('should refresh Instagram access token', async () => {
      const { account, headers } =
        await authHelper.createUserWithInstagramAccount();

      const response = await app
        .request()
        .post(`/instagram/accounts/${account.id}/refresh-token`)
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        expiresAt: expect.any(String),
      });

      // Verify token updated in database
      const updatedAccount = await app.getPrisma().instagramAccount.findUnique({
        where: { id: account.id },
      });

      expect(updatedAccount?.accessToken).not.toBe(account.accessToken);
    });
  });
});
```

### 6. Product CRUD Integration Tests

```typescript
// test/integration/products/products.integration.test.ts

import { TestApp } from '../helpers/test-app';
import { AuthHelper } from '../helpers/auth-helper';
import { JwtService } from '@nestjs/jwt';
import { ProductFactory } from '@test/factories/product.factory';

describe('Products Integration Tests', () => {
  let app: TestApp;
  let authHelper: AuthHelper;

  beforeAll(async () => {
    app = new TestApp();
    await app.initialize();

    const jwtService = app.getApp().get(JwtService);
    authHelper = new AuthHelper(app.getPrisma(), jwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.cleanDatabase();
  });

  describe('POST /products', () => {
    it('should create a new product', async () => {
      const { user, headers } = await authHelper.createAuthenticatedUser();

      const productDto = {
        name: 'New Product',
        description: 'A great product',
        price: 99.99,
        currency: 'USD',
        sku: 'PROD-001',
        stockQuantity: 50,
        category: 'Electronics',
        tags: ['tech', 'gadget'],
      };

      const response = await app
        .request()
        .post('/products')
        .set(headers)
        .send(productDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        ...productDto,
        userId: user.id,
        createdAt: expect.any(String),
      });

      // Verify in database
      const product = await app.getPrisma().product.findUnique({
        where: { id: response.body.id },
      });

      expect(product).toBeTruthy();
    });

    it('should reject product with invalid price', async () => {
      const { headers } = await authHelper.createAuthenticatedUser();

      const response = await app
        .request()
        .post('/products')
        .set(headers)
        .send({
          name: 'Invalid Product',
          price: -10,
          currency: 'USD',
        })
        .expect(400);

      expect(response.body.message).toContain('price');
    });

    it('should reject product with duplicate SKU', async () => {
      const { headers } = await authHelper.createAuthenticatedUser();

      const productDto = {
        name: 'Product 1',
        price: 99.99,
        sku: 'DUPLICATE-SKU',
      };

      // Create first product
      await app.request().post('/products').set(headers).send(productDto);

      // Try to create duplicate
      const response = await app
        .request()
        .post('/products')
        .set(headers)
        .send({ ...productDto, name: 'Product 2' })
        .expect(409);

      expect(response.body.message).toContain('SKU');
    });

    it('should require authentication', async () => {
      await app
        .request()
        .post('/products')
        .send({ name: 'Test', price: 10 })
        .expect(401);
    });
  });

  describe('GET /products', () => {
    it('should return user products', async () => {
      const { user, headers } = await authHelper.createAuthenticatedUser();

      // Create products
      await app.getPrisma().product.createMany({
        data: ProductFactory.createMany(user.id, 3),
      });

      const response = await app
        .request()
        .get('/products')
        .set(headers)
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body.every((p: any) => p.userId === user.id)).toBe(true);
    });

    it('should support pagination', async () => {
      const { user, headers } = await authHelper.createAuthenticatedUser();

      await app.getPrisma().product.createMany({
        data: ProductFactory.createMany(user.id, 10),
      });

      const response = await app
        .request()
        .get('/products?skip=0&take=5')
        .set(headers)
        .expect(200);

      expect(response.body).toHaveLength(5);
    });

    it('should not return other users products', async () => {
      const { user, headers } = await authHelper.createAuthenticatedUser();
      const { user: otherUser } = await authHelper.createAuthenticatedUser({
        email: 'other@example.com',
      });

      await app.getPrisma().product.createMany({
        data: ProductFactory.createMany(otherUser.id, 5),
      });

      const response = await app
        .request()
        .get('/products')
        .set(headers)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /products/:id', () => {
    it('should return product by ID', async () => {
      const { user, headers } = await authHelper.createAuthenticatedUser();

      const product = await app.getPrisma().product.create({
        data: ProductFactory.create(user.id),
      });

      const response = await app
        .request()
        .get(`/products/${product.id}`)
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({
        id: product.id,
        name: product.name,
      });
    });

    it('should return 404 for non-existent product', async () => {
      const { headers } = await authHelper.createAuthenticatedUser();

      await app
        .request()
        .get('/products/00000000-0000-0000-0000-000000000000')
        .set(headers)
        .expect(404);
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update product', async () => {
      const { user, headers } = await authHelper.createAuthenticatedUser();

      const product = await app.getPrisma().product.create({
        data: ProductFactory.create(user.id),
      });

      const updateDto = {
        name: 'Updated Name',
        price: 149.99,
      };

      const response = await app
        .request()
        .patch(`/products/${product.id}`)
        .set(headers)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject(updateDto);

      // Verify in database
      const updated = await app.getPrisma().product.findUnique({
        where: { id: product.id },
      });

      expect(updated?.name).toBe(updateDto.name);
    });

    it('should not allow updating other users product', async () => {
      const { user } = await authHelper.createAuthenticatedUser();
      const { headers: otherHeaders } = await authHelper.createAuthenticatedUser({
        email: 'other@example.com',
      });

      const product = await app.getPrisma().product.create({
        data: ProductFactory.create(user.id),
      });

      await app
        .request()
        .patch(`/products/${product.id}`)
        .set(otherHeaders)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete product', async () => {
      const { user, headers } = await authHelper.createAuthenticatedUser();

      const product = await app.getPrisma().product.create({
        data: ProductFactory.create(user.id),
      });

      await app
        .request()
        .delete(`/products/${product.id}`)
        .set(headers)
        .expect(200);

      // Verify soft delete
      const deleted = await app.getPrisma().product.findUnique({
        where: { id: product.id },
      });

      expect(deleted?.status).toBe('ARCHIVED');
    });
  });

  describe('GET /products/search', () => {
    it('should search products by query', async () => {
      const { user, headers } = await authHelper.createAuthenticatedUser();

      await app.getPrisma().product.createMany({
        data: [
          ProductFactory.create(user.id, { name: 'Blue Shirt', category: 'Clothing' }),
          ProductFactory.create(user.id, { name: 'Red Shirt', category: 'Clothing' }),
          ProductFactory.create(user.id, { name: 'Blue Pants', category: 'Clothing' }),
        ],
      });

      const response = await app
        .request()
        .get('/products/search?q=blue')
        .set(headers)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((p: any) => p.name.includes('Blue'))).toBe(true);
    });
  });
});
```

### 7. Message Sending Integration Tests

```typescript
// test/integration/messages/messages.integration.test.ts

import { TestApp } from '../helpers/test-app';
import { AuthHelper } from '../helpers/auth-helper';
import { JwtService } from '@nestjs/jwt';

describe('Messages Integration Tests', () => {
  let app: TestApp;
  let authHelper: AuthHelper;

  beforeAll(async () => {
    app = new TestApp();
    await app.initialize();

    const jwtService = app.getApp().get(JwtService);
    authHelper = new AuthHelper(app.getPrisma(), jwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.cleanDatabase();
  });

  describe('POST /messages/send', () => {
    it('should send message to Instagram user', async () => {
      const { account, headers } =
        await authHelper.createUserWithInstagramAccount();

      const messageDto = {
        recipientId: '987654321',
        message: 'Hello from integration test!',
      };

      const response = await app
        .request()
        .post('/messages/send')
        .set(headers)
        .send({
          ...messageDto,
          accountId: account.id,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        message: messageDto.message,
        recipientId: messageDto.recipientId,
        status: 'SENT',
      });

      // Verify message in database
      const message = await app.getPrisma().message.findUnique({
        where: { id: response.body.id },
      });

      expect(message).toBeTruthy();
    });

    it('should send message with product attachment', async () => {
      const { user, account, headers } =
        await authHelper.createUserWithInstagramAccount();

      const product = await app.getPrisma().product.create({
        data: ProductFactory.create(user.id),
      });

      const response = await app
        .request()
        .post('/messages/send')
        .set(headers)
        .send({
          accountId: account.id,
          recipientId: '987654321',
          message: 'Check out this product!',
          productId: product.id,
        })
        .expect(201);

      expect(response.body.productId).toBe(product.id);
    });

    it('should require Instagram account', async () => {
      const { headers } = await authHelper.createAuthenticatedUser();

      await app
        .request()
        .post('/messages/send')
        .set(headers)
        .send({
          recipientId: '123',
          message: 'Test',
        })
        .expect(400);
    });
  });

  describe('GET /messages/conversations', () => {
    it('should fetch conversations from Instagram', async () => {
      const { account, headers } =
        await authHelper.createUserWithInstagramAccount();

      const response = await app
        .request()
        .get(`/messages/conversations?accountId=${account.id}`)
        .set(headers)
        .expect(200);

      expect(response.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            participants: expect.any(Array),
          }),
        ]),
      });
    });
  });

  describe('GET /messages/conversations/:id', () => {
    it('should fetch messages in conversation', async () => {
      const { account, headers } =
        await authHelper.createUserWithInstagramAccount();

      const response = await app
        .request()
        .get(`/messages/conversations/conv_1?accountId=${account.id}`)
        .set(headers)
        .expect(200);

      expect(response.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            message: expect.any(String),
            from: expect.any(Object),
          }),
        ]),
      });
    });
  });
});
```

### 8. Analytics Integration Tests

```typescript
// test/integration/analytics/analytics.integration.test.ts

import { TestApp } from '../helpers/test-app';
import { AuthHelper } from '../helpers/auth-helper';
import { JwtService } from '@nestjs/jwt';

describe('Analytics Integration Tests', () => {
  let app: TestApp;
  let authHelper: AuthHelper;

  beforeAll(async () => {
    app = new TestApp();
    await app.initialize();

    const jwtService = app.getApp().get(JwtService);
    authHelper = new AuthHelper(app.getPrisma(), jwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.cleanDatabase();
  });

  describe('GET /analytics/account/:accountId/insights', () => {
    it('should fetch account insights', async () => {
      const { account, headers } =
        await authHelper.createUserWithInstagramAccount();

      const response = await app
        .request()
        .get(`/analytics/account/${account.id}/insights`)
        .query({
          period: 'day',
          metrics: ['impressions', 'reach', 'profile_views'],
        })
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            period: 'day',
            values: expect.any(Array),
          }),
        ]),
      });
    });
  });

  describe('GET /analytics/media/:mediaId/insights', () => {
    it('should fetch media insights', async () => {
      const { headers } = await authHelper.createUserWithInstagramAccount();

      const response = await app
        .request()
        .get('/analytics/media/media_123/insights')
        .query({
          metrics: ['impressions', 'reach', 'engagement'],
        })
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            values: expect.any(Array),
          }),
        ]),
      });
    });
  });

  describe('GET /analytics/dashboard', () => {
    it('should return dashboard overview', async () => {
      const { user, account, headers } =
        await authHelper.createUserWithInstagramAccount();

      // Create some test data
      await app.getPrisma().message.createMany({
        data: [
          {
            userId: user.id,
            instagramAccountId: account.id,
            recipientId: '123',
            message: 'Test 1',
            status: 'SENT',
            sentAt: new Date(),
          },
          {
            userId: user.id,
            instagramAccountId: account.id,
            recipientId: '456',
            message: 'Test 2',
            status: 'SENT',
            sentAt: new Date(),
          },
        ],
      });

      const response = await app
        .request()
        .get('/analytics/dashboard')
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({
        messagesSent: 2,
        conversations: expect.any(Number),
        products: expect.any(Number),
      });
    });
  });
});
```

### 9. BullMQ Worker Integration Tests

```typescript
// test/integration/workers/publishing-worker.integration.test.ts

import { TestApp } from '../helpers/test-app';
import { AuthHelper } from '../helpers/auth-helper';
import { Queue, Worker } from 'bullmq';
import { JwtService } from '@nestjs/jwt';

describe('Publishing Worker Integration Tests', () => {
  let app: TestApp;
  let authHelper: AuthHelper;
  let publishingQueue: Queue;

  beforeAll(async () => {
    app = new TestApp();
    await app.initialize();

    const jwtService = app.getApp().get(JwtService);
    authHelper = new AuthHelper(app.getPrisma(), jwtService);

    publishingQueue = new Queue('instagram-post-publishing', {
      connection: {
        host: 'localhost',
        port: 6380,
      },
    });
  });

  afterAll(async () => {
    await publishingQueue.close();
    await app.close();
  });

  beforeEach(async () => {
    await app.cleanDatabase();
    await publishingQueue.obliterate({ force: true });
  });

  describe('Post Publishing Job', () => {
    it('should process post publishing job successfully', async () => {
      const { user, account } = await authHelper.createUserWithInstagramAccount();

      // Create post
      const post = await app.getPrisma().post.create({
        data: {
          userId: user.id,
          instagramAccountId: account.id,
          caption: 'Test post from integration test',
          mediaUrls: ['s3://bucket/test-image.jpg'],
          mediaType: 'IMAGE',
          status: 'SCHEDULED',
          scheduledFor: new Date(),
        },
      });

      // Add job to queue
      const job = await publishingQueue.add('publish-post', {
        postId: post.id,
        userId: user.id,
        accountId: account.id,
      });

      // Wait for job to complete
      await job.waitUntilFinished(publishingQueue.events, 10000);

      // Verify post status updated
      const updatedPost = await app.getPrisma().post.findUnique({
        where: { id: post.id },
      });

      expect(updatedPost?.status).toBe('PUBLISHED');
      expect(updatedPost?.instagramMediaId).toBeTruthy();
    });

    it('should retry failed jobs', async () => {
      const { user, account } = await authHelper.createUserWithInstagramAccount();

      const post = await app.getPrisma().post.create({
        data: {
          userId: user.id,
          instagramAccountId: account.id,
          caption: 'Test post',
          mediaUrls: ['s3://bucket/invalid.jpg'], // Will fail
          mediaType: 'IMAGE',
          status: 'SCHEDULED',
          scheduledFor: new Date(),
        },
      });

      const job = await publishingQueue.add(
        'publish-post',
        {
          postId: post.id,
          userId: user.id,
          accountId: account.id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }
      );

      // Wait and check attempts
      await new Promise(resolve => setTimeout(resolve, 5000));

      const failedJob = await job.getState();
      expect(failedJob).toBe('failed');

      const attempts = job.attemptsMade;
      expect(attempts).toBeGreaterThan(1);
    });
  });
});
```

### 10. Webhook Processing Tests

```typescript
// test/integration/webhooks/instagram-webhooks.integration.test.ts

import { TestApp } from '../helpers/test-app';
import { AuthHelper } from '../helpers/auth-helper';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

describe('Instagram Webhooks Integration Tests', () => {
  let app: TestApp;
  let authHelper: AuthHelper;

  beforeAll(async () => {
    app = new TestApp();
    await app.initialize();

    const jwtService = app.getApp().get(JwtService);
    authHelper = new AuthHelper(app.getPrisma(), jwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.cleanDatabase();
  });

  describe('GET /webhooks/instagram', () => {
    it('should verify webhook subscription', async () => {
      const response = await app
        .request()
        .get('/webhooks/instagram')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'test_verify_token',
          'hub.challenge': 'challenge_12345',
        })
        .expect(200);

      expect(response.text).toBe('challenge_12345');
    });

    it('should reject invalid verify token', async () => {
      await app
        .request()
        .get('/webhooks/instagram')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'challenge',
        })
        .expect(403);
    });
  });

  describe('POST /webhooks/instagram', () => {
    it('should process new message webhook', async () => {
      const { account } = await authHelper.createUserWithInstagramAccount();

      const payload = {
        object: 'instagram',
        entry: [
          {
            id: account.instagramUserId,
            time: Date.now(),
            messaging: [
              {
                sender: { id: '987654321' },
                recipient: { id: account.instagramUserId },
                timestamp: Date.now(),
                message: {
                  mid: 'msg_123',
                  text: 'Hello from customer',
                },
              },
            ],
          },
        ],
      };

      const signature = generateSignature(JSON.stringify(payload));

      await app
        .request()
        .post('/webhooks/instagram')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200);

      // Verify message saved to database
      const message = await app.getPrisma().message.findFirst({
        where: {
          instagramMessageId: 'msg_123',
        },
      });

      expect(message).toBeTruthy();
      expect(message?.message).toBe('Hello from customer');
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        object: 'instagram',
        entry: [],
      };

      await app
        .request()
        .post('/webhooks/instagram')
        .set('X-Hub-Signature-256', 'sha256=invalid')
        .send(payload)
        .expect(401);
    });
  });

  function generateSignature(payload: string): string {
    const secret = process.env.INSTAGRAM_WEBHOOK_SECRET || 'test_secret';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }
});
```

## Acceptance Criteria

### Setup & Configuration (3 criteria)
1. ✅ Jest integration test configuration is created with 30s timeout
2. ✅ Test app bootstrap utility initializes full NestJS application
3. ✅ Integration tests run sequentially to avoid race conditions

### Test Database (4 criteria)
4. ✅ Database cleanup runs before each test for isolation
5. ✅ Fixture manager loads predefined test data sets
6. ✅ Test fixtures include users, accounts, products, and messages
7. ✅ Database transactions roll back after failed tests

### Authentication Utilities (4 criteria)
8. ✅ AuthHelper creates authenticated test users with JWT tokens
9. ✅ AuthHelper generates valid authorization headers
10. ✅ AuthHelper creates users with Instagram accounts
11. ✅ Test users have bcrypt-hashed passwords

### Authentication Tests (5 criteria)
12. ✅ Registration endpoint creates user and returns JWT token
13. ✅ Login endpoint validates credentials and returns token
14. ✅ Protected endpoints require valid JWT token
15. ✅ Token refresh endpoint generates new access token
16. ✅ Logout endpoint invalidates token

### Instagram OAuth Tests (4 criteria)
17. ✅ OAuth URL endpoint returns Instagram authorization URL with state
18. ✅ OAuth callback exchanges code for access token
19. ✅ OAuth callback creates Instagram account in database
20. ✅ Disconnect endpoint deactivates Instagram account

### Product CRUD Tests (6 criteria)
21. ✅ POST /products creates product and saves to database
22. ✅ GET /products returns only current user's products
23. ✅ GET /products supports pagination with skip/take
24. ✅ PATCH /products updates product fields
25. ✅ DELETE /products soft deletes product
26. ✅ Search endpoint filters products by query string

### Message Tests (4 criteria)
27. ✅ Send message endpoint calls Instagram API and saves to database
28. ✅ Send message with product attachment includes product data
29. ✅ Fetch conversations endpoint returns Instagram conversations
30. ✅ Fetch messages endpoint returns conversation messages

### Analytics Tests (3 criteria)
31. ✅ Account insights endpoint fetches Instagram metrics
32. ✅ Media insights endpoint returns post analytics
33. ✅ Dashboard endpoint aggregates user statistics

### Worker Tests (3 criteria)
34. ✅ Publishing worker processes jobs and updates post status
35. ✅ Failed jobs retry with exponential backoff
36. ✅ Job completion updates database records

### Webhook Tests (3 criteria)
37. ✅ Webhook verification endpoint validates subscription
38. ✅ Webhook POST endpoint processes new messages
39. ✅ Webhook signature validation rejects invalid requests

### Data Validation (3 criteria)
40. ✅ DTOs validate input data and reject invalid requests
41. ✅ API returns appropriate HTTP status codes
42. ✅ Error responses include descriptive messages

### Performance (2 criteria)
43. ✅ All integration tests complete within 5 minutes
44. ✅ Database queries use indexes for efficient lookups

## Definition of Done

- [ ] All integration test files are created
- [ ] Test app bootstrap utility is implemented
- [ ] Authentication helper is implemented
- [ ] Fixture manager loads test data
- [ ] All authentication flows are tested
- [ ] Instagram OAuth integration is tested
- [ ] Product CRUD operations are tested
- [ ] Message sending is tested
- [ ] Analytics endpoints are tested
- [ ] Background workers are tested
- [ ] Webhook processing is tested
- [ ] All 44 acceptance criteria are met
- [ ] Tests pass in CI pipeline
- [ ] Code reviewed and approved

## Related Tasks
- TEST-001: Unit Testing Setup (dependency)
- TEST-003: Frontend Testing (parallel)
- All backend implementation tasks

## Resources
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [BullMQ Testing](https://docs.bullmq.io/guide/testing)
- [MSW API Mocking](https://mswjs.io/docs/api)
