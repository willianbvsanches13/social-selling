"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationException = void 0;
class ValidationException extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationException';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ValidationException = ValidationException;
//# sourceMappingURL=validation.exception.js.map