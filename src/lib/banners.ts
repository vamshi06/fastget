import { neon } from '@neondatabase/serverless';
import { logger } from '@/lib/logger';

// Home-screen banner carousel (db/migrations/024_create_home_banners.sql),
// managed from /admin/banners.

export interface HomeBanner {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  altText: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface BannerInput {
  imageUrl: string;
  linkUrl: string | null;
  altText: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

function getClient() {
  if (!databaseUrl) throw new Error('DATABASE_URL environment variable is required');
  return neon(databaseUrl.replace('-pooler', ''));
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  return new Date(value as string | Date).toISOString();
}

function mapRow(row: Record<string, unknown>): HomeBanner {
  return {
    id: row.id as string,
    imageUrl: row.image_url as string,
    linkUrl: (row.link_url as string | null) ?? null,
    altText: (row.alt_text as string) ?? '',
    sortOrder: Number(row.sort_order) || 0,
    isActive: Boolean(row.is_active),
    startsAt: toIso(row.starts_at),
    endsAt: toIso(row.ends_at),
  };
}

/**
 * Banners live right now, in display order. Never throws: on any error
 * (including the table not existing before migration 024 runs) the home
 * screen just gets [] and shows its built-in text hero.
 */
export async function getLiveBanners(): Promise<HomeBanner[]> {
  if (!databaseUrl) return [];
  try {
    const rows = await getClient()`
      SELECT * FROM home_banners
      WHERE is_active
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at > NOW())
      ORDER BY sort_order, created_at
      LIMIT 10
    `;
    return rows.map(mapRow);
  } catch (error) {
    logger.warn('Banners', 'getLiveBanners failed - showing text hero', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function getAllBannersForAdmin(): Promise<HomeBanner[]> {
  const rows = await getClient()`SELECT * FROM home_banners ORDER BY sort_order, created_at`;
  return rows.map(mapRow);
}

/**
 * Validates and normalises admin input. Image must be an https URL; the link,
 * if any, must be an in-app path (it opens inside the app, never off-site).
 */
export function parseBannerInput(body: unknown): { ok: true; value: BannerInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const imageUrl = typeof b.imageUrl === 'string' ? b.imageUrl.trim() : '';
  if (!/^https:\/\/\S+$/i.test(imageUrl) || imageUrl.length > 2000) {
    return { ok: false, error: 'Image URL must be a valid https:// link' };
  }
  const rawLink = typeof b.linkUrl === 'string' ? b.linkUrl.trim() : '';
  if (rawLink && (!rawLink.startsWith('/') || rawLink.startsWith('//') || rawLink.length > 500)) {
    return { ok: false, error: 'Link must be a page in the app, starting with / (e.g. /catalog?category=paints)' };
  }
  const altText = typeof b.altText === 'string' ? b.altText.trim().slice(0, 200) : '';
  const sortOrder = Number.isInteger(b.sortOrder) ? (b.sortOrder as number) : 0;
  const isActive = b.isActive !== false;
  const parseDate = (v: unknown): string | null | 'invalid' => {
    if (v == null || v === '') return null;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? 'invalid' : d.toISOString();
  };
  const startsAt = parseDate(b.startsAt);
  const endsAt = parseDate(b.endsAt);
  if (startsAt === 'invalid' || endsAt === 'invalid') return { ok: false, error: 'Invalid start or end date' };
  if (startsAt && endsAt && endsAt <= startsAt) return { ok: false, error: 'End date must be after the start date' };
  return { ok: true, value: { imageUrl, linkUrl: rawLink || null, altText, sortOrder, isActive, startsAt, endsAt } };
}

export async function createBanner(input: BannerInput): Promise<HomeBanner> {
  const rows = await getClient()`
    INSERT INTO home_banners (image_url, link_url, alt_text, sort_order, is_active, starts_at, ends_at)
    VALUES (${input.imageUrl}, ${input.linkUrl}, ${input.altText}, ${input.sortOrder}, ${input.isActive},
            ${input.startsAt}, ${input.endsAt})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function updateBanner(id: string, input: BannerInput): Promise<HomeBanner | null> {
  const rows = await getClient()`
    UPDATE home_banners SET
      image_url = ${input.imageUrl}, link_url = ${input.linkUrl}, alt_text = ${input.altText},
      sort_order = ${input.sortOrder}, is_active = ${input.isActive},
      starts_at = ${input.startsAt}, ends_at = ${input.endsAt}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function deleteBanner(id: string): Promise<boolean> {
  const rows = await getClient()`DELETE FROM home_banners WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
