# BE-003: Core Domain Models

**Priority:** P0 (Critical Path)
**Effort:** 5 hours
**Day:** 3
**Dependencies:** BE-002 (Database Schema)
**Domain:** Backend Core

---

## Overview

Implement TypeScript domain models (entities) and repository interfaces following Domain-Driven Design principles. Create entity classes with validation, business logic, and factory methods. Define repository interfaces for data access abstraction.

---

## Domain Models Architecture

### Directory Structure

```
backend/src/
├── domain/
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── client-account.entity.ts
│   │   ├── oauth-token.entity.ts
│   │   ├── product.entity.ts
│   │   ├── product-link.entity.ts
│   │   ├── conversation.entity.ts
│   │   ├── message.entity.ts
│   │   ├── analytics-event.entity.ts
│   │   ├── instagram-media.entity.ts
│   │   └── notification.entity.ts
│   ├── repositories/
│   │   ├── user.repository.interface.ts
│   │   ├── client-account.repository.interface.ts
│   │   ├── oauth-token.repository.interface.ts
│   │   ├── product.repository.interface.ts
│   │   ├── conversation.repository.interface.ts
│   │   ├── message.repository.interface.ts
│   │   ├── analytics.repository.interface.ts
│   │   └── notification.repository.interface.ts
│   ├── value-objects/
│   │   ├── email.vo.ts
│   │   ├── money.vo.ts
│   │   └── date-range.vo.ts
│   └── exceptions/
│       ├── domain.exception.ts
│       ├── validation.exception.ts
│       └── not-found.exception.ts
```

---

## Entity Implementations

### 1. User Entity

```typescript
// File: /backend/src/domain/entities/user.entity.ts

import { Email } from '../value-objects/email.vo';
import { DomainException } from '../exceptions/domain.exception';

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: string;
  name: string;
  timezone: string;
  language: string;
  subscriptionTier: SubscriptionTier;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class User {
  private props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
    this.validate();
  }

  static create(props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>): User {
    return new User({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length < 2) {
      throw new DomainException('User name must be at least 2 characters');
    }

    if (!this.props.passwordHash) {
      throw new DomainException('Password hash is required');
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get subscriptionTier(): SubscriptionTier {
    return this.props.subscriptionTier;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get isDeleted(): boolean {
    return !!this.props.deletedAt;
  }

  // Business logic methods
  verifyEmail(): void {
    this.props.emailVerified = true;
    this.props.emailVerificationToken = undefined;
    this.props.updatedAt = new Date();
  }

  updateLastLogin(ip: string): void {
    this.props.lastLoginAt = new Date();
    this.props.lastLoginIp = ip;
    this.props.updatedAt = new Date();
  }

  upgradeTier(tier: SubscriptionTier): void {
    const tierHierarchy = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: 1,
      [SubscriptionTier.PRO]: 2,
      [SubscriptionTier.ENTERPRISE]: 3,
    };

    if (tierHierarchy[tier] <= tierHierarchy[this.props.subscriptionTier]) {
      throw new DomainException('Cannot downgrade or upgrade to same tier');
    }

    this.props.subscriptionTier = tier;
    this.props.updatedAt = new Date();
  }

  canConnectInstagramAccount(): boolean {
    // FREE tier: 1 account, BASIC: 3, PRO: 10, ENTERPRISE: unlimited
    return true; // Actual logic would check current account count
  }

  setPasswordResetToken(token: string, expiresInMinutes: number = 60): void {
    this.props.passwordResetToken = token;
    this.props.passwordResetExpires = new Date(Date.now() + expiresInMinutes * 60000);
    this.props.updatedAt = new Date();
  }

  isPasswordResetTokenValid(): boolean {
    if (!this.props.passwordResetToken || !this.props.passwordResetExpires) {
      return false;
    }
    return this.props.passwordResetExpires > new Date();
  }

  softDelete(): void {
    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      email: this.props.email.value,
      name: this.props.name,
      timezone: this.props.timezone,
      language: this.props.language,
      subscriptionTier: this.props.subscriptionTier,
      emailVerified: this.props.emailVerified,
      lastLoginAt: this.props.lastLoginAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
```

### 2. Product Entity

