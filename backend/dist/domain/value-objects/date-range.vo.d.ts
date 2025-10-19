export declare class DateRange {
    private readonly _startDate;
    private readonly _endDate;
    constructor(startDate: Date, endDate: Date);
    private validate;
    get startDate(): Date;
    get endDate(): Date;
    get durationInDays(): number;
    contains(date: Date): boolean;
    overlaps(other: DateRange): boolean;
    equals(other: DateRange): boolean;
    toJSON(): {
        startDate: string;
        endDate: string;
        durationInDays: number;
    };
}
