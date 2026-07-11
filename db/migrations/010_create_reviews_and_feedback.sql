-- Migration 010: Product reviews and order delivery feedback
--
-- product_reviews: one row per (order, product) — a review always represents
-- a verified purchase (the order must be 'delivered' and contain the product;
-- enforced in the API layer, not the DB). Upserted via ON CONFLICT so a
-- customer can edit their review for that purchase.
--
-- order_feedback: one row per order — rates the delivery experience itself,
-- independent of any specific product.

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code VARCHAR(255) NOT NULL,
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_reviews_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_reviews_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uk_product_reviews_order_product UNIQUE (order_id, product_code)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_code ON product_reviews(product_code);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);

CREATE TABLE IF NOT EXISTS order_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_feedback_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_feedback_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_feedback_user_id ON order_feedback(user_id);
