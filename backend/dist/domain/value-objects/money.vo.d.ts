export declare class Money {
    private readonly _amount;
    private readonly _currency;
    constructor(amount: number, currency?: string);
    private validateAmount;
    private validateCurrency;
    get amount(): number;
    get currency(): string;
    add(other: Money): Money;
    subtract(other: Money): Money;
    multiply(factor: number): Money;
    equals(other: Money): boolean;
    greaterThan(other: Money): boolean;
    format(): string;
    toJSON(): {
        amount: number;
        currency: string;
    };
}
