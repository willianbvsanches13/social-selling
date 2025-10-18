# BE-007: API Documentation with Swagger/OpenAPI

**Priority:** P2 (Medium)
**Effort:** 5 hours
**Day:** 8
**Dependencies:** BE-001, BE-002, BE-003, BE-004, BE-005, BE-006
**Domain:** Backend Core

---

## Overview

Implement comprehensive API documentation using Swagger/OpenAPI 3.0 specification. This task creates interactive API documentation, automated schema generation, request/response examples, and developer-friendly API explorers for all backend endpoints.

The documentation system will provide:
- Auto-generated API specs from code annotations
- Interactive API testing interface (Swagger UI)
- Request/response schema validation
- Code generation support for client SDKs
- Authentication flow documentation
- Webhook endpoint documentation
- Version control for API changes

---

## Technical Architecture

### Documentation Strategy

```
Backend API Documentation Layer
├── OpenAPI Spec Generation
│   ├── Decorators on Controllers/DTOs
│   ├── Schema Auto-generation
│   ├── Example Data Providers
│   └── Security Definitions
├── Swagger UI Integration
│   ├── Interactive API Explorer
│   ├── Authentication Test Flow
│   ├── Request Builder
│   └── Response Inspector
├── API Versioning Support
│   ├── Version Headers
│   ├── Path-based Versioning
│   └── Deprecation Warnings
└── Documentation Export
    ├── OpenAPI JSON/YAML
    ├── Postman Collections
    ├── ReDoc HTML
    └── PDF Export
```

---

## Data Models

### OpenAPI Configuration

```typescript
// File: /backend/src/config/swagger.config.ts

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  tags: ApiTag[];
  servers: ApiServer[];
  securitySchemes: Record<string, SecurityScheme>;
}

export interface ApiTag {
  name: string;
  description: string;
  externalDocs?: {
    description: string;
    url: string;
  };
}

export interface ApiServer {
  url: string;
  description: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  default: string;
  description?: string;
  enum?: string[];
}

export interface SecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect';
  scheme?: string;
  bearerFormat?: string;
  in?: 'header' | 'query' | 'cookie';
  name?: string;
  flows?: OAuth2Flows;
}

export interface OAuth2Flows {
  authorizationCode?: {
    authorizationUrl: string;
    tokenUrl: string;
    scopes: Record<string, string>;
  };
}

export const SWAGGER_CONFIG: SwaggerConfig = {
  title: 'Social Selling API',
  description: `
    # Social Selling Platform API

    Complete REST API for Instagram-based social selling platform.

    ## Features
    - Instagram OAuth integration
    - Product catalog management
    - Direct message automation
    - Post scheduling and analytics
    - Multi-account support

    ## Authentication
    All authenticated endpoints require a Bearer token in the Authorization header.
    Obtain tokens via POST /api/v1/auth/login endpoint.

    ## Rate Limiting
    - Authenticated: 1000 requests/hour
    - Unauthenticated: 100 requests/hour

    ## Webhooks
    Instagram webhooks are processed at POST /api/v1/webhooks/instagram
  `,
  version: '1.0.0',
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
    {
      name: 'Users',
      description: 'User profile and settings management',
    },
    {
      name: 'Products',
      description: 'Product catalog operations',
    },
    {
      name: 'Instagram',
      description: 'Instagram integration endpoints',
    },
    {
      name: 'Messages',
      description: 'Direct message management',
    },
    {
      name: 'Posts',
      description: 'Post scheduling and publishing',
    },
    {
      name: 'Analytics',
      description: 'Analytics and insights',
    },
    {
      name: 'Webhooks',
      description: 'External webhook receivers',
    },
  ],
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development',
    },
    {
      url: 'https://staging-api.socialselling.com',
      description: 'Staging Environment',
    },
    {
      url: 'https://api.socialselling.com',
      description: 'Production Environment',
    },
  ],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    cookieAuth: {
      type: 'apiKey',
      in: 'cookie',
      name: 'ssell_session',
    },
  },
};
```

---

## Implementation Approach

