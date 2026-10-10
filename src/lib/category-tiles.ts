// Category tiles shown on the Categories page and as sub-category chips in
// the catalog. There is no sub-category column in the catalog, so a tile is
// a DB category plus the words its products' names start with ("Taps" =
// plumbing products named "...Tap / Faucet / Mixer / Cock / Valve...").
// Matching is on product names only, at the start of a word (see
// getProductsFromCategoryTables), so "handle" no longer matches a tap whose
// description mentions a handle. Empty terms = the whole category.
//
// When adding products whose names don't start with any of a tile's terms,
// add the word here, or they won't appear under that tile.

// slug: DB category slug used for the /catalog link. tileKey: key under
// catalog.categoryTiles for this tile's display name, and the catalog's
// ?sub= value. img: image filename. Group titles use either titleKey
// (catalog namespace) or titleCategorySlug (reuses the shared categories
// namespace when the group name matches a DB category).
export interface CategoryTileDef {
  slug: string;
  tileKey: string;
  img: string;
  terms: string[];
}

export interface CategoryGroup {
  titleKey?: string;
  titleCategorySlug?: string;
  categories: CategoryTileDef[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    titleKey: 'groupCivilConstruction',
    categories: [
      { slug: 'civil-materials',   tileKey: 'cement',        img: 'cement',        terms: ['cement'] },
      // Floor/wall tiles, grout and tile adhesive live in civil materials.
      { slug: 'civil-materials',   tileKey: 'tiling',        img: 'tiling',        terms: ['tile', 'floor tile', 'wall tile', 'grout'] },
      { slug: 'paints',            tileKey: 'paints',        img: 'paints',        terms: [] },
      { slug: 'civil-materials',   tileKey: 'waterproofing', img: 'waterproofing', terms: ['waterproof', 'curing'] },
      { slug: 'carpentry',         tileKey: 'plywood',       img: 'plywood',       terms: ['plywood', 'blockboard', 'board', 'mdf', 'hdhmr', 'pre-lam', 'laminate'] },
      { slug: 'carpentry',         tileKey: 'adhesives',     img: 'adhesives',     terms: ['adhesive', 'fevicol', 'sealant', 'silicone'] },
      { slug: 'civil-materials',   tileKey: 'sand',          img: 'sand',          terms: ['sand', 'm-sand', 'aggregate'] },
    ],
  },
  {
    titleCategorySlug: 'plumbing',
    categories: [
      { slug: 'plumbing', tileKey: 'pipes',    img: 'pipes',    terms: ['pipe', 'cpvc', 'pvc', 'upvc', 'coupler', 'elbow', 'tee', 'reducer', 'hose'] },
      { slug: 'plumbing', tileKey: 'taps',     img: 'taps',     terms: ['tap', 'faucet', 'mixer', 'cock', 'stopcock', 'pillar cock', 'valve'] },
      { slug: 'plumbing', tileKey: 'drainage', img: 'drainage', terms: ['drain', 'trap', 'bottle trap', 'p-trap', 'sink'] },
    ],
  },
  {
    titleKey: 'groupCarpentryHardware',
    categories: [
      { slug: 'carpentry',         tileKey: 'hinges',       img: 'hinges',        terms: ['hinge', 'channel', 'bed fitting'] },
      { slug: 'carpentry',         tileKey: 'handles',      img: 'handles',       terms: ['handle', 'knob'] },
      { slug: 'glass-aluminium',   tileKey: 'glass',        img: 'glass',         terms: ['glass', 'mirror'] },
      { slug: 'glass-aluminium',   tileKey: 'aluminium',    img: 'aluminium',     terms: ['aluminium', 'section', 'profile', 'u track'] },
      { slug: 'glass-aluminium',   tileKey: 'doorWindow',   img: 'door-window',   terms: ['door', 'window', 'casement', 'sliding'] },
      // Locks are carpentry hardware (cupboard / multi locks).
      { slug: 'carpentry',         tileKey: 'locks',        img: 'locks',         terms: ['lock', 'cupboard lock', 'multi lock'] },
      { slug: 'flooring-ceilings', tileKey: 'falseCeiling', img: 'false-ceiling', terms: ['ceiling', 'grid', 'hanger', 'perimeter', 'gypsum', 'cornice', 'pop'] },
    ],
  },
  {
    titleCategorySlug: 'tools-machines',
    categories: [
      { slug: 'tools-machines', tileKey: 'handTools', img: 'hand-tools', terms: ['screw driver', 'screwdriver', 'allen', 'chisel', 'caulking', 'sand paper', 'tile cutter', 'spanner', 'plier', 'wrench', 'claw hammer', 'hacksaw'] },
      { slug: 'tools-machines', tileKey: 'measuring', img: 'measuring',  terms: ['measur', 'spirit level', 'level'] },
    ],
  },
  {
    titleCategorySlug: 'electrical',
    categories: [
      { slug: 'electrical', tileKey: 'wires',    img: 'wires',    terms: ['wire', 'fr wire', 'cable'] },
      { slug: 'electrical', tileKey: 'switches', img: 'switches', terms: ['switch', 'socket', 'usb socket', 'plate', 'module'] },
      { slug: 'electrical', tileKey: 'lighting', img: 'lighting', terms: ['led', 'light', 'downlight', 'batten', 'lamp'] },
      { slug: 'electrical', tileKey: 'mcb',      img: 'mcb',      terms: ['mcb', 'rccb', 'distribution board'] },
    ],
  },
];

/** Sub-category tiles that belong to one DB category, in display order. */
export function getSubcategoryTiles(slug: string): CategoryTileDef[] {
  const seen = new Set<string>();
  return CATEGORY_GROUPS.flatMap((g) => g.categories)
    .filter((c) => c.slug === slug && !seen.has(c.tileKey) && seen.add(c.tileKey));
}

/** The tile for a catalog ?category=&sub= pair, if it exists. */
export function findSubcategoryTile(slug: string, tileKey: string): CategoryTileDef | undefined {
  return getSubcategoryTiles(slug).find((c) => c.tileKey === tileKey);
}

/**
 * Postgres regex (for ~*) matching any of a tile's terms at the start of a
 * word, e.g. "\m(tap|faucet)". Terms are fixed constants above, still escaped.
 */
export function tileNamePattern(tile: CategoryTileDef): string | null {
  if (tile.terms.length === 0) return null;
  const escaped = tile.terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return `\\m(${escaped.join('|')})`;
}
