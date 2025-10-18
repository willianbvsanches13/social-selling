# TEST-001: Unit Testing Setup

## Epic
Testing Infrastructure & Quality Assurance

## Story
As a developer, I need a comprehensive unit testing infrastructure with Jest, testing utilities, database mocks, API mocks, and test coverage reporting to ensure code quality, enable TDD workflows, and maintain high test coverage across the backend codebase with fast, isolated tests.

## Priority
P0 - Critical

## Estimated Effort
13 Story Points (Large)

## Dependencies
- Backend API foundation (NestJS setup)
- Database schema (Prisma models)
- Repository pattern implementation
- Service layer implementation
- Instagram Graph API integration
- Redis and MinIO setup

## Technical Context

### Technology Stack
- **Testing Framework**: Jest 29.x with TypeScript
- **NestJS Testing**: @nestjs/testing utilities
- **Database Testing**: @testcontainers/postgresql or pg-mem
- **Mock Server**: MSW (Mock Service Worker) for HTTP mocks
- **Coverage Tool**: Istanbul/NYC via Jest
- **Test Runner**: Jest with multi-threading
- **Assertion Library**: Jest matchers + custom matchers
- **Snapshot Testing**: Jest snapshots for DTOs/responses
- **Mocking Library**: Jest mocks + ts-mockito

### Architecture Overview
```
┌──────────────────────────────────────────────────┐
│          Test Infrastructure Layer               │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  Jest Config   │    │  Test Utilities  │    │
│  │  - TypeScript  │    │  - Factories     │    │
│  │  - Coverage    │    │  - Builders      │    │
│  │  - Reporters   │    │  - Helpers       │    │
│  └────────────────┘    └──────────────────┘    │
│                                                  │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  Mock Services │    │  Test Database   │    │
│  │  - Instagram   │    │  - Docker        │    │
│  │  - Redis       │    │  - Fixtures      │    │
│  │  - MinIO       │    │  - Seeds         │    │
│  └────────────────┘    └──────────────────┘    │
│                                                  │
├──────────────────────────────────────────────────┤
│          Test Suites (Unit Tests)                │
├──────────────────────────────────────────────────┤
│                                                  │
│  Repository Tests → Service Tests → Controller  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Testing Strategy
- **Unit Test Coverage**: Minimum 80% code coverage
- **Test Isolation**: Each test runs independently
- **Fast Execution**: < 30 seconds for all unit tests
- **Mock External Services**: No real API calls in unit tests
- **Database Mocking**: In-memory or containerized test DB
- **Snapshot Testing**: For DTOs, responses, and schemas
- **Parameterized Tests**: test.each for data-driven tests
- **Custom Matchers**: Domain-specific assertions

## Detailed Requirements

### 1. Jest Configuration & Setup

#### Main Jest Configuration
```typescript
// jest.config.ts

import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  displayName: 'social-selling-backend',
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Module resolution
  roots: ['<rootDir>/src', '<rootDir>/test'],
  modulePaths: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },

  // Test matching
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/e2e/',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/migrations/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Performance
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',

  // Reporting
  verbose: true,
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'Social Selling Test Report',
        outputPath: '<rootDir>/coverage/test-report.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
      },
    ],
  ],

  // Timeouts
  testTimeout: 10000,

  // Mocking
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // TypeScript transformation
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
        },
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};

export default config;
```

#### Unit Test Specific Configuration
```typescript
// jest.unit.config.ts

import baseConfig from './jest.config';
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  ...baseConfig,
  displayName: 'unit',
  testMatch: [
    '**/src/**/__tests__/**/*.test.ts',
    '**/src/**/*.spec.ts',
  ],
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns || []),
    '.*\\.integration\\.test\\.ts$',
    '.*\\.e2e\\.test\\.ts$',
  ],
};

export default config;
```

#### TypeScript Configuration for Tests
```json
// tsconfig.test.json

{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"],
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "isolatedModules": true
  },
  "include": [
    "src/**/*",
    "test/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### 2. Test Setup & Utilities

#### Global Test Setup
```typescript
// test/setup.ts

import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.join(__dirname, '../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for all tests
jest.setTimeout(10000);

// Global test utilities
global.console = {
  ...console,
  error: jest.fn(), // Suppress error logs in tests
  warn: jest.fn(),  // Suppress warning logs
  log: console.log,  // Keep regular logs
  info: console.info,
  debug: console.debug,
};

// Mock timers helper
global.mockTime = (dateString: string) => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(dateString));
};

global.restoreTime = () => {
  jest.useRealTimers();
};

// Custom matchers
expect.extend({
  toBeValidUuid(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    };
  },

  toBeISODate(received: string) {
    const pass = !isNaN(Date.parse(received)) &&
                 received.includes('T') &&
                 (received.includes('Z') || received.includes('+'));
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid ISO date`
          : `expected ${received} to be a valid ISO date`,
    };
  },

  toHaveBeenCalledWithMatch(received: jest.Mock, expected: any) {
    const calls = received.mock.calls;
    const pass = calls.some(call =>
      expect.objectContaining(expected).asymmetricMatch(call[0])
    );
    return {
      pass,
      message: () =>
        pass
          ? `expected mock not to have been called with matching object`
          : `expected mock to have been called with matching object`,
    };
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUuid(): R;
      toBeISODate(): R;
      toHaveBeenCalledWithMatch(expected: any): R;
    }
  }

  var mockTime: (dateString: string) => void;
  var restoreTime: () => void;
}
```

#### Global Setup Script
```typescript
// test/global-setup.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup() {
  console.log('\n🔧 Setting up test environment...\n');

  // Start test database container
  try {
    await execAsync('docker-compose -f docker-compose.test.yml up -d postgres-test redis-test minio-test');
    console.log('✅ Test containers started\n');

    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Run migrations
    await execAsync('DATABASE_URL=$DATABASE_TEST_URL npx prisma migrate deploy');
    console.log('✅ Test database migrations applied\n');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}