### Phase 1: Swagger Module Setup (1.5 hours)

#### Step 1.1: Install Dependencies

```bash
# Install Swagger dependencies
npm install --save @nestjs/swagger swagger-ui-express
npm install --save-dev @types/swagger-ui-express

# Install additional documentation tools
npm install --save class-validator class-transformer
npm install --save-dev redoc-cli
```

#### Step 1.2: Configure Swagger in Main Application

```typescript
// File: /backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SWAGGER_CONFIG } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Swagger/OpenAPI Configuration
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DOCS === 'true') {
    const config = new DocumentBuilder()
      .setTitle(SWAGGER_CONFIG.title)
      .setDescription(SWAGGER_CONFIG.description)
      .setVersion(SWAGGER_CONFIG.version)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'bearerAuth',
      )
      .addCookieAuth('ssell_session', {
        type: 'apiKey',
        in: 'cookie',
        name: 'ssell_session',
      })
      .addServer('http://localhost:3000', 'Local Development')
      .addServer('https://staging-api.socialselling.com', 'Staging')
      .addServer('https://api.socialselling.com', 'Production')
      .addTag('Authentication', 'User authentication and session management')
      .addTag('Users', 'User profile and settings operations')
      .addTag('Products', 'Product catalog management')
      .addTag('Instagram', 'Instagram integration')
      .addTag('Messages', 'Direct message operations')
      .addTag('Posts', 'Post scheduling and publishing')
      .addTag('Analytics', 'Analytics and insights')
      .addTag('Webhooks', 'Webhook receivers')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // Swagger UI at /api/docs
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        syntaxHighlight: {
          activate: true,
          theme: 'monokai',
        },
      },
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Social Selling API Docs',
    });

    // Export OpenAPI spec as JSON
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(
      path.join(__dirname, '../openapi-spec.json'),
      JSON.stringify(document, null, 2),
    );

    console.log('📚 API Documentation: http://localhost:3000/api/docs');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application running on: http://localhost:${port}`);
}

bootstrap();
```

#### Step 1.3: Create Documentation Helpers

```typescript
// File: /backend/src/common/decorators/api-response.decorator.ts

import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiResponse,
  ApiOperation,
  ApiBody,
  ApiQuery,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';

export interface ApiDocOptions {
  summary: string;
  description?: string;
  responses?: {
    status: number;
    description: string;
    type?: Type<any>;
    isArray?: boolean;
  }[];
  body?: Type<any>;
  queryParams?: { name: string; required?: boolean; description?: string }[];
  pathParams?: { name: string; description?: string }[];
}

