"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateRange = void 0;
const validation_exception_1 = require("../exceptions/validation.exception");
class DateRange {
    constructor(startDate, endDate) {
        this._startDate = startDate;
        this._endDate = endDate;
        this.validate();
    }
    validate() {
        if (this._startDate > this._endDate) {
            throw new validation_exception_1.ValidationException('Start date must be before end date');
        }
    }
    get startDate() {
        return this._startDate;
    }
    get endDate() {
        return this._endDate;
    }
    get durationInDays() {
        const diff = this._endDate.getTime() - this._startDate.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
    contains(date) {
        return date >= this._startDate && date <= this._endDate;
    }
    overlaps(other) {
        return this._startDate <= other._endDate && this._endDate >= other._startDate;
    }
    equals(other) {
        return (this._startDate.getTime() === other._startDate.getTime() &&
            this._endDate.getTime() === other._endDate.getTime());
    }
    toJSON() {
        return {
            startDate: this._startDate.toISOString(),
            endDate: this._endDate.toISOString(),
            durationInDays: this.durationInDays,
        };
    }
}
exports.DateRange = DateRange;
//# sourceMappingURL=date-range.vo.js.map