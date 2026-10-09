// Category tiles shown on the Categories page and as sub-category chips in
// the catalog. A tile is a DB category plus a search keyword ("Pipes" =
// plumbing + "pipe") - there is no sub-category column in the catalog.

// slug: DB category slug used for the /catalog link. tileKey: key under
// catalog.categoryTiles for this tile's display name. img/keyword: image
// filename + search keyword, unrelated to translation. Group titles use
// either titleKey (catalog namespace) or titleCategorySlug (reuses the
// shared categories namespace when the group name matches a DB category).
export interface CategoryGroup {
  titleKey?: string;
  titleCategorySlug?: string;
  categories: { slug: string; tileKey: string; img: string; keyword: string }[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    titleKey: 'groupCivilConstruction',
    categories: [
      { slug: 'civil-materials',   tileKey: 'cement',       img: 'cement',        keyword: 'cement'      },
      { slug: 'flooring-ceilings', tileKey: 'tiling',       img: 'tiling',        keyword: 'tile'        },
      { slug: 'paints',            tileKey: 'paints',       img: 'paints',        keyword: 'paint'       },
      { slug: 'civil-materials',   tileKey: 'waterproofing',img: 'waterproofing', keyword: 'waterproof'  },
      { slug: 'carpentry',         tileKey: 'plywood',      img: 'plywood',       keyword: 'plywood'     },
      { slug: 'carpentry',         tileKey: 'adhesives',    img: 'adhesives',     keyword: 'adhesive'    },
      { slug: 'civil-materials',   tileKey: 'sand',         img: 'sand',          keyword: 'sand'        },
    ],
  },
  {
    titleCategorySlug: 'plumbing',
    categories: [
      { slug: 'plumbing', tileKey: 'pipes',    img: 'pipes',    keyword: 'pipe'     },
      { slug: 'plumbing', tileKey: 'taps',     img: 'taps',     keyword: 'tap'      },
      { slug: 'plumbing', tileKey: 'drainage', img: 'drainage', keyword: 'drainage' },
    ],
  },
  {
    titleKey: 'groupCarpentryHardware',
    categories: [
      { slug: 'carpentry',         tileKey: 'hinges',      img: 'hinges',       keyword: 'hinge'     },
      { slug: 'carpentry',         tileKey: 'handles',     img: 'handles',      keyword: 'handle'    },
      { slug: 'glass-aluminium',   tileKey: 'glass',       img: 'glass',        keyword: 'glass'     },
      { slug: 'glass-aluminium',   tileKey: 'aluminium',   img: 'aluminium',    keyword: 'aluminium' },
      { slug: 'glass-aluminium',   tileKey: 'doorWindow',  img: 'door-window',  keyword: 'door'      },
      { slug: 'glass-aluminium',   tileKey: 'locks',       img: 'locks',        keyword: 'lock'      },
      { slug: 'flooring-ceilings', tileKey: 'falseCeiling',img: 'false-ceiling',keyword: 'ceiling'   },
    ],
  },
  {
    titleCategorySlug: 'tools-machines',
    categories: [
      { slug: 'tools-machines', tileKey: 'handTools', img: 'hand-tools', keyword: 'hand'   },
      { slug: 'tools-machines', tileKey: 'measuring',  img: 'measuring',  keyword: 'measur' },
    ],
  },
  {
    titleCategorySlug: 'electrical',
    categories: [
      { slug: 'electrical', tileKey: 'wires',    img: 'wires',    keyword: 'wire'   },
      { slug: 'electrical', tileKey: 'switches', img: 'switches', keyword: 'switch' },
      { slug: 'electrical', tileKey: 'lighting', img: 'lighting', keyword: 'light'  },
      { slug: 'electrical', tileKey: 'mcb',      img: 'mcb',      keyword: 'mcb'    },
    ],
  },
];

export type CategoryTileDef = CategoryGroup['categories'][number];

/** Sub-category tiles that belong to one DB category, in display order. */
export function getSubcategoryTiles(slug: string): CategoryTileDef[] {
  const seen = new Set<string>();
  return CATEGORY_GROUPS.flatMap((g) => g.categories)
    .filter((c) => c.slug === slug && !seen.has(c.keyword) && seen.add(c.keyword));
}
