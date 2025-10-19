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