export function ApiDoc(options: ApiDocOptions) {
  const decorators = [
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
  ];

  // Add response decorators
  if (options.responses) {
    options.responses.forEach((response) => {
      const apiResponseOptions: any = {
        status: response.status,
        description: response.description,
      };

      if (response.type) {
        if (response.isArray) {
          apiResponseOptions.schema = {
            type: 'array',
            items: { $ref: getSchemaPath(response.type) },
          };
        } else {
          apiResponseOptions.type = response.type;
        }
      }

      decorators.push(ApiResponse(apiResponseOptions));
    });
  }

  // Add body decorator
  if (options.body) {
    decorators.push(ApiBody({ type: options.body }));
  }

  // Add query param decorators
  if (options.queryParams) {
    options.queryParams.forEach((param) => {
      decorators.push(
        ApiQuery({
          name: param.name,
          required: param.required ?? false,
          description: param.description,
        }),
      );
    });
  }

  // Add path param decorators
  if (options.pathParams) {
    options.pathParams.forEach((param) => {
      decorators.push(
        ApiParam({
          name: param.name,
          description: param.description,
        }),
      );
    });
  }

  return applyDecorators(...decorators);
}
```

---

### Phase 2: Annotate Controllers and DTOs (2 hours)

#### Step 2.1: Document Authentication Endpoints

```typescript
// File: /backend/src/modules/auth/controllers/auth.controller.ts

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiDoc } from '../../../common/decorators/api-response.decorator';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto, AuthResponseDto } from '../dto';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiDoc({
    summary: 'Register a new user account',
    description: 'Creates a new user account with email and password',
    body: RegisterDto,
    responses: [
      {
        status: 201,
        description: 'User successfully registered',
        type: AuthResponseDto,
      },
      {
        status: 400,
        description: 'Invalid input data or email already exists',
      },
      {
        status: 429,
        description: 'Too many registration attempts',
      },
    ],
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Login with email and password',
    description: 'Authenticates user and returns JWT access token and refresh token',
    body: LoginDto,
    responses: [
      {
        status: 200,
        description: 'Login successful',
        type: AuthResponseDto,
      },
      {
        status: 401,
        description: 'Invalid credentials',
      },
      {
        status: 429,
        description: 'Too many login attempts',
      },
    ],
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }
}
```

#### Step 2.2: Document DTOs with Schema Examples

```typescript
// File: /backend/src/modules/auth/dto/login.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePass123!',
    minLength: 8,
    format: 'password',
  })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters, must include uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!',
    minLength: 8,
    format: 'password',
  })
  @IsString()
  @MinLength(8)
  password: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token (expires in 15 minutes)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token (expires in 7 days)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User information',
    type: 'object',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'john.doe@example.com',
      name: 'John Doe',
    },
  })
  user: {
    id: string;
    email: string;
    name: string;
  };
}
```

#### Step 2.3: Document Product Endpoints

```typescript
// File: /backend/src/modules/products/controllers/products.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiDoc } from '../../../common/decorators/api-response.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProductsService } from '../services/products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductListResponseDto,
  ProductQueryDto,
} from '../dto';

@ApiTags('Products')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiDoc({
    summary: 'List all products',
    description: 'Retrieves paginated list of products with optional filters',
    queryParams: [
      { name: 'page', description: 'Page number (default: 1)' },
      { name: 'limit', description: 'Items per page (default: 20, max: 100)' },
      { name: 'search', description: 'Search in title and description' },
      { name: 'category', description: 'Filter by category' },
      { name: 'minPrice', description: 'Minimum price filter' },
      { name: 'maxPrice', description: 'Maximum price filter' },
      { name: 'inStock', description: 'Filter by stock status' },
    ],
    responses: [
      {
        status: 200,
        description: 'Products retrieved successfully',
        type: ProductListResponseDto,
      },
      {
        status: 401,
        description: 'Unauthorized - Invalid or missing token',
      },
    ],
  })
  async findAll(@Query() query: ProductQueryDto): Promise<ProductListResponseDto> {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiDoc({
    summary: 'Get product by ID',
    description: 'Retrieves detailed information for a specific product',
    pathParams: [{ name: 'id', description: 'Product UUID' }],
    responses: [
      {
        status: 200,
        description: 'Product found',
        type: ProductResponseDto,
      },
      {
        status: 404,
        description: 'Product not found',
      },
    ],
  })
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiDoc({
    summary: 'Create a new product',
    description: 'Adds a new product to the catalog',
    body: CreateProductDto,
    responses: [
      {
        status: 201,
        description: 'Product created successfully',
        type: ProductResponseDto,
      },
      {
        status: 400,
        description: 'Invalid input data',
      },
    ],
  })
  async create(@Body() createDto: CreateProductDto): Promise<ProductResponseDto> {
    return this.productsService.create(createDto);
  }
}
```

---

### Phase 3: Advanced Documentation Features (1 hour)

#### Step 3.1: Document Webhook Endpoints

```typescript
// File: /backend/src/modules/webhooks/controllers/webhooks.controller.ts