```typescript
// File: /backend/src/domain/entities/product.entity.ts

import { Money } from '../value-objects/money.vo';
import { DomainException } from '../exceptions/domain.exception';

export interface ProductImage {
  url: string;
  alt?: string;
  order: number;
}

export interface ProductProps {
  id: string;
  userId: string;
  name: string;
  description?: string;
  price: Money;
  category?: string;
  tags: string[];
  images: ProductImage[];
  stockQuantity?: number;
  sku?: string;
  isAvailable: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class Product {
  private props: ProductProps;

  private constructor(props: ProductProps) {
    this.props = props;
    this.validate();
  }

  static create(props: Omit<ProductProps, 'id' | 'createdAt' | 'updatedAt'>): Product {
    return new Product({
      ...props,
      id: crypto.randomUUID(),
      tags: props.tags || [],
      images: props.images || [],
      metadata: props.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: ProductProps): Product {
    return new Product(props);
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length < 2) {
      throw new DomainException('Product name must be at least 2 characters');
    }

    if (this.props.stockQuantity !== undefined && this.props.stockQuantity < 0) {
      throw new DomainException('Stock quantity cannot be negative');
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get price(): Money {
    return this.props.price;
  }

  get isAvailable(): boolean {
    return this.props.isAvailable;
  }

  get hasStock(): boolean {
    if (this.props.stockQuantity === undefined) {
      return true; // No stock tracking
    }
    return this.props.stockQuantity > 0;
  }

  // Business logic
  updatePrice(newPrice: Money): void {
    if (newPrice.amount < 0) {
      throw new DomainException('Price cannot be negative');
    }

    this.props.price = newPrice;
    this.props.updatedAt = new Date();
  }

  addTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    if (!this.props.tags.includes(normalizedTag)) {
      this.props.tags.push(normalizedTag);
      this.props.updatedAt = new Date();
    }
  }

  removeTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    this.props.tags = this.props.tags.filter(t => t !== normalizedTag);
    this.props.updatedAt = new Date();
  }

  addImage(image: ProductImage): void {
    this.props.images.push(image);
    this.props.updatedAt = new Date();
  }

  decrementStock(quantity: number = 1): void {
    if (this.props.stockQuantity === undefined) {
      return; // No stock tracking
    }

    if (quantity <= 0) {
      throw new DomainException('Quantity must be positive');
    }

    if (this.props.stockQuantity < quantity) {
      throw new DomainException('Insufficient stock');
    }

    this.props.stockQuantity -= quantity;
    this.props.updatedAt = new Date();

    if (this.props.stockQuantity === 0) {
      this.makeUnavailable();
    }
  }

  incrementStock(quantity: number = 1): void {
    if (this.props.stockQuantity === undefined) {
      this.props.stockQuantity = quantity;
    } else {
      this.props.stockQuantity += quantity;
    }
    this.props.updatedAt = new Date();
  }

  makeAvailable(): void {
    if (!this.hasStock && this.props.stockQuantity !== undefined) {
      throw new DomainException('Cannot make available without stock');
    }

    this.props.isAvailable = true;
    this.props.updatedAt = new Date();
  }

  makeUnavailable(): void {
    this.props.isAvailable = false;
    this.props.updatedAt = new Date();
  }

  softDelete(): void {
    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      name: this.props.name,
      description: this.props.description,
      price: {
        amount: this.props.price.amount,
        currency: this.props.price.currency,
      },
      category: this.props.category,
      tags: this.props.tags,
      images: this.props.images,
      stockQuantity: this.props.stockQuantity,
      sku: this.props.sku,
      isAvailable: this.props.isAvailable,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
```

### 3. Message Entity

