-- Migration 001: Add brand column to products table
-- Safe to run multiple times (IF NOT EXISTS guard)
-- NOTE: The uq_products_name_category index that was originally here was
-- superseded and dropped by migration 005.

ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255);