import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import { ApiDoc } from '../../../common/decorators/api-response.decorator';
import { WebhooksService } from '../services/webhooks.service';
import { InstagramWebhookDto } from '../dto';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('instagram')
  @HttpCode(200)
  @ApiDoc({
    summary: 'Instagram webhook receiver',
    description: `
      Receives webhook events from Instagram Graph API.

      **Supported Events:**
      - messages: New direct messages
      - message_reactions: Message reactions
      - messaging_seen: Message read receipts
      - feed: Feed post updates
      - comments: Comment events

      **Security:**
      Validates X-Hub-Signature header using app secret.
    `,
    body: InstagramWebhookDto,
    responses: [
      {
        status: 200,
        description: 'Webhook processed successfully',
      },
      {
        status: 400,
        description: 'Invalid webhook payload',
      },
      {
        status: 401,
        description: 'Invalid signature',
      },
    ],
  })
  @ApiHeader({
    name: 'X-Hub-Signature',
    description: 'SHA-256 HMAC signature of request body',
    required: true,
  })
  async handleInstagramWebhook(
    @Body() payload: InstagramWebhookDto,
    @Headers('x-hub-signature') signature: string,
  ): Promise<void> {
    return this.webhooksService.processInstagram(payload, signature);
  }
}
```

#### Step 3.2: Create Example Generators

```typescript
// File: /backend/src/common/swagger/examples.ts

export const SWAGGER_EXAMPLES = {
  auth: {
    loginRequest: {
      email: 'demo@socialselling.com',
      password: 'DemoPass123!',
    },
    loginResponse: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImRlbW9Ac29jaWFsc2VsbGluZy5jb20iLCJpYXQiOjE2MzU0NDMyMDAsImV4cCI6MTYzNTQ0NDA5MH0.abcdef123456',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYzNTQ0MzIwMCwiZXhwIjoxNjM2MDQ4MDAwfQ.xyz789',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'demo@socialselling.com',
        name: 'Demo User',
      },
    },
  },
  products: {
    createRequest: {
      title: 'Premium Leather Handbag',
      description: 'Handcrafted genuine leather handbag with gold accents',
      price: 149.99,
      compareAtPrice: 199.99,
      sku: 'BAG-LEATHER-001',
      quantity: 25,
      categories: ['accessories', 'handbags'],
      images: [
        'https://cdn.example.com/products/bag-001-front.jpg',
        'https://cdn.example.com/products/bag-001-side.jpg',
      ],
    },
    productResponse: {
      id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      title: 'Premium Leather Handbag',
      description: 'Handcrafted genuine leather handbag with gold accents',
      price: 149.99,
      compareAtPrice: 199.99,
      sku: 'BAG-LEATHER-001',
      quantity: 25,
      categories: ['accessories', 'handbags'],
      images: [
        'https://cdn.example.com/products/bag-001-front.jpg',
        'https://cdn.example.com/products/bag-001-side.jpg',
      ],
      createdAt: '2025-01-15T10:30:00Z',
      updatedAt: '2025-01-15T10:30:00Z',
    },
  },
  instagram: {
    accountResponse: {
      id: '8f4b2c3a-9876-4321-abcd-ef1234567890',
      instagramBusinessAccountId: '17841405309211844',
      username: 'myboutique',
      name: 'My Boutique',
      profilePictureUrl: 'https://scontent.cdninstagram.com/v/...',
      followersCount: 12543,
      followsCount: 892,
      mediaCount: 234,
      status: 'active',
      connectedAt: '2025-01-10T15:20:00Z',
    },
  },
};
```

---

### Phase 4: Export and Additional Formats (0.5 hours)

#### Step 4.1: Generate Postman Collection

```typescript
// File: /backend/src/scripts/generate-postman.ts

import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../app.module';

async function generatePostmanCollection() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Social Selling API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Convert OpenAPI to Postman Collection v2.1
  const postmanCollection = {
    info: {
      name: 'Social Selling API',
      description: 'API collection for Social Selling Platform',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: convertOpenApiToPostman(document),
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{accessToken}}',
          type: 'string',
        },
      ],
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000',
        type: 'string',
      },
      {
        key: 'accessToken',
        value: '',
        type: 'string',
      },
    ],
  };

  fs.writeFileSync(
    path.join(__dirname, '../../postman-collection.json'),
    JSON.stringify(postmanCollection, null, 2),
  );

  console.log('✅ Postman collection generated');
  await app.close();
}

