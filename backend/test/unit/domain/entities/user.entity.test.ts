import {
  User,
  SubscriptionTier,
} from '../../../../src/domain/entities/user.entity';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { DomainException } from '../../../../src/domain/exceptions/domain.exception';

describe('User Entity', () => {
  const validProps = {
    email: new Email('test@example.com'),
    passwordHash: 'hashed_password',
    name: 'Test User',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    subscriptionTier: SubscriptionTier.FREE,
    emailVerified: false,
  };

  describe('user creation', () => {
    it('should create a new user with valid properties', () => {
      const user = User.create(validProps);
      expect(user.id).toBeDefined();
      expect(user.email.value).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.subscriptionTier).toBe(SubscriptionTier.FREE);
      expect(user.emailVerified).toBe(false);
    });

    it('should throw error when name is too short', () => {
      const invalidProps = { ...validProps, name: 'A' };
      expect(() => User.create(invalidProps)).toThrow(DomainException);
      expect(() => User.create(invalidProps)).toThrow(
        'User name must be at least 2 characters',
      );
    });

    it('should throw error when password hash is missing', () => {
      const invalidProps = { ...validProps, passwordHash: '' };
      expect(() => User.create(invalidProps)).toThrow(DomainException);
      expect(() => User.create(invalidProps)).toThrow(
        'Password hash is required',
      );
    });

    it('should reconstitute user from existing props', () => {
      const existingProps = {
        ...validProps,
        id: 'existing-id',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const user = User.reconstitute(existingProps);
      expect(user.id).toBe('existing-id');
      expect(user.name).toBe('Test User');
    });
  });

  describe('email verification', () => {
    it('should verify email', () => {
      const user = User.create({
        ...validProps,
        emailVerificationToken: 'token123',
      });
      expect(user.emailVerified).toBe(false);
      user.verifyEmail();
      expect(user.emailVerified).toBe(true);
    });
  });

  describe('subscription tier management', () => {
    it('should upgrade subscription tier', () => {
      const user = User.create(validProps);
      user.upgradeTier(SubscriptionTier.PRO);
      expect(user.subscriptionTier).toBe(SubscriptionTier.PRO);
    });

    it('should throw error when downgrading tier', () => {
      const user = User.create({
        ...validProps,
        subscriptionTier: SubscriptionTier.PRO,
      });
      expect(() => user.upgradeTier(SubscriptionTier.FREE)).toThrow(
        DomainException,
      );
      expect(() => user.upgradeTier(SubscriptionTier.FREE)).toThrow(
        'Cannot downgrade or upgrade to same tier',
      );
    });

    it('should throw error when upgrading to same tier', () => {
      const user = User.create(validProps);
      expect(() => user.upgradeTier(SubscriptionTier.FREE)).toThrow(
        DomainException,
      );
    });
  });

  describe('password reset', () => {
    it('should set password reset token with expiration', () => {
      const user = User.create(validProps);
      user.setPasswordResetToken('reset_token_123', 60);
      expect(user.isPasswordResetTokenValid()).toBe(true);
    });

    it('should return false for invalid token when no token set', () => {
      const user = User.create(validProps);
      expect(user.isPasswordResetTokenValid()).toBe(false);
    });
  });

  describe('last login tracking', () => {
    it('should update last login with IP', () => {
      const user = User.create(validProps);
      user.updateLastLogin('192.168.1.1');
    });
  });

  describe('soft delete', () => {
    it('should soft delete user', () => {
      const user = User.create(validProps);
      expect(user.isDeleted).toBe(false);
      user.softDelete();
      expect(user.isDeleted).toBe(true);
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON without sensitive data', () => {
      const user = User.create(validProps);
      const json = user.toJSON();
      expect(json.id).toBeDefined();
      expect(json.email).toBe('test@example.com');
      expect(json.name).toBe('Test User');
      expect(json).not.toHaveProperty('passwordHash');
      expect(json).not.toHaveProperty('passwordResetToken');
    });
  });
});
