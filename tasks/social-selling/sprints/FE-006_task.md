# FE-006: Product Catalog Management

**Epic:** Frontend Development - Social Selling Platform
**Sprint:** Sprint 4 - Product Management
**Story Points:** 13
**Priority:** High
**Assigned To:** Frontend Team
**Status:** Ready for Development
**Dependencies:** FE-001, FE-002, FE-003

## Overview

Create a comprehensive product catalog management system with grid/table views, create/edit modals, image upload, search and filters, pagination, bulk actions, and product categories. This enables users to manage their product inventory effectively.

## Technical Requirements

### Features
- Product list with grid and table views
- Create new product modal
- Edit product modal
- Product card component
- Multi-image upload to backend
- Product search and filters
- Pagination with page size selector
- Bulk actions (delete, export)
- Product categories management
- Stock status indicators
- Price formatting
- Product status (active, draft, archived)

## Implementation Details

### 1. Product Types

#### src/types/product.ts
```typescript
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku?: string;
  barcode?: string;
  quantity: number;
  lowStockThreshold?: number;
  images: ProductImage[];
  categoryId?: string;
  category?: Category;
  status: 'active' | 'draft' | 'archived';
  tags: string[];
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  options: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  productCount: number;
  createdAt: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku?: string;
  barcode?: string;
  quantity: number;
  lowStockThreshold?: number;
  categoryId?: string;
  status: 'active' | 'draft';
  tags: string[];
  images: string[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  status?: 'active' | 'draft' | 'archived';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  perPage?: number;
  sortBy?: 'name' | 'price' | 'quantity' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
```

### 2. Products API Service

#### src/lib/services/products.service.ts
```typescript
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  Product,
  Category,
  CreateProductRequest,
  UpdateProductRequest,
  ProductFilters,
} from '@/types/product';
import type { PaginatedResponse } from '@/types/common';

export const productsService = {
  async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const response = await apiClient.get<PaginatedResponse<Product>>(
      API_ENDPOINTS.PRODUCTS,
      { params: filters }
    );
    return response.data!;
  },

  async getProduct(id: string): Promise<Product> {
    const response = await apiClient.get<Product>(API_ENDPOINTS.PRODUCT_DETAIL(id));
    return response.data!;
  },

  async createProduct(data: CreateProductRequest): Promise<Product> {
    const response = await apiClient.post<Product>(API_ENDPOINTS.PRODUCTS, data);
    return response.data!;
  },

  async updateProduct(data: UpdateProductRequest): Promise<Product> {
    const { id, ...updateData } = data;
    const response = await apiClient.put<Product>(
      API_ENDPOINTS.PRODUCT_DETAIL(id),
      updateData
    );
    return response.data!;
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.PRODUCT_DETAIL(id));
  },

  async deleteProducts(ids: string[]): Promise<void> {
    await apiClient.post(`${API_ENDPOINTS.PRODUCTS}/bulk-delete`, { ids });
  },

  async uploadImage(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.upload<{ url: string }>(
      API_ENDPOINTS.PRODUCT_UPLOAD_IMAGE,
      formData,
      onProgress
    );
    return response.data!.url;
  },

  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<Category[]>('/products/categories');
    return response.data || [];
  },

  async createCategory(name: string, description?: string): Promise<Category> {
    const response = await apiClient.post<Category>('/products/categories', {
      name,
      description,
    });
    return response.data!;
  },

  async exportProducts(filters?: ProductFilters): Promise<Blob> {
    const response = await apiClient.get(`${API_ENDPOINTS.PRODUCTS}/export`, {
      params: filters,
      responseType: 'blob',
    });
    return response.data as any;
  },
};
```

### 3. Products Page

#### src/app/(dashboard)/products/page.tsx
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Grid3x3,
  List,
  Search,
  Filter,
  Download,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductTable } from '@/components/products/ProductTable';
import { ProductModal } from '@/components/products/ProductModal';
import { ProductFilters as FiltersPanel } from '@/components/products/ProductFilters';
import { productsService } from '@/lib/services/products.service';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils/cn';
import type { Product, ProductFilters } from '@/types/product';

