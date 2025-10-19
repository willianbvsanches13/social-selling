import { Money } from '../../../../src/domain/value-objects/money.vo';
import { ValidationException } from '../../../../src/domain/exceptions/validation.exception';

describe('Money Value Object', () => {
  describe('valid money creation', () => {
    it('should create money with valid amount and currency', () => {
      const money = new Money(100.50, 'BRL');
      expect(money.amount).toBe(100.50);
      expect(money.currency).toBe('BRL');
    });

    it('should default to BRL currency', () => {
      const money = new Money(100);
      expect(money.currency).toBe('BRL');
    });

    it('should round amount to 2 decimal places', () => {
      const money = new Money(100.456, 'USD');
      expect(money.amount).toBe(100.46);
    });

    it('should accept zero amount', () => {
      const money = new Money(0, 'EUR');
      expect(money.amount).toBe(0);
    });
  });

  describe('invalid money validation', () => {
    it('should throw error for negative amount', () => {
      expect(() => new Money(-100, 'BRL')).toThrow(ValidationException);
      expect(() => new Money(-100, 'BRL')).toThrow('Amount cannot be negative');
    });

    it('should throw error for invalid currency', () => {
      expect(() => new Money(100, 'INVALID')).toThrow(ValidationException);
      expect(() => new Money(100, 'INVALID')).toThrow('Invalid currency');
    });

    it('should throw error for NaN amount', () => {
      expect(() => new Money(NaN, 'BRL')).toThrow(ValidationException);
      expect(() => new Money(NaN, 'BRL')).toThrow('Amount must be a valid number');
    });
  });

  describe('arithmetic operations', () => {
    it('should add two money values with same currency', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(50, 'BRL');
      const result = money1.add(money2);
      expect(result.amount).toBe(150);
      expect(result.currency).toBe('BRL');
    });

    it('should throw error when adding different currencies', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(50, 'USD');
      expect(() => money1.add(money2)).toThrow(ValidationException);
      expect(() => money1.add(money2)).toThrow('Cannot add money with different currencies');
    });

    it('should subtract two money values with same currency', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(30, 'BRL');
      const result = money1.subtract(money2);
      expect(result.amount).toBe(70);
    });

    it('should throw error when subtracting different currencies', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(30, 'USD');
      expect(() => money1.subtract(money2)).toThrow(ValidationException);
    });

    it('should multiply money by factor', () => {
      const money = new Money(100, 'BRL');
      const result = money.multiply(2.5);
      expect(result.amount).toBe(250);
      expect(result.currency).toBe('BRL');
    });
  });

  describe('comparison operations', () => {
    it('should return true when money values are equal', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(100, 'BRL');
      expect(money1.equals(money2)).toBe(true);
    });

    it('should return false when amounts are different', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(200, 'BRL');
      expect(money1.equals(money2)).toBe(false);
    });

    it('should return false when currencies are different', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(100, 'USD');
      expect(money1.equals(money2)).toBe(false);
    });

    it('should return true when first value is greater', () => {
      const money1 = new Money(200, 'BRL');
      const money2 = new Money(100, 'BRL');
      expect(money1.greaterThan(money2)).toBe(true);
    });

    it('should return false when first value is not greater', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(200, 'BRL');
      expect(money1.greaterThan(money2)).toBe(false);
    });

    it('should throw error when comparing different currencies', () => {
      const money1 = new Money(100, 'BRL');
      const money2 = new Money(100, 'USD');
      expect(() => money1.greaterThan(money2)).toThrow(ValidationException);
    });
  });

  describe('formatting', () => {
    it('should format BRL currency', () => {
      const money = new Money(1234.56, 'BRL');
      const formatted = money.format();
      expect(formatted).toContain('1');
      expect(formatted).toContain('234');
      expect(formatted).toContain('56');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const money = new Money(100.50, 'USD');
      const json = money.toJSON();
      expect(json).toEqual({
        amount: 100.50,
        currency: 'USD',
      });
    });
  });
});
