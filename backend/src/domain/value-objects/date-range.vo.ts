import { ValidationException } from '../exceptions/validation.exception';

export class DateRange {
  private readonly _startDate: Date;
  private readonly _endDate: Date;

  constructor(startDate: Date, endDate: Date) {
    this._startDate = startDate;
    this._endDate = endDate;
    this.validate();
  }

  private validate(): void {
    if (this._startDate > this._endDate) {
      throw new ValidationException('Start date must be before end date');
    }
  }

  get startDate(): Date {
    return this._startDate;
  }

  get endDate(): Date {
    return this._endDate;
  }

  get durationInDays(): number {
    const diff = this._endDate.getTime() - this._startDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  contains(date: Date): boolean {
    return date >= this._startDate && date <= this._endDate;
  }

  overlaps(other: DateRange): boolean {
    return (
      this._startDate <= other._endDate && this._endDate >= other._startDate
    );
  }

  equals(other: DateRange): boolean {
    return (
      this._startDate.getTime() === other._startDate.getTime() &&
      this._endDate.getTime() === other._endDate.getTime()
    );
  }

  toJSON() {
    return {
      startDate: this._startDate.toISOString(),
      endDate: this._endDate.toISOString(),
      durationInDays: this.durationInDays,
    };
  }
}
