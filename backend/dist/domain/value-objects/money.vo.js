"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
const validation_exception_1 = require("../exceptions/validation.exception");
class Money {
    constructor(amount, currency = 'BRL') {
        this._amount = this.validateAmount(amount);
        this._currency = this.validateCurrency(currency);
    }
    validateAmount(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            throw new validation_exception_1.ValidationException('Amount must be a valid number');
        }
        if (amount < 0) {
            throw new validation_exception_1.ValidationException('Amount cannot be negative');
        }
        return Math.round(amount * 100) / 100;
    }
    validateCurrency(currency) {
        const validCurrencies = ['BRL', 'USD', 'EUR'];
        const upper = currency.toUpperCase();
        if (!validCurrencies.includes(upper)) {
            throw new validation_exception_1.ValidationException(`Invalid currency: ${currency}`);
        }
        return upper;
    }
    get amount() {
        return this._amount;
    }
    get currency() {
        return this._currency;
    }
    add(other) {
        if (this._currency !== other._currency) {
            throw new validation_exception_1.ValidationException('Cannot add money with different currencies');
        }
        return new Money(this._amount + other._amount, this._currency);
    }
    subtract(other) {
        if (this._currency !== other._currency) {
            throw new validation_exception_1.ValidationException('Cannot subtract money with different currencies');
        }
        return new Money(this._amount - other._amount, this._currency);
    }
    multiply(factor) {
        return new Money(this._amount * factor, this._currency);
    }
    equals(other) {
        return this._amount === other._amount && this._currency === other._currency;
    }
    greaterThan(other) {
        if (this._currency !== other._currency) {
            throw new validation_exception_1.ValidationException('Cannot compare money with different currencies');
        }
        return this._amount > other._amount;
    }
    format() {
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
exports.Money = Money;
//# sourceMappingURL=money.vo.js.map