```

#### Global Teardown Script
```typescript
// test/global-teardown.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalTeardown() {
  console.log('\n🧹 Cleaning up test environment...\n');

  // Stop test containers
  try {
    await execAsync('docker-compose -f docker-compose.test.yml down -v');
    console.log('✅ Test containers stopped\n');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
  }
}
```

### 3. Test Database Setup

#### Docker Compose for Test Services
```yaml
# docker-compose.test.yml

version: '3.8'

services:
  postgres-test:
    image: postgres:15-alpine
    container_name: social-selling-test-db
    environment:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: social_selling_test
    ports:
      - "5433:5432"
    volumes:
      - postgres-test-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis-test:
    image: redis:7-alpine
    container_name: social-selling-test-redis
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  minio-test:
    image: minio/minio:latest
    container_name: social-selling-test-minio
    environment:
      MINIO_ROOT_USER: test_minio
      MINIO_ROOT_PASSWORD: test_minio_password
    ports:
      - "9001:9000"
      - "9091:9090"
    command: server /data --console-address ":9090"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 3s
      retries: 5
    volumes:
      - minio-test-data:/data

volumes:
  postgres-test-data:
  minio-test-data:
```

#### Test Database Module
```typescript
// test/database/test-database.module.ts

import { Module, DynamicModule } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';

export class TestDatabaseService extends PrismaService {
  async cleanDatabase() {
    // Clean all tables in reverse order of dependencies
    const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.$executeRawUnsafe(
            `TRUNCATE TABLE "public"."${tablename}" CASCADE;`
          );
        } catch (error) {
          console.log(`Could not truncate table ${tablename}:`, error);
        }
      }
    }
  }

  async resetSequences() {
    const sequences = await this.$queryRaw<Array<{ relname: string }>>`
      SELECT c.relname FROM pg_class c WHERE c.relkind = 'S';
    `;

    for (const { relname } of sequences) {
      await this.$executeRawUnsafe(
        `ALTER SEQUENCE "public"."${relname}" RESTART WITH 1;`
      );
    }
  }
}

@Module({})
export class TestDatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: TestDatabaseModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
      ],
      providers: [
        {
          provide: PrismaService,
          useClass: TestDatabaseService,
        },
      ],
      exports: [PrismaService],
      global: true,
    };
  }
}
```

#### Database Test Utilities
```typescript
// test/database/database-utils.ts

import { PrismaClient } from '@prisma/client';
import { TestDatabaseService } from './test-database.module';

export class DatabaseTestUtils {
  constructor(private prisma: TestDatabaseService) {}

  async cleanAll(): Promise<void> {
    await this.prisma.cleanDatabase();
    await this.prisma.resetSequences();
  }

  async seed(data: SeedData): Promise<void> {
    // Seed data in correct order
    if (data.users) {
      for (const user of data.users) {
        await this.prisma.user.create({ data: user });
      }
    }

    if (data.instagramAccounts) {
      for (const account of data.instagramAccounts) {
        await this.prisma.instagramAccount.create({ data: account });
      }
    }

    if (data.products) {
      for (const product of data.products) {
        await this.prisma.product.create({ data: product });
      }
    }

    if (data.conversations) {
      for (const conversation of data.conversations) {
        await this.prisma.conversation.create({ data: conversation });
      }
    }
  }

  async createSnapshot(): Promise<DatabaseSnapshot> {
    const users = await this.prisma.user.findMany();
    const accounts = await this.prisma.instagramAccount.findMany();
    const products = await this.prisma.product.findMany();
    const conversations = await this.prisma.conversation.findMany();

    return {
      users,
      accounts,
      products,
      conversations,
    };
  }

  async restoreSnapshot(snapshot: DatabaseSnapshot): Promise<void> {
    await this.cleanAll();
    await this.seed(snapshot);
  }
}

export interface SeedData {
  users?: any[];
  instagramAccounts?: any[];
  products?: any[];
  conversations?: any[];
  messages?: any[];
  posts?: any[];
}

export interface DatabaseSnapshot extends SeedData {}
```

### 4. Mock Instagram Graph API

#### Instagram API Mock Server
```typescript
// test/mocks/instagram-api.mock.ts

import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const MOCK_INSTAGRAM_API_URL = 'https://graph.instagram.com/v18.0';