```typescript
// File: /backend/src/domain/entities/message.entity.ts

import { DomainException } from '../exceptions/domain.exception';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  STORY_MENTION = 'story_mention',
  STORY_REPLY = 'story_reply'
}

export enum SenderType {
  USER = 'user',
  CUSTOMER = 'customer'
}

export interface MessageProps {
  id: string;
  conversationId: string;
  platformMessageId: string;
  senderType: SenderType;
  senderPlatformId?: string;
  messageType: MessageType;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  isRead: boolean;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

export class Message {
  private props: MessageProps;

  private constructor(props: MessageProps) {
    this.props = props;
    this.validate();
  }

  static create(props: Omit<MessageProps, 'id' | 'createdAt' | 'isRead'>): Message {
    return new Message({
      ...props,
      id: crypto.randomUUID(),
      isRead: false,
      metadata: props.metadata || {},
      createdAt: new Date(),
    });
  }

  static reconstitute(props: MessageProps): Message {
    return new Message(props);
  }

  private validate(): void {
    if (this.props.messageType === MessageType.TEXT && !this.props.content) {
      throw new DomainException('Text messages must have content');
    }

    if (
      [MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO].includes(this.props.messageType) &&
      !this.props.mediaUrl
    ) {
      throw new DomainException(`${this.props.messageType} messages must have media URL`);
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get conversationId(): string {
    return this.props.conversationId;
  }

  get senderType(): SenderType {
    return this.props.senderType;
  }

  get isFromCustomer(): boolean {
    return this.props.senderType === SenderType.CUSTOMER;
  }

  get isRead(): boolean {
    return this.props.isRead;
  }

  get sentAt(): Date {
    return this.props.sentAt;
  }

  get content(): string | undefined {
    return this.props.content;
  }

  // Business logic
  markAsRead(): void {
    if (this.props.isRead) {
      return;
    }

    this.props.isRead = true;
    this.props.readAt = new Date();
  }

  markAsDelivered(): void {
    if (this.props.deliveredAt) {
      return;
    }

    this.props.deliveredAt = new Date();
  }

  isWithinResponseWindow(windowHours: number = 24): boolean {
    const now = new Date();
    const windowMs = windowHours * 60 * 60 * 1000;
    return now.getTime() - this.props.sentAt.getTime() <= windowMs;
  }

  containsProductMention(productName: string): boolean {
    if (!this.props.content) {
      return false;
    }

    const normalizedContent = this.props.content.toLowerCase();
    const normalizedProduct = productName.toLowerCase();
    return normalizedContent.includes(normalizedProduct);
  }

  toJSON() {
    return {
      id: this.props.id,
      conversationId: this.props.conversationId,
      platformMessageId: this.props.platformMessageId,
      senderType: this.props.senderType,
      senderPlatformId: this.props.senderPlatformId,
      messageType: this.props.messageType,
      content: this.props.content,
      mediaUrl: this.props.mediaUrl,
      mediaType: this.props.mediaType,
      isRead: this.props.isRead,
      sentAt: this.props.sentAt,
      deliveredAt: this.props.deliveredAt,
      readAt: this.props.readAt,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
    };
  }
}
```

### 4. Conversation Entity

```typescript
// File: /backend/src/domain/entities/conversation.entity.ts

import { DomainException } from '../exceptions/domain.exception';

export enum ConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  ARCHIVED = 'archived'
}

export interface ConversationProps {
  id: string;
  clientAccountId: string;
  platformConversationId: string;
  participantPlatformId: string;
  participantUsername?: string;
  participantProfilePic?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  status: ConversationStatus;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class Conversation {
  private props: ConversationProps;

  private constructor(props: ConversationProps) {
    this.props = props;
  }

  static create(
    props: Omit<ConversationProps, 'id' | 'unreadCount' | 'status' | 'createdAt' | 'updatedAt'>
  ): Conversation {
    return new Conversation({
      ...props,
      id: crypto.randomUUID(),
      unreadCount: 0,
      status: ConversationStatus.OPEN,
      metadata: props.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get clientAccountId(): string {
    return this.props.clientAccountId;
  }

  get unreadCount(): number {
    return this.props.unreadCount;
  }

  get status(): ConversationStatus {
    return this.props.status;
  }

  get isOpen(): boolean {
    return this.props.status === ConversationStatus.OPEN;
  }

  get lastMessageAt(): Date | undefined {
    return this.props.lastMessageAt;
  }

  // Business logic
  incrementUnreadCount(): void {
    this.props.unreadCount++;
    this.props.updatedAt = new Date();
  }

  markAllAsRead(): void {
    this.props.unreadCount = 0;
    this.props.updatedAt = new Date();
  }

  updateLastMessage(timestamp: Date): void {
    this.props.lastMessageAt = timestamp;
    this.props.updatedAt = new Date();
  }

  close(): void {
    this.props.status = ConversationStatus.CLOSED;
    this.props.updatedAt = new Date();
  }

  reopen(): void {
    if (this.props.status === ConversationStatus.ARCHIVED) {
      throw new DomainException('Cannot reopen archived conversation');
    }

    this.props.status = ConversationStatus.OPEN;
    this.props.updatedAt = new Date();
  }

  archive(): void {
    this.props.status = ConversationStatus.ARCHIVED;
    this.props.updatedAt = new Date();
  }

  isStale(daysSinceLastMessage: number = 7): boolean {
    if (!this.props.lastMessageAt) {
      return false;
    }

    const now = new Date();
    const daysSince = (now.getTime() - this.props.lastMessageAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= daysSinceLastMessage;
  }

  toJSON() {
    return {
      id: this.props.id,
      clientAccountId: this.props.clientAccountId,
      platformConversationId: this.props.platformConversationId,
      participantPlatformId: this.props.participantPlatformId,
      participantUsername: this.props.participantUsername,
      participantProfilePic: this.props.participantProfilePic,
      lastMessageAt: this.props.lastMessageAt,
      unreadCount: this.props.unreadCount,
      status: this.props.status,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
```

