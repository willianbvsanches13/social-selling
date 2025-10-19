import { Money } from '../value-objects/money.vo';
import { DomainException } from '../exceptions/domain.exception';

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

export class Product {
  private props: ProductProps;

  private constructor(props: ProductProps) {
    this.props = props;
    this.validate();
  }

  static create(
    props: Omit<ProductProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): Product {
    return new Product({
      ...props,
      id: crypto.randomUUID(),
      tags: props.tags || [],
      images: props.images || [],
      metadata: props.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: ProductProps): Product {
    return new Product(props);
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length < 2) {
      throw new DomainException('Product name must be at least 2 characters');
    }
    if (
      this.props.stockQuantity !== undefined &&
      this.props.stockQuantity < 0
    ) {
      throw new DomainException('Stock quantity cannot be negative');
    }
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get price(): Money {
    return this.props.price;
  }

  get isAvailable(): boolean {
    return this.props.isAvailable;
  }

  get hasStock(): boolean {
    if (this.props.stockQuantity === undefined) {
      return true;
    }
    return this.props.stockQuantity > 0;
  }

  updatePrice(newPrice: Money): void {
    if (newPrice.amount < 0) {
      throw new DomainException('Price cannot be negative');
    }
    this.props.price = newPrice;
    this.props.updatedAt = new Date();
  }

  addTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    if (!this.props.tags.includes(normalizedTag)) {
      this.props.tags.push(normalizedTag);
      this.props.updatedAt = new Date();
    }
  }

  removeTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    this.props.tags = this.props.tags.filter((t) => t !== normalizedTag);
    this.props.updatedAt = new Date();
  }

  addImage(image: ProductImage): void {
    this.props.images.push(image);
    this.props.updatedAt = new Date();
  }

  decrementStock(quantity: number = 1): void {
    if (this.props.stockQuantity === undefined) {
      return;
    }
    if (quantity <= 0) {
      throw new DomainException('Quantity must be positive');
    }
    if (this.props.stockQuantity < quantity) {
      throw new DomainException('Insufficient stock');
    }
    this.props.stockQuantity -= quantity;
    this.props.updatedAt = new Date();
    if (this.props.stockQuantity === 0) {
      this.makeUnavailable();
    }
  }

  incrementStock(quantity: number = 1): void {
    if (this.props.stockQuantity === undefined) {
      this.props.stockQuantity = quantity;
    } else {
      this.props.stockQuantity += quantity;
    }
    this.props.updatedAt = new Date();
  }

  makeAvailable(): void {
    if (!this.hasStock && this.props.stockQuantity !== undefined) {
      throw new DomainException('Cannot make available without stock');
    }
    this.props.isAvailable = true;
    this.props.updatedAt = new Date();
  }

  makeUnavailable(): void {
    this.props.isAvailable = false;
    this.props.updatedAt = new Date();
  }

  softDelete(): void {
    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      name: this.props.name,
      description: this.props.description,
      price: {
        amount: this.props.price.amount,
        currency: this.props.price.currency,
      },
      category: this.props.category,
      tags: this.props.tags,
      images: this.props.images,
      stockQuantity: this.props.stockQuantity,
      sku: this.props.sku,
      isAvailable: this.props.isAvailable,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