export const instagramApiHandlers = [
  // Get user profile
  rest.get(`${MOCK_INSTAGRAM_API_URL}/me`, (req, res, ctx) => {
    const accessToken = req.url.searchParams.get('access_token');

    if (!accessToken || accessToken === 'invalid_token') {
      return res(
        ctx.status(401),
        ctx.json({
          error: {
            message: 'Invalid OAuth access token',
            type: 'OAuthException',
            code: 190,
          },
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        id: '123456789',
        username: 'test_user',
        account_type: 'BUSINESS',
        media_count: 150,
      })
    );
  }),

  // Get conversations
  rest.get(`${MOCK_INSTAGRAM_API_URL}/:userId/conversations`, (req, res, ctx) => {
    const { userId } = req.params;

    return res(
      ctx.status(200),
      ctx.json({
        data: [
          {
            id: 'conv_1',
            updated_time: '2025-01-15T10:00:00Z',
            participants: {
              data: [
                { id: '987654321', username: 'customer1' },
              ],
            },
            unread_count: 2,
          },
          {
            id: 'conv_2',
            updated_time: '2025-01-14T15:30:00Z',
            participants: {
              data: [
                { id: '123123123', username: 'customer2' },
              ],
            },
            unread_count: 0,
          },
        ],
        paging: {
          cursors: {
            after: 'cursor_next',
            before: 'cursor_prev',
          },
        },
      })
    );
  }),

  // Get messages in conversation
  rest.get(`${MOCK_INSTAGRAM_API_URL}/:conversationId/messages`, (req, res, ctx) => {
    const { conversationId } = req.params;

    return res(
      ctx.status(200),
      ctx.json({
        data: [
          {
            id: 'msg_1',
            created_time: '2025-01-15T10:00:00Z',
            from: { id: '987654321', username: 'customer1' },
            to: { data: [{ id: '123456789', username: 'test_user' }] },
            message: 'Hi, I have a question about your products',
          },
          {
            id: 'msg_2',
            created_time: '2025-01-15T10:05:00Z',
            from: { id: '123456789', username: 'test_user' },
            to: { data: [{ id: '987654321', username: 'customer1' }] },
            message: 'Hello! How can I help you?',
          },
        ],
        paging: {
          cursors: {
            after: 'cursor_next',
          },
        },
      })
    );
  }),

  // Send message
  rest.post(`${MOCK_INSTAGRAM_API_URL}/me/messages`, async (req, res, ctx) => {
    const body = await req.json();

    if (!body.recipient || !body.message) {
      return res(
        ctx.status(400),
        ctx.json({
          error: {
            message: 'Invalid request parameters',
            type: 'OAuthException',
            code: 100,
          },
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        recipient_id: body.recipient.id,
        message_id: `msg_${Date.now()}`,
      })
    );
  }),

  // Upload media
  rest.post(`${MOCK_INSTAGRAM_API_URL}/:userId/media`, async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.status(200),
      ctx.json({
        id: `media_container_${Date.now()}`,
      })
    );
  }),

  // Publish media
  rest.post(`${MOCK_INSTAGRAM_API_URL}/:userId/media_publish`, async (req, res, ctx) => {
    const body = await req.json();

    if (!body.creation_id) {
      return res(
        ctx.status(400),
        ctx.json({
          error: {
            message: 'creation_id is required',
            type: 'OAuthException',
            code: 100,
          },
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        id: `post_${Date.now()}`,
      })
    );
  }),

  // Get insights
  rest.get(`${MOCK_INSTAGRAM_API_URL}/:mediaId/insights`, (req, res, ctx) => {
    const metric = req.url.searchParams.get('metric');

    return res(
      ctx.status(200),
      ctx.json({
        data: [
          {
            name: 'impressions',
            period: 'lifetime',
            values: [{ value: 1250 }],
            title: 'Impressions',
            description: 'Total number of times the media object has been seen',
          },
          {
            name: 'reach',
            period: 'lifetime',
            values: [{ value: 980 }],
            title: 'Reach',
            description: 'Total number of unique accounts that have seen the media object',
          },
          {
            name: 'engagement',
            period: 'lifetime',
            values: [{ value: 145 }],
            title: 'Engagement',
            description: 'Total number of likes and comments',
          },
        ],
      })
    );
  }),

  // Webhook verification
  rest.get(`${MOCK_INSTAGRAM_API_URL}/webhook`, (req, res, ctx) => {
    const mode = req.url.searchParams.get('hub.mode');
    const token = req.url.searchParams.get('hub.verify_token');
    const challenge = req.url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === 'test_verify_token') {
      return res(ctx.status(200), ctx.text(challenge || ''));
    }

    return res(ctx.status(403));
  }),
];

// Create mock server instance
export const instagramApiMockServer = setupServer(...instagramApiHandlers);

// Helper to start/stop mock server in tests
export const setupInstagramApiMock = () => {
  beforeAll(() => instagramApiMockServer.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => instagramApiMockServer.resetHandlers());
  afterAll(() => instagramApiMockServer.close());
};
```

### 5. Mock Redis & MinIO

#### Redis Mock Service
```typescript
// test/mocks/redis.mock.ts

import { jest } from '@jest/globals';
import type { Redis } from 'ioredis';

export class MockRedisService implements Partial<Redis> {
  private store = new Map<string, string>();
  private expirations = new Map<string, number>();
  private hashes = new Map<string, Map<string, string>>();
  private lists = new Map<string, string[]>();
  private sets = new Map<string, Set<string>>();

  // String operations
  async get(key: string): Promise<string | null> {
    this.checkExpiration(key);
    return this.store.get(key) || null;
  }