export default function ProductsPage() {
  const { success, error: showError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    page: 1,
    perPage: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await productsService.getProducts(filters);
      setProducts(response.data);
      setTotal(response.pagination.total);
    } catch (err: any) {
      showError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      await productsService.deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      success('Product deleted successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to delete product');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;

    if (!confirm(`Delete ${selectedProducts.size} selected products?`)) {
      return;
    }

    try {
      await productsService.deleteProducts(Array.from(selectedProducts));
      setProducts((prev) => prev.filter((p) => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
      success(`${selectedProducts.size} products deleted`);
    } catch (err: any) {
      showError(err.message || 'Failed to delete products');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await productsService.exportProducts(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${new Date().toISOString()}.csv`;
      a.click();
      success('Products exported successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to export products');
    }
  };

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  if (isLoading && products.length === 0) {
    return (
      <div>
        <PageHeader title="Products" description="Manage your product catalog" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${total} products in your catalog`}
        action={
          <button
            onClick={handleCreateProduct}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        }
      />

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk Actions */}
          {selectedProducts.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2">
              <span className="text-sm text-gray-600">
                {selectedProducts.size} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="rounded-lg p-1 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium',
              showFilters
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-300 bg-white">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-l-lg p-2',
                viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
            >
              <Grid3x3 className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'rounded-r-lg border-l border-gray-300 p-2',
                viewMode === 'table' ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
            >
              <List className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <FiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Products Display */}
      {products.length === 0 && !isLoading ? (
        <EmptyState
          icon={Plus}
          title="No products found"
          description="Get started by adding your first product"
          action={{
            label: 'Add Product',
            onClick: handleCreateProduct,
          }}
        />
      ) : viewMode === 'grid' ? (
        <ProductGrid
          products={products}
          selectedProducts={selectedProducts}
          onSelect={setSelectedProducts}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
        />
      ) : (
        <ProductTable
          products={products}
          selectedProducts={selectedProducts}
          onSelect={setSelectedProducts}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
        />
      )}

      {/* Pagination */}
      {total > filters.perPage! && (
        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(filters.page! - 1) * filters.perPage! + 1} to{' '}
            {Math.min(filters.page! * filters.perPage!, total)} of {total} products
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(filters.page! - 1)}
              disabled={filters.page === 1}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(filters.page! + 1)}
              disabled={filters.page! * filters.perPage! >= total}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => setShowProductModal(false)}
          onSuccess={() => {
            setShowProductModal(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
```

### 4. Product Grid Component

#### src/components/products/ProductGrid.tsx
```typescript
import React from 'react';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { Product } from '@/types/product';

interface ProductGridProps {
  products: Product[];
  selectedProducts: Set<string>;
  onSelect: (selected: Set<string>) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductGrid({
  products,
  selectedProducts,
  onSelect,
  onEdit,
  onDelete,
}: ProductGridProps) {
  const toggleSelect = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    onSelect(newSelected);
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isSelected={selectedProducts.has(product.id)}
          onSelect={() => toggleSelect(product.id)}
          onEdit={() => onEdit(product)}
          onDelete={() => onDelete(product)}
        />
      ))}
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ProductCard({ product, isSelected, onSelect, onEdit, onDelete }: ProductCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const primaryImage = product.images[0]?.url || '/placeholder-product.png';
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0;

  const isLowStock = product.lowStockThreshold && product.quantity <= product.lowStockThreshold;
  const isOutOfStock = product.quantity === 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-white transition-all hover:shadow-lg',
        isSelected && 'ring-2 ring-primary'
      )}
    >
      {/* Selection Checkbox */}
      <div className="absolute left-3 top-3 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
        />
      </div>

      {/* Actions Menu */}
      <div className="absolute right-3 top-3 z-10">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="rounded-lg bg-white p-1.5 shadow-md opacity-0 transition-opacity group-hover:opacity-100"
        >
          <MoreVertical className="h-4 w-4 text-gray-600" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
              <button
                onClick={() => {
                  onEdit();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={primaryImage}
          alt={product.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />

        {/* Badges */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-2">
          {product.status === 'draft' && (
            <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
              Draft
            </span>
          )}
          {isOutOfStock && (
            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
              Out of Stock
            </span>
          )}
          {isLowStock && !isOutOfStock && (
            <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
              Low Stock
            </span>
          )}
          {hasDiscount && (
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
              {discountPercentage}% OFF
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>

        {product.sku && (
          <p className="mt-1 text-xs text-gray-500">SKU: {product.sku}</p>
        )}

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 line-through">
              {formatCurrency(product.compareAtPrice!)}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-600">Stock: {product.quantity}</span>
          {product.category && (
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
              {product.category.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 5. Product Modal Component

#### src/components/products/ProductModal.tsx
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Loader2, Trash2 } from 'lucide-react';
import { productsService } from '@/lib/services/products.service';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils/cn';
import type { Product, Category } from '@/types/product';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().min(0, 'Price must be positive'),
  compareAtPrice: z.number().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
  lowStockThreshold: z.number().int().min(0).optional(),
  categoryId: z.string().optional(),
  status: z.enum(['active', 'draft']),
  tags: z.array(z.string()),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>(product?.images.map((img) => img.url) || []);
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tagInput, setTagInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          sku: product.sku,
          barcode: product.barcode,
          quantity: product.quantity,
          lowStockThreshold: product.lowStockThreshold,
          categoryId: product.categoryId,
          status: product.status === 'archived' ? 'draft' : product.status,
          tags: product.tags,
        }
      : {
          name: '',
          description: '',
          price: 0,
          quantity: 0,
          status: 'active',
          tags: [],
        },
  });

  const tags = watch('tags') || [];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await productsService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploadingImages(true);
      const uploadPromises = files.map((file) => productsService.uploadImage(file));
      const urls = await Promise.all(uploadPromises);
      setImages((prev) => [...prev, ...urls]);
    } catch (err: any) {
      showError(err.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setValue('tags', [...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setValue(
      'tags',
      tags.filter((t) => t !== tag)
    );
  };

  const onSubmit = async (data: ProductFormData) => {
    if (images.length === 0) {
      showError('Please add at least one product image');
      return;
    }

    try {
      setIsSubmitting(true);

      if (product) {
        await productsService.updateProduct({
          id: product.id,
          ...data,
          images,
        });
        success('Product updated successfully');
      } else {
        await productsService.createProduct({
          ...data,
          images,
        });
        success('Product created successfully');
      }

      onSuccess();
    } catch (err: any) {
      showError(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-6">
            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Images
              </label>
              <div className="mt-2 grid grid-cols-4 gap-4">
                {images.map((url, index) => (
                  <div key={index} className="group relative aspect-square">
                    <img
                      src={url}
                      alt={`Product ${index + 1}`}
                      className="h-full w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="mt-2 text-xs text-gray-500">Upload</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImages}
                  />
                </label>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Name *
              </label>
              <input
                {...register('name')}
                type="text"
                className={cn(
                  'mt-1 block w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                  errors.name ? 'border-red-300' : 'border-gray-300'
                )}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className={cn(
                  'mt-1 block w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                  errors.description ? 'border-red-300' : 'border-gray-300'
                )}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Pricing */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price *
                </label>
                <input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className={cn(
                    'mt-1 block w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                    errors.price ? 'border-red-300' : 'border-gray-300'
                  )}
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Compare at Price
                </label>
                <input
                  {...register('compareAtPrice', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Inventory */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  SKU
                </label>
                <input
                  {...register('sku')}
                  type="text"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity *
                </label>
                <input
                  {...register('quantity', { valueAsNumber: true })}
                  type="number"
                  className={cn(
                    'mt-1 block w-full rounded-lg border px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                    errors.quantity ? 'border-red-300' : 'border-gray-300'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Low Stock Alert
                </label>
                <input
                  {...register('lowStockThreshold', { valueAsNumber: true })}
                  type="number"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Category & Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  {...register('categoryId')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status *
                </label>
                <select
                  {...register('status')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag..."
                  className="block flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## Testing Strategy

### Unit Tests
```typescript
// src/lib/services/__tests__/products.service.test.ts
import { productsService } from '../products.service';

describe('Products Service', () => {
  it('fetches products successfully', async () => {
    const result = await productsService.getProducts();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('creates product successfully', async () => {
    const product = await productsService.createProduct({
      name: 'Test Product',
      description: 'Test',
      price: 10,
      quantity: 5,
      status: 'active',
      tags: [],
      images: [],
    });
    expect(product.id).toBeDefined();
  });
});
```

## Acceptance Criteria

### Functional Requirements
1. ✅ Product list displays in grid view
2. ✅ Product list displays in table view
3. ✅ Search products works
4. ✅ Filter products works
5. ✅ Create product modal works
6. ✅ Edit product modal works
7. ✅ Delete product works
8. ✅ Bulk delete works
9. ✅ Image upload works
10. ✅ Multiple images supported
11. ✅ Categories display
12. ✅ Tags management works
13. ✅ Stock indicators show
14. ✅ Pagination works
15. ✅ Export products works
16. ✅ Product status badges show
17. ✅ Price formatting correct
18. ✅ Discount calculation works
19. ✅ Empty state shows
20. ✅ Loading states work

### Non-Functional Requirements
1. ✅ Fast image uploads
2. ✅ Smooth animations
3. ✅ Responsive design
4. ✅ Optimized queries
5. ✅ Accessible forms

## Definition of Done

- [ ] Products page created
- [ ] Grid view implemented
- [ ] Table view implemented
- [ ] Product modal working
- [ ] Image upload functional
- [ ] Filters working
- [ ] Search implemented
- [ ] Bulk actions working
- [ ] Export functionality working
- [ ] Tests written
- [ ] Code reviewed
- [ ] Responsive design verified

## Related Tasks

- FE-001: Next.js Project Initialization (Dependency)
- FE-002: Authentication Pages (Dependency)
- FE-003: Dashboard Layout (Dependency)

## Estimated Time

- Products Page: 5 hours
- Product Grid: 4 hours
- Product Table: 3 hours
- Product Modal: 6 hours
- Image Upload: 4 hours
- Filters: 3 hours
- Bulk Actions: 3 hours
- Testing: 4 hours
- **Total: 32 hours**
