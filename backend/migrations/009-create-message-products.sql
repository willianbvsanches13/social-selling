-- Migration: Create Message Products Join Table
-- Description: Creates message_products table for linking products to messages
-- Dependencies: 008-create-messages.sql, 005-create-products.sql

CREATE TABLE message_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_message_product UNIQUE (message_id, product_id)
);

-- Create indexes for performance
CREATE INDEX idx_message_products_message ON message_products(message_id);
CREATE INDEX idx_message_products_product ON message_products(product_id);

-- ROLLBACK
-- DROP TABLE IF EXISTS message_products CASCADE;
