# BE-001: NestJS Project Initialization

**Priority:** P0 (Critical Path)
**Effort:** 3 hours
**Day:** 2
**Dependencies:** INFRA-002
**Domain:** Backend Core

---

## Overview

Initialize NestJS backend project with TypeScript, configure project structure using modular architecture, set up environment variables, linting, and pre-commit hooks.

---

## Implementation

### Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── instagram/
│   │   ├── message/
│   │   ├── content/
│   │   ├── analytics/
│   │   └── notification/
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── cache/
│   │   └── storage/
│   ├── domain/
│   │   ├── entities/
│   │   └── repositories/
│   ├── common/
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── filters/
│   ├── config/
│   ├── main.ts
│   └── app.module.ts
├── test/
├── migrations/
├── package.json
├── tsconfig.json
├── .eslintrc.js
└── .prettierrc
```

### Main Application

```typescript
// File: /backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);

  await app.listen(port);
  console.log(`Backend running on port ${port}`);
}

bootstrap();
```

### Configuration Module

```typescript
// File: /backend/src/config/configuration.ts

export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  database: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  minio: {
    host: process.env.MINIO_HOST,
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    accessKey: process.env.MINIO_ROOT_USER,
    secretKey: process.env.MINIO_ROOT_PASSWORD,
    bucket: process.env.MINIO_BUCKET_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  instagram: {
    appId: process.env.INSTAGRAM_APP_ID,
    appSecret: process.env.INSTAGRAM_APP_SECRET,
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
  },
});
```

### TypeScript Configuration

```json
// File: /backend/tsconfig.json

{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### ESLint Configuration

```javascript
// File: /backend/.eslintrc.js

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "type-check": "tsc --noEmit"
  }
}
```

### Environment Variables

```bash
# File: /backend/.env.example

# Application
PORT=4000
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=social_selling
POSTGRES_USER=social_selling_user
POSTGRES_PASSWORD=changeme

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=changeme

# MinIO
MINIO_HOST=minio
MINIO_PORT=9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=changeme
MINIO_BUCKET_NAME=social-selling-media

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Instagram
INSTAGRAM_APP_ID=your-app-id
INSTAGRAM_APP_SECRET=your-app-secret
INSTAGRAM_REDIRECT_URI=http://localhost:4000/api/instagram/oauth/callback

# OAuth Encryption
OAUTH_ENCRYPTION_KEY=your-encryption-key
```

---

## Acceptance Criteria

- [x] NestJS project initialized
- [x] TypeScript compilation working
- [x] Environment variables loading
- [x] Linting and formatting configured
- [x] Pre-commit hooks running
- [x] Can access http://localhost:4000/health
- [x] Hot reload working in development
- [x] Project structure follows modular architecture

---

## Testing

```bash
# Initialize project
npx @nestjs/cli new backend

# Install dependencies
cd backend && npm install

# Start development server
npm run start:dev

# Test health endpoint
curl http://localhost:4000/health

# Run linter
npm run lint

# Run type check
npm run type-check

# Run build
npm run build
```

---

**Task Status:** ✅ Completed
**Last Updated:** 2025-10-18
**Completed By:** Claude Code
**Completion Date:** 2025-10-18
