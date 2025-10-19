export declare class Email {
    private readonly _value;
    constructor(email: string);
    private validate;
    get value(): string;
    equals(other: Email): boolean;
    toString(): string;
}
