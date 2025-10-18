# FE-007: Product Detail/Edit Page

**Epic:** Frontend Development - Social Selling Platform
**Sprint:** Sprint 4 - Product Management
**Story Points:** 13
**Priority:** High
**Assigned To:** Frontend Team
**Status:** Ready for Development
**Dependencies:** FE-006

## Overview

Create a comprehensive product detail and edit page with full product information display, inline editing capabilities, image gallery with lightbox, variant management, pricing and inventory tracking, product history/changelog, share functionality, and delete confirmation.

## Technical Requirements

### Features
- Product detail view with all information
- Edit mode with inline editing
- Image gallery with lightbox
- Product variants management
- Pricing and inventory tracking
- Product history/changelog
- Share product link
- Delete product confirmation
- Related products section
- Activity timeline
- Quick stats overview
- Print product label

## Implementation Details

### 1. Product Detail Types

#### src/types/product-detail.ts
```typescript
export interface ProductDetail extends Product {
  totalSold: number;
  revenue: number;
  viewCount: number;
  shareCount: number;
  relatedProducts: Product[];
  changelog: ProductChangelogEntry[];
}

export interface ProductChangelogEntry {
  id: string;
  productId: string;
  action: 'created' | 'updated' | 'price_changed' | 'inventory_updated' | 'published' | 'unpublished';
  changes: Record<string, { old: any; new: any }>;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  options: ProductVariantOption[];
  imageUrl?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ProductVariantOption {
  name: string;
  value: string;
}

export interface CreateVariantRequest {
  productId: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  options: ProductVariantOption[];
  imageUrl?: string;
}

export interface ProductShareLink {
  url: string;
  expiresAt?: string;
}

export interface ProductStats {
  totalViews: number;
  totalSales: number;
  totalRevenue: number;
  averageRating?: number;
  conversionRate: number;
}
```

### 2. Product Detail Service

#### src/lib/services/product-detail.service.ts
```typescript
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  ProductDetail,
  ProductVariant,
  CreateVariantRequest,
  ProductShareLink,
  ProductStats,
} from '@/types/product-detail';

export const productDetailService = {
  async getProductDetail(id: string): Promise<ProductDetail> {
    const response = await apiClient.get<ProductDetail>(
      `${API_ENDPOINTS.PRODUCT_DETAIL(id)}?include=changelog,relatedProducts,stats`
    );
    return response.data!;
  },

  async getProductStats(id: string): Promise<ProductStats> {
    const response = await apiClient.get<ProductStats>(
      `${API_ENDPOINTS.PRODUCT_DETAIL(id)}/stats`
    );
    return response.data!;
  },

  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    const response = await apiClient.get<ProductVariant[]>(
      `${API_ENDPOINTS.PRODUCT_DETAIL(productId)}/variants`
    );
    return response.data || [];
  },

  async createVariant(data: CreateVariantRequest): Promise<ProductVariant> {
    const response = await apiClient.post<ProductVariant>(
      `${API_ENDPOINTS.PRODUCT_DETAIL(data.productId)}/variants`,
      data
    );
    return response.data!;
  },

  async updateVariant(
    productId: string,
    variantId: string,
    data: Partial<CreateVariantRequest>
  ): Promise<ProductVariant> {
    const response = await apiClient.put<ProductVariant>(
      `${API_ENDPOINTS.PRODUCT_DETAIL(productId)}/variants/${variantId}`,
      data
    );
    return response.data!;
  },

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    await apiClient.delete(
      `${API_ENDPOINTS.PRODUCT_DETAIL(productId)}/variants/${variantId}`
    );
  },

  async duplicateProduct(id: string): Promise<ProductDetail> {
    const response = await apiClient.post<ProductDetail>(
      `${API_ENDPOINTS.PRODUCT_DETAIL(id)}/duplicate`
    );
    return response.data!;
  },

  async archiveProduct(id: string): Promise<void> {
    await apiClient.post(`${API_ENDPOINTS.PRODUCT_DETAIL(id)}/archive`);
  },

  async generateShareLink(id: string, expiresIn?: number): Promise<ProductShareLink> {
    const response = await apiClient.post<ProductShareLink>(
      `${API_ENDPOINTS.PRODUCT_DETAIL(id)}/share`,
      { expiresIn }
    );
    return response.data!;
  },

  async trackView(id: string): Promise<void> {
    await apiClient.post(`${API_ENDPOINTS.PRODUCT_DETAIL(id)}/track-view`);
  },

  async getChangelog(id: string): Promise<ProductChangelogEntry[]> {
    const response = await apiClient.get<ProductChangelogEntry[]>(
      `${API_ENDPOINTS.PRODUCT_DETAIL(id)}/changelog`
    );
    return response.data || [];
  },
};
```

