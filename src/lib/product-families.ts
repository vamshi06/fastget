// Admin management of variant families (migration 028, product_family_members).
// A family links sizes of the same item - each still a separate product - so
// the storefront shows them as one product with size options. See
// getProductsFromCategoryTables / getFamilyProducts in products.ts for the
// customer side.

import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';
import { ALL_CATEGORY_ROWS_SQL, familyBaseName } from './products';
import { logger } from './logger';

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

function sql() {
  if (!databaseUrl) throw new Error('DATABASE_URL environment variable is required');
  return neon(databaseUrl.replace('-pooler', ''));
}

export interface FamilyMember {
  productCode: string;
  name: string;
  brand?: string;
  optionLabel: string;
  priceRupees: number;
  status: string;
  categorySlug: string;
  imageUrl?: string;
  size?: string;
  colour?: string;
}

export interface Family {
  familyId: string;
  members: FamilyMember[];
}

export interface FamilySuggestion {
  /** e.g. "carpentry-hardware · CNR · Telescopic Channel" */
  title: string;
  members: (FamilyMember & { familyId?: string })[];
}

export const OPTION_LABEL_MAX = 100;

/** The part of a name in trailing brackets: "Telescopic Channel (18\")" -> '18"'. */
function bracketLabel(name: string): string | undefined {
  const m = /\(([^()]*)\)\s*$/.exec(name);
  return m?.[1].trim() || undefined;
}

/** Default option label for a product: its bracketed size, else size, else colour, else code. */
function defaultLabel(row: any): string {
  return (bracketLabel(row.name || '') || row.size || row.colour || row.product_code).slice(0, OPTION_LABEL_MAX);
}

/**
 * Makes repeated labels within a family different: first by adding the
 * colour/finish, and where that still repeats (e.g. three "Cup 35mm" hinges
 * that differ only by crank angle) by adding the product code - an obvious
 * placeholder for the admin to replace with the real difference.
 */
function dedupeLabels(rows: any[], labels: Map<string, string>): void {
  const repeats = () => {
    const count = new Map<string, number>();
    labels.forEach((l) => count.set(l.toLowerCase(), (count.get(l.toLowerCase()) ?? 0) + 1));
    return (code: string) => (count.get(labels.get(code)!.toLowerCase()) ?? 0) > 1;
  };
  const withColour = repeats();
  const base = new Map(labels);
  for (const r of rows) {
    const label = base.get(r.product_code)!;
    if (withColour(r.product_code) && r.colour && !label.toLowerCase().includes(String(r.colour).toLowerCase())) {
      labels.set(r.product_code, `${label} - ${r.colour}`.slice(0, OPTION_LABEL_MAX));
    }
  }
  const stillRepeated = repeats();
  for (const r of rows) {
    if (stillRepeated(r.product_code)) {
      labels.set(r.product_code, `${base.get(r.product_code)} - ${r.product_code}`.slice(0, OPTION_LABEL_MAX));
    }
  }
}

function rowToMember(r: any): FamilyMember {
  const brand = (r.brand as string) || '';
  const name = (r.name as string) || '';
  return {
    productCode: r.product_code,
    name: brand && name.startsWith(brand + ' ') ? name.slice(brand.length + 1) : name,
    brand: brand || undefined,
    optionLabel: r.option_label ?? defaultLabel(r),
    priceRupees: Math.round(Number(r.price) / 100),
    status: r.status,
    categorySlug: r.category_slug || '',
    imageUrl: r.image_url || undefined,
    size: r.size || undefined,
    colour: r.colour || undefined,
  };
}

const sortMembers = (a: FamilyMember, b: FamilyMember) =>
  a.optionLabel.localeCompare(b.optionLabel, 'en', { numeric: true, sensitivity: 'base' });

/** The family `productCode` belongs to, with every member (any status), or null. */
export async function getFamilyOf(productCode: string): Promise<Family | null> {
  const rows = await sql().query(
    `SELECT all_category_rows.*, fm.family_id, fm.option_label
       FROM product_family_members fm
       JOIN ${ALL_CATEGORY_ROWS_SQL} ON all_category_rows.product_code = fm.product_code
      WHERE fm.family_id = (SELECT family_id FROM product_family_members WHERE product_code = $1)`,
    [productCode],
  ) as any[];
  if (rows.length === 0) return null;
  return { familyId: rows[0].family_id, members: rows.map(rowToMember).sort(sortMembers) };
}

/**
 * Puts `productCodes` into one family. If any are already in families, those
 * families are merged into one (the first found). `labels` overrides option
 * labels; otherwise existing labels are kept and new members get a default.
 * Returns the family id. Throws on unknown product codes.
 */
