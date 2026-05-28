-- Migration 002: Add mrp_price and moq columns to product_variants table
-- Safe to run multiple times (IF NOT EXISTS guard)

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS mrp_price INTEGER;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS moq INTEGER NOT NULL DEFAULT 1;
