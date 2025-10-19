"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const domain_exception_1 = require("../exceptions/domain.exception");
class Product {
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
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
    static reconstitute(props) {
        return new Product(props);
    }
    validate() {
        if (!this.props.name || this.props.name.trim().length < 2) {
            throw new domain_exception_1.DomainException('Product name must be at least 2 characters');
        }
        if (this.props.stockQuantity !== undefined && this.props.stockQuantity < 0) {
            throw new domain_exception_1.DomainException('Stock quantity cannot be negative');
        }
    }
    get id() {
        return this.props.id;
    }
    get userId() {
        return this.props.userId;
    }
    get name() {
        return this.props.name;
    }
    get price() {
        return this.props.price;
    }
    get isAvailable() {
        return this.props.isAvailable;
    }
    get hasStock() {
        if (this.props.stockQuantity === undefined) {
            return true;
        }
        return this.props.stockQuantity > 0;
    }
    updatePrice(newPrice) {
        if (newPrice.amount < 0) {
            throw new domain_exception_1.DomainException('Price cannot be negative');
        }
        this.props.price = newPrice;
        this.props.updatedAt = new Date();
    }
    addTag(tag) {
        const normalizedTag = tag.trim().toLowerCase();
        if (!this.props.tags.includes(normalizedTag)) {
            this.props.tags.push(normalizedTag);
            this.props.updatedAt = new Date();
        }
    }
    removeTag(tag) {
        const normalizedTag = tag.trim().toLowerCase();
        this.props.tags = this.props.tags.filter(t => t !== normalizedTag);
        this.props.updatedAt = new Date();
    }
    addImage(image) {
        this.props.images.push(image);
        this.props.updatedAt = new Date();
    }
    decrementStock(quantity = 1) {
        if (this.props.stockQuantity === undefined) {
            return;
        }
        if (quantity <= 0) {
            throw new domain_exception_1.DomainException('Quantity must be positive');
        }
        if (this.props.stockQuantity < quantity) {
            throw new domain_exception_1.DomainException('Insufficient stock');
        }
        this.props.stockQuantity -= quantity;
        this.props.updatedAt = new Date();
        if (this.props.stockQuantity === 0) {
            this.makeUnavailable();
        }
    }
    incrementStock(quantity = 1) {
        if (this.props.stockQuantity === undefined) {
            this.props.stockQuantity = quantity;
        }
        else {
            this.props.stockQuantity += quantity;
        }
        this.props.updatedAt = new Date();
    }
    makeAvailable() {
        if (!this.hasStock && this.props.stockQuantity !== undefined) {
            throw new domain_exception_1.DomainException('Cannot make available without stock');
        }
        this.props.isAvailable = true;
        this.props.updatedAt = new Date();
    }
    makeUnavailable() {
        this.props.isAvailable = false;
        this.props.updatedAt = new Date();
    }
    softDelete() {
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
exports.Product = Product;
//# sourceMappingURL=product.entity.js.map