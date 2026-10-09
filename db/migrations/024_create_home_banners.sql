-- Migration 024: Home-screen banner carousel, managed from /admin/banners.
--
-- Each row is one slide in the home hero carousel: an image (by URL, like
-- product images - no uploads), an optional in-app link it opens, and alt
-- text. Slides show in sort_order, only while is_active and inside the
-- optional starts_at / ends_at window, so offers can be scheduled ahead and
-- expire on their own. With no live banners the home screen falls back to
-- the built-in text hero.
--
-- link_url is an in-app path ("/catalog?category=paints"), never an external
-- URL - enforced in the admin API (src/lib/banners.ts).
--
-- Safe to run multiple times (all statements are idempotent).

CREATE TABLE IF NOT EXISTS home_banners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   TEXT NOT NULL,
  link_url    TEXT,
  alt_text    TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at   TIMESTAMP WITH TIME ZONE,
  ends_at     TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_banners_live ON home_banners(sort_order) WHERE is_active;