---

## Value Objects

### Email Value Object

```typescript
// File: /backend/src/domain/value-objects/email.vo.ts

import { ValidationException } from '../exceptions/validation.exception';

export class Email {
  private readonly _value: string;

  constructor(email: string) {
    this._value = this.validate(email);
  }

  private validate(email: string): string {
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmed)) {
      throw new ValidationException('Invalid email format');
    }

    return trimmed;
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
```

### Money Value Object

```typescript
// File: /backend/src/domain/value-objects/money.vo.ts

import { ValidationException } from '../exceptions/validation.exception';

export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  constructor(amount: number, currency: string = 'BRL') {
    this._amount = this.validateAmount(amount);
    this._currency = this.validateCurrency(currency);
  }

  private validateAmount(amount: number): number {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new ValidationException('Amount must be a valid number');
    }

    if (amount < 0) {
      throw new ValidationException('Amount cannot be negative');
    }

    // Round to 2 decimal places
    return Math.round(amount * 100) / 100;
  }

  private validateCurrency(currency: string): string {
    const validCurrencies = ['BRL', 'USD', 'EUR'];
    const upper = currency.toUpperCase();

    if (!validCurrencies.includes(upper)) {
      throw new ValidationException(`Invalid currency: ${currency}`);
    }

    return upper;
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new ValidationException('Cannot add money with different currencies');
    }

    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new ValidationException('Cannot subtract money with different currencies');
    }

    return new Money(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return new Money(this._amount * factor, this._currency);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  greaterThan(other: Money): boolean {
    if (this._currency !== other._currency) {
      throw new ValidationException('Cannot compare money with different currencies');
    }

    return this._amount > other._amount;
  }

  format(): string {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: this._currency,
    });

    return formatter.format(this._amount);
  }

  toJSON() {
    return {
      amount: this._amount,
      currency: this._currency,
    };
  }
}
```

---

## Repository Interfaces

### User Repository Interface

```typescript
// File: /backend/src/domain/repositories/user.repository.interface.ts

import { User } from '../entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;

  // Auth-specific methods
  updateLastLogin(id: string, ip: string): Promise<void>;
  storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<any | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;
}
```

### Product Repository Interface

```typescript
// File: /backend/src/domain/repositories/product.repository.interface.ts

import { Product } from '../entities/product.entity';

export interface FindProductsOptions {
  userId?: string;
  category?: string;
  isAvailable?: boolean;
  searchTerm?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findByUserId(userId: string, options?: FindProductsOptions): Promise<Product[]>;
  findByCategory(category: string, options?: FindProductsOptions): Promise<Product[]>;
  search(options: FindProductsOptions): Promise<{ products: Product[]; total: number }>;
  create(product: Product): Promise<Product>;
  update(product: Product): Promise<Product>;
  delete(id: string): Promise<void>;

  // Analytics methods
  countByUser(userId: string): Promise<number>;
  getMostViewedProducts(userId: string, limit: number): Promise<Product[]>;
}
```

### Conversation Repository Interface

```typescript
// File: /backend/src/domain/repositories/conversation.repository.interface.ts

import { Conversation, ConversationStatus } from '../entities/conversation.entity';

export interface FindConversationsOptions {
  clientAccountId?: string;
  status?: ConversationStatus;
  hasUnread?: boolean;
  limit?: number;
  offset?: number;
}

export interface IConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByPlatformId(clientAccountId: string, platformConversationId: string): Promise<Conversation | null>;
  findByClientAccount(clientAccountId: string, options?: FindConversationsOptions): Promise<Conversation[]>;
  create(conversation: Conversation): Promise<Conversation>;
  update(conversation: Conversation): Promise<Conversation>;

  // Aggregate methods
  countUnread(clientAccountId: string): Promise<number>;
  findStaleConversations(days: number): Promise<Conversation[]>;
}
```

### Message Repository Interface

```typescript
// File: /backend/src/domain/repositories/message.repository.interface.ts

import { Message, MessageType } from '../entities/message.entity';

export interface FindMessagesOptions {
  conversationId?: string;
  messageType?: MessageType;
  isRead?: boolean;
  afterDate?: Date;
  beforeDate?: Date;
  limit?: number;
  offset?: number;
}

export interface IMessageRepository {
  findById(id: string): Promise<Message | null>;
  findByConversation(conversationId: string, options?: FindMessagesOptions): Promise<Message[]>;
  findByPlatformId(platformMessageId: string): Promise<Message | null>;
  create(message: Message): Promise<Message>;
  update(message: Message): Promise<Message>;
  bulkMarkAsRead(messageIds: string[]): Promise<void>;

  // Search and analytics
  searchInContent(searchTerm: string, conversationId?: string): Promise<Message[]>;
  countUnreadByConversation(conversationId: string): Promise<number>;
}
```