  async set(
    key: string,
    value: string,
    expiryMode?: string,
    time?: number
  ): Promise<'OK'> {
    this.store.set(key, value);

    if (expiryMode === 'EX' && time) {
      this.expirations.set(key, Date.now() + time * 1000);
    } else if (expiryMode === 'PX' && time) {
      this.expirations.set(key, Date.now() + time);
    }

    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deleted++;
      this.expirations.delete(key);
      this.hashes.delete(key);
      this.lists.delete(key);
      this.sets.delete(key);
    }
    return deleted;
  }

  async exists(...keys: string[]): Promise<number> {
    this.checkExpiration(...keys);
    return keys.filter(key => this.store.has(key)).length;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.store.has(key)) return 0;
    this.expirations.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const expiration = this.expirations.get(key);
    if (!expiration) return -1;
    if (!this.store.has(key)) return -2;
    return Math.ceil((expiration - Date.now()) / 1000);
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    const hash = this.hashes.get(key)!;
    const isNew = !hash.has(field);
    hash.set(field, value);
    return isNew ? 1 : 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.hashes.get(key);
    return hash?.get(field) || null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashes.get(key);
    if (!hash) return {};
    return Object.fromEntries(hash.entries());
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.hashes.get(key);
    if (!hash) return 0;
    let deleted = 0;
    for (const field of fields) {
      if (hash.delete(field)) deleted++;
    }
    return deleted;
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key)!;
    list.unshift(...values.reverse());
    return list.length;
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key)!;
    list.push(...values);
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key) || [];
    const end = stop === -1 ? undefined : stop + 1;
    return list.slice(start, end);
  }

  async llen(key: string): Promise<number> {
    return this.lists.get(key)?.length || 0;
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return added;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async sismember(key: string, member: string): Promise<number> {
    const set = this.sets.get(key);
    return set?.has(member) ? 1 : 0;
  }

  // Utility methods
  async flushall(): Promise<'OK'> {
    this.store.clear();
    this.expirations.clear();
    this.hashes.clear();
    this.lists.clear();
    this.sets.clear();
    return 'OK';
  }

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }

  private checkExpiration(...keys: string[]) {
    const now = Date.now();
    for (const key of keys) {
      const expiration = this.expirations.get(key);
      if (expiration && expiration <= now) {
        this.del(key);
      }
    }
  }

  // Mock cleanup
  reset() {
    this.store.clear();
    this.expirations.clear();
    this.hashes.clear();
    this.lists.clear();
    this.sets.clear();
  }
}

export const createMockRedis = (): MockRedisService => {
  return new MockRedisService();
};
```

#### MinIO Mock Service
```typescript
// test/mocks/minio.mock.ts

import { jest } from '@jest/globals';
import type { Client as MinioClient } from 'minio';
import { Readable } from 'stream';

export class MockMinioService implements Partial<MinioClient> {
  private buckets = new Set<string>();
  private objects = new Map<string, Map<string, Buffer>>();

  async makeBucket(bucketName: string, region?: string): Promise<void> {
    if (this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} already exists`);
    }
    this.buckets.add(bucketName);
    this.objects.set(bucketName, new Map());
  }

  async bucketExists(bucketName: string): Promise<boolean> {
    return this.buckets.has(bucketName);
  }

  async removeBucket(bucketName: string): Promise<void> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }
    const bucket = this.objects.get(bucketName);
    if (bucket && bucket.size > 0) {
      throw new Error(`Bucket ${bucketName} is not empty`);
    }
    this.buckets.delete(bucketName);
    this.objects.delete(bucketName);
  }

  async putObject(
    bucketName: string,
    objectName: string,
    stream: Readable | Buffer | string,
    size?: number,
    metaData?: Record<string, any>
  ): Promise<{ etag: string; versionId: string | null }> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    let buffer: Buffer;
    if (Buffer.isBuffer(stream)) {
      buffer = stream;
    } else if (typeof stream === 'string') {
      buffer = Buffer.from(stream);
    } else {
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    }

    const bucket = this.objects.get(bucketName)!;
    bucket.set(objectName, buffer);

    return {
      etag: `etag-${objectName}`,
      versionId: null,
    };
  }

  async getObject(bucketName: string, objectName: string): Promise<Readable> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    const bucket = this.objects.get(bucketName)!;
    const object = bucket.get(objectName);

    if (!object) {
      throw new Error(`Object ${objectName} does not exist`);
    }

    return Readable.from(object);
  }

  async statObject(
    bucketName: string,
    objectName: string
  ): Promise<{
    size: number;
    etag: string;
    lastModified: Date;
    metaData: Record<string, any>;
  }> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    const bucket = this.objects.get(bucketName)!;
    const object = bucket.get(objectName);

    if (!object) {
      throw new Error(`Object ${objectName} does not exist`);
    }

    return {
      size: object.length,
      etag: `etag-${objectName}`,
      lastModified: new Date(),
      metaData: {},
    };
  }

  async removeObject(bucketName: string, objectName: string): Promise<void> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    const bucket = this.objects.get(bucketName)!;
    bucket.delete(objectName);
  }

  async listObjects(
    bucketName: string,
    prefix?: string,
    recursive?: boolean
  ): Promise<any> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    const bucket = this.objects.get(bucketName)!;
    const objects = Array.from(bucket.keys())
      .filter(key => !prefix || key.startsWith(prefix))
      .map(key => ({
        name: key,
        size: bucket.get(key)!.length,
        etag: `etag-${key}`,
        lastModified: new Date(),
      }));

    // Return async iterable
    return {
      [Symbol.asyncIterator]: async function* () {
        for (const obj of objects) {
          yield obj;
        }
      },
    };
  }

  async presignedGetObject(
    bucketName: string,
    objectName: string,
    expiry?: number
  ): Promise<string> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    const bucket = this.objects.get(bucketName)!;
    if (!bucket.has(objectName)) {
      throw new Error(`Object ${objectName} does not exist`);
    }

    return `http://localhost:9001/${bucketName}/${objectName}?presigned=true`;
  }