function convertOpenApiToPostman(openApiDoc: any): any[] {
  // Conversion logic here
  return [];
}

generatePostmanCollection();
```

#### Step 4.2: Generate ReDoc HTML

```bash
# File: /backend/package.json scripts section

{
  "scripts": {
    "docs:generate": "ts-node src/scripts/generate-docs.ts",
    "docs:redoc": "redoc-cli bundle openapi-spec.json -o docs/api-docs.html",
    "docs:serve": "redoc-cli serve openapi-spec.json --watch",
    "postman:generate": "ts-node src/scripts/generate-postman.ts"
  }
}
```

---

## API Documentation Examples

### Example 1: Authentication Flow

```yaml
# OpenAPI Spec Fragment
/api/v1/auth/login:
  post:
    tags:
      - Authentication
    summary: Login with email and password
    description: Authenticates user and returns JWT tokens
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/LoginDto'
          examples:
            validLogin:
              summary: Valid login credentials
              value:
                email: demo@socialselling.com
                password: DemoPass123!
    responses:
      '200':
        description: Login successful
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthResponseDto'
            examples:
              successfulLogin:
                summary: Successful authentication
                value:
                  accessToken: eyJhbGciOiJIUzI1NiIs...
                  refreshToken: eyJhbGciOiJIUzI1NiIs...
                  user:
                    id: 550e8400-e29b-41d4-a716-446655440000
                    email: demo@socialselling.com
                    name: Demo User
      '401':
        description: Invalid credentials
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

### Example 2: Product Management

```yaml
/api/v1/products:
  get:
    tags:
      - Products
    summary: List all products
    security:
      - bearerAuth: []
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          default: 1
      - name: limit
        in: query
        schema:
          type: integer
          default: 20
          maximum: 100
      - name: search
        in: query
        schema:
          type: string
    responses:
      '200':
        description: Products retrieved successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/ProductResponseDto'
                meta:
                  $ref: '#/components/schemas/PaginationMeta'
```

---

## Testing Procedures

### Testing Strategy

```typescript
// File: /backend/src/test/swagger.e2e-spec.ts

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Swagger Documentation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/docs should serve Swagger UI', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs')
      .expect(200);

    expect(response.text).toContain('swagger-ui');
  });

  it('/api/docs-json should return OpenAPI spec', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    expect(response.body).toHaveProperty('openapi');
    expect(response.body).toHaveProperty('info');
    expect(response.body).toHaveProperty('paths');
  });

  it('OpenAPI spec should include all controllers', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json');

    const paths = Object.keys(response.body.paths);

    expect(paths).toContain('/api/v1/auth/login');
    expect(paths).toContain('/api/v1/products');
    expect(paths).toContain('/api/v1/instagram/accounts');
  });

  it('OpenAPI spec should include security schemes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json');

    expect(response.body.components.securitySchemes).toHaveProperty('bearerAuth');
  });
});
```

### Manual Testing Checklist

```bash
# 1. Start the application
npm run start:dev

# 2. Access Swagger UI
open http://localhost:3000/api/docs

# 3. Test authentication flow
# - Click "Authorize" button
# - Use POST /api/v1/auth/login
# - Copy access token
# - Paste in "Authorize" dialog

# 4. Test authenticated endpoints
# - Try GET /api/v1/products
# - Verify request works with token

# 5. Export OpenAPI spec
curl http://localhost:3000/api/docs-json > openapi-spec.json

# 6. Generate ReDoc HTML
npm run docs:redoc

# 7. Generate Postman collection
npm run postman:generate
```

---

## Acceptance Criteria