### 3. Product Detail Page

#### src/app/(dashboard)/products/[id]/page.tsx
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Share2,
  Copy,
  MoreVertical,
  Plus,
  TrendingUp,
  Package,
  DollarSign,
  Eye,
  Clock,
  Tag,
  Archive,
  Printer,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ImageGallery } from '@/components/products/ImageGallery';
import { ProductVariants } from '@/components/products/ProductVariants';
import { ProductChangelog } from '@/components/products/ProductChangelog';
import { RelatedProducts } from '@/components/products/RelatedProducts';
import { ShareModal } from '@/components/products/ShareModal';
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal';
import { productDetailService } from '@/lib/services/product-detail.service';
import { productsService } from '@/lib/services/products.service';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { ProductDetail } from '@/types/product-detail';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProductDetail();
      trackProductView();
    }
  }, [productId]);

  const fetchProductDetail = async () => {
    try {
      setIsLoading(true);
      const data = await productDetailService.getProductDetail(productId);
      setProduct(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load product');
    } finally {
      setIsLoading(false);
    }
  };

  const trackProductView = async () => {
    try {
      await productDetailService.trackView(productId);
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await productsService.deleteProduct(productId);
      success('Product deleted successfully');
      router.push('/products');
    } catch (err: any) {
      showError(err.message || 'Failed to delete product');
    }
  };

  const handleDuplicate = async () => {
    try {
      const duplicated = await productDetailService.duplicateProduct(productId);
      success('Product duplicated successfully');
      router.push(`/products/${duplicated.id}`);
    } catch (err: any) {
      showError(err.message || 'Failed to duplicate product');
    }
  };

  const handleArchive = async () => {
    try {
      await productDetailService.archiveProduct(productId);
      success('Product archived successfully');
      fetchProductDetail();
    } catch (err: any) {
      showError(err.message || 'Failed to archive product');
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpdateField = async (field: string, value: any) => {
    try {
      await productsService.updateProduct({
        id: productId,
        [field]: value,
      });
      success('Product updated successfully');
      fetchProductDetail();
    } catch (err: any) {
      showError(err.message || 'Failed to update product');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8 h-10 w-1/3 rounded bg-gray-200" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-96 rounded-lg bg-gray-200" />
            <div className="h-64 rounded-lg bg-gray-200" />
          </div>
          <div className="space-y-6">
            <div className="h-48 rounded-lg bg-gray-200" />
            <div className="h-64 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Package className="h-16 w-16 text-gray-400" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Product not found</h2>
        <button
          onClick={() => router.push('/products')}
          className="mt-4 text-primary hover:underline"
        >
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
              <span>SKU: {product.sku || 'N/A'}</span>
              <span>•</span>
              <span>Created {formatDate(product.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
              isEditMode
                ? 'bg-primary text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <Edit className="h-4 w-4" />
            {isEditMode ? 'View Mode' : 'Edit Mode'}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="rounded-lg border border-gray-300 bg-white p-2 hover:bg-gray-50"
            >
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>

            {showActionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActionsMenu(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                  <button
                    onClick={() => {
                      handleShare();
                      setShowActionsMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  <button
                    onClick={() => {
                      handleDuplicate();
                      setShowActionsMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      handlePrint();
                      setShowActionsMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Printer className="h-4 w-4" />
                    Print Label
                  </button>
                  {product.status !== 'archived' && (
                    <button
                      onClick={() => {
                        handleArchive();
                        setShowActionsMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                  )}
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setShowActionsMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Revenue"
          value={formatCurrency(product.revenue)}
          icon={DollarSign}
          trend="+12.5%"
          trendUp={true}
        />
        <StatsCard
          label="Total Sold"
          value={formatNumber(product.totalSold)}
          icon={TrendingUp}
          trend="+8.2%"
          trendUp={true}
        />
        <StatsCard
          label="Stock"
          value={formatNumber(product.quantity)}
          icon={Package}
          status={
            product.quantity === 0
              ? 'error'
              : product.lowStockThreshold && product.quantity <= product.lowStockThreshold
              ? 'warning'
              : 'success'
          }
        />
        <StatsCard
          label="Views"
          value={formatNumber(product.viewCount)}
          icon={Eye}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image Gallery */}
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Product Images</h2>
            <ImageGallery
              images={product.images}
              productName={product.name}
              editable={isEditMode}
              onImagesUpdate={(images) => handleUpdateField('images', images)}
            />
          </section>

          {/* Product Information */}
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Product Information
            </h2>
            <div className="space-y-4">
              <EditableField
                label="Name"
                value={product.name}
                editable={isEditMode}
                onSave={(value) => handleUpdateField('name', value)}
              />
              <EditableField
                label="Description"
                value={product.description}
                type="textarea"
                editable={isEditMode}
                onSave={(value) => handleUpdateField('description', value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <EditableField
                  label="SKU"
                  value={product.sku || 'N/A'}
                  editable={isEditMode}
                  onSave={(value) => handleUpdateField('sku', value)}
                />
                <EditableField
                  label="Barcode"
                  value={product.barcode || 'N/A'}
                  editable={isEditMode}
                  onSave={(value) => handleUpdateField('barcode', value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <EditableField
                  label="Category"
                  value={product.category?.name || 'Uncategorized'}
                  editable={isEditMode}
                  type="select"
                  onSave={(value) => handleUpdateField('categoryId', value)}
                />
                <EditableField
                  label="Status"
                  value={product.status}
                  editable={isEditMode}
                  type="select"
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'archived', label: 'Archived' },
                  ]}
                  onSave={(value) => handleUpdateField('status', value)}
                />
              </div>
            </div>
          </section>

          {/* Pricing & Inventory */}
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Pricing & Inventory
            </h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <EditableField
                  label="Price"
                  value={product.price}
                  type="number"
                  editable={isEditMode}
                  onSave={(value) => handleUpdateField('price', parseFloat(value))}
                  prefix="$"
                />
                <EditableField
                  label="Compare at Price"
                  value={product.compareAtPrice || 0}
                  type="number"
                  editable={isEditMode}
                  onSave={(value) => handleUpdateField('compareAtPrice', parseFloat(value))}
                  prefix="$"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <EditableField
                  label="Quantity"
                  value={product.quantity}
                  type="number"
                  editable={isEditMode}
                  onSave={(value) => handleUpdateField('quantity', parseInt(value))}
                />
                <EditableField
                  label="Low Stock Alert"
                  value={product.lowStockThreshold || 0}
                  type="number"
                  editable={isEditMode}
                  onSave={(value) =>
                    handleUpdateField('lowStockThreshold', parseInt(value))
                  }
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Stock Status
                  </label>
                  <div className="mt-1">
                    {product.quantity === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                        Out of Stock
                      </span>
                    ) : product.lowStockThreshold &&
                      product.quantity <= product.lowStockThreshold ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                        In Stock
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Variants */}
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Product Variants</h2>
              {isEditMode && (
                <button className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700">
                  <Plus className="h-4 w-4" />
                  Add Variant
                </button>
              )}
            </div>
            <ProductVariants
              productId={productId}
              editable={isEditMode}
            />
          </section>

          {/* Changelog */}
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Product History</h2>
            <ProductChangelog changelog={product.changelog} />
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleShare}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Share2 className="h-5 w-5 text-gray-400" />
                Share Product
              </button>
              <button
                onClick={handleDuplicate}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-5 w-5 text-gray-400" />
                Duplicate Product
              </button>
              <button
                onClick={handlePrint}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Printer className="h-5 w-5 text-gray-400" />
                Print Label
              </button>
            </div>
          </section>

          {/* Tags */}
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Tags</h3>
              {isEditMode && (
                <button className="text-sm text-primary hover:underline">Edit</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.tags.length > 0 ? (
                product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500">No tags added</p>
              )}
            </div>
          </section>

          {/* Related Products */}
          {product.relatedProducts && product.relatedProducts.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Related Products
              </h3>
              <RelatedProducts products={product.relatedProducts} />
            </section>
          )}

          {/* Last Updated */}
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Last updated {formatDate(product.updatedAt)}</span>
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      {showShareModal && (
        <ShareModal
          productId={productId}
          productName={product.name}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          title="Delete Product"
          message={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

interface StatsCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  status?: 'success' | 'warning' | 'error';
}

function StatsCard({ label, value, icon: Icon, trend, trendUp, status }: StatsCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p
              className={cn(
                'mt-2 text-sm font-medium',
                trendUp ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend}
            </p>
          )}
          {status && (
            <div className="mt-2">
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  status === 'success' && 'bg-green-500',
                  status === 'warning' && 'bg-orange-500',
                  status === 'error' && 'bg-red-500'
                )}
              />
            </div>
          )}
        </div>
        <div
          className={cn(
            'rounded-lg p-3',
            status === 'success' && 'bg-green-100',
            status === 'warning' && 'bg-orange-100',
            status === 'error' && 'bg-red-100',
            !status && 'bg-gray-100'
          )}
        >
          <Icon
            className={cn(
              'h-6 w-6',
              status === 'success' && 'text-green-600',
              status === 'warning' && 'text-orange-600',
              status === 'error' && 'text-red-600',
              !status && 'text-gray-600'
            )}
          />
        </div>
      </div>
    </div>
  );
}

interface EditableFieldProps {
  label: string;
  value: string | number;
  type?: 'text' | 'textarea' | 'number' | 'select';
  editable: boolean;
  options?: { value: string; label: string }[];
  prefix?: string;
  onSave: (value: string) => void;
}

function EditableField({
  label,
  value,
  type = 'text',
  editable,
  options,
  prefix,
  onSave,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setIsEditing(false);
  };

  if (!editable || !isEditing) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm text-gray-900">
            {prefix && type === 'number' && prefix}
            {value || 'N/A'}
          </p>
          {editable && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-primary hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        {type === 'textarea' ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        ) : type === 'select' && options ? (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        )}
        <button
          onClick={handleSave}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

### 4. Image Gallery Component

#### src/components/products/ImageGallery.tsx
```typescript
'use client';

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Upload, Trash2 } from 'lucide-react';
import { productsService } from '@/lib/services/products.service';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils/cn';
import type { ProductImage } from '@/types/product';

interface ImageGalleryProps {
  images: ProductImage[];
  productName: string;
  editable?: boolean;
  onImagesUpdate?: (images: ProductImage[]) => void;
}

export function ImageGallery({
  images,
  productName,
  editable = false,
  onImagesUpdate,
}: ImageGalleryProps) {
  const { error: showError } = useToast();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const uploadPromises = files.map((file) => productsService.uploadImage(file));
      const urls = await Promise.all(uploadPromises);

      const newImages: ProductImage[] = urls.map((url, index) => ({
        id: `${Date.now()}-${index}`,
        url,
        position: images.length + index,
      }));

      onImagesUpdate?.([...images, ...newImages]);
    } catch (err: any) {
      showError(err.message || 'Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesUpdate?.(newImages);
    if (selectedIndex >= newImages.length) {
      setSelectedIndex(Math.max(0, newImages.length - 1));
    }
  };

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12">
        <Upload className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">No images added</p>
        {editable && (
          <label className="mt-4 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            Upload Images
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
        <img
          src={images[selectedIndex].url}
          alt={images[selectedIndex].alt || `${productName} - Image ${selectedIndex + 1}`}
          className="h-full w-full cursor-pointer object-contain"
          onClick={() => setShowLightbox(true)}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5 text-gray-800" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg hover:bg-white"
            >
              <ChevronRight className="h-5 w-5 text-gray-800" />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
          {selectedIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail Grid */}
      <div className="grid grid-cols-6 gap-2">
        {images.map((image, index) => (
          <div
            key={image.id}
            className={cn(
              'group relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2',
              selectedIndex === index
                ? 'border-primary'
                : 'border-transparent hover:border-gray-300'
            )}
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={image.url}
              alt={image.alt || `Thumbnail ${index + 1}`}
              className="h-full w-full object-cover"
            />
            {editable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteImage(index);
                }}
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {/* Upload Button */}
        {editable && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400">
            <Upload className="h-6 w-6 text-gray-400" />
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white hover:bg-white/30"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white hover:bg-white/30"
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          <img
            src={images[selectedIndex].url}
            alt={images[selectedIndex].alt || `${productName} - Image ${selectedIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-white">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 5. Product Variants Component

#### src/components/products/ProductVariants.tsx
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { productDetailService } from '@/lib/services/product-detail.service';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatters';
import type { ProductVariant } from '@/types/product-detail';

interface ProductVariantsProps {
  productId: string;
  editable?: boolean;
}

export function ProductVariants({ productId, editable = false }: ProductVariantsProps) {
  const { success, error: showError } = useToast();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    try {
      setIsLoading(true);
      const data = await productDetailService.getProductVariants(productId);
      setVariants(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load variants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) {
      return;
    }

    try {
      await productDetailService.deleteVariant(productId, variantId);
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      success('Variant deleted successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to delete variant');
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-gray-200" />
      ))}
    </div>;
  }

  if (variants.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-600">No variants added</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {variants.map((variant) => (
        <div
          key={variant.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <div className="flex items-center gap-4">
            {variant.imageUrl && (
              <img
                src={variant.imageUrl}
                alt={variant.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            )}
            <div>
              <h4 className="font-medium text-gray-900">{variant.name}</h4>
              <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
                <span>{formatCurrency(variant.price)}</span>
                {variant.sku && <span>SKU: {variant.sku}</span>}
                <span>Qty: {variant.quantity}</span>
              </div>
            </div>
          </div>

          {editable && (
            <div className="flex items-center gap-2">
              <button className="rounded-lg p-2 text-gray-600 hover:bg-white">
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteVariant(variant.id)}
                className="rounded-lg p-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 6. Product Changelog Component

#### src/components/products/ProductChangelog.tsx
```typescript
'use client';

import React from 'react';
import { Clock, User, Edit, DollarSign, Package, Eye, EyeOff } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';
import type { ProductChangelogEntry } from '@/types/product-detail';

interface ProductChangelogProps {
  changelog: ProductChangelogEntry[];
}

export function ProductChangelog({ changelog }: ProductChangelogProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'price_changed':
        return <DollarSign className="h-4 w-4 text-orange-600" />;
      case 'inventory_updated':
        return <Package className="h-4 w-4 text-purple-600" />;
      case 'published':
        return <Eye className="h-4 w-4 text-green-600" />;
      case 'unpublished':
        return <EyeOff className="h-4 w-4 text-gray-600" />;
      default:
        return <Edit className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionLabel = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (changelog.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-600">No history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {changelog.map((entry) => (
        <div key={entry.id} className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              {getActionIcon(entry.action)}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {getActionLabel(entry.action)}
              </span>
              <span className="text-sm text-gray-500">by {entry.userName}</span>
            </div>
            <div className="mt-1 text-sm text-gray-600">
              <Clock className="mr-1 inline h-3 w-3" />
              {formatDate(entry.createdAt)}
            </div>
            {Object.keys(entry.changes).length > 0 && (
              <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm">
                {Object.entries(entry.changes).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-gray-500 line-through">
                      {JSON.stringify(value.old)}
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="text-gray-900">{JSON.stringify(value.new)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 7. Share Modal Component

#### src/components/products/ShareModal.tsx
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Link as LinkIcon } from 'lucide-react';
import { productDetailService } from '@/lib/services/product-detail.service';
import { useToast } from '@/lib/hooks/useToast';
import type { ProductShareLink } from '@/types/product-detail';

interface ShareModalProps {
  productId: string;
  productName: string;
  onClose: () => void;
}

export function ShareModal({ productId, productName, onClose }: ShareModalProps) {
  const { success, error: showError } = useToast();
  const [shareLink, setShareLink] = useState<ProductShareLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateShareLink();
  }, [productId]);

  const generateShareLink = async () => {
    try {
      setIsLoading(true);
      const link = await productDetailService.generateShareLink(productId);
      setShareLink(link);
    } catch (err: any) {
      showError(err.message || 'Failed to generate share link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink.url);
      setCopied(true);
      success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showError('Failed to copy link');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Share Product</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <p className="mb-6 text-sm text-gray-600">
          Share "{productName}" with others using the link below
        </p>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
          </div>
        ) : shareLink ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3">
                <p className="truncate text-sm text-gray-900">{shareLink.url}</p>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-700"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>

            {shareLink.expiresAt && (
              <p className="text-xs text-gray-500">
                This link will expire on {new Date(shareLink.expiresAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">Failed to generate share link</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Testing Strategy

### Unit Tests
```typescript
// src/lib/services/__tests__/product-detail.service.test.ts
import { productDetailService } from '../product-detail.service';

describe('Product Detail Service', () => {
  it('fetches product detail successfully', async () => {
    const product = await productDetailService.getProductDetail('123');
    expect(product.id).toBe('123');
    expect(product.changelog).toBeDefined();
  });

  it('generates share link successfully', async () => {
    const link = await productDetailService.generateShareLink('123');
    expect(link.url).toBeDefined();
  });

  it('tracks product view', async () => {
    await expect(productDetailService.trackView('123')).resolves.not.toThrow();
  });
});
```

### Component Tests
```typescript
// src/components/products/__tests__/ImageGallery.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGallery } from '../ImageGallery';

describe('ImageGallery', () => {
  const mockImages = [
    { id: '1', url: '/image1.jpg', position: 0 },
    { id: '2', url: '/image2.jpg', position: 1 },
  ];

  it('renders images correctly', () => {
    render(<ImageGallery images={mockImages} productName="Test" />);
    expect(screen.getByAlt(/Test - Image 1/)).toBeInTheDocument();
  });

  it('navigates between images', () => {
    render(<ImageGallery images={mockImages} productName="Test" />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });
});
```

## Acceptance Criteria

### Functional Requirements
1. ✅ Product detail view displays all information
2. ✅ Edit mode enables inline editing
3. ✅ Image gallery with thumbnail navigation works
4. ✅ Lightbox modal displays on image click
5. ✅ Product variants display correctly
6. ✅ Variant CRUD operations work
7. ✅ Pricing information displays accurately
8. ✅ Inventory tracking updates in real-time
9. ✅ Product history/changelog displays
10. ✅ Share product link generates successfully
11. ✅ Copy to clipboard works
12. ✅ Delete confirmation modal shows
13. ✅ Product deletion works
14. ✅ Duplicate product works
15. ✅ Archive product works
16. ✅ Print label functionality works
17. ✅ Stats cards display correctly
18. ✅ Related products section shows
19. ✅ Tags display and edit
20. ✅ Quick actions menu works
21. ✅ Back navigation works
22. ✅ Loading states display
23. ✅ Error handling works
24. ✅ Product view tracking works
25. ✅ Inline field editing saves correctly

### Non-Functional Requirements
1. ✅ Page loads in under 2 seconds
2. ✅ Smooth image transitions
3. ✅ Responsive on all devices
4. ✅ Accessible keyboard navigation
5. ✅ SEO-friendly structure

## Definition of Done

- [ ] Product detail page created
- [ ] Image gallery implemented
- [ ] Lightbox functionality working
- [ ] Variants management working
- [ ] Changelog display implemented
- [ ] Share functionality working
- [ ] Delete confirmation working
- [ ] Inline editing functional
- [ ] Stats cards displaying
- [ ] Related products showing
- [ ] Tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Responsive design verified
- [ ] Accessibility tested

## Related Tasks

- FE-006: Product Catalog Management (Dependency)
- FE-001: Next.js Project Initialization (Dependency)
- FE-002: Authentication Pages (Dependency)

## Estimated Time

- Product detail page: 6 hours
- Image gallery: 5 hours
- Lightbox modal: 3 hours
- Variants management: 5 hours
- Changelog component: 3 hours
- Share functionality: 3 hours
- Inline editing: 4 hours
- Stats cards: 2 hours
- Testing: 5 hours
- **Total: 36 hours**