  async presignedPutObject(
    bucketName: string,
    objectName: string,
    expiry?: number
  ): Promise<string> {
    if (!this.buckets.has(bucketName)) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    return `http://localhost:9001/${bucketName}/${objectName}?presigned=true&method=PUT`;
  }

  // Mock utility methods
  reset() {
    this.buckets.clear();
    this.objects.clear();
  }

  getObjectBuffer(bucketName: string, objectName: string): Buffer | undefined {
    const bucket = this.objects.get(bucketName);
    return bucket?.get(objectName);
  }
}

export const createMockMinio = (): MockMinioService => {
  return new MockMinioService();
};
```

### 6. Test Data Factories

#### User Factory
```typescript
// test/factories/user.factory.ts

import { faker } from '@faker-js/faker';
import { User, UserRole } from '@prisma/client';

export class UserFactory {
  static create(overrides: Partial<User> = {}): Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      password: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', // bcrypt hash
      role: UserRole.USER,
      emailVerified: true,
      isActive: true,
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<User> = []): Omit<User, 'id' | 'createdAt' | 'updatedAt'>[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static admin(overrides: Partial<User> = {}): Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
    return this.create({
      role: UserRole.ADMIN,
      ...overrides,
    });
  }
}
```

#### Instagram Account Factory
```typescript
// test/factories/instagram-account.factory.ts

import { faker } from '@faker-js/faker';
import { InstagramAccount } from '@prisma/client';

export class InstagramAccountFactory {
  static create(
    userId: string,
    overrides: Partial<InstagramAccount> = {}
  ): Omit<InstagramAccount, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      userId,
      instagramUserId: faker.string.numeric(10),
      username: faker.internet.userName(),
      accessToken: faker.string.alphanumeric(200),
      tokenExpiresAt: faker.date.future(),
      accountType: 'BUSINESS',
      isActive: true,
      profilePictureUrl: faker.image.avatar(),
      followersCount: faker.number.int({ min: 100, max: 100000 }),
      followsCount: faker.number.int({ min: 50, max: 5000 }),
      mediaCount: faker.number.int({ min: 10, max: 1000 }),
      ...overrides,
    };
  }

  static createMany(
    userId: string,
    count: number,
    overrides: Partial<InstagramAccount> = {}
  ): Omit<InstagramAccount, 'id' | 'createdAt' | 'updatedAt'>[] {
    return Array.from({ length: count }, () => this.create(userId, overrides));
  }
}
```

#### Product Factory
```typescript
// test/factories/product.factory.ts

import { faker } from '@faker-js/faker';
import { Product, ProductStatus } from '@prisma/client';