- [ ] Swagger UI accessible at /api/docs endpoint
- [ ] All controllers properly annotated with @ApiTags
- [ ] All endpoints have @ApiOperation with summary and description
- [ ] All DTOs use @ApiProperty decorators with examples
- [ ] Request/response schemas auto-generated from DTOs
- [ ] Authentication flows documented (Bearer JWT)
- [ ] All HTTP status codes documented per endpoint
- [ ] Query parameters documented with types and defaults
- [ ] Path parameters documented
- [ ] Request body schemas included for POST/PUT/PATCH
- [ ] Response examples provided for success cases
- [ ] Error response schemas documented
- [ ] Webhook endpoints documented with signature validation
- [ ] OpenAPI 3.0 spec exports as JSON at /api/docs-json
- [ ] OpenAPI spec validates against OpenAPI 3.0 schema
- [ ] Postman collection generation script works
- [ ] ReDoc HTML generation works
- [ ] API versioning strategy documented
- [ ] Rate limiting information included in descriptions
- [ ] Environment-specific servers configured (local, staging, prod)
- [ ] Security schemes properly defined
- [ ] Example requests/responses comprehensive
- [ ] Tags organized by functional domain
- [ ] External documentation links included where relevant
- [ ] Deprecated endpoints marked with @ApiDeprecated

---

## Dependencies

### NPM Packages
```json
{
  "dependencies": {
    "@nestjs/swagger": "^7.1.17",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "@types/swagger-ui-express": "^4.1.6",
    "redoc-cli": "^0.13.21"
  }
}
```

### Required Tasks
- BE-001: Database Schema and Models (for entity references)
- BE-002: User Management Module (for user endpoints)
- BE-003: Product Catalog Module (for product endpoints)
- BE-004: Authentication Module (for auth endpoints)
- BE-005: Instagram OAuth Integration (for Instagram endpoints)
- BE-006: Session Management (for session endpoints)

---

## Environment Variables

```bash
# .env
# Documentation settings
ENABLE_DOCS=true # Set to false in production unless needed
SWAGGER_PATH=api/docs
SWAGGER_JSON_PATH=api/docs-json

# API Information
API_TITLE=Social Selling API
API_DESCRIPTION=Instagram-based social selling platform API
API_VERSION=1.0.0

# Server URLs
LOCAL_URL=http://localhost:3000
STAGING_URL=https://staging-api.socialselling.com
PRODUCTION_URL=https://api.socialselling.com
```

---

## File Structure

```
backend/
├── src/
│   ├── config/
│   │   └── swagger.config.ts          # Swagger configuration
│   ├── common/
│   │   ├── decorators/
│   │   │   └── api-response.decorator.ts  # Custom API decorators
│   │   └── swagger/
│   │       └── examples.ts            # Example data for docs
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── controllers/
│   │   │   │   └── auth.controller.ts  # Annotated auth endpoints
│   │   │   └── dto/
│   │   │       ├── login.dto.ts       # With @ApiProperty
│   │   │       └── register.dto.ts    # With @ApiProperty
│   │   ├── products/
│   │   │   ├── controllers/
│   │   │   │   └── products.controller.ts
│   │   │   └── dto/
│   │   │       └── *.dto.ts           # All DTOs annotated
│   │   └── ...
│   ├── scripts/
│   │   ├── generate-docs.ts           # Doc generation script
│   │   └── generate-postman.ts        # Postman export script
│   └── main.ts                        # Swagger setup in bootstrap
├── docs/
│   └── api-docs.html                  # Generated ReDoc HTML
├── openapi-spec.json                  # Generated OpenAPI spec
└── postman-collection.json            # Generated Postman collection
```

---

## Performance Considerations

1. **Documentation Generation**: Only enable in development and staging
2. **Spec Caching**: Cache generated OpenAPI spec in production
3. **UI Assets**: Serve Swagger UI assets from CDN in production
4. **Lazy Loading**: Load documentation routes conditionally

---

## Security Considerations

1. **Production Access**: Disable or protect /api/docs in production
2. **API Keys**: Never include real API keys in examples
3. **PII**: Avoid real user data in examples
4. **Authentication**: Require admin role for docs in production

---

## Future Enhancements

- [ ] GraphQL schema documentation (if GraphQL added)
- [ ] WebSocket endpoint documentation
- [ ] API changelog generation
- [ ] Interactive code examples in multiple languages
- [ ] SDK generation from OpenAPI spec
- [ ] Automated API contract testing

---

**Task Status:** Ready for Implementation
**Estimated Completion Time:** 5 hours
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
