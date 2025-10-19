-- Development Seed Data
-- Description: Creates test data for development environment
-- WARNING: DO NOT run in production!

DO $$
DECLARE
  demo_user_id UUID;
  user_exists BOOLEAN;
BEGIN
  -- Check if demo user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE email = 'demo@socialselling.com')
  INTO user_exists;

  -- Insert test user if it doesn't exist (password: Demo123!)
  IF NOT user_exists THEN
    INSERT INTO users (email, password_hash, name, email_verified)
    VALUES (
      'demo@socialselling.com',
      '$2b$12$KIXxJ8F9xQZYh5YvZ5YvZ5YvZ5YvZ5YvZ5YvZ5YvZ5YvZ5YvZ5Yv',
      'Demo User',
      true
    )
    RETURNING id INTO demo_user_id;

    RAISE NOTICE 'Created demo user: demo@socialselling.com';
  ELSE
    SELECT id INTO demo_user_id FROM users WHERE email = 'demo@socialselling.com';
    RAISE NOTICE 'Demo user already exists';
  END IF;

  -- Check if products exist for this user
  IF NOT EXISTS(SELECT 1 FROM products WHERE user_id = demo_user_id) THEN
    -- Insert test products
    INSERT INTO products (user_id, name, description, price, currency, category, is_available)
    SELECT
      demo_user_id,
      'Product ' || generate_series,
      'Description for product ' || generate_series,
      (random() * 500 + 50)::NUMERIC(10,2),
      'BRL',
      (ARRAY['Electronics', 'Fashion', 'Beauty', 'Food'])[floor(random() * 4 + 1)::INT],
      true
    FROM generate_series(1, 20);

    RAISE NOTICE 'Created 20 test products';
  ELSE
    RAISE NOTICE 'Products already exist for demo user';
  END IF;

  RAISE NOTICE 'Seed data completed successfully!';
  RAISE NOTICE 'Login credentials: demo@socialselling.com / Demo123!';
END $$;
