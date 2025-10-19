import { Email } from '../../../../src/domain/value-objects/email.vo';
import { ValidationException } from '../../../../src/domain/exceptions/validation.exception';

describe('Email Value Object', () => {
  describe('valid email creation', () => {
    it('should create email with valid format', () => {
      const email = new Email('test@example.com');
      expect(email.value).toBe('test@example.com');
    });

    it('should trim and lowercase email', () => {
      const email = new Email('  TEST@EXAMPLE.COM  ');
      expect(email.value).toBe('test@example.com');
    });

    it('should accept email with subdomain', () => {
      const email = new Email('user@mail.example.com');
      expect(email.value).toBe('user@mail.example.com');
    });

    it('should accept email with plus sign', () => {
      const email = new Email('user+tag@example.com');
      expect(email.value).toBe('user+tag@example.com');
    });
  });

  describe('invalid email validation', () => {
    it('should throw error for email without @', () => {
      expect(() => new Email('invalid.email.com')).toThrow(ValidationException);
      expect(() => new Email('invalid.email.com')).toThrow('Invalid email format');
    });

    it('should throw error for email without domain', () => {
      expect(() => new Email('test@')).toThrow(ValidationException);
    });

    it('should throw error for email without local part', () => {
      expect(() => new Email('@example.com')).toThrow(ValidationException);
    });

    it('should throw error for empty string', () => {
      expect(() => new Email('')).toThrow(ValidationException);
    });

    it('should throw error for email with spaces', () => {
      expect(() => new Email('test @example.com')).toThrow(ValidationException);
    });
  });

  describe('equality and comparison', () => {
    it('should return true when emails are equal', () => {
      const email1 = new Email('test@example.com');
      const email2 = new Email('test@example.com');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false when emails are different', () => {
      const email1 = new Email('test1@example.com');
      const email2 = new Email('test2@example.com');
      expect(email1.equals(email2)).toBe(false);
    });

    it('should return true when emails differ only in case', () => {
      const email1 = new Email('TEST@EXAMPLE.COM');
      const email2 = new Email('test@example.com');
      expect(email1.equals(email2)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return email value as string', () => {
      const email = new Email('test@example.com');
      expect(email.toString()).toBe('test@example.com');
    });
  });
});
