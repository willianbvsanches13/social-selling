-- Migration: Create Product Links Table
-- Description: Creates product_links table for tracking product links in social media posts
-- Dependencies: 005-create-products.sql, 003-create-client-accounts.sql

CREATE TABLE product_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  instagram_media_id TEXT, -- Associated Instagram post ID
  short_link TEXT UNIQUE, -- Generated short link
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  revenue NUMERIC(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_product_links_product_id ON product_links(product_id);
CREATE INDEX idx_product_links_client_account ON product_links(client_account_id);
CREATE INDEX idx_product_links_instagram_media ON product_links(instagram_media_id)
  WHERE instagram_media_id IS NOT NULL;
CREATE UNIQUE INDEX idx_product_links_short_link ON product_links(short_link)
  WHERE short_link IS NOT NULL;
CREATE INDEX idx_product_links_clicks ON product_links(product_id, clicks DESC);

-- Apply updated_at trigger
CREATE TRIGGER update_product_links_updated_at
  BEFORE UPDATE ON product_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS update_product_links_updated_at ON product_links;
-- DROP TABLE IF EXISTS product_links CASCADE;
