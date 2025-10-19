import { Product } from '../entities/product.entity';
export interface FindProductsOptions {
    userId?: string;
    category?: string;
    isAvailable?: boolean;
    searchTerm?: string;
    tags?: string[];
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
}
export interface IProductRepository {
    findById(id: string): Promise<Product | null>;
    findByUserId(userId: string, options?: FindProductsOptions): Promise<Product[]>;
    findByCategory(category: string, options?: FindProductsOptions): Promise<Product[]>;
    search(options: FindProductsOptions): Promise<{
        products: Product[];
        total: number;
    }>;
    create(product: Product): Promise<Product>;
    update(product: Product): Promise<Product>;
    delete(id: string): Promise<void>;
    countByUser(userId: string): Promise<number>;
    getMostViewedProducts(userId: string, limit: number): Promise<Product[]>;
}
