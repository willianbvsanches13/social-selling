"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Email = void 0;
const validation_exception_1 = require("../exceptions/validation.exception");
class Email {
    constructor(email) {
        this._value = this.validate(email);
    }
    validate(email) {
        const trimmed = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            throw new validation_exception_1.ValidationException('Invalid email format');
        }
        return trimmed;
    }
    get value() {
        return this._value;
    }
    equals(other) {
        return this._value === other._value;
    }
    toString() {
        return this._value;
    }
}
exports.Email = Email;
//# sourceMappingURL=email.vo.js.map