export async function linkProducts(productCodes: string[], labels: Record<string, string> = {}): Promise<string> {
  const codes = Array.from(new Set(productCodes.map((c) => c.trim()).filter(Boolean)));
  if (codes.length < 2) throw new Error('Pick at least two products to link.');
  const db = sql();

  const rows = await db.query(
    `SELECT all_category_rows.*, fm.family_id, fm.option_label
       FROM ${ALL_CATEGORY_ROWS_SQL}
       LEFT JOIN product_family_members fm ON fm.product_code = all_category_rows.product_code
      WHERE all_category_rows.product_code = ANY($1::text[])`,
    [codes],
  ) as any[];
  const found = new Set(rows.map((r) => r.product_code as string));
  const missing = codes.filter((c) => !found.has(c));
  if (missing.length) throw new Error(`Unknown product code(s): ${missing.join(', ')}`);

  const existingFamilies = Array.from(new Set(rows.map((r) => r.family_id).filter(Boolean))) as string[];
  const familyId = existingFamilies[0] ?? randomUUID();
  if (existingFamilies.length > 1) {
    await db.query(
      `UPDATE product_family_members SET family_id = $1 WHERE family_id = ANY($2::uuid[])`,
      [familyId, existingFamilies.slice(1)],
    );
  }

  const finalLabels = new Map<string, string>();
  for (const r of rows) {
    const given = labels[r.product_code]?.trim();
    finalLabels.set(r.product_code, (given || r.option_label || defaultLabel(r)).slice(0, OPTION_LABEL_MAX));
  }
  // Only auto-adjust labels the admin didn't type.
  dedupeLabels(rows.filter((r) => !labels[r.product_code]?.trim() && !r.option_label), finalLabels);

  for (const r of rows) {
    await db.query(
      `INSERT INTO product_family_members (product_code, family_id, option_label)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_code) DO UPDATE SET family_id = EXCLUDED.family_id, option_label = EXCLUDED.option_label`,
      [r.product_code, familyId, finalLabels.get(r.product_code)],
    );
  }
  logger.info('Families', 'Products linked', { familyId, codes });
  return familyId;
}

/**
 * Takes `productCode` out of its family (it becomes a standalone product
 * again). A family left with a single member is dissolved too.
 */
export async function unlinkProduct(productCode: string): Promise<void> {
  const db = sql();
  const removed = await db.query(
    `DELETE FROM product_family_members WHERE product_code = $1 RETURNING family_id`,
    [productCode],
  ) as any[];
  const familyId = removed[0]?.family_id;
  if (!familyId) return;
  await db.query(
    `DELETE FROM product_family_members
      WHERE family_id = $1 AND (SELECT COUNT(*) FROM product_family_members WHERE family_id = $1) < 2`,
    [familyId],
  );
  logger.info('Families', 'Product unlinked', { productCode, familyId });
}

/** Renames the size option shown to customers for `productCode`. */
export async function setOptionLabel(productCode: string, label: string): Promise<boolean> {
  const clean = label.trim().slice(0, OPTION_LABEL_MAX);
  if (!clean) return false;
  const rows = await sql().query(
    `UPDATE product_family_members SET option_label = $2 WHERE product_code = $1 RETURNING product_code`,
    [productCode, clean],
  ) as any[];
  return rows.length > 0;
}

/** Every existing family with its members, largest first (admin overview). */
export async function listFamilies(): Promise<Family[]> {
  const rows = await sql().query(
    `SELECT all_category_rows.*, fm.family_id, fm.option_label
       FROM product_family_members fm
       JOIN ${ALL_CATEGORY_ROWS_SQL} ON all_category_rows.product_code = fm.product_code`,
  ) as any[];
  const byFamily = new Map<string, FamilyMember[]>();
  for (const r of rows) {
    const list = byFamily.get(r.family_id) ?? [];
    list.push(rowToMember(r));
    byFamily.set(r.family_id, list);
  }
  return Array.from(byFamily.entries())
    .map(([familyId, members]) => ({ familyId, members: members.sort(sortMembers) }))
    .sort((a, b) => b.members.length - a.members.length || a.members[0].name.localeCompare(b.members[0].name));
}

/**
 * Likely families nobody has linked yet: products in the same category with
 * the same brand and the same name apart from a bracketed size ("Plywood
 * (12mm)", "Plywood (18mm)"). A group is skipped once all its products are
 * already in one family. Discontinued products are left out.
 */
export async function getFamilySuggestions(): Promise<FamilySuggestion[]> {
  const rows = await sql().query(
    `SELECT all_category_rows.*, fm.family_id, fm.option_label
       FROM ${ALL_CATEGORY_ROWS_SQL}
       LEFT JOIN product_family_members fm ON fm.product_code = all_category_rows.product_code
      WHERE all_category_rows.status <> 'discontinued'`,
  ) as any[];

  const groups = new Map<string, any[]>();
  for (const r of rows) {
    const key = [r.category_slug || '', (r.brand || '').toLowerCase().trim(), familyBaseName(r.name || '').toLowerCase()].join('|');
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const suggestions: FamilySuggestion[] = [];
  groups.forEach((list) => {
    if (list.length < 2) return;
    const families = new Set(list.map((r) => r.family_id ?? null));
    if (families.size === 1 && !families.has(null)) return; // already one family

    const labels = new Map<string, string>(list.map((r) => [r.product_code, r.option_label ?? defaultLabel(r)]));
    dedupeLabels(list.filter((r) => !r.option_label), labels);
    const members = list
      .map((r) => ({ ...rowToMember(r), optionLabel: labels.get(r.product_code)!, familyId: r.family_id ?? undefined }))
      .sort(sortMembers);
    const first = members[0];
    suggestions.push({
      title: [first.categorySlug, first.brand, familyBaseName(first.name)].filter(Boolean).join(' · '),
      members,
    });
  });
  return suggestions.sort((a, b) => b.members.length - a.members.length || a.title.localeCompare(b.title));
}