---

## Exception Classes

```typescript
// File: /backend/src/domain/exceptions/domain.exception.ts

export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
  }
}

// File: /backend/src/domain/exceptions/validation.exception.ts

export class ValidationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationException';
  }
}

// File: /backend/src/domain/exceptions/not-found.exception.ts

export class NotFoundException extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`);
    this.name = 'NotFoundException';
  }
}
```

---

## Acceptance Criteria

- [ ] All entity classes implemented with validation
- [ ] Business logic encapsulated in entity methods
- [ ] Value objects created for Email and Money
- [ ] Repository interfaces defined for all entities
- [ ] Factory methods (create, reconstitute) working
- [ ] Entity validation throws appropriate exceptions
- [ ] toJSON methods return proper serialization
- [ ] Immutability enforced for value objects
- [ ] Domain exceptions properly typed
- [ ] All entities have proper TypeScript typing
- [ ] No infrastructure dependencies in domain layer
- [ ] Entity business rules tested

---

## Testing Procedure

```typescript
// File: /backend/src/domain/entities/__tests__/user.entity.spec.ts

import { User } from '../user.entity';
import { Email } from '../../value-objects/email.vo';
import { SubscriptionTier } from '../user.entity';

describe('User Entity', () => {
  it('should create a new user', () => {
    const user = User.create({
      email: new Email('test@example.com'),
      passwordHash: 'hashed',
      name: 'Test User',
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
      subscriptionTier: SubscriptionTier.FREE,
      emailVerified: false,
    });

    expect(user.id).toBeDefined();
    expect(user.email.value).toBe('test@example.com');
    expect(user.name).toBe('Test User');
  });

  it('should verify email', () => {
    const user = User.create({
      email: new Email('test@example.com'),
      passwordHash: 'hashed',
      name: 'Test User',
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
      subscriptionTier: SubscriptionTier.FREE,
      emailVerified: false,
      emailVerificationToken: 'token123',
    });

    expect(user.emailVerified).toBe(false);

    user.verifyEmail();

    expect(user.emailVerified).toBe(true);
  });

  it('should upgrade subscription tier', () => {
    const user = User.create({
      email: new Email('test@example.com'),
      passwordHash: 'hashed',
      name: 'Test User',
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
      subscriptionTier: SubscriptionTier.FREE,
      emailVerified: false,
    });

    user.upgradeTier(SubscriptionTier.PRO);

    expect(user.subscriptionTier).toBe(SubscriptionTier.PRO);
  });

  it('should throw error when downgrading tier', () => {
    const user = User.create({
      email: new Email('test@example.com'),
      passwordHash: 'hashed',
      name: 'Test User',
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
      subscriptionTier: SubscriptionTier.PRO,
      emailVerified: false,
    });

    expect(() => {
      user.upgradeTier(SubscriptionTier.FREE);
    }).toThrow();
  });
});

// Run tests
npm run test:domain
```

---

## Files to Create

```
/backend/src/domain/
├── entities/
│   ├── user.entity.ts
│   ├── client-account.entity.ts
│   ├── oauth-token.entity.ts
│   ├── product.entity.ts
│   ├── product-link.entity.ts
│   ├── conversation.entity.ts
│   ├── message.entity.ts
│   ├── analytics-event.entity.ts
│   ├── instagram-media.entity.ts
│   ├── notification.entity.ts
│   └── __tests__/
│       ├── user.entity.spec.ts
│       ├── product.entity.spec.ts
│       ├── message.entity.spec.ts
│       └── conversation.entity.spec.ts
├── repositories/
│   ├── user.repository.interface.ts
│   ├── client-account.repository.interface.ts
│   ├── oauth-token.repository.interface.ts
│   ├── product.repository.interface.ts
│   ├── conversation.repository.interface.ts
│   ├── message.repository.interface.ts
│   ├── analytics.repository.interface.ts
│   └── notification.repository.interface.ts
├── value-objects/
│   ├── email.vo.ts
│   ├── money.vo.ts
│   ├── date-range.vo.ts
│   └── __tests__/
│       ├── email.vo.spec.ts
│       └── money.vo.spec.ts
└── exceptions/
    ├── domain.exception.ts
    ├── validation.exception.ts
    └── not-found.exception.ts
```

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer
