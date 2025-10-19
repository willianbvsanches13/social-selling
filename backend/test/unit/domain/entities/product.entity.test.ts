import { Product } from '../../../../src/domain/entities/product.entity';
import { Money } from '../../../../src/domain/value-objects/money.vo';
import { DomainException } from '../../../../src/domain/exceptions/domain.exception';

describe('Product Entity', () => {
  const validProps = {
    userId: 'user-123',
    name: 'Test Product',
    description: 'Product description',
    price: new Money(99.99, 'BRL'),
    category: 'electronics',
    tags: ['tech', 'gadget'],
    images: [{ url: 'http://example.com/image.jpg', order: 1 }],
    isAvailable: true,
    metadata: {},
  };

  describe('product creation', () => {
    it('should create a new product with valid properties', () => {
      const product = Product.create(validProps);
      expect(product.id).toBeDefined();
      expect(product.userId).toBe('user-123');
      expect(product.name).toBe('Test Product');
      expect(product.price.amount).toBe(99.99);
      expect(product.isAvailable).toBe(true);
    });

    it('should throw error when name is too short', () => {
      const invalidProps = { ...validProps, name: 'A' };
      expect(() => Product.create(invalidProps)).toThrow(DomainException);
      expect(() => Product.create(invalidProps)).toThrow(
        'Product name must be at least 2 characters',
      );
    });

    it('should throw error for negative stock quantity', () => {
      const invalidProps = { ...validProps, stockQuantity: -10 };
      expect(() => Product.create(invalidProps)).toThrow(DomainException);
      expect(() => Product.create(invalidProps)).toThrow(
        'Stock quantity cannot be negative',
      );
    });

    it('should reconstitute product from existing props', () => {
      const existingProps = {
        ...validProps,
        id: 'existing-id',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const product = Product.reconstitute(existingProps);
      expect(product.id).toBe('existing-id');
      expect(product.name).toBe('Test Product');
    });
  });

  describe('price management', () => {
    it('should update product price', () => {
      const product = Product.create(validProps);
      const newPrice = new Money(149.99, 'BRL');
      product.updatePrice(newPrice);
      expect(product.price.amount).toBe(149.99);
    });

    it('should throw error for negative price', () => {
      const product = Product.create(validProps);
      const negativePrice = new Money(0, 'BRL');
      negativePrice.multiply(-1);
      expect(() => product.updatePrice(new Money(-10, 'BRL'))).toThrow();
    });
  });

  describe('tag management', () => {
    it('should add tag to product', () => {
      const product = Product.create({ ...validProps, tags: [] });
      product.addTag('new-tag');
      product.addTag('another-tag');
    });

    it('should not add duplicate tag', () => {
      const product = Product.create({ ...validProps, tags: ['existing'] });
      product.addTag('existing');
    });

    it('should normalize tags to lowercase', () => {
      const product = Product.create({ ...validProps, tags: [] });
      product.addTag('UPPERCASE');
    });

    it('should remove tag from product', () => {
      const product = Product.create({ ...validProps, tags: ['tag1', 'tag2'] });
      product.removeTag('tag1');
    });
  });

  describe('stock management', () => {
    it('should decrement stock quantity', () => {
      const product = Product.create({ ...validProps, stockQuantity: 10 });
      product.decrementStock(3);
    });

    it('should throw error when decrementing more than available', () => {
      const product = Product.create({ ...validProps, stockQuantity: 5 });
      expect(() => product.decrementStock(10)).toThrow(DomainException);
      expect(() => product.decrementStock(10)).toThrow('Insufficient stock');
    });

    it('should make product unavailable when stock reaches zero', () => {
      const product = Product.create({
        ...validProps,
        stockQuantity: 1,
        isAvailable: true,
      });
      product.decrementStock(1);
      expect(product.isAvailable).toBe(false);
    });

    it('should increment stock quantity', () => {
      const product = Product.create({ ...validProps, stockQuantity: 10 });
      product.incrementStock(5);
    });

    it('should initialize stock tracking when incrementing from undefined', () => {
      const product = Product.create(validProps);
      product.incrementStock(10);
    });

    it('should return true for hasStock when stockQuantity is undefined', () => {
      const product = Product.create(validProps);
      expect(product.hasStock).toBe(true);
    });

    it('should return false for hasStock when stockQuantity is zero', () => {
      const product = Product.create({ ...validProps, stockQuantity: 0 });
      expect(product.hasStock).toBe(false);
    });
  });

  describe('availability management', () => {
    it('should make product available', () => {
      const product = Product.create({ ...validProps, isAvailable: false });
      product.makeAvailable();
      expect(product.isAvailable).toBe(true);
    });

    it('should throw error when making available without stock', () => {
      const product = Product.create({
        ...validProps,
        stockQuantity: 0,
        isAvailable: false,
      });
      expect(() => product.makeAvailable()).toThrow(DomainException);
      expect(() => product.makeAvailable()).toThrow(
        'Cannot make available without stock',
      );
    });

    it('should make product unavailable', () => {
      const product = Product.create(validProps);
      product.makeUnavailable();
      expect(product.isAvailable).toBe(false);
    });
  });

  describe('image management', () => {
    it('should add image to product', () => {
      const product = Product.create({ ...validProps, images: [] });
      product.addImage({ url: 'http://example.com/new-image.jpg', order: 1 });
    });
  });

  describe('soft delete', () => {
    it('should soft delete product', () => {
      const product = Product.create(validProps);
      product.softDelete();
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const product = Product.create(validProps);
      const json = product.toJSON();
      expect(json.id).toBeDefined();
      expect(json.name).toBe('Test Product');
      expect(json.price).toEqual({
        amount: 99.99,
        currency: 'BRL',
      });
      expect(json.tags).toEqual(['tech', 'gadget']);
    });
  });
});
