import { Money } from '../value-objects/money.vo';
export interface ProductImage {
    url: string;
    alt?: string;
    order: number;
}
export interface ProductProps {
    id: string;
    userId: string;
    name: string;
    description?: string;
    price: Money;
    category?: string;
    tags: string[];
    images: ProductImage[];
    stockQuantity?: number;
    sku?: string;
    isAvailable: boolean;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
export declare class Product {
    private props;
    private constructor();
    static create(props: Omit<ProductProps, 'id' | 'createdAt' | 'updatedAt'>): Product;
    static reconstitute(props: ProductProps): Product;
    private validate;
    get id(): string;
    get userId(): string;
    get name(): string;
    get price(): Money;
    get isAvailable(): boolean;
    get hasStock(): boolean;
    updatePrice(newPrice: Money): void;
    addTag(tag: string): void;
    removeTag(tag: string): void;
    addImage(image: ProductImage): void;
    decrementStock(quantity?: number): void;
    incrementStock(quantity?: number): void;
    makeAvailable(): void;
    makeUnavailable(): void;
    softDelete(): void;
    toJSON(): {
        id: string;
        userId: string;
        name: string;
        description: string | undefined;
        price: {
            amount: number;
            currency: string;
        };
        category: string | undefined;
        tags: string[];
        images: ProductImage[];
        stockQuantity: number | undefined;
        sku: string | undefined;
        isAvailable: boolean;
        metadata: Record<string, unknown>;
        createdAt: Date;
        updatedAt: Date;
    };
}