export class ProductFactory {
  static create(
    userId: string,
    overrides: Partial<Product> = {}
  ): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      userId,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price()),
      currency: 'USD',
      sku: faker.string.alphanumeric(10).toUpperCase(),
      stockQuantity: faker.number.int({ min: 0, max: 1000 }),
      imageUrls: [faker.image.url(), faker.image.url()],
      status: ProductStatus.ACTIVE,
      category: faker.commerce.department(),
      tags: [faker.commerce.productAdjective(), faker.commerce.productMaterial()],
      ...overrides,
    };
  }

  static createMany(
    userId: string,
    count: number,
    overrides: Partial<Product> = {}
  ): Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] {
    return Array.from({ length: count }, () => this.create(userId, overrides));
  }

  static outOfStock(userId: string, overrides: Partial<Product> = {}) {
    return this.create(userId, {
      stockQuantity: 0,
      status: ProductStatus.OUT_OF_STOCK,
      ...overrides,
    });
  }
}
```

### 7. Repository Tests Example

```typescript
// src/modules/products/repositories/__tests__/product.repository.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ProductRepository } from '../product.repository';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { TestDatabaseModule, TestDatabaseService } from '@test/database/test-database.module';
import { ProductFactory } from '@test/factories/product.factory';
import { UserFactory } from '@test/factories/user.factory';
import { ProductStatus } from '@prisma/client';

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let prisma: TestDatabaseService;
  let testUserId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestDatabaseModule.forRoot()],
      providers: [ProductRepository],
    }).compile();

    repository = module.get<ProductRepository>(ProductRepository);
    prisma = module.get<PrismaService>(PrismaService) as TestDatabaseService;
  });

  beforeEach(async () => {
    await prisma.cleanDatabase();

    // Create test user
    const user = await prisma.user.create({
      data: UserFactory.create(),
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const productData = ProductFactory.create(testUserId);

      const product = await repository.create(productData);

      expect(product).toMatchObject({
        id: expect.toBeValidUuid(),
        name: productData.name,
        price: productData.price,
        userId: testUserId,
        createdAt: expect.toBeISODate(),
        updatedAt: expect.toBeISODate(),
      });
    });

    it('should create product with default status ACTIVE', async () => {
      const productData = ProductFactory.create(testUserId);
      delete (productData as any).status;

      const product = await repository.create(productData);

      expect(product.status).toBe(ProductStatus.ACTIVE);
    });

    it('should create product with image URLs array', async () => {
      const imageUrls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];
      const productData = ProductFactory.create(testUserId, { imageUrls });

      const product = await repository.create(productData);

      expect(product.imageUrls).toEqual(imageUrls);
    });
  });

  describe('findById', () => {
    it('should find product by ID', async () => {
      const created = await prisma.product.create({
        data: ProductFactory.create(testUserId),
      });

      const product = await repository.findById(created.id);

      expect(product).toMatchObject({
        id: created.id,
        name: created.name,
      });
    });

    it('should return null for non-existent product', async () => {
      const product = await repository.findById('00000000-0000-0000-0000-000000000000');

      expect(product).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find all products for user', async () => {
      await prisma.product.createMany({
        data: ProductFactory.createMany(testUserId, 3),
      });

      const products = await repository.findByUserId(testUserId);

      expect(products).toHaveLength(3);
      expect(products.every(p => p.userId === testUserId)).toBe(true);
    });

    it('should return products ordered by createdAt desc', async () => {
      const products = await Promise.all([
        prisma.product.create({ data: ProductFactory.create(testUserId) }),
        new Promise(resolve => setTimeout(resolve, 10)),
        prisma.product.create({ data: ProductFactory.create(testUserId) }),
        new Promise(resolve => setTimeout(resolve, 10)),
        prisma.product.create({ data: ProductFactory.create(testUserId) }),
      ].filter(p => p instanceof Promise));

      const result = await repository.findByUserId(testUserId);

      expect(result[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        result[1].createdAt.getTime()
      );
    });

    it('should support pagination', async () => {
      await prisma.product.createMany({
        data: ProductFactory.createMany(testUserId, 10),
      });

      const page1 = await repository.findByUserId(testUserId, { skip: 0, take: 5 });
      const page2 = await repository.findByUserId(testUserId, { skip: 5, take: 5 });

      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('update', () => {
    it('should update product fields', async () => {
      const product = await prisma.product.create({
        data: ProductFactory.create(testUserId),
      });

      const updated = await repository.update(product.id, {
        name: 'Updated Name',
        price: 99.99,
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.price).toBe(99.99);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(product.updatedAt.getTime());
    });

    it('should update product status', async () => {
      const product = await prisma.product.create({
        data: ProductFactory.create(testUserId),
      });

      const updated = await repository.update(product.id, {
        status: ProductStatus.OUT_OF_STOCK,
      });

      expect(updated.status).toBe(ProductStatus.OUT_OF_STOCK);
    });
  });

  describe('delete', () => {
    it('should soft delete product', async () => {
      const product = await prisma.product.create({
        data: ProductFactory.create(testUserId),
      });

      await repository.delete(product.id);

      const deleted = await prisma.product.findUnique({
        where: { id: product.id },
      });

      expect(deleted?.status).toBe(ProductStatus.ARCHIVED);
    });

    it('should not return soft deleted products in findByUserId', async () => {
      const product = await prisma.product.create({
        data: ProductFactory.create(testUserId),
      });

      await repository.delete(product.id);
      const products = await repository.findByUserId(testUserId);

      expect(products.some(p => p.id === product.id)).toBe(false);
    });
  });

  describe('search', () => {
    it('should search products by name', async () => {
      await prisma.product.createMany({
        data: [
          ProductFactory.create(testUserId, { name: 'Blue Shirt' }),
          ProductFactory.create(testUserId, { name: 'Red Shirt' }),
          ProductFactory.create(testUserId, { name: 'Blue Pants' }),
        ],
      });

      const results = await repository.search(testUserId, 'blue');

      expect(results).toHaveLength(2);
      expect(results.every(p => p.name.toLowerCase().includes('blue'))).toBe(true);
    });

    it('should search products by category', async () => {
      await prisma.product.createMany({
        data: [
          ProductFactory.create(testUserId, { category: 'Electronics' }),
          ProductFactory.create(testUserId, { category: 'Clothing' }),
          ProductFactory.create(testUserId, { category: 'Electronics' }),
        ],
      });

      const results = await repository.search(testUserId, 'electronics');

      expect(results).toHaveLength(2);
    });
  });
});
```

### 8. Service Layer Tests Example

```typescript
// src/modules/products/services/__tests__/product.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../product.service';
import { ProductRepository } from '../../repositories/product.repository';
import { MinioService } from '@/shared/minio/minio.service';
import { CreateProductDto, UpdateProductDto } from '../../dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductFactory } from '@test/factories/product.factory';
import { createMockMinio } from '@test/mocks/minio.mock';

describe('ProductService', () => {
  let service: ProductService;
  let repository: jest.Mocked<ProductRepository>;
  let minioService: jest.Mocked<MinioService>;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
    };

    const mockMinio = createMockMinio();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: mockRepository,
        },
        {
          provide: MinioService,
          useValue: mockMinio,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repository = module.get(ProductRepository);
    minioService = module.get(MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const userId = 'user-123';
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        currency: 'USD',
        sku: 'TEST-SKU-001',
        stockQuantity: 10,
        category: 'Electronics',
      };

      const expectedProduct = {
        id: 'product-123',
        ...createDto,
        userId,
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.create.mockResolvedValue(expectedProduct as any);

      const result = await service.createProduct(userId, createDto);

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        userId,
      });
      expect(result).toEqual(expectedProduct);
    });

    it('should throw BadRequestException for invalid price', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        price: -10,
        currency: 'USD',
      } as any;

      await expect(service.createProduct('user-123', createDto))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate SKU', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        price: 99.99,
        sku: 'DUPLICATE-SKU',
      } as any;

      repository.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['sku'] },
      });

      await expect(service.createProduct('user-123', createDto))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('getProductById', () => {
    it('should return product when found', async () => {
      const product = ProductFactory.create('user-123');
      repository.findById.mockResolvedValue(product as any);

      const result = await service.getProductById('product-123');

      expect(repository.findById).toHaveBeenCalledWith('product-123');
      expect(result).toEqual(product);
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getProductById('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('getUserProducts', () => {
    it('should return all user products', async () => {
      const products = ProductFactory.createMany('user-123', 3);
      repository.findByUserId.mockResolvedValue(products as any);

      const result = await service.getUserProducts('user-123');

      expect(repository.findByUserId).toHaveBeenCalledWith('user-123', undefined);
      expect(result).toEqual(products);
    });

    it('should support pagination', async () => {
      const products = ProductFactory.createMany('user-123', 5);
      repository.findByUserId.mockResolvedValue(products as any);

      await service.getUserProducts('user-123', { skip: 0, take: 5 });

      expect(repository.findByUserId).toHaveBeenCalledWith('user-123', {
        skip: 0,
        take: 5,
      });
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const existingProduct = ProductFactory.create('user-123');
      const updateDto: UpdateProductDto = {
        name: 'Updated Name',
        price: 149.99,
      };

      repository.findById.mockResolvedValue(existingProduct as any);
      repository.update.mockResolvedValue({
        ...existingProduct,
        ...updateDto,
      } as any);

      const result = await service.updateProduct('product-123', 'user-123', updateDto);

      expect(repository.update).toHaveBeenCalledWith('product-123', updateDto);
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException for non-existent product', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateProduct('nonexistent', 'user-123', { name: 'Test' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      const product = ProductFactory.create('user-123');
      repository.findById.mockResolvedValue(product as any);
      repository.delete.mockResolvedValue(undefined);

      await service.deleteProduct('product-123', 'user-123');

      expect(repository.delete).toHaveBeenCalledWith('product-123');
    });

    it('should throw NotFoundException when product not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteProduct('nonexistent', 'user-123'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('searchProducts', () => {
    it('should search products by query', async () => {
      const products = ProductFactory.createMany('user-123', 2);
      repository.search.mockResolvedValue(products as any);

      const result = await service.searchProducts('user-123', 'blue shirt');

      expect(repository.search).toHaveBeenCalledWith('user-123', 'blue shirt');
      expect(result).toEqual(products);
    });

    it('should return empty array when no matches', async () => {
      repository.search.mockResolvedValue([]);

      const result = await service.searchProducts('user-123', 'nonexistent');

      expect(result).toEqual([]);
    });
  });
});
```

### 9. Controller Tests Example

```typescript
// src/modules/products/controllers/__tests__/product.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from '../product.controller';
import { ProductService } from '../../services/product.service';
import { CreateProductDto, UpdateProductDto } from '../../dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ProductFactory } from '@test/factories/product.factory';

describe('ProductController', () => {
  let controller: ProductController;
  let service: jest.Mocked<ProductService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
  };

  beforeEach(async () => {
    const mockService = {
      createProduct: jest.fn(),
      getProductById: jest.fn(),
      getUserProducts: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      searchProducts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        currency: 'USD',
        sku: 'TEST-001',
        stockQuantity: 10,
      };

      const expectedProduct = {
        id: 'product-123',
        ...createDto,
        userId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.createProduct.mockResolvedValue(expectedProduct as any);

      const result = await controller.create(mockUser as any, createDto);

      expect(service.createProduct).toHaveBeenCalledWith(mockUser.id, createDto);
      expect(result).toEqual(expectedProduct);
    });
  });

  describe('findAll', () => {
    it('should return all user products', async () => {
      const products = ProductFactory.createMany(mockUser.id, 3);
      service.getUserProducts.mockResolvedValue(products as any);

      const result = await controller.findAll(mockUser as any, {});

      expect(service.getUserProducts).toHaveBeenCalledWith(mockUser.id, undefined);
      expect(result).toEqual(products);
    });

    it('should support pagination query params', async () => {
      const products = ProductFactory.createMany(mockUser.id, 2);
      service.getUserProducts.mockResolvedValue(products as any);

      await controller.findAll(mockUser as any, { skip: 0, take: 10 });

      expect(service.getUserProducts).toHaveBeenCalledWith(mockUser.id, {
        skip: 0,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return product by ID', async () => {
      const product = ProductFactory.create(mockUser.id);
      service.getProductById.mockResolvedValue(product as any);

      const result = await controller.findOne('product-123');

      expect(service.getProductById).toHaveBeenCalledWith('product-123');
      expect(result).toEqual(product);
    });
  });

  describe('update', () => {
    it('should update product', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Product',
        price: 149.99,
      };

      const updatedProduct = {
        id: 'product-123',
        ...updateDto,
        userId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.updateProduct.mockResolvedValue(updatedProduct as any);

      const result = await controller.update(
        'product-123',
        mockUser as any,
        updateDto
      );

      expect(service.updateProduct).toHaveBeenCalledWith(
        'product-123',
        mockUser.id,
        updateDto
      );
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('remove', () => {
    it('should delete product', async () => {
      service.deleteProduct.mockResolvedValue(undefined);

      await controller.remove('product-123', mockUser as any);

      expect(service.deleteProduct).toHaveBeenCalledWith('product-123', mockUser.id);
    });
  });

  describe('search', () => {
    it('should search products by query', async () => {
      const products = ProductFactory.createMany(mockUser.id, 2);
      service.searchProducts.mockResolvedValue(products as any);

      const result = await controller.search(mockUser as any, { q: 'blue shirt' });

      expect(service.searchProducts).toHaveBeenCalledWith(mockUser.id, 'blue shirt');
      expect(result).toEqual(products);
    });
  });
});
```

### 10. CI/CD Integration

#### GitHub Actions Workflow
```yaml
# .github/workflows/test-unit.yml

name: Unit Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: social_selling_test
        ports:
          - 5433:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6380:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup test database
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5433/social_selling_test
        run: npx prisma migrate deploy

      - name: Run unit tests
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://test_user:test_password@localhost:5433/social_selling_test
          REDIS_URL: redis://localhost:6380
        run: npm run test:unit -- --coverage --maxWorkers=2

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: Generate test report
        if: always()
        run: |
          echo "## Test Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          cat coverage/test-report.html >> $GITHUB_STEP_SUMMARY

      - name: Archive test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            junit.xml
```

#### Package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --config jest.unit.config.ts",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

## Acceptance Criteria

### Configuration & Setup (4 criteria)
1. ✅ Jest is configured with TypeScript support, path aliases, and coverage thresholds
2. ✅ Test environment variables are loaded from .env.test file
3. ✅ Global setup/teardown scripts manage test database lifecycle
4. ✅ Custom Jest matchers are implemented for UUID, ISO dates, and domain-specific assertions

### Test Database (4 criteria)
5. ✅ Docker Compose file defines test PostgreSQL, Redis, and MinIO containers
6. ✅ TestDatabaseModule provides clean database utilities for test isolation
7. ✅ Database cleanup runs before each test to ensure isolation
8. ✅ Prisma migrations are applied automatically in global setup

### Mock Services (5 criteria)
9. ✅ Instagram Graph API is mocked using MSW with all required endpoints
10. ✅ Mock Redis service implements all Redis operations (strings, hashes, lists, sets)
11. ✅ Mock MinIO service implements bucket and object operations
12. ✅ Mock servers can be started/stopped per test suite
13. ✅ Mock handlers can be overridden for specific test cases

### Test Factories (3 criteria)
14. ✅ User factory generates realistic test user data with Faker
15. ✅ Instagram account factory creates valid account data
16. ✅ Product factory supports creating single and multiple products with overrides

### Repository Tests (5 criteria)
17. ✅ All repository CRUD operations have comprehensive tests
18. ✅ Repository tests verify database constraints and unique indexes
19. ✅ Repository tests cover pagination and filtering
20. ✅ Repository tests validate soft delete behavior
21. ✅ Repository tests check query performance with appropriate indexes

### Service Layer Tests (5 criteria)
22. ✅ Service tests mock repository dependencies
23. ✅ Service tests verify business logic and validation rules
24. ✅ Service tests cover error handling and exception throwing
25. ✅ Service tests validate integration with external services (MinIO)
26. ✅ Service tests check authorization and ownership verification

### Controller Tests (4 criteria)
27. ✅ Controller tests mock service layer dependencies
28. ✅ Controller tests verify request/response DTOs
29. ✅ Controller tests validate authentication guards
30. ✅ Controller tests check query parameter handling

### Coverage & Reporting (4 criteria)
31. ✅ Test coverage exceeds 80% for lines, branches, functions, and statements
32. ✅ Coverage reports are generated in multiple formats (lcov, html, json)
33. ✅ JUnit XML report is generated for CI integration
34. ✅ HTML test report is generated with detailed results

### CI/CD Integration (4 criteria)
35. ✅ GitHub Actions workflow runs unit tests on push/PR
36. ✅ Test database services are configured in CI pipeline
37. ✅ Coverage reports are uploaded to Codecov
38. ✅ Test artifacts are archived for debugging

### Performance & Quality (3 criteria)
39. ✅ All unit tests complete in under 30 seconds
40. ✅ Tests are isolated and can run in any order
41. ✅ No tests depend on external services or network calls

## Definition of Done

- [ ] All configuration files are created and tested
- [ ] Test database setup works in Docker and CI
- [ ] All mock services are implemented and tested
- [ ] Test factories generate valid data
- [ ] Repository tests achieve 80%+ coverage
- [ ] Service tests achieve 80%+ coverage
- [ ] Controller tests achieve 80%+ coverage
- [ ] CI pipeline runs tests successfully
- [ ] Coverage reports are generated and uploaded
- [ ] Documentation updated with testing guidelines
- [ ] Code reviewed and approved
- [ ] All 41 acceptance criteria are met

## Related Tasks
- TEST-002: Integration Testing (depends on this)
- TEST-003: Frontend Testing (parallel)
- All backend tasks (dependency for testing)

## Resources
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testcontainers](https://testcontainers.com/)
- [Faker.js](https://fakerjs.dev/)
