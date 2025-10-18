# BE-004: Authentication Module (Registration & Login)

**Priority:** P0 (Critical Path)
**Effort:** 8 hours
**Day:** 4
**Dependencies:** BE-002 (Repository Pattern), BE-003 (Database Migrations)
**Domain:** Backend Core

---

## Overview

Implement complete user authentication system with registration, login, JWT token generation, refresh token flow, password hashing with bcrypt, and rate limiting for security.

---

## Data Models

### User Entity

```typescript
// File: /backend/src/domain/entities/user.entity.ts

export interface User {
  id: string; // UUID
  email: string; // Unique, indexed
  passwordHash: string; // bcrypt hash
  name: string;
  timezone: string; // e.g., "America/Sao_Paulo"
  language: string; // e.g., "pt-BR"
  subscriptionTier: SubscriptionTier;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}
```

### JWT Payload

```typescript
// File: /backend/src/modules/auth/interfaces/jwt-payload.interface.ts

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  iat: number; // Issued at
  exp: number; // Expiration
  type: 'access' | 'refresh';
}

export interface JwtTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}
```

### DTOs

```typescript
// File: /backend/src/modules/auth/dto/register.dto.ts

import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password (min 8 chars, must include uppercase, lowercase, number)'
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    { message: 'Password must contain uppercase, lowercase, and number' }
  )
  password: string;

  @ApiProperty({
    example: 'João Silva',
    description: 'Full name'
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;
}

// File: /backend/src/modules/auth/dto/login.dto.ts

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User password'
  })
  @IsString()
  @MinLength(8)
  password: string;
}

// File: /backend/src/modules/auth/dto/refresh-token.dto.ts

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token'
  })
  @IsString()
  refreshToken: string;
}

// File: /backend/src/modules/auth/dto/auth-response.dto.ts

export class AuthResponseDto {
  @ApiProperty()
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  };

  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ description: 'Access token expiration in seconds' })
  expiresIn: number;
}
```

---

## API Endpoints

### POST /auth/register

**Description:** Register new user account

**Request:**
```typescript
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "João Silva"
}
```

**Response (201 Created):**
```typescript
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "João Silva",
    "emailVerified": false
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

**Errors:**
- 400: Email already registered
- 400: Invalid email format
- 400: Password doesn't meet requirements
- 429: Too many registration attempts

---

### POST /auth/login

**Description:** Authenticate user and receive JWT tokens

**Request:**
```typescript
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```typescript
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "João Silva",
    "emailVerified": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

**Errors:**
- 401: Invalid credentials
- 429: Too many login attempts (5 per minute)
- 403: Account disabled

---

### POST /auth/refresh

**Description:** Refresh access token using refresh token

**Request:**
```typescript
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```typescript
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

**Errors:**
- 401: Invalid or expired refresh token
- 401: Refresh token revoked

---

### POST /auth/logout

**Description:** Invalidate refresh token

**Request:**
```typescript
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```typescript
{
  "message": "Logged out successfully"
}
```

---

## Implementation Approach

### Phase 1: Database Migration (30 minutes)

```typescript
// File: /backend/migrations/001-create-users-table.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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

      -- Indexes
      CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
      CREATE INDEX idx_users_created_at ON users(created_at);
      CREATE INDEX idx_users_last_login_at ON users(last_login_at);

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
      CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

      -- Function to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger for users table
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      DROP FUNCTION IF EXISTS update_updated_at_column;
      DROP TABLE IF EXISTS refresh_tokens;
      DROP TABLE IF EXISTS users;
    `);
  }
}
```

### Phase 2: Repository Implementation (1 hour)

```typescript
// File: /backend/src/infrastructure/database/repositories/postgres-user.repository.ts

import { Injectable } from '@nestjs/common';
import { Database } from '../database';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { User } from '../../../domain/entities/user.entity';

