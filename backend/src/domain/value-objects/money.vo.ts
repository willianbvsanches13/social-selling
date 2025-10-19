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
      throw new ValidationException(
        'Cannot add money with different currencies',
      );
    }
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new ValidationException(
        'Cannot subtract money with different currencies',
      );
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
      throw new ValidationException(
        'Cannot compare money with different currencies',
      );
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
