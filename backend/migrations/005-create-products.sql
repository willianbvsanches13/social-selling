-- Migration: Create Products Table
-- Description: Creates products table for product catalog management
-- Dependencies: 001-initial-schema.sql (users)

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2),
  currency TEXT DEFAULT 'BRL',
  category TEXT,
  tags TEXT[],
  images JSONB DEFAULT '[]', -- Array of image URLs
  stock_quantity INT,
  sku TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_name_search
  ON products USING GIN(to_tsvector('portuguese', name));
CREATE INDEX idx_products_description_search
  ON products USING GIN(to_tsvector('portuguese', description))
  WHERE description IS NOT NULL;

-- Apply updated_at trigger
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS update_products_updated_at ON products;
-- DROP TABLE IF EXISTS products CASCADE;