@Injectable()
export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.db.oneOrNone<User>(
      `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db.oneOrNone<User>(
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );
    return user;
  }

  async create(data: Partial<User>): Promise<User> {
    const user = await this.db.one<User>(
      `
      INSERT INTO users (email, password_hash, name, timezone, language)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [data.email, data.passwordHash, data.name, data.timezone || 'America/Sao_Paulo', data.language || 'pt-BR']
    );
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        setClauses.push(`${this.toSnakeCase(key)} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    values.push(id);
    const user = await this.db.one<User>(
      `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
      `,
      values
    );
    return user;
  }

  async updateLastLogin(id: string, ip: string): Promise<void> {
    await this.db.none(
      `
      UPDATE users
      SET last_login_at = NOW(), last_login_ip = $2
      WHERE id = $1
      `,
      [id, ip]
    );
  }

  async storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.none(
      `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      `,
      [userId, tokenHash, expiresAt]
    );
  }

  async findRefreshToken(tokenHash: string): Promise<any | null> {
    return this.db.oneOrNone(
      `
      SELECT rt.*, u.id as user_id, u.email, u.name
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = $1
        AND rt.revoked_at IS NULL
        AND rt.expires_at > NOW()
        AND u.deleted_at IS NULL
      `,
      [tokenHash]
    );
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.db.none(
      `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1
      `,
      [tokenHash]
    );
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.db.none(
      `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
      `,
      [userId]
    );
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
```

### Phase 3: Auth Service Implementation (3 hours)

```typescript
// File: /backend/src/modules/auth/auth.service.ts

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, JwtTokenPair } from './interfaces/jwt-payload.interface';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly bcryptRounds = 12;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<JwtTokenPair & { user: Partial<User> }> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, this.bcryptRounds);

    // Create user
    const user = await this.userRepository.create({
      email: registerDto.email,
      passwordHash,
      name: registerDto.name,
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
    });

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto, ip: string): Promise<JwtTokenPair & { user: Partial<User> }> {
    // Find user
    const user = await this.userRepository.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.userRepository.updateLastLogin(user.id, ip);

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    // Verify refresh token
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token is in database and not revoked
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.userRepository.findRefreshToken(tokenHash);
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    // Generate new access token
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.generateAccessToken(user);
    const expiresIn = this.getTokenExpirationSeconds(this.configService.get<string>('JWT_EXPIRES_IN'));

    return { accessToken, expiresIn };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.userRepository.revokeRefreshToken(tokenHash);
  }

  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private async generateTokenPair(user: User): Promise<JwtTokenPair> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token hash in database
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await this.userRepository.storeRefreshToken(user.id, tokenHash, expiresAt);

    const expiresIn = this.getTokenExpirationSeconds(this.configService.get<string>('JWT_EXPIRES_IN'));

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.getTokenExpirationSeconds(this.configService.get<string>('JWT_EXPIRES_IN')),
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });
  }

  private generateRefreshToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.getTokenExpirationSeconds(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')),
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getTokenExpirationSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 86400; // Default 24 hours

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] || 1);
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, emailVerificationToken, passwordResetToken, ...sanitized } = user;
    return sanitized;
  }
}
```

### Phase 4: JWT Strategy (1 hour)

```typescript
// File: /backend/src/modules/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { User } from '../../../domain/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.authService.validateUser(payload);
    return user;
  }
}
```

### Phase 5: Auth Controller (1.5 hours)

```typescript
// File: /backend/src/modules/auth/auth.controller.ts

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Ip,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard) // Rate limiting: 5 requests per minute
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or email already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and receive JWT tokens' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(@Body() loginDto: LoginDto, @Ip() ip: string): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req) {
    return req.user;
  }
}
```

### Phase 6: Auth Module (30 minutes)

```typescript
// File: /backend/src/modules/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 5,   // 5 requests per minute
    }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
```

---

## Files to Create

```
/backend/src/
├── modules/
│   └── auth/
│       ├── auth.module.ts
│       ├── auth.service.ts
│       ├── auth.controller.ts
│       ├── strategies/
│       │   └── jwt.strategy.ts
│       ├── guards/
│       │   └── jwt-auth.guard.ts
│       ├── dto/
│       │   ├── register.dto.ts
│       │   ├── login.dto.ts
│       │   ├── refresh-token.dto.ts
│       │   └── auth-response.dto.ts
│       └── interfaces/
│           └── jwt-payload.interface.ts
├── domain/
│   ├── entities/
│   │   └── user.entity.ts
│   └── repositories/
│       └── user.repository.interface.ts
└── migrations/
    └── 001-create-users-table.ts
```

---

## Dependencies

**Prerequisites:**
- BE-002 (Repository Pattern implemented)
- BE-003 (Database Migrations system working)
- INFRA-003 (PostgreSQL running)

**Blocks:**
- BE-005 (User Module)
- BE-006 (Session Management)
- IG-001 (Instagram OAuth)
- FE-002 (Authentication Pages)

---

## Acceptance Criteria

- [ ] User can register with email and password
- [ ] Password hashed with bcrypt (12 rounds)
- [ ] Email validation prevents duplicate registrations
- [ ] Password complexity enforced (min 8 chars, uppercase, lowercase, number)
- [ ] User can login with valid credentials
- [ ] Login fails with invalid credentials (401 status)
- [ ] JWT access token generated on successful authentication
- [ ] JWT refresh token generated on successful authentication
- [ ] Access token expires in 24 hours
- [ ] Refresh token expires in 7 days
- [ ] Can refresh access token with valid refresh token
- [ ] Logout revokes refresh token
- [ ] Rate limiting active (5 requests per minute per endpoint)
- [ ] JWT tokens contain correct payload (user ID, email, type)
- [ ] Protected routes require valid JWT token
- [ ] Invalid JWT tokens return 401 Unauthorized
- [ ] Last login timestamp and IP tracked
- [ ] All tests passing (unit tests for service methods)
- [ ] Swagger documentation complete for all endpoints

---

## Testing Procedure

```bash
# 1. Register new user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'

# Expected: 201 Created with user data and tokens

# 2. Login with registered user
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Expected: 200 OK with tokens

# 3. Access protected route
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# Expected: 200 OK with user data

# 4. Refresh token
curl -X POST http://localhost:4000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'

# Expected: 200 OK with new access token

# 5. Test invalid credentials
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword"
  }'

# Expected: 401 Unauthorized

# 6. Test rate limiting (send 6 requests rapidly)
for i in {1..6}; do
  curl -X POST http://localhost:4000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}' &
done

# Expected: 6th request returns 429 Too Many Requests

# 7. Logout
curl -X POST http://localhost:4000/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'

# Expected: 200 OK

# 8. Verify token revoked
curl -X POST http://localhost:4000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'

# Expected: 401 Unauthorized
```

---

## Security Considerations

1. **Password Storage:** Never store plaintext passwords. Use bcrypt with 12 rounds minimum.
2. **JWT Secrets:** Generate strong secrets using `openssl rand -base64 64`
3. **Token Storage:** Store refresh tokens hashed in database
4. **Rate Limiting:** Prevent brute force attacks with throttling
5. **Input Validation:** Validate all inputs with class-validator
6. **HTTPS:** Always use HTTPS in production
7. **Token Expiration:** Keep access tokens short-lived (24 hours)
8. **Refresh Token Rotation:** Consider implementing refresh token rotation
9. **Multi-Device Support:** Track refresh tokens per device
10. **Suspicious Activity:** Monitor failed login attempts

---

## Cost Estimate

- **Infrastructure:** Included in existing setup
- **Time Investment:** 8 hours
- **Total Additional Cost:** $0

---

## Related Documents

- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Implementation Plan: `/tasks/social-selling/implementation-plan.md`
- Previous Tasks: BE-002, BE-003
- Next Tasks: BE-005, BE-006, IG-001

